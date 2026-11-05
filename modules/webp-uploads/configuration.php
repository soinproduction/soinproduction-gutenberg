<?php
namespace SpWebpUploads;
defined('ABSPATH') || exit;

trait Configuration {
    public static function get(): self {
        if ( ! self::$instance ) {
            self::$instance = new self();
        }

        return self::$instance;
    }

    private function __construct() {
        add_filter( 'wp_handle_upload', [ $this, 'convert_on_upload' ], 20 );
        add_filter( 'wp_unique_filename', [ $this, 'make_filename_unique_for_webp' ], 10, 3 );
        add_filter( 'upload_mimes', [ $this, 'allow_webp_mime' ] );
        add_filter( 'wp_check_filetype_and_ext', [ $this, 'fix_webp_filetype' ], 10, 5 );

        add_action( 'admin_menu', [ $this, 'menu' ] );
        add_action( 'admin_enqueue_scripts', [ $this, 'admin_assets' ] );
        add_filter( 'media_row_actions', [ $this, 'media_row_replace_action' ], 10, 2 );
        add_filter( 'attachment_fields_to_edit', [ $this, 'attachment_replace_field' ], 10, 2 );

        add_action( 'wp_ajax_sp_webp_save_settings', [ $this, 'ajax_save_settings' ] );
        add_action( 'wp_ajax_sp_webp_scan_media', [ $this, 'ajax_scan_media' ] );
        add_action( 'wp_ajax_sp_webp_convert_batch', [ $this, 'ajax_convert_batch' ] );
        add_action( 'wp_ajax_sp_webp_prepare_url_replace', [ $this, 'ajax_prepare_url_replace' ] );
        add_action( 'wp_ajax_sp_webp_replace_urls_batch', [ $this, 'ajax_replace_urls_batch' ] );
        add_action( 'wp_ajax_sp_webp_prepare_unused_scan', [ $this, 'ajax_prepare_unused_scan' ] );
        add_action( 'wp_ajax_sp_webp_scan_unused_batch', [ $this, 'ajax_scan_unused_batch' ] );
        add_action( 'wp_ajax_sp_webp_delete_unused_batch', [ $this, 'ajax_delete_unused_batch' ] );
        add_action( 'wp_ajax_sp_webp_replace_attachment_file', [ $this, 'ajax_replace_attachment_file' ] );
    }

    private function defaults(): array {
        return [
                'enabled_upload'     => 1,
                'quality'            => 90,
                'max_side'           => 2560,
                'delete_original'    => 0,
                'skip_animated_gif'  => 1,
                'batch_size'         => 20,
                'db_batch_size'      => 200,
        ];
    }

    private function cfg(): array {
        $raw = get_option( self::OPT_KEY, [] );
        if ( ! is_array( $raw ) ) {
            $raw = [];
        }

        return array_merge( $this->defaults(), $raw );
    }

    private function sanitize_cfg( array $raw ): array {
        $d = $this->defaults();

        return [
                'enabled_upload'    => ! empty( $raw['enabled_upload'] ) ? 1 : 0,
                'quality'           => min( 100, max( 60, (int) ( $raw['quality'] ?? $d['quality'] ) ) ),
                'max_side'          => min( 8000, max( 320, (int) ( $raw['max_side'] ?? $d['max_side'] ) ) ),
                'delete_original'   => ! empty( $raw['delete_original'] ) ? 1 : 0,
                'skip_animated_gif' => ! empty( $raw['skip_animated_gif'] ) ? 1 : 0,
                'batch_size'        => min( 100, max( 1, (int) ( $raw['batch_size'] ?? $d['batch_size'] ) ) ),
                'db_batch_size'     => min( 500, max( 20, (int) ( $raw['db_batch_size'] ?? $d['db_batch_size'] ) ) ),
        ];
    }
}
