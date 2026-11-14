<?php

	namespace SiteTheme;
	defined( 'ABSPATH' ) || exit;
	function modal_blocks( $content ) {
		return array_values( array_filter( array_map( function ( $block ) {
			if ( ! $block['blockName'] ) {
				return null;
			}
			$attrs   = $block['blockName'] === 'core/button' ? ( blocks( serialize_blocks( [ $block ] ) )[0]['attrs'] ?? $block['attrs'] ) : $block['attrs'];
			if (isset($attrs['data'])) $attrs['data']=hydrate_media($attrs['data']);
			$html    = wp_kses_post( render_block( $block ) );
			$wrapper = [];
			if ( in_array( $block['blockName'], [ 'core/group', 'core/columns', 'core/column' ], true ) ) {
				$processor = new \WP_HTML_Tag_Processor( $html );
				if ( $processor->next_tag() ) {
					$wrapper = [
						'class' => $processor->get_attribute( 'class' ),
						'style' => $processor->get_attribute( 'style' )
					];
				}
			}

			return [
				'name'        => $block['blockName'],
				'attrs'       => $attrs,
				'innerBlocks' => modal_blocks( serialize_blocks( $block['innerBlocks'] ) ),
				'html'        => $html,
				'wrapper'     => $wrapper
			];
		}, parse_blocks( $content ) ) ) );
	}

	function modal_record( $post ) {
		return [ 'id' => $post->ID, 'title' => $post->post_title, 'slug'=>rawurldecode($post->post_name), 'blocks' => modal_blocks( $post->post_content ) ];
	}

	add_action( 'init', function () {
		register_post_type( 'site_modal', [
			'labels'       => [
				'name'          => 'Modals',
				'singular_name' => 'Modal',
				'add_new_item'  => 'Add modal',
				'edit_item'     => 'Edit modal'
			],
			'public'       => false,
			'show_ui'      => true,
			'show_in_rest' => true,
			'menu_icon'    => 'dashicons-welcome-widgets-menus',
			'supports'     => [ 'title', 'editor', 'revisions' ],
			'template'     => [
				[
					'core/heading',
					[ 'level' => 2, 'content' => 'Заголовок модалки' ]
				],
				[
					'core/paragraph',
					[ 'content' => 'Додайте текст, зображення або кнопки.' ]
				]
			]
		] );

	} );
	add_filter( 'allowed_block_types_all', function ( $allowed, $context ) {
		if ( ( $context->post->post_type ?? '' ) !== 'site_modal' ) {
			return $allowed;
		}

		return [
			'core/heading',
			'core/paragraph',
			'core/image',
			'core/list',
			'core/list-item',
			'core/quote',
			'core/group',
			'core/columns',
			'core/column',
			'core/buttons',
			'core/button',
			'core/separator',
			'core/spacer',
			'site/booking-form'
		];
	}, 20, 2 );
	add_action( 'enqueue_block_editor_assets', function () {
		if ( get_current_screen()->post_type !== 'site_modal' ) {
			return;
		}
		wp_add_inline_style( 'site-editor-ui', '.editor-styles-wrapper .is-root-container{max-width:672px!important;margin:40px auto!important;padding:32px!important;border:1px solid #ddd;border-radius:12px;background:#fff;box-shadow:0 12px 50px #00000012}.editor-styles-wrapper .is-root-container:has(.wp-block-site-booking-form){max-width:1024px!important}.editor-styles-wrapper .wp-block{max-width:100%}' );
	} );
