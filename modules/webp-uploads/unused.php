<?php
namespace SpWebpUploads;
defined('ABSPATH') || exit;
use FilesystemIterator;
use RecursiveDirectoryIterator;
use RecursiveCallbackFilterIterator;
use RecursiveIteratorIterator;
use SplFileInfo;
use Throwable;

trait Unused {
    private function quote_identifier( string $name ): string {
        return '`' . str_replace( '`', '``', $name ) . '`';
    }

    private function normalize_relative_upload_path( string $path ): string {
        $path = trim( $path );
        if ( $path === '' ) {
            return '';
        }

        $path = (string) preg_replace( '~[?#].*$~', '', $path );
        $path = str_replace( '\\', '/', $path );

        return ltrim( $path, '/' );
    }

    private function relative_upload_from_url( string $url ): string {
        $url = trim( $url );
        if ( $url === '' ) {
            return '';
        }

        $up      = wp_get_upload_dir();
        $baseurl = trailingslashit( (string) ( $up['baseurl'] ?? '' ) );
        if ( $baseurl !== '' && str_starts_with( $url, $baseurl ) ) {
            return $this->normalize_relative_upload_path( substr( $url, strlen( $baseurl ) ) );
        }

        $url_path     = '/' . ltrim( str_replace( '\\', '/', (string) wp_parse_url( $url, PHP_URL_PATH ) ), '/' );
        $uploads_path = '/' . trim( str_replace( '\\', '/', (string) wp_parse_url( (string) ( $up['baseurl'] ?? '' ), PHP_URL_PATH ) ), '/' ) . '/';
        if ( $url_path === '/' || $uploads_path === '//' ) {
            return '';
        }

        $parts = explode( $uploads_path, $url_path, 2 );
        if ( count( $parts ) < 2 ) {
            return '';
        }

        return $this->normalize_relative_upload_path( (string) $parts[1] );
    }

    private function encode_path_segments( string $path ): string {
        $path = str_replace( '\\', '/', $path );
        if ( $path === '' ) {
            return '';
        }

        $leading  = str_starts_with( $path, '/' ) ? '/' : '';
        $trailing = str_ends_with( $path, '/' ) ? '/' : '';
        $trimmed  = trim( $path, '/' );
        if ( $trimmed === '' ) {
            return $leading;
        }

        $parts = array_map( 'rawurlencode', explode( '/', $trimmed ) );

        return $leading . implode( '/', $parts ) . $trailing;
    }

    private function encode_url_path_segments( string $value ): string {
        $value = str_replace( '\\', '/', trim( $value ) );
        if ( $value === '' ) {
            return '';
        }

        $parts = wp_parse_url( $value );
        if ( is_array( $parts ) && ! empty( $parts['host'] ) ) {
            $prefix = ! empty( $parts['scheme'] ) ? ( (string) $parts['scheme'] . '://' ) : '//';
            $auth   = '';
            if ( ! empty( $parts['user'] ) ) {
                $auth = (string) $parts['user'];
                if ( isset( $parts['pass'] ) ) {
                    $auth .= ':' . (string) $parts['pass'];
                }
                $auth .= '@';
            }

            $encoded = $prefix . $auth . (string) $parts['host'];
            if ( isset( $parts['port'] ) ) {
                $encoded .= ':' . (int) $parts['port'];
            }
            $encoded .= $this->encode_path_segments( (string) ( $parts['path'] ?? '' ) );
            if ( isset( $parts['query'] ) ) {
                $encoded .= '?' . (string) $parts['query'];
            }
            if ( isset( $parts['fragment'] ) ) {
                $encoded .= '#' . (string) $parts['fragment'];
            }

            return $encoded;
        }

        return $this->encode_path_segments( $value );
    }

    private function push_search_needle_variants( array &$needles, string $value ): void {
        $value = trim( str_replace( '\\', '/', $value ) );
        if ( $value === '' ) {
            return;
        }

        $base_candidates = [ $value ];
        $without_query   = (string) preg_replace( '~[?#].*$~', '', $value );
        if ( $without_query !== '' && $without_query !== $value ) {
            $base_candidates[] = $without_query;
        }

        $decoded = rawurldecode( $value );
        if ( $decoded !== $value ) {
            $base_candidates[] = $decoded;
        }

        $encoded = $this->encode_url_path_segments( $value );
        if ( $encoded !== '' && $encoded !== $value ) {
            $base_candidates[] = $encoded;
        }

        foreach ( array_values( array_unique( $base_candidates ) ) as $candidate ) {
            $candidate = trim( (string) $candidate );
            if ( $candidate === '' ) {
                continue;
            }

            $needles[] = $candidate;

            if ( str_contains( $candidate, '/' ) ) {
                $needles[] = str_replace( '/', '\\/', $candidate );
            }

            if ( str_contains( $candidate, '&' ) ) {
                $needles[] = str_replace( '&', '&amp;', $candidate );
            }
        }
    }

    private function expand_search_needles( array $needles, bool $include_basename = false ): array {
        $expanded = [];

        foreach ( $needles as $needle ) {
            $needle = trim( (string) $needle );
            if ( $needle === '' ) {
                continue;
            }

            $this->push_search_needle_variants( $expanded, $needle );

            if ( ! $include_basename ) {
                continue;
            }

            $path = (string) wp_parse_url( $needle, PHP_URL_PATH );
            if ( $path === '' ) {
                $path = (string) preg_replace( '~[?#].*$~', '', $needle );
            }

            $basename = basename( str_replace( '\\', '/', rawurldecode( $path ) ) );
            if ( $basename !== '' && str_contains( $basename, '.' ) ) {
                $this->push_search_needle_variants( $expanded, $basename );
            }
        }

        return array_values(
                array_filter(
                        array_unique( $expanded ),
                        static fn( string $needle ): bool => trim( $needle ) !== ''
                )
        );
    }

