<?php
namespace SiteTheme;
defined('ABSPATH') || exit;
add_action('rest_api_init',function(){
    register_rest_route('site/v1','/modal/(?P<id>\d+)',['methods'=>'GET','permission_callback'=>'__return_true','callback'=>function($request){$post=get_post((int)$request['id']);if(!$post||$post->post_type!=='site_modal'||$post->post_status!=='publish'||$post->post_password)return new \WP_Error('not_found','Modal unavailable',['status'=>404]);return modal_record($post);}]);
});
