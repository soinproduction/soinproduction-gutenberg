<?php
namespace SiteTheme\Booking;
defined('ABSPATH') || exit;

add_action('admin_menu',function(){
    $GLOBALS['site_booking_screens'][]=add_submenu_page('site-bookings',t('Тарифи'),t('Тарифи'),'manage_bookings','site-booking-tariffs',__NAMESPACE__.'\\tariffs_page');
},20);

function tariff_data($post){
    foreach(parse_blocks($post->post_content) as $block)if($block['blockName']==='site/tariff-details')return $block['attrs']['data'] ?? [];
    return [];
}
function tariff_code($post){return get_post_meta($post->ID,'_site_tariff_code',true) ?: (tariff_data($post)['id'] ?? 'tariff-'.$post->ID);}

function save_tariff($input){
    $id=absint($input['id'] ?? 0);$post=$id?get_post($id):null;
    if($id && (!$post || $post->post_type!=='tariff'))return error('not_found',t('Тариф не знайдено.'),404);
    $name=sanitize_text_field($input['name'] ?? '');$code=$post?tariff_code($post):sanitize_key($input['code'] ?? 'tariff-'.substr(wp_generate_uuid4(),0,8));
    $price=money($input['price'] ?? '');$mode=$input['billingMode'] ?? '';$hours=$mode==='hourly'?1:filter_var($input['durationHours'] ?? 1,FILTER_VALIDATE_INT);
    if(!$name || mb_strlen($name)>150)return error('invalid_name',t('Вкажіть назву тарифу до 150 символів.'));
    if(!preg_match('/^[a-z][a-z0-9-]{0,63}$/D',$code))return error('invalid_code',t('Код тарифу: латинські літери, цифри й дефіс; починається з літери.'));
    if(is_wp_error($price) || $price<1)return error('invalid_price',t('Вкажіть додатну вартість у гривнях.'));
    if(!in_array($mode,['hourly','fixed'],true) || !$hours || $hours<1 || $hours>24)return error('invalid_duration',t('Перевірте спосіб розрахунку й тривалість від 1 до 24 годин.'));
    $minimum=filter_var($input['minimumHours'] ?? 1,FILTER_VALIDATE_INT);
    if(!$minimum || $minimum<1 || $minimum>24)return error('invalid_minimum',t('Мінімальна тривалість: від 1 до 24 годин.'));
    foreach(get_posts(['post_type'=>'tariff','post_status'=>['publish','draft','pending','private','future'],'numberposts'=>-1]) as $other)if($other->ID!==$id && tariff_code($other)===$code)return error('duplicate_code',t('Тариф із таким кодом уже існує.'));
    $blocks=$post?parse_blocks($post->post_content):[];$found=false;
    $values=['id'=>$code,'name'=>$name,'note'=>sanitize_text_field($input['note'] ?? ''),'price'=>$price/100,'unit'=>$mode==='hourly'?t('грн / год'):t('грн'),'billingMode'=>$mode,'durationHours'=>$hours,'minimumHours'=>$minimum,
        'features'=>array_values(array_filter(array_map('sanitize_text_field',(is_array($input['features'] ?? null)?$input['features']:preg_split('/\R/u',$input['features'] ?? ''))),'strlen'))];
    foreach($blocks as &$block)if($block['blockName']==='site/tariff-details'){$block['attrs']['data']=array_replace($block['attrs']['data'] ?? [],$values);$found=true;break;}unset($block);
    if(!$found)$blocks[]=['blockName'=>'site/tariff-details','attrs'=>['data'=>$values],'innerBlocks'=>[],'innerHTML'=>'','innerContent'=>[]];
    $saved=wp_insert_post(wp_slash(['ID'=>$id,'post_type'=>'tariff','post_status'=>($input['status'] ?? '')==='publish'?'publish':'draft','post_title'=>$name,'post_content'=>serialize_blocks($blocks)]),true);
    if(is_wp_error($saved))return $saved;
    update_post_meta($saved,'_site_tariff_code',$code);update_post_meta($saved,'site_tariff_featured',!empty($input['featured']));
    return $saved;
}
add_action('admin_init',function(){
    if(($_SERVER['REQUEST_METHOD'] ?? '')!=='POST' || ($_GET['page'] ?? '')!=='site-booking-tariffs')return;
    if(!current_user_can('manage_bookings'))wp_die(t('Доступ заборонено.'));
    check_admin_referer('site_booking_tariff');$input=wp_unslash($_POST);$input['status']=!empty($input['active'])?'publish':'draft';$result=save_tariff($input);
    if(is_wp_error($result)){$GLOBALS['site_booking_tariff_error']=$result;$GLOBALS['site_booking_tariff_input']=$input;return;}
    wp_safe_redirect(admin_url('site-booking-tariffs',['id'=>$result,'saved'=>1]));exit;
},20);
function tariffs_page(){
    if(!current_user_can('manage_bookings'))return;
    $id=absint($_GET['id'] ?? 0);$post=$id?get_post($id):null;if($post && $post->post_type!=='tariff')$post=null;
    $editing=$post || isset($_GET['new']) || isset($GLOBALS['site_booking_tariff_error']);
    echo '<div class="wrap sp-ui-page site-booking-admin">';\SpAdminUI\page_header(t('Тарифи оренди студії'),t('Тарифи спільні для карток сайту, модального вікна й розрахунку вартості. Зміна не впливає на вартість наявних бронювань.'),t('БРОНЮВАННЯ / ТАРИФИ'));
    if(isset($_GET['saved']))echo t('<div class="notice notice-success"><p>Тариф збережено.</p></div>');
    if(isset($GLOBALS['site_booking_tariff_error']))echo '<div class="notice notice-error"><p>'.esc_html($GLOBALS['site_booking_tariff_error']->get_error_message()).'</p></div>';
    if(!$editing){
        echo '<div class="site-booking-actions"><a class="button button-primary" href="'.esc_url(admin_url('site-booking-tariffs',['new'=>1])).t('">Додати тариф</a></div><section class="sp-ui-card"><div class="site-booking-table-wrap"><table class="widefat site-booking-table"><thead><tr><th>Тариф</th><th>Вартість</th><th>Тривалість</th><th>Статус</th><th>Дія</th></tr></thead><tbody>');
        $posts=get_posts(['post_type'=>'tariff','post_status'=>['publish','draft','pending','private','future'],'numberposts'=>-1,'orderby'=>'menu_order ID','order'=>'ASC']);
        foreach($posts as $entry){$data=tariff_data($entry);$hourly=($data['billingMode'] ?? '')==='hourly';echo '<tr><td><strong>'.esc_html($entry->post_title).'</strong></td><td>'.esc_html(number_format((float)($data['price'] ?? 0),2,',',' ').($hourly?t(' грн / год'):t(' грн'))).'</td><td>'.esc_html($hourly?t('Від ').($data['minimumHours'] ?? 1).t(' ч'):($data['durationHours'] ?? 0).t(' ч')).'</td><td>'.'<label class="site-booking-active-switch site-booking-list-switch"><span data-tariff-status>'.($entry->post_status==='publish'?t('Активний'):t('Неактивний')).'</span><input type="checkbox" role="switch" data-tariff-toggle="'.esc_attr($entry->ID).'" data-endpoint="'.esc_url(rest_url('site/v1/admin/tariffs/'.$entry->ID.'/active')).'" data-nonce="'.esc_attr(wp_create_nonce('wp_rest')).'" aria-label="'.esc_attr(t('Активність тарифу ').$entry->post_title).'" '.checked($entry->post_status,'publish',false).'><span class="site-booking-switch-track" aria-hidden="true"></span></label>'.'</td><td><a class="button" href="'.esc_url(admin_url('site-booking-tariffs',['id'=>$entry->ID])).t('">Редагувати</a></td></tr>');}
        if(!$posts)echo t('<tr><td colspan="5">Тарифів поки немає. Додайте перший тариф.</td></tr>');
        echo '</tbody></table></div></section></div>';return;
    }
    $data=$post?tariff_data($post):[];
    $values=array_replace(['id'=>$post?$post->ID:0,'name'=>$post?$post->post_title:'','code'=>$post?tariff_code($post):'tariff-'.substr(wp_generate_uuid4(),0,8),'price'=>$data['price'] ?? '', 'billingMode'=>$data['billingMode'] ?? 'hourly','durationHours'=>$data['durationHours'] ?? 1,'minimumHours'=>$data['minimumHours'] ?? 1,'note'=>$data['note'] ?? '', 'features'=>implode("\n",$data['features'] ?? []),'status'=>$post?$post->post_status:'draft','featured'=>$post?(bool)get_post_meta($post->ID,'site_tariff_featured',true):false],$GLOBALS['site_booking_tariff_input'] ?? []);
    echo '<form method="post" class="site-booking-tariff-form">';wp_nonce_field('site_booking_tariff');
    echo '<input type="hidden" name="id" value="'.esc_attr($values['id']).t('"><div class="site-booking-tariff-layout"><section class="sp-ui-card site-booking-tariff-editor" aria-label="Вміст картки тарифу">');
    field(t('Підзаголовок'),'note',$values['note']);field(t('Назва тарифу'),'name',$values['name'],'text','required maxlength="150"');
    echo '<div class="site-booking-tariff-price-row">';field(t('Вартість'),'price',$values['price'],'number','min="0.01" max="9999999.99" step="0.01" required');echo '<span data-tariff-unit>'.($values['billingMode']==='hourly'?t('грн / год'):t('грн')).'</span></div>';
    echo t('<div class="site-booking-feature-editor"><h3>Переваги</h3><div data-tariff-features>');
    $rows=is_array($values['features'])?$values['features']:preg_split('/\R/u',$values['features']);
    foreach(array_filter($rows,'strlen') as $feature)echo t('<div class="site-booking-feature-row"><button type="button" class="site-booking-feature-handle" aria-label="Перемістити перевагу" title="Перетягніть або скористайтеся стрілками вгору й униз">⠿</button><input type="text" name="features[]" value="').esc_attr($feature).t('" aria-label="Перевага"><button type="button" class="button site-booking-danger" data-feature-remove aria-label="Видалити перевагу">×</button></div>');
    echo t('</div><button type="button" class="button" data-feature-add>+ Додати перевагу</button></div></section><aside class="sp-ui-card site-booking-tariff-options"><h2>Умови тарифу</h2>');
    echo t('<label class="site-booking-field"><span>Спосіб розрахунку</span><select name="billingMode"><option value="hourly" ').selected($values['billingMode'],'hourly',false).t('>За кожну годину</option><option value="fixed" ').selected($values['billingMode'],'fixed',false).t('>Фіксований пакет</option></select></label>');
    echo '<div data-tariff-minimum>';field(t('Мінімальне бронювання (години)'),'minimumHours',$values['minimumHours'],'number','min="1" max="24" step="1" required');echo '</div>';
    echo '<div data-tariff-duration>';field(t('Тривалість пакета (години)'),'durationHours',$values['durationHours'],'number','min="1" max="24" step="1" required');echo '</div>';
    echo t('<label class="site-booking-active-switch"><span>Тариф активний</span><input type="checkbox" role="switch" name="active" value="1" ').checked($values['status'],'publish',false).'><span class="site-booking-switch-track" aria-hidden="true"></span></label><label class="site-booking-tariff-featured"><input type="checkbox" name="featured" value="1" '.checked($values['featured'],true,false).t('> Популярний тариф</label></aside></div><div class="sp-ui-savebar site-booking-actions"><a class="button" href="').esc_url(admin_url('site-booking-tariffs')).t('">До списку тарифів</a><button class="button button-primary">Зберегти тариф</button></div></form></div>');

}