    private function push_database_path_search_needle_variants( array &$needles, string $value ): void {
        $value = trim( str_replace( '\\', '/', $value ) );
        if ( $value === '' ) {
            return;
        }

        $candidates    = [ $value ];
        $without_query = (string) preg_replace( '~[?#].*$~', '', $value );
        if ( $without_query !== '' && $without_query !== $value ) {
            $candidates[] = $without_query;
        }

        $decoded = rawurldecode( $value );
        if ( $decoded !== '' && $decoded !== $value ) {
            $candidates[] = $decoded;
        }

        if ( str_contains( $value, '/' ) ) {
            $encoded = $this->encode_url_path_segments( $value );
            if ( $encoded !== '' && $encoded !== $value ) {
                $candidates[] = $encoded;
            }
        }

        foreach ( array_values( array_unique( $candidates ) ) as $candidate ) {
            $candidate = trim( (string) $candidate );
            if ( $candidate === '' ) {
                continue;
            }

            $needles[] = $candidate;

            if ( str_contains( $candidate, '/' ) ) {
                $needles[] = str_replace( '/', '\\/', $candidate );
            }

            if ( str_contains( $candidate, '&' ) ) {
                $needles[] = str_replace( '&', '&amp;', $candidate );
            }
        }
    }

    private function attachment_all_search_needles( int $attachment_id ): array {
        $needles = array_merge(
                $this->attachment_id_search_needles( $attachment_id ),
                $this->attachment_relative_search_needles( $attachment_id ),
                $this->attachment_url_search_needles( $attachment_id )
        );

        $up           = wp_get_upload_dir();
        $uploads_path = trim( str_replace( '\\', '/', (string) wp_parse_url( (string) ( $up['baseurl'] ?? '' ), PHP_URL_PATH ) ), '/' );

        foreach ( $this->attachment_relative_search_needles( $attachment_id ) as $relative ) {
            $relative = $this->normalize_relative_upload_path( (string) $relative );
            if ( $relative === '' ) {
                continue;
            }

            $needles[] = '/' . $relative;
            $needles[] = 'uploads/' . $relative;

            if ( $uploads_path !== '' ) {
                $needles[] = $uploads_path . '/' . $relative;
                $needles[] = '/' . $uploads_path . '/' . $relative;
            }
        }

        foreach ( $this->attachment_url_search_needles( $attachment_id ) as $url ) {
            $path = (string) wp_parse_url( (string) $url, PHP_URL_PATH );
            if ( $path !== '' ) {
                $needles[] = $path;
                $needles[] = ltrim( $path, '/' );
            }
        }

        return $this->expand_search_needles( $needles );
    }

    private function attachment_database_path_search_needles( int $attachment_id ): array {
        $needles      = [];
        $up           = wp_get_upload_dir();
        $uploads_path = trim( str_replace( '\\', '/', (string) wp_parse_url( (string) ( $up['baseurl'] ?? '' ), PHP_URL_PATH ) ), '/' );

        foreach ( $this->attachment_relative_search_needles( $attachment_id ) as $relative ) {
            $relative = $this->normalize_relative_upload_path( (string) $relative );
            if ( $relative === '' ) {
                continue;
            }

            $this->push_database_path_search_needle_variants( $needles, $relative );
            $this->push_database_path_search_needle_variants( $needles, '/' . $relative );
            $this->push_database_path_search_needle_variants( $needles, 'uploads/' . $relative );

            if ( $uploads_path !== '' ) {
                $this->push_database_path_search_needle_variants( $needles, $uploads_path . '/' . $relative );
                $this->push_database_path_search_needle_variants( $needles, '/' . $uploads_path . '/' . $relative );
            }
        }

        foreach ( $this->attachment_url_search_needles( $attachment_id ) as $url ) {
            $url = trim( (string) $url );
            if ( $url === '' ) {
                continue;
            }

            $this->push_database_path_search_needle_variants( $needles, $url );

            $path = (string) wp_parse_url( $url, PHP_URL_PATH );
            if ( $path !== '' ) {
                $this->push_database_path_search_needle_variants( $needles, $path );
                $this->push_database_path_search_needle_variants( $needles, ltrim( $path, '/' ) );
            }
        }

        return array_values(
                array_filter(
                        array_unique( $needles ),
                        static fn( string $needle ): bool => trim( $needle ) !== ''
                )
        );
    }

    private function attachment_database_search_needles( int $attachment_id ): array {
        return array_values(
                array_filter(
                        array_unique(
                                array_merge(
                                        $this->attachment_id_search_needles( $attachment_id ),
                                        $this->attachment_database_path_search_needles( $attachment_id )
                                )
                        ),
                        static fn( string $needle ): bool => trim( $needle ) !== ''
                )
        );
    }

    private function attachment_postmeta_search_needles( int $attachment_id ): array {
        return array_values(
                array_filter(
                        array_unique(
                                array_merge(
                                        $this->attachment_basic_id_search_needles( $attachment_id ),
                                        $this->attachment_database_path_search_needles( $attachment_id )
                                )
                        ),
                        static fn( string $needle ): bool => trim( $needle ) !== ''
                )
        );
    }

    private function unused_scan_batch_size(): int {
        $cfg = $this->cfg();
        $raw = (int) ( $cfg['batch_size'] ?? 20 );

        return min( 4, max( 1, (int) ceil( $raw / 10 ) ) );
    }

    private function unused_delete_batch_size(): int {
        return 4;
    }

    private function count_all_image_attachments(): int {
        global $wpdb;

        return (int) $wpdb->get_var(
                "SELECT COUNT(ID) FROM {$wpdb->posts} WHERE post_type='attachment' AND post_status='inherit' AND post_mime_type LIKE 'image/%'"
        );
    }

    private function query_next_image_attachment_ids( int $after_id, int $limit ): array {
        global $wpdb;

        $limit = min( 50, max( 1, $limit ) );
        $ids   = $wpdb->get_col(
                $wpdb->prepare(
                        "SELECT ID FROM {$wpdb->posts} WHERE post_type='attachment' AND post_status='inherit' AND post_mime_type LIKE 'image/%%' AND ID > %d ORDER BY ID ASC LIMIT %d",
                        $after_id,
                        $limit
                )
        );

        if ( ! is_array( $ids ) ) {
            return [];
        }

        return array_values( array_filter( array_map( 'intval', $ids ) ) );
    }

