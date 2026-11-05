<?php
namespace SpWebpUploads;
defined('ABSPATH') || exit;
use Throwable;

trait Ajax {
    public function ajax_prepare_url_replace(): void {
        $this->ajax_guard();

        global $wpdb;
        delete_transient( self::URL_MAP_TRANSIENT );
        $map = $this->build_url_replacement_map();

        $total_posts = (int) $wpdb->get_var( "SELECT COUNT(ID) FROM {$wpdb->posts}" );
        $total_meta  = (int) $wpdb->get_var( "SELECT COUNT(meta_id) FROM {$wpdb->postmeta}" );

        wp_send_json_success( [
                'map_count'   => count( $map ),
                'total_posts' => $total_posts,
                'total_meta'  => $total_meta,
                'total_rows'  => $total_posts + $total_meta,
                'cursor'      => [
                        'phase'   => 'posts',
                        'last_id' => 0,
                ],
        ] );
    }

    public function ajax_replace_urls_batch(): void {
        $this->ajax_guard();

        $cfg        = $this->cfg();
        $limit      = (int) $cfg['db_batch_size'];
        $dry_run    = ! empty( $_POST['dry_run'] );
        $cursor_in  = isset( $_POST['cursor'] ) && is_array( $_POST['cursor'] ) ? (array) $_POST['cursor'] : [];
        $phase      = isset( $cursor_in['phase'] ) && in_array( $cursor_in['phase'], [ 'posts', 'postmeta' ], true ) ? (string) $cursor_in['phase'] : 'posts';
        $last_id    = isset( $cursor_in['last_id'] ) ? (int) $cursor_in['last_id'] : 0;

        @set_time_limit( 20 );

        $map = $this->build_url_replacement_map();
        if ( empty( $map ) ) {
            wp_send_json_success( [
                    'done'      => true,
                    'cursor'    => [ 'phase' => 'done', 'last_id' => 0 ],
                    'processed' => 0,
                    'changed'   => 0,
                    'hits'      => 0,
                    'errors'    => 0,
                    'log'       => [ '[-] No URL mappings available.' ],
            ] );
        }

        if ( $limit < 20 ) {
            $limit = 20;
        } elseif ( $limit > 120 ) {
            $limit = 120;
        }

        if ( $phase === 'posts' ) {
            $result = $this->process_posts_replace_batch( $last_id, $limit, $map, $dry_run );
            if ( $result['done_phase'] ) {
                $cursor = [ 'phase' => 'postmeta', 'last_id' => 0 ];
                $done   = false;
            } else {
                $cursor = [ 'phase' => 'posts', 'last_id' => (int) $result['next_last_id'] ];
                $done   = false;
            }
        } else {
            $result = $this->process_postmeta_replace_batch( $last_id, $limit, $map, $dry_run );
            if ( $result['done_phase'] ) {
                $cursor = [ 'phase' => 'done', 'last_id' => 0 ];
                $done   = true;
            } else {
                $cursor = [ 'phase' => 'postmeta', 'last_id' => (int) $result['next_last_id'] ];
                $done   = false;
            }
        }

        wp_send_json_success( [
                'done'      => $done,
                'cursor'    => $cursor,
                'processed' => (int) ( $result['processed'] ?? 0 ),
                'changed'   => (int) ( $result['changed'] ?? 0 ),
                'hits'      => (int) ( $result['hits'] ?? 0 ),
                'errors'    => (int) ( $result['errors'] ?? 0 ),
                'log'       => array_values( array_slice( (array) ( $result['log'] ?? [] ), 0, 20 ) ),
                'phase'     => $phase,
                'dry_run'   => $dry_run ? 1 : 0,
                'map_count' => count( $map ),
        ] );
    }

    private function ajax_replace_guard(): void {
        check_ajax_referer( self::NONCE_ACTION, 'nonce' );

        if ( ! current_user_can( 'upload_files' ) ) {
            wp_send_json_error( [ 'message' => 'Forbidden' ], 403 );
        }
    }

    public function ajax_replace_attachment_file(): void {
        $this->ajax_replace_guard();

        $attachment_id = isset( $_POST['attachment_id'] ) ? (int) $_POST['attachment_id'] : 0;
        if ( $attachment_id <= 0 ) {
            wp_send_json_error( [ 'message' => 'Attachment ID is missing.' ], 400 );
        }

        if ( empty( $_FILES['replacement'] ) || ! is_array( $_FILES['replacement'] ) ) {
            wp_send_json_error( [ 'message' => 'Replacement file is missing.' ], 400 );
        }

        $result = $this->replace_attachment_file_in_place( $attachment_id, $_FILES['replacement'] );
        if ( (string) ( $result['status'] ?? '' ) !== 'replaced' ) {
            wp_send_json_error( [ 'message' => (string) ( $result['message'] ?? 'Replace failed.' ) ], 400 );
        }

        wp_send_json_success( [
                'message'     => (string) ( $result['message'] ?? 'Attachment file replaced.' ),
                'preview_url' => (string) ( $result['preview_url'] ?? '' ),
        ] );
    }

