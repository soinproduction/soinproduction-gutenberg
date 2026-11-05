<?php
namespace SiteTheme\Booking;
defined('ABSPATH') || exit;

function telegram_booking_row($id){
    global $wpdb;
    $row=$wpdb->get_row($wpdb->prepare('SELECT b.*,c.name,c.phone FROM '.table('bookings').' b LEFT JOIN '.table('clients').' c ON c.id=b.client_id WHERE b.id=%d',$id));
    if($row)$row=booking_identities([$row])[0];
    return $row;
}
function telegram_callback_data($row,$action,$extra=''){
    $data='bk|'.$row->id.'|'.$row->version.'|'.$action.'|'.$extra;
    return $data.'|'.substr(hash_hmac('sha256',$data.'|'.notification_settings()['admin_chat'],wp_salt('auth')),0,12);
}
function telegram_parse_callback($data){
    if(strlen($data)>64 || !preg_match('/^bk\|(\d{1,20})\|(\d{1,10})\|([rmdtycxsnz])\|([0-9.]{0,11})\|([a-f0-9]{12})$/Dx',$data,$match))return null;
    $payload=substr($data,0,strrpos($data,'|'));
    if(!hash_equals(substr(hash_hmac('sha256',$payload.'|'.notification_settings()['admin_chat'],wp_salt('auth')),0,12),$match[5]))return null;
    return ['id'=>(int)$match[1],'version'=>(int)$match[2],'action'=>$match[3],'extra'=>$match[4]];
}
function telegram_admin_buttons($row){
    $buttons=[['text'=>t('Оновити'),'callback_data'=>telegram_callback_data($row,'r')]];
    if($row->status==='confirmed' && !$row->cancelled_at){
        array_unshift($buttons,['text'=>t('Перенести'),'callback_data'=>telegram_callback_data($row,'m')],['text'=>t('Скасувати'),'callback_data'=>telegram_callback_data($row,'c')]);
    }
    if(can_mark_no_show($row))$buttons[]=['text'=>t('Позначити неявку'),'callback_data'=>telegram_callback_data($row,'n')];
    $profile=booking_telegram_profile($row->id);
    if($profile['linked'])$buttons[]=['text'=>t('Написати клієнту'),'callback_data'=>telegram_callback_data($row,'s')];
    if($profile['url'])$buttons[]=['text'=>t('Профіль клієнта'),'url'=>$profile['url']];
    return $buttons;
}
function telegram_is_moderator($chat,$user){
    if(!(string)$user || (string)$chat!==(string)notification_settings()['admin_chat'])return false;
    $members=telegram_api('getChatAdministrators',['chat_id'=>(string)$chat]);
    if(is_wp_error($members))return $members;
    foreach($members as $member)if((string)($member['user']['id'] ?? '')===(string)$user && empty($member['user']['is_bot']) && in_array($member['status'] ?? '',['creator','administrator'],true))return true;
    return false;
}
function telegram_available_starts($row,$date,$client=false){
    $config=settings();$working=$config['weekly'][(int)(local_time($date.' 12:00')?->format('N') ?? 0)] ?? null;
    if(!$working)return [];
    $first=(int)substr($working['open'],0,2)+(substr($working['open'],3,2)!=='00'?1:0);$times=[];
    for($hour=$first;$hour<24;$hour++){
        $time=sprintf('%02d:00',$hour);
        if($time>=$working['close'])break;
        if($client && local_time($date.' '.$time)<(new \DateTimeImmutable('now',zone()))->modify('+'.$config['minimum_notice_hours'].' hours'))continue;
        $available=available_duration(['date'=>$date,'time'=>$time,'type'=>'booking','exclude_id'=>$row->id],$config);
        if(!is_wp_error($available) && $available['max_hours']>=(int)$row->hours && $date.' '.$time!==display_time($row->starts_at,'Y-m-d H:i'))$times[]=$time;
    }
    return $times;
}
function telegram_moderation_view($row,$action,$extra='',$client=false,$chat=''){
    $callback=fn($action,$extra='')=>$client?telegram_client_callback_data($row,$action,$extra,$chat):telegram_callback_data($row,$action,$extra);
    $back=['text'=>t('До бронювання'),'callback_data'=>$callback('r')];
    $summary=booking_notice_text($row,$row->cancelled_at?'cancelled':(in_array($row->status,['completed','no_show'],true)?$row->status:'created'));
    if($action==='r')return ['text'=>$summary.t("\nКлієнт: ").$row->name.t("\nТелефон: ").$row->phone,'reply_markup'=>['inline_keyboard'=>array_chunk(telegram_admin_buttons($row),1)]];
    if($action==='n'){if(!can_mark_no_show($row))return error('invalid_status',t('Неявку можна позначити після завершення оренди.'),409);return ['text'=>t("Позначити неявку за бронюванням №%s?\nЛічильник неявок клієнта збільшиться. Оплата й листування збережуться.",$row->id),'reply_markup'=>['inline_keyboard'=>[[['text'=>t('Так, клієнт не прийшов'),'callback_data'=>$callback('z')]],[$back]]]];}
    if($action==='c')return ['text'=>t("Скасувати бронювання №%s?\n",$row->id).display_time($row->starts_at).'–'.display_time($row->ends_at,'H:i').t("\nБез повернення коштів. Група й підключений клієнт отримають сповіщення."),'reply_markup'=>['inline_keyboard'=>[[['text'=>t('Так, скасувати'),'callback_data'=>$callback('x')]],[$back]]]];
    if($action==='m'){
        $today=new \DateTimeImmutable('today',zone());$limit=$today->modify('+'.settings()['horizon_days'].' days');
        $start=preg_match('/^\d{8}$/D',$extra)?\DateTimeImmutable::createFromFormat('!Ymd',$extra,zone()):$today;
        if(!$start || $start<$today || $start>$limit)$start=$today;
        $buttons=[];$days=['',t('Пн'),t('Вт'),t('Ср'),t('Чт'),t('Пт'),t('Сб'),t('Нд')];
        for($i=0;$i<7;$i++){
            $day=$start->modify('+'.$i.' days');if($day>$limit)break;
            if(telegram_available_starts($row,$day->format('Y-m-d'),$client))$buttons[]=['text'=>$days[(int)$day->format('N')].' '.$day->format('d.m'),'callback_data'=>$callback('d',$day->format('Ymd'))];
        }
        $rows=array_chunk($buttons,2);$navigation=[];
        if($start>$today)$navigation[]=['text'=>t('← Раніше'),'callback_data'=>$callback('m',max($today,$start->modify('-7 days'))->format('Ymd'))];
        if($start->modify('+7 days')<=$limit)$navigation[]=['text'=>t('Пізніше →'),'callback_data'=>$callback('m',$start->modify('+7 days')->format('Ymd'))];
        if($navigation)$rows[]=$navigation;$rows[]=[$back];
        return ['text'=>t("Перенесення бронювання №%s\nЗараз: ",$row->id).display_time($row->starts_at).'–'.display_time($row->ends_at,'H:i').t("\nОберіть дату: ").$start->format('d.m').'–'.min($limit,$start->modify('+6 days'))->format('d.m.Y').($buttons?'':t("\nЦього тижня немає вільного часу.")),'reply_markup'=>['inline_keyboard'=>$rows]];
    }
    if(!preg_match('/^(\d{8})(?:\.(\d{2}))?$/D',$extra,$parts))return error('invalid_time',t('Оберіть дату ще раз.'));
    $date=\DateTimeImmutable::createFromFormat('!Ymd',$parts[1],zone());
    if(!$date || $date->format('Ymd')!==$parts[1])return error('invalid_time',t('Оберіть дату ще раз.'));
    if($action==='d'){
        $buttons=array_map(fn($time)=>['text'=>$time,'callback_data'=>$callback('t',$parts[1].'.'.substr($time,0,2))],telegram_available_starts($row,$date->format('Y-m-d'),$client));
        $rows=array_chunk($buttons,4);$rows[]=[['text'=>t('← Інша дата'),'callback_data'=>$callback('m',$parts[1])]];
        return ['text'=>t("Бронювання №%s · ",$row->id).$date->format('d.m.Y').t("\nТривалість: %s ч. Оберіть початок:",$row->hours).($buttons?'':t("\nВільного часу більше немає.")),'reply_markup'=>['inline_keyboard'=>$rows]];
    }
    if(!isset($parts[2]) || (int)$parts[2]>23)return error('invalid_time',t('Оберіть час ще раз.'));
    $time=$parts[2].':00';
    if(!in_array($time,telegram_available_starts($row,$date->format('Y-m-d'),$client),true))return error('slot_taken',t('Час уже недоступний. Оберіть інший.'));
    return ['text'=>t("Перенести бронювання №%s?\nБуло: ",$row->id).display_time($row->starts_at).'–'.display_time($row->ends_at,'H:i').t("\nБуде: ").$date->format('d.m.Y').' '.$time.'–'.$date->setTime((int)$parts[2],0)->modify('+'.$row->hours.' hours')->format('H:i').t("\nТариф, тривалість і вартість зберігаються."),'reply_markup'=>['inline_keyboard'=>[[['text'=>t('Підтвердити перенесення'),'callback_data'=>$callback('y',$extra)]],[['text'=>t('← Обрати час'),'callback_data'=>$callback('d',$parts[1])]],[$back]]]];
}
function handle_telegram_callback($query){
    $chat=(string)($query['message']['chat']['id'] ?? '');$user=(string)($query['from']['id'] ?? '');$message=(int)($query['message']['message_id'] ?? 0);
    $answer=function($text='', $alert=false)use($query){return telegram_api('answerCallbackQuery',['callback_query_id'=>$query['id'],'text'=>mb_substr($text,0,180),'show_alert'=>$alert]);};
    if(!notification_settings()['telegram'] || !$message || $chat!==(string)notification_settings()['admin_chat']){$answer(t('Керування доступне лише в групі студії.'),true);return;}
    $data=telegram_parse_callback((string)($query['data'] ?? ''));
    if(!$data){$answer(t('Некоректна кнопка.'),true);return;}
    $allowed=telegram_is_moderator($chat,$user);
    if(is_wp_error($allowed) || !$allowed){$answer(is_wp_error($allowed)?t('Не вдалося перевірити права. Спробуйте пізніше.'):t('Керувати бронюванням можуть лише адміністратори групи.'),true);return;}
    $row=telegram_booking_row($data['id']);
    if(!$row || $row->type!=='booking'){$answer(t('Бронювання не знайдено.'),true);return;}
    $thread=telegram_booking_topic($row->id,$chat);if(is_wp_error($thread)){$answer($thread->get_error_message(),true);return;}
    $destination=['chat_id'=>$chat]+($thread>1?['message_thread_id'=>$thread]:[]);
    if(!in_array($data['action'],['r','s'],true) && ((int)$row->version!==$data['version'] || (in_array($data['action'],['n','z'],true)?!can_mark_no_show($row):$row->status!=='confirmed') || $row->cancelled_at)){$answer(t('Бронювання вже змінилося. Натисніть «Оновити» або «До бронювання».'),true);return;}
    if($data['action']==='s'){$answer();$result=telegram_support_prompt($row,$chat,$user);if(is_wp_error($result))telegram_api('sendMessage',$destination+['text'=>$result->get_error_message()]);return;}
    $answer();$context=['actor'=>'telegram:'.$user];
    if($data['action']==='z'){$result=mark_no_show($row->id,['version'=>$data['version']],'telegram:'.$user);
    }elseif($data['action']==='x'){
        $result=cancel($row->id,['version'=>$data['version'],'refund'=>false],$context);
    }elseif($data['action']==='y'){
        $view=telegram_moderation_view($row,'t',$data['extra']);
        if(is_wp_error($view))$result=$view;
        else{
            [$date,$hour]=explode('.',$data['extra']);$date=\DateTimeImmutable::createFromFormat('!Ymd',$date);
            $result=reschedule($row->id,['version'=>$data['version'],'date'=>$date->format('Y-m-d'),'time'=>$hour.':00','hours'=>(int)$row->hours,'reason'=>'studio'],$context);
        }
    }else $result=null;
    if(is_wp_error($result)){
        telegram_api('sendMessage',$destination+['text'=>$result->get_error_message(),'reply_markup'=>['inline_keyboard'=>[[['text'=>t('Оновити бронювання'),'callback_data'=>telegram_callback_data($row,'r')]]]]]);return;
    }
    if(in_array($data['action'],['x','y','z'],true)){
        telegram_api('editMessageText',['chat_id'=>$chat,'message_id'=>$message,'text'=>$data['action']==='z'?t("Неявку за бронюванням №%s позначено.",$row->id):($data['action']==='x'?t("Бронювання №%s скасовано. Сповіщення поставлено в чергу.",$row->id):t("Бронювання №%s перенесено. Сповіщення поставлено в чергу.",$row->id)),'reply_markup'=>['inline_keyboard'=>[]]]);return;
    }
    $view=telegram_moderation_view($row,$data['action'],$data['extra']);
    if(is_wp_error($view)){telegram_api('sendMessage',$destination+['text'=>$view->get_error_message()]);return;}
    // Initial actions open a separate panel; subsequent date/time choices update it in place.
    $actions=[];foreach($query['message']['reply_markup']['inline_keyboard'] ?? [] as $keys)foreach($keys as $key)$actions[]=explode('|',$key['callback_data'] ?? '')[3] ?? '';
    $panel=$actions && !array_intersect($actions,['c','n']);
    if($thread>1 && $data['action']==='r' && !$panel){telegram_topic_card($row->id,$chat,$thread);return;}
    telegram_api($panel?'editMessageText':'sendMessage',($panel?['chat_id'=>$chat]:$destination)+($panel?['message_id'=>$message]:[])+$view);
}

function telegram_migrate_group($old,$new){
    if(!preg_match('/^-\d+$/D',(string)$new))return;
    $settings=notification_settings();if((string)$settings['admin_chat']!==(string)$old)return;
    global $wpdb;$settings['admin_chat']=(string)$new;update_option('site_booking_notifications',$settings,false);
    $wpdb->query($wpdb->prepare('UPDATE '.table('outbox')." SET recipient=%s WHERE channel='telegram' AND recipient=%s AND status IN ('pending','sending','failed')",(string)$new,(string)$old));
}
function telegram_resign_buttons($buttons){
    foreach($buttons as &$button){
        if(!empty($button['callback_data']) && str_starts_with($button['callback_data'],'bk|')){
            $payload=substr($button['callback_data'],0,strrpos($button['callback_data'],'|'));
            $button['callback_data']=$payload.'|'.substr(hash_hmac('sha256',$payload.'|'.notification_settings()['admin_chat'],wp_salt('auth')),0,12);
        }
    }unset($button);return $buttons;
}
