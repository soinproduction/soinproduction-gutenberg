<?php
namespace SpWebpUploads;
defined('ABSPATH') || exit;
use WP_Post;

trait Attachments {
    private function count_supported_attachments( array $cfg ): int {
        global $wpdb;

        $mimes = $this->supported_mimes_for_query( $cfg );
        if ( empty( $mimes ) ) {
            return 0;
        }

        $placeholders = implode( ',', array_fill( 0, count( $mimes ), '%s' ) );
        $sql = $wpdb->prepare(
                "SELECT COUNT(ID) FROM {$wpdb->posts} WHERE post_type='attachment' AND post_status='inherit' AND post_mime_type IN ($placeholders)",
                ...$mimes
        );

        return (int) $wpdb->get_var( $sql );
    }

    private function query_next_attachment_ids( int $after_id, int $limit, array $cfg ): array {
        global $wpdb;

        $limit = min( 100, max( 1, $limit ) );
        $mimes = $this->supported_mimes_for_query( $cfg );
        if ( empty( $mimes ) ) {
            return [];
        }

        $placeholders = implode( ',', array_fill( 0, count( $mimes ), '%s' ) );
        $params       = array_merge( $mimes, [ $after_id, $limit ] );

        $sql = $wpdb->prepare(
                "SELECT ID FROM {$wpdb->posts} WHERE post_type='attachment' AND post_status='inherit' AND post_mime_type IN ($placeholders) AND ID > %d ORDER BY ID ASC LIMIT %d",
                ...$params
        );

        $ids = $wpdb->get_col( $sql );
        if ( ! is_array( $ids ) ) {
            return [];
        }

        return array_values( array_filter( array_map( 'intval', $ids ) ) );
    }

    private function collect_generated_size_files( string $base_file, $meta ): array {
        if ( ! is_array( $meta ) || empty( $meta['sizes'] ) || ! is_array( $meta['sizes'] ) ) {
            return [];
        }

        $dir   = trailingslashit( dirname( $base_file ) );
        $files = [];

        foreach ( $meta['sizes'] as $size ) {
            if ( ! is_array( $size ) || empty( $size['file'] ) ) {
                continue;
            }

            $files[] = $dir . ltrim( (string) $size['file'], '/\\' );
        }

        return array_values( array_unique( $files ) );
    }

    private function delete_stale_files( string $old_file, array $old_sizes, string $new_file, array $new_sizes ): void {
        $keep = [];
        foreach ( array_merge( [ $new_file ], $new_sizes ) as $path ) {
            $keep[ wp_normalize_path( $path ) ] = true;
        }

        foreach ( array_merge( [ $old_file ], $old_sizes ) as $path ) {
            $normalized = wp_normalize_path( $path );
            if ( isset( $keep[ $normalized ] ) ) {
                continue;
            }

            if ( is_file( $path ) ) {
                @unlink( $path );
            }
        }
    }

    private function is_replaceable_attachment_post( $post ): bool {
        if ( ! $post instanceof WP_Post || $post->post_type !== 'attachment' ) {
            return false;
        }

        $mime = strtolower( (string) get_post_mime_type( $post ) );
        return str_starts_with( $mime, 'image/' );
    }

    private function current_user_can_replace_attachment( int $attachment_id ): bool {
        return current_user_can( 'upload_files' ) && current_user_can( 'edit_post', $attachment_id );
    }

    private function replacement_supported_mimes(): array {
        return [
                'image/gif',
                'image/jpeg',
                'image/png',
                'image/svg+xml',
                'image/webp',
        ];
    }

    private function detect_replacement_upload_mime( string $tmp_file, string $original_name ): string {
        $mime = $this->detect_mime( $tmp_file );
        if ( $mime !== '' ) {
            return $mime;
        }

        return $this->image_mime_from_extension( (string) pathinfo( $original_name, PATHINFO_EXTENSION ) );
    }

    private function uploaded_svg_looks_valid(string $file): bool {
        return is_readable($file) && (bool)apply_filters('sp_webp_valid_replacement_svg', false, $file);
    }

