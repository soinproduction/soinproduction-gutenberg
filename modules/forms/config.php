<?php
namespace FormEngine;
defined('ABSPATH') || exit;
function field_types() { return ['text','email','tel','textarea','select','radio','checkbox','number','date','hidden','metric']; }
function config($key) {
    return $GLOBALS['form_engine_config'][$key]??null;
}
function secret() {
    return defined('FORM_ENGINE_SECRET')?FORM_ENGINE_SECRET:'';
}
function error($code,$status=400) {
    return new \WP_Error($code,'Unable to submit form. Please check your data or try again later.',['status'=>$status]);
}
function definition($post) {
    foreach (parse_blocks($post->post_content) as $block) {
        if ($block['blockName'] !== config('block')) continue;
        $data = $block['attrs']['data'] ?? [];
        $data['fields'] = [];
        $data['successHtml'] = '';
        foreach ($block['innerBlocks'] ?? [] as $child) if (($child['blockName']??'') === 'form-engine/success') $data['successHtml'] = wp_kses_post(render_block($child));
        foreach ($block['innerBlocks'] ?? [] as $child) {
            if (!str_starts_with($child['blockName'] ?? '', 'form-engine/field-')) continue;
            $field = $child['attrs']['field'] ?? [];
            $field['type'] = substr($child['blockName'], strlen('form-engine/field-'));
            $data['fields'][] = $field;
        }
        return $data;
    }
    return [];
}
function form_post($id) {
    $p=get_post($id);
    return $p&&$p->post_type===config('post_type')&&$p->post_status==='publish'&&!$p->post_password?$p:null;
}
function settings($id) {
    $s=get_post_meta($id,'_form_engine_settings',true);
    return is_array($s)?$s:[];
}
function encryption_key() {
    return hash('sha256',defined('FORM_ENGINE_ENCRYPTION_KEY')&&strlen(FORM_ENGINE_ENCRYPTION_KEY)>=32?FORM_ENGINE_ENCRYPTION_KEY:wp_salt('auth'),true);
}
function encrypt($value) {
    if($value==='')return '';
    if(!function_exists('sodium_crypto_secretbox'))return error('encryption_unavailable',503);
    $nonce=random_bytes(SODIUM_CRYPTO_SECRETBOX_NONCEBYTES);
    return base64_encode($nonce.sodium_crypto_secretbox($value,$nonce,encryption_key()));
}
function decrypt($value) {
    if(!$value||!function_exists('sodium_crypto_secretbox_open'))return '';
    try {
        $raw=base64_decode($value,true);
        if(!$raw||strlen($raw)<SODIUM_CRYPTO_SECRETBOX_NONCEBYTES)return '';
        $plain=sodium_crypto_secretbox_open(substr($raw,SODIUM_CRYPTO_SECRETBOX_NONCEBYTES),substr($raw,0,SODIUM_CRYPTO_SECRETBOX_NONCEBYTES),encryption_key());
        if($plain===false)error_log('[form-engine] saved secret cannot be decrypted');
        return $plain?:'';
    }
    catch(\Throwable $e) {
        return '';
    }
}
function public_action($data) {
    $type=$data['successAction']??'message';
    if($type==='redirect') {
        $url=trim((string)($data['redirectUrl']??''));
        if (($data['redirectSource']??'url')==='page') {
            $page=get_post(absint($data['redirectPageId']??0));
            $url=$page&&$page->post_type==='page'&&$page->post_status==='publish'&&!$page->post_password?wp_make_link_relative(get_permalink($page)):'';
        }
        if(preg_match('#^/(?!/)[^\\\\]*$#',$url)||preg_match('#^https://#',$url))return ['type'=>'redirect','url'=>esc_url_raw($url,['https'])];
    }
    if($type==='modal') {
        $id=absint($data['successModalId']??0);
        $post=get_post($id);
        if($post&&$post->post_status==='publish'&&!$post->post_password&&$post->post_type===config('modal_type'))return ['type'=>'modal','id'=>$id,'slug'=>$post->post_name];
    }
    return ['type'=>'message'];
}
