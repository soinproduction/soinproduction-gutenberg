<?php
namespace SpWebpUploads;
defined('ABSPATH') || exit;
use GdImage;

trait Conversion {
    public function allow_webp_mime( array $mimes ): array {
        $mimes['webp'] = 'image/webp';
        return $mimes;
    }

    public function fix_webp_filetype( array $data, string $file, string $filename, $mimes = null, string $real_mime = '' ): array {
        if ( ! is_array( $mimes ) ) {
            $mimes = [];
        }

        if ( ! empty( $data['ext'] ) || ! empty( $data['type'] ) ) {
            return $data;
        }

        $ext = strtolower( (string) pathinfo( $filename, PATHINFO_EXTENSION ) );
        if ( $ext === 'webp' && wp_get_image_mime($file) === 'image/webp' ) {
            $data['ext']  = 'webp';
            $data['type'] = 'image/webp';
        }

        return $data;
    }

    private function supported_mimes_for_query( array $cfg ): array {
        return [ 'image/jpeg', 'image/png', 'image/gif' ];
    }

    private function is_supported_mime( string $mime, array $cfg ): bool {
        $mime = strtolower( trim( $mime ) );
        if ( $mime === '' ) {
            return false;
        }

        return in_array( $mime, $this->supported_mimes_for_query( $cfg ), true );
    }

    private function image_mime_from_extension( string $ext ): string {
        $ext = strtolower( ltrim( trim( $ext ), '.' ) );
        $mime_by_ext = [
                'jpg'  => 'image/jpeg',
                'jpeg' => 'image/jpeg',
                'png'  => 'image/png',
                'gif'  => 'image/gif',
                'webp' => 'image/webp',
                'svg'  => 'image/svg+xml',
        ];

        return (string) ( $mime_by_ext[ $ext ] ?? '' );
    }

    private function detect_mime( string $file, string $fallback = '' ): string {
        $mime = '';
        if ( is_file( $file ) ) {
            $mime = (string) wp_get_image_mime( $file );
            if ( $mime !== '' ) {
                return strtolower( $mime );
            }
        }

        $ext = strtolower( (string) pathinfo( $file, PATHINFO_EXTENSION ) );
        $mime_by_ext = $this->image_mime_from_extension( $ext );
        if ( $mime_by_ext !== '' ) {
            return $mime_by_ext;
        }

        $mime = strtolower( trim( $fallback ) );
        if ( $mime !== '' ) {
            return $mime;
        }

        $check = wp_check_filetype( $file );
        return strtolower( (string) ( $check['type'] ?? '' ) );
    }

    private function is_animated_gif( string $file ): bool {
        if ( ! is_readable( $file ) ) {
            return false;
        }

        $handle = fopen( $file, 'rb' );
        if ( ! $handle ) {
            return false;
        }

        $frames = 0;
        $chunk  = '';

        while ( ! feof( $handle ) && $frames < 2 ) {
            $chunk .= (string) fread( $handle, 1024 * 100 );
            $frames += preg_match_all( '#\x00\x21\xF9\x04.{4}\x00\x2C#s', $chunk, $matches );
            $chunk = substr( $chunk, -20 );
        }

        fclose( $handle );

        return $frames > 1;
    }

    private function image_dimensions( string $file ): array {
        $size = @getimagesize( $file );
        if ( ! is_array( $size ) || empty( $size[0] ) || empty( $size[1] ) ) {
            return [];
        }

        return [
                'width'  => (int) $size[0],
                'height' => (int) $size[1],
        ];
    }

    private function needs_resize_for_max_side( array $size, int $max ): bool {
        return $max > 0
               && ! empty( $size['width'] )
               && ! empty( $size['height'] )
               && ( (int) $size['width'] > $max || (int) $size['height'] > $max );
    }

    private function resized_dimensions_for_max_side( int $width, int $height, int $max ): array {
        if ( $width <= 0 || $height <= 0 || $max <= 0 ) {
            return [ 0, 0 ];
        }

        $ratio = min( $max / $width, $max / $height, 1 );

        return [
                max( 1, (int) round( $width * $ratio ) ),
                max( 1, (int) round( $height * $ratio ) ),
        ];
    }

    private function shorthand_to_bytes( string $value ): int {
        $value = trim( $value );
        if ( $value === '' ) {
            return 0;
        }

        if ( $value === '-1' ) {
            return -1;
        }

        $unit = strtolower( substr( $value, -1 ) );
        $size = (float) $value;

        if ( $unit === 'g' ) {
            $size *= 1024 * 1024 * 1024;
        } elseif ( $unit === 'm' ) {
            $size *= 1024 * 1024;
        } elseif ( $unit === 'k' ) {
            $size *= 1024;
        }

        return (int) $size;
    }

