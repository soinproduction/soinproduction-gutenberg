<?php
namespace SiteTheme\Booking;
defined('ABSPATH') || exit;

/** Host settings: timezone, timezone_label, phone_code, phone_digits, assets_url, assets_path, signing_secret, frontend_url, blocks. */
function boot($config) {
    $GLOBALS['site_booking_config']=$config;
}
function config($key) {
    return $GLOBALS['site_booking_config'][$key] ?? null;
}
function zone() {
    return new \DateTimeZone(config('timezone') ?: wp_timezone_string());
}

require_once __DIR__.'/php/i18n.php';
require_once __DIR__.'/php/limits.php';
require_once __DIR__.'/php/tariffs.php';
require_once __DIR__.'/php/storage.php';
require_once __DIR__.'/php/identity.php';
require_once __DIR__.'/php/client-context.php';
require_once __DIR__.'/php/service.php';
require_once __DIR__.'/php/admin.php';
require_once __DIR__.'/php/api.php';
require_once __DIR__.'/php/widget.php';
require_once __DIR__.'/php/tariff-admin.php';
require_once __DIR__.'/php/notifications.php';
require_once __DIR__.'/php/telegram-moderation.php';
require_once __DIR__.'/php/telegram-client.php';
require_once __DIR__.'/php/telegram-topics.php';
require_once __DIR__.'/php/telegram-support.php';
require_once __DIR__.'/php/booking-chat.php';
require_once __DIR__.'/php/notification-admin.php';

// Capabilities must exist before WordPress builds and checks the admin menu.
add_action('init', function() { if (is_admin()) install(); }, 20);

require_once __DIR__.'/php/history.php';
require_once __DIR__.'/php/lifecycle.php';
