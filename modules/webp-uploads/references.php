<?php
namespace SpWebpUploads;
defined('ABSPATH') || exit;
use WP_Query;

trait References {
    private function swap_webp_url_extension( string $url, string $target_ext ): string {
        $url = trim( $url );
        if ( $url === '' ) {
            return '';
        }

        $target_ext = strtolower( trim( $target_ext ) );
        if ( ! preg_match( '~^[a-z0-9]+$~', $target_ext ) ) {
            return '';
        }

        return (string) preg_replace( '~\.webp(?=([?#].*)?$)~i', '.' . $target_ext, $url );
    }

    private function attachment_url_map( int $attachment_id ): array {
        $map = [];

        $new_main_url = (string) wp_get_attachment_url( $attachment_id );
        if ( $new_main_url === '' || ! preg_match( '~\.webp(?:[?#].*)?$~i', $new_main_url ) ) {
            return $map;
        }

        $old_ext_meta = strtolower( (string) get_post_meta( $attachment_id, '_sp_webp_original_ext', true ) );
        $allowed_exts = [ 'jpg', 'jpeg', 'png', 'gif' ];
        $old_exts     = in_array( $old_ext_meta, $allowed_exts, true ) ? [ $old_ext_meta ] : $allowed_exts;

        $old_main_url = (string) get_post_meta( $attachment_id, '_sp_webp_original_url', true );
        if ( $old_main_url !== '' && $old_main_url !== $new_main_url ) {
            $map[ $old_main_url ] = $new_main_url;
        }

        foreach ( $old_exts as $old_ext ) {
            $old = $this->swap_webp_url_extension( $new_main_url, $old_ext );
            if ( $old !== '' && $old !== $new_main_url ) {
                $map[ $old ] = $new_main_url;
            }
        }

        $meta = wp_get_attachment_metadata( $attachment_id );
        if ( ! is_array( $meta ) || empty( $meta['sizes'] ) || ! is_array( $meta['sizes'] ) ) {
            return $map;
        }

        $base_dir_url = trailingslashit( dirname( $new_main_url ) );
        foreach ( $meta['sizes'] as $size ) {
            if ( ! is_array( $size ) || empty( $size['file'] ) ) {
                continue;
            }

            $new_size_url = $base_dir_url . ltrim( (string) $size['file'], '/\\' );
            if ( ! preg_match( '~\.webp(?:[?#].*)?$~i', $new_size_url ) ) {
                continue;
            }

            foreach ( $old_exts as $old_ext ) {
                $old = $this->swap_webp_url_extension( $new_size_url, $old_ext );
                if ( $old !== '' && $old !== $new_size_url ) {
                    $map[ $old ] = $new_size_url;
                }
            }
        }

        return $map;
    }

    private function build_url_replacement_map(): array {
        $cached = get_transient( self::URL_MAP_TRANSIENT );
        if ( is_array( $cached ) && isset( $cached['map'] ) && is_array( $cached['map'] ) ) {
            return $cached['map'];
        }

        $map = [];

        $q = new WP_Query( [
                'post_type'              => 'attachment',
                'post_status'            => 'inherit',
                'post_mime_type'         => 'image/webp',
                'fields'                 => 'ids',
                'posts_per_page'         => 500,
                'paged'                  => 1,
                'no_found_rows'          => true,
                'orderby'                => 'ID',
                'order'                  => 'ASC',
                'update_post_meta_cache' => false,
                'update_post_term_cache' => false,
        ] );

        while ( ! empty( $q->posts ) ) {
            foreach ( $q->posts as $attachment_id ) {
                $attachment_id = (int) $attachment_id;
                if ( $attachment_id <= 0 ) {
                    continue;
                }

                foreach ( $this->attachment_url_map( $attachment_id ) as $old_url => $new_url ) {
                    $old_url = trim( (string) $old_url );
                    $new_url = trim( (string) $new_url );
                    if ( $old_url === '' || $new_url === '' || $old_url === $new_url ) {
                        continue;
                    }
                    $map[ $old_url ] = $new_url;
                }
            }

            $page = (int) $q->get( 'paged' );
            $q = new WP_Query( [
                    'post_type'              => 'attachment',
                    'post_status'            => 'inherit',
                    'post_mime_type'         => 'image/webp',
                    'fields'                 => 'ids',
                    'posts_per_page'         => 500,
                    'paged'                  => $page + 1,
                    'no_found_rows'          => true,
                    'orderby'                => 'ID',
                    'order'                  => 'ASC',
                    'update_post_meta_cache' => false,
                    'update_post_term_cache' => false,
            ] );
        }

        set_transient( self::URL_MAP_TRANSIENT, [ 'map' => $map ], 10 * MINUTE_IN_SECONDS );

        return $map;
    }

