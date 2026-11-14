<?php
namespace SiteTheme;
defined('ABSPATH') || exit;
/** Keep the browser catalogue limited to icons referenced by published content. */
/** Record types the sections on this page list; menus always need pages and services. */
function page_collections(): array {
 $types=['pages','services'];
 $linked=['PricingPlans'=>'tariffs','ReviewsCarousel'=>'reviews'];
 $walk=function(array $nodes)use(&$walk,&$types,$linked){foreach($nodes as $node){$type=$node['type']??'';if($type==='Records')$types[]=($node['props']['type']??'post').'s';if(isset($linked[$type]))$types[]=$linked[$type];$walk($node['children']??[]);}};
 foreach($GLOBALS['site_wordpress_instances']??[] as $instance)$walk(Rendering\definition($instance['block']['name']??'')['template']??[]);
 return array_unique($types);
}
function wordpress_browser_site(): array {
 $site=wordpress_site();$icons=$site['icons']??[];unset($site['icons']);
 // Record collections and the 404 document travel only to pages that use them.
 $needed=page_collections();
 foreach(['posts','faqs','reviews','tariffs','services','pages'] as $key)if(!in_array($key,$needed,true))unset($site[$key]);
 if(!is_404())unset($site['notFound']);
 $references=wp_json_encode([$site,$GLOBALS['site_wordpress_instances']??[]]);
 foreach(get_posts(['post_type'=>'site_modal','post_status'=>'publish','numberposts'=>-1]) as $modal)$references.=$modal->post_content;
 $site['icons']=array_values(array_filter($icons,fn($icon)=>str_contains($references,'"'.$icon['value'].'"')));
 return $site;
}
add_filter('script_loader_tag',function($tag,$handle){
 if($handle!=='site-wordpress')return $tag;
 $processor=new \WP_HTML_Tag_Processor($tag);
 if($processor->next_tag('script'))$processor->set_attribute('type','module');
 return $processor->get_updated_html();
},10,2);
add_action('wp_footer',function(){
 if(render_mode()!=='wordpress')return;
 $file=get_template_directory().'/build/wordpress/runtime-manifest.json';
 if(!is_readable($file))return;
 foreach(json_decode(file_get_contents($file),true)['imports']??[] as $asset){
  echo '<link rel="modulepreload" href="'.esc_url(get_template_directory_uri().'/build/wordpress/assets.php/'.$asset).'">';
 }
},2);
add_action('wp_head',function(){
 if(render_mode()!=='wordpress'||!is_singular())return;
 $post=get_queried_object();if(!$post instanceof \WP_Post)return;
 $blocks=parse_blocks($post->post_content);
 $first=reset($blocks);$data=$first['attrs']['data']??[];
 if(empty($data['background']))return;
 $data=hydrate_media($data);$background=$data['background'];
 $url=($background['type']??'')==='video'?Rendering\background_poster($background['poster']??''):($background['image']??'');
 if(is_string($url)&&$url!=='')echo '<link rel="preload" as="image" fetchpriority="high" href="'.esc_url($url).'">';
},1);
/** PHP-only hosts may not compress HTML at the web-server layer. */
add_action('template_redirect',function(){
 if(render_mode()!=='wordpress'||is_feed()||is_trackback()||wp_is_json_request()||headers_sent())return;
 if(!extension_loaded('zlib')||ini_get('zlib.output_compression'))return;
 foreach(ob_list_handlers() as $handler)if(stripos($handler,'gz')!==false)return;
 ob_start('ob_gzhandler');
},0);
add_action('wp_head',function(){
 if(render_mode()!=='wordpress')return;
 $file=get_template_directory().'/build/wordpress/critical.css';
 if(is_readable($file))echo '<style id="site-critical-css">'.file_get_contents($file).'</style>';
},3);
add_filter('style_loader_tag',function($html,$handle){
 if($handle!=='site-wordpress'||!is_readable(get_template_directory().'/build/wordpress/critical.css'))return $html;
 $processor=new \WP_HTML_Tag_Processor($html);
 if(!$processor->next_tag('link'))return $html;
 $processor->set_attribute('media','print');
 $processor->set_attribute('onload',"this.media='all'");
 return $processor->get_updated_html().'<noscript>'.$html.'</noscript>';
},10,2);