    private function attachment_basic_id_search_needles( int $attachment_id ): array {
        $id = (string) $attachment_id;

        return [
                'wp-image-' . $id,
                'wp-att-' . $id,
                'attachment_' . $id,
                'attachment-' . $id,
                'data-id="' . $id . '"',
                "data-id='" . $id . "'",
                'data-attachment-id="' . $id . '"',
                "data-attachment-id='" . $id . "'",
                'data-image-id="' . $id . '"',
                "data-image-id='" . $id . "'",
                '[gallery ids="' . $id,
                'ids="' . $id . '"',
                'ids="' . $id . ',',
                "ids='" . $id . "'",
                "ids='" . $id . ',',
        ];
    }

    private function attachment_id_search_needles( int $attachment_id ): array {
        $id     = (string) $attachment_id;
        $keys   = [
                'attachment',
                'attachmentID',
                'attachmentId',
                'attachment_id',
                'background',
                'bg',
                'icon',
                'image',
                'imageID',
                'imageId',
                'image_id',
                'media',
                'mediaID',
                'mediaId',
                'media_id',
                'poster',
                'posterID',
                'posterId',
                'poster_id',
                'thumbnail',
                'thumbnail_id',
        ];

        $needles = $this->attachment_basic_id_search_needles( $attachment_id );

        foreach ( $keys as $key ) {
            $needles[] = '"' . $key . '":' . $id;
            $needles[] = '"' . $key . '": ' . $id;
            $needles[] = '"' . $key . '":"' . $id . '"';
            $needles[] = '"' . $key . '": "' . $id . '"';
            $needles[] = "'" . $key . "':" . $id;
            $needles[] = "'" . $key . "': " . $id;
            $needles[] = "'" . $key . "':'" . $id . "'";
            $needles[] = "'" . $key . "': '" . $id . "'";
        }

        return array_values( array_filter( array_unique( $needles ) ) );
    }

    private function meta_key_suggests_attachment_reference( string $key ): bool {
        $key = strtolower( trim( $key ) );
        if ( $key === '' ) {
            return false;
        }

        if ( preg_match( '~^_?sp_builder_import_backup_~', $key ) ) {
            return false;
        }

        return (bool) preg_match( '~(^|[_\W-])(attachment|avatar|background|bg|file|gallery|icon|image|img|logo|media|photo|picture|poster|svg|thumbnail|thumb|video)([_\W-]|$)~', $key );
    }

    private function post_meta_key_suggests_attachment_reference(int $post_id, string $meta_key): bool {
        return $this->meta_key_suggests_attachment_reference($meta_key);
    }

    private function value_contains_attachment_id_reference( $value, int $attachment_id, int $depth = 0 ): bool {
        if ( $depth > 6 ) {
            return false;
        }

        if ( is_array( $value ) ) {
            foreach ( $value as $item ) {
                if ( $this->value_contains_attachment_id_reference( $item, $attachment_id, $depth + 1 ) ) {
                    return true;
                }
            }

            return false;
        }

        if ( is_object( $value ) ) {
            return $this->value_contains_attachment_id_reference( get_object_vars( $value ), $attachment_id, $depth + 1 );
        }

        if ( is_int( $value ) ) {
            return $value === $attachment_id;
        }

        if ( is_float( $value ) ) {
            return (string) (int) $value === (string) $attachment_id;
        }

        if ( is_bool( $value ) || $value === null ) {
            return false;
        }

        $text = trim( (string) $value );
        if ( $text === '' ) {
            return false;
        }

        if ( $text === (string) $attachment_id ) {
            return true;
        }

        if ( function_exists( 'is_serialized' ) && is_serialized( $text ) ) {
            $unserialized = maybe_unserialize( $text );
            if ( $unserialized !== $text && $this->value_contains_attachment_id_reference( $unserialized, $attachment_id, $depth + 1 ) ) {
                return true;
            }
        }

        $first = $text[0] ?? '';
        if ( $first === '{' || $first === '[' ) {
            $decoded = json_decode( $text, true );
            if ( json_last_error() === JSON_ERROR_NONE && $this->value_contains_attachment_id_reference( $decoded, $attachment_id, $depth + 1 ) ) {
                return true;
            }
        }

        return (bool) preg_match( '~(?<![0-9])' . preg_quote( (string) $attachment_id, '~' ) . '(?![0-9])~', $text );
    }

