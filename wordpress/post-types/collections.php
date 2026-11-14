<?php

	namespace SiteTheme;
	defined( 'ABSPATH' ) || exit;
	add_action( 'init', function () {
		foreach (
			[
				'faq'    => [ 'FAQ', 'FAQ answer', 'editor-help', 'faq-item' ],
				'review' => [ 'Reviews', 'Review', 'format-quote', 'review-details' ]
			] as $type => $args
		) {
			register_post_type( $type, [
				'labels'       => [
					'name'          => $args[0],
					'singular_name' => $args[1],
					'add_new_item'  => 'Add ' . $args[1],
					'edit_item'     => 'Edit ' . $args[1],
					'add_new'       => 'Add new',
					'all_items'     => 'All ' . $args[0]
				],
				'public'       => false,
				'show_ui'      => true,
				'show_in_rest' => true,
				'menu_icon'    => 'dashicons-' . $args[2],
				'supports'     => [ 'title', 'editor', 'revisions', 'page-attributes' ],
				'template'     => [ [ 'site/' . $args[3], [] ] ]
			] );
		}
	}, 15 );
	function collection_records( $type ) {
		return array_map( function ( $post ) use ( $type ) {
			$all  = blocks( $post->post_content );
			$name = $type === 'faq' ? 'site/faq-item' : 'site/review-details';
			$data = [];
			foreach ( $all as $block ) {
				if ( $block['name'] === $name ) {
					$data = $block['attrs']['data'] ?? [];
					break;
				}
			}

			return array_merge( $data, [
				'extraBlocks'                           => array_values( array_filter( $all, fn( $b ) => $b['name'] !== $name ) ),
				'id'                                    => $post->ID,
				'title'                                 => $post->post_title,
				'slug'                                  => $post->post_name,
				$type === 'faq' ? 'question' : 'author' => $post->post_title
			] );
		}, array_values( array_filter( published( $type ), fn( $post ) => ! $post->post_password ) ) );
	}

	add_filter( 'register_post_type_args', function ( $args, $type ) {
		$names = [
			'faq'           => [ 'FAQ answer', 'FAQ' ],
			'review'        => [ 'Review', 'Reviews' ],
			'service'       => [ 'Service', 'Services' ],
			'tariff'        => [ 'Pricing plan', 'Pricing Plans' ],
			'site_modal' => [ 'Modal', 'Modals' ]
		];
		if ( ! isset( $names[ $type ] ) ) {
			return $args;
		}
		[ $single, $plural ] = $names[ $type ];
		$args['labels'] = array_merge( (array) ( $args['labels'] ?? [] ), [
			'name'               => $plural,
			'singular_name'      => $single,
			'add_new'            => 'Add new',
			'add_new_item'       => 'Add ' . $single,
			'edit_item'          => 'Edit ' . $single,
			'all_items'          => 'All ' . $plural,
			'search_items'       => 'Search ' . $plural,
			'not_found'          => 'No ' . strtolower( $plural ) . ' found.',
			'not_found_in_trash' => 'No ' . strtolower( $plural ) . ' found in Trash.'
		] );

		return $args;
	}, 20, 2 );
