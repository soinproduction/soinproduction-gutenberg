<?php
namespace SiteTheme;
defined('ABSPATH') || exit;

const SITE_PART_POST_TYPE = 'site_part';

/** Shared layouts edited through Appearance, never coupled to a project name. */
function site_parts() {
    return ['header' => 'Header', 'footer' => 'Footer', 'cookies' => 'Cookies'];
}

function site_part($slug) {
    return get_page_by_path($slug, OBJECT, SITE_PART_POST_TYPE);
}

add_action('init', function () {
    register_post_type(SITE_PART_POST_TYPE, [
        'labels' => ['name' => 'Site parts', 'singular_name' => 'Site part'],
        'public' => false,
        'show_ui' => true,
        'show_in_menu' => false,
        'show_in_rest' => true,
        'supports' => ['title', 'editor', 'revisions', 'custom-fields'],
    ]);
});
