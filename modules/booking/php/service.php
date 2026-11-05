<?php
namespace SiteTheme\Booking;
defined('ABSPATH') || exit;

function money($value) {
    $value = (string)$value;
    if (!preg_match('/^\d{1,7}(?:[.,]\d{1,2})?$/D', $value)) return error('invalid_amount', t('Вкажіть суму з точністю до двох знаків після коми.'));
    $parts = preg_split('/[.,]/', $value);
    return (int)$parts[0] * 100 + (int)str_pad($parts[1] ?? '', 2, '0');
}

function local_time($value) {
    $date = \DateTimeImmutable::createFromFormat('!Y-m-d H:i', $value, zone());
    return $date && $date->format('Y-m-d H:i') === $value ? $date : null;
}

function display_time($value, $format = 'd.m.Y H:i') {
    return (new \DateTimeImmutable($value, new \DateTimeZone('UTC')))->setTimezone(zone())->format($format);
}

/** Manual entries share the same atomic slot allocation future API/bot operations will use. */
function create_manual($input, $context = []) {
    global $wpdb;
    if (get_option('site_booking_schema') !== '2') return error('storage_unavailable', t('Сховище бронювань ще не готове.'), 503);
    $type = $input['type'] ?? '';
    if (!in_array($type, ['booking','block'], true)) return error('invalid_type', t('Оберіть бронювання або блокування часу.'));
    $start = local_time(($input['date'] ?? '').' '.($input['time'] ?? ''));
    $hours = filter_var($input['hours'] ?? null, FILTER_VALIDATE_INT);
    if (!$start || $start->format('i') !== '00' || !$hours || $hours < 1 || $hours > 24) return error('invalid_time', t('Вкажіть дату, початок на цілу годину й тривалість від 1 до 24 годин.'));
    $config = settings();
    $now = new \DateTimeImmutable('now', zone());
    if ($start <= $now || $start->format('Y-m-d') > $now->modify('+'.$config['horizon_days'].' days')->format('Y-m-d')) return error('invalid_date', t('Оберіть майбутній час у межах горизонту бронювання.'));
    $start_utc = $start->setTimezone(new \DateTimeZone('UTC'));
    $end = $start_utc->modify('+'.$hours.' hours')->setTimezone(zone());
    $working = $config['weekly'][(int)$start->format('N')] ?? null;
    if ($type === 'booking' && (!$working || $end->format('Y-m-d') !== $start->format('Y-m-d') || $start->format('H:i') < $working['open'] || $end->format('H:i') > $working['close'])) return error('outside_hours', t('Бронювання має повністю вкладатися в робочі години.'));
    $note = sanitize_textarea_field($input['note'] ?? '');
    if (mb_strlen($note) > 500) return error('invalid_note', t('Нотатка може містити не більше 500 символів.'));
    if ($type === 'block' && $note === '') return error('missing_reason', t('Вкажіть причину блокування часу.'));
    $name = sanitize_text_field($input['name'] ?? '');
    $phone = normalize_phone($input['phone'] ?? '');
    $handle = sanitize_text_field($input['handle'] ?? '');
    $shoot = sanitize_text_field($input['shoot_type'] ?? '');
    $people = empty($input['people_count']) ? null : filter_var($input['people_count'], FILTER_VALIDATE_INT);
    $amount = $type === 'block' ? 0 : money($input['amount'] ?? '');
    if ($type === 'booking' && (!$name || mb_strlen($name)>100 || !valid_phone($phone))) return error('invalid_client', t('Вкажіть ім’я та коректний номер телефону.'));
    if (mb_strlen($handle)>100 || mb_strlen($shoot)>100 || ($people !== null && ($people === false || $people < 1 || $people > 255))) return error('invalid_details', t('Перевірте контакт, тип зйомки й кількість людей (1–255).'));
    if (is_wp_error($amount)) return $amount;
    $utc = new \DateTimeZone('UTC');
    $stamp = gmdate('Y-m-d H:i:s');
    if ($wpdb->query('START TRANSACTION') === false) return error('storage_error',t('Не вдалося розпочати операцію.'),500);
    try {
        $client_id = null;
        if ($type === 'booking') {
            $sql = $wpdb->prepare('INSERT INTO '.table('clients').' (phone,name,handle,created_at,updated_at) VALUES (%s,%s,%s,%s,%s) ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id)', $phone,$name,$handle,$stamp,$stamp);
            if ($wpdb->query($sql) === false) throw new \RuntimeException('database');
            $client_id = (int)$wpdb->insert_id;
            // Existing client identity is retained; submitted details are kept in the creation event.
        }
        if (!$wpdb->insert(table('bookings'), [
            'token'=>$context['token'] ?? bin2hex(random_bytes(24)), 'type'=>$type, 'hall_id'=>1,
            'status'=>$type === 'booking' ? 'confirmed' : null,
            'starts_at'=>$start->setTimezone($utc)->format('Y-m-d H:i:s'),
            'ends_at'=>$end->setTimezone($utc)->format('Y-m-d H:i:s'), 'hours'=>$hours,
            'price_per_hour'=>$type === 'booking' ? ($context['price_per_hour'] ?? $config['price_per_hour']) : 0,
            'amount'=>$amount, 'payment_mode'=>$type === 'booking' ? ($context['payment_mode'] ?? 'offline') : null,
            'client_id'=>$client_id, 'shoot_type'=>$type === 'booking' ? $shoot : '',
            'people_count'=>$type === 'booking' ? $people : null, 'note'=>$note,
            'created_at'=>$stamp,'updated_at'=>$stamp,
        ])) throw new \RuntimeException('database');
        $id = (int)$wpdb->insert_id;
        for ($i = 0; $i < $hours; $i++) {
            $slot = $start_utc->modify('+'.$i.' hours')->format('Y-m-d H:i:s');
            $previous = $wpdb->suppress_errors(true);
            $inserted = $wpdb->insert(table('slots'), ['hall_id'=>1,'starts_at'=>$slot,'booking_id'=>$id]);
            $wpdb->suppress_errors($previous);
            if (!$inserted) {
                $conflict = $wpdb->get_var($wpdb->prepare('SELECT booking_id FROM '.table('slots').' WHERE hall_id=1 AND starts_at=%s', $slot));
                throw new \RuntimeException($conflict ? 'conflict:'.$conflict : 'database');
            }
        }
        if (!$wpdb->insert(table('events'), ['booking_id'=>$id,'actor'=>$context['actor'] ?? 'admin:'.get_current_user_id(),'action'=>'created',
            'payload'=>wp_json_encode(['source'=>$context['source'] ?? 'admin','email'=>$context['email'] ?? null,'tariff'=>$context['tariff'] ?? null,'payment_mode'=>$type === 'booking' ? ($context['payment_mode'] ?? 'offline') : null,'phone'=>$type === 'booking' ? $phone : null,'name'=>$type === 'booking' ? $name : null,'handle'=>$type === 'booking' ? $handle : null]),'created_at'=>$stamp])) throw new \RuntimeException('database');
        queue_booking_notice($id,'created');
        if ($wpdb->query('COMMIT') === false) throw new \RuntimeException('database');
        return $id;
    } catch (\Throwable $exception) {
        $wpdb->query('ROLLBACK');
        if (str_starts_with($exception->getMessage(), 'conflict:')) return error('slot_taken', t('Цей час перетинається з бронюванням або блокуванням №').substr($exception->getMessage(),9).t('. Оберіть інший час.'), 409);
        log_failure('create', $exception);
        return error('storage_error', t('Не вдалося зберегти бронювання. Спробуйте ще раз.'), 500);
    }
}