    private function exact_attachment_id_usage( int $attachment_id ): array {
        global $wpdb;

        $id = (string) $attachment_id;

        $postmeta_rows = $wpdb->get_results(
                $wpdb->prepare(
                        "SELECT post_id, meta_key FROM {$wpdb->postmeta} WHERE post_id <> %d AND meta_value = %s LIMIT 100",
                        $attachment_id,
                        $id
                ),
                ARRAY_A
        );

        if ( is_array( $postmeta_rows ) ) {
            foreach ( $postmeta_rows as $row ) {
                $post_id  = (int) ( $row['post_id'] ?? 0 );
                $meta_key = (string) ( $row['meta_key'] ?? '' );
                if ( $post_id > 0 && $this->post_meta_key_suggests_attachment_reference( $post_id, $meta_key ) ) {
                    return [
                            'used'   => true,
                            'reason' => 'Exact attachment ID match found in media postmeta key ' . $meta_key . '.',
                            'source' => 'exact-id:postmeta',
                    ];
                }
            }
        }

        $postmeta_value_rows = $wpdb->get_results(
                $wpdb->prepare(
                        "SELECT post_id, meta_key, meta_value FROM {$wpdb->postmeta}
                         WHERE post_id <> %d
                           AND meta_value LIKE %s
                         LIMIT 1000",
                        $attachment_id,
                        '%' . $wpdb->esc_like( $id ) . '%'
                ),
                ARRAY_A
        );

        if ( is_array( $postmeta_value_rows ) ) {
            foreach ( $postmeta_value_rows as $row ) {
                $post_id    = (int) ( $row['post_id'] ?? 0 );
                $meta_key   = (string) ( $row['meta_key'] ?? '' );
                $meta_value = (string) ( $row['meta_value'] ?? '' );
                if (
                        $post_id > 0
                        && $this->post_meta_key_suggests_attachment_reference( $post_id, $meta_key )
                        && $this->value_contains_attachment_id_reference( $meta_value, $attachment_id )
                ) {
                    return [
                            'used'   => true,
                            'reason' => 'Attachment ID found inside media postmeta key ' . $meta_key . '.',
                            'source' => 'exact-id:postmeta',
                    ];
                }
            }
        }

        $option_rows = $wpdb->get_results(
                $wpdb->prepare(
                        "SELECT option_name FROM {$wpdb->options}
                         WHERE option_name NOT LIKE '_transient_%'
                           AND option_name NOT LIKE '_site_transient_%'
                           AND option_value = %s
                         LIMIT 100",
                        $id
                ),
                ARRAY_A
        );

        if ( is_array( $option_rows ) ) {
            foreach ( $option_rows as $row ) {
                $option_name = (string) ( $row['option_name'] ?? '' );
                if ( $this->meta_key_suggests_attachment_reference( $option_name ) ) {
                    return [
                            'used'   => true,
                            'reason' => 'Exact attachment ID match found in media option ' . $option_name . '.',
                            'source' => 'exact-id:options',
                    ];
                }
            }
        }

        if ( ! empty( $wpdb->termmeta ) ) {
            $termmeta_rows = $wpdb->get_results(
                    $wpdb->prepare(
                            "SELECT term_id, meta_key FROM {$wpdb->termmeta} WHERE meta_value = %s LIMIT 100",
                            $id
                    ),
                    ARRAY_A
            );

            if ( is_array( $termmeta_rows ) ) {
                foreach ( $termmeta_rows as $row ) {

                    $meta_key = (string) ( $row['meta_key'] ?? '' );


                    if ( $this->meta_key_suggests_attachment_reference( $meta_key ) ) {
                        return [
                                'used'   => true,
                                'reason' => 'Exact attachment ID match found in media termmeta key ' . $meta_key . '.',
                                'source' => 'exact-id:termmeta',
                        ];
                    }
                }
            }
        }

        if ( ! empty( $wpdb->usermeta ) ) {
            $usermeta_rows = $wpdb->get_results(
                    $wpdb->prepare(
                            "SELECT user_id, meta_key FROM {$wpdb->usermeta} WHERE meta_value = %s LIMIT 100",
                            $id
                    ),
                    ARRAY_A
            );

            if ( is_array( $usermeta_rows ) ) {
                foreach ( $usermeta_rows as $row ) {

                    $meta_key = (string) ( $row['meta_key'] ?? '' );


                    if ( $this->meta_key_suggests_attachment_reference( $meta_key ) ) {
                        return [
                                'used'   => true,
                                'reason' => 'Exact attachment ID match found in media usermeta key ' . $meta_key . '.',
                                'source' => 'exact-id:usermeta',
                        ];
                    }
                }
            }
        }

        return [
                'used'   => false,
                'reason' => '',
                'source' => 'none',
        ];
    }

    private function attachment_relative_search_needles( int $attachment_id ): array {
        $needles  = [];
        $relative = (string) get_post_meta( $attachment_id, '_wp_attached_file', true );
        if ( $relative === '' ) {
            $file = (string) get_attached_file( $attachment_id );
            if ( $file !== '' ) {
                $relative = $this->path_to_relative_upload( $file );
            }
        }

        $push_relative = function ( string $value ) use ( &$needles ): void {
            $value = $this->normalize_relative_upload_path( $value );
            if ( $value !== '' ) {
                $needles[] = $value;
            }
        };

        $push_relative( $relative );

        $meta     = wp_get_attachment_metadata( $attachment_id );
        $base_dir = $relative !== '' ? trim( dirname( $relative ), '/\\' ) : '';
        if ( is_array( $meta ) && ! empty( $meta['sizes'] ) && is_array( $meta['sizes'] ) ) {
            foreach ( $meta['sizes'] as $size ) {
                if ( ! is_array( $size ) || empty( $size['file'] ) ) {
                    continue;
                }

                $size_relative = ltrim( (string) $size['file'], '/\\' );
                if ( $base_dir !== '' && $base_dir !== '.' ) {
                    $size_relative = $base_dir . '/' . $size_relative;
                }
                $push_relative( $size_relative );
            }
        }

        $current_url = (string) wp_get_attachment_url( $attachment_id );
        $push_relative( $this->relative_upload_from_url( $current_url ) );

        $old_main_url = (string) get_post_meta( $attachment_id, '_sp_webp_original_url', true );
        $push_relative( $this->relative_upload_from_url( $old_main_url ) );

        foreach ( $this->attachment_url_map( $attachment_id ) as $old_url => $new_url ) {
            $push_relative( $this->relative_upload_from_url( (string) $old_url ) );
            $push_relative( $this->relative_upload_from_url( (string) $new_url ) );
        }

        return array_values( array_filter( array_unique( $needles ) ) );
    }

    private function attachment_url_search_needles( int $attachment_id ): array {
        $needles      = [];
        $current_url  = (string) wp_get_attachment_url( $attachment_id );
        $old_main_url = (string) get_post_meta( $attachment_id, '_sp_webp_original_url', true );

        $push = static function ( string $value ) use ( &$needles ): void {
            $value = trim( $value );
            if ( $value !== '' ) {
                $needles[] = $value;
            }
        };

        $push( $current_url );
        $push( $old_main_url );

        foreach ( $this->attachment_url_map( $attachment_id ) as $old_url => $new_url ) {
            $push( (string) $old_url );
            $push( (string) $new_url );
        }

        return array_values( array_filter( array_unique( $needles ) ) );
    }

    private function attachment_custom_table_search_needles( int $attachment_id ): array {
        return $this->attachment_database_search_needles( $attachment_id );
    }

    private function should_skip_custom_search_table( string $table ): bool {
        $table = strtolower( trim( $table ) );
        if ( $table === '' ) {
            return true;
        }

        $patterns = [
                '~(?:^|_)wf(?:_|$)~',
                '~wordfence~',
                '~actionscheduler~',
                '~duplicator~',
                '~(?:^|_)gf_form$~',
                '~(?:^|_)gf_(?:draft|entry|form_revisions|form_view|form_view_meta|form_view_stats|entry_meta|entry_notes)(?:_|$)~',
                '~gravitysmtp~',
                '~mailpoet~',
                '~rank_math_(?:analytics|internal_links|link_genius|redirections(?:_cache)?)~',
                '~rankmath_analytics~',
                '~aioseo_~',
                '~redirection_404~',
                '~trustindex~',
                '~wpmailsmtp~',
                '~_logs?(?:_|$)~',
                '~_events?(?:_|$)~',
                '~_issues?(?:_|$)~',
        ];

        foreach ( $patterns as $pattern ) {
            if ( preg_match( $pattern, $table ) ) {
                return true;
            }
        }

        return false;
    }