    private function replacement_mime_matches_attachment( string $current_mime, string $replacement_mime ): bool {
        $current_mime     = strtolower( trim( $current_mime ) );
        $replacement_mime = strtolower( trim( $replacement_mime ) );

        if ( $current_mime === $replacement_mime ) {
            return true;
        }

        return $current_mime === 'image/jpg' && $replacement_mime === 'image/jpeg';
    }

    private function replacement_can_convert_to_webp( string $current_mime, string $replacement_mime ): bool {
        $current_mime     = strtolower( trim( $current_mime ) );
        $replacement_mime = strtolower( trim( $replacement_mime ) );

        return $current_mime === 'image/webp'
               && in_array( $replacement_mime, [ 'image/jpeg', 'image/png' ], true );
    }

    private function fallback_attachment_metadata( string $file, string $relative, string $mime ): array {
        $meta = [
                'file'  => $relative,
                'sizes' => [],
        ];

        if ( $mime !== 'image/svg+xml' ) {
            $size = @getimagesize( $file );
            if ( is_array( $size ) ) {
                $meta['width']  = (int) ( $size[0] ?? 0 );
                $meta['height'] = (int) ( $size[1] ?? 0 );
            }
        }

        return $meta;
    }

    private function replace_attachment_file_in_place( int $attachment_id, array $upload ): array {
        $post = get_post( $attachment_id );
        if ( ! $this->is_replaceable_attachment_post( $post ) ) {
            return [
                    'status'  => 'error',
                    'message' => 'Attachment is not an image.',
            ];
        }

        if ( ! $this->current_user_can_replace_attachment( $attachment_id ) ) {
            return [
                    'status'  => 'error',
                    'message' => 'You are not allowed to replace this attachment.',
            ];
        }

        $current_file = (string) get_attached_file( $attachment_id );
        if ( $current_file === '' || ! is_file( $current_file ) || ! is_writable( $current_file ) ) {
            return [
                    'status'  => 'error',
                    'message' => 'Current attachment file is missing or not writable.',
            ];
        }

        $relative = $this->path_to_relative_upload( $current_file );
        if ( $relative === '' ) {
            return [
                    'status'  => 'error',
                    'message' => 'Current attachment is outside the uploads directory.',
            ];
        }

        $error_code = (int) ( $upload['error'] ?? UPLOAD_ERR_NO_FILE );
        if ( $error_code !== UPLOAD_ERR_OK ) {
            return [
                    'status'  => 'error',
                    'message' => 'Replacement upload failed with code ' . $error_code . '.',
            ];
        }

        $tmp_file = isset( $upload['tmp_name'] ) ? (string) $upload['tmp_name'] : '';
        if ( $tmp_file === '' || ! is_uploaded_file( $tmp_file ) || ! is_readable( $tmp_file ) ) {
            return [
                    'status'  => 'error',
                    'message' => 'Replacement upload is missing or unreadable.',
            ];
        }

        $max_size = (int) wp_max_upload_size();
        $size     = (int) ( $upload['size'] ?? 0 );
        if ( $max_size > 0 && $size > $max_size ) {
            return [
                    'status'  => 'error',
                    'message' => 'Replacement file exceeds the maximum upload size.',
            ];
        }

        $current_mime     = $this->detect_mime( $current_file, (string) get_post_mime_type( $attachment_id ) );
        $replacement_mime = $this->detect_replacement_upload_mime( $tmp_file, (string) ( $upload['name'] ?? '' ) );
        if ( ! in_array( $replacement_mime, $this->replacement_supported_mimes(), true ) ) {
            return [
                    'status'  => 'error',
                    'message' => 'Replacement file type is not supported.',
            ];
        }

        $convert_to_webp = $this->replacement_can_convert_to_webp( $current_mime, $replacement_mime );
        if ( ! $this->replacement_mime_matches_attachment( $current_mime, $replacement_mime ) && ! $convert_to_webp ) {
            return [
                    'status'  => 'error',
                    'message' => 'Use the same image format. Existing WebP attachments also accept PNG or JPEG and convert them to WebP automatically.',
            ];
        }

        if ( $replacement_mime === 'image/svg+xml' ) {
            if ( ! $this->uploaded_svg_looks_valid( $tmp_file ) ) {
                return [
                        'status'  => 'error',
                        'message' => 'Replacement SVG does not look valid.',
                ];
            }
        } elseif ( ! @getimagesize( $tmp_file ) ) {
            return [
                    'status'  => 'error',
                    'message' => 'Replacement file is not a readable image.',
            ];
        }

        require_once ABSPATH . 'wp-admin/includes/image.php';

        $old_meta       = wp_get_attachment_metadata( $attachment_id );
        $old_size_files = $this->collect_generated_size_files( $current_file, $old_meta );
        $tmp_target     = trailingslashit( dirname( $current_file ) ) . '.sp-replace-' . wp_generate_uuid4() . '.' . strtolower( (string) pathinfo( $current_file, PATHINFO_EXTENSION ) );
        $stored_mime    = $replacement_mime;

        if ( $convert_to_webp ) {
            $image = wp_get_image_editor( $tmp_file );
            if ( is_wp_error( $image ) ) {
                return [
                        'status'  => 'error',
                        'message' => 'Unable to open the replacement image for WebP conversion: ' . $image->get_error_message(),
                ];
            }

            if ( method_exists( $image, 'set_quality' ) ) {
                $cfg = $this->cfg();
                $image->set_quality( (int) $cfg['quality'] );
            }

            $saved = $image->save( $tmp_target, 'image/webp' );
            if ( is_wp_error( $saved ) || ! is_file( $tmp_target ) || $this->detect_mime( $tmp_target ) !== 'image/webp' ) {
                if ( is_file( $tmp_target ) ) {
                    @unlink( $tmp_target );
                }

                return [
                        'status'  => 'error',
                        'message' => is_wp_error( $saved )
                                ? 'Unable to convert the replacement image to WebP: ' . $saved->get_error_message()
                                : 'Unable to create a valid WebP replacement file.',
                ];
            }

            $stored_mime = 'image/webp';
        } elseif ( ! @copy( $tmp_file, $tmp_target ) || ! is_file( $tmp_target ) ) {
            if ( is_file( $tmp_target ) ) {
                @unlink( $tmp_target );
            }

            return [
                    'status'  => 'error',
                    'message' => 'Unable to prepare replacement file.',
            ];
        }

        $perms = @fileperms( $current_file );
        if ( $perms ) {
            @chmod( $tmp_target, $perms & 0777 );
        }

        if ( ! @rename( $tmp_target, $current_file ) ) {
            @unlink( $tmp_target );
            return [
                    'status'  => 'error',
                    'message' => 'Unable to overwrite current attachment file.',
            ];
        }

        wp_update_post( [
                'ID'             => $attachment_id,
                'post_mime_type' => $stored_mime,
        ] );

        $new_meta = wp_generate_attachment_metadata( $attachment_id, $current_file );
        if ( is_wp_error( $new_meta ) || ! is_array( $new_meta ) ) {
            $new_meta = $this->fallback_attachment_metadata( $current_file, $relative, $stored_mime );
        }

        if ( empty( $new_meta['file'] ) ) {
            $new_meta['file'] = $relative;
        }

        wp_update_attachment_metadata( $attachment_id, $new_meta );

        $new_size_files = $this->collect_generated_size_files( $current_file, $new_meta );
        $this->delete_stale_files( $current_file, $old_size_files, $current_file, $new_size_files );

        clean_post_cache( $attachment_id );
        delete_transient( self::URL_MAP_TRANSIENT );
        delete_transient( self::UNUSED_SCHEMA_TRANSIENT );

        $preview_url = (string) wp_get_attachment_image_url( $attachment_id, 'thumbnail' );
        if ( $preview_url === '' ) {
            $preview_url = (string) wp_get_attachment_url( $attachment_id );
        }

        return [
                'status'      => 'replaced',
                'message'     => $convert_to_webp
                        ? 'Replacement image converted to WebP and installed. ID, title, slug, filename, URL, alt, caption, and metadata fields were kept.'
                        : 'Attachment file replaced. ID, title, slug, filename, URL, alt, caption, and metadata fields were kept.',
                'preview_url' => add_query_arg( 'sp-replaced', time(), $preview_url ),
        ];
    }

