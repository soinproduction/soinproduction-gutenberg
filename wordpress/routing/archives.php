<?php

	namespace SiteTheme;
	defined( 'ABSPATH' ) || exit;
	function archive_types() {
		return array_filter( get_post_types( [ 'public' => true ], 'objects' ), fn( $type ) => ! in_array( $type->name, [
			'page',
			'attachment'
		], true ) );
	}

	function archive_pages() {
		$map   = [];
		$types = archive_types();
		foreach ( (array) get_option( 'site_archive_pages', [] ) as $type => $id ) {
			$page = get_post( (int) $id );
			if ( isset( $types[ $type ] ) && $page && $page->post_type === 'page' && $page->post_status === 'publish' && ! $page->post_password && $page->ID !== (int) get_option( 'page_on_front' ) ) {
				$map[ $type ] = $page;
			}
		}

		return $map;
	}

	function public_path( $url ) {
		return '/' . trim( (string) wp_parse_url( $url, PHP_URL_PATH ), '/' );
	}

	function frontend_url( $path ) {
		return rtrim( render_mode() !== 'wordpress' && defined( 'SITE_FRONTEND_URL' ) ? frontend_origin() : home_url(), '/' ) . '/' . ltrim( $path, '/' );
	}

	function frontend_link( $url, $post ) {
		$post = get_post( $post );
		if ( ! $post || ! is_post_type_viewable( $post->post_type ) ) {
			return $url;
		}
		$archives = archive_pages();
		if ( $post->post_type === 'page' ) {
			$path = $post->ID === (int) get_option( 'page_on_front' ) ? '/' : '/' . get_page_uri( $post );
		} elseif ( isset( $archives[ $post->post_type ] ) ) {
			$path = '/' . get_page_uri( $archives[ $post->post_type ] ) . '/' . $post->post_name;
		} else {
			$path  = public_path( $url );
			$query = wp_parse_url( $url, PHP_URL_QUERY );
			if ( $query ) {
				$path .= '?' . $query;
			}
		}

		return frontend_url( $path );
	}

	add_filter( 'page_link', __NAMESPACE__ . '\\frontend_link', 10, 2 );
	add_filter( 'post_link', __NAMESPACE__ . '\\frontend_link', 10, 2 );
	add_filter( 'post_type_link', __NAMESPACE__ . '\\frontend_link', 10, 2 );
	add_filter( 'post_type_archive_link', function ( $url, $type ) {
		$page = archive_pages()[ $type ] ?? null;

		return $page ? get_permalink( $page ) : $url;
	}, 10, 2 );
	/** Pages win collisions. Every single URL is verified against its assigned archive. */
	function resolve_public_page( $path, $native = true ) {
		$path = trim( rawurldecode( (string) $path ), '/' );
		if ( $path === '' ) {
			$page = get_post( (int) get_option( 'page_on_front' ) );

			return $page && $page->post_status === 'publish' ? $page : null;
		}
		$page = get_page_by_path( $path, OBJECT, 'page' );
		if ( $page && $page->post_status === 'publish' && $page->ID !== (int) get_option( 'page_on_front' ) ) {
			return $page;
		}
		foreach ( archive_pages() as $type => $archive ) {
			$base = get_page_uri( $archive ) . '/';
			if ( ! str_starts_with( $path, $base ) ) {
				continue;
			}
			$slug = substr( $path, strlen( $base ) );
			if ( ! $slug || str_contains( $slug, '/' ) ) {
				continue;
			}
			$post = get_page_by_path( $slug, OBJECT, $type );
			if ( $post && $post->post_status === 'publish' ) {
				return $post;
			}
		}
		if ( $native ) {
			$id   = url_to_postid( home_url( '/' . $path ) );
			$post = $id ? get_post( $id ) : null;
			if ( $post && $post->post_status === 'publish' && is_post_type_viewable( $post->post_type ) && public_path( get_permalink( $post ) ) === '/' . $path ) {
				return $post;
			}
		}

		return null;
	}

	add_action( 'parse_request', function ( $wp ) {
		if ( ! empty( $wp->query_vars['sitemap'] ) || ! empty( $wp->query_vars['xsl'] ) ) {
			return;
		}
		$post = resolve_public_page( $wp->request, false );
		if ( ! $post ) {
			return;
		}
		$wp->query_vars = $post->post_type === 'page' ? [ 'page_id' => $post->ID ] : [
			'post_type' => $post->post_type,
			'p'         => $post->ID
		];
	} );
	add_filter( 'display_post_states', function ( $states, $post ) {
		foreach ( archive_pages() as $type => $page ) {
			if ( $page->ID === $post->ID ) {
				$states[] = archive_types()[ $type ]->labels->name . ' archive';
			}
		}

		return $states;
	}, 10, 2 );
