<?php
namespace SpAdminUI;
defined('ABSPATH') || exit;
/** Host supplies the public asset directory and eligible screens; this module owns no site routes. */
add_action('admin_enqueue_scripts',function(){
    $screen=get_current_screen();
    if(!$screen || !apply_filters('sp_admin_ui_screen',false,$screen))return;
    $url=apply_filters('sp_admin_ui_assets_url','');if(!$url)return;
    wp_enqueue_style('sp-admin-ui-tokens',$url.'/tokens.css',[],filemtime(__DIR__.'/tokens.css'));
    wp_enqueue_style('sp-admin-ui',$url.'/admin.css',['sp-admin-ui-tokens'],filemtime(__DIR__.'/admin.css'));
},100);
add_filter('admin_body_class',function($classes){
    $screen=get_current_screen();
    return $screen && apply_filters('sp_admin_ui_screen',false,$screen)?$classes.' sp-admin-ui'.($screen->base==='edit'?' sp-ui-record-list':''):$classes;
});
function page_header($title,$description,$eyebrow='SETTINGS') {
    echo '<h1 class="screen-reader-text">'.esc_html($title).'</h1><header class="sp-ui-page-header"><div><span class="sp-ui-eyebrow">'.esc_html($eyebrow).'</span><h2>'.esc_html($title).'</h2><p>'.esc_html($description).'</p></div></header>';
}