    private function replace_in_string( string $value, array $map, int &$hits = 0 ): string {
        $hits = 0;
        if ( $value === '' || empty( $map ) ) {
            return $value;
        }

        $updated = strtr( $value, $map );
        if ( $updated === $value ) {
            return $value;
        }

        foreach ( $map as $old => $new ) {
            if ( $old === '' || $old === $new ) {
                continue;
            }
            $hits += substr_count( $value, $old );
        }

        return $updated;
    }

    private function replace_recursive_value( $value, array $map, int &$hits = 0, bool &$changed = false ) {
        if ( is_string( $value ) ) {
            $local_hits = 0;
            $new_value  = $this->replace_in_string( $value, $map, $local_hits );
            if ( $new_value !== $value ) {
                $changed = true;
                $hits   += $local_hits;
            }
            return $new_value;
        }

        if ( is_array( $value ) ) {
            $out = [];
            foreach ( $value as $k => $v ) {
                $out[ $k ] = $this->replace_recursive_value( $v, $map, $hits, $changed );
            }
            return $out;
        }

        return $value;
    }

    private function replace_meta_value( string $raw_value, array $map, int &$hits = 0, bool &$changed = false ): string {
        $hits    = 0;
        $changed = false;

        if ( $raw_value === '' ) {
            return $raw_value;
        }

        if ( ! is_serialized( $raw_value, false ) ) {
            $updated = $this->replace_in_string( $raw_value, $map, $hits );
            $changed = $updated !== $raw_value;
            return $updated;
        }

        $decoded = @unserialize( $raw_value, [ 'allowed_classes' => false ] );
        if ( $decoded === false && $raw_value !== 'b:0;' ) {
            return $raw_value;
        }

        if ( is_object( $decoded ) ) {
            return $raw_value;
        }

        $updated_value = $this->replace_recursive_value( $decoded, $map, $hits, $changed );
        if ( ! $changed ) {
            return $raw_value;
        }

        return serialize( $updated_value );
    }

