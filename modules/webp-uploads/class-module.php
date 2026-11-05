<?php
namespace SpWebpUploads;
defined('ABSPATH') || exit;

final class Module {
    use Gutenberg, Configuration, Conversion, Attachments, References, Unused, Ajax, Admin;
    private const OPT_KEY      = 'sp_webp_convert_cfg';
    private const NONCE_ACTION = 'sp_webp_convert_admin';
    private const PAGE_SLUG    = 'sp-uploads-webp-convert';
    private const VERSION      = '2.3.0';
    private const URL_MAP_TRANSIENT = 'sp_webp_url_replace_map_cache';
    private const UNUSED_SCHEMA_TRANSIENT = 'sp_webp_unused_schema_cache';
    private const UNUSED_SCHEMA_CACHE_VERSION = 4;

    private static ?self $instance = null;
    private string $unused_schema_error = '';
    private string $last_table_search_error = '';

}
