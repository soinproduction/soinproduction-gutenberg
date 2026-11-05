<?php
namespace SpWebpUploads;
defined('ABSPATH') || exit;
use WP_Post;

trait Admin {
    private function replace_button_html( int $attachment_id, string $label = 'Replace file' ): string {
        return sprintf(
                '<button type="button" class="button sp-webp-replace-trigger" data-attachment-id="%d" data-attachment-mime="%s">%s</button>',
                $attachment_id,
                esc_attr( (string) get_post_mime_type( $attachment_id ) ),
                esc_html( $label )
        );
    }

    public function media_row_replace_action( array $actions, WP_Post $post ): array {
        if ( ! $this->is_replaceable_attachment_post( $post ) || ! $this->current_user_can_replace_attachment( (int) $post->ID ) ) {
            return $actions;
        }

        $actions['sp_webp_replace_file'] = sprintf(
                '<a href="#" class="sp-webp-replace-trigger" data-attachment-id="%d" data-attachment-mime="%s">%s</a>',
                (int) $post->ID,
                esc_attr( (string) get_post_mime_type( $post ) ),
                esc_html__( 'Replace file', 'sp-webp-convert' )
        );

        return $actions;
    }

    public function attachment_replace_field( array $form_fields, WP_Post $post ): array {
        if ( ! $this->is_replaceable_attachment_post( $post ) || ! $this->current_user_can_replace_attachment( (int) $post->ID ) ) {
            return $form_fields;
        }

        $form_fields['sp_webp_replace_file'] = [
                'label' => esc_html__( 'Replace file', 'sp-webp-convert' ),
                'input' => 'html',
                'html'  => $this->replace_button_html( (int) $post->ID ) . '<p class="description">Uploads a new file into the existing attachment path. ID, title, slug, alt, caption, filename, and URL stay unchanged. WebP attachments accept WebP, PNG, or JPEG; PNG/JPEG files are converted to WebP.</p>',
        ];

        return $form_fields;
    }

    public function menu(): void {
        add_media_page(
                'Uploads WebP Convert',
                '<span style="display:flex;align-items:center;gap:6px">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24">
                  <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m14.3 16-1.7-1.7q-1-1.1-1.7-1.4H9.7q-.6.2-1.7 1.4l-4 4m10.3-2.4.3-.3q1-1.2 1.7-1.3h1.2q.6.1 1.7 1.4l.8.8m-5.7-.6 4 4m0 0-1.5.1H7.2q-1.6 0-2.1-.2a1.8 1.8 0 0 1-1-1.5M18.2 20a2 2 0 0 0 1.5-1q.3-.6.2-2.2v-.3M12.5 4H7.2q-1.6 0-2.1.2a2 2 0 0 0-.9.9Q4 5.6 4 7.2v11.1m16-6.8v5M14 10l2-.4h.4l.2-.2.2-.2L21 5a1.4 1.4 0 0 0-2-2l-4.2 4.2-.2.2-.1.2-.1.4z"/>
                </svg>
               Uploads WebP
            </span>',
                'manage_options',
                self::PAGE_SLUG,
                [ $this, 'page' ]
        );
    }

    private function should_load_replace_assets(string $hook): bool {
        return current_user_can('upload_files') && in_array($hook, ['upload.php','post.php','post-new.php'], true);
    }

    private function enqueue_replace_assets(): void {
        wp_register_style( 'sp-webp-replace-admin', false, [], self::VERSION );
        wp_enqueue_style( 'sp-webp-replace-admin' );
        wp_add_inline_style(
                'sp-webp-replace-admin',
                '.sp-webp-replace-trigger{min-height:36px;border-color:var(--sp-admin-border-strong,#d6dbe1);border-radius:var(--sp-admin-radius-sm,9px);background:var(--sp-admin-surface,#fff);color:var(--sp-admin-text,#1a1f24);font-weight:600}.sp-webp-replace-trigger:hover,.sp-webp-replace-trigger:focus{border-color:var(--sp-admin-accent,#3858e9);background:var(--sp-admin-accent-soft,#edf0ff);color:var(--sp-admin-accent-hover,#2145e6)}.sp-webp-replace-trigger:focus{box-shadow:var(--sp-admin-focus,0 0 0 3px rgba(56,88,233,.18))}.sp-webp-replace-trigger.is-busy{opacity:.65;pointer-events:none}.sp-webp-replace-status{display:inline-block;margin-left:8px;color:var(--sp-admin-muted,#525b66)}.compat-field-sp_webp_replace_file .field{display:flex;align-items:center;gap:8px;flex-wrap:wrap}'
        );

        wp_register_script( 'sp-webp-replace-admin', false, [ 'jquery' ], self::VERSION, true );
        wp_enqueue_script( 'sp-webp-replace-admin' );

        $data = [
                'ajaxUrl'       => admin_url( 'admin-ajax.php' ),
                'nonce'         => wp_create_nonce( self::NONCE_ACTION ),
                'maxUploadSize' => (int) wp_max_upload_size(),
                'confirm'       => 'Replace this attachment file? The attachment ID, title, slug, filename, URL, alt, and caption will stay unchanged. PNG or JPEG replacements for a WebP attachment will be converted to WebP.',
        ];

        wp_add_inline_script(
                'sp-webp-replace-admin',
                'window.spWebpReplace=' . wp_json_encode( $data ) . ';' . $this->replace_admin_script()
        );
    }

    private function replace_admin_script(): string {
        return (string)file_get_contents(__DIR__.'/assets/replace.js');
    }

    public function admin_assets( string $hook ): void {
        $is_settings = $hook === 'media_page_' . self::PAGE_SLUG;
        $is_replace  = $this->should_load_replace_assets( $hook );

        if ( ! $is_settings && ! $is_replace ) {
            return;
        }

        wp_enqueue_script( 'jquery' );
        if ($is_settings) {
            $base = rtrim((string)apply_filters('sp_webp_assets_url', ''), '/');
            wp_enqueue_style('sp-webp-admin', $base.'/admin.css', [], filemtime(__DIR__.'/assets/admin.css'));
            wp_enqueue_script('sp-webp-admin', $base.'/admin.js', ['jquery'], self::VERSION, true);
            wp_add_inline_script('sp-webp-admin', 'window.spWebpUploads='.wp_json_encode(['nonce'=>wp_create_nonce(self::NONCE_ACTION)]).';', 'before');
        }


        if ( $is_replace ) {
            $this->enqueue_replace_assets();
        }
    }

    public function page(): void {
        if (!current_user_can('manage_options')) return;
        require __DIR__.'/views/page.php';
    }
}
