<?php
namespace SiteTheme\Booking;
defined('ABSPATH') || exit;

function install_telegram_topics(){
    if(!current_user_can('manage_options') || get_option('site_booking_topics_schema')==='3')return;
    global $wpdb;require_once ABSPATH.'wp-admin/includes/upgrade.php';$charset=$wpdb->get_charset_collate();
    dbDelta('CREATE TABLE '.table('telegram_topics')." (
        booking_id bigint unsigned NOT NULL,
        chat_id varchar(40) NOT NULL,
        thread_id bigint unsigned NOT NULL,
        card_message_id bigint unsigned NOT NULL DEFAULT 0,
        created_at datetime NOT NULL,
        PRIMARY KEY  (booking_id,chat_id),
        UNIQUE KEY chat_thread (chat_id,thread_id)
    ) ENGINE=InnoDB $charset;");
    if(!$wpdb->get_var("SHOW COLUMNS FROM ".table('outbox')." LIKE 'thread_id'"))$wpdb->query('ALTER TABLE '.table('outbox').' ADD thread_id bigint unsigned NULL');
    if($wpdb->get_var($wpdb->prepare('SHOW TABLES LIKE %s',$wpdb->esc_like(table('telegram_topics')))) && $wpdb->get_var("SHOW COLUMNS FROM ".table('outbox')." LIKE 'thread_id'"))update_option('site_booking_topics_schema','3',false);
}
add_action('admin_init',__NAMESPACE__.'\\install_telegram_topics',21);

function telegram_topic_booking($chat,$thread){
    if(!$thread || get_option('site_booking_topics_schema')!=='3')return 0;
    global $wpdb;return (int)$wpdb->get_var($wpdb->prepare('SELECT booking_id FROM '.table('telegram_topics').' WHERE chat_id=%s AND thread_id=%d',(string)$chat,$thread));
}
function telegram_booking_topic($booking,$chat){
    if(!$booking || (string)$chat!==(string)notification_settings()['admin_chat'] || get_option('site_booking_topics_schema')!=='3')return 0;
    global $wpdb;$thread=(int)$wpdb->get_var($wpdb->prepare('SELECT thread_id FROM '.table('telegram_topics').' WHERE booking_id=%d AND chat_id=%s',$booking,(string)$chat));if($thread)return $thread;
    $cache='site_booking_forum_'.hash('sha256',(string)$chat);$forum=get_transient($cache);
    if($forum==='no')return 0;
    if($forum!=='yes'){$info=telegram_api('getChat',['chat_id'=>(string)$chat]);if(is_wp_error($info))return $info;$forum=!empty($info['is_forum'])?'yes':'no';set_transient($cache,$forum,$forum==='yes'?300:15);if($forum==='no')return 0;}
    // The delivery worker is serialized; the option also protects direct callback prompts.
    $lock='site_booking_topic_lock_'.hash('sha256',$chat.':'.$booking);$lease=(int)get_option($lock,0);if($lease && $lease<time()-60)delete_option($lock);
    if(!add_option($lock,time(),'','no'))return error('topic_busy',t('Тема бронювання створюється. Спробуйте ще раз.'),503);
    try{
        $thread=(int)$wpdb->get_var($wpdb->prepare('SELECT thread_id FROM '.table('telegram_topics').' WHERE booking_id=%d AND chat_id=%s',$booking,(string)$chat));if($thread)return $thread;
        $row=telegram_booking_row($booking);if(!$row)return error('not_found',t('Бронювання не знайдено.'),404);
        $name=mb_substr('№'.$booking.' · '.($row->name ?: $row->phone),0,128);
        $result=telegram_api('createForumTopic',['chat_id'=>(string)$chat,'name'=>$name,'icon_color'=>0xFF93B2]);
        if(is_wp_error($result))return error('topic_unavailable',t('Не вдалося створити тему бронювання. Перевірте право бота «Керування темами».'),503);
        $thread=(int)($result['message_thread_id'] ?? 0);if(!$thread)return error('topic_unavailable',t('Telegram не повернув тему бронювання.'),503);
        if(!$wpdb->insert(table('telegram_topics'),['booking_id'=>$booking,'chat_id'=>(string)$chat,'thread_id'=>$thread,'created_at'=>gmdate('Y-m-d H:i:s')]))return error('topic_storage',t('Не вдалося зберегти тему бронювання.'),503);
        queue_notice('telegram',$chat,t("Діалог зі студією · бронювання №%s\nУсі повідомлення адміністраторів у цій темі надсилаються клієнту. Для внутрішніх обговорень використовуйте окремий чат команди.",$booking),'topic:intro:'.$chat.':'.$booking,$booking);
        return $thread;
    }finally{delete_option($lock);}
}