    private function has_memory_for_gd_resize( int $width, int $height, int $new_width, int $new_height ): bool {
        if ( function_exists( 'wp_raise_memory_limit' ) ) {
            wp_raise_memory_limit( 'image' );
        }

        $limit = $this->shorthand_to_bytes( (string) ini_get( 'memory_limit' ) );
        if ( $limit <= 0 ) {
            return true;
        }

        $source_pixels = $width * $height;
        $target_pixels = $new_width * $new_height;
        $needed        = (int) ceil( ( $source_pixels + $target_pixels ) * 5 + 32 * 1024 * 1024 );
        $available     = $limit - (int) memory_get_usage( true );

        return $available > $needed;
    }

    private function is_gd_image( $image ): bool {
        return is_resource( $image ) || ( class_exists( 'GdImage' ) && $image instanceof GdImage );
    }

    private function create_gd_image_from_file( string $file, string $mime ) {
        if ( $mime === 'image/jpeg' && function_exists( 'imagecreatefromjpeg' ) ) {
            return @imagecreatefromjpeg( $file );
        }

        if ( $mime === 'image/png' && function_exists( 'imagecreatefrompng' ) ) {
            return @imagecreatefrompng( $file );
        }

        if ( $mime === 'image/gif' && function_exists( 'imagecreatefromgif' ) ) {
            return @imagecreatefromgif( $file );
        }

        return false;
    }

    private function destroy_gd_image( $image ): void {
        if ( $this->is_gd_image( $image ) ) {
            imagedestroy( $image );
        }
    }

    private function prepare_resized_source_with_gd( string $file, string $mime, int $max ): array {
        $size = $this->image_dimensions( $file );
        if ( empty( $size ) ) {
            return [
                    'status'  => 'skipped',
                    'message' => 'Unable to read source image dimensions before resize',
            ];
        }

        [ $new_width, $new_height ] = $this->resized_dimensions_for_max_side( (int) $size['width'], (int) $size['height'], $max );
        if ( $new_width <= 0 || $new_height <= 0 ) {
            return [
                    'status'  => 'skipped',
                    'message' => 'Unable to calculate resized image dimensions',
            ];
        }

        if ( ! function_exists( 'imagecreatetruecolor' ) || ! function_exists( 'imagecopyresampled' ) ) {
            return [
                    'status'  => 'skipped',
                    'message' => 'Large image skipped: GD resize functions are unavailable',
            ];
        }

        if ( ! $this->has_memory_for_gd_resize( (int) $size['width'], (int) $size['height'], $new_width, $new_height ) ) {
            return [
                    'status'  => 'skipped',
                    'message' => 'Large image skipped: PHP memory is too low for safe pre-resize',
            ];
        }

        $source = $this->create_gd_image_from_file( $file, $mime );
        if ( ! $this->is_gd_image( $source ) ) {
            return [
                    'status'  => 'skipped',
                    'message' => 'Large image skipped: GD cannot open this source file',
            ];
        }

        $target = imagecreatetruecolor( $new_width, $new_height );
        if ( ! $this->is_gd_image( $target ) ) {
            $this->destroy_gd_image( $source );
            return [
                    'status'  => 'skipped',
                    'message' => 'Large image skipped: GD cannot allocate resized canvas',
            ];
        }

        imagealphablending( $target, false );
        imagesavealpha( $target, true );

        if ( ! imagecopyresampled( $target, $source, 0, 0, 0, 0, $new_width, $new_height, (int) $size['width'], (int) $size['height'] ) ) {
            $this->destroy_gd_image( $target );
            $this->destroy_gd_image( $source );
            return [
                    'status'  => 'skipped',
                    'message' => 'Large image skipped: GD resize failed',
            ];
        }

        $tmp_ext  = $mime === 'image/jpeg' ? 'jpg' : 'png';
        $tmp_file = trailingslashit( dirname( $file ) ) . '.sp-webp-pre-resize-' . wp_generate_uuid4() . '.' . $tmp_ext;
        $saved    = false;

        if ( $tmp_ext === 'jpg' && function_exists( 'imagejpeg' ) ) {
            $saved = @imagejpeg( $target, $tmp_file, 95 );
        } elseif ( function_exists( 'imagepng' ) ) {
            $saved = @imagepng( $target, $tmp_file, 6 );
        }

        $this->destroy_gd_image( $target );
        $this->destroy_gd_image( $source );

        if ( ! $saved || ! is_file( $tmp_file ) || ! @getimagesize( $tmp_file ) ) {
            if ( is_file( $tmp_file ) ) {
                @unlink( $tmp_file );
            }

            return [
                    'status'  => 'skipped',
                    'message' => 'Large image skipped: resized temporary file was not created',
            ];
        }

        return [
                'status' => 'prepared',
                'path'   => $tmp_file,
        ];
    }

