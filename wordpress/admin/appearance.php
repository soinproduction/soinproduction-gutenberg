<?php
namespace SiteTheme;
defined('ABSPATH') || exit;

function appearance_part($post) {
    return $post && $post->post_type === SITE_PART_POST_TYPE && isset(site_parts()[$post->post_name]);
}

add_action('admin_menu', function () {
    foreach (site_parts() as $slug => $label) {
        $part = site_part($slug);
        if ($part) add_submenu_page('themes.php', $label, $label, 'edit_theme_options', get_edit_post_link($part->ID, 'raw'));
    }
    $error = get_page_by_path('not-found', OBJECT, 'page');
    if ($error) add_submenu_page('themes.php', '404 page', '404 page', 'edit_theme_options', get_edit_post_link($error->ID, 'raw'));
});
add_filter('parent_file', function ($parent) {
    global $post;
    return appearance_part($post) ? 'themes.php' : $parent;
});
add_filter('submenu_file', function ($submenu) {
    global $post;
    return appearance_part($post) ? get_edit_post_link($post->ID, 'raw') : $submenu;
});
