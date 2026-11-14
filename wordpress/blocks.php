<?php
namespace SiteTheme;
defined('ABSPATH') || exit;
/** Sections describe themselves in section.json; adding a folder is enough on the PHP side. */
function section_modules(){
 return array_map(function($file){
  $meta=json_decode(file_get_contents($file),true);
  return ['id'=>$meta['slug'],'name'=>'site/'.$meta['slug'],'title'=>$meta['title'],'icon'=>$meta['icon']??'layout','group'=>'custom','kind'=>'section','attributes'=>['data'=>['type'=>'object','default'=>new \stdClass()]]];
 },glob((function_exists('get_theme_file_path')?get_theme_file_path('frontend/src/sections'):dirname(__DIR__,2).'/src/sections').'/section-*/section.json'));
}
function theme_blocks(){return component_modules();}
function component_modules(){
 static $modules;
 return $modules ??= [...require get_theme_file_path('frontend/kit/generated/blocks.php'), ...section_modules()];
}
add_action('init',function(){
 foreach(component_modules() as $module)register_block_type($module['name'],[
  'api_version'=>3,'title'=>$module['title'],'icon'=>$module['icon']??'layout','category'=>'site','attributes'=>$module['attributes'],
  'editor_script'=>'site-editor','style'=>(!is_admin()&&render_mode()==='wordpress'?[]:'site-content'),'editor_style'=>'site-editor-ui','supports'=>['html'=>false],
  ...(!empty($module['parent']) ? ['parent'=>$module['parent']] : []),
  'render_callback'=>__NAMESPACE__.'\\render_portable_block',
 ]);
},20);
