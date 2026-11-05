<?php
namespace SiteTheme\Booking;
defined('ABSPATH') || exit;

const CLIENT_SIGNATURE_WINDOW=60;
const CLIENT_DAILY_BOOKINGS=5;
const PUBLIC_HOURLY_BOOKINGS=30;

/** Next signs the visitor IP; the key is derived so it never equals the preview signing key. */
function client_signing_key(){
    $secret=(string)config('signing_secret');
    return strlen($secret)>=32 ? hash_hmac('sha256','booking-client-ip',$secret) : '';
}
function client_ip($request){
    $ip=(string)$request->get_header('x-site-client-ip');$time=(string)$request->get_header('x-site-client-time');$key=client_signing_key();
    if($key && filter_var($ip,FILTER_VALIDATE_IP) && ctype_digit($time) && abs(time()-(int)$time)<=CLIENT_SIGNATURE_WINDOW && hash_equals(hash_hmac('sha256',$time.':'.$ip,$key),(string)$request->get_header('x-site-client-signature')))return $ip;
    return (string)($_SERVER['REMOTE_ADDR'] ?? '');
}
function public_ip($ip){return (bool)filter_var($ip,FILTER_VALIDATE_IP,FILTER_FLAG_NO_PRIV_RANGE|FILTER_FLAG_NO_RES_RANGE);}

function site_config($name){
    return defined($name) ? (string)constant($name) : (string)(getenv($name) ?: '');
}
function turnstile_site_key(){
    return site_config('SITE_TURNSTILE_SECRET') ? site_config('SITE_TURNSTILE_SITE_KEY') : '';
}
/** Rotating proxies defeat IP limits, so a configured challenge is required and fails closed. */
function turnstile_passed($token,$ip){
    $secret=site_config('SITE_TURNSTILE_SECRET');
    if(!$secret || !site_config('SITE_TURNSTILE_SITE_KEY'))return true;
    if(!is_string($token) || $token==='' || strlen($token)>2048)return false;
    $response=wp_safe_remote_post('https://challenges.cloudflare.com/turnstile/v0/siteverify',['timeout'=>8,'redirection'=>0,'body'=>['secret'=>$secret,'response'=>$token]+(public_ip($ip)?['remoteip'=>$ip]:[])]);
    if(is_wp_error($response) || wp_remote_retrieve_response_code($response)!==200)return false;
    $result=json_decode(wp_remote_retrieve_body($response),true);
    $host=(string)wp_parse_url((string)config('frontend_url'),PHP_URL_HOST);
    return !empty($result['success']) && ($result['action'] ?? '')==='form-submit' && (!$host || strtolower($result['hostname'] ?? '')===strtolower($host));
}
function slots_taken($start,$hours){
    global $wpdb;$utc=$start->setTimezone(new \DateTimeZone('UTC'));
    return (bool)$wpdb->get_var($wpdb->prepare('SELECT 1 FROM '.table('slots').' WHERE hall_id=1 AND starts_at>=%s AND starts_at<%s LIMIT 1',$utc->format('Y-m-d H:i:s'),$utc->modify('+'.$hours.' hours')->format('Y-m-d H:i:s')));
}
function unpaid_bookings($phone){
    global $wpdb;
    return (int)$wpdb->get_var($wpdb->prepare('SELECT COUNT(*) FROM '.table('bookings').' b INNER JOIN '.table('clients')." c ON c.id=b.client_id WHERE c.phone=%s AND b.status='confirmed' AND b.payment_mode='unpaid' AND b.cancelled_at IS NULL AND b.ends_at>UTC_TIMESTAMP()",$phone));
}
/** Circuit breaker for distributed floods: the group hears about it once an hour, not per request. */
function public_booking_breaker(){
    if(rate_limit('booking-created:all',(int)apply_filters('site_booking_public_hourly_limit',PUBLIC_HOURLY_BOOKINGS),HOUR_IN_SECONDS))return true;
    $chat=notification_settings()['admin_chat'];
    if($chat)queue_notice('telegram',$chat,t('Спрацював запобіжник: забагато онлайн-бронювань за годину. Нові бронювання із сайту тимчасово відхиляються, перевірте календар.'),'breaker:'.$chat.':'.gmdate('YmdH'));
    error_log('[site-booking] public booking breaker tripped');
    return false;
}
/** Group administrators are never throttled; everyone else shares per-account budgets. */
function telegram_update_allowed($update){
    $source=$update['callback_query'] ?? $update['message'] ?? [];
    if(!empty($source['from']['is_bot']))return false;
    $chat=(string)($update['callback_query']['message']['chat']['id'] ?? $update['message']['chat']['id'] ?? '');
    $admin=(string)notification_settings()['admin_chat'];
    if($chat && $chat===$admin)return true;
    $user=(string)($source['from']['id'] ?? $chat);
    return rate_limit('telegram:'.$user,30,MINUTE_IN_SECONDS) && rate_limit('telegram-hour:'.$user,300,HOUR_IN_SECONDS);
}
