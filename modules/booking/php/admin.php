<?php
namespace SiteTheme\Booking;
defined('ABSPATH') || exit;

add_action('admin_menu', function() {
    $screens = [];
    $screens[] = add_menu_page(t('Бронювання'), t('Бронювання'), 'manage_bookings', 'site-bookings', __NAMESPACE__.'\\admin_page', 'dashicons-calendar-alt', 26);
    $screens[] = add_submenu_page('site-bookings', t('Календар'), t('Календар'), 'manage_bookings', 'site-bookings', __NAMESPACE__.'\\admin_page');
    $screens[] = add_submenu_page('site-bookings', t('Список бронювань'), t('Список бронювань'), 'manage_bookings', 'site-booking-list', __NAMESPACE__.'\\admin_page');
    $screens[] = add_submenu_page('site-bookings', t('Нове бронювання'), t('Нове бронювання / блокування'), 'manage_bookings', 'site-booking-new', __NAMESPACE__.'\\admin_page');
    $screens[] = add_submenu_page('site-bookings', t('Налаштування бронювання'), t('Налаштування'), 'manage_bookings', 'site-booking-settings', __NAMESPACE__.'\\admin_page');
    $GLOBALS['site_booking_screens'] = $screens;
});
add_filter('sp_admin_ui_screen', function($enabled, $screen) {
    return $enabled || in_array($screen->id, $GLOBALS['site_booking_screens'] ?? [], true);
}, 10, 2);
add_action('admin_enqueue_scripts', function() {
    $screen = get_current_screen();
    if (!$screen || !in_array($screen->id, $GLOBALS['site_booking_screens'] ?? [], true)) return;
    wp_enqueue_style('site-booking-admin', config('assets_url').'/admin.css', ['sp-admin-ui'], filemtime(config('assets_path').'/admin.css'));
    wp_enqueue_script('site-booking-admin', config('assets_url').'/admin.js', [], filemtime(config('assets_path').'/admin.js'), true);
    wp_add_inline_script('site-booking-admin','window.SITE_BOOKING_ADMIN='.wp_json_encode(['api'=>rest_url('site/v1/admin/bookings'),'nonce'=>wp_create_nonce('wp_rest'),'weekly'=>settings()['weekly'],'timezone'=>zone()->getName(),'messages'=>dictionary()['messages'] ?? new \stdClass()]).';','before');
});

function admin_url($page = 'site-bookings', $args = []) {
    return add_query_arg(array_merge(['page'=>$page], $args), \admin_url('admin.php'));
}


// Handle mutations before WordPress emits the admin header (safe POST/redirect/GET).
add_action('admin_init', function() {
    if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') return;
    $page = sanitize_key($_GET['page'] ?? '');
    if (!in_array($page, ['site-booking-new','site-booking-settings'], true)) return;
    if (!current_user_can('manage_bookings')) wp_die(t('Доступ заборонено.'), '', ['response'=>403]);
    check_admin_referer('site_booking_admin');
    $input = wp_unslash($_POST);
    $result = $page === 'site-booking-new' ? create_manual($input) : save_settings($input);
    if (!is_wp_error($result)) {
        wp_safe_redirect(admin_url($page === 'site-booking-new' ? 'site-bookings' : 'site-booking-settings', $page === 'site-booking-new' ? ['id'=>$result,'created'=>1] : ['saved'=>1]));
        exit;
    }
    $GLOBALS['site_booking_admin_result'] = ['input'=>$input,'failure'=>$result];
}, 20);

function statuses() {
    return ['confirmed'=>t('Підтверджено'),'awaiting_payment'=>t('Очікує оплати'),'expired'=>t('Минуло'),'cancelled'=>t('Скасовано / з поверненням'),'cancelled_late'=>t('Скасовано / без повернення'),'completed'=>t('Завершено'),'no_show'=>t('Неявка'),'block'=>t('Блокування часу'),'block_removed'=>t('Блокування знято')];
}

function field($label, $name, $value = '', $type = 'text', $extra = '') {
    $id = 'site-booking-'.preg_replace('/[^a-z0-9_-]/i', '-', $name);
    echo '<label class="site-booking-field" for="'.esc_attr($id).'"><span>'.esc_html($label).'</span><input id="'.esc_attr($id).'" name="'.esc_attr($name).'" type="'.esc_attr($type).'" value="'.esc_attr($value).'" '.$extra.'></label>';
}

