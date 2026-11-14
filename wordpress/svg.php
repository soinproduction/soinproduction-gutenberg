<?php
namespace SiteTheme;
defined('ABSPATH') || exit;
// SVGs are restricted to static vector shapes. No scripts, styles, foreign content or remote references.
function valid_logo_svg($file) {
    if (!is_file($file) || filesize($file)>1024*1024) return false;
    $xml=file_get_contents($file);
    if (preg_match('/<!DOCTYPE|<!ENTITY|<\?(?!xml\s)/i',$xml)) return false;
    $previous=libxml_use_internal_errors(true);
    $doc=new \DOMDocument();
    $loaded=$doc->loadXML($xml,LIBXML_NONET);
    libxml_clear_errors();libxml_use_internal_errors($previous);
    if (!$loaded || $doc->documentElement->localName!=='svg') return false;
    $tags=['svg','g','path','rect','circle','ellipse','line','polyline','polygon','defs','linearGradient','radialGradient','stop','clipPath','mask','title','desc'];
    $attrs=['xmlns','version','viewBox','width','height','x','y','x1','x2','y1','y2','cx','cy','r','rx','ry','d','points','fill','fill-rule','fill-opacity','stroke','stroke-width','stroke-linecap','stroke-linejoin','stroke-miterlimit','stroke-opacity','stroke-dasharray','stroke-dashoffset','opacity','transform','id','clip-path','clip-rule','mask','offset','stop-color','stop-opacity','gradientUnits','gradientTransform','spreadMethod','preserveAspectRatio','role','aria-label'];
    foreach($doc->getElementsByTagName('*') as $node){
        if(!in_array($node->localName,$tags,true))return false;
        foreach($node->attributes as $attribute){
            if(!in_array($attribute->nodeName,$attrs,true))return false;
            if(preg_match('/javascript:|data:|https?:|\/\//i',$attribute->value)&&$attribute->nodeName!=='xmlns')return false;
            if(str_contains($attribute->value,'url(')&&!preg_match('/^url\(#[a-zA-Z0-9_-]+\)$/',$attribute->value))return false;
        }
    }
    return true;
}
function allow_svg_upload(){return (defined('WP_CLI')&&WP_CLI)||current_user_can('manage_options');}
add_filter('upload_mimes',function($mimes){if(allow_svg_upload())$mimes['svg']='image/svg+xml';return $mimes;});
add_filter('wp_handle_upload_prefilter',function($file){
    if(strtolower(pathinfo($file['name'],PATHINFO_EXTENSION))==='svg'&&(!allow_svg_upload()||!valid_logo_svg($file['tmp_name'])))$file['error']='SVG files must contain static vector graphics only. Export the logo as outlines without scripts or external resources.';
    return $file;
});
add_filter('wp_check_filetype_and_ext',function($data,$file,$filename){
    if(strtolower(pathinfo($filename,PATHINFO_EXTENSION))==='svg'&&allow_svg_upload()&&valid_logo_svg($file))return ['ext'=>'svg','type'=>'image/svg+xml','proper_filename'=>false];
    if(strtolower(pathinfo($filename,PATHINFO_EXTENSION))==='svg')return ['ext'=>false,'type'=>false,'proper_filename'=>false];
    return $data;
},10,3);
