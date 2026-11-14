<?php
namespace SiteTheme;
defined('ABSPATH') || exit;

add_action('init', function () {
		foreach ( array_unique( array_merge( [ 'page', 'post', 'service', 'tariff' ], kit_config()['postTypes'] ?? [], apply_filters( 'site_editor_post_types', [] ) ) ) as $type ) {
			register_post_meta( $type, 'site_record', [
				'single'        => true,
				'type'          => 'object',
				'show_in_rest'  => [
					'schema' => [
						'type'                 => 'object',
						'additionalProperties' => true
					]
				],
				'auth_callback' => fn() => current_user_can( 'edit_posts' )
			] );
		}
		wp_register_script( 'site-editor', get_theme_file_uri( 'build/editor.js' ), [
			'wp-blocks',
			'wp-element',
			'wp-block-editor',
			'wp-components',
			'wp-data',
			'wp-core-data',
			'wp-api-fetch',
			'wp-i18n',
			'wp-dom-ready',
			'wp-plugins',
			'wp-editor',
			'wp-rich-text',
			'wp-hooks'
		], file_exists( get_theme_file_path( 'build/editor.js' ) ) ? filemtime( get_theme_file_path( 'build/editor.js' ) ) : '1', true );
		wp_register_style( 'site-content', get_theme_file_uri( 'build/content.css' ), [], file_exists( get_theme_file_path( 'build/content.css' ) ) ? filemtime( get_theme_file_path( 'build/content.css' ) ) : '1' );
		wp_register_style( 'site-editor-ui', get_theme_file_uri( 'build/editor.css' ), [], file_exists( get_theme_file_path( 'build/editor.css' ) ) ? filemtime( get_theme_file_path( 'build/editor.css' ) ) : '1' );
	} );
	add_filter( 'block_categories_all', fn( $categories ) => array_merge( [
		[
			'slug'  => 'site',
			'title' => 'Sections'
		]
	], $categories ) );
	add_action( 'enqueue_block_editor_assets', function () {
		wp_enqueue_script( 'site-editor' );
		wp_enqueue_style( 'site-editor-ui' );
		wp_add_inline_script( 'site-editor', 'window.SITE_EDITOR_CONFIG = ' . wp_json_encode( [
				'assets'   => trailingslashit( get_theme_file_uri( 'build/assets' ) ),
				'previews' => trailingslashit( get_theme_file_uri( 'build/previews' ) ),
				'rest'     => rest_url( 'site/v1/' ),
				'admin'    => admin_url( 'post.php' ),
				'media'    => get_option( 'site_media_map', [] )
			] ) . ';', 'before' );
	} );
	add_filter( 'allowed_block_types_all', function ( $allowed, $context ) {
		if ( empty( $context->post ) || ! in_array( $context->post->post_type, [
				'page',
				'post',
				'service',
				SITE_PART_POST_TYPE, 'tariff', 'faq', 'review', ...( kit_config()['postTypes'] ?? [] ), ...apply_filters( 'site_editor_post_types', [] )
			], true ) ) {
			return $allowed;
		}

		return array_merge( array_column(component_modules(), 'name'), array_map(fn($section)=>$section['name'].'-element',section_modules()), [
			'site/booking-form','site/about-eyebrow','site/gallery-column','site/contacts-area','site/contact-details','site/contact-map',
			'core/buttons',
			'core/button','core/heading','core/paragraph','core/image','core/group','core/columns','core/column','core/list','core/list-item','core/quote','core/separator','core/spacer'
		] );
	}, 10, 2 );