function admin_page() {
    if (!current_user_can('manage_bookings')) wp_die(t('Доступ заборонено.'));
    $page = sanitize_key($_GET['page'] ?? 'site-bookings');
    $state = $GLOBALS['site_booking_admin_result'] ?? [];
    $input = $state['input'] ?? []; $message = $state['message'] ?? ''; $failure = $state['failure'] ?? null;
    echo '<div class="wrap sp-ui-page site-booking-admin">';
    \SpAdminUI\page_header($page === 'site-booking-new' ? t('Нове бронювання / блокування часу') : ($page === 'site-booking-settings' ? t('Налаштування бронювання') : t('Бронювання')), t('Розклад студії · час за місцевим часовим поясом · суми в гривнях'), t('СТУДІЯ / БРОНЮВАННЯ'));
    if (get_option('site_booking_schema') !== '2') { echo t('<div class="notice notice-error"><p>Сховище бронювань не готове. Відкрийте розділ під обліковим записом адміністратора для ініціалізації.</p></div></div>'); return; }
    if ($failure) echo '<div class="notice notice-error" role="alert"><p>'.esc_html($failure->get_error_message()).'</p></div>';
    if (isset($_GET['saved'])) $message = t('Налаштування збережено. Наявні бронювання та їхню вартість не змінено.');
    if ($message || isset($_GET['created'])) echo '<div class="notice notice-success" role="status"><p>'.esc_html($message ?: t('Запис створено. Час заброньовано.')).'</p></div>';
    if ($page === 'site-booking-new') new_form($input);
    elseif ($page === 'site-booking-settings') settings_form($failure ? $input : []);
    elseif ($page === 'site-booking-list') list_page();
    else calendar_page();
    echo '</div>';
}

function new_form($input) {
    $config = settings();
    $input = array_merge(['type'=>'booking','date'=>wp_date('Y-m-d',null,zone()),'time'=>'10:00','hours'=>1,'amount'=>number_format($config['price_per_hour']/100,2,'.','')], $input);
    echo '<form method="post" class="site-booking-create" data-price="'.esc_attr($config['price_per_hour']).'">'; wp_nonce_field('site_booking_admin');
    echo t('<section class="sp-ui-card"><h2>Час і тип запису</h2><div class="site-booking-grid">');
    echo t('<label class="site-booking-field"><span>Тип запису</span><select name="type"><option value="booking" ').selected($input['type'],'booking',false).t('>Ручне бронювання · оплата поза сайтом</option><option value="block" ').selected($input['type'],'block',false).t('>Блокування часу</option></select></label>');
    field(t('Дата'),'date',$input['date'],'date','required');
    field(t('Час початку'),'time',$input['time'],'time','step="3600" required');
    field(t('Тривалість (години)'),'hours',$input['hours'],'number','min="1" max="24" step="1" required');
    echo t('</div><p>Початок і тривалість — цілими годинами. Бронювання має вкладатися в робочі години. Блокувати можна й неробочий час.</p></section>');
    echo t('<section class="sp-ui-card" data-booking-client><h2>Клієнт і оплата</h2><div class="site-booking-grid">');
    field(t('Ім’я'),'name',$input['name'] ?? '','text','maxlength="100" required');
    field(t('Телефон'),'phone',$input['phone'] ?? '','tel','maxlength="30" required');
    field('Telegram / Instagram','handle',$input['handle'] ?? '','text','maxlength="100"');
    field(t('Тип зйомки'),'shoot_type',$input['shoot_type'] ?? '','text','maxlength="100"');
    field(t('Кількість людей'),'people_count',$input['people_count'] ?? '','number','min="1" max="255"');
    field(t('Оплачено поза сайтом (грн)'),'amount',$input['amount'],'number','min="0" max="9999999.99" step="0.01" required');
    echo t('</div><p>Ручне бронювання підтверджується одразу. Тут фіксується оплата поза сайтом — кошти з клієнта не списуються.</p></section>');
    echo t('<section class="sp-ui-card"><h2>Нотатки</h2><label class="site-booking-field"><span>Нотатка адміністратора / причина блокування</span><textarea name="note" rows="3" maxlength="500">').esc_textarea($input['note'] ?? '').'</textarea></label></section>';
    echo '<div class="sp-ui-savebar site-booking-actions"><a class="button" href="'.esc_url(admin_url()).t('">Назад до списку</a><button class="button button-primary" type="submit">Забронювати час</button></div></form>');
}

