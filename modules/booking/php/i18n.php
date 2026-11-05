<?php
namespace SiteTheme\Booking;
defined('ABSPATH') || exit;

/** Ukrainian source text is the message id; languages/<code>.json only lists translations. */
function languages(){
    return array_map(fn($file)=>basename($file,'.json'),glob(dirname(__DIR__).'/languages/*.json'));
}
function language(){
    $saved=(array)get_option('site_booking_settings',[]);
    return $saved['language'] ?? (config('language') ?: 'uk');
}
function dictionary($code=null){
    static $loaded=[];$code=$code ?? language();
    if(!isset($loaded[$code])){
        $file=dirname(__DIR__).'/languages/'.basename($code).'.json';
        $loaded[$code]=is_file($file)?(json_decode(file_get_contents($file),true) ?: []):[];
    }
    return $loaded[$code];
}
function t($text,...$args){
    $message=dictionary()['messages'][$text] ?? $text;
    return $args?vsprintf($message,$args):$message;
}
function form_text(){
    return array_replace(dictionary('uk')['form'] ?? [],dictionary()['form'] ?? []);
}
