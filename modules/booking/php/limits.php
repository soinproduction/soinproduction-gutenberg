<?php
namespace SiteTheme\Booking;
defined('ABSPATH') || exit;

function rate_key($identity,$seconds){
    $window=(int)floor(time()/$seconds);
    return '_site_booking_rate_'.($window*$seconds+$seconds).'_'.hash('sha256',$identity);
}
function rate_limit($identity,$limit,$seconds){
    global $wpdb;$key=rate_key($identity,$seconds);
    add_option($key,'0','','no');
    $changed=$wpdb->query($wpdb->prepare("UPDATE {$wpdb->options} SET option_value=CAST(option_value AS UNSIGNED)+1 WHERE option_name=%s AND CAST(option_value AS UNSIGNED)<%d",$key,$limit));
    wp_cache_delete($key,'options');
    return $changed===1;
}
/** Returns one unit of the current window to a caller whose work did not happen. */
function rate_release($identity,$seconds){
    global $wpdb;$key=rate_key($identity,$seconds);
    $wpdb->query($wpdb->prepare("UPDATE {$wpdb->options} SET option_value=CAST(option_value AS UNSIGNED)-1 WHERE option_name=%s AND CAST(option_value AS UNSIGNED)>0",$key));
    wp_cache_delete($key,'options');
}
function prune_rate_limits(){
    global $wpdb;
    foreach($wpdb->get_col("SELECT option_name FROM {$wpdb->options} WHERE option_name LIKE '\\_site\\_booking\\_rate\\_%'") as $key)if(preg_match('/^_site_booking_rate_(\d+)_/',$key,$match) && (int)$match[1]<time())delete_option($key);
}
add_action('init',function(){if(!wp_next_scheduled('site_booking_prune_limits'))wp_schedule_event(time()+3600,'daily','site_booking_prune_limits');});
add_action('site_booking_prune_limits',__NAMESPACE__.'\\prune_rate_limits');