function list_page() {
    $filters = [];
    foreach (['from','to','status','q'] as $key) $filters[$key] = sanitize_text_field(wp_unslash($_GET[$key] ?? ''));
    echo '<div class="site-booking-actions"><a class="button button-primary" href="'.esc_url(admin_url('site-booking-new')).t('">Нове бронювання / блокування</a><a class="button" href="').esc_url(admin_url('site-booking-settings')).t('">Налаштування бронювання</a></div>');
    echo '<section class="sp-ui-card"><form method="get" class="site-booking-filters"><input type="hidden" name="page" value="site-booking-list">';
    field(t('Пошук за ім’ям або телефоном'),'q',$filters['q'],'search'); field(t('З дати'),'from',$filters['from'],'date'); field(t('До дати'),'to',$filters['to'],'date');
    echo t('<label class="site-booking-field"><span>Статус</span><select name="status"><option value="">Усі записи</option>');
    foreach (statuses() as $value=>$label) echo '<option value="'.esc_attr($value).'" '.selected($filters['status'],$value,false).'>'.esc_html($label).'</option>';
    echo t('</select></label><div class="site-booking-filter-actions"><button class="button" type="submit">Застосувати</button><a class="button" href="').esc_url(admin_url('site-booking-list')).t('">Скинути</a></div></form>');
    $number = max(1,absint($_GET['paged'] ?? 1)); $rows = records($filters,51,($number-1)*50); $more = count($rows)>50; $rows = array_slice($rows,0,50);
    if (!$rows) echo t('<div class="site-booking-empty"><h2>Бронювань не знайдено</h2><p>Створіть бронювання чи блокування часу або змініть фільтри.</p></div>');
    else {
        echo t('<div class="site-booking-table-wrap"><table class="widefat site-booking-table"><thead><tr><th scope="col">Дата й час</th><th scope="col">Клієнт</th><th scope="col">Статус</th><th scope="col">Оплата</th><th scope="col">Деталі</th></tr></thead><tbody>');
        foreach ($rows as $row) {
            $status = $row->type === 'block' ? ($row->cancelled_at ? 'block_removed' : 'block') : $row->status;
            echo '<tr data-booking-row="'.esc_attr($row->id).'"><td><a data-booking-open="'.esc_attr($row->id).'" href="'.esc_url(admin_url('site-booking-list',['id'=>$row->id])).'"><strong>'.esc_html(display_time($row->starts_at)).'</strong></a><br><span class="description">'.esc_html($row->hours.t(' год · до ').display_time($row->ends_at,'H:i')).'</span></td><td>'.esc_html($row->name ?: '—').'<br>'.esc_html($row->phone ?: '').'</td><td><span class="site-booking-status site-booking-status--'.esc_attr($status).'">'.esc_html(statuses()[$status] ?? $status).'</span></td><td>'.($row->type === 'block' ? '—' : esc_html(number_format($row->amount/100,2,'.',' ').t(' грн'))).'<br><span class="description">'.esc_html($row->payment_mode === 'unpaid' ? t('Без оплати') : ($row->payment_mode === 'offline' ? t('Поза сайтом') : '')).'</span></td><td>'.esc_html($row->note ?: $row->shoot_type).'</td></tr>';
        }
        echo '</tbody></table></div>';
    }
    echo t('<nav class="site-booking-actions" aria-label="Сторінки списку бронювань">');
    if ($number>1) echo '<a class="button" href="'.esc_url(admin_url('site-booking-list',array_merge($filters,['paged'=>$number-1]))).t('">Назад</a>');
    if ($more) echo '<a class="button" href="'.esc_url(admin_url('site-booking-list',array_merge($filters,['paged'=>$number+1]))).t('">Далі</a>');
    echo '</nav></section>';
    booking_dialogs();
    if(current_user_can('manage_options')){
    echo t('<section class="sp-ui-card site-booking-history-cleanup"><div><h2>Очищення історії</h2><p>Видалення скасованих і завершених записів, їхнього листування, файлів та історії змін на сайті. Чинні бронювання зберігаються. Повідомлення в Telegram залишаться.</p></div><button type="button" class="button site-booking-danger" data-booking-history-cleanup>Очистити історію</button></section>');
    echo t('<dialog id="site-booking-cleanup-dialog" aria-labelledby="site-booking-cleanup-title"><header class="site-booking-dialog-header"><h2 id="site-booking-cleanup-title">Очистити історію</h2><button type="button" class="button" data-booking-close>Закрити</button></header><div data-cleanup-body></div></dialog>');
    }
}