    private function custom_searchable_columns(): array {
        $cached = get_transient( self::UNUSED_SCHEMA_TRANSIENT );
        if (
                is_array( $cached )
                && isset( $cached['version'], $cached['schema'] )
                && (int) $cached['version'] === self::UNUSED_SCHEMA_CACHE_VERSION
                && is_array( $cached['schema'] )
        ) {
            $this->unused_schema_error = '';
            return $cached['schema'];
        }

        $this->unused_schema_error = '';

        global $wpdb;

        $rows = $wpdb->get_results(
                $wpdb->prepare(
                        "SELECT TABLE_NAME, COLUMN_NAME
							 FROM INFORMATION_SCHEMA.COLUMNS
							 WHERE TABLE_SCHEMA = %s
							   AND DATA_TYPE IN ('char','varchar','tinytext','text','mediumtext','longtext','json')
							 ORDER BY TABLE_NAME ASC, ORDINAL_POSITION ASC",
                        DB_NAME
                ),
                ARRAY_A
        );

        if ( ! is_array( $rows ) ) {
            $error = trim( (string) $wpdb->last_error );
            $this->unused_schema_error = $error !== '' ? $error : 'Unable to inspect database text columns.';
            return [];
        }

        $core_tables = array_filter( [
                $wpdb->posts,
                $wpdb->postmeta,
                $wpdb->options,
                $wpdb->commentmeta ?? '',
                $wpdb->links ?? '',
                $wpdb->sitemeta ?? '',
                $wpdb->terms ?? '',
                $wpdb->term_taxonomy ?? '',
                $wpdb->termmeta ?? '',
                $wpdb->users ?? '',
                $wpdb->usermeta ?? '',
                $wpdb->comments ?? '',
        ] );

        $schema = [];
        foreach ( $rows as $row ) {
            $table  = isset( $row['TABLE_NAME'] ) ? (string) $row['TABLE_NAME'] : '';
            $column = isset( $row['COLUMN_NAME'] ) ? (string) $row['COLUMN_NAME'] : '';
            if ( $table === '' || $column === '' ) {
                continue;
            }

            if ( in_array( $table, $core_tables, true ) ) {
                continue;
            }

            if ( $this->should_skip_custom_search_table( $table ) ) {
                continue;
            }

            $schema[ $table ][] = $column;
        }

        foreach ( $schema as $table => $columns ) {
            $schema[ $table ] = array_values( array_unique( array_filter( array_map( 'strval', $columns ) ) ) );
            if ( empty( $schema[ $table ] ) ) {
                unset( $schema[ $table ] );
            }
        }

        set_transient(
                self::UNUSED_SCHEMA_TRANSIENT,
                [
                        'version' => self::UNUSED_SCHEMA_CACHE_VERSION,
                        'schema'  => $schema,
                ],
                HOUR_IN_SECONDS
        );

        return $schema;
    }

    private function table_like_match_exists( string $table, array $columns, array $needles, string $where_sql = '1=1', array $where_params = [] ): bool {
        global $wpdb;

        $this->last_table_search_error = '';

        $columns = array_values( array_filter( array_map( 'strval', $columns ) ) );
        $needles = array_values( array_filter( array_unique( array_map( 'strval', $needles ) ) ) );
        if ( $table === '' || empty( $columns ) || empty( $needles ) ) {
            return false;
        }

        $needles = array_values(
                array_filter(
                        array_map(
                                static fn( string $needle ): string => trim( $needle ),
                                $needles
                        )
                )
        );
        if ( empty( $needles ) ) {
            return false;
        }

        $needle_chunks = array_chunk( $needles, 16 );
        foreach ( $needle_chunks as $chunk ) {
            $params = $where_params;
            $groups = [];

            foreach ( $chunk as $needle ) {
                $columns_group = [];
                foreach ( $columns as $column ) {
                    $columns_group[] = $this->quote_identifier( $column ) . ' LIKE %s';
                    $params[]        = '%' . $wpdb->esc_like( $needle ) . '%';
                }

                if ( ! empty( $columns_group ) ) {
                    $groups[] = '(' . implode( ' OR ', $columns_group ) . ')';
                }
            }

            if ( empty( $groups ) ) {
                continue;
            }

            $sql = 'SELECT 1 FROM ' . $this->quote_identifier( $table ) . ' WHERE ' . $where_sql . ' AND (' . implode( ' OR ', $groups ) . ') LIMIT 1';
            if ( ! empty( $params ) ) {
                $sql = $wpdb->prepare( $sql, ...$params );
            }

            if ( $wpdb->get_var( $sql ) ) {
                return true;
            }

            $error = trim( (string) $wpdb->last_error );
            if ( $error !== '' ) {
                $this->last_table_search_error = 'Database search failed in ' . $table . ': ' . $error;
                return false;
            }
        }

        return false;
    }

    private function normalize_filesystem_path( string $path ): string {
        $real = realpath( $path );

        return wp_normalize_path( $real ?: $path );
    }

