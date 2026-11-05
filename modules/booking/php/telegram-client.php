<?php
namespace SiteTheme\Booking;
defined('ABSPATH') || exit;

/** Shared by the private-chat UI and the mutation inside its database transaction. */
function client_booking_permission($row,$chat,$action,$lock=false){
    global $wpdb;
    $owner=$wpdb->get_var($wpdb->prepare('SELECT chat_id FROM '.table('telegram_links').' WHERE booking_id=%d'.($lock?' FOR UPDATE':''),$row->id));
    if(!$owner || (string)$owner!==(string)$chat)return error('not_owner',t('Це бронювання не прив’язане до вашого Telegram.'),403);
    if($row->type!=='booking' || $row->status!=='confirmed' || $row->cancelled_at)return error('invalid_status',t('Бронювання вже скасовано або недоступне.'),409);
    $start=new \DateTimeImmutable($row->starts_at,new \DateTimeZone('UTC'));$now=new \DateTimeImmutable('now',new \DateTimeZone('UTC'));
    if($start<=$now)return error('already_started',t('Сеанс уже розпочався. Зверніться до студії.'));
    $settings=settings();
    if($action==='reschedule'){
        if((int)$row->reschedule_count>=(int)$settings['reschedule_limit'])return error('reschedule_limit',t('Ліміт самостійних перенесень вичерпано. Зверніться до студії.'));
        if($start->getTimestamp()-$now->getTimestamp()<(int)$settings['cancellation_hours']*3600)return error('reschedule_deadline',t('Перенесення доступне не пізніше ніж за ').$settings['cancellation_hours'].t(' год до початку. Зверніться до студії.'));
    }
    if($action==='cancel' && $row->payment_mode!=='unpaid')return error('payment_review',t('Для скасування оплаченої броні зверніться до студії.'));
    return true;
}
function telegram_client_callback_data($row,$action,$extra,$chat){
    $payload='cl|'.$row->id.'|'.$row->version.'|'.$action.'|'.$extra;
    return $payload.'|'.substr(hash_hmac('sha256',$payload.'|'.$chat,wp_salt('auth')),0,12);
}
function telegram_client_parse_callback($data,$chat){
    if(strlen($data)>64 || !preg_match('/^cl\|(\d{1,20})\|(\d{1,10})\|([rmdtycxs])\|([0-9.]{0,11})\|([a-f0-9]{12})$/D',$data,$parts))return null;
    $payload=substr($data,0,strrpos($data,'|'));
    if(!hash_equals(substr(hash_hmac('sha256',$payload.'|'.$chat,wp_salt('auth')),0,12),$parts[5]))return null;
    return ['id'=>(int)$parts[1],'version'=>(int)$parts[2],'action'=>$parts[3],'extra'=>$parts[4]];
}
function telegram_client_buttons($row,$chat){
    $buttons=[];
    if(!is_wp_error(client_booking_permission($row,$chat,'reschedule')))$buttons[]=['text'=>t('Перенести'),'callback_data'=>telegram_client_callback_data($row,'m','',$chat)];
    if(!is_wp_error(client_booking_permission($row,$chat,'cancel')))$buttons[]=['text'=>t('Скасувати'),'callback_data'=>telegram_client_callback_data($row,'c','',$chat)];
    if(notification_settings()['admin_chat'])$buttons[]=['text'=>t('Написати студії'),'callback_data'=>telegram_client_callback_data($row,'s','',$chat)];
    $buttons[]=['text'=>t('Оновити'),'callback_data'=>telegram_client_callback_data($row,'r','',$chat)];
    return $buttons;
}
function telegram_client_view($row,$action,$extra,$chat){
    $back=['text'=>t('До бронювання'),'callback_data'=>telegram_client_callback_data($row,'r','',$chat)];
    if($action==='r' && in_array($row->status,['completed','no_show'],true))return ['text'=>booking_notice_text($row,$row->status).t("\n\nЧат зі студією та обмін файлами залишаються доступними."),'reply_markup'=>['inline_keyboard'=>array_chunk(telegram_client_buttons($row,$chat),1)]];
    if($action==='r')return ['text'=>booking_notice_text($row,$row->cancelled_at?'cancelled':(in_array($row->status,['completed','no_show'],true)?$row->status:'created')).t("\n\nПеренесень використано: %s/",$row->reschedule_count).settings()['reschedule_limit'].t('. Перенесення — не пізніше ніж за ').settings()['cancellation_hours'].t(' год до початку.'),'reply_markup'=>['inline_keyboard'=>array_chunk(telegram_client_buttons($row,$chat),1)]];
    if($action==='c'){
        $rows=[];
        if(!is_wp_error(client_booking_permission($row,$chat,'reschedule')))$rows[]=[['text'=>t('Краще перенести'),'callback_data'=>telegram_client_callback_data($row,'m','',$chat)]];
        $rows[]=[['text'=>t('Так, скасувати бронювання'),'callback_data'=>telegram_client_callback_data($row,'x','',$chat)]];$rows[]=[$back];
        return ['text'=>t("Скасувати бронювання №%s?\n",$row->id).display_time($row->starts_at).'–'.display_time($row->ends_at,'H:i').t("\nОплату не проводили. Час буде звільнено, студія отримає повідомлення."),'reply_markup'=>['inline_keyboard'=>$rows]];
    }
    return telegram_moderation_view($row,$action,$extra,true,$chat);
}
function handle_telegram_client_callback($query){
    global $wpdb;$chat=(string)($query['message']['chat']['id'] ?? '');$user=(string)($query['from']['id'] ?? '');$message=(int)($query['message']['message_id'] ?? 0);
    $answer=function($text='',$alert=false)use($query){telegram_api('answerCallbackQuery',['callback_query_id'=>$query['id'],'text'=>mb_substr($text,0,180),'show_alert'=>$alert]);};
    if(!notification_settings()['telegram'] || ($query['message']['chat']['type'] ?? '')!=='private' || !$chat || $chat!==$user || !$message || !empty($query['from']['is_bot'])){$answer(t('Керування доступне лише у вашому особистому чаті з ботом.'),true);return;}
    save_telegram_profile($chat,$query['from']);
    $data=telegram_client_parse_callback((string)($query['data'] ?? ''),$chat);
    if(!$data){$answer(t('Ця кнопка недійсна для вашого чату.'),true);return;}
    $row=telegram_booking_row($data['id']);$owner=$row?$wpdb->get_var($wpdb->prepare('SELECT chat_id FROM '.table('telegram_links').' WHERE booking_id=%d',$row->id)):null;
    if(!$row || (string)$owner!==$chat){$answer(t('Бронювання недоступне у вашому чаті.'),true);return;}
    if(!in_array($data['action'],['r','s'],true) && (int)$row->version!==$data['version']){$answer(t('Бронювання вже змінилося. Натисніть «Оновити» або /bookings.'),true);return;}
    if($data['action']==='s'){$answer();$result=telegram_support_prompt($row,$chat,$user);if(is_wp_error($result))telegram_api('sendMessage',['chat_id'=>$chat,'text'=>$result->get_error_message()]);return;}
    $operation=in_array($data['action'],['c','x'],true)?'cancel':'reschedule';
    if($data['action']!=='r'){
        $allowed=client_booking_permission($row,$chat,$operation);
        if(is_wp_error($allowed)){$answer($allowed->get_error_message(),true);return;}
    }
    $answer();$result=null;$context=['actor'=>'client-telegram:'.$user,'client_chat'=>$chat];
    if($data['action']==='x')$result=cancel($row->id,['version'=>$data['version'],'refund'=>false],$context);
    if($data['action']==='y'){
        $view=telegram_client_view($row,'t',$data['extra'],$chat);
        if(is_wp_error($view))$result=$view;
        else{
            [$date,$hour]=explode('.',$data['extra']);$date=\DateTimeImmutable::createFromFormat('!Ymd',$date);
            $result=reschedule($row->id,['version'=>$data['version'],'date'=>$date->format('Y-m-d'),'time'=>$hour.':00','hours'=>(int)$row->hours,'reason'=>'client'],$context);
        }
    }
    if(is_wp_error($result)){telegram_api('sendMessage',['chat_id'=>$chat,'text'=>$result->get_error_message(),'reply_markup'=>['inline_keyboard'=>[[['text'=>t('Оновити'),'callback_data'=>telegram_client_callback_data($row,'r','',$chat)]]]]]);return;}
    if(in_array($data['action'],['x','y'],true)){
        telegram_api('editMessageText',['chat_id'=>$chat,'message_id'=>$message,'text'=>$data['action']==='x'?t("Бронювання №%s скасовано. Студія отримає сповіщення.",$row->id):t("Бронювання №%s перенесено. Нове підтвердження надійде окремим повідомленням.",$row->id),'reply_markup'=>['inline_keyboard'=>[]]]);return;
    }
    $view=telegram_client_view($row,$data['action'],$data['extra'],$chat);
    if(is_wp_error($view)){telegram_api('sendMessage',['chat_id'=>$chat,'text'=>$view->get_error_message()]);return;}
    telegram_api('editMessageText',['chat_id'=>$chat,'message_id'=>$message]+$view);
}
function telegram_client_bookings($chat,$update_id){
    global $wpdb;$ids=$wpdb->get_col($wpdb->prepare('SELECT b.id FROM '.table('bookings').' b INNER JOIN '.table('telegram_links')." l ON l.booking_id=b.id WHERE l.chat_id=%s AND b.status IN ('confirmed','completed','no_show') ORDER BY (b.status='confirmed' AND b.ends_at>UTC_TIMESTAMP()) DESC,b.starts_at DESC LIMIT 10",$chat));
    if(!$ids){if(rate_limit('telegram-empty:'.$chat,1,10*MINUTE_IN_SECONDS))queue_notice('telegram',$chat,t('Підключених бронювань немає. Відкрийте персональне посилання після бронювання на сайті.'),'bookings:'.$update_id);return;}
    foreach($ids as $id){$row=telegram_booking_row($id);$view=telegram_client_view($row,'r','',$chat);queue_notice('telegram',$chat,$view['text'],'bookings:'.$update_id.':'.$id,$id,telegram_client_buttons($row,$chat));}
}
