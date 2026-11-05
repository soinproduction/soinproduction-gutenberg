<?php
namespace FormEngine;
defined('ABSPATH') || exit;
require_once __DIR__.'/config.php';
require_once __DIR__.'/validation.php';
require_once __DIR__.'/settings.php';
require_once __DIR__.'/delivery.php';
require_once __DIR__.'/admin.php';
function boot($config) {
    $GLOBALS['form_engine_config']=$config;
    add_action('init',function() {
        register_block_type('form-engine/success',['api_version'=>3,'supports'=>['html'=>false]]);
        foreach (field_types() as $type) register_block_type('form-engine/field-'.$type,['api_version'=>3,'attributes'=>['field'=>['type'=>'object','default'=>new \stdClass()]],'supports'=>['html'=>false],'render_callback'=>fn()=> '']);
        register_post_type(config('post_type'),['labels'=>['name'=>'Forms','singular_name'=>'Form','add_new_item'=>'Add form','edit_item'=>'Edit form'],'public'=>false,'show_ui'=>true,'show_in_rest'=>true,'menu_icon'=>'dashicons-feedback','supports'=>['title','editor','revisions'],'template'=>[[config('block'),['lock'=>['move'=>true,'remove'=>true]]]],'template_lock'=>false]);
        register_post_type(config('entry_type'),['labels'=>['name'=>'Entries','singular_name'=>'Entry','edit_item'=>'View entry','search_items'=>'Search name or phone','not_found'=>'No entries found'],'public'=>false,'show_ui'=>true,'show_in_menu'=>'edit.php?post_type='.config('post_type'),'show_in_rest'=>false,'supports'=>['title'],'map_meta_cap'=>false,'capabilities'=>['edit_post'=>'manage_options','read_post'=>'manage_options','delete_post'=>'manage_options','edit_posts'=>'manage_options','edit_others_posts'=>'manage_options','publish_posts'=>'do_not_allow','read_private_posts'=>'manage_options','delete_posts'=>'manage_options','create_posts'=>'do_not_allow']]);
        if(!wp_next_scheduled('form_engine_prune'))wp_schedule_event(time()+3600,'daily','form_engine_prune');
    }
    );
    add_filter('block_categories_all',fn($categories)=>array_merge($categories,[['slug'=>'form-engine','title'=>'Form fields']]));
    add_filter('allowed_block_types_all', function($allowed,$context) {
        $fields=array_map(fn($type)=>'form-engine/field-'.$type,field_types());
        if (($context->post->post_type??'')===config('post_type')) return array_merge([config('block'),'form-engine/success','core/paragraph','core/heading','core/image','core/buttons','core/button','core/group','core/columns','core/column','core/spacer'],$fields);
        if ($allowed===false) return false;
        $names=is_array($allowed)?$allowed:array_keys(\WP_Block_Type_Registry::get_instance()->get_all_registered());
        return array_values(array_diff($names,$fields));
    },30,2);
    add_action('before_delete_post',function($id) {
        if(get_post_type($id)===config('entry_type'))wp_clear_scheduled_hook('form_engine_deliver',[$id]);
    }
    );
    add_action('admin_post_form_engine_retry', function() {
        $id = absint($_GET['entry'] ?? 0);
        if (!current_user_can('manage_options') || get_post_type($id) !== config('entry_type')) wp_die('Not allowed', '', ['response' => 403]);
        check_admin_referer('form_engine_retry_' . $id);
        retry_failed($id);
        wp_safe_redirect(get_edit_post_link($id, 'raw'));
        exit;
    });
    add_action('form_engine_deliver',__NAMESPACE__.'\\deliver');
    add_action('form_engine_prune',__NAMESPACE__.'\\prune');
    add_action('rest_api_init',function() {
        register_settings_routes();
        register_rest_route('form-engine/v1','/forms/(?P<id>\d+)/challenge',['methods'=>'POST','permission_callback'=>__NAMESPACE__.'\\signed_request','callback'=>function($r) {
            $post=form_post((int)$r['id']);
            $client=$r->get_json_params()['client']??'';
            if(!$post||!preg_match('/^[a-f0-9]{64}$/',$client))return error('not_found',404);
            if(!rate_limit('challenge:'.$post->ID,1000,3600))return error('rate_limit',429);
            $s=settings($post->ID);
            return new \WP_REST_Response(['challenge'=>challenge($post->ID,$client),'turnstile'=>!empty($s['turnstileEnabled'])?['siteKey'=>$s['turnstileSiteKey'],'action'=>'form-submit']:null],200,['Cache-Control'=>'no-store']);
        }
        ]);
        register_rest_route('form-engine/v1','/forms/(?P<id>\d+)/submit',['methods'=>'POST','permission_callback'=>__NAMESPACE__.'\\signed_request','callback'=>__NAMESPACE__.'\\submit']);
    }
    );
    entry_screen();
}
function submit($r) {
    if(strlen($r->get_body())>20000)return error('too_large',413);
    $post=form_post((int)$r['id']);
    if(!$post)return error('not_found',404);
    $in=$r->get_json_params();
    $client=$in['client']??'';
    if(!is_array($in)||!is_array($in['values']??null)||!preg_match('/^[a-f0-9]{64}$/',$client))return error('invalid_request');
    if(!rate_limit('form:'.$post->ID,500,3600)||!rate_limit('client:'.$post->ID.':'.$client,10,600))return error('rate_limit',429);
    if(!empty($in['website'])||!verify_challenge($in['challenge']??'', $post->ID,$client))return error('invalid_challenge',403);
    $schema=definition($post);
    $clean=validate_values($schema,$in['values']);
    if(is_wp_error($clean))return $clean;
    if(!verify_turnstile(settings($post->ID),$in['turnstile']??''))return error('antispam_failed',403);
    $issued=json_decode(base64_decode(explode('.',$in['challenge'])[0]),true)['time'];
    $used='_fe_used_'.($issued+7200).'_'.hash('sha256',$in['challenge']);
    if(!add_option($used,'1','','no'))return error('replayed',409);
    $entry=wp_insert_post(['post_type'=>config('entry_type'),'post_status'=>'private','post_title'=>$post->post_title.' — '.current_time('Y-m-d H:i:s'),'meta_input'=>['_form_engine_form_id'=>$post->ID,'_form_engine_fields'=>$clean,'_form_engine_delivery'=>array_fill_keys(array_values(array_filter(['email','webhook','telegram'],fn($c)=>!empty(settings($post->ID)[$c.'Enabled']))),['status'=>'queued','attempts'=>0])]],true);
    if(is_wp_error($entry)) {
        delete_option($used);
        return error('save_failed',500);
    }
    wp_schedule_single_event(time()+1,'form_engine_deliver',[$entry]);
    return new \WP_REST_Response(['ok'=>true,'action'=>public_action($schema)],200,['Cache-Control'=>'no-store']);
}
