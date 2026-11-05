<?php
namespace FormEngine;
defined('ABSPATH') || exit;
/** Read-only entry presentation. Delivery mutations remain in the secured retry handler. */
function entry_screen() {
    add_action('admin_enqueue_scripts', function() {
        $screen = get_current_screen();
        if (!$screen || !in_array($screen->base, ['post','edit'], true) || $screen->post_type !== config('entry_type')) return;
        $file = __DIR__.'/admin.css';
        wp_register_style('form-engine-entry', false, [], filemtime($file));
        wp_enqueue_style('form-engine-entry');
        wp_add_inline_style('form-engine-entry', file_get_contents($file));
    });
    add_filter('admin_body_class', function($classes) {
        $screen = get_current_screen();
        return $screen && in_array($screen->base, ['post','edit'], true) && $screen->post_type === config('entry_type') ? $classes.($screen->base === 'post' ? ' fe-entry-screen' : ' fe-entry-list') : $classes;
    });
    entry_list();
    add_action('add_meta_boxes_'.config('entry_type'), function() {
        add_meta_box('form-entry', 'Entry details', __NAMESPACE__.'\\render_entry', config('entry_type'), 'normal', 'high');
    });
}
function entry_icon($name) {
    return '<span class="dashicons dashicons-'.esc_attr($name).'" aria-hidden="true"></span>';
}
function render_entry($post) {
    $form_id = (int)get_post_meta($post->ID, '_form_engine_form_id', true);
    $form = get_post($form_id);
    $form_title = $form ? $form->post_title : 'Deleted form';
    $fields = get_post_meta($post->ID, '_form_engine_fields', true);
    $states = get_post_meta($post->ID, '_form_engine_delivery', true);
    $fields = is_array($fields) ? $fields : [];
    $states = is_array($states) ? $states : [];
    $failed = (bool)array_filter($states, fn($state) => ($state['status'] ?? '') === 'failed');
    $back = admin_url('edit.php?post_type='.config('entry_type'));
    echo '<div class="fe-entry"><a class="fe-entry-back" href="'.esc_url($back).'">'.entry_icon('arrow-left-alt').'All entries</a>';
    echo '<header class="fe-entry-heading"><div><div class="fe-entry-kicker">FORM SUBMISSION <span>#'.(int)$post->ID.'</span></div><h2>'.esc_html($form_title).'</h2><p>'.entry_icon('calendar-alt').esc_html(get_post_time('M j, Y · H:i', false, $post)).'</p></div><span class="fe-entry-saved">'.entry_icon('yes-alt').'Entry saved</span></header>';
    echo '<div class="fe-entry-grid"><section class="fe-entry-card"><header><div class="fe-entry-card-icon">'.entry_icon('feedback').'</div><div><h3>Submitted information</h3><p>Values received with this submission</p></div><span class="fe-entry-count">'.count($fields).'</span></header><dl class="fe-entry-fields">';
    foreach ($fields as $key => $field) {
        $value = $field['value'] ?? '';
        $value = is_bool($value) ? ($value ? 'Yes' : 'No') : (is_scalar($value) ? (string)$value : wp_json_encode($value));
        echo '<div class="fe-entry-field"><dt>'.esc_html($field['label'] ?? (string)$key).'</dt><dd'.($value === '' ? ' class="is-empty"' : '').'>'.($value === '' ? '—' : nl2br(esc_html($value))).'</dd></div>';
    }
    if (!$fields) echo '<div class="fe-entry-empty"><p>No field values were recorded.</p></div>';
    echo '</dl></section><aside class="fe-entry-card fe-entry-delivery"><header><div class="fe-entry-card-icon">'.entry_icon('upload').'</div><div><h3>Delivery</h3><p>Notification channels</p></div></header>';
    if (!$states) {
        echo '<div class="fe-entry-empty"><span class="fe-entry-empty-icon">'.entry_icon('email-alt').'</span><h4>No delivery records</h4><p>No channel status was recorded for this entry.</p></div>';
    } else {
        $channels = ['email' => ['Email', 'email-alt'], 'webhook' => ['Webhook', 'admin-links'], 'telegram' => ['Telegram', 'format-chat']];
        $labels = delivery_status_labels();
        foreach ($states as $channel => $state) {
            $info = $channels[$channel] ?? [ucfirst($channel), 'admin-links'];
            $status = $state['status'] ?? '';
            $known = isset($labels[$status]);
            echo '<div class="fe-entry-channel"><div class="fe-entry-channel-title">'.entry_icon($info[1]).'<strong>'.esc_html($info[0]).'</strong><span class="fe-entry-status is-'.esc_attr($known ? $status : 'unknown').'">'.esc_html($labels[$status] ?? 'Not recorded').'</span></div><p>Attempts <strong>'.absint($state['attempts'] ?? 0).'</strong>';
            if (!empty($state['updated'])) echo '<span>Updated '.esc_html(wp_date('M j · H:i', (int)$state['updated'])).'</span>';
            echo '</p></div>';
        }
    }
    if ($failed) {
        $url = wp_nonce_url(admin_url('admin-post.php?action=form_engine_retry&entry='.$post->ID), 'form_engine_retry_'.$post->ID);
        echo '<div class="fe-entry-retry"><p>Retry failed channels after checking their settings.</p><a class="button button-primary" href="'.esc_url($url).'">'.entry_icon('update').'Retry failed channels</a></div>';
    }
    if ($form && current_user_can('edit_post', $form_id)) echo '<footer class="fe-entry-card-footer"><a href="'.esc_url(get_edit_post_link($form_id, 'raw')).'">Form settings'.entry_icon('arrow-right-alt').'</a></footer>';
    echo '</aside></div></div>';
}
/** Summaries are derived from existing entry metadata; no migration or duplicate storage. */
function delivery_status_labels() {
    return ['accepted' => 'Accepted', 'queued' => 'Queued', 'failed' => 'Failed'];
}
function entry_contact($entry_id) {
    $fields = get_post_meta($entry_id, '_form_engine_fields', true);
    $form_id = (int)get_post_meta($entry_id, '_form_engine_form_id', true);
    static $types = [];
    if (!isset($types[$form_id])) {
        $form = get_post($form_id);
        $types[$form_id] = $form ? array_column(definition($form)['fields'] ?? [], 'type', 'id') : [];
    }
    $contact = ['name' => '', 'phone' => ''];
    $first = $last = '';
    foreach (is_array($fields) ? $fields : [] as $field) {
        if (!is_scalar($field['value'] ?? null) || is_bool($field['value'])) continue;
        $value = trim((string)$field['value']);
        if ($value === '') continue;
        $key = (string)($field['id'] ?? '');
        $label = trim((string)($field['label'] ?? ''));
        $type = $types[$form_id][$key] ?? '';
        if (!$contact['phone'] && ($type === 'tel' || preg_match('/(?:^|[_\s-])(?:phone|tel|mobile)(?:$|[_\s-])|телефон|мобільн|мобильн/iu', $key.' '.$label))) $contact['phone'] = $value;
        if (preg_match('/^(?:first[_-]?name|given[_-]?name)$/i', $key)) $first = $value;
        elseif (preg_match('/^(?:last[_-]?name|surname|family[_-]?name)$/i', $key)) $last = $value;
        elseif (!$contact['name'] && (preg_match('/^(?:name|full[_-]?name|your[_-]?name|contact[_-]?name)$/i', $key) || preg_match('/^(?:(?:your|full|contact)\s+)?name$|ім[’\x{0027}]?я|имя/iu', $label))) $contact['name'] = $value;
    }
    if (!$contact['name']) $contact['name'] = trim($first.' '.$last);
    return $contact;
}
function entry_delivery_summary($states) {
    if (!is_array($states) || !$states) return ['status' => 'unknown', 'label' => 'Not recorded', 'details' => 'No delivery history'];
    $labels = delivery_status_labels();
    $statuses = array_column($states, 'status');
    $status = in_array('failed', $statuses, true) ? 'failed' : (in_array('queued', $statuses, true) ? 'queued' : (count(array_filter($statuses, fn($s) => $s === 'accepted')) === count($states) ? 'accepted' : 'unknown'));
    $details = [];
    foreach ($states as $channel => $state) $details[] = ucfirst($channel).': '.($labels[$state['status'] ?? ''] ?? 'Not recorded');
    return ['status' => $status, 'label' => $labels[$status] ?? 'Not recorded', 'details' => implode(' · ', $details)];
}
function entry_list() {
    $type = config('entry_type');
    add_filter('manage_'.$type.'_posts_columns', fn($columns) => [
        'cb' => $columns['cb'] ?? '<input type="checkbox" />',
        'title' => 'Entry', 'fe_form' => 'Form', 'fe_name' => 'Name', 'fe_phone' => 'Phone', 'fe_received' => 'Received', 'fe_delivery' => 'Delivery',
    ]);
    add_action('current_screen', function($screen) use ($type) {
        if ($screen->base !== 'edit' || $screen->post_type !== $type) return;
        add_filter('the_title', fn($title, $id) => get_post_type($id) === $type ? '#'.$id : $title, 10, 2);
    });
    add_action('manage_'.$type.'_posts_custom_column', function($column, $id) {
        if ($column === 'fe_form') {
            $form_id = (int)get_post_meta($id, '_form_engine_form_id', true);
            $form = get_post($form_id);
            echo $form ? '<span class="fe-list-form">'.esc_html($form->post_title).'</span>' : '<span class="fe-list-muted">Deleted form</span>';
        } elseif ($column === 'fe_name' || $column === 'fe_phone') {
            $contact = entry_contact($id);
            $value = $contact[$column === 'fe_name' ? 'name' : 'phone'];
            if ($column === 'fe_phone' && $value && preg_match('/^\+?[0-9\s().-]+$/', $value)) echo '<a class="fe-list-phone" href="tel:'.esc_attr(preg_replace('/[^+0-9]/', '', $value)).'">'.esc_html($value).'</a>';
            else echo $value !== '' ? esc_html($value) : '<span class="fe-list-muted">—</span>';
        } elseif ($column === 'fe_received') {
            echo '<time datetime="'.esc_attr(get_post_time('c', false, $id)).'">'.esc_html(get_post_time('M j, Y', false, $id)).'<span class="fe-list-time">'.esc_html(get_post_time('H:i', false, $id)).'</span></time>';
        } elseif ($column === 'fe_delivery') {
            $summary = entry_delivery_summary(get_post_meta($id, '_form_engine_delivery', true));
            echo '<span class="fe-entry-status is-'.esc_attr($summary['status']).'">'.esc_html($summary['label']).'</span><span class="fe-list-delivery-details">'.esc_html($summary['details']).'</span>';
        }
    }, 10, 2);
    add_filter('manage_edit-'.$type.'_sortable_columns', function($columns) {
        unset($columns['title']);
        return array_merge($columns, ['fe_received' => 'date']);
    });
    add_filter('display_post_states', function($states, $post) use ($type) {
        if ($post->post_type === $type) unset($states['private']);
        return $states;
    }, 10, 2);
    add_action('restrict_manage_posts', function($post_type, $which) use ($type) {
        if ($post_type !== $type || $which !== 'top') return;
        $selected = absint($_GET['fe_form'] ?? 0);
        $forms = get_posts(['post_type' => config('post_type'), 'post_status' => ['publish','draft','private','pending','future'], 'numberposts' => -1, 'orderby' => 'title', 'order' => 'ASC']);
        echo '<label class="screen-reader-text" for="fe-form-filter">Filter by form</label><select name="fe_form" id="fe-form-filter"><option value="0">All forms</option>';
        foreach ($forms as $form) echo '<option value="'.(int)$form->ID.'" '.selected($selected, $form->ID, false).'>'.esc_html($form->post_title).'</option>';
        echo '</select>';
        $status = sanitize_key($_GET['fe_delivery'] ?? '');
        echo '<label class="screen-reader-text" for="fe-delivery-filter">Filter by delivery status</label><select name="fe_delivery" id="fe-delivery-filter"><option value="">All delivery statuses</option>';
        foreach (array_merge(delivery_status_labels(), ['unknown' => 'Not recorded']) as $value => $label) echo '<option value="'.esc_attr($value).'" '.selected($status, $value, false).'>'.esc_html($label).'</option>';
        echo '</select>';
    }, 10, 2);
    add_filter('posts_search', fn($sql, $query) => $query->get('fe_contact_search') ? '' : $sql, 10, 2);
    add_action('pre_get_posts', function($query) use ($type) {
        if (!is_admin() || !$query->is_main_query() || $query->get('post_type') !== $type) return;
        $form_id = absint($_GET['fe_form'] ?? 0);
        if ($form_id) {
            $meta = $query->get('meta_query') ?: [];
            $query->set('meta_query', ['relation' => 'AND', $meta, ['key' => '_form_engine_form_id', 'value' => $form_id, 'compare' => '=', 'type' => 'NUMERIC']]);
        }
        $search = trim((string)$query->get('s'));
        $status = sanitize_key($_GET['fe_delivery'] ?? '');
        if (!in_array($status, ['accepted','queued','failed','unknown'], true)) $status = '';
        if ($search === '' && $status === '') return;
        $ids = matching_entries($query->query_vars, $search, $status);
        $query->set('post__in', $ids ?: [0]);
        $query->set('fe_contact_search', true);

    });
}