    private function ajax_guard(): void {
        check_ajax_referer( self::NONCE_ACTION, 'nonce' );

        if ( ! current_user_can( 'manage_options' ) ) {
            wp_send_json_error( [ 'message' => 'Forbidden' ], 403 );
        }
    }

    public function ajax_save_settings(): void {
        $this->ajax_guard();

        $raw = isset( $_POST['cfg'] ) && is_array( $_POST['cfg'] ) ? (array) wp_unslash( $_POST['cfg'] ) : [];
        $cfg = $this->sanitize_cfg( $raw );
        update_option( self::OPT_KEY, $cfg, false );

        wp_send_json_success( [ 'cfg' => $cfg ] );
    }

    public function ajax_scan_media(): void {
        $this->ajax_guard();

        $cfg            = $this->cfg();
        $total_supported = $this->count_supported_attachments( $cfg );

        wp_send_json_success( [
                'total_supported' => $total_supported,
                'batch_size'      => (int) $cfg['batch_size'],
        ] );
    }

    public function ajax_convert_batch(): void {
        $this->ajax_guard();

        $cfg     = $this->cfg();
        $last_id = isset( $_POST['last_id'] ) ? (int) $_POST['last_id'] : 0;
        $limit   = (int) $cfg['batch_size'];
        $limit_override = isset( $_POST['limit_override'] ) ? (int) $_POST['limit_override'] : 0;
        if ( $limit_override > 0 ) {
            $limit = min( max( 1, $limit_override ), max( 1, (int) $cfg['batch_size'] ) );
        }

        @set_time_limit( 20 );

        $ids = $this->query_next_attachment_ids( $last_id, $limit, $cfg );
        if ( empty( $ids ) ) {
            wp_send_json_success( [
                    'done'        => true,
                    'last_id'     => $last_id,
                    'batch_total' => 0,
                    'converted'   => 0,
                    'skipped'     => 0,
                    'errors'      => 0,
                    'bytes_saved' => 0,
                    'log'         => [],
            ] );
        }

        $converted  = 0;
        $skipped    = 0;
        $errors     = 0;
        $bytes_saved = 0;
        $log        = [];

        foreach ( $ids as $id ) {
            $last_id = max( $last_id, (int) $id );
            $label   = get_the_title( $id );
            $label   = $label !== '' ? $label : ( 'Attachment #' . $id );

            $one = $this->convert_attachment( $id, $cfg );
            $status = (string) ( $one['status'] ?? 'skipped' );
            $message = (string) ( $one['message'] ?? '' );

            if ( $status === 'converted' ) {
                $converted ++;
                $bytes_saved += (int) ( $one['bytes_saved'] ?? 0 );
                $log[] = sprintf( '[OK] %s: %s', $label, $message );
            } elseif ( $status === 'error' ) {
                $errors ++;
                $log[] = sprintf( '[ERR] %s: %s', $label, $message );
            } else {
                $skipped ++;
                $log[] = sprintf( '[-] %s: %s', $label, $message );
            }
        }

        $has_more = ! empty( $this->query_next_attachment_ids( $last_id, 1, $cfg ) );

        wp_send_json_success( [
                'done'        => ! $has_more,
                'last_id'     => $last_id,
                'batch_total' => count( $ids ),
                'converted'   => $converted,
                'skipped'     => $skipped,
                'errors'      => $errors,
                'bytes_saved' => $bytes_saved,
                'log'         => $log,
        ] );
    }

    public function ajax_prepare_unused_scan(): void {
        $this->ajax_guard();

        $schema        = $this->custom_searchable_columns();
        $custom_tables = count( $schema );
        $custom_columns = 0;
        foreach ( $schema as $columns ) {
            $custom_columns += count( (array) $columns );
        }

        wp_send_json_success( [
                'total_images'    => $this->count_all_image_attachments(),
                'batch_size'      => $this->unused_scan_batch_size(),
                'cursor'          => [ 'last_id' => 0 ],
                'custom_tables'   => $custom_tables,
                'custom_columns'  => $custom_columns,
                'search_strategy' => 'exact-id, URL/path variants, core/custom text columns, static filesystem files',
        ] );
    }

