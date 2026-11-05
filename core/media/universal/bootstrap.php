<?php
namespace SpMedia;
defined('ABSPATH') || exit;
/** Hydrate only tagged media values. Attachment IDs are the source of truth. */
function hydrate($value) {
    if (!is_array($value)) return $value;
    if (($value['kind'] ?? '') !== 'sp-media') return array_map(__NAMESPACE__.'\\hydrate', $value);
    if (isset($value['desktop'])) {
        $result=['kind'=>'sp-media'];
        foreach(['desktop','tablet','mobile'] as $device) if(isset($value[$device]) && is_array($value[$device])) $result[$device]=variant($value[$device]);
        return $result;
    }
    return array_merge(['kind'=>'sp-media'], variant($value));
}
function variant(array $value): array {
    $source=in_array($value['source']??'', ['youtube','vimeo'],true)?$value['source']:'library';
    $result=['source'=>$source,'display'=>in_array($value['display']??'', ['inline','popup'],true)?$value['display']:'inline'];
    $id=$source==='library'?absint($value['attachment_id']??0):0;
    $library=$id?(array)apply_filters('sp_media_video_defaults',[],$id):[];
    $playback=['autoplay','muted','loop','controls'];
    $inherit=array_key_exists('inherit_playback',$value)?(bool)$value['inherit_playback']:!count(array_intersect($playback,array_keys($value)));
    $inherit_poster=array_key_exists('inherit_poster',$value)?(bool)$value['inherit_poster']:empty($value['poster_id']);
    if($source==='library'){$result['inherit_playback']=$inherit;$result['inherit_poster']=$inherit_poster;$result['library_defaults']=$library;}
    foreach(['autoplay'=>false,'muted'=>false,'loop'=>false,'controls'=>true,'playsinline'=>true,'custom_play'=>true] as $key=>$default)$result[$key]=$source==='library' && $inherit && array_key_exists($key,$library)?(bool)$library[$key]:(isset($value[$key])?(bool)$value[$key]:$default);
    $poster=absint($source==='library' && $inherit_poster?($library['poster_id']??0):($value['poster_id']??0));
    $result['poster_id']=$poster;
    $result['poster_url']=$poster && wp_attachment_is_image($poster)?(wp_get_attachment_url($poster)?:''):'';
    if($source!=='library')return array_merge($result,['url'=>esc_url_raw($value['url']??'', ['https']),'title'=>sanitize_text_field($value['title']??''),'media_type'=>'embed']);
    $id=absint($value['attachment_id']??0);$mime=$id?(string)get_post_mime_type($id):'';
    $type=str_starts_with($mime,'image/')?'image':(str_starts_with($mime,'video/')?'video':'');
    return array_merge($result,['attachment_id'=>$type?$id:0,'url'=>$type?(wp_get_attachment_url($id)?:''):'','mime_type'=>$mime,'media_type'=>$type,'alt'=>sanitize_text_field($value['alt']??get_post_meta($id,'_wp_attachment_image_alt',true)),'title'=>$type?get_the_title($id):'']);
}
