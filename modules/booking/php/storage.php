<?php
namespace SiteTheme\Booking;
defined('ABSPATH') || exit;

function table($name) {
    global $wpdb;
    return $wpdb->prefix.'site_booking_'.$name;
}

function install() {
    if (!current_user_can('manage_options')) return;
    if (get_option('site_booking_schema') !== '2') {
        global $wpdb;
        require_once ABSPATH.'wp-admin/includes/upgrade.php';
        $charset = $wpdb->get_charset_collate();
        $schemas = [
            'clients' => "id bigint unsigned NOT NULL AUTO_INCREMENT,
                phone varchar(16) NOT NULL,
                name varchar(100) NOT NULL,
                handle varchar(100) NOT NULL DEFAULT '',
                tg_chat_id bigint NULL,
                no_show_count smallint unsigned NOT NULL DEFAULT 0,
                created_at datetime NOT NULL,
                updated_at datetime NOT NULL,
                PRIMARY KEY  (id),
                UNIQUE KEY phone (phone)",
            'bookings' => "id bigint unsigned NOT NULL AUTO_INCREMENT,
                token varchar(64) NOT NULL,
                type varchar(10) NOT NULL,
                hall_id smallint NOT NULL DEFAULT 1,
                status varchar(24) NULL,
                starts_at datetime NOT NULL,
                ends_at datetime NOT NULL,
                hours smallint unsigned NOT NULL,
                price_per_hour int unsigned NOT NULL,
                amount int unsigned NOT NULL,
                payment_mode varchar(10) NULL,
                client_id bigint unsigned NULL,
                shoot_type varchar(100) NOT NULL DEFAULT '',
                people_count smallint unsigned NULL,
                note varchar(500) NOT NULL DEFAULT '',
                reschedule_count smallint unsigned NOT NULL DEFAULT 0,
                hold_expires_at datetime NULL,
                reminder_sent_at datetime NULL,
                cancelled_at datetime NULL,
                cancelled_by varchar(40) NULL,
                version int unsigned NOT NULL DEFAULT 0,
                created_at datetime NOT NULL,
                updated_at datetime NOT NULL,
                PRIMARY KEY  (id),
                UNIQUE KEY token (token),
                KEY status_start (status,starts_at),
                KEY client_id (client_id)",
            'slots' => "hall_id smallint NOT NULL,
                starts_at datetime NOT NULL,
                booking_id bigint unsigned NOT NULL,
                PRIMARY KEY  (hall_id,starts_at),
                KEY booking_id (booking_id)",
            'refunds' => "id bigint unsigned NOT NULL AUTO_INCREMENT,
                booking_id bigint unsigned NOT NULL,
                amount int unsigned NOT NULL,
                status varchar(20) NOT NULL,
                initiated_by varchar(40) NOT NULL,
                created_at datetime NOT NULL,
                updated_at datetime NOT NULL,
                PRIMARY KEY  (id),
                UNIQUE KEY booking_id (booking_id)",
            'events' => "id bigint unsigned NOT NULL AUTO_INCREMENT,
                booking_id bigint unsigned NOT NULL,
                actor varchar(40) NOT NULL,
                action varchar(40) NOT NULL,
                payload longtext NULL,
                created_at datetime NOT NULL,
                PRIMARY KEY  (id),
                KEY booking_id (booking_id)",
        ];
        foreach ($schemas as $name => $definition) {
            dbDelta('CREATE TABLE '.table($name)." ($definition) ENGINE=InnoDB $charset;");
        }
        // Do not mark a partial migration successful or allow nontransactional storage.
        foreach (array_keys($schemas) as $name) {
            $row = $wpdb->get_row($wpdb->prepare('SHOW TABLE STATUS WHERE Name = %s', table($name)));
            if (!$row || strtoupper($row->Engine) !== 'INNODB') return;
        }
        update_option('site_booking_schema', '2', false);
    }
    $role = get_role('administrator');
    if ($role && !$role->has_cap('manage_bookings')) $role->add_cap('manage_bookings');
}

