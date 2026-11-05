<?php
namespace SpIcons;
defined('ABSPATH') || exit;

const OPTION = 'sp_icon_sets';
const IDS_OPTION = 'sp_icon_ids';
function sets() { $value=get_option(OPTION, []);return is_array($value)?$value:[]; }
function key_name($name) {
    $slug=sanitize_title($name);
    return preg_match('/^[a-z0-9_-]+$/',$slug)?$slug:'item-'.substr(hash('sha256',$name),0,16);
}
function catalogue() {
    $icons=[];
    foreach(sets() as $slug=>$set) foreach($set['icons'] as $key=>$icon)
        $icons[]=['value'=>$icon['value']??'custom:'.$slug.':'.$key,'label'=>$icon['label'],'set'=>$set['name'],'svg'=>$icon['svg']];
    return $icons;
}
function fail($message) { throw new \RuntimeException($message); }
/** Static shapes only; never embed uploaded XML, CSS or executable archive contents. */
function sanitize_svg($xml) {
    if(strlen($xml)>262144 || preg_match('/<!DOCTYPE|<!ENTITY|<\?(?!xml\s)/i',$xml)) fail('SVG must contain static vector shapes only.');
    $previous=libxml_use_internal_errors(true);
    $doc=new \DOMDocument();
    $ok=$doc->loadXML($xml,LIBXML_NONET);
    libxml_clear_errors();libxml_use_internal_errors($previous);
    if(!$ok || $doc->documentElement->localName!=='svg') fail('Invalid SVG.');
    $tags=['svg','g','path','rect','circle','ellipse','line','polyline','polygon','title','desc'];
    $attrs=['xmlns','version','viewBox','width','height','x','y','x1','x2','y1','y2','cx','cy','r','rx','ry','d','points','fill','fill-rule','fill-opacity','stroke','stroke-width','stroke-linecap','stroke-linejoin','stroke-miterlimit','stroke-opacity','stroke-dasharray','stroke-dashoffset','opacity','transform','preserveAspectRatio'];
    foreach($doc->getElementsByTagName('*') as $node) {
        if(!in_array($node->localName,$tags,true)) fail('Unsupported SVG element: '.$node->localName.'. Export the icon as paths.');
        foreach(iterator_to_array($node->attributes) as $attr) {
            if(!in_array($attr->nodeName,$attrs,true) || ($attr->nodeName!=='xmlns' && preg_match('/url\s*\(|javascript:|data:|https?:|\/\/|[<>]/i',$attr->value))) fail('SVG contains unsupported attributes or references.');
            if(in_array($attr->nodeName,['fill','stroke'],true) && $attr->value!=='none') $node->setAttribute($attr->nodeName,'currentColor');
        }
    }
    $root=$doc->documentElement;
    if(!$root->hasAttribute('viewBox')) {
        $w=(float)$root->getAttribute('width');$h=(float)$root->getAttribute('height');
        if($w<=0 || $h<=0) fail('SVG needs a viewBox or positive width and height.');
        $root->setAttribute('viewBox',"0 0 $w $h");
    }
    if(!preg_match('/^\s*-?[\d.]+[ ,]+-?[\d.]+[ ,]+[\d.]+[ ,]+[\d.]+\s*$/',$root->getAttribute('viewBox'))) fail('Invalid SVG viewBox.');
    $root->setAttribute('xmlns','http://www.w3.org/2000/svg');
    $root->setAttribute('width','24');$root->setAttribute('height','24');
    return $doc->saveXML($root);
}
function parse_selection($json) {
    $data=json_decode($json,true,64,JSON_THROW_ON_ERROR);
    if(($data['IcoMoonType']??'')!=='selection' || empty($data['icons']) || !is_array($data['icons']) || count($data['icons'])>3000) fail('Expected an IcoMoon selection with 1–3000 icons.');
    $icons=[];
    foreach($data['icons'] as $item) {
        $label=$item['properties']['name']??'';
        if(!is_string($label) || !trim($label)) fail('Icon name is required.');
        $name=key_name($label);
        if(!$name || isset($icons[$name])) fail('Icon names must be unique and non-empty.');
        $paths=$item['icon']['paths']??[];
        if(!is_array($paths) || !$paths || count($paths)>100) fail('Invalid icon paths.');
        $width=(float)($item['icon']['width']??1024);
        if($width<=0 || $width>65536) fail('Invalid icon width.');
        $svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '.$width.' 1024" fill="currentColor">';
        foreach($paths as $path) {
            if(!is_string($path) || strlen($path)>200000 || !preg_match('/^[MmZzLlHhVvCcSsQqTtAaEe0-9.,+\s-]+$/',$path)) fail('Invalid vector path.');
            $svg.='<path d="'.esc_attr($path).'"/>';
        }
        $svg.='</svg>';
        $icons[$name]=['label'=>sanitize_text_field($item['properties']['name']),'svg'=>sanitize_svg($svg)];
    }
    return $icons;
}
function import_zip($file) {
    if(!class_exists('ZipArchive')) fail('PHP ZipArchive is required.');
    if(!is_file($file) || filesize($file)>10*1024*1024) fail('ZIP limit is 10 MB.');
    $zip=new \ZipArchive();
    if($zip->open($file)!==true) fail('Invalid ZIP archive.');
    try {
        if($zip->numFiles>500) fail('Too many archive entries.');
        $selection=null;
        for($i=0;$i<$zip->numFiles;$i++) {
            $s=$zip->statIndex($i);$name=str_replace('\\','/',$s['name']);
            if(str_starts_with($name,'/') || preg_match('~(^|/)\.\.(/|$)~',$name)) fail('Unsafe archive path.');
            if(basename($name)==='selection.json') {
                if($selection!==null || $s['size']>5*1024*1024) fail('Expected one selection.json, maximum 5 MB.');
                $selection=$zip->getFromIndex($i,5*1024*1024+1);
            }
        }
        if($selection===null) fail('The ZIP must contain selection.json. Export a complete IcoMoon project.');
        return parse_selection($selection);
    } finally { $zip->close(); }
}
function media_icons($ids) {
    $ids=array_values(array_unique(array_map('absint',(array)$ids)));
    if(!$ids || count($ids)>300) fail('Choose between 1 and 300 SVG files.');
    $icons=[];
    foreach($ids as $id) {
        if(get_post_type($id)!=='attachment' || get_post_mime_type($id)!=='image/svg+xml' || !current_user_can('edit_post',$id)) fail('Only accessible SVG attachments can be added.');
        $file=get_attached_file($id);
        $uploads=wp_get_upload_dir();$real=realpath($file);$base=realpath($uploads['basedir']);
        if(!$real || !$base || !str_starts_with($real,$base.DIRECTORY_SEPARATOR) || filesize($real)>262144) fail('Invalid attachment file.');
        $icons['media-'.$id]=['label'=>get_the_title($id),'svg'=>sanitize_svg(file_get_contents($real)),'attachmentId'=>$id];
    }
    return $icons;
}
function save_set($name,$icons,$slug='') {
    $name=sanitize_text_field($name);$slug=$slug?sanitize_title($slug):key_name($name);
    if(!$name || !$slug || strlen($slug)>80) fail('Enter a short set name.');
    $all=sets();
    if(!isset($all[$slug]) && count($all)>=30) fail('Maximum 30 icon sets.');
    $ids=get_option(IDS_OPTION,[]);
    foreach($icons as $key=>&$icon) {
        $icon['value']=$all[$slug]['icons'][$key]['value']??$ids[$slug][$key]??$icon['value']??'custom:'.$slug.':'.$key;
        $ids[$slug][$key]=$icon['value'];
    }
    unset($icon);
    $all[$slug]=['name'=>$name,'icons'=>$icons];
    if(strlen(wp_json_encode($all))>8*1024*1024) fail('Total icon library limit is 8 MB.');
    update_option(OPTION,$all,false);
    update_option(IDS_OPTION,$ids,false);
    return $slug;
}
