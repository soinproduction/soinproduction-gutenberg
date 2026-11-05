<?php
namespace SpIcons;
defined('ABSPATH') || exit;
require_once __DIR__.'/library.php';
require_once __DIR__.'/admin.php';
add_action('rest_api_init',function(){
    register_rest_route('sp-icons/v1','/library',[
        'methods'=>'GET','permission_callback'=>'__return_true','callback'=>fn()=>catalogue()
    ]);
});
