<?php
namespace SiteTheme\Booking;
defined('ABSPATH') || exit;

function widget_settings() {
    $copy=form_text();$saved=(array)get_option('site_booking_widget',[]);
    foreach((array)($saved['formCopy'] ?? []) as $key=>$value)if(is_string($copy[$key] ?? null) && is_string($value) && $value!=='')$copy[$key]=$value;
    $copy['steps']=[$copy['stepOne'],$copy['stepTwo']];
    return ['formCopy'=>$copy,'image_id'=>absint($saved['image_id'] ?? 0),'formImage'=>wp_get_attachment_image_url(absint($saved['image_id'] ?? 0),'large') ?: '','name'=>$saved['name'] ?? t('Оренда студії'),'description'=>$saved['description'] ?? t('Простір для вашої зйомки')];
}
/** Only overrides are stored, so untouched texts follow the language files. */
function widget_text_fields(){
    return ['stepOne'=>t('Назва першого кроку'),'stepTwo'=>t('Назва другого кроку'),'dateTitle'=>t('Заголовок календаря'),'timeTitle'=>t('Заголовок вибору часу'),'contactsTitle'=>t('Заголовок контактів'),'submit'=>t('Кнопка бронювання'),'summaryNote'=>t('Примітка під підсумком'),'error_required'=>t('Порожнє поле'),'error_phone'=>t('Неправильний телефон'),'error_email'=>t('Неправильна пошта'),'error_slot_taken'=>t('Час уже зайнятий'),'error_rate_limit'=>t('Забагато спроб'),'error_unpaid_limit'=>t('Ліміт неоплачених бронювань'),'error_challenge_failed'=>t('Перевірка на бота')];
}

function public_config() {
    $config=settings();
    return ['timezone'=>zone()->getName(),'today'=>(new \DateTimeImmutable('now',zone()))->format('Y-m-d'),
        'price_per_hour'=>$config['price_per_hour'],'minimum_notice_hours'=>$config['minimum_notice_hours'],'horizon_days'=>$config['horizon_days'],'weekly'=>$config['weekly'],'rules'=>$config['rules'],'tariffs'=>booking_tariffs(),'widget'=>widget_settings(),'phone'=>['code'=>phone_format()[0],'digits'=>phone_format()[1]],'turnstile_site_key'=>turnstile_site_key()];
}

function public_availability($from,$to) {
    global $wpdb;
    $start=local_time($from.' 00:00');$end=local_time($to.' 00:00');
    if(!$start || !$end || $end<$start || $start->diff($end)->days>61)return error('invalid_range',t('Оберіть період не більше 62 днів.'));
    $config=settings();$zone=zone();$utc=new \DateTimeZone('UTC');
    $now=new \DateTimeImmutable('now',$zone);$earliest=$now->modify('+'.$config['minimum_notice_hours'].' hours');$horizon=$now->modify('+'.$config['horizon_days'].' days')->format('Y-m-d');
    $slots=$wpdb->get_col($wpdb->prepare('SELECT starts_at FROM '.table('slots').' WHERE hall_id=1 AND starts_at >= %s AND starts_at < %s',$start->setTimezone($utc)->format('Y-m-d H:i:s'),$end->modify('+1 day')->setTimezone($utc)->format('Y-m-d H:i:s')));
    if($wpdb->last_error)return error('storage_unavailable',t('Розклад тимчасово недоступний.'),503);
    $busy=array_fill_keys($slots,true);$days=[];
    for($day=$start;$day<=$end;$day=$day->modify('+1 day')) {
        $working=$config['weekly'][(int)$day->format('N')] ?? null;$date=$day->format('Y-m-d');$starts=[];
        if($working && $date>=$now->format('Y-m-d') && $date<=$horizon) {
            for($hour=0;$hour<24;$hour++) {
                $local=$day->setTime($hour,0);$time=$local->format('H:i');
                if($time<$working['open'] || $time>=$working['close'] || $local<$earliest)continue;
                $slot=$local->setTimezone($utc);$max=0;
                for($length=1;$length<=24;$length++) {
                    $next=$slot->modify('+'.($length-1).' hours');$finish=$slot->modify('+'.$length.' hours')->setTimezone($zone);
                    if($finish->format('Y-m-d')!==$date || $finish->format('H:i')>$working['close'] || isset($busy[$next->format('Y-m-d H:i:s')]))break;
                    $max=$length;
                }
                if($max)$starts[]=['time'=>$time,'max_hours'=>$max];
            }
        }
        $days[]=['date'=>$date,'open'=>$working['open'] ?? null,'close'=>$working['close'] ?? null,'starts'=>$starts];
    }
    return ['timezone'=>zone()->getName(),'price_per_hour'=>$config['price_per_hour'],'days'=>$days];
}