/** Search decoded snapshots in bounded batches, preserving exact contact/status semantics. */
function matching_entries($query_vars, $search = '', $status = '') {
    $args = array_merge($query_vars, ['s' => '', 'posts_per_page' => 200, 'paged' => 1, 'offset' => 0, 'fields' => 'ids', 'no_found_rows' => true, 'orderby' => 'ID', 'order' => 'ASC', 'cache_results' => false]);
    unset($args['fe_contact_search']);
    $matches = [];
    do {
        $ids = (new \WP_Query($args))->posts;
        update_meta_cache('post', $ids);
        foreach ($ids as $id) {
            if ($status && entry_delivery_summary(get_post_meta($id, '_form_engine_delivery', true))['status'] !== $status) continue;
            if ($search !== '' && !entry_matches_contact($id, $search)) continue;
            $matches[] = $id;
        }
        $args['offset'] += 200;
    } while (count($ids) === 200);
    return $matches;
}
function entry_matches_contact($id, $search) {
    $contact = entry_contact($id);
    if (mb_stripos($contact['name'], $search, 0, 'UTF-8') !== false) return true;
    $digits = preg_replace('/\D/', '', $search);
    return $digits !== '' && preg_match('/^[+\d\s().-]+$/', $search) && str_contains(preg_replace('/\D/', '', $contact['phone']), $digits);
}