    private function process_posts_replace_batch( int $last_id, int $limit, array $map, bool $dry_run ): array {
        global $wpdb;

        $rows = $wpdb->get_results(
                $wpdb->prepare(
                        "SELECT ID, post_content, post_excerpt FROM {$wpdb->posts} WHERE ID > %d ORDER BY ID ASC LIMIT %d",
                        $last_id,
                        $limit
                ),
                ARRAY_A
        );

        if ( ! is_array( $rows ) || empty( $rows ) ) {
            return [
                    'done_phase'   => true,
                    'next_last_id' => $last_id,
                    'processed'    => 0,
                    'changed'      => 0,
                    'hits'         => 0,
                    'log'          => [],
                    'errors'       => 0,
            ];
        }

        $processed = 0;
        $changed   = 0;
        $hits      = 0;
        $errors    = 0;
        $log       = [];

        foreach ( $rows as $row ) {
            $post_id = (int) ( $row['ID'] ?? 0 );
            if ( $post_id <= 0 ) {
                continue;
            }

            $last_id = max( $last_id, $post_id );
            $processed ++;

            $content_hits = 0;
            $excerpt_hits = 0;
            $new_content  = $this->replace_in_string( (string) ( $row['post_content'] ?? '' ), $map, $content_hits );
            $new_excerpt  = $this->replace_in_string( (string) ( $row['post_excerpt'] ?? '' ), $map, $excerpt_hits );

            if ( $new_content === (string) ( $row['post_content'] ?? '' ) && $new_excerpt === (string) ( $row['post_excerpt'] ?? '' ) ) {
                continue;
            }

            $changed ++;
            $hits += $content_hits + $excerpt_hits;

            if ( ! $dry_run ) {
                $ok = $wpdb->update(
                        $wpdb->posts,
                        [
                                'post_content' => $new_content,
                                'post_excerpt' => $new_excerpt,
                        ],
                        [ 'ID' => $post_id ],
                        [ '%s', '%s' ],
                        [ '%d' ]
                );

                if ( $ok === false ) {
                    $errors ++;
                    $log[] = '[ERR] posts ID ' . $post_id . ': update failed';
                    continue;
                }
            }

            if ( count( $log ) < 12 ) {
                $log[] = sprintf( '[OK] posts ID %d changed', $post_id );
            }
        }

        return [
                'done_phase'   => count( $rows ) < $limit,
                'next_last_id' => $last_id,
                'processed'    => $processed,
                'changed'      => $changed,
                'hits'         => $hits,
                'log'          => $log,
                'errors'       => $errors,
        ];
    }

    private function process_postmeta_replace_batch( int $last_meta_id, int $limit, array $map, bool $dry_run ): array {
        global $wpdb;

        $rows = $wpdb->get_results(
                $wpdb->prepare(
                        "SELECT meta_id, post_id, meta_key, meta_value FROM {$wpdb->postmeta} WHERE meta_id > %d ORDER BY meta_id ASC LIMIT %d",
                        $last_meta_id,
                        $limit
                ),
                ARRAY_A
        );

        if ( ! is_array( $rows ) || empty( $rows ) ) {
            return [
                    'done_phase'   => true,
                    'next_last_id' => $last_meta_id,
                    'processed'    => 0,
                    'changed'      => 0,
                    'hits'         => 0,
                    'log'          => [],
                    'errors'       => 0,
            ];
        }

        $processed = 0;
        $changed   = 0;
        $hits      = 0;
        $errors    = 0;
        $log       = [];

        foreach ( $rows as $row ) {
            $meta_id = (int) ( $row['meta_id'] ?? 0 );
            if ( $meta_id <= 0 ) {
                continue;
            }

            $last_meta_id = max( $last_meta_id, $meta_id );
            $processed ++;

            $local_hits   = 0;
            $local_change = false;
            $new_value    = $this->replace_meta_value( (string) ( $row['meta_value'] ?? '' ), $map, $local_hits, $local_change );

            if ( ! $local_change ) {
                continue;
            }

            $changed ++;
            $hits += $local_hits;

            if ( ! $dry_run ) {
                $ok = $wpdb->update(
                        $wpdb->postmeta,
                        [ 'meta_value' => $new_value ],
                        [ 'meta_id' => $meta_id ],
                        [ '%s' ],
                        [ '%d' ]
                );

                if ( $ok === false ) {
                    $errors ++;
                    $log[] = '[ERR] postmeta #' . $meta_id . ': update failed';
                    continue;
                }
            }

            if ( count( $log ) < 12 ) {
                $key = (string) ( $row['meta_key'] ?? '' );
                $log[] = sprintf( '[OK] postmeta #%d (%s) changed', $meta_id, $key !== '' ? $key : '-' );
            }
        }

        return [
                'done_phase'   => count( $rows ) < $limit,
                'next_last_id' => $last_meta_id,
                'processed'    => $processed,
                'changed'      => $changed,
                'hits'         => $hits,
                'log'          => $log,
                'errors'       => $errors,
        ];
    }
}
