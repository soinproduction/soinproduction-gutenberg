<?php
namespace SiteTheme\Booking;
defined('ABSPATH') || exit;

function can_mark_no_show($row){return $row->type==='booking' && !$row->cancelled_at && in_array($row->status,['confirmed','completed'],true) && $row->ends_at<=gmdate('Y-m-d H:i:s');}
function complete_due_bookings($limit=100,$ids=null){
    if(get_option('site_booking_schema')!=='2')return 0;
    global $wpdb;$where="type='booking' AND status='confirmed' AND cancelled_at IS NULL AND ends_at<=UTC_TIMESTAMP()";
    if($ids!==null){$ids=array_values(array_filter(array_map('absint',$ids)));if(!$ids)return 0;$where.=' AND id IN ('.implode(',',$ids).')';}
    $rows=$wpdb->get_results($wpdb->prepare('SELECT id,version FROM '.table('bookings').' WHERE '.$where.' ORDER BY ends_at,id LIMIT %d',max(1,min(500,(int)$limit))));$count=0;
    foreach($rows as $row){
        $result=mutate($row->id,$row->version,function($locked){
            if($locked->type!=='booking' || $locked->ends_at>gmdate('Y-m-d H:i:s'))return error('not_finished',t('Час оренди ще не завершився.'),409);
            record_change($locked,['status'=>'completed'],'completed',[],'system');return true;
        });
        if(!is_wp_error($result))$count++;
    }
    return $count;
}
function mark_no_show($id,$input,$actor=null){
    return mutate($id,$input['version'] ?? null,function($row)use($actor){
        if(!can_mark_no_show($row))return error('not_finished',t('Неявку можна позначити після завершення часу оренди.'),409);
        global $wpdb;
        if($row->client_id && $wpdb->query($wpdb->prepare('UPDATE '.table('clients').' SET no_show_count=no_show_count+1,updated_at=UTC_TIMESTAMP() WHERE id=%d',$row->client_id))!==1)throw new \RuntimeException('client_counter');
        record_change($row,['status'=>'no_show'],'no_show',[],$actor);return true;
    },['confirmed','completed']);
}
/** A claimed reminder is never repeated; rescheduling clears reminder_sent_at. */
function queue_due_reminders(){
    global $wpdb;$hours=(int)settings()['reminder_hours'];$settings=notification_settings();
    $rows=$wpdb->get_col($wpdb->prepare('SELECT id FROM '.table('bookings')." WHERE type='booking' AND status='confirmed' AND cancelled_at IS NULL AND reminder_sent_at IS NULL AND starts_at>UTC_TIMESTAMP() AND starts_at<=UTC_TIMESTAMP()+INTERVAL %d HOUR AND created_at<starts_at-INTERVAL %d HOUR ORDER BY starts_at LIMIT 50",$hours,$hours));
    foreach($rows as $id){
        if($wpdb->query($wpdb->prepare('UPDATE '.table('bookings').' SET reminder_sent_at=UTC_TIMESTAMP() WHERE id=%d AND reminder_sent_at IS NULL',$id))!==1)continue;
        $row=telegram_booking_row($id);$message=booking_notice_text($row,'reminder');$key='reminder:'.$id.':'.$row->starts_at.':';
        $chat=$wpdb->get_var($wpdb->prepare('SELECT chat_id FROM '.table('telegram_links').' WHERE booking_id=%d',$id));
        if($chat && $settings['telegram'] && telegram_token())queue_notice('telegram',$chat,$message,$key.'client',$id,telegram_client_buttons($row,$chat));
        $payload=json_decode((string)$wpdb->get_var($wpdb->prepare('SELECT payload FROM '.table('events')." WHERE booking_id=%d AND action='created' ORDER BY id LIMIT 1",$id)),true);
        if($settings['email'] && is_email($payload['email'] ?? ''))queue_notice('email',$payload['email'],$message,$key.'email',$id,[],t('Нагадування про бронювання №').$id);
    }
}
function queue_daily_digest(){
    global $wpdb;$settings=notification_settings();$zone=zone();$now=new \DateTimeImmutable('now',$zone);$date=$now->format('Y-m-d');
    if(!$settings['telegram'] || !$settings['admin_chat'] || !telegram_token() || $now->format('H:i')<settings()['digest_time'] || get_option('site_booking_digest_date')===$date)return;
    $utc=new \DateTimeZone('UTC');$start=local_time($date.' 00:00');
    $rows=$wpdb->get_results($wpdb->prepare('SELECT id FROM '.table('bookings')." WHERE type='booking' AND status='confirmed' AND cancelled_at IS NULL AND starts_at>=%s AND starts_at<%s ORDER BY starts_at",$start->setTimezone($utc)->format('Y-m-d H:i:s'),$start->modify('+1 day')->setTimezone($utc)->format('Y-m-d H:i:s')));
    $lines=array_map(function($item){$row=telegram_booking_row($item->id);return display_time($row->starts_at,'H:i').'–'.display_time($row->ends_at,'H:i').' · №'.$row->id.' · '.($row->name ?: $row->phone);},$rows);
    queue_notice('telegram',$settings['admin_chat'],t('Зведення на ').$now->format('d.m.Y')."\n".($lines?implode("\n",$lines):t('Бронювань на сьогодні немає.')),'digest:'.$settings['admin_chat'].':'.$date);
    update_option('site_booking_digest_date',$date,false);
}
function queue_scheduled_notices(){
    if(get_option('site_booking_schema')!=='2' || get_option('site_booking_notifications_schema')!=='2' || !apply_filters('site_booking_notifications_enabled',true))return;
    try{queue_due_reminders();queue_daily_digest();}catch(\Throwable $exception){log_failure('scheduled_notices',$exception);}
}
add_action('init',function(){if(get_option('site_booking_schema')==='2' && !wp_next_scheduled('site_booking_lifecycle_tick'))wp_schedule_event(time()+60,'site_booking_minute','site_booking_lifecycle_tick');});
add_action('site_booking_lifecycle_tick',__NAMESPACE__.'\\complete_due_bookings');
add_action('admin_init',function(){if(current_user_can('manage_bookings'))complete_due_bookings();},30);
add_action('rest_api_init',function(){register_rest_route('site/v1','/admin/bookings/(?P<id>\d+)/no-show',['methods'=>'POST','permission_callback'=>fn()=>current_user_can('manage_bookings'),'callback'=>fn($r)=>mark_no_show((int)$r['id'],$r->get_json_params() ?? [])]);});