function detail($id) {
    global $wpdb;
    $row = $wpdb->get_row($wpdb->prepare('SELECT b.*,c.name,c.phone,c.handle,c.tg_chat_id,c.no_show_count FROM '.table('bookings').' b LEFT JOIN '.table('clients').' c ON c.id=b.client_id WHERE b.id=%d', $id));
    if (!$row) { echo t('<div class="notice notice-warning"><p>Запис не знайдено.</p></div>'); return; }
    $row=booking_identities([$row])[0];
    echo t('<section class="sp-ui-card" id="site-booking-detail"><h2>Запис №').esc_html($id).'</h2><dl class="site-booking-details">';
    $fields = ['Час'=>display_time($row->starts_at).' — '.display_time($row->ends_at), 'Клієнт'=>$row->name ?: '—','Телефон'=>$row->phone ?: '—','Контакт у соцмережах'=>$row->handle ?: '—', 'Telegram'=>$wpdb->get_var($wpdb->prepare('SELECT chat_id FROM '.table('telegram_links').' WHERE booking_id=%d',$id)) ? t('Підключено до цього бронювання') : t('Не підключено'), 'Попередні неявки'=>$row->no_show_count ?? 0,'Тип зйомки'=>$row->shoot_type ?: '—','Кількість людей'=>$row->people_count ?: '—','Нотатка'=>$row->note ?: '—'];
    foreach ($fields as $label=>$value) echo '<div><dt>'.esc_html($label).'</dt><dd>'.esc_html($value).'</dd></div>';
    echo t('</dl><h3>Історія змін</h3><ul>');
    $events = $wpdb->get_results($wpdb->prepare('SELECT * FROM '.table('events').' WHERE booking_id=%d ORDER BY id DESC', $id));
    foreach ($events as $event) echo '<li>'.esc_html(display_time($event->created_at).' · '.action_label($event->action).' · '.actor_label($event->actor)).'</li>';
    echo '</ul></section>';
}

function settings_form($input = []) {
    global $wpdb;
    $config = settings();
    $outside = [];
    $future = $wpdb->get_results($wpdb->prepare('SELECT id,starts_at,ends_at FROM '.table('bookings').' WHERE type=%s AND status IN (%s,%s) AND ends_at>%s ORDER BY starts_at', 'booking','confirmed','awaiting_payment',gmdate('Y-m-d H:i:s')));
    foreach ($future as $entry) {
        $local = new \DateTimeImmutable(display_time($entry->starts_at, 'Y-m-d H:i'), zone());
        $working = $config['weekly'][(int)$local->format('N')] ?? null;
        if (!$working || $local->format('H:i') < $working['open'] || display_time($entry->ends_at,'Y-m-d') !== $local->format('Y-m-d') || display_time($entry->ends_at,'H:i') > $working['close']) $outside[] = $entry;
    }
    if ($outside) {
        echo t('<div class="notice notice-warning"><p>Бронювання поза поточними робочими годинами (збережено):</p><ul>');
        foreach (array_slice($outside,0,100) as $entry) echo '<li><a href="'.esc_url(admin_url('site-booking-list',['id'=>$entry->id])).'">#'.esc_html($entry->id).' · '.esc_html(display_time($entry->starts_at)).'</a></li>';
        if (count($outside)>100) echo t('<li>Показано перші 100 бронювань.</li>');
        echo '</ul></div>';
    }
    if ($input) $config = array_replace($config,$input);
    echo '<form method="post">'; wp_nonce_field('site_booking_admin');
    echo t('<section class="sp-ui-card"><h2>Вартість і правила бронювання</h2><div class="site-booking-grid">');
    echo t('<div class="site-booking-field"><span>Вартість оренди</span><p>Ціну задано в <a href="').esc_url(admin_url('site-booking-tariffs')).t('">тарифах бронювання</a>. Базова вартість години: ').esc_html(number_format($config['price_per_hour']/100,2,',',' ')).t(' грн.</p></div>');
    $fields = ['minimum_notice_hours'=>[t('Мінімум до початку (години)'),0,168], 'horizon_days'=>[t('Горизонт бронювання (дні)'),1,365], 'cancellation_hours'=>[t('Мінімум до початку для перенесення / повернення (години)'),0,720], 'reschedule_limit'=>[t('Ліміт перенесень клієнтом'),0,20], 'unpaid_limit'=>[t('Неоплачених бронювань на телефон'),1,20], 'reminder_hours'=>[t('Нагадування до початку (години)'),1,168]];
    // The choice appears once a second language file exists.
    if (count(languages()) > 1) { echo '<label class="site-booking-field"><span>'.esc_html(t('Мова форми й сповіщень')).'</span><select name="language">'; foreach (languages() as $code) echo '<option value="'.esc_attr($code).'" '.selected(language(),$code,false).'>'.esc_html($code).'</option>'; echo '</select></label>'; }
    foreach ($fields as $key=>[$label,$min,$max]) field($label,$key,$config[$key],'number','min="'.$min.'" max="'.$max.'" step="1" required');
    field(t('Ранкове зведення'),'digest_time',$config['digest_time'],'time','required');
    echo '</div></section>';
    echo t('<section class="sp-ui-card"><h2>Робочі години</h2>');
    foreach ([1=>t('Понеділок'),2=>t('Вівторок'),3=>t('Середа'),4=>t('Четвер'),5=>t('П’ятниця'),6=>t('Субота'),7=>t('Неділя')] as $day=>$label) {
        $row = $config['weekly'][$day] ?? null;
        $closed = $row === null || !empty($row['closed']);
        echo '<div class="site-booking-hours"><strong>'.esc_html($label).'</strong>';
        field(t('Відкриття'),"weekly[$day][open]",$row['open'] ?? '10:00','time','step="60" required');
        field(t('Закриття'),"weekly[$day][close]",$row['close'] ?? '21:00','time','step="60" required');
        echo '<label><input type="checkbox" name="weekly['.$day.'][closed]" value="1" '.checked($closed,true,false).t('> Вихідний</label></div>');
    }
    echo t('<p>Під час зміни робочих годин наявні бронювання зберігаються.</p></section><section class="sp-ui-card"><h2>Правила бронювання</h2><label class="site-booking-field"><span>Правила для клієнта</span><textarea name="rules" rows="7">').esc_textarea($config['rules']).t('</textarea></label></section><div class="sp-ui-savebar"><button class="button button-primary" type="submit">Зберегти налаштування</button></div></form>');
}