    public function ajax_scan_unused_batch(): void {
        $this->ajax_guard();

        $last_id = isset( $_POST['last_id'] ) ? (int) $_POST['last_id'] : 0;
        $limit   = isset( $_POST['limit'] ) ? (int) $_POST['limit'] : $this->unused_scan_batch_size();
        $limit   = min( 20, max( 1, $limit ) );

        @set_time_limit( 45 );

        $ids = $this->query_next_image_attachment_ids( $last_id, $limit );
        if ( empty( $ids ) ) {
            wp_send_json_success( [
                    'done'        => true,
                    'last_id'     => $last_id,
                    'processed'   => 0,
                    'unused'      => 0,
                    'used'        => 0,
                    'errors'      => 0,
                    'items'       => [],
                    'log'         => [],
            ] );
        }

        $processed = 0;
        $unused    = 0;
        $used      = 0;
        $errors    = 0;
        $items     = [];
        $log       = [];

        foreach ( $ids as $attachment_id ) {
            $attachment_id = (int) $attachment_id;
            $last_id       = max( $last_id, $attachment_id );
            $processed ++;

            try {
                $inspection = $this->find_attachment_usage( $attachment_id );
                $title      = get_the_title( $attachment_id );
                $title      = $title !== '' ? $title : ( 'Attachment #' . $attachment_id );

                if ( ! empty( $inspection['used'] ) ) {
                    $used ++;
                    if ( count( $log ) < 12 ) {
                        $log[] = sprintf( '[-] %s kept: %s', $title, (string) ( $inspection['reason'] ?? 'Usage found' ) );
                    }
                    continue;
                }

                $unused ++;
                $items[] = $this->build_unused_attachment_item( $attachment_id, $inspection );
                if ( count( $log ) < 12 ) {
                    $log[] = sprintf( '[OK] %s marked unused', $title );
                }
            } catch ( Throwable $e ) {
                $errors ++;
                if ( count( $log ) < 12 ) {
                    $log[] = sprintf( '[ERR] Attachment #%d: %s', $attachment_id, $e->getMessage() );
                }
            }
        }

        $has_more = ! empty( $this->query_next_image_attachment_ids( $last_id, 1 ) );

        wp_send_json_success( [
                'done'      => ! $has_more,
                'last_id'   => $last_id,
                'processed' => $processed,
                'unused'    => $unused,
                'used'      => $used,
                'errors'    => $errors,
                'items'     => $items,
                'log'       => $log,
        ] );
    }

    public function ajax_delete_unused_batch(): void {
        $this->ajax_guard();

        $raw_ids = isset( $_POST['ids'] ) && is_array( $_POST['ids'] ) ? (array) wp_unslash( $_POST['ids'] ) : [];
        $ids     = array_values( array_unique( array_filter( array_map( 'intval', $raw_ids ) ) ) );
        $ids     = array_slice( $ids, 0, $this->unused_delete_batch_size() );

        if ( empty( $ids ) ) {
            wp_send_json_success( [
                    'deleted_ids' => [],
                    'skipped'     => [],
                    'errors'      => 0,
                    'log'         => [ '[-] No attachment IDs received.' ],
            ] );
        }

        @set_time_limit( 45 );

        $deleted_ids = [];
        $skipped     = [];
        $errors      = 0;
        $log         = [];

        foreach ( $ids as $attachment_id ) {
            $attachment_id = (int) $attachment_id;
            $post          = get_post( $attachment_id );
            if ( ! $post || $post->post_type !== 'attachment' ) {
                $skipped[] = [
                        'id'     => $attachment_id,
                        'reason' => 'Attachment not found.',
                ];
                if ( count( $log ) < 12 ) {
                    $log[] = sprintf( '[-] Attachment #%d skipped: not found', $attachment_id );
                }
                continue;
            }

            $mime = (string) get_post_mime_type( $attachment_id );
            if ( ! str_starts_with( $mime, 'image/' ) ) {
                $skipped[] = [
                        'id'     => $attachment_id,
                        'reason' => 'Attachment is not an image.',
                ];
                if ( count( $log ) < 12 ) {
                    $log[] = sprintf( '[-] %s skipped: not an image', get_the_title( $attachment_id ) ?: ( 'Attachment #' . $attachment_id ) );
                }
                continue;
            }

            try {
                $inspection = $this->find_attachment_usage( $attachment_id );
                if ( ! empty( $inspection['used'] ) ) {
                    $skipped[] = [
                            'id'     => $attachment_id,
                            'reason' => (string) ( $inspection['reason'] ?? 'Usage found before delete.' ),
                    ];
                    if ( count( $log ) < 12 ) {
                        $log[] = sprintf( '[-] %s skipped: %s', get_the_title( $attachment_id ) ?: ( 'Attachment #' . $attachment_id ), (string) ( $inspection['reason'] ?? 'Usage found before delete.' ) );
                    }
                    continue;
                }
            } catch ( Throwable $e ) {
                $errors ++;
                if ( count( $log ) < 12 ) {
                    $log[] = sprintf( '[ERR] %s: %s', get_the_title( $attachment_id ) ?: ( 'Attachment #' . $attachment_id ), $e->getMessage() );
                }
                continue;
            }

            $deleted = wp_delete_attachment( $attachment_id, true );
            if ( $deleted ) {
                $deleted_ids[] = $attachment_id;
                if ( count( $log ) < 12 ) {
                    $log[] = sprintf( '[OK] %s deleted', get_the_title( $attachment_id ) ?: ( 'Attachment #' . $attachment_id ) );
                }
                continue;
            }

            $errors ++;
            if ( count( $log ) < 12 ) {
                $log[] = sprintf( '[ERR] %s: delete failed', get_the_title( $attachment_id ) ?: ( 'Attachment #' . $attachment_id ) );
            }
        }

        wp_send_json_success( [
                'deleted_ids' => $deleted_ids,
                'skipped'     => $skipped,
                'errors'      => $errors,
                'log'         => $log,
        ] );
    }
}