    private function unused_filesystem_search_roots(): array {
        $roots = [];
        $seen  = [];

        $add = function ( string $label, string $path ) use ( &$roots, &$seen ): void {
            $path = trim( $path );
            if ( $path === '' || ! is_dir( $path ) ) {
                return;
            }

            $path = $this->normalize_filesystem_path( $path );
            if ( $this->should_skip_unused_filesystem_dir( $path ) ) {
                return;
            }

            if ( isset( $seen[ $path ] ) ) {
                return;
            }

            $seen[ $path ] = true;
            $roots[]       = [
                    'label' => $label,
                    'path'  => $path,
            ];
        };

        if ( function_exists( 'get_stylesheet_directory' ) ) {
            $add( 'child theme', (string) get_stylesheet_directory() );
        }

        if ( function_exists( 'get_template_directory' ) ) {
            $add( 'parent theme', (string) get_template_directory() );
        }

        if ( defined( 'WPMU_PLUGIN_DIR' ) ) {
            $add( 'mu-plugins', (string) WPMU_PLUGIN_DIR );
        }

        if ( defined( 'WP_PLUGIN_DIR' ) ) {
            $plugin_dir     = trailingslashit( (string) WP_PLUGIN_DIR );
            $active_plugins = (array) get_option( 'active_plugins', [] );

            if ( is_multisite() ) {
                $active_plugins = array_merge(
                        $active_plugins,
                        array_keys( (array) get_site_option( 'active_sitewide_plugins', [] ) )
                );
            }

            foreach ( array_unique( array_filter( array_map( 'strval', $active_plugins ) ) ) as $plugin_file ) {
                $plugin_path = $plugin_dir . ltrim( $plugin_file, '/\\' );
                if ( is_file( $plugin_path ) ) {
                    $add( 'active plugin: ' . dirname( $plugin_file ), dirname( $plugin_path ) );
                }
            }
        }

        $up = wp_get_upload_dir();
        $add( 'uploads text files', (string) ( $up['basedir'] ?? '' ) );

        return $roots;
    }

    private function should_skip_unused_filesystem_dir( string $path ): bool {
        $path = wp_normalize_path( $path );
        $name = strtolower( basename( $path ) );
        if ( $name === '' ) {
            return false;
        }

        $skip_names = [
                '.git',
                '.idea',
                '.svn',
                '.vscode',
                'advanced-custom-fields-pro',
                'ai1wm-backups',
                'all-in-one-wp-migration',
                'backup',
                'backups',
                'breeze',
                'cache',
                'caches',
                'cloudways-site-manager',
                'duplicator-pro',
                'gravityforms',
                'logs',
                'node_modules',
                'languages',
                'object-cache-pro',
                'seo-by-rank-math',
                'seo-by-rank-math-pro',
                'seraphinite-accelerator-ext',
                'tmp',
                'upgrade',
                'uploads-webpc',
                'vendor',
                'wflogs',
                'wp-mail-smtp-pro',
                'wp-reviews-plugin-for-google',
                'wpvividbackups',
        ];

        if ( in_array( $name, $skip_names, true ) ) {
            return true;
        }

        $skip_fragments = [
                '/wp-content/cache/',
                '/wp-content/uploads/cache/',
                '/wp-content/uploads/wc-logs/',
                '/wp-content/uploads/wpforms/cache/',
        ];

        foreach ( $skip_fragments as $fragment ) {
            if ( str_contains( $path . '/', $fragment ) ) {
                return true;
            }
        }

        return false;
    }

    private function is_searchable_unused_filesystem_file( string $path ): bool {
        $ext = strtolower( (string) pathinfo( $path, PATHINFO_EXTENSION ) );
        if ( $ext === '' ) {
            return false;
        }

        $allowed = [
                'cjs',
                'css',
                'csv',
                'htm',
                'html',
                'js',
                'json',
                'jsx',
                'less',
                'md',
                'mjs',
                'php',
                'phtml',
                'sass',
                'scss',
                'svg',
                'ts',
                'tsx',
                'txt',
                'webmanifest',
                'xml',
                'yaml',
                'yml',
        ];

        return in_array( $ext, $allowed, true );
    }

    private function unused_filesystem_search_files(): array {
        static $cache = null;

        if ( is_array( $cache ) ) {
            return $cache;
        }

        $files  = [];
        $errors = [];

        foreach ( $this->unused_filesystem_search_roots() as $root ) {
            $root_path  = (string) ( $root['path'] ?? '' );
            $root_label = (string) ( $root['label'] ?? 'filesystem' );
            if ( $root_path === '' ) {
                continue;
            }

            if ( ! is_readable( $root_path ) ) {
                $errors[] = 'Unreadable filesystem scan root: ' . $root_path;
                continue;
            }

            try {
                $directory = new RecursiveDirectoryIterator( $root_path, FilesystemIterator::SKIP_DOTS );
                $filter    = new RecursiveCallbackFilterIterator(
                        $directory,
                        function ( SplFileInfo $current ) use ( &$errors ): bool {
                            $path = $current->getPathname();

                            if ( $current->isLink() ) {
                                return false;
                            }

                            if ( $current->isDir() ) {
                                if ( $this->should_skip_unused_filesystem_dir( $path ) ) {
                                    return false;
                                }

                                if ( ! is_readable( $path ) ) {
                                    $errors[] = 'Unreadable filesystem scan directory: ' . $path;
                                    return false;
                                }
                            }

                            return true;
                        }
                );
                $iterator  = new RecursiveIteratorIterator( $filter );

                foreach ( $iterator as $file_info ) {
                    if ( ! $file_info instanceof SplFileInfo || ! $file_info->isFile() || $file_info->isLink() ) {
                        continue;
                    }

                    $file_path = $this->normalize_filesystem_path( $file_info->getPathname() );
                    if ( ! $this->is_searchable_unused_filesystem_file( $file_path ) ) {
                        continue;
                    }

                    if ( ! is_readable( $file_path ) ) {
                        $errors[] = 'Unreadable filesystem scan file: ' . $file_path;
                        continue;
                    }

                    $files[] = [
                            'label' => $root_label,
                            'path'  => $file_path,
                    ];
                }
            } catch ( Throwable $e ) {
                $errors[] = 'Filesystem scan failed in ' . $root_path . ': ' . $e->getMessage();
            }
        }

        $cache = [
                'files'  => $files,
                'errors' => array_values( array_unique( $errors ) ),
        ];

        return $cache;
    }