function calendar_page() {
    echo t('<div class="site-booking-calendar-actions"><div class="site-booking-legend"><span class="site-booking-legend-confirmed">Підтверджено</span><span class="site-booking-legend-awaiting">Очікує оплати</span><span class="site-booking-legend-block">Заблоковано</span><label><input type="checkbox" id="site-booking-show-cancelled"> Показувати скасовані та прострочені</label></div><div class="site-booking-actions"><button type="button" class="button button-primary" id="site-booking-add">Нове бронювання / блокування</button><a class="button" href="').esc_url(admin_url('site-booking-list')).t('">Список бронювань</a></div></div>');
    echo '<p id="site-booking-calendar-message" role="status" aria-live="polite"></p><section class="sp-ui-card site-booking-calendar-card"><div id="site-booking-calendar"></div></section>';
    booking_dialogs();
}

function booking_dialogs() {
    echo t('<dialog id="site-booking-dialog" aria-labelledby="site-booking-dialog-title"><header class="site-booking-dialog-header"><div><span class="sp-ui-eyebrow">СТУДІЯ / БРОНЮВАННЯ</span><h2 id="site-booking-dialog-title">Деталі бронювання</h2></div><button class="button" type="button" data-booking-close aria-label="Закрити вікно">Закрити</button></header><div id="site-booking-dialog-content"></div></dialog>');
    echo t('<dialog id="site-booking-create-dialog" aria-labelledby="site-booking-create-title"><header class="site-booking-dialog-header"><h2 id="site-booking-create-title">Нове бронювання / блокування часу</h2><button class="button" type="button" data-booking-close aria-label="Закрити вікно">Закрити</button></header><p id="site-booking-create-error" role="alert"></p>');
    new_form([]);
    echo '</dialog>';
}


function action_label($action) {
    return ['created'=>t('Запис створено'),'completed'=>t('Оренду завершено'),'paid'=>t('Оплату отримано'),'expired'=>t('Час оплати сплив'),'rescheduled'=>t('Бронювання перенесено'),'cancelled'=>t('Бронювання скасовано'),'no_show'=>t('Позначено неявку'),'refund_pending'=>t('Повернення запитано'),'refund_succeeded'=>t('Кошти повернено'),'refund_failed'=>t('Помилка повернення'),'refund_manual_done'=>t('Ручне повернення підтверджено'),'block_removed'=>t('Блокування знято')][$action] ?? $action;
}

function actor_label($actor) {
    if (str_starts_with($actor,'admin:')) {
        $user = get_userdata((int)substr($actor,6));
        return t('Адміністратор: ').($user ? $user->display_name : substr($actor,6));
    }
    if(str_starts_with($actor,'client-telegram:'))return t('Клієнт Telegram: ').substr($actor,16);
    if(str_starts_with($actor,'telegram:'))return t('Адміністратор Telegram: ').substr($actor,9);
    return ['system'=>t('Система'),'client'=>t('Клієнт')][$actor] ?? $actor;
}