function records($filters = [], $limit = 50, $offset = 0) {
    global $wpdb;
    $where = ['1=1']; $args = [];
    foreach (['from'=>'>=', 'to'=>'<='] as $key=>$operator) {
        if (!empty($filters[$key]) && preg_match('/^\d{4}-\d{2}-\d{2}$/D', $filters[$key])) {
            $date = local_time($filters[$key].($key === 'from' ? ' 00:00' : ' 23:59'));
            if ($date) { $where[] = 'b.starts_at '.$operator.' %s'; $args[] = $date->setTimezone(new \DateTimeZone('UTC'))->format('Y-m-d H:i:s'); }
        }
    }
    if (!empty($filters['status'])) {
        if (in_array($filters['status'],['block','block_removed'],true)) {
            $where[] = "b.type='block' AND b.cancelled_at IS ".($filters['status']==='block'?'NULL':'NOT NULL');
        } else { $where[] = 'b.status=%s'; $args[] = $filters['status']; }
    }
    if (!empty($filters['q'])) {
        $like = '%'.$wpdb->esc_like($filters['q']).'%';
        $digits = preg_replace('/\D/', '', $filters['q']);
        $where[] = '(c.name LIKE %s OR c.phone LIKE %s)'; $args[] = $like; $args[] = $digits ? '%'.$wpdb->esc_like($digits).'%' : $like;
    }
    $args[] = min(100, max(1, $limit)); $args[] = max(0,$offset);
    return booking_identities($wpdb->get_results($wpdb->prepare('SELECT b.*,c.name,c.phone,c.handle,c.tg_chat_id,c.no_show_count FROM '.table('bookings').' b LEFT JOIN '.table('clients').' c ON c.id=b.client_id WHERE '.implode(' AND ', $where).' ORDER BY b.starts_at DESC,b.id DESC LIMIT %d OFFSET %d', $args)));
}

