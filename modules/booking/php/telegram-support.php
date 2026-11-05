<?php
namespace SiteTheme\Booking;
defined('ABSPATH') || exit;

function telegram_support_route($chat,$message,$booking){
    global $wpdb;$client=$wpdb->get_var($wpdb->prepare('SELECT chat_id FROM '.table('telegram_links').' WHERE booking_id=%d',$booking));
    if(!$client || ((string)$chat!==(string)$client && (string)$chat!==(string)notification_settings()['admin_chat']))return;
    $wpdb->replace(table('telegram_replies'),['chat_id'=>(string)$chat,'message_id'=>(int)$message,'booking_id'=>(int)$booking,'client_chat'=>(string)$client,'created_at'=>gmdate('Y-m-d H:i:s')]);
}
function telegram_support_prompt($row,$chat,$user){
    global $wpdb;$owner=$wpdb->get_var($wpdb->prepare('SELECT chat_id FROM '.table('telegram_links').' WHERE booking_id=%d',$row->id));
    $private=(string)$owner===(string)$chat;
    if(!$owner)return error('not_connected',t('Клієнт ще не підключив Telegram.'));
    if(!$private && (string)$chat!==(string)notification_settings()['admin_chat'])return error('forbidden',t('Немає доступу.'),403);
    if($private && !notification_settings()['admin_chat'])return error('unavailable',t('Зв’язок зі студією поки недоступний.'));
    $thread=$private?0:telegram_booking_topic($row->id,$chat);if(is_wp_error($thread))return $thread;
    $data=['chat_id'=>(string)$chat,'text'=>$private?t("Бронювання №%s: напишіть повідомлення або надішліть фото чи файл. Адміністратор відповість тут.\n/bookings — змінити бронювання · /close — завершити діалог.",$row->id):($thread?t("Діалог із клієнтом · бронювання №%s\nУсі повідомлення адміністраторів у цій темі надсилаються клієнту. Пишіть тут текстом або надсилайте файли.",$row->id):t("Відповідь клієнту за бронюванням №%s. Дайте відповідь на це повідомлення текстом або файлом — бот надішле її клієнту.",$row->id)),'reply_markup'=>['force_reply'=>true,'selective'=>false]];
    if($thread){$data['message_thread_id']=$thread;unset($data['reply_markup']);}
    $result=telegram_api('sendMessage',$data);
    if(is_wp_error($result))return $result;
    if(!empty($result['message_id']))telegram_support_route($chat,$result['message_id'],$row->id);
    if($private)delete_transient('site_booking_support_closed_'.hash('sha256',(string)$chat));
    if($private)set_transient('site_booking_support_'.hash('sha256',(string)$chat),$row->id,30*DAY_IN_SECONDS);
    return true;
}
function support_send_message($id,$text,$direction,$actor,$update,$attachment=0,$batch=false,$attachments=[]){
    global $wpdb;$row=telegram_booking_row($id);if(!$row)return error('not_found',t('Бронювання не знайдено.'),404);
    $text=trim(sanitize_textarea_field($text));if((!$text && !$attachment) || mb_strlen($text)>($attachment?800:3000))return error('invalid_message',$attachment?t('Повідомлення з файлом — до 800 символів.'):t('Напишіть повідомлення довжиною до 3000 символів.'));
    if($attachment && !chat_file($attachment,$id))return error('invalid_file',t('Файл не належить до цього бронювання.'));
    $client=$wpdb->get_var($wpdb->prepare('SELECT chat_id FROM '.table('telegram_links').' WHERE booking_id=%d',$id));
    $settings=notification_settings();if(!$settings['telegram'] || !$client || !$settings['admin_chat'])return error('not_connected',t('Telegram клієнта або групу студії не підключено.'));
    if($direction==='client' && (string)$actor!==(string)$client)return error('not_owner',t('Бронювання не прив’язане до вашого чату.'),403);
    if(!$batch && $wpdb->query('START TRANSACTION')===false)return error('storage_error',t('Не вдалося зберегти повідомлення.'),500);
    try{
    if($direction==='client'){
        $body=t("Повідомлення клієнта · бронювання №%s\nКлієнт: %s\nТелефон: %s\n\n",$id,$row->name,$row->phone).$text;
        queue_notice('telegram',$settings['admin_chat'],$body,'support:client:'.$update,$id,[['text'=>t('Відповісти клієнту'),'callback_data'=>telegram_callback_data($row,'s')]],'',$attachment,$attachments);
    }else{
        queue_notice('telegram',$client,t("Студія · бронювання №%s\n\n",$id).$text,'support:studio:'.$update,$id,[['text'=>t('Відповісти студії'),'callback_data'=>telegram_client_callback_data($row,'s','',(string)$client)]],'',$attachment,$attachments);
        // Keep the group informed when a moderator writes from the WordPress card.
        if(str_starts_with((string)$actor,'admin:'))queue_notice('telegram',$settings['admin_chat'],t("Відповідь студії · бронювання №%s\n\n",$id).$text,'support:copy:'.$update,$id,[],'',$attachment,$attachments);
    }
    chat_record($id,$direction,$actor,$text,'support:'.($direction==='client'?'client:':'studio:').$update,$attachment,null,false,$attachments);
    if(!$batch && $wpdb->query('COMMIT')===false)throw new \RuntimeException('chat_commit');
    return true;
    }catch(\Throwable $e){if(!$batch)$wpdb->query('ROLLBACK');log_failure('support_message',$e);return error('storage_error',t('Не вдалося зберегти повідомлення.'),500);}
}
function telegram_support_message($message,$update){
    global $wpdb;$chat=(string)($message['chat']['id'] ?? '');$user=(string)($message['from']['id'] ?? '');$private=($message['chat']['type'] ?? '')==='private';$text=trim($message['text'] ?? $message['caption'] ?? '');
    if($private && $text==='/close'){delete_transient('site_booking_support_'.hash('sha256',$chat));set_transient('site_booking_support_closed_'.hash('sha256',$chat),1,30*DAY_IN_SECONDS);queue_notice('telegram',$chat,t('Діалог завершено. /bookings — ваші бронювання.'),'support:close:'.$update);return true;}
    if(str_starts_with($text,'/'))return false;
    $reply=(int)($message['reply_to_message']['message_id'] ?? 0);
    $route=$reply?$wpdb->get_row($wpdb->prepare('SELECT * FROM '.table('telegram_replies').' WHERE chat_id=%s AND message_id=%d',$chat,$reply)):null;
    $topic=$private?0:telegram_topic_booking($chat,(int)($message['message_thread_id'] ?? 0));
    // A reply in another booking's topic must never cross conversations.
    if($topic && $route && $topic!==(int)$route->booking_id)return true;
    $id=$topic ?: ($route?(int)$route->booking_id:($private?(int)get_transient('site_booking_support_'.hash('sha256',$chat)):0));
    if(!$text && empty($message['photo']) && empty($message['document']))return false;
    if(!$id && $private && !get_transient('site_booking_support_closed_'.hash('sha256',$chat))){
        $ids=$wpdb->get_col($wpdb->prepare('SELECT l.booking_id FROM '.table('telegram_links').' l JOIN '.table('bookings')." b ON b.id=l.booking_id WHERE l.chat_id=%s AND b.status='confirmed' ORDER BY l.booking_id DESC LIMIT 2",$chat));
        if(count($ids)===1)$id=(int)$ids[0];
        elseif($ids){telegram_client_bookings($chat,$update);queue_notice('telegram',$chat,t('Оберіть «Написати студії» у потрібному бронюванні, потім повторіть повідомлення.'),'support:choose:'.$update);return true;}
    }
    if(!$id)return false;
    $linked=$wpdb->get_var($wpdb->prepare('SELECT chat_id FROM '.table('telegram_links').' WHERE booking_id=%d',$id));
    if($route && (string)$linked!==(string)$route->client_chat)return true;
    if($private){if($user!==$chat || (string)$linked!==$chat)return true;$direction='client';}
    else{
        if($chat!==(string)notification_settings()['admin_chat'])return true;
        $allowed=telegram_is_moderator($chat,$user);if(is_wp_error($allowed) || !$allowed){queue_notice('telegram',$chat,t('Відповідати клієнту можуть лише адміністратори групи.'),'support:denied:'.$update,$id);return true;}$direction='studio';
    }
    // The group should not read a flood: over budget a client hears it once a minute, nothing is relayed.
    if($direction==='client' && !rate_limit('telegram-support:'.$chat,10,MINUTE_IN_SECONDS)){if(rate_limit('telegram-support-notice:'.$chat,1,MINUTE_IN_SECONDS))queue_notice('telegram',$chat,t('Забагато повідомлень. Зачекайте хвилину.'),'support:limit:'.$update,$id);return true;}
    $dedupe=hash('sha256','support:'.($direction==='client'?'client:':'studio:').$update);
    if(get_option('site_booking_chat_schema')==='2' && $wpdb->get_var($wpdb->prepare('SELECT id FROM '.table('chat_messages').' WHERE delivery_key=%s',$dedupe)))return true;
    $attachment=chat_telegram_attachment($id,$message);
    if(is_wp_error($attachment)){$result=$attachment;}else{
    $result=support_send_message($id,$text,$direction,$direction==='client'?$user:'telegram:'.$user,$update,$attachment);
    if(is_wp_error($result) && $attachment)chat_remove_file($attachment,$id);
    }
    if(is_wp_error($result))queue_notice('telegram',$chat,$result->get_error_message(),'support:error:'.$update,$id);
    elseif($private){
        set_transient('site_booking_support_'.hash('sha256',$chat),$id,30*DAY_IN_SECONDS);
        $ack='site_booking_support_ack_'.hash('sha256',$chat.':'.$id);
        if(!get_transient($ack)){queue_notice('telegram',$chat,t('Повідомлення передано студії · бронювання №').$id.t('. Відповідь надійде сюди.'),'support:ack:'.$update,$id);set_transient($ack,1,60);}
    }
    return true;
}
add_action('rest_api_init',function(){
    register_rest_route('site/v1','/admin/bookings/(?P<id>\d+)/message',['methods'=>'POST','permission_callback'=>fn()=>current_user_can('manage_bookings'),'callback'=>function($request){
        $request_key=sanitize_key($request['request_id'] ?? wp_generate_uuid4());$update='admin:'.get_current_user_id().':'.(int)$request['id'].':'.$request_key;
        global $wpdb;
        if(get_option('site_booking_chat_schema')==='2' && $wpdb->get_var($wpdb->prepare('SELECT id FROM '.table('chat_messages').' WHERE delivery_key=%s',hash('sha256','support:studio:'.$update.':0'))))return rest_ensure_response(['queued'=>true]);
        $params=$request->get_file_params();$uploads=[];
        if(!empty($params['files']['name']) && is_array($params['files']['name']))foreach($params['files']['name'] as $index=>$name){$file=[];foreach(['name','type','tmp_name','error','size'] as $field)$file[$field]=$params['files'][$field][$index] ?? null;$uploads[]=$file;}
        elseif(!empty($params['file']))$uploads[]=$params['file'];
        if(count($uploads)>10 || array_sum(array_column($uploads,'size'))>100*1024*1024)return error('batch_limit',t('За раз можна надіслати до 10 файлів загальним розміром до 100 МБ.'));
        $attachments=array_values(array_unique(array_map('absint',(array)($request['attachment_ids'] ?? []))));
        $new_uploads=[];foreach($uploads as $upload){$file=chat_store_upload((int)$request['id'],$upload);if(is_wp_error($file)){foreach($new_uploads as $saved)chat_remove_file($saved,(int)$request['id']);return $file;}$attachments[]=$file;$new_uploads[]=$file;}
        $result=support_send_batch((int)$request['id'],(string)$request['message'],'admin:'.get_current_user_id(),$update,$attachments);
        if(is_wp_error($result))foreach($new_uploads as $file)chat_remove_file($file,(int)$request['id']);
        return is_wp_error($result)?$result:rest_ensure_response(['queued'=>true,'count'=>max(1,count($attachments))]);
    }]);
});

function support_send_batch($id,$text,$actor,$key,$attachments){
    global $wpdb;
    if(count($attachments)>10)return error('batch_limit',t('Можна надіслати не більше 10 файлів.'));
    $total=0;foreach($attachments as $file){$row=chat_file($file,$id);if(!$row)return error('invalid_file',t('Файл не належить до бронювання.'));$total+=(int)$row->size;}
    if($total>100*1024*1024)return error('batch_limit',t('Загальний розмір файлів — до 100 МБ.'));
    if($wpdb->query('START TRANSACTION')===false)return error('storage_error',t('Не вдалося розпочати надсилання.'),500);
    $result=support_send_message($id,$text,'studio',$actor,$key.':0',$attachments[0] ?? 0,true,count($attachments)>1?$attachments:[]);
    if(is_wp_error($result)){$wpdb->query('ROLLBACK');return $result;}
    if($wpdb->query('COMMIT')===false){$wpdb->query('ROLLBACK');return error('storage_error',t('Не вдалося зберегти надсилання.'),500);}return true;
}
