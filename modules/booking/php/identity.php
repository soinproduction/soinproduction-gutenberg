<?php
namespace SiteTheme\Booking;
defined('ABSPATH') || exit;

/** Resolve booking-specific contact snapshots in one query, without renaming shared clients. */
function booking_identities($rows){
    global $wpdb;if(!$rows)return $rows;
    $ids=array_map(fn($row)=>(int)$row->id,$rows);$profiles=[];
    $events=$wpdb->get_results('SELECT booking_id,payload FROM '.table('events')." WHERE action='created' AND booking_id IN (".implode(',',$ids).') ORDER BY id');
    foreach($events as $event)if(!isset($profiles[$event->booking_id]))$profiles[$event->booking_id]=json_decode($event->payload,true) ?: [];
    foreach($rows as $row){$profile=$profiles[$row->id] ?? [];foreach(['name','phone','handle'] as $key)if(!empty($profile[$key]))$row->$key=$profile[$key];}
    return $rows;
}
function booking_telegram_profile($id){
    global $wpdb;$profile=$wpdb->get_row($wpdb->prepare('SELECT chat_id,username,first_name,last_name FROM '.table('telegram_links').' WHERE booking_id=%d',$id),ARRAY_A) ?: [];
    $linked=!empty($profile['chat_id']);$username=$linked?($profile['username'] ?? ''):'';
    return ['linked'=>$linked,'username'=>$username,'name'=>$linked?trim(($profile['first_name'] ?? '').' '.($profile['last_name'] ?? '')):'','url'=>$username?'https://t.me/'.rawurlencode($username):''];
}
function save_telegram_profile($chat,$profile){
    global $wpdb;
    $username=(string)($profile['username'] ?? '');if(!preg_match('/^[a-zA-Z0-9_]{1,32}$/D',$username))$username='';
    $wpdb->update(table('telegram_links'),['username'=>$username,'first_name'=>mb_substr(sanitize_text_field($profile['first_name'] ?? ''),0,100),'last_name'=>mb_substr(sanitize_text_field($profile['last_name'] ?? ''),0,100)],['chat_id'=>(string)$chat]);
}
