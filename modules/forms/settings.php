<?php
namespace FormEngine;
defined('ABSPATH') || exit;
function safe_destination($url) {
    $p=wp_parse_url($url);
    return ($p['scheme']??'')==='https'&&!isset($p['user'])&&!isset($p['pass'])&&(!isset($p['port'])||$p['port']===443)&&wp_http_validate_url($url);
}
function clean_settings($input,$old) {
    $s=[];
    foreach(['emailEnabled','emailHtml','webhookEnabled','telegramEnabled','turnstileEnabled']as $k)$s[$k]=!empty($input[$k]);
    foreach(['recipient','subject','fromEmail','fromName','cc','bcc','replyToField','webhookUrl','telegramChat','turnstileSiteKey','turnstileHostname']as $k) {
        if(isset($input[$k])&&!is_string($input[$k]))return error('invalid_settings',422);
        $s[$k]=sanitize_text_field(substr($input[$k]??'',0,2000));
    }
    if(isset($input['emailBody'])&&!is_string($input['emailBody']))return error('invalid_settings',422);
    $body=substr((string)($input['emailBody']??'[_all_fields]'),0,16000);
    $s['emailBody']=$s['emailHtml']?wp_kses_post($body):sanitize_textarea_field($body);
    if($s['emailEnabled']) {
        $emails=array_filter(array_map('trim',explode(',',$s['recipient'])));
        if(!$emails||count($emails)>5)return error('invalid_recipient',422);
        foreach($emails as $email)if(!is_email($email))return error('invalid_recipient',422);
        $s['recipient']=implode(',',$emails);
        if(!$s['subject'])$s['subject']='New form submission: [_form_title]';
        if($s['fromEmail']!==''&&!is_email($s['fromEmail']))return error('invalid_sender',422);
        foreach(['cc','bcc'] as $header) {
            $addresses=array_filter(array_map('trim',explode(',',$s[$header])));
            if(count($addresses)>5)return error('invalid_header',422);
            foreach($addresses as $address)if(!is_email($address))return error('invalid_header',422);
            $s[$header]=implode(',',$addresses);
        }
    }
    if($s['webhookEnabled']&&!safe_destination($s['webhookUrl']))return error('unsafe_webhook',422);
    if($s['telegramEnabled']&&!preg_match('/^(?:-?\d{1,20}|@[A-Za-z][A-Za-z0-9_]{4,64})$/',$s['telegramChat']))return error('invalid_chat',422);
    foreach(['telegramToken','webhookSecret','turnstileSecret']as $k) {
        $raw=$input[$k]??'';
        if(!is_string($raw)||strlen($raw)>512)return error('invalid_secret',422);
        if(!empty($input['clear_'.$k]))$raw='';
        elseif($raw==='') {
            $s[$k]=$old[$k]??'';
            continue;
        }
        if($raw!==''&&$k==='telegramToken'&&!preg_match('/^\d{5,20}:[A-Za-z0-9_-]{20,200}$/',$raw))return error('invalid_bot_token',422);
        $v=encrypt($raw);
        if(is_wp_error($v))return $v;
        $s[$k]=$v;
    }
    if($s['telegramEnabled']&&!decrypt($s['telegramToken']??''))return error('missing_bot_token',422);
    if($s['webhookEnabled']&&strlen(decrypt($s['webhookSecret']??''))<32)return error('webhook_secret_too_short',422);
    if($s['turnstileEnabled']&&(!$s['turnstileSiteKey']||!decrypt($s['turnstileSecret']??'')||!preg_match('/^[a-zA-Z0-9.-]+$/',$s['turnstileHostname'])))return error('invalid_turnstile',422);
    return $s;
}
function visible_settings($s) {
    foreach(['telegramToken','webhookSecret','turnstileSecret']as $k) {
        $s[$k.'Saved']=!empty($s[$k]);
        unset($s[$k]);
    }
    return $s;
}
function register_settings_routes() {
    register_rest_route('form-engine/v1','/forms/(?P<id>\d+)/settings',['methods'=>['GET','POST'],'permission_callback'=>fn($r)=>current_user_can('manage_options')&&current_user_can('edit_post',(int)$r['id']),'callback'=>function($r) {
        $p=get_post((int)$r['id']);
        if(!$p||$p->post_type!==config('post_type'))return error('not_found',404);
        $s=settings($p->ID);
        if($r->get_method()==='POST') {
            if(strlen($r->get_body())>24000)return error('too_large',413);
            $input=$r->get_json_params();
            if(!is_array($input))return error('invalid_settings',422);
            $s=clean_settings($input,$s);
            if(is_wp_error($s))return $s;
            update_post_meta($p->ID,'_form_engine_settings',$s);
        }
        return new \WP_REST_Response(visible_settings($s),200,['Cache-Control'=>'no-store']);
    }
    ]);
}
