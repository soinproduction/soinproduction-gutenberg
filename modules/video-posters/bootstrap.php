<?php
    if ( ! defined( 'ABSPATH' ) ) {
        exit;
    }

    final class SP_Video_Preview {

        private const META_POSTER_ID = '_sp_video_poster_id';
        private const META_GENERATED = '_sp_video_poster_generated';

        private const META_CONTROLS = '_sp_video_controls';
        private const META_MUTED    = '_sp_video_muted';
        private const META_AUTOPLAY = '_sp_video_autoplay';
        private const META_LOOP     = '_sp_video_loop';
        private const META_PLAY_BUTTON = '_sp_video_custom_play';

        private const NONCE_ACTION = 'sp_video_preview_action';

        public static function init(): void {
            if ( is_admin() ) {
				add_action( 'admin_enqueue_scripts', [ __CLASS__, 'enqueue_admin_assets' ], 100 );
                add_filter( 'attachment_fields_to_edit', [ __CLASS__, 'attachment_fields_to_edit' ], 10, 2 );
                add_filter( 'attachment_fields_to_save', [ __CLASS__, 'attachment_fields_to_save' ], 10, 2 );

                add_action( 'wp_ajax_sp_video_preview_save_frame', [ __CLASS__, 'ajax_save_frame' ] );
                add_action( 'wp_ajax_sp_video_preview_set_existing', [ __CLASS__, 'ajax_set_existing' ] );
                add_action( 'wp_ajax_sp_video_preview_remove', [ __CLASS__, 'ajax_remove' ] );
            }

            add_filter('sp_media_video_defaults', [__CLASS__, 'media_defaults'], 10, 2);
            add_filter('wp_prepare_attachment_for_js', function($response,$attachment){if(self::is_video_attachment((int)$attachment->ID))$response['site_video_defaults']=self::media_defaults([],(int)$attachment->ID);return $response;},10,2);
            add_action('rest_api_init',function(){register_rest_field('attachment','site_video_defaults',['get_callback'=>fn($item)=>self::is_video_attachment((int)$item['id'])?self::media_defaults([],(int)$item['id']):null,'schema'=>['type'=>['object','null'],'context'=>['view','edit']]]);});
            add_filter( 'display_media_attrs', [ __CLASS__, 'display_media_attrs' ], 10, 4 );
        }

        public static function media_defaults(array $defaults,int $id): array {
            if(!self::is_video_attachment($id))return $defaults;
            return array_merge($defaults,['poster_id'=>self::poster_id($id),'poster_url'=>self::poster_url($id),
                'controls'=>self::get_video_option($id,self::META_CONTROLS,false),'muted'=>self::get_video_option($id,self::META_MUTED,true),
                'autoplay'=>self::get_video_option($id,self::META_AUTOPLAY,true),'loop'=>self::get_video_option($id,self::META_LOOP,true),'custom_play'=>self::get_video_option($id,self::META_PLAY_BUTTON,true)]);
        }

        public static function display_media_attrs( array $attrs, array $data, string $type, array $image_array ): array {
            if ( $type !== 'video' ) {
                return $attrs;
            }

            $video_id = isset( $data['id'] ) ? (int) $data['id'] : 0;

            if ( $video_id <= 0 || ! self::is_video_attachment( $video_id ) ) {
                return $attrs;
            }

            $attrs['controls'] = self::get_video_option( $video_id, self::META_CONTROLS, false );
            $attrs['muted']    = self::get_video_option( $video_id, self::META_MUTED, true );
            $attrs['autoplay'] = self::get_video_option( $video_id, self::META_AUTOPLAY, true );
            $attrs['loop']     = self::get_video_option( $video_id, self::META_LOOP, true );

            return $attrs;
        }

        private static function get_video_option( int $video_id, string $meta_key, bool $default ): bool {
            $value = get_post_meta( $video_id, $meta_key, true );

            if ( $value === '' ) {
                return $default;
            }

            return (bool) (int) $value;
        }

        public static function enqueue_admin_assets(): void {
			if (
				! wp_script_is( 'media-views', 'enqueued' )
				&& ! wp_script_is( 'media-editor', 'enqueued' )
				&& ! wp_script_is( 'media-grid', 'enqueued' )
			) {
				return;
			}

            $url = (string) apply_filters( 'sp_admin_module_assets_url', '', 'video-posters' );

            wp_enqueue_style( 'sp-video-posters', $url . '/admin.css', [], (string) filemtime( __DIR__ . '/assets/admin.css' ) );
            wp_enqueue_script( 'sp-video-posters', $url . '/admin.js', [ 'jquery', 'media-views' ], (string) filemtime( __DIR__ . '/assets/admin.js' ), true );

            $payload = [
                    'ajaxUrl' => admin_url( 'admin-ajax.php' ),
                    'nonce'   => wp_create_nonce( self::NONCE_ACTION ),
                    'i18n'    => [
                            'processing'  => 'Processing...',
                            'saving'      => 'Saving...',
                            'removing'    => 'Removing...',
                            'error'       => 'Could not complete the action.',
                            'selectImage' => 'Select poster image',
                            'useImage'    => 'Use this image',
                    ],
            ];

            wp_add_inline_script(
                    'sp-video-posters',
                    'window.SPVideoPreview=' . wp_json_encode( $payload ) . ';',
                    'before'
            );
        }

        public static function attachment_fields_to_edit( array $form_fields, WP_Post $post ): array {
            if ( ! self::is_video_attachment( (int) $post->ID ) ) {
                return $form_fields;
            }

            $video_url = wp_get_attachment_url( $post->ID );
            if ( ! $video_url ) {
                return $form_fields;
            }

            $poster_id  = self::get_poster_id( (int) $post->ID );
            $poster_url = $poster_id ? wp_get_attachment_url( $poster_id ) : '';

            $video_controls = self::get_video_option( (int) $post->ID, self::META_CONTROLS, false );
            $video_muted    = self::get_video_option( (int) $post->ID, self::META_MUTED, true );
            $video_autoplay = self::get_video_option( (int) $post->ID, self::META_AUTOPLAY, true );
            $video_loop     = self::get_video_option( (int) $post->ID, self::META_LOOP, true );
            $video_button   = self::get_video_option( (int) $post->ID, self::META_PLAY_BUTTON, true );

            ob_start();
            ?>
            <div class="sp-vp" data-attachment-id="<?php echo esc_attr( (string) $post->ID ); ?>" data-poster-url="<?php echo esc_url( $poster_url ); ?>">
                <div class="sp-vp__grid">
                    <div class="sp-vp__left">
                        <video class="sp-vp__video" src="<?php echo esc_url( $video_url ); ?>" controls preload="metadata" playsinline></video>

                        <div class="sp-vp__controls">
                            <input class="sp-vp__range" type="range" min="0" max="0" step="0.01" value="0" />
                            <span class="sp-vp__time">00:00 / 00:00</span>
                        </div>

                        <div class="sp-vp__actions">
                            <button type="button" class="button button-primary sp-vp__capture">Capture current frame</button>
                            <button type="button" class="button sp-vp__choose">Choose image</button>
                            <button type="button" class="button sp-vp__remove <?php echo $poster_id ? '' : 'is-hidden'; ?>">Remove poster</button>
                        </div>

                    </div>

                    <div class="sp-vp__right">
                        <div class="sp-vp__poster-box <?php echo $poster_url ? 'has-image' : ''; ?>">
                            <img class="sp-vp__poster" src="<?php echo esc_url( $poster_url ); ?>" alt="Poster preview" <?php echo $poster_url ? '' : 'style="display:none"'; ?> />
                            <div class="sp-vp__loader" aria-hidden="true"><span class="sp-vp__spinner"></span><span class="sp-vp__loader-text">Processing...</span></div>
                            <span class="sp-vp__empty" <?php echo $poster_url ? 'style="display:none"' : ''; ?>>No poster selected</span>
                        </div>

                        <input type="hidden" class="sp-vp__poster-id" name="attachments[<?php echo esc_attr( (string) $post->ID ); ?>][sp_video_poster_id]" value="<?php echo esc_attr( (string) $poster_id ); ?>" />

                        <input class="sp-vp__url" type="hidden" value="<?php echo esc_attr( $poster_url ); ?>" />

                        <div class="sp-vp__toggles">
                            <?php foreach ( [ 'controls' => [ 'Controls', $video_controls ], 'muted' => [ 'Muted', $video_muted ], 'autoplay' => [ 'Autoplay', $video_autoplay ], 'loop' => [ 'Loop', $video_loop ], 'custom_play' => [ 'Play button', $video_button ] ] as $key => [ $label, $checked ] ) : ?>
                                <label class="sp-vp__toggle">
                                    <span><?php echo esc_html( $label ); ?></span>
                                    <input type="checkbox" role="switch" name="attachments[<?php echo esc_attr( (string) $post->ID ); ?>][sp_video_<?php echo esc_attr( $key ); ?>]" value="1" <?php checked( $checked ); ?>>
                                </label>
                            <?php endforeach; ?>
                        </div>

                        <input type="hidden" class="sp-vp__scope-flag" name="attachments[<?php echo esc_attr( (string) $post->ID ); ?>][sp_video_scope]" value="" />
                        <div class="sp-vp__scope">
                            <p>Changes apply to this section only.</p>
                            <button type="button" class="button sp-vp__reset">Use Media Library settings</button>
                        </div>

                        <div class="sp-vp__status" aria-live="polite"></div>
                    </div>
                </div>
            </div>
            <?php
            $html = (string) ob_get_clean();

            $form_fields['sp_video_preview'] = [
                    'label'         => 'Video Poster',
                    'input'         => 'html',
                    'html'          => $html,
                    'show_in_edit'  => true,
                    'show_in_modal' => true,
            ];

            return $form_fields;
        }

        public static function attachment_fields_to_save( array $post, array $attachment ): array {
            $attachment_id = isset( $post['ID'] ) ? (int) $post['ID'] : 0;

            if ( $attachment_id <= 0 || ! self::is_video_attachment( $attachment_id ) ) {
                return $post;
            }

            if ( ! current_user_can( 'edit_post', $attachment_id ) ) {
                return $post;
            }

            // The frame opened from a section never writes global settings.
            if ( ! empty( $attachment['sp_video_scope'] ) ) {
                return $post;
            }

            if ( array_key_exists( 'sp_video_poster_id', $attachment ) ) {
                self::set_poster_id( $attachment_id, (int) $attachment['sp_video_poster_id'] );
            }

            update_post_meta( $attachment_id, self::META_CONTROLS, ! empty( $attachment['sp_video_controls'] ) ? 1 : 0 );
            update_post_meta( $attachment_id, self::META_MUTED, ! empty( $attachment['sp_video_muted'] ) ? 1 : 0 );
            update_post_meta( $attachment_id, self::META_AUTOPLAY, ! empty( $attachment['sp_video_autoplay'] ) ? 1 : 0 );
            update_post_meta( $attachment_id, self::META_LOOP, ! empty( $attachment['sp_video_loop'] ) ? 1 : 0 );
            update_post_meta( $attachment_id, self::META_PLAY_BUTTON, ! empty( $attachment['sp_video_custom_play'] ) ? 1 : 0 );

            return $post;
        }

        public static function ajax_save_frame(): void {
            self::guard_ajax();

            $attachment_id = isset( $_POST['attachment_id'] ) ? (int) $_POST['attachment_id'] : 0;
            $image_data    = isset( $_POST['image_data'] ) ? (string) $_POST['image_data'] : '';

            if ( $attachment_id <= 0 || ! self::is_video_attachment( $attachment_id ) ) {
                wp_send_json_error( [ 'message' => 'Invalid video attachment.' ], 400 );
            }

            if ( ! current_user_can( 'edit_post', $attachment_id ) ) {
                wp_send_json_error( [ 'message' => 'No permissions.' ], 403 );
            }

            if ( ! preg_match( '~^data:image/(png|jpe?g|webp);base64,(.+)$~', $image_data, $matches ) ) {
                wp_send_json_error( [ 'message' => 'Unsupported image data.' ], 400 );
            }

            $ext     = strtolower( $matches[1] );
            $encoded = str_replace( ' ', '+', $matches[2] );
            $binary  = base64_decode( $encoded, true );

            if ( $binary === false || $binary === '' ) {
                wp_send_json_error( [ 'message' => 'Broken image data.' ], 400 );
            }

            if ( strlen( $binary ) > 25 * 1024 * 1024 ) {
                wp_send_json_error( [ 'message' => 'Image is too large.' ], 413 );
            }

            if ( ! self::is_real_image( $binary ) ) {
                wp_send_json_error( [ 'message' => 'Broken image data.' ], 400 );
            }

            $video_title = sanitize_title( (string) get_the_title( $attachment_id ) );
            if ( $video_title === '' ) {
                $video_title = 'video';
            }

            $mime_map = [
                    'jpg'  => 'image/jpeg',
                    'jpeg' => 'image/jpeg',
                    'png'  => 'image/png',
                    'webp' => 'image/webp',
            ];

            $mime = $mime_map[ $ext ] ?? 'image/jpeg';

            $file_name = sprintf(
                    '%s-poster-%s.%s',
                    $video_title,
                    gmdate( 'Ymd-His' ),
                    $ext === 'jpeg' ? 'jpg' : $ext
            );

            $upload = wp_upload_bits( $file_name, null, $binary );

            if ( ! empty( $upload['error'] ) ) {
                wp_send_json_error( [ 'message' => (string) $upload['error'] ], 500 );
            }

            require_once ABSPATH . 'wp-admin/includes/image.php';

            $poster_id = wp_insert_attachment(
                    [
                            'post_mime_type' => $mime,
                            'post_title'     => sanitize_text_field( get_the_title( $attachment_id ) . ' Poster' ),
                            'post_status'    => 'inherit',
                            'post_parent'    => $attachment_id,
                    ],
                    $upload['file'],
                    $attachment_id,
                    true
            );

            if ( is_wp_error( $poster_id ) || ! $poster_id ) {
                wp_send_json_error( [ 'message' => 'Could not create image attachment.' ], 500 );
            }

            $metadata = wp_generate_attachment_metadata( $poster_id, $upload['file'] );

            if ( ! is_wp_error( $metadata ) ) {
                wp_update_attachment_metadata( $poster_id, $metadata );
            }

            // A section keeps its own frame: the video and its global poster stay untouched.
            if ( empty( $_POST['section_only'] ) ) {
                update_post_meta( $poster_id, self::META_GENERATED, 1 );
                self::set_poster_id( $attachment_id, (int) $poster_id, true );
            }

            wp_send_json_success(
                    [
                            'video_id'   => (int) $attachment_id,
                            'attachment' => wp_prepare_attachment_for_js( $attachment_id ),
                            'poster_id'  => (int) $poster_id,
                            'poster_url' => (string) wp_get_attachment_url( $poster_id ),
                    ]
            );
        }

        public static function ajax_set_existing(): void {
            self::guard_ajax();

            $attachment_id = isset( $_POST['attachment_id'] ) ? (int) $_POST['attachment_id'] : 0;
            $poster_id     = isset( $_POST['poster_id'] ) ? (int) $_POST['poster_id'] : 0;

            if ( $attachment_id <= 0 || ! self::is_video_attachment( $attachment_id ) ) {
                wp_send_json_error( [ 'message' => 'Invalid video attachment.' ], 400 );
            }

            if ( ! current_user_can( 'edit_post', $attachment_id ) ) {
                wp_send_json_error( [ 'message' => 'No permissions.' ], 403 );
            }

            if ( $poster_id <= 0 || ! self::is_image_attachment( $poster_id ) ) {
                wp_send_json_error( [ 'message' => 'Invalid poster image.' ], 400 );
            }

            if ( ! self::set_poster_id( $attachment_id, $poster_id ) ) {
                wp_send_json_error( [ 'message' => 'Could not save poster.' ], 500 );
            }

            wp_send_json_success(
                    [
                            'video_id'   => (int) $attachment_id,
                            'attachment' => wp_prepare_attachment_for_js( $attachment_id ),
                            'poster_id'  => $poster_id,
                            'poster_url' => (string) wp_get_attachment_url( $poster_id ),
                    ]
            );
        }

        public static function ajax_remove(): void {
            self::guard_ajax();

            $attachment_id = isset( $_POST['attachment_id'] ) ? (int) $_POST['attachment_id'] : 0;

            if ( $attachment_id <= 0 || ! self::is_video_attachment( $attachment_id ) ) {
                wp_send_json_error( [ 'message' => 'Invalid video attachment.' ], 400 );
            }

            if ( ! current_user_can( 'edit_post', $attachment_id ) ) {
                wp_send_json_error( [ 'message' => 'No permissions.' ], 403 );
            }

            self::set_poster_id( $attachment_id, 0 );

            wp_send_json_success(
                    [
                            'video_id'   => (int) $attachment_id,
                            'attachment' => wp_prepare_attachment_for_js( $attachment_id ),
                            'poster_id'  => 0,
                            'poster_url' => '',
                    ]
            );
        }

        private static function guard_ajax(): void {
            if ( ! current_user_can( 'upload_files' ) ) {
                wp_send_json_error( [ 'message' => 'No permissions.' ], 403 );
            }

            $nonce = isset( $_POST['nonce'] ) ? (string) $_POST['nonce'] : '';

            if ( ! wp_verify_nonce( $nonce, self::NONCE_ACTION ) ) {
                wp_send_json_error( [ 'message' => 'Bad nonce.' ], 403 );
            }
        }

        private static function is_video_attachment( int $attachment_id ): bool {
            $mime = (string) get_post_mime_type( $attachment_id );

            return $mime !== '' && str_starts_with( $mime, 'video/' );
        }

        private static function is_image_attachment( int $attachment_id ): bool {
            $mime = (string) get_post_mime_type( $attachment_id );

            return $mime !== '' && str_starts_with( $mime, 'image/' );
        }

        /** The declared data URL type proves nothing; only decoded raster images are stored. */
        public static function is_real_image( string $binary ): bool {
            $info = @getimagesizefromstring( $binary );

            return is_array( $info ) && in_array( $info['mime'] ?? '', [ 'image/jpeg', 'image/png', 'image/webp' ], true );
        }

        private static function get_poster_id( int $video_attachment_id ): int {
            $poster_id = (int) get_post_meta( $video_attachment_id, self::META_POSTER_ID, true );

            if ( $poster_id > 0 ) {
                return $poster_id;
            }

            return (int) get_post_thumbnail_id( $video_attachment_id );
        }

        private static function set_poster_id( int $video_attachment_id, int $poster_id, bool $delete_old_generated = false ): bool {
            $current = self::get_poster_id( $video_attachment_id );

            if ( $poster_id > 0 && ! self::is_image_attachment( $poster_id ) ) {
                return false;
            }

            if ( $poster_id <= 0 ) {
                delete_post_meta( $video_attachment_id, self::META_POSTER_ID );
                delete_post_thumbnail( $video_attachment_id );

                if ( $delete_old_generated && $current > 0 && (int) get_post_meta( $current, self::META_GENERATED, true ) === 1 ) {
                    wp_delete_attachment( $current, true );
                }

                return true;
            }

            update_post_meta( $video_attachment_id, self::META_POSTER_ID, $poster_id );
            set_post_thumbnail( $video_attachment_id, $poster_id );

            if ( $delete_old_generated && $current > 0 && $current !== $poster_id && (int) get_post_meta( $current, self::META_GENERATED, true ) === 1 ) {
                wp_delete_attachment( $current, true );
            }

            return true;
        }

        private static function normalize_video_attachment_id( $video ): int {
            if ( is_array( $video ) ) {
                if ( isset( $video['ID'] ) ) {
                    $video = $video['ID'];
                } elseif ( isset( $video['url'] ) ) {
                    $video = $video['url'];
                }
            }

            if ( is_numeric( $video ) ) {
                $id = (int) $video;

                return self::is_video_attachment( $id ) ? $id : 0;
            }

            if ( is_string( $video ) && $video !== '' ) {
                $id = (int) attachment_url_to_postid( $video );

                return self::is_video_attachment( $id ) ? $id : 0;
            }

            return 0;
        }

        public static function poster_id( $video ): int {
            $video_id = self::normalize_video_attachment_id( $video );

            if ( $video_id <= 0 ) {
                return 0;
            }

            $poster_id = self::get_poster_id( $video_id );

            return self::is_image_attachment( $poster_id ) ? $poster_id : 0;
        }

        public static function poster_url( $video, string $size = 'full' ): string {
            $poster_id = self::poster_id( $video );

            if ( $poster_id <= 0 ) {
                return '';
            }

            if ( $size !== 'full' ) {
                $by_size = wp_get_attachment_image_url( $poster_id, $size );

                if ( $by_size ) {
                    return (string) $by_size;
                }
            }

            return (string) wp_get_attachment_url( $poster_id );
        }
   }

    SP_Video_Preview::init();

    if ( ! function_exists( 'sp_video_poster_id' ) ) {
        function sp_video_poster_id( $video ): int {
            return SP_Video_Preview::poster_id( $video );
        }
    }

    if ( ! function_exists( 'sp_video_poster_url' ) ) {
        function sp_video_poster_url( $video, string $size = 'full' ): string {
            return SP_Video_Preview::poster_url( $video, $size );
        }
    }
