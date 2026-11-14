<?php
namespace SiteTheme;
defined('ABSPATH') || exit;
add_action('init',function(){
 register_block_pattern_category('site-layouts',['label'=>'Studio layouts']);
 register_block_pattern_category('site-elements',['label'=>'Studio elements']);
 $photo='<!-- wp:image /-->';
 $heading='<!-- wp:heading --><h2 class="wp-block-heading">Your section heading</h2><!-- /wp:heading -->';
 $text='<!-- wp:paragraph --><p>Add your content here. Every heading, paragraph, image and button is an independent block.</p><!-- /wp:paragraph -->';
 $buttons='<!-- wp:buttons --><div class="wp-block-buttons"><!-- wp:button {"className":"is-style-studio-accent"} --><div class="wp-block-button is-style-studio-accent"><a class="wp-block-button__link wp-element-button" href="/contacts">Contact us</a></div><!-- /wp:button --></div><!-- /wp:buttons -->';
 $open='<!-- wp:group {"style":{"spacing":{"padding":{"top":"64px","bottom":"64px","left":"24px","right":"24px"}}},"layout":{"type":"constrained"}} --><div class="wp-block-group" style="padding-top:64px;padding-right:24px;padding-bottom:64px;padding-left:24px">';
 $close='</div><!-- /wp:group -->';
 register_block_pattern('site/text-section',['title'=>'Text section','description'=>'A freely editable section with a heading, text and buttons.','categories'=>['site-layouts'],'content'=>$open.$heading.$text.$buttons.$close]);
 $card='<!-- wp:column --><div class="wp-block-column">'.$photo.'<!-- wp:heading {"level":3} --><h3 class="wp-block-heading">Card heading</h3><!-- /wp:heading -->'.$text.$buttons.'</div><!-- /wp:column -->';
 register_block_pattern('site/three-cards',['title'=>'Three editable cards','description'=>'Add, remove or reorder the individual cards and their elements.','categories'=>['site-layouts'],'content'=>$open.$heading.'<!-- wp:columns --><div class="wp-block-columns">'.str_repeat($card,3).'</div><!-- /wp:columns -->'.$close]);
 register_block_pattern('site/split-section',['title'=>'Image and text section','description'=>'Two columns with fully editable content.','categories'=>['site-layouts'],'content'=>$open.'<!-- wp:columns --><div class="wp-block-columns"><!-- wp:column --><div class="wp-block-column">'.$photo.'</div><!-- /wp:column --><!-- wp:column --><div class="wp-block-column">'.$heading.$text.$buttons.'</div><!-- /wp:column --></div><!-- /wp:columns -->'.$close]);
 register_block_pattern('site/standalone-image',['title'=>'Studio image','categories'=>['site-elements'],'content'=>$photo]);
 register_block_pattern('site/button-group',['title'=>'Studio button group','categories'=>['site-elements'],'content'=>$buttons]);
},80);
