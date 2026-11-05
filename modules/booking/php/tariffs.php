<?php
namespace SiteTheme\Booking;
defined('ABSPATH') || exit;
add_action('init',function(){
    register_post_type('tariff',[
        'labels'=>['name'=>t('Тарифи'),'singular_name'=>t('Тариф'),'add_new_item'=>t('Додати тариф'),'edit_item'=>t('Редагувати тариф')],
        'show_in_menu'=>false,'public'=>false,'show_ui'=>false,'show_in_rest'=>true,'menu_icon'=>'dashicons-tag',
        'capabilities'=>array_fill_keys(['edit_post','read_post','delete_post','edit_posts','edit_others_posts','publish_posts','read_private_posts','delete_posts','delete_private_posts','delete_published_posts','delete_others_posts','edit_private_posts','edit_published_posts','create_posts'],'manage_bookings'),
        'supports'=>['title','editor','revisions','custom-fields'],'template'=>[['site/tariff-details',[]]],
    ]);
    register_post_meta('tariff','site_tariff_featured',['type'=>'boolean','single'=>true,'default'=>false,'show_in_rest'=>true,'auth_callback'=>fn()=>current_user_can('manage_bookings')]);
});
function tariff_records(){
    return array_map(function($post){
        $content=parsed_blocks($post->post_content);$details=null;
        foreach($content as $block)if($block['name']==='site/tariff-details'){$details=$block;break;}
        $data=$details['attrs']['data']??[];
        $data['name']=isset($data['name'])&&trim(wp_strip_all_tags($data['name']))===trim($post->post_title)?$data['name']:$post->post_title;$data['id']=get_post_meta($post->ID,'_site_tariff_code',true)?:($data['id']??'tariff-'.$post->ID);
        $data['featured']=(bool)get_post_meta($post->ID,'site_tariff_featured',true);
        return ['id'=>$post->ID,'title'=>$post->post_title,'data'=>$data,'buttons'=>($details['innerBlocks']??[])];
    },get_posts(['post_type'=>'tariff','post_status'=>'publish','numberposts'=>-1,'orderby'=>'menu_order date','order'=>'ASC']));
}
function parsed_blocks($content){return call_user_func(config('blocks'),$content);}

add_filter('manage_tariff_posts_columns',function($columns){$columns['site_price']=t('Вартість');$columns['site_popular']=t('Популярний');return $columns;});
add_action('manage_tariff_posts_custom_column',function($column,$id){
    if($column==='site_popular')echo get_post_meta($id,'site_tariff_featured',true)?t('★ Так'):'—';
    if($column==='site_price')foreach(parsed_blocks(get_post_field('post_content',$id)) as $b)if($b['name']==='site/tariff-details')echo esc_html(number_format_i18n((float)($b['attrs']['data']['price']??0)).' '.($b['attrs']['data']['unit']??t('грн')));
},10,2);