function defaults() {
    return [
        'price_per_hour'=>130000, 'minimum_notice_hours'=>1, 'horizon_days'=>90,
        'hold_minutes'=>20, 'invoice_minutes'=>15, 'cancellation_hours'=>24,
        'reschedule_limit'=>1, 'unpaid_limit'=>2, 'reminder_hours'=>2,
        'digest_time'=>'09:00', 'rules'=>'',
        'weekly'=>array_fill(1, 6, ['open'=>'10:00','close'=>'21:00']) + [7=>['open'=>'11:00','close'=>'20:00']],
    ];
}

function settings() {
    $config=array_replace(defaults(), (array)get_option('site_booking_settings', []));
    foreach(booking_tariffs() as $tariff)if($tariff['billing_mode']==='hourly'){$config['price_per_hour']=$tariff['price'];break;}
    return $config;
}

function error($code, $message, $status = 422) {
    return new \WP_Error($code, $message, ['status'=>$status]);
}

function log_failure($context, $exception) {
    error_log('[site-booking] '.$context.': '.$exception->getMessage());
}

function normalize_phone($value) {
    $phone = preg_replace('/[\s()\-]/u', '', is_string($value) ? $value : '');
    [$code, $digits] = phone_format();
    // A national trunk 0 is the code's last digit for Ukraine-style numbering.
    if (preg_match('/^0\d{'.$digits.'}$/D', $phone)) $phone = '+'.substr($code, 0, -1).$phone;
    if (preg_match('/^'.$code.'\d{'.$digits.'}$/D', $phone)) $phone = '+'.$phone;
    return $phone;
}

function phone_format() {
    return [(string)(config('phone_code') ?: '380'), (int)(config('phone_digits') ?: 9)];
}

function valid_phone($phone) {
    [$code, $digits] = phone_format();
    return (bool)preg_match('/^\+'.$code.'\d{'.$digits.'}$/D', $phone);
}

function save_settings($input) {
    $result = settings();
    $ranges = ['minimum_notice_hours'=>[0,168], 'horizon_days'=>[1,365], 'hold_minutes'=>[2,120],
        'invoice_minutes'=>[1,119], 'cancellation_hours'=>[0,720], 'reschedule_limit'=>[0,20],
        'unpaid_limit'=>[1,20], 'reminder_hours'=>[1,168]];
    foreach ($ranges as $key => [$min,$max]) {
        // Payment timing stays stored for the provider integration; it has no admin field yet.
        $fallback = in_array($key, ['hold_minutes','invoice_minutes'], true) ? $result[$key] : null;
        $value = filter_var($input[$key] ?? $fallback, FILTER_VALIDATE_INT);
        if ($value === false || $value < $min || $value > $max) return error('invalid_settings', t('Перевірте числові налаштування й допустимі діапазони.'));
        $result[$key] = $value;
    }
    $price = isset($input['price']) ? money($input['price']) : (int)$result['price_per_hour'];
    if (is_wp_error($price) || $price < 1) return error('invalid_price', t('Вкажіть додатну вартість години в гривнях.'));
    $result['price_per_hour'] = $price;
    if ($result['invoice_minutes'] >= $result['hold_minutes']) return error('invalid_hold', t('Термін посилання на оплату має бути меншим за час утримання слота.'));
    if (!preg_match('/^(?:[01]\d|2[0-3]):[0-5]\d$/D', $input['digest_time'] ?? '')) return error('invalid_digest', t('Вкажіть коректний час ранкового зведення.'));
    $result['digest_time'] = $input['digest_time'];
    $result['rules'] = sanitize_textarea_field($input['rules'] ?? '');
    if (in_array($input['language'] ?? '', languages(), true)) $result['language'] = $input['language'];
    $result['weekly'] = [];
    for ($day = 1; $day <= 7; $day++) {
        $row = $input['weekly'][$day] ?? [];
        if (!empty($row['closed'])) { $result['weekly'][$day] = null; continue; }
        $open = $row['open'] ?? ''; $close = $row['close'] ?? '';
        if (!preg_match('/^(?:[01]\d|2[0-3]):[0-5]\d$/D', $open) || !preg_match('/^(?:[01]\d|2[0-3]):[0-5]\d$/D', $close) || $open >= $close) return error('invalid_hours', t('Вкажіть робочі години у форматі ГГ:ХХ. Закриття має бути пізніше за відкриття.'));
        $result['weekly'][$day] = compact('open','close');
    }
    update_option('site_booking_settings', $result, false);
    return $result;
}
