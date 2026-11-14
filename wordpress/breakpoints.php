<?php
namespace SiteTheme;
defined('ABSPATH') || exit;
/** The theme supplies thresholds; consumers never duplicate them. */
function breakpoint_config(): array {
 static $config;
 if($config!==null)return $config;
 $data=json_decode(file_get_contents((function_exists('get_theme_file_path')?get_theme_file_path('frontend/config/breakpoints.json'):dirname(__DIR__,2).'/config/breakpoints.json')),true,512,JSON_THROW_ON_ERROR);
 foreach(['breakpoints'] as $group){
  $previous=0;
  if(empty($data[$group]))throw new \RuntimeException('Missing breakpoint group: '.$group);
  foreach($data[$group] as $name=>$value){
   if(!preg_match('/^(?:[a-z][a-z0-9-]*|2xl)$/',$name)||!is_numeric($value)||$value<=$previous)throw new \RuntimeException('Invalid breakpoint: '.$name);
   $previous=$value;
  }
 }
 return $config=$data;
}
function breakpoints(): array {return breakpoint_config()['breakpoints'];}
/** Named role from `media` in breakpoints.json, such as the breakpoint where Drag grid columns stop stacking. */
function breakpoint_media(string $role): string {
 $name=breakpoint_config()['media'][$role]??'';
 if(!isset(breakpoints()[$name]))throw new \InvalidArgumentException('Unknown breakpoint role: '.$role);
 return $name;
}
/** Breakpoints of Drag grid layouts: `layoutIgnore` ones do not split the screen ranges. */
function layout_breakpoints(): array {
 return array_values(array_filter(array_keys(breakpoints()),fn($name)=>!in_array($name,breakpoint_config()['layoutIgnore']??[],true)));
}
function breakpoint(string $name): float {
 $values=breakpoints();
 if(!isset($values[$name]))throw new \InvalidArgumentException('Unknown breakpoint: '.$name);
 return (float)$values[$name];
}
function media_up(string $name): string {return '(width >= '.(breakpoint($name)/16).'rem)';}
function media_down(string $name): string {return '(width < '.(breakpoint($name)/16).'rem)';}
function media_between(string $from,string $to): string {return media_up($from).' and '.media_down($to);}