    private function file_contains_any_needle( string $file, array $needles ): ?bool {
        $needles = array_values(
                array_filter(
                        array_unique( array_map( 'strval', $needles ) ),
                        static fn( string $needle ): bool => $needle !== ''
                )
        );

        if ( empty( $needles ) ) {
            return false;
        }

        if ( ! is_readable( $file ) ) {
            return null;
        }

        $handle = @fopen( $file, 'rb' );
        if ( ! $handle ) {
            return null;
        }

        $max_needle_length = max( array_map( 'strlen', $needles ) );
        $carry_length      = max( 0, $max_needle_length - 1 );
        $carry             = '';

        while ( ! feof( $handle ) ) {
            $chunk = fread( $handle, 1024 * 1024 );
            if ( $chunk === false ) {
                fclose( $handle );
                return null;
            }

            $haystack = $carry . $chunk;
            foreach ( $needles as $needle ) {
                if ( strpos( $haystack, $needle ) !== false ) {
                    fclose( $handle );
                    return true;
                }
            }

            $carry = $carry_length > 0 ? substr( $haystack, -$carry_length ) : '';
        }

        fclose( $handle );

        return false;
    }

    private function attachment_filesystem_excluded_paths( int $attachment_id ): array {
        $excluded = [];
        $file     = (string) get_attached_file( $attachment_id );

        if ( $file !== '' ) {
            $excluded[] = $this->normalize_filesystem_path( $file );
            $meta       = wp_get_attachment_metadata( $attachment_id );
            foreach ( $this->collect_generated_size_files( $file, $meta ) as $size_file ) {
                $excluded[] = $this->normalize_filesystem_path( (string) $size_file );
            }
        }

        return array_values( array_unique( array_filter( $excluded ) ) );
    }

    private function find_attachment_filesystem_usage( int $attachment_id, array $needles ): array {
        $search = $this->unused_filesystem_search_files();
        $files  = isset( $search['files'] ) && is_array( $search['files'] ) ? $search['files'] : [];
        $errors = isset( $search['errors'] ) && is_array( $search['errors'] ) ? $search['errors'] : [];

        if ( ! empty( $errors ) ) {
            return [
                    'used'          => true,
                    'reason'        => (string) reset( $errors ) . '. Kept conservatively.',
                    'source'        => 'filesystem-error',
                    'files_checked' => 0,
            ];
        }

        if ( empty( $files ) ) {
            return [
                    'used'          => true,
                    'reason'        => 'No searchable filesystem files were available. Kept conservatively.',
                    'source'        => 'filesystem-empty',
                    'files_checked' => 0,
            ];
        }

        $excluded      = array_flip( $this->attachment_filesystem_excluded_paths( $attachment_id ) );
        $files_checked = 0;

        foreach ( $files as $file_item ) {
            $file_path = (string) ( $file_item['path'] ?? '' );
            if ( $file_path === '' || isset( $excluded[ $file_path ] ) ) {
                continue;
            }

            $files_checked ++;
            $contains = $this->file_contains_any_needle( $file_path, $needles );
            if ( $contains === null ) {
                return [
                        'used'          => true,
                        'reason'        => 'Unable to inspect filesystem file ' . $file_path . '. Kept conservatively.',
                        'source'        => 'filesystem-unreadable',
                        'files_checked' => $files_checked,
                ];
            }

            if ( $contains ) {
                return [
                        'used'          => true,
                        'reason'        => 'Reference found in filesystem file ' . $file_path . '.',
                        'source'        => 'filesystem:' . $file_path,
                        'files_checked' => $files_checked,
                ];
            }
        }

        return [
                'used'          => false,
                'reason'        => '',
                'source'        => 'filesystem',
                'files_checked' => $files_checked,
        ];
    }