add_action('rest_api_init',function(){
    foreach(['config','availability'] as $resource)register_rest_route('site/v1','/booking/'.$resource,['methods'=>'GET','permission_callback'=>'__return_true','callback'=>function($request) use($resource){
        $data=$resource==='config'?public_config():public_availability((string)$request['from'],(string)$request['to']);
        if(is_wp_error($data))return $data;
        $response=new \WP_REST_Response($data);$response->header('Cache-Control','no-store');return $response;
    }]);
});

add_action('admin_menu',function(){
    $GLOBALS['site_booking_screens'][]=add_submenu_page('site-bookings',t('Форма на сайті'),t('Форма на сайті'),'manage_bookings','site-booking-widget',__NAMESPACE__.'\\widget_page');
},20);
add_action('admin_init',function(){
    if(($_SERVER['REQUEST_METHOD'] ?? '')!=='POST' || ($_GET['page'] ?? '')!=='site-booking-widget')return;
    if(!current_user_can('manage_bookings'))wp_die(t('Доступ заборонено.'));
    check_admin_referer('site_booking_widget');$input=wp_unslash($_POST);
    $image_id=absint($input['image_id'] ?? 0);
    if($image_id && !wp_attachment_is_image($image_id))wp_die(t('Оберіть зображення з медіатеки.'));
    $base=form_text();$copy=[];
    foreach(widget_text_fields() as $key=>$label){$value=sanitize_textarea_field($input['copy'][$key] ?? '');if($value!=='' && $value!==$base[$key])$copy[$key]=$value;}
    update_option('site_booking_widget',['name'=>sanitize_text_field($input['name'] ?? ''),'description'=>sanitize_text_field($input['description'] ?? ''),'image_id'=>$image_id,'formCopy'=>$copy],false);
    wp_safe_redirect(admin_url('admin.php?page=site-booking-widget&saved=1'));exit;
},20);
add_action('admin_enqueue_scripts',function(){
    if(($_GET['page'] ?? '')==='site-booking-widget' && current_user_can('manage_bookings'))wp_enqueue_media();
});
function widget_page(){
    if(!current_user_can('manage_bookings'))return;$data=widget_settings();$base=form_text();
    echo '<div class="wrap sp-ui-page site-booking-admin">';
    \SpAdminUI\page_header(t('Форма бронювання на сайті'),t('Розклад і вартість беруться із загальних налаштувань бронювання.'),t('БРОНЮВАННЯ / ФОРМА'));
    if(isset($_GET['saved']))echo '<div class="notice notice-success"><p>'.esc_html(t('Налаштування форми збережено.')).'</p></div>';
    echo '<form method="post" class="site-booking-widget-settings">';wp_nonce_field('site_booking_widget');
    echo '<section class="sp-ui-card"><div class="site-booking-grid">';
    field(t('Назва студії в підсумку'),'name',$data['name']);field(t('Опис студії'),'description',$data['description']);
    echo '<div class="site-booking-widget-wide site-booking-widget-image"><input type="hidden" name="image_id" value="'.esc_attr($data['image_id']).'"><div class="site-booking-widget-image-preview">';
    echo '<img data-widget-image-preview src="'.esc_url($data['formImage']).'" alt="'.esc_attr(t('Вибране зображення форми')).'"'.($data['formImage']?'':' hidden').'><p data-widget-image-empty'.($data['formImage']?' hidden':'').'>'.esc_html(t('Зображення не вибрано')).'</p></div><div class="site-booking-actions"><button type="button" class="button" data-widget-image-select>'.esc_html(t('Вибрати з медіатеки')).'</button><button type="button" class="button site-booking-danger" data-widget-image-clear>'.esc_html(t('Прибрати зображення')).'</button></div></div>';
    echo '</div></section><details class="sp-ui-card"><summary>'.esc_html(t('Тексти й повідомлення')).'</summary><p>'.esc_html(t('Порожнє поле бере текст із файлу мови.')).'</p><div class="site-booking-grid">';
    foreach(widget_text_fields() as $key=>$label){$value=$data['formCopy'][$key];field($label,'copy['.$key.']',$value===$base[$key]?'':$value,'text','placeholder="'.esc_attr($base[$key]).'"');}
    echo '</div></details><div class="sp-ui-savebar"><button class="button button-primary">'.esc_html(t('Зберегти форму')).'</button></div></form></div>';
}

