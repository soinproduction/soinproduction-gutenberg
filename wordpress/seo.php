<?php
namespace SiteTheme;
defined('ABSPATH') || exit;

/** Scope the query adapter to Rank Math's official headless callback. */
$seo_head_url = null;
add_filter('rest_request_before_callbacks', function ($response, $handler, $request) use (&$seo_head_url) {
    if ($request->get_route() === '/rankmath/v1/getHead') $seo_head_url = $request->get_param('url');
    return $response;
}, 10, 3);
add_filter('rest_request_after_callbacks', function ($response, $handler, $request) use (&$seo_head_url) {
    if ($request->get_route() === '/rankmath/v1/getHead') $seo_head_url = null;
    return $response;
}, 10, 3);
/** Rank Math removes parse_request callbacks while reconstructing WP_Query. */
add_filter('request', function ($query) use (&$seo_head_url) {
    if (!$seo_head_url) return $query;
    $post = resolve_public_page(wp_parse_url($seo_head_url, PHP_URL_PATH), false);
    return $post ? ($post->post_type === 'page' ? ['page_id' => $post->ID] : ['post_type' => $post->post_type, 'p' => $post->ID]) : $query;
}, 99);

// Internal records are configuration/content sources, never independent search results.
add_filter('rank_math/sitemap/exclude_post_type', function ($exclude, $type) {
    return $exclude || in_array($type, ['site_part', 'site_form', 'site_entry', 'site_modal', 'faq', 'review', 'tariff'], true);
}, 10, 2);

/** Rank Math's domain helper rejects single-label local hosts. Keep strict same-origin validation. */
add_filter('rest_endpoints', function ($routes) {
    if (empty($routes['/rankmath/v1/getHead'])) return $routes;
    foreach ($routes['/rankmath/v1/getHead'] as &$endpoint) {
        if (!isset($endpoint['args']['url'])) continue;
        $endpoint['args']['url']['validate_callback'] = function ($value) {
            if (!is_string($value) || !filter_var($value, FILTER_VALIDATE_URL)) return false;
            $url = wp_parse_url($value); $home = wp_parse_url(home_url());
            return empty($url['user']) && empty($url['pass'])
                && ($url['scheme'] ?? '') === ($home['scheme'] ?? '')
                && strtolower($url['host'] ?? '') === strtolower($home['host'] ?? '')
                && ($url['port'] ?? null) === ($home['port'] ?? null);
        };
    }
    unset($endpoint);
    return $routes;
});

// Taxonomy archives have no page/template in this headless router. Do not advertise 404 URLs.
add_filter('rank_math/sitemap/exclude_taxonomy', function ($exclude, $taxonomy) {
    return $exclude || !in_array($taxonomy, apply_filters('site_seo_taxonomy_routes', []), true);
}, 10, 2);

// Frontend permalinks belong to this site even when WordPress lives on a separate origin.
add_filter('rank_math/links/is_external', function ($external, $parts) {
    $frontend = wp_parse_url(frontend_url('/'));
    return isset($parts['host']) && strtolower($parts['host']) === strtolower($frontend['host'] ?? '')
        && ($parts['port'] ?? null) === ($frontend['port'] ?? null) ? false : $external;
}, 10, 2);


/** Dynamic React blocks store media in attributes rather than saved <img> markup. */
add_filter('rank_math/sitemap/urlimages', function ($images, $post_id) {
    $post = get_post($post_id);
    if (!$post) return $images;
    $seen = array_fill_keys(array_column($images, 'src'), true);
    $walk = function ($value) use (&$walk, &$images, &$seen) {
        if (is_array($value)) { foreach ($value as $child) $walk($child); return; }
        if (!is_string($value) || !filter_var($value, FILTER_VALIDATE_URL) || !in_array(wp_parse_url($value, PHP_URL_SCHEME), ['http','https'], true)) return;
        $extension = strtolower(pathinfo(wp_parse_url($value, PHP_URL_PATH) ?: '', PATHINFO_EXTENSION));
        if (!in_array($extension, ['jpg','jpeg','png','webp','avif','gif','svg'], true) || isset($seen[$value])) return;
        $images[] = ['src' => $value]; $seen[$value] = true;
    };
    $walk(blocks($post->post_content));
    return $images;
}, 20, 2);

/** Builder diagnostics and error templates are editable documents, not indexable site pages. */
function seo_internal_document($post) {
    $post = get_post($post);
    return $post && (get_post_meta($post->ID, '_site_field_playground', true)
        || has_block('site/field-playground', $post) || has_block('site/not-found', $post));
}
add_filter('rank_math/frontend/robots', function ($robots) {
    if (is_singular() && seo_internal_document(get_queried_object_id())) $robots['index'] = 'noindex';
    return $robots;
});
add_filter('rank_math/sitemap/entry', function ($url, $type, $object) {
    return $type === 'post' && seo_internal_document($object) ? false : $url;
}, 10, 3);

// The public frontend has no site-search route; never advertise a broken SearchAction.
add_filter('rank_math/json_ld/disable_search', '__return_true');

// WebPage/Organization remain valid when a page has no Article or other rich snippet.
add_filter('rank_math/schema/add_global_entities', function ($enabled) {
    return $enabled || (is_page() && !seo_internal_document(get_queried_object_id()));
});

add_filter('rank_math/opengraph/facebook/og_type', function ($type) {
    return is_page() ? 'website' : $type;
});

// Assigned archive pages are collections even though WordPress queries them as pages.
add_filter('rank_math/json_ld', function ($data) {
    if (!is_page() || empty($data['WebPage'])) return $data;
    foreach (archive_pages() as $page) {
        if ($page->ID === get_queried_object_id()) {
            $data['WebPage']['@type'] = 'CollectionPage';
            break;
        }
    }
    return $data;
}, 90);