add_filter('get_edit_post_link',function($url,$id){return get_post_type($id)==='tariff'?admin_url('site-booking-tariffs',['id'=>$id]):$url;},10,2);
add_action('admin_init',function(){
    if(($GLOBALS['pagenow'] ?? '')!=='post.php' || ($_GET['action'] ?? '')!=='edit')return;
    $id=absint($_GET['post'] ?? 0);
    if(get_post_type($id)==='tariff' && current_user_can('manage_bookings')){wp_safe_redirect(admin_url('site-booking-tariffs',['id'=>$id]));exit;}
},30);

add_action('rest_api_init',function(){
    register_rest_route('site/v1','/admin/tariffs/(?P<id>\d+)/active',[
        'methods'=>'POST','permission_callback'=>fn()=>current_user_can('manage_bookings'),
        'args'=>['active'=>['required'=>true,'type'=>'boolean']],
        'callback'=>function($request){
            $post=get_post((int)$request['id']);
            if(!$post || $post->post_type!=='tariff')return error('not_found',t('Тариф не знайдено.'),404);
            $result=wp_update_post(['ID'=>$post->ID,'post_status'=>$request['active']?'publish':'draft'],true);
            return is_wp_error($result)?$result:rest_ensure_response(['active'=>get_post_status($post->ID)==='publish']);
        }
    ]);
});
