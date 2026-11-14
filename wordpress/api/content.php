<?php
namespace SiteTheme;
defined('ABSPATH') || exit;

add_action( 'rest_api_init', function () {
		register_rest_route( 'site/v1', '/site', [
			'methods'             => 'GET',
			'permission_callback' => '__return_true',
			'callback'            => function () {
				$parts = [];
				foreach ( published( SITE_PART_POST_TYPE ) as $p ) {
					$parts[ $p->post_name ] = blocks( $p->post_content );
				}
				$settings = studio_options();
                $tariffs = function_exists(__NAMESPACE__ . '\\Booking\\tariff_records') ? Booking\tariff_records() : [];
                $settings['plans']=array_map(function($tariff){$plan=$tariff['data'];foreach(['name','note','unit'] as $key)if(isset($plan[$key]))$plan[$key]=wp_strip_all_tags($plan[$key]);$plan['features']=array_map('wp_strip_all_tags',$plan['features']??[]);return $plan;},$tariffs);

				return [
					'meta' => [
                        'title' => get_bloginfo('name'),
                        'description' => get_bloginfo('description'),
                        'icons' => has_site_icon() ? [
                            'icon' => [
                                ['url'=>get_site_icon_url(32),'sizes'=>'32x32'],
                                ['url'=>get_site_icon_url(192),'sizes'=>'192x192'],
                            ],
                            'apple' => [['url'=>get_site_icon_url(180),'sizes'=>'180x180']],
                        ] : null,
                    ],
					'header'   => $parts['header'] ?? [],
					'footer'   => $parts['footer'] ?? [],
                    'cookies' => $parts['cookies'] ?? [],
                    'notFound' => ($error_page=get_page_by_path('not-found',OBJECT,'page')) && $error_page->post_status==='publish' ? blocks($error_page->post_content) : [],
					'settings' => $settings,
                    'archives' => array_map(fn($page)=>['id'=>$page->ID,'url'=>public_path(get_permalink($page))], archive_pages()),
					'media'    => get_option( 'site_media_map', [] ),
                    'icons' => \SpIcons\catalogue(),
					'services' => cards( 'service' ),
                    'faqs' => collection_records('faq'),
                    'reviews' => collection_records('review'),
                    'forms' => form_records(),
                    'modals' => array_map(__NAMESPACE__ . '\\modal_record',array_values(array_filter(published('site_modal'),fn($p)=>!$p->post_password))),
                    'bookingModalId' => (int)get_option('site_booking_modal_id'),
                    'pages' => array_map(fn($p) => ['id'=>$p->ID,'title'=>$p->post_title,'to'=>$p->ID === (int)get_option('page_on_front') ? '/' : public_path(get_permalink($p))], published('page')),
					'tariffs' => $tariffs,
					'posts'    => cards( 'post' ),
					...apply_filters( 'site_public_data', [] )
				];
			}
		] );
		register_rest_route( 'site/v1', '/page', [
			'methods'             => 'GET',
			'permission_callback' => '__return_true',
			'callback'            => function ( $r ) {
				$path = trim( (string) $r->get_param( 'path' ), '/' );
                $post = resolve_public_page($path);
				if ( ! $post || $post->post_status !== 'publish' || $post->post_password ) {
					return new \WP_Error( 'not_found', 'Page not found', [ 'status' => 404 ] );
				}

				return document( $post );
			}
		] );
		register_rest_route( 'site/v1', '/preview-link/(?P<id>\d+)', [
			'methods'             => 'POST',
			'permission_callback' => fn( $r ) => current_user_can( 'edit_post', (int) $r['id'] ),
			'callback'            => function ( $r ) {
				if ( ! defined( 'SITE_FRONTEND_URL' ) || ! defined( 'SITE_PREVIEW_SECRET' ) || strlen( SITE_PREVIEW_SECRET ) < 32 ) {
					return new \WP_Error( 'not_configured', 'Preview is not configured', [ 'status' => 503 ] );
				}
				$expires = time() + 600;
				$id      = (int) $r['id'];

				return [
					'url' => add_query_arg( [
						'id'        => $id,
						'expires'   => $expires,
						'signature' => hash_hmac( 'sha256', $id . ':' . $expires, SITE_PREVIEW_SECRET )
					], frontend_origin() . '/api/preview' )
				];
			}
		] );
		register_rest_route( 'site/v1', '/preview/(?P<id>\d+)', [
			'methods'             => 'GET',
			'permission_callback' => function ( $r ) {
				$expires   = (int) $r->get_param( 'expires' );
				$signature = (string) $r->get_param( 'signature' );

				return defined( 'SITE_PREVIEW_SECRET' ) && strlen( SITE_PREVIEW_SECRET ) >= 32 && $expires >= time() && $expires <= time() + 900 && hash_equals( hash_hmac( 'sha256', $r['id'] . ':' . $expires, SITE_PREVIEW_SECRET ), $signature );
			},
			'callback'            => function ( $r ) {
				$p = get_post( (int) $r['id'] );
				if ( ! $p ) {
					return new \WP_Error( 'not_found', 'Not found', [ 'status' => 404 ] );
				}
				$doc      = document( $p );
				$autosave = wp_get_post_autosave( $p->ID );
				if ( $autosave && strtotime( $autosave->post_modified_gmt ) >= strtotime( $p->post_modified_gmt ) ) {
					$doc['title']           = $autosave->post_title;
					$doc['description']     = wp_strip_all_tags( $autosave->post_excerpt );
					$doc['blocks']          = $p->post_type==='site_modal'?modal_blocks($autosave->post_content):blocks( $autosave->post_content );
					$doc['record']['title'] = $autosave->post_title;
				}
				$response = new \WP_REST_Response( $doc );
				$response->header( 'Cache-Control', 'private, no-store' );

				return $response;
			}
		] );
	} );
	add_filter( 'preview_post_link', function ( $url, $post ) {
		if ( ! defined( 'SITE_FRONTEND_URL' ) || ! defined( 'SITE_PREVIEW_SECRET' ) || strlen( SITE_PREVIEW_SECRET ) < 32 ) {
			return $url;
		}
		$expires = time() + 600;

		return add_query_arg( [
			'id'        => $post->ID,
			'expires'   => $expires,
			'signature' => hash_hmac( 'sha256', $post->ID . ':' . $expires, SITE_PREVIEW_SECRET )
		], frontend_origin() . '/api/preview' );
	}, 10, 2 );
