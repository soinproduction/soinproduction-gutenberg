<?php

	namespace SiteTheme;
	defined( 'ABSPATH' ) || exit;

	add_action( 'template_redirect', function () {
		if ( render_mode() === 'wordpress' || is_admin() || wp_doing_ajax() || is_feed() || is_robots() || is_trackback() || ! defined( 'SITE_FRONTEND_URL' ) ) {
			return;
		}
		if ( get_query_var( 'sitemap' ) || get_query_var( 'xsl' ) ) {
			return;
		}
		$uri   = $_SERVER['REQUEST_URI'] ?? '/';
		$path  = wp_parse_url( $uri, PHP_URL_PATH ) ?: '/';
		$query = wp_parse_url( $uri, PHP_URL_QUERY );
		wp_redirect( frontend_origin() . $path . ( $query ? '?' . $query : '' ), 302, 'WordPress' );
		exit;
	} );