function booking_tariffs(){
    $result=[];$seen=[];
    foreach(tariff_records() as $record){
        $data=$record['data'];$id=sanitize_key($data['id'] ?? '');$mode=$data['billingMode'] ?? 'fixed';
        $price=money(number_format((float)($data['price'] ?? 0),2,'.',''));$hours=(int)($data['durationHours'] ?? 0);
        if(!$id || isset($seen[$id]) || is_wp_error($price) || $price<1 || !in_array($mode,['hourly','fixed'],true) || ($mode==='fixed' && ($hours<1 || $hours>24)))continue;
        $seen[$id]=true;
        $result[]=['id'=>$id,'name'=>wp_strip_all_tags($data['name'] ?? ''),'note'=>wp_strip_all_tags($data['note'] ?? ''),'price'=>$price,'billing_mode'=>$mode,'duration_hours'=>$mode==='fixed'?$hours:1,'minimum_hours'=>max(1,min(24,(int)($data['minimumHours'] ?? 1))),'unit'=>wp_strip_all_tags($data['unit'] ?? '')];
    }
    return apply_filters('site_booking_tariffs',$result);
}


/** Public bookings are confirmed immediately while payment is temporarily skipped. */
function create_public_booking($input,$ip='') {
    global $wpdb;
    foreach(['request_id','email','tariff','date','time','name','phone','hours','website'] as $field)if(isset($input[$field]) && !is_scalar($input[$field]))return error('invalid_request',t('Оновіть форму та спробуйте ще раз.'));
    $key=(string)($input['request_id'] ?? '');
    if(!preg_match('/^[a-f0-9-]{36}$/Di',$key))return error('invalid_request',t('Оновіть форму та спробуйте ще раз.'));
    $token=substr(hash_hmac('sha256',$key,wp_salt('nonce')),0,48);
    $existing=fn()=>(int)$wpdb->get_var($wpdb->prepare('SELECT id FROM '.table('bookings').' WHERE token=%s',$token));
    if($id=$existing())return ['id'=>$id,'status'=>'confirmed','telegram_url'=>booking_telegram_link($id)];
    if(!empty($input['website']))return error('invalid_request',t('Оновіть форму та спробуйте ще раз.'));
    $email=sanitize_email($input['email'] ?? '');
    if(!$email || !is_email($email) || strlen($email)>254)return error('invalid_email',t('Вкажіть коректну електронну пошту.'));
    $tariffs=array_values(array_filter(booking_tariffs(),fn($tariff)=>$tariff['id']===($input['tariff'] ?? '')));
    if(!$tariffs)return error('invalid_tariff',t('Тариф більше недоступний. Оновіть форму.'));
    $tariff=$tariffs[0];$hours=filter_var($input['hours'] ?? null,FILTER_VALIDATE_INT);
    if(!$hours || $hours<1 || $hours>24 || ($tariff['billing_mode']==='fixed' && $hours!==$tariff['duration_hours']) || ($tariff['billing_mode']==='hourly' && $hours<$tariff['minimum_hours']))return error('invalid_duration',t('Перевірте тривалість бронювання.'));
    $start=local_time(($input['date'] ?? '').' '.($input['time'] ?? ''));
    $now=new \DateTimeImmutable('now',zone());
    if(!$start || $start<$now->modify('+'.settings()['minimum_notice_hours'].' hours'))return error('minimum_notice',t('До початку замало часу. Оберіть інший час.'));
    $phone=normalize_phone($input['phone'] ?? '');
    if(valid_phone($phone) && unpaid_bookings($phone)>=(int)settings()['unpaid_limit'])return error('unpaid_limit',t('Для цього номера вже є максимальна кількість неоплачених бронювань. Зверніться до студії.'),429);
    // Budgets count created bookings: a taken slot or a typo must not cost the visitor one.
    if(slots_taken($start,$hours))return error('slot_taken',t('Цей час уже зайнятий. Оберіть інший.'),409);
    if($ip && !turnstile_passed($input['turnstile'] ?? '',$ip))return error('challenge_failed',t('Підтвердіть, що ви не бот, і спробуйте ще раз.'),403);
    $counted=public_ip($ip);
    if($counted && !rate_limit('booking-created:'.$ip,CLIENT_DAILY_BOOKINGS,DAY_IN_SECONDS))return error('rate_limit',t('Забагато бронювань. Спробуйте завтра або зверніться до студії.'),429);
    if($ip && !public_booking_breaker()){if($counted)rate_release('booking-created:'.$ip,DAY_IN_SECONDS);return error('rate_limit',t('Онлайн-бронювання тимчасово недоступне. Зателефонуйте до студії.'),429);}
    $amount=$tariff['price']*($tariff['billing_mode']==='hourly'?$hours:1);
    $result=create_manual(['type'=>'booking','date'=>$input['date'] ?? '', 'time'=>$input['time'] ?? '', 'hours'=>$hours,'name'=>$input['name'] ?? '', 'phone'=>$input['phone'] ?? '', 'shoot_type'=>$tariff['name'],'amount'=>number_format($amount/100,2,'.',''),'note'=>t('Бронювання із сайту · без оплати. Email: ').$email],['token'=>$token,'source'=>'website','actor'=>'client','payment_mode'=>'unpaid','price_per_hour'=>$tariff['billing_mode']==='hourly'?$tariff['price']:0,'email'=>$email,'tariff'=>$tariff]);
    if(is_wp_error($result)){
        if($counted)rate_release('booking-created:'.$ip,DAY_IN_SECONDS);
        if($ip)rate_release('booking-created:all',HOUR_IN_SECONDS);
        if($id=$existing())return ['id'=>$id,'status'=>'confirmed','telegram_url'=>booking_telegram_link($id)];
        if($result->get_error_code()==='slot_taken')return error('slot_taken',t('Цей час уже зайнятий. Оберіть інший.'),409);
        $messages=['invalid_client'=>t('Вкажіть ім’я та український номер телефону.'),'invalid_time'=>t('Оберіть дату та час заново.'),'invalid_date'=>t('Оберіть час у межах доступного періоду.'),'outside_hours'=>t('Бронювання має вкладатися в робочі години.'),'invalid_details'=>t('Перевірте введені дані.'),'invalid_amount'=>t('Не вдалося розрахувати вартість.'),'storage_error'=>t('Не вдалося зберегти бронювання. Спробуйте ще раз.'),'storage_unavailable'=>t('Бронювання тимчасово недоступне.')];
        return error($result->get_error_code(),$messages[$result->get_error_code()] ?? t('Не вдалося створити бронювання.'),$result->get_error_data()['status'] ?? 422);
    }
    return ['id'=>$result,'status'=>'confirmed','telegram_url'=>booking_telegram_link($result)];
}
add_action('rest_api_init',function(){
    register_rest_route('site/v1','/booking/reservations',['methods'=>'POST','permission_callback'=>'__return_true','callback'=>function($request){
        $ip=client_ip($request);
        if(!rate_limit('booking:'.$ip,20,MINUTE_IN_SECONDS))return error('rate_limit',t('Забагато спроб. Зачекайте хвилину.'),429);
        $input=$request->get_json_params();
        $result=create_public_booking(is_array($input)?$input:[],$ip);
        if(is_wp_error($result))return $result;
        $response=new \WP_REST_Response($result,201);$response->header('Cache-Control','no-store');return $response;
    }]);
});

