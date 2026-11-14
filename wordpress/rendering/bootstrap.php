<?php

	namespace SiteTheme;
	defined( 'ABSPATH' ) || exit;
	require_once dirname(__DIR__, 2) . '/adapters/wordpress/renderer.php';
	if ( file_exists( get_theme_file_path( 'inc/rendering/layouts.php' ) ) ) require_once get_theme_file_path( 'inc/rendering/layouts.php' );

	require_once __DIR__ . '/performance.php';
	function render_mode(): string {
		$file   = ( function_exists( 'get_theme_file_path' ) ? get_theme_file_path( 'render.config.json' ) : dirname( __DIR__, 3 ) . '/render.config.json' );
		$config = is_readable( $file ) ? json_decode( file_get_contents( $file ), true ) : [];

		return ( $config['mode'] ?? 'next' ) === 'wordpress' ? 'wordpress' : 'next';
	}

	function wordpress_site(): array {
		static $site = null;
		if ( $site !== null ) {
			return $site;
		}
		$site     = []; // Avoid recursion while serializing native wrappers in the public site document.
		$response = rest_do_request( '/site/v1/site' );
		if ( $response->is_error() ) {
			return $site;
		}
		$site            = $response->get_data();
		$site['runtime'] = [
			'modalEndpoint'   => rest_url( 'site/v1/modal/' ),
			'bookingEndpoint' => rest_url( 'site/v1/booking' ),
			'formsEndpoint'   => rest_url( 'site/v1/forms/' )
		];

		return $site;
	}

	function render_portable_block( array $attributes, string $content, \WP_Block $block ): string {
		if ( render_mode() !== 'wordpress' ) {
			return '';
		}
		$definition = Rendering\definition( $block->name );
		if ( ! $definition ) {
			return '';
		}
		$normalized                            = blocks( serialize_block( $block->parsed_block ) )[0] ?? [
			'name'        => $block->name,
			'attrs'       => $attributes,
			'innerBlocks' => []
		];
		$site                                  = wordpress_site();
		$id                                    = wp_unique_id( 'site-section-' );
		$html                                  = Rendering\nodes( $definition['template'], [
			'data'   => $normalized['attrs']['data'] ?? [],
			'blocks' => $normalized['innerBlocks'] ?? [],
			'site'   => $site
		] );
		$GLOBALS['site_wordpress_instances'][] = [ 'id' => $id, 'block' => $normalized, 'static' => !empty($definition['static']) ];

		return '<div id="' . esc_attr( $id ) . '" class="site-wordpress-section'.(!empty($definition['static'])?' site-wordpress-static':'').'">' . $html . '</div>';
	}

	add_action( 'wp_enqueue_scripts', function () {
		if ( render_mode() !== 'wordpress' ) {
			return;
		}
		$dir = get_template_directory();
		$url = get_template_directory_uri();
		foreach ( [ 'site.css', 'runtime.js' ] as $file ) {
			$path = $dir . '/build/wordpress/' . $file;
			if ( ! is_readable( $path ) ) {
				continue;
			}
			if ( str_ends_with( $file, '.css' ) ) {
				wp_enqueue_style( 'site-wordpress', $url . '/build/wordpress/assets.php/' . $file, [], filemtime( $path ) );
			} else {
				wp_enqueue_script( 'site-wordpress', $url . '/build/wordpress/assets.php/' . $file, [], filemtime( $path ), [
					'in_footer' => true,
					'strategy'  => 'defer'
				] );
			}
		}
	} );
	add_action( 'wp_footer', function () {
		if ( render_mode() !== 'wordpress' ) {
			return;
		}
		echo '<script type="application/json" id="site-wordpress-data">' . wp_json_encode( [
				'site'      => wordpress_browser_site(),
				'instances' => $GLOBALS['site_wordpress_instances'] ?? []
			], JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT ) . '</script>';
	}, 5 );
// The block theme's index.html only contains post-content; use the PHP document
// in WordPress mode so global layout slots and WordPress hooks share one shell.
	add_filter( 'template_include', function ( $template ) {
		return render_mode() === 'wordpress' ? get_template_directory() . '/index.php' : $template;
	}, 99 );