/** All mutations lock the entry and compare its version before changing slots. */
function mutate($id, $version, $operation, $allowed_statuses=['confirmed']) {
    global $wpdb;
    if (get_option('site_booking_schema') !== '2') return error('storage_unavailable',t('Оновіть сторінку адмінки, щоб оновити сховище.'),503);
    $version = filter_var($version, FILTER_VALIDATE_INT);
    if ($version === false || $version < 0) return error('invalid_version',t('Оновіть картку запису.'),422);
    if ($wpdb->query('START TRANSACTION') === false) return error('storage_error',t('Не вдалося розпочати операцію.'),500);
    try {
        $row = $wpdb->get_row($wpdb->prepare('SELECT * FROM '.table('bookings').' WHERE id=%d FOR UPDATE',$id));
        if (!$row) $result = error('not_found',t('Запис не знайдено.'),404);
        elseif ((int)$row->version !== $version) $result = error('version_conflict',t('Запис уже змінив інший адміністратор. Оновіть картку й повторіть дію.'),409);
        elseif ($row->cancelled_at || ($row->type === 'booking' && !in_array($row->status,$allowed_statuses,true))) $result = error('invalid_status',t('Ця дія недоступна для поточного статусу запису.'),409);
        else $result = $operation($row);
        if (is_wp_error($result)) { $wpdb->query('ROLLBACK'); return $result; }
        if ($wpdb->query('COMMIT') === false) throw new \RuntimeException('commit');
        return ['id'=>(int)$id,'version'=>$version+1];
    } catch (\Throwable $exception) {
        $wpdb->query('ROLLBACK');
        log_failure('mutate', $exception);
        return error('storage_error',t('Не вдалося зберегти зміни. Спробуйте ще раз.'),500);
    }
}

function record_change($row, $changes, $action, $payload, $actor=null) {
    global $wpdb;
    $stamp = gmdate('Y-m-d H:i:s');
    $changes['version'] = (int)$row->version+1;
    $changes['updated_at'] = $stamp;
    if ($wpdb->update(table('bookings'),$changes,['id'=>$row->id,'version'=>$row->version]) !== 1) throw new \RuntimeException('update');
    if (!$wpdb->insert(table('events'),['booking_id'=>$row->id,'actor'=>$actor ?? 'admin:'.get_current_user_id(),'action'=>$action,'payload'=>wp_json_encode($payload),'created_at'=>$stamp])) throw new \RuntimeException('event');
    queue_booking_notice($row->id,$action);
}

