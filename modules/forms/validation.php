<?php
namespace FormEngine;
defined('ABSPATH') || exit;
function validate_values($schema,$values) {
    if(!is_array($values)||!is_array($schema['fields']??null)||!count($schema['fields'])||count($schema['fields'])>60)return error('invalid_form',422);
    $clean=[];
    $seen=[];
    $types=field_types();
    foreach($schema['fields'] as $field) {
        $id=$field['id']??'';
        $type=$field['type']??'text';
        if(!preg_match('/^[a-zA-Z][\w-]{0,63}$/',$id)||isset($seen[$id])||!in_array($type,$types,true))return error('invalid_schema',422);
        $seen[$id]=true;
        $raw=$type==='hidden'?($field['defaultValue']??''):($values[$id]??'');
        if($type==='checkbox') {
            $value=in_array($raw,[true,'1','on'],true);
        }
        else {
            if(!is_scalar($raw)||is_bool($raw))return error('invalid_field',422);
            $limit=$type==='textarea'?4000:($type==='email'?254:($type==='tel'?40:500));
            if(mb_strlen((string)$raw)>$limit)return error('too_long',422);
            $value=$type==='textarea'?sanitize_textarea_field((string)$raw):sanitize_text_field((string)$raw);
        }
        if($type==='metric') {
            $source=$field['metricSource']??'utm_source';
            if(in_array($source,['page_url','referrer'],true)) {
                $url=wp_parse_url($value);
                $value=is_array($url)&&in_array($url['scheme']??'',['http','https'],true)&&!empty($url['host'])?$url['scheme'].'://'.$url['host'].(isset($url['port'])?':'.$url['port']:'').($url['path']??'/'):'';
            } elseif($source==='query'&&!preg_match('/^utm_[a-z0-9_]{1,40}$/',$field['queryKey']??'')) $value='';
        }
        if(!in_array($type,['hidden','metric'],true)&&!empty($field['required'])&&($value===''||$value===false))return error('required_field',422);
        if($value!==''&&$type==='email'&&!is_email($value))return error('invalid_email',422);
        if($value!==''&&in_array($type,['select','radio'],true)&&!in_array($value,array_map('trim',array_map('strval',is_array($field['options']??null)?$field['options']:[])),true))return error('invalid_option',422);
        if($value!==''&&$type==='number') {
            if(!is_numeric($value)||!is_finite((float)$value))return error('invalid_number',422);
            if(isset($field['min'])&&is_numeric($field['min'])&&(float)$value<(float)$field['min'])return error('number_range',422);
            if(isset($field['max'])&&is_numeric($field['max'])&&(float)$value>(float)$field['max'])return error('number_range',422);
        }
        if($value!==''&&$type==='date'&&(!preg_match('/^\d{4}-\d{2}-\d{2}$/',$value)||!checkdate((int)substr($value,5,2),(int)substr($value,8,2),(int)substr($value,0,4))))return error('invalid_date',422);
        $clean[]=['id'=>$id,'label'=>sanitize_text_field($field['label']??$id),'value'=>$value];
    }
    return $clean;
}
function signed_request($request) {
    $time=(string)$request->get_header('x-form-time');
    $sig=(string)$request->get_header('x-form-signature');
    if(strlen(secret())<32||!ctype_digit($time)||abs(time()-(int)$time)>120)return false;
    return hash_equals(hash_hmac('sha256',$request->get_method().':'.$request['id'].':'.$time.':'.$request->get_body(),secret()),$sig);
}
function challenge($id,$client) {
    $payload=base64_encode(wp_json_encode(['form'=>(int)$id,'client'=>$client,'time'=>time(),'nonce'=>bin2hex(random_bytes(16))]));
    return $payload.'.'.hash_hmac('sha256',$payload,secret());
}
function verify_challenge($token,$id,$client) {
    if(!is_string($token)||strlen($token)>1024)return false;
    $parts=explode('.',$token);
    if(count($parts)!==2||!hash_equals(hash_hmac('sha256',$parts[0],secret()),$parts[1]))return false;
    $data=json_decode(base64_decode($parts[0],true)?:'',true);
    return is_array($data)&&($data['form']??0)===(int)$id&&hash_equals((string)($data['client']??''),$client)&&time()-($data['time']??0)>=2&&time()-$data['time']<=7200;
}
/** Atomic, fixed-window limits: no read/modify/write race and no raw IP storage. */
function rate_limit($identity,$limit,$seconds) {
    global $wpdb;
    $window=(int)floor(time()/$seconds);
    $key='_fe_rate_'.($window*$seconds+$seconds).'_'.hash('sha256',$identity);
    add_option($key,'0','','no');
    $changed=$wpdb->query($wpdb->prepare("UPDATE {$wpdb->options} SET option_value=CAST(option_value AS UNSIGNED)+1 WHERE option_name=%s AND CAST(option_value AS UNSIGNED)<%d",$key,$limit));
    wp_cache_delete($key,'options');
    return $changed===1;
}
function verify_turnstile($settings,$token) {
    if(empty($settings['turnstileEnabled']))return true;
    $key=decrypt($settings['turnstileSecret']??'');
    if(!$key||!is_string($token)||strlen($token)>2048)return false;
    $r=wp_safe_remote_post('https://challenges.cloudflare.com/turnstile/v0/siteverify',['timeout'=>8,'redirection'=>0,'body'=>['secret'=>$key,'response'=>$token]]);
    if(is_wp_error($r)||wp_remote_retrieve_response_code($r)!==200)return false;
    $v=json_decode(wp_remote_retrieve_body($r),true);
    return !empty($v['success'])&&($v['action']??'')==='form-submit'&&strtolower($v['hostname']??'')===strtolower($settings['turnstileHostname']??'');
}
