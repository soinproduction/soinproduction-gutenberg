<?php
namespace SiteTheme\Booking;
defined('ABSPATH') || exit;

add_action('rest_api_init', function() {
    $permission = fn() => current_user_can('manage_bookings');
    register_rest_route('site/v1','/admin/bookings', [
        ['methods'=>'GET','permission_callback'=>$permission,'callback'=>__NAMESPACE__.'\\calendar_events'],
        ['methods'=>'POST','permission_callback'=>$permission,'callback'=>function($request) {
            $result = create_manual($request->get_json_params() ?? []);
            return is_wp_error($result) ? $result : new \WP_REST_Response(['id'=>$result],201);
        }],
    ]);
    register_rest_route('site/v1','/admin/bookings/availability', ['methods'=>'GET','permission_callback'=>$permission,'callback'=>function($request) {
        $result=available_duration($request->get_params());
        if(is_wp_error($result))return $result;
        $response=new \WP_REST_Response($result);$response->header('Cache-Control','private, no-store');return $response;
    }]);
    foreach (['reschedule','cancel','refund-done'] as $action) {
        register_rest_route('site/v1','/admin/bookings/(?P<id>\d+)/'.$action, ['methods'=>'POST','permission_callback'=>$permission,'callback'=>function($request) use ($action) {
            $input=$request->get_json_params() ?? [];
            return $action==='reschedule' ? reschedule((int)$request['id'],$input) : ($action==='cancel' ? cancel((int)$request['id'],$input) : mark_refund_done((int)$request['id'],$input));
        }]);
    }
    register_rest_route('site/v1','/admin/bookings/(?P<id>\d+)', ['methods'=>'GET','permission_callback'=>$permission,'callback'=>function($request) {
        global $wpdb;
        $row = $wpdb->get_row($wpdb->prepare('SELECT b.*,c.name,c.phone,c.handle,c.tg_chat_id,c.no_show_count FROM '.table('bookings').' b LEFT JOIN '.table('clients').' c ON c.id=b.client_id WHERE b.id=%d', $request['id']), ARRAY_A);
        if (!$row) return error('not_found',t('Запис не знайдено.'),404);
        $row=(array)booking_identities([(object)$row])[0];
        unset($row['token']);
        $row['telegram_profile']=booking_telegram_profile($row['id']);
        $row['telegram_linked']=$row['telegram_profile']['linked'];
        $row['can_mark_no_show']=can_mark_no_show((object)$row);

        $row['notifications']=$wpdb->get_results($wpdb->prepare('SELECT channel,recipient,status,attempts,last_error,created_at,sent_at FROM '.table('outbox').' WHERE booking_id=%d ORDER BY id DESC LIMIT 12',$request['id']),ARRAY_A);
        foreach($row['notifications'] as &$notification){$notification['audience']=$notification['channel']==='telegram' && (string)$notification['recipient']===(string)notification_settings()['admin_chat']?'group':'client';unset($notification['recipient']);}unset($notification);
        $row['refund'] = $wpdb->get_row($wpdb->prepare('SELECT id,amount,status,created_at,updated_at FROM '.table('refunds').' WHERE booking_id=%d',$request['id']), ARRAY_A);
        $row['date_local'] = display_time($row['starts_at'],'Y-m-d');
        $row['time_local'] = display_time($row['starts_at'],'H:i');
        $row['starts_local'] = display_time($row['starts_at']);
        $row['ends_local'] = display_time($row['ends_at']);
        $row['status_label'] = statuses()[$row['type']==='block'?($row['cancelled_at']?'block_removed':'block'):$row['status']] ?? $row['status'];
        $row['events'] = $wpdb->get_results($wpdb->prepare('SELECT actor,action,payload,created_at FROM '.table('events').' WHERE booking_id=%d ORDER BY id DESC',$request['id']), ARRAY_A);
        foreach ($row['events'] as &$event) {
            $event['time_local'] = display_time($event['created_at']);
            $event['action_label'] = action_label($event['action']);
            $event['actor_label'] = actor_label($event['actor']);
            $event['description'] = event_description($event);
        }
        unset($event);
        $response = new \WP_REST_Response($row);
        $response->header('Cache-Control','private, no-store');
        return $response;
    }]);
});

function calendar_events($request) {
    global $wpdb;
    $from = local_time((string)$request['from'].' 00:00');
    $to = local_time((string)$request['to'].' 00:00');
    if (!$from || !$to || $to <= $from || $from->diff($to)->days>62) return error('invalid_range',t('Оберіть період не більше 62 днів.'));
    $utc = new \DateTimeZone('UTC');
    $where = 'b.starts_at < %s AND b.ends_at > %s AND b.cancelled_at IS NULL';
    if ($request['include_cancelled'] === '1') $where = "b.starts_at < %s AND b.ends_at > %s AND (b.type='booking' OR b.cancelled_at IS NULL)";
    if ($request['include_cancelled'] !== '1') $where .= " AND (b.type='block' OR b.status IN ('confirmed','awaiting_payment','completed','no_show'))";
    $rows = $wpdb->get_results($wpdb->prepare('SELECT b.*,c.name,c.phone FROM '.table('bookings').' b LEFT JOIN '.table('clients').' c ON c.id=b.client_id WHERE '.$where.' ORDER BY b.starts_at', $to->setTimezone($utc)->format('Y-m-d H:i:s'),$from->setTimezone($utc)->format('Y-m-d H:i:s')));
    $events = [];
    foreach (booking_identities($rows) as $row) {
        $status = $row->type==='block'?'block':$row->status;
        $events[] = ['id'=>(string)$row->id,'title'=>$row->type==='block' ? $row->note : ($row->name ?: $row->phone ?: t('Клієнт')),
            'start'=>str_replace(' ','T',$row->starts_at).'Z', 'end'=>str_replace(' ','T',$row->ends_at).'Z',
            'classNames'=>['site-booking-event--'.$status],
            'extendedProps'=>['phone'=>$row->type==='booking'?($row->phone ?? ''):'','status'=>$status,'statusLabel'=>statuses()[$status] ?? $status,'manual'=>$row->payment_mode==='offline']];
    }
    $response = new \WP_REST_Response($events);
    $response->header('Cache-Control','private, no-store');
    return $response;
}


function event_description($event) {
    $payload=json_decode($event['payload'] ?? '',true) ?: [];
    if ($event['action']==='rescheduled' && isset($payload['from']['starts_at'],$payload['to']['starts_at'])) {
        return display_time($payload['from']['starts_at']).' → '.display_time($payload['to']['starts_at']).' · '.($payload['reason']==='client'?t('На прохання клієнта'):t('З ініціативи студії'));
    }
    if ($event['action']==='cancelled') return !empty($payload['refund'])?t('З ручним поверненням коштів'):t('Без повернення коштів');
    return '';
}
