<?php
namespace SiteTheme;
defined('ABSPATH') || exit;
function sanitize_archive_pages($input) {
    $result = []; $used = [];
    foreach (archive_types() as $type => $object) {
        $id = absint($input[$type] ?? 0);
        if (!$id) continue;
        $page = get_post($id);
        if (!$page || $page->post_type !== 'page' || $page->post_status !== 'publish' || $page->post_password || $id === (int)get_option('page_on_front') || isset($used[$id])) {
            add_settings_error('site_archive_pages', 'invalid_archive', 'Choose a different published page for each archive. The homepage cannot be an archive.');
            return (array)get_option('site_archive_pages', []);
        }
        $result[$type] = $id; $used[$id] = true;
    }
    return $result;
}
add_action('admin_init', function() {
    register_setting('site_routing', 'site_archive_pages', ['type'=>'array', 'sanitize_callback'=>__NAMESPACE__.'\\sanitize_archive_pages', 'default'=>[]]);
});
add_action('admin_menu', function() {
    add_options_page('Archive pages', 'Archive pages', 'manage_options', 'site-archives', __NAMESPACE__.'\\archive_options_page');
});
function archive_options_page() {
    if (!current_user_can('manage_options')) return;
    $selected = (array)get_option('site_archive_pages', []);
    echo '<div class="wrap sp-ui-page">';
    \SpAdminUI\page_header('Archive pages','Choose a page for each content archive. Its slug and parent pages define the public URLs.','SITE / ROUTING');
    settings_errors('site_archive_pages');
    echo '<form action="options.php" method="post">'; settings_fields('site_routing');
    echo '<section class="sp-ui-card"><h2>Content archives</h2><table class="form-table" role="presentation"><tbody>';
    foreach (archive_types() as $type => $object) {
        echo '<tr><th scope="row"><label for="archive-'.esc_attr($type).'">'.esc_html($object->labels->name).'</label></th><td>';
        wp_dropdown_pages(['name'=>'site_archive_pages['.$type.']', 'id'=>'archive-'.$type, 'selected'=>$selected[$type]??0, 'show_option_none'=>'No archive page — use native URLs', 'option_none_value'=>'0', 'post_status'=>'publish', 'exclude'=>(int)get_option('page_on_front')]);
        $page = archive_pages()[$type] ?? null;
        if ($page) echo '<p class="description"><a href="'.esc_url(get_edit_post_link($page->ID)).'">Edit page</a> · '.esc_html(get_permalink($page)).'<br>Entry URL: '.esc_html(untrailingslashit(get_permalink($page)).'/{entry-slug}').'</p>';
        echo '</td></tr>';
    }
    echo '</tbody></table></section><div class="sp-ui-savebar">'; submit_button('Save archive pages'); echo '</div></form></div>';
}