    private function convert_attachment( int $attachment_id, array $cfg ): array {
        $file = (string) get_attached_file( $attachment_id );
        if ($file && $this->path_to_relative_upload($file) === '') {
            return ['status'=>'skipped','message'=>'Attachment is outside the uploads directory.','bytes_saved'=>0];
        }

        if ( $file === '' || ! is_file( $file ) ) {
            return [
                    'status'     => 'skipped',
                    'message'    => 'Attachment file missing',
                    'bytes_saved'=> 0,
            ];
        }

        $mime = $this->detect_mime( $file, (string) get_post_mime_type( $attachment_id ) );
        if ( ! $this->is_supported_mime( $mime, $cfg ) ) {
            return [
                    'status'     => 'skipped',
                    'message'    => 'Unsupported mime type: ' . $mime,
                    'bytes_saved'=> 0,
            ];
        }

        $old_file      = $file;
        $old_meta      = wp_get_attachment_metadata( $attachment_id );
        $old_size_files = $this->collect_generated_size_files( $old_file, $old_meta );
        $old_main_url   = $this->upload_url_from_path( $old_file );
        $old_ext        = strtolower( (string) pathinfo( $old_file, PATHINFO_EXTENSION ) );

        $conversion = $this->convert_image_file_to_webp( $file, $mime, $cfg );
        if ( $conversion['status'] !== 'converted' ) {
            return [
                    'status'     => $conversion['status'],
                    'message'    => (string) $conversion['message'],
                    'bytes_saved'=> 0,
            ];
        }

        $new_file = (string) $conversion['path'];
        if ( $new_file === '' || ! is_file( $new_file ) ) {
            return [
                    'status'     => 'error',
                    'message'    => 'Converted file missing after save',
                    'bytes_saved'=> 0,
            ];
        }

        $relative = $this->path_to_relative_upload( $new_file );
        if ( $relative === '' ) {
            return [
                    'status'     => 'error',
                    'message'    => 'Unable to resolve upload-relative path',
                    'bytes_saved'=> 0,
            ];
        }

        require_once ABSPATH . 'wp-admin/includes/image.php';

        update_attached_file( $attachment_id, $relative );
        wp_update_post( [
                'ID'             => $attachment_id,
                'post_mime_type' => 'image/webp',
        ] );

        $new_meta = wp_generate_attachment_metadata( $attachment_id, $new_file );
        if ( is_wp_error( $new_meta ) ) {
            $size = @getimagesize( $new_file );
            $new_meta = [
                    'width'  => (int) ( $size[0] ?? 0 ),
                    'height' => (int) ( $size[1] ?? 0 ),
                    'file'   => $relative,
                    'sizes'  => [],
            ];
        }

        wp_update_attachment_metadata( $attachment_id, $new_meta );

        if ( $old_ext !== '' && $old_ext !== 'webp' ) {
            update_post_meta( $attachment_id, '_sp_webp_original_ext', $old_ext );
        }
        if ( $old_main_url !== '' ) {
            update_post_meta( $attachment_id, '_sp_webp_original_url', $old_main_url );
        }

        if ( ! empty( $cfg['delete_original'] ) ) {
            $new_size_files = $this->collect_generated_size_files( $new_file, $new_meta );
            $this->delete_stale_files( $old_file, $old_size_files, $new_file, $new_size_files );
        }

        $bytes_before = (int) ( $conversion['bytes_before'] ?? 0 );
        $bytes_after  = (int) ( $conversion['bytes_after'] ?? 0 );
        $bytes_saved  = max( 0, $bytes_before - $bytes_after );
        delete_transient( self::URL_MAP_TRANSIENT );

        return [
                'status'      => 'converted',
                'message'     => ! empty( $conversion['resized'] ) ? 'Converted and resized' : 'Converted',
                'bytes_saved' => $bytes_saved,
        ];
    }
}
