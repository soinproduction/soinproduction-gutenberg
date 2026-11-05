<?php
namespace SiteTheme\Booking;
defined('ABSPATH') || exit;
add_action('admin_menu',function(){
    $GLOBALS['site_booking_screens'][]=add_submenu_page('site-bookings',t('Сповіщення'),t('Сповіщення'),'manage_bookings','site-booking-notifications',__NAMESPACE__.'\\notifications_page');
},25);
add_action('admin_init',function(){
    if(($_SERVER['REQUEST_METHOD'] ?? '')!=='POST' || ($_GET['page'] ?? '')!=='site-booking-notifications')return;
    if(!current_user_can('manage_bookings'))wp_die(t('Доступ заборонено.'));check_admin_referer('site_booking_notifications');
    global $wpdb;$input=wp_unslash($_POST);$settings=notification_settings();$action=$input['notification_action'] ?? 'save';
    if($action==='verify'){
        $result=telegram_api('getMe',[]);
        if(is_wp_error($result)){wp_safe_redirect(admin_url('site-booking-notifications',['error'=>$result->get_error_message()]));exit;}
        $settings['username']=sanitize_text_field($result['username']);update_option('site_booking_notifications',$settings,false);
    }elseif($action==='connect'){
        $code=bin2hex(random_bytes(20));update_option('site_booking_telegram_connect',['hash'=>hash('sha256',$code),'expires'=>time()+900],false);
        $GLOBALS['site_booking_connect_code']=$code;
    }elseif($action==='disconnect'){
        $chat=$settings['admin_chat'];$settings['admin_chat']='';$settings['admin_title']='';update_option('site_booking_notifications',$settings,false);
        if($chat)$wpdb->query($wpdb->prepare('UPDATE '.table('outbox')." SET status='cancelled' WHERE channel='telegram' AND recipient=%s AND status='pending'",$chat));
    }elseif($action==='retry'){
        $wpdb->query($wpdb->prepare('UPDATE '.table('outbox')." SET status='pending',attempts=0,available_at=UTC_TIMESTAMP(),last_error='' WHERE id=%d AND status='failed'",absint($input['job_id'] ?? 0)));
    }elseif($action==='test'){
        if($settings['admin_chat'])queue_notice('telegram',$settings['admin_chat'],t('Тестове повідомлення: бот студії підключений.'),wp_generate_uuid4());
    }else{
        $settings['telegram']=!empty($input['telegram']);
        $settings['email']=!empty($input['email']) && is_email($input['from_email'] ?? '');
        $settings['from_email']=sanitize_email($input['from_email'] ?? '');$settings['from_name']=sanitize_text_field($input['from_name'] ?? '');
        update_option('site_booking_notifications',$settings,false);
    }
    if($action!=='connect'){wp_safe_redirect(admin_url('site-booking-notifications',['saved'=>1,'tab'=>sanitize_key($_GET['tab'] ?? 'telegram')]));exit;}
});
function notifications_page(){
    if(!current_user_can('manage_bookings'))return;
    global $wpdb;$settings=notification_settings();$email=($_GET['tab'] ?? '')==='email';
    echo '<div class="wrap sp-ui-page site-booking-admin">';\SpAdminUI\page_header(t('Сповіщення'),t('Підтвердження, перенесення й скасування. Помилка надсилання не скасовує створене бронювання.'),t('БРОНЮВАННЯ / СПОВІЩЕННЯ'));
    if(isset($_GET['error']))echo '<div class="notice notice-error"><p>'.esc_html(sanitize_text_field(wp_unslash($_GET['error']))).'</p></div>';
    if(isset($_GET['saved']))echo t('<div class="notice notice-success"><p>Налаштування оновлено.</p></div>');
    echo t('<nav class="site-booking-widget-tabs" aria-label="Канали сповіщень"><a class="button" href="').esc_url(admin_url('site-booking-notifications')).'" '.(!$email?'aria-current="page"':'').'>Telegram</a><a class="button" href="'.esc_url(admin_url('site-booking-notifications',['tab'=>'email'])).'" '.($email?'aria-current="page"':'').'>Email</a></nav>';
    echo '<form method="post"><section class="sp-ui-card">';wp_nonce_field('site_booking_notifications');
    if(!$email){
        echo t('<h2>Telegram-бот</h2><p><a href="https://t.me/').esc_attr($settings['username']).'" target="_blank" rel="noopener">@'.esc_html($settings['username']).t('</a></p><p>Токен: ').(telegram_token()?t('підключено в конфігурації сервера'):t('не налаштовано')).'.</p>';
        echo t('<p><button class="button" name="notification_action" value="verify">Перевірити підключення бота</button></p>');
        echo t('<label class="site-booking-active-switch site-booking-channel-switch"><span>Сповіщення Telegram</span><input type="checkbox" role="switch" name="telegram" value="1" ').checked($settings['telegram'],true,false).'><span class="site-booking-switch-track" aria-hidden="true"></span></label>';
        echo '<input type="hidden" name="email" value="'.($settings['email']?'1':'').'"><input type="hidden" name="from_email" value="'.esc_attr($settings['from_email']).'"><input type="hidden" name="from_name" value="'.esc_attr($settings['from_name']).'">';
        echo t('<h3>Група адміністраторів</h3><p>').($settings['admin_chat']?t('Підключено: ').esc_html($settings['admin_title']):t('Поки не підключено.')).t('</p><p>Додайте бота до групи студії. Права адміністратора боту не потрібні. Потім створіть код і надішліть указану команду в групі.</p>');
        echo t('<div class="site-booking-actions"><button class="button" name="notification_action" value="connect">Створити код підключення групи</button>');
        if($settings['admin_chat'])echo t('<button class="button" name="notification_action" value="test">Надіслати тест у групу</button><button class="button site-booking-danger" name="notification_action" value="disconnect">Відключити групу</button>');
        echo '</div>';
        if(!empty($GLOBALS['site_booking_connect_code']))echo t('<p>Код діє 15 хвилин. Надішліть у групі:</p><p><code>/connect@').esc_html($settings['username']).' '.esc_html($GLOBALS['site_booking_connect_code']).'</code></p>';
        $health=get_option('site_booking_telegram_health',[]);echo t('<h3>Робота бота</h3><p>').(!empty($health['time'])?t('Остання перевірка: ').esc_html(wp_date('d.m.Y H:i:s',$health['time'],zone())).'. '.esc_html($health['error'] ?: t('З’єднання працює.')):t('Першого з’єднання ще не було.')).t('</p><p>Для постійної роботи запустіть серверний воркер або системний cron: WP-Cron залежить від відвідувань сайту.</p><p>Клієнт отримує персональне посилання після бронювання. /stop вимикає його сповіщення. Бронювання не пов’язуються за номером телефону автоматично.</p>');
    }else{
        echo t('<h2>Email клієнтам</h2><p>Спочатку підключіть поштовий транспорт WordPress. Звичайний пароль акаунта тут не зберігається.</p><input type="hidden" name="telegram" value="').($settings['telegram']?'1':'').'">';
        echo t('<label class="site-booking-active-switch site-booking-channel-switch"><span>Листи клієнтам</span><input type="checkbox" role="switch" name="email" value="1" ').checked($settings['email'],true,false).'><span class="site-booking-switch-track" aria-hidden="true"></span></label><div class="site-booking-grid">';field(t('Адреса відправника'),'from_email',$settings['from_email'],'email');field(t('Ім’я відправника'),'from_name',$settings['from_name']);echo t('</div><p>Листи надсилаються через wp_mail. Статус «Передано транспорту» не гарантує доставку. Поки пошту не налаштовано, залиште канал вимкненим.</p>');
    }
    echo t('</section><div class="sp-ui-savebar"><button class="button button-primary" name="notification_action" value="save">Зберегти налаштування</button></div></form><section class="sp-ui-card"><h2>Журнал надсилань</h2><div class="site-booking-table-wrap"><table class="widefat site-booking-table"><thead><tr><th>Бронювання</th><th>Канал</th><th>Статус</th><th>Спроби</th><th>Результат</th></tr></thead><tbody>');
    $jobs=$wpdb->get_results('SELECT id,booking_id,channel,status,attempts,last_error,created_at FROM '.table('outbox').' ORDER BY id DESC LIMIT 25');
    $labels=['pending'=>t('У черзі'),'sending'=>t('Надсилається'),'sent'=>t('Надіслано'),'failed'=>t('Помилка'),'cancelled'=>t('Вимкнено')];
    foreach($jobs as $job){echo '<tr><td>'.esc_html($job->booking_id ?: t('Тест / бот')).'</td><td>'.esc_html($job->channel).'</td><td>'.esc_html($job->status==='sent' && $job->channel==='email'?t('Передано транспорту'):($labels[$job->status] ?? $job->status)).'</td><td>'.esc_html($job->attempts).'</td><td>'.esc_html($job->last_error);if($job->status==='failed'){echo '<form method="post">';wp_nonce_field('site_booking_notifications');echo '<input type="hidden" name="job_id" value="'.esc_attr($job->id).t('"><button class="button" name="notification_action" value="retry">Повторити</button></form>');}echo '</td></tr>';}
    if(!$jobs)echo t('<tr><td colspan="5">Надсилань поки немає.</td></tr>');echo '</tbody></table></div></section></div>';
}