function reschedule($id, $input, $context=[]) {
    return mutate($id,$input['version'] ?? null,function($row) use ($input,$context) {
        global $wpdb;
        if(isset($context['client_chat'])){
            $permission=client_booking_permission($row,$context['client_chat'],'reschedule',true);if(is_wp_error($permission))return $permission;
            if(($input['reason'] ?? '')!=='client' || (int)($input['hours'] ?? $row->hours)!==(int)$row->hours)return error('fixed_duration',t('Тривалість клієнтської броні змінювати не можна.'));
        }
        $reason = $input['reason'] ?? '';
        if (!in_array($reason,['client','studio'],true)) return error('invalid_reason',t('Оберіть причину перенесення.'));
        $start = local_time(($input['date'] ?? '').' '.($input['time'] ?? ''));
        $hours = filter_var($input['hours'] ?? $row->hours,FILTER_VALIDATE_INT);
        if (!$start || $start->format('i')!=='00' || !$hours || $hours<1 || $hours>24) return error('invalid_time',t('Вкажіть дату, цілу годину початку й тривалість від 1 до 24 годин.'));
        if ($row->payment_mode==='online' && $hours!==(int)$row->hours) return error('fixed_duration',t('Тривалість оплаченого онлайн-бронювання змінювати не можна.'));
        $utc = new \DateTimeZone('UTC');
        $start_utc = $start->setTimezone($utc);
        $end_utc = $start_utc->modify('+'.$hours.' hours');
        $end = $end_utc->setTimezone(zone());
        $config=settings();
        $now=new \DateTimeImmutable('now',zone());
        if ($start<=$now || $start->format('Y-m-d')>$now->modify('+'.$config['horizon_days'].' days')->format('Y-m-d')) return error('invalid_date',t('Оберіть майбутній час у межах горизонту бронювання.'));
        if(isset($context['client_chat']) && $start<$now->modify('+'.$config['minimum_notice_hours'].' hours'))return error('minimum_notice',t('До початку замало часу. Оберіть інший час.'));
        $working=$config['weekly'][(int)$start->format('N')] ?? null;
        if ($row->type==='booking' && (!$working || $end->format('Y-m-d')!==$start->format('Y-m-d') || $start->format('H:i')<$working['open'] || $end->format('H:i')>$working['close'])) return error('outside_hours',t('Бронювання має повністю вкладатися в робочі години.'));
        $from=['starts_at'=>$row->starts_at,'ends_at'=>$row->ends_at,'hours'=>(int)$row->hours];
        $to=['starts_at'=>$start_utc->format('Y-m-d H:i:s'),'ends_at'=>$end_utc->format('Y-m-d H:i:s'),'hours'=>$hours];
        if ($from===$to) return error('unchanged',t('Оберіть інший час або тривалість.'));
        if ($wpdb->delete(table('slots'),['booking_id'=>$row->id])===false) throw new \RuntimeException('delete');
        for ($i=0;$i<$hours;$i++) {
            $slot=$start_utc->modify('+'.$i.' hours')->format('Y-m-d H:i:s');
            $previous=$wpdb->suppress_errors(true);
            $ok=$wpdb->insert(table('slots'),['hall_id'=>$row->hall_id,'starts_at'=>$slot,'booking_id'=>$row->id]);
            $wpdb->suppress_errors($previous);
            if (!$ok) {
                $conflict=$wpdb->get_var($wpdb->prepare('SELECT booking_id FROM '.table('slots').' WHERE hall_id=%d AND starts_at=%s',$row->hall_id,$slot));
                if ($conflict) return error('slot_taken',t('Час зайнято записом №').$conflict.t('. Початковий час вашого бронювання збережено.'),409);
                throw new \RuntimeException('slot');
            }
        }
        $amount=$row->type==='booking' && $row->payment_mode==='offline' && isset($input['amount']) ? money($input['amount']) : (int)$row->amount;
        if (is_wp_error($amount)) return $amount;
        record_change($row,$to+['amount'=>$amount,'reschedule_count'=>(int)$row->reschedule_count+($row->type==='booking' && $reason==='client'?1:0),'reminder_sent_at'=>null],'rescheduled',['from'=>$from,'to'=>$to,'reason'=>$reason,'amount_from'=>(int)$row->amount,'amount_to'=>$amount],$context['actor'] ?? null);
        return true;
    });
}

function cancel($id,$input,$context=[]) {
    return mutate($id,$input['version'] ?? null,function($row) use ($input,$context) {
        global $wpdb;
        if(isset($context['client_chat'])){
            $permission=client_booking_permission($row,$context['client_chat'],'cancel',true);if(is_wp_error($permission))return $permission;
            if(($input['refund'] ?? false)!==false)return error('invalid_refund',t('Оплату не проводили. Повернення недоступне.'));
        }
        if (!isset($input['refund']) || !is_bool($input['refund'])) return error('invalid_refund',t('Оберіть варіант скасування.'));
        $refund=$row->type==='booking' && $input['refund'] && (int)$row->amount>0;
        if($refund && $row->payment_mode==='unpaid')return error('not_paid',t('Бронювання створено без оплати. Скасуйте його без повернення.'));
        // No bank request may be implied before the payment provider is connected.
        if ($refund && $row->payment_mode==='online') return error('provider_unavailable',t('Повернення онлайн-оплати поки не підключено. Скасування з поверненням недоступне.'),503);
        if ($refund) {
            $stamp=gmdate('Y-m-d H:i:s');
            if (!$wpdb->insert(table('refunds'),['booking_id'=>$row->id,'amount'=>$row->amount,'status'=>'pending','initiated_by'=>'admin:'.get_current_user_id(),'created_at'=>$stamp,'updated_at'=>$stamp])) throw new \RuntimeException('refund');
        }
        if ($wpdb->delete(table('slots'),['booking_id'=>$row->id])===false) throw new \RuntimeException('slots');
        record_change($row,['status'=>$row->type==='block'?null:(($input['refund'] || (isset($context['client_chat']) && $row->payment_mode==='unpaid'))?'cancelled':'cancelled_late'),'cancelled_at'=>gmdate('Y-m-d H:i:s'),'cancelled_by'=>$context['actor'] ?? 'admin:'.get_current_user_id()],$row->type==='block'?'block_removed':'cancelled',['refund'=>$refund,'amount'=>(int)$row->amount,'refund_method'=>$refund?'manual':null],$context['actor'] ?? null);
        return true;
    });
}