function telegram_queue_booking_summary($job,$thread){
    if(!$thread || (string)$job->recipient!==(string)notification_settings()['admin_chat'] || !empty($job->thread_id) || $job->subject!=='created')return;
    $group=(string)$job->recipient;if(!str_starts_with($group,'-100'))return;
    $url='https://t.me/c/'.substr($group,4).'/'.(int)$thread;
    queue_notice('telegram',$group,$job->message,'topic:summary:'.$group.':'.$job->booking_id,$job->booking_id,[['text'=>t('Відкрити чат заявки'),'url'=>$url]],'',0,[],1);
}

function telegram_topic_card($booking,$chat,$thread,$sent=0,$retry=true){
    if(!$thread || $thread<=1)return true;
    global $wpdb;$row=telegram_booking_row($booking);if(!$row)return error('not_found',t('Бронювання не знайдено.'),404);
    $card=(int)$wpdb->get_var($wpdb->prepare('SELECT card_message_id FROM '.table('telegram_topics').' WHERE booking_id=%d AND chat_id=%s',$booking,(string)$chat));
    $buttons=array_values(array_filter(telegram_admin_buttons($row),fn($b)=>in_array(telegram_parse_callback($b['callback_data'] ?? '')['action'] ?? '',['m','c','r','n'],true)));
    $text=t("Керування заявкою №%s\n",$booking).(['cancelled'=>t('Скасовано'),'cancelled_late'=>t('Скасовано'),'completed'=>t('Завершено'),'no_show'=>t('Неявка')][$row->status] ?? t('Підтверджено'))." · ".display_time($row->starts_at).'–'.display_time($row->ends_at,'H:i').''.' ('.(config('timezone_label') ?: zone()->getName()).')';
    if(!$card && $sent)$card=(int)$sent;
    {
        $payload=['chat_id'=>(string)$chat,'text'=>$text,'reply_markup'=>['inline_keyboard'=>array_chunk($buttons,1)]];
        if($card)$payload['message_id']=$card;else $payload['message_thread_id']=$thread;
        $result=telegram_api($card?'editMessageText':'sendMessage',$payload);
        if(is_wp_error($result) && !str_contains($result->get_error_message(),'message is not modified')){
            if($card && $retry && str_contains($result->get_error_message(),'message to edit not found')){$wpdb->update(table('telegram_topics'),['card_message_id'=>0],['booking_id'=>$booking,'chat_id'=>(string)$chat]);return telegram_topic_card($booking,$chat,$thread,0,false);}
            return $result;
        }
        if(!$card)$card=(int)($result['message_id'] ?? 0);
    }
    if(!$card)return error('topic_card',t('Не вдалося створити картку керування.'),503);
    $wpdb->update(table('telegram_topics'),['card_message_id'=>$card],['booking_id'=>$booking,'chat_id'=>(string)$chat]);
    telegram_support_route($chat,$card,$booking);
    $pinned=telegram_api('pinChatMessage',['chat_id'=>(string)$chat,'message_id'=>$card,'disable_notification'=>true]);
    if(is_wp_error($pinned) && $retry && str_contains($pinned->get_error_message(),'message to pin not found')){$wpdb->update(table('telegram_topics'),['card_message_id'=>0],['booking_id'=>$booking,'chat_id'=>(string)$chat]);return telegram_topic_card($booking,$chat,$thread,0,false);}
    return $pinned;
}
function telegram_topic_buttons($buttons,$thread){
    return $thread>1?array_values(array_filter($buttons,fn($b)=>empty($b['callback_data']) || (telegram_parse_callback($b['callback_data'])['action'] ?? '')!=='s')):$buttons;
}
