<?php
namespace SiteTheme;
defined('ABSPATH') || exit;

function kit_config(): array {
	static $config;
	if ($config !== null) return $config;
	$file = function_exists('get_theme_file_path') ? get_theme_file_path('frontend/kit.config.json') : dirname(__DIR__, 2) . '/kit.config.json';
	return $config = is_readable($file) ? (json_decode((string)file_get_contents($file), true) ?: []) : [];
}

add_filter('sp_admin_ui_assets_url', fn() => get_theme_file_uri('build/admin-ui'));
add_filter('sp_admin_ui_screen', function ($enabled, $screen) {
	$extra = kit_config()['adminUi'] ?? [];
	$screens = array_merge(['media_page_sp-icons', 'media_page_sp-uploads-webp-convert', 'toplevel_page_site-settings', 'settings_page_site-archives'], $extra['screens'] ?? []);
	$types = array_merge([SITE_PART_POST_TYPE, 'service', 'tariff', 'faq', 'review', 'site_modal', 'site_form', 'site_entry'], $extra['postTypes'] ?? []);
	return $enabled || in_array($screen->id, $screens, true)
		|| ($screen->base === 'post' && in_array($screen->post_type, ['page', 'post'], true))
		|| in_array($screen->post_type, $types, true);
}, 10, 2);

add_filter('sp_icons_assets_url', fn() => get_theme_file_uri('build/icons'));
add_filter('sp_webp_assets_url', fn() => get_theme_file_uri('build/webp-uploads'));
add_filter('sp_webp_valid_replacement_svg', fn($valid, $file) => valid_logo_svg($file), 10, 2);
add_filter('sp_admin_module_assets_url', fn($url, $module) => get_theme_file_uri('build/admin-modules/' . $module), 10, 2);

require_once dirname(__DIR__) . '/core/media/universal/bootstrap.php';

if (function_exists('\\SiteTheme\\Booking\\boot')) {
	$booking = kit_config()['booking'] ?? [];
	\SiteTheme\Booking\boot([
		'timezone'        => $booking['timezone'] ?? 'Europe/Kyiv',
		'timezone_label'  => $booking['timezoneLabel'] ?? 'Київ',
		'phone_code'      => (string)($booking['phoneCode'] ?? '380'),
		'phone_digits'    => (int)($booking['phoneDigits'] ?? 9),
		'assets_url'      => get_theme_file_uri('build/booking'),
		'assets_path'     => get_theme_file_path('build/booking'),
		'signing_secret'  => defined('SITE_PREVIEW_SECRET') ? SITE_PREVIEW_SECRET : '',
		'frontend_url'    => defined('SITE_FRONTEND_URL') ? frontend_origin() : '',
		'blocks'          => __NAMESPACE__ . '\\blocks',
	]);
}

if (function_exists('\\FormEngine\\boot')) {
	$forms = kit_config()['forms'] ?? [];
	\FormEngine\boot([
		'post_type'  => $forms['postType'] ?? 'site_form',
		'entry_type' => $forms['entryType'] ?? 'site_entry',
		'block'      => $forms['block'] ?? 'site/form-builder',
		'modal_type' => $forms['modalType'] ?? 'site_modal',
	]);
	if (!function_exists(__NAMESPACE__ . '\\form_definition')) {
		function form_definition($post) { return \FormEngine\definition($post); }
	}
	if (!function_exists(__NAMESPACE__ . '\\form_records')) {
		function form_records() {
			return array_map(fn($post) => ['id' => $post->ID, 'title' => $post->post_title, 'data' => form_definition($post)], array_values(array_filter(published('site_form'), fn($post) => !$post->post_password)));
		}
	}
}