    private function convert_image_file_to_webp( string $file, string $mime, array $cfg ): array {
        $result = [
                'status'       => 'skipped',
                'path'         => $file,
                'message'      => 'Skipped',
                'bytes_before' => 0,
                'bytes_after'  => 0,
                'resized'      => false,
        ];

        if ( ! is_file( $file ) || ! is_readable( $file ) ) {
            $result['status']  = 'error';
            $result['message'] = 'Source file is not readable';
            return $result;
        }

        $mime = $this->detect_mime( $file, $mime );
        if ( $mime === 'image/webp' ) {
            $result['message'] = 'Existing WebP skipped';
            return $result;
        }

        if ( ! $this->is_supported_mime( $mime, $cfg ) ) {
            $result['message'] = 'Unsupported mime type: ' . $mime;
            return $result;
        }

        if ( $mime === 'image/gif' && ! empty( $cfg['skip_animated_gif'] ) && $this->is_animated_gif( $file ) ) {
            $result['message'] = 'Animated GIF skipped';
            return $result;
        }

        $max          = (int) $cfg['max_side'];
        $working_file = $file;
        $tmp_source   = '';
        $source_size  = $this->image_dimensions( $file );
        if ( $this->needs_resize_for_max_side( $source_size, $max ) ) {
            $prepared = $this->prepare_resized_source_with_gd( $file, $mime, $max );
            if ( (string) ( $prepared['status'] ?? '' ) !== 'prepared' ) {
                $result['status']  = (string) ( $prepared['status'] ?? 'skipped' );
                $result['message'] = (string) ( $prepared['message'] ?? 'Large image skipped before conversion' );
                return $result;
            }

            $working_file       = (string) $prepared['path'];
            $tmp_source         = $working_file;
            $result['resized']  = true;
        }

        $image = wp_get_image_editor( $working_file );
        if ( is_wp_error( $image ) ) {
            if ( $tmp_source !== '' && is_file( $tmp_source ) ) {
                @unlink( $tmp_source );
            }
            $result['status']  = 'error';
            $result['message'] = $image->get_error_message();
            return $result;
        }

        $size = $image->get_size();
        if ( ! $result['resized'] && $this->needs_resize_for_max_side( $size, $max ) ) {
            $resized = $image->resize( $max, $max, false );
            if ( is_wp_error( $resized ) ) {
                if ( $tmp_source !== '' && is_file( $tmp_source ) ) {
                    @unlink( $tmp_source );
                }
                $result['status']  = 'error';
                $result['message'] = $resized->get_error_message();
                return $result;
            }
            $result['resized'] = true;
        }

        if ( method_exists( $image, 'set_quality' ) ) {
            $image->set_quality( (int) $cfg['quality'] );
        }

        $is_webp = $mime === 'image/webp' || strtolower( (string) pathinfo( $file, PATHINFO_EXTENSION ) ) === 'webp';
        $target  = $is_webp ? $file : (string) preg_replace( '~\.(jpe?g|png|gif|webp)$~i', '.webp', $file );
        $before  = (int) ( @filesize( $file ) ?: 0 );

        $target_dir = dirname( $target );
        if ( ! is_dir( $target_dir ) && ! wp_mkdir_p( $target_dir ) ) {
            if ( $tmp_source !== '' && is_file( $tmp_source ) ) {
                @unlink( $tmp_source );
            }
            $result['status']  = 'error';
            $result['message'] = 'Unable to create target directory';
            return $result;
        }

        $tmp_target  = $target . '.sp-tmp-' . wp_generate_uuid4() . '.webp';
        $result_save = $image->save( $tmp_target, 'image/webp' );

        if ( is_wp_error( $result_save ) ) {
            if ( $tmp_source !== '' && is_file( $tmp_source ) ) {
                @unlink( $tmp_source );
            }
            if ( is_file( $tmp_target ) ) {
                @unlink( $tmp_target );
            }
            $result['status']  = 'error';
            $result['message'] = $result_save->get_error_message();
            return $result;
        }

        $path = (string) ( $result_save['path'] ?? $tmp_target );
        if ( $tmp_source !== '' && is_file( $tmp_source ) ) {
            @unlink( $tmp_source );
        }

        if ( $path === '' || ! is_file( $path ) ) {
            $result['status']  = 'error';
            $result['message'] = 'WebP file was not created';
            return $result;
        }

        $bytes_after = (int) ( @filesize( $path ) ?: 0 );
        if ( $bytes_after <= 0 || ! @getimagesize( $path ) ) {
            @unlink( $path );
            $result['status']  = 'error';
            $result['message'] = 'Generated WebP file is invalid';
            return $result;
        }

        $norm_path   = wp_normalize_path( $path );
        $norm_target = wp_normalize_path( $target );
        if ( $norm_path !== $norm_target ) {
            if ( ! @rename( $path, $target ) ) {
                if ( ! @copy( $path, $target ) ) {
                    @unlink( $path );
                    $result['status']  = 'error';
                    $result['message'] = 'Unable to move converted WebP into place';
                    return $result;
                }
                @unlink( $path );
            }
            $path = $target;
        }

        $bytes_after = (int) ( @filesize( $path ) ?: 0 );
        if ( $bytes_after <= 0 || ! @getimagesize( $path ) ) {
            $result['status']  = 'error';
            $result['message'] = 'Final WebP file validation failed';
            return $result;
        }

        if ( ! $is_webp && ! empty( $cfg['delete_original'] ) ) {
            $norm_old = wp_normalize_path( $file );
            $norm_new = wp_normalize_path( $path );
            if ( $norm_old !== $norm_new && is_file( $file ) ) {
                @unlink( $file );
            }
        }

        $result['status']       = 'converted';
        $result['path']         = $path;
        $result['bytes_before'] = $before;
        $result['bytes_after']  = $bytes_after;
        $result['message']      = 'Converted';

        return $result;
    }