function public_booking_status($input){
    global $wpdb;$key=is_scalar($input['request_id'] ?? null)?(string)$input['request_id']:'';
    if(!preg_match('/^[a-f0-9-]{36}$/Di',$key))return error('not_found',t('Бронювання не знайдено.'),404);
    $token=substr(hash_hmac('sha256',$key,wp_salt('nonce')),0,48);
    $row=$wpdb->get_row($wpdb->prepare('SELECT id,status,starts_at,ends_at,hours FROM '.table('bookings').' WHERE token=%s',$token));
    if(!$row)return error('not_found',t('Бронювання не знайдено.'),404);
    $profile=booking_telegram_profile($row->id);
    return ['id'=>(int)$row->id,'status'=>$row->status,'date_label'=>display_time($row->starts_at,'d.m.Y'),'time_label'=>display_time($row->starts_at,'H:i').'–'.display_time($row->ends_at,'H:i'),'telegram'=>$profile];
}
add_action('rest_api_init',function(){
    register_rest_route('site/v1','/booking/status',['methods'=>'POST','permission_callback'=>'__return_true','callback'=>function($request){
        if(!rate_limit('booking-status:'.client_ip($request),120,MINUTE_IN_SECONDS))return error('rate_limit',t('Забагато спроб. Зачекайте хвилину.'),429);
        $input=$request->get_json_params();
        $result=public_booking_status(is_array($input)?$input:[]);if(is_wp_error($result))return $result;
        $response=new \WP_REST_Response($result);$response->header('Cache-Control','no-store');return $response;
    }]);
});
