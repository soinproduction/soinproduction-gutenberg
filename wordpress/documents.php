<?php
namespace SiteTheme;
defined('ABSPATH') || exit;

function media_values( $value ) {
		if ( is_string( $value ) ) {
			$key   = $value;
			$media = get_option( 'site_media_map', [] );

			return isset( $media[ $key ]['id'] ) ? ( wp_get_attachment_url( $media[ $key ]['id'] ) ?: '' ) : $value;
		}

		return is_array( $value ) ? array_map( __NAMESPACE__ . '\\media_values', $value ) : $value;
	}

	/** A background video takes the poster saved on it in the Media Library. */
	function video_posters( $data ) {
		if ( ! is_array( $data ) ) {
			return $data;
		}
		if ( ( $data['type'] ?? '' ) === 'video' && ! empty( $data['video'] ) && is_string( $data['video'] ) && function_exists( 'sp_video_poster_url' ) ) {
			$id=attachment_url_to_postid($data['video']);$defaults=(array)apply_filters('sp_media_video_defaults',[],$id);
            $data['library_defaults']=$defaults;
            if(($data['inherit_poster'] ?? true) && $id)$data['poster']=$defaults['poster_url'] ?? '';
            elseif(!empty($data['poster_id']))$data['poster']=wp_get_attachment_url((int)$data['poster_id']) ?: '';
            if($data['inherit_playback'] ?? true)foreach(['autoplay','muted','loop','controls','custom_play'] as $key)$data[$key]=$defaults[$key] ?? ($key!=='controls');
		}

		return array_map( __NAMESPACE__ . '\\video_posters', $data );
	}

	function hydrate_media( $data ) {
		$data = media_values( $data );
		foreach ( ( $data['__media'] ?? [] ) as $encoded => $id ) {
			$path = json_decode( $encoded, true );
			if ( ! is_array( $path ) || ! $path ) {
				continue;
			}
			$value =& $data;
			foreach ( $path as $key ) {
				if ( ! is_array( $value ) ) {
					$value = [];
				}
				$value =& $value[ $key ];
			}
			$value = wp_get_attachment_url( (int) $id ) ?: '';
			unset( $value );
		}

		return video_posters( \SpMedia\hydrate($data) );
	}

	function blocks( $content ) {
		return array_values( array_filter( array_map( function ( $b ) {
			if ( ! $b['blockName'] ) {
				return null;
			}
			$attrs = $b['attrs'];
			if ( isset( $attrs['data'] ) ) {
				$attrs['data'] = hydrate_media( $attrs['data'] );
			}
			if ( $b['blockName'] === 'core/button' ) {
				$processor = new \WP_HTML_Tag_Processor( $b['innerHTML'] );
				if ( $processor->next_tag( 'A' ) ) {
					$attrs['url']        = $processor->get_attribute( 'href' ) ?? '';
					$attrs['linkTarget'] = $processor->get_attribute( 'target' );
					$attrs['rel']        = $processor->get_attribute( 'rel' );
				}
                $target = get_post((int)($attrs['metadata']['siteLinkId'] ?? 0));
                if ($target && $target->post_status === 'publish' && is_post_type_viewable($target->post_type)) $attrs['url'] = public_path(get_permalink($target));
				if ( preg_match( '#<(?:a|button)\b[^>]*>(.*?)</(?:a|button)>#is', $b['innerHTML'], $match ) ) {
					$attrs['text'] = wp_kses( $match[1], [
						'strong' => [],
						'em'     => [],
						's'      => [],
						'mark'   => [ 'class' => [] ],
						'br'     => []
					] );
				}
			}

			return [
				'name'        => $b['blockName'],
				'attrs'       => $attrs,
				'innerBlocks' => blocks( serialize_blocks( $b['innerBlocks'] ) ),
				'html'        => str_starts_with($b['blockName'],'core/')?wp_kses_post(render_block($b)):$b['innerHTML'],
                'wrapper' => (function()use($b){$p=new \WP_HTML_Tag_Processor($b['innerHTML']);return $p->next_tag()?['class'=>$p->get_attribute('class'),'style'=>$p->get_attribute('style')]:[];})()
			];
		}, parse_blocks( $content ) ) ) );
	}

	function document( $post ) {
		$record = get_post_meta( $post->ID, 'site_record', true ) ?: [];

		return [
			'id'          => $post->ID,
			'slug'        => $post->post_name,
            'url' => get_permalink($post),
            'archive' => array_search($post->ID, array_map(fn($page)=>$page->ID, archive_pages()), true) ?: null,
			'type'        => $post->post_type,
			'title'       => $post->post_title,
			'description' => wp_strip_all_tags( $post->post_excerpt ),
			'date'        => get_the_date( 'c', $post ),
			'record'      => array_merge( $record, [
				'slug'    => $post->post_name,
				'title'   => $post->post_title,
				'excerpt' => $post->post_excerpt
			] ),
			'blocks'      => $post->post_type==='site_modal'?modal_blocks($post->post_content):blocks( $post->post_content )
		];
	}

	function published( $type ) {
		return get_posts( [
			'post_type'   => $type,
			'post_status' => 'publish',
			'numberposts' => - 1,
			'orderby'     => 'menu_order date',
			'order'       => 'ASC'
		] );
	}

	function cards( $type ) {
		return array_map( function ( $p ) use ( $type ) {
			$r     = get_post_meta( $p->ID, 'site_record', true ) ?: [];
			$image = get_the_post_thumbnail_url( $p, 'large' ) ?: ( $r['image'] ?? '' );

			return array_merge( $r, [
				'id'      => $p->ID,
				'slug'    => $p->post_name,
                'url' => public_path(get_permalink($p)),
                'to' => public_path(get_permalink($p)),
				'title'   => $p->post_title,
				'text'    => wp_strip_all_tags( $p->post_excerpt ),
				'excerpt' => wp_strip_all_tags( $p->post_excerpt ),
				'date'    => get_the_date( 'Y-m-d', $p ),
                'publishedAt' => get_post_time('c',false,$p),
				'image'   => $image,
				'n'       => $r['n'] ?? sprintf( '%02d', $p->menu_order + 1 )
			] );
		}, array_values( array_filter( published( $type ), fn( $p ) => !$p->post_password && ($type !== 'post' || str_contains($p->post_content, '<!-- wp:site/')) ) ) );
	}