    private function path_to_relative_upload(string $path): string {
        $uploads = wp_get_upload_dir();
        $base = realpath((string)$uploads['basedir']);
        $target = realpath($path);
        if (!$base || !$target) return '';
        $base = trailingslashit(wp_normalize_path($base));
        $target = wp_normalize_path($target);
        return str_starts_with($target, $base) ? substr($target, strlen($base)) : '';
    }

    private function upload_url_from_path( string $path ): string {
        $relative = $this->path_to_relative_upload( $path );
        if ( $relative === '' ) {
            return '';
        }

        $up = wp_get_upload_dir();
        return trailingslashit( (string) $up['baseurl'] ) . str_replace( '\\', '/', $relative );
    }

    public function convert_on_upload( array $upload ): array {
        $cfg = $this->cfg();
        if ( empty( $cfg['enabled_upload'] ) ) {
            return $upload;
        }

        $file = isset( $upload['file'] ) ? (string) $upload['file'] : '';
        if ( $file === '' || ! is_file( $file ) ) {
            return $upload;
        }

        $mime   = isset( $upload['type'] ) ? (string) $upload['type'] : '';
        $result = $this->convert_image_file_to_webp( $file, $mime, $cfg );

        if ( $result['status'] !== 'converted' ) {
            return $upload;
        }

        $new_path = (string) $result['path'];
        if ( $new_path === '' || ! is_file( $new_path ) ) {
            return $upload;
        }

        $new_url = $this->upload_url_from_path( $new_path );
        if ( $new_url !== '' ) {
            $upload['url'] = $new_url;
        }

        $upload['file'] = $new_path;
        $upload['type'] = 'image/webp';

        return $upload;
    }

    public function make_filename_unique_for_webp( string $filename, string $ext, string $dir ): string {
        $cfg = $this->cfg();
        if ( empty( $cfg['enabled_upload'] ) ) {
            return $filename;
        }

        $ext_normalized = strtolower( ltrim( $ext, '.' ) );
        $supported_exts = [ 'jpg', 'jpeg', 'png', 'gif' ];
        if ( ! in_array( $ext_normalized, $supported_exts, true ) ) {
            return $filename;
        }

        $info = pathinfo( $filename );
        $name = $info['filename'];

        // We need to find a suffix such that neither the original image ($name . $ext)
        // nor the converted webp ($name . '.webp') exists in the directory.
        $new_filename = $filename;
        $number       = 1;

        while ( file_exists( $dir . '/' . $new_filename ) || file_exists( $dir . '/' . $name . '.webp' ) ) {
            $new_filename = $info['filename'] . '-' . $number . $ext;
            $name         = $info['filename'] . '-' . $number;
            $number++;
        }

        return $new_filename;
    }
}