    private function find_attachment_usage( int $attachment_id ): array {
        global $wpdb;
        $gutenberg = $this->gutenberg_attachment_usage($attachment_id);
        if ($gutenberg) return $gutenberg;


        $attached_file = (string) get_attached_file( $attachment_id );
        $relative      = (string) get_post_meta( $attachment_id, '_wp_attached_file', true );

        if ( $relative === '' && $attached_file === '' ) {
            return [
                    'used'   => true,
                    'reason' => 'Attachment path is empty. Kept conservatively.',
                    'source' => 'empty-path',
            ];
        }

        if ( $attached_file !== '' && ! is_file( $attached_file ) ) {
            return [
                    'used'   => true,
                    'reason' => 'Attachment file is missing on disk. Kept conservatively.',
                    'source' => 'missing-file',
            ];
        }

        $exact_usage = $this->exact_attachment_id_usage( $attachment_id );
        if ( ! empty( $exact_usage['used'] ) ) {
            return $exact_usage;
        }

        $core_needles       = $this->attachment_database_search_needles( $attachment_id );
        $custom_needles     = $this->attachment_custom_table_search_needles( $attachment_id );
        $filesystem_needles = $this->attachment_all_search_needles( $attachment_id );

        if ( empty( $core_needles ) || empty( $custom_needles ) || empty( $filesystem_needles ) ) {
            return [
                    'used'   => true,
                    'reason' => 'Reliable search needles could not be built. Kept conservatively.',
                    'source' => 'empty-needles',
            ];
        }

        $core_targets = [
                [
                        'table'   => $wpdb->posts,
                        'columns' => [ 'post_title', 'post_content', 'post_excerpt', 'post_name', 'guid' ],
                        'where'   => 'ID <> %d',
                        'params'  => [ $attachment_id ],
                        'reason'  => 'Reference found in posts table.',
                ],
                [
                        'table'   => $wpdb->postmeta,
                        'columns' => [ 'meta_value' ],
                        'needles' => $this->attachment_postmeta_search_needles( $attachment_id ),
                        'where'   => "post_id <> %d AND meta_key NOT LIKE '\\_sp\\_builder\\_import\\_backup\\_%'",
                        'params'  => [ $attachment_id ],
                        'reason'  => 'Reference found in postmeta.',
                ],
                [
                        'table'   => $wpdb->options,
                        'columns' => [ 'option_value' ],
                        'where'   => "option_name NOT LIKE '_transient_%' AND option_name NOT LIKE '_site_transient_%'",
                        'params'  => [],
                        'reason'  => 'Reference found in options.',
                ],
        ];

        if ( ! empty( $wpdb->termmeta ) ) {
            $core_targets[] = [
                    'table'   => $wpdb->termmeta,
                    'columns' => [ 'meta_value' ],
                    'where'   => '1=1',
                    'params'  => [],
                    'reason'  => 'Reference found in termmeta.',
            ];
        }

        if ( ! empty( $wpdb->term_taxonomy ) ) {
            $core_targets[] = [
                    'table'   => $wpdb->term_taxonomy,
                    'columns' => [ 'description' ],
                    'where'   => '1=1',
                    'params'  => [],
                    'reason'  => 'Reference found in term taxonomy description.',
            ];
        }

        if ( ! empty( $wpdb->usermeta ) ) {
            $core_targets[] = [
                    'table'   => $wpdb->usermeta,
                    'columns' => [ 'meta_value' ],
                    'where'   => '1=1',
                    'params'  => [],
                    'reason'  => 'Reference found in usermeta.',
            ];
        }

        if ( ! empty( $wpdb->users ) ) {
            $core_targets[] = [
                    'table'   => $wpdb->users,
                    'columns' => [ 'user_url', 'display_name' ],
                    'where'   => '1=1',
                    'params'  => [],
                    'reason'  => 'Reference found in users table.',
            ];
        }

        if ( ! empty( $wpdb->comments ) ) {
            $core_targets[] = [
                    'table'   => $wpdb->comments,
                    'columns' => [ 'comment_author', 'comment_author_url', 'comment_content' ],
                    'where'   => '1=1',
                    'params'  => [],
                    'reason'  => 'Reference found in comments.',
            ];
        }

        if ( ! empty( $wpdb->commentmeta ) ) {
            $core_targets[] = [
                    'table'   => $wpdb->commentmeta,
                    'columns' => [ 'meta_value' ],
                    'where'   => '1=1',
                    'params'  => [],
                    'reason'  => 'Reference found in commentmeta.',
            ];
        }

        if ( ! empty( $wpdb->links ) ) {
            $core_targets[] = [
                    'table'   => $wpdb->links,
                    'columns' => [ 'link_url', 'link_image', 'link_name', 'link_description', 'link_notes', 'link_rss' ],
                    'where'   => '1=1',
                    'params'  => [],
                    'reason'  => 'Reference found in links table.',
            ];
        }

        if ( ! empty( $wpdb->sitemeta ) ) {
            $core_targets[] = [
                    'table'   => $wpdb->sitemeta,
                    'columns' => [ 'meta_value' ],
                    'where'   => '1=1',
                    'params'  => [],
                    'reason'  => 'Reference found in sitemeta.',
            ];
        }

        foreach ( $core_targets as $target ) {
            $matched = $this->table_like_match_exists(
                    (string) $target['table'],
                    (array) $target['columns'],
                    (array) ( $target['needles'] ?? $core_needles ),
                    (string) $target['where'],
                    (array) $target['params']
            );

            if ( $this->last_table_search_error !== '' ) {
                return [
                        'used'   => true,
                        'reason' => $this->last_table_search_error . '. Kept conservatively.',
                        'source' => 'database-error',
                ];
            }

            if ( $matched ) {
                return [
                        'used'   => true,
                        'reason' => (string) $target['reason'],
                        'source' => (string) $target['table'],
                ];
            }
        }

        $custom_schema = $this->custom_searchable_columns();
        if ( $this->unused_schema_error !== '' ) {
            return [
                    'used'   => true,
                    'reason' => 'Custom table schema scan failed: ' . $this->unused_schema_error . '. Kept conservatively.',
                    'source' => 'schema-error',
            ];
        }

        foreach ( $custom_schema as $table => $columns ) {
            $matched = $this->table_like_match_exists( (string) $table, (array) $columns, $custom_needles );

            if ( $this->last_table_search_error !== '' ) {
                return [
                        'used'   => true,
                        'reason' => $this->last_table_search_error . '. Kept conservatively.',
                        'source' => 'database-error',
                ];
            }

            if ( $matched ) {
                return [
                        'used'   => true,
                        'reason' => 'Reference found in custom database table ' . $table . '.',
                        'source' => (string) $table,
                ];
            }
        }

        $filesystem_usage = $this->find_attachment_filesystem_usage( $attachment_id, $filesystem_needles );
        if ( ! empty( $filesystem_usage['used'] ) ) {
            return $filesystem_usage;
        }

        return [
                'used'   => false,
                'reason' => sprintf(
                        'No attachment ID, upload-path, URL, encoded URL, or filesystem references found. Core DB tables, %d custom tables, and %d static files checked.',
                        count( $custom_schema ),
                        (int) ( $filesystem_usage['files_checked'] ?? 0 )
                ),
                'source' => 'none',
        ];
    }

    private function build_unused_attachment_item( int $attachment_id, array $inspection ): array {
        $file        = (string) get_attached_file( $attachment_id );
        $relative    = (string) get_post_meta( $attachment_id, '_wp_attached_file', true );
        $label       = get_the_title( $attachment_id );
        $thumb_url   = (string) wp_get_attachment_image_url( $attachment_id, 'thumbnail' );
        $url         = (string) wp_get_attachment_url( $attachment_id );
        $parent_id   = (int) wp_get_post_parent_id( $attachment_id );
        $parent_title = $parent_id > 0 ? (string) get_the_title( $parent_id ) : '';

        if ( $relative === '' && $file !== '' ) {
            $relative = $this->path_to_relative_upload( $file );
        }

        return [
                'id'           => $attachment_id,
                'title'        => $label !== '' ? $label : 'Attachment #' . $attachment_id,
                'relative'     => $relative,
                'url'          => $url,
                'thumb_url'    => $thumb_url !== '' ? $thumb_url : $url,
                'edit_url'     => (string) get_edit_post_link( $attachment_id, '' ),
                'mime'         => (string) get_post_mime_type( $attachment_id ),
                'filesize'     => ( $file !== '' && is_file( $file ) ) ? (int) ( @filesize( $file ) ?: 0 ) : 0,
                'modified'     => ( $file !== '' && is_file( $file ) ) ? (string) wp_date( 'Y-m-d H:i:s', (int) @filemtime( $file ) ) : '',
                'parent_id'    => $parent_id,
                'parent_title' => $parent_title,
                'reason'       => (string) ( $inspection['reason'] ?? '' ),
                'file_exists'  => ( $file !== '' && is_file( $file ) ) ? 1 : 0,
        ];
    }
}