function mark_refund_done($id,$input) {
    global $wpdb;
    if ($wpdb->query('START TRANSACTION') === false) return error('storage_error',t('Не вдалося розпочати операцію.'),500);
    try {
        $row=$wpdb->get_row($wpdb->prepare('SELECT * FROM '.table('bookings').' WHERE id=%d FOR UPDATE',$id));
        if (!$row) { $wpdb->query('ROLLBACK'); return error('not_found',t('Бронювання не знайдено.'),404); }
        $version=filter_var($input['version'] ?? null,FILTER_VALIDATE_INT);
        if ($version===false || $version!==(int)$row->version) { $wpdb->query('ROLLBACK'); return error('version_conflict',t('Запис уже змінено. Оновіть картку.'),409); }
        $refund=$wpdb->get_row($wpdb->prepare('SELECT * FROM '.table('refunds').' WHERE booking_id=%d FOR UPDATE',$id));
        if (!$refund || $refund->status!=='pending' || $row->payment_mode!=='offline') { $wpdb->query('ROLLBACK'); return error('invalid_refund',t('Немає ручного повернення, що очікує підтвердження.'),409); }
        if ($wpdb->update(table('refunds'),['status'=>'manual_done','updated_at'=>gmdate('Y-m-d H:i:s')],['id'=>$refund->id,'status'=>'pending'])!==1) throw new \RuntimeException('refund');
        record_change($row,[],'refund_manual_done',['amount'=>(int)$refund->amount]);
        if ($wpdb->query('COMMIT')===false) throw new \RuntimeException('commit');
        return ['id'=>(int)$id,'version'=>$version+1];
    } catch (\Throwable $exception) { $wpdb->query('ROLLBACK'); log_failure('refund', $exception); return error('storage_error',t('Не вдалося підтвердити повернення.'),500); }
}

/** Advisory choices only; transactional mutations still recheck every occupied slot. */
function available_duration($input, $config = null) {
    global $wpdb;
    $type=$input['type'] ?? 'booking';
    if (!in_array($type,['booking','block'],true)) return error('invalid_type',t('Оберіть тип запису.'));
    $start=local_time(($input['date'] ?? '').' '.($input['time'] ?? ''));
    if (!$start || $start->format('i')!=='00') return error('invalid_time',t('Оберіть дату й цілу годину початку.'));
    $config=$config ?? settings();$now=new \DateTimeImmutable('now',zone());
    if ($start<=$now || $start->format('Y-m-d')>$now->modify('+'.$config['horizon_days'].' days')->format('Y-m-d')) return ['max_hours'=>0];
    $working=$config['weekly'][(int)$start->format('N')] ?? null;
    if ($type==='booking' && (!$working || $start->format('H:i')<$working['open'] || $start->format('H:i')>=$working['close'])) return ['max_hours'=>0];
    $utc=$start->setTimezone(new \DateTimeZone('UTC'));
    $busy=$wpdb->get_col($wpdb->prepare('SELECT starts_at FROM '.table('slots').' WHERE hall_id=1 AND starts_at >= %s AND starts_at < %s AND booking_id <> %d',$utc->format('Y-m-d H:i:s'),$utc->modify('+24 hours')->format('Y-m-d H:i:s'),absint($input['exclude_id'] ?? 0)));
    $max=0;
    for($hour=0;$hour<24;$hour++) {
        $slot=$utc->modify('+'.$hour.' hours');$end=$slot->modify('+1 hour')->setTimezone(zone());
        if(in_array($slot->format('Y-m-d H:i:s'),$busy,true))break;
        if($type==='booking' && ($end->format('Y-m-d')!==$start->format('Y-m-d') || $end->format('H:i')>$working['close']))break;
        $max++;
    }
    return ['max_hours'=>$max];
}
