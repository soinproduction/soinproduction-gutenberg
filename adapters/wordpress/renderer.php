<?php
namespace SiteTheme\Rendering;
defined('ABSPATH') || exit;
foreach (require dirname(__DIR__, 2).'/generated/connections.php' as $entry) require_once dirname(__DIR__, 2).'/'.$entry;

/** Interpreter for the build-time JSX blueprint. No JS execution or Node on the host. */
function manifest(): array {
 static $manifest;
 if($manifest===null){$file=get_theme_file_path('build/wordpress/sections.json');$manifest=is_readable($file)?json_decode(file_get_contents($file),true,512,JSON_THROW_ON_ERROR):['sections'=>[]];}
 return $manifest;
}
function definition(string $name): ?array {foreach(manifest()['sections'] as $section)if($section['name']===$name)return $section;return null;}
function classes(array $props): string {return trim(($props['className']??'').' '.($props['frontClassName']??''));}
function attrs(array $attributes): string {
 $out='';foreach($attributes as $key=>$value){if($value===null||$value===false||str_starts_with($key,'on'))continue;$out.=' '.esc_attr($key).'="'.esc_attr($value===true?'':(string)$value).'"';}return $out;
}
function tag(string $name,array $attributes,string $content=''): string {
 if(!preg_match('/^[a-z][a-z0-9-]*$/',$name)||in_array($name,['script','iframe','style'],true))return '';
 return '<'.$name.attrs($attributes).'>'.(in_array($name,['img','source','br','hr','input'],true)?'':$content.'</'.$name.'>');
}
function classed_content(string $class,string $html): string {return $class?tag('div',['class'=>$class],$html):$html;}
function nodes(array $nodes,array $context): string {return implode('',array_map(fn($node)=>node($node,$context),$nodes));}
function image($value,string $class=''): string {
 if(is_string($value))$value=['url'=>$value];$url=$value['url']??'';
 return $url?tag('img',['src'=>esc_url($url),'alt'=>$value['alt']??'','class'=>$class,'loading'=>'lazy']):'';
}
/** Use a generated, bounded poster rather than the original background image. */
function background_poster(string $url): string {
 if(!$url||!function_exists('attachment_url_to_postid'))return $url;
 $id=attachment_url_to_postid($url);
 return $id?(wp_get_attachment_image_url($id,'large')?:$url):$url;
}
function button(array $value,?string $fallback=null,array $site=[],string $extra_class=''): string {
 if(empty($value['text']))return '';
 $url=$value['url']??'#';$id=(int)($value['modalId']??0);
 if($id)foreach($site['modals']??[] as $modal)if($modal['id']===$id)$url='#modal-'.($modal['slug']??$id);
 if(!empty($value['linkId']))$url=get_permalink((int)$value['linkId'])?:$url;
 $style=$value['style']??$fallback;
 $class=match($style){'text'=>'site-text-link eyebrow !text-foreground transition-colors hover:!text-flame','accent'=>'btn-primary !bg-flame !text-flame-foreground hover:!opacity-90','outline'=>'btn-ghost','light-outline'=>'btn-ghost !border-background/40 hover:!bg-background hover:!text-foreground',default=>'btn-primary'};
 $label=wp_kses_post($value['text']);$metadata=$value['metadata']??[];
 foreach($site['icons']??[] as $icon)if(($icon['value']??'')===($metadata['siteButtonIcon']??null)){
  $mask='url("data:image/svg+xml,'.rawurlencode($icon['svg']).'")';
  $label=tag('span',['class'=>'site-button-label site-button-icon-'.(($metadata['siteButtonIconPosition']??'')==='before'?'before':'after'),'style'=>'--site-button-icon:'.$mask],$label);break;
 }
 return tag('a',['href'=>esc_url($url),'class'=>trim($class.' '.$extra_class),'data-modal-plan'=>$value['plan']??null],$label);
}
function social_links(array $links, string $class = '', string $style = 'text'): string {
 $labels = ['instagram'=>'Instagram', 'facebook'=>'Facebook', 'telegram'=>'Telegram', 'youtube'=>'YouTube', 'tiktok'=>'TikTok', 'linkedin'=>'LinkedIn'];
 $html = '';
 foreach ($labels as $network => $label) {
  $url = $links[$network] ?? '';
  if (is_string($url) && preg_match('~^https?://[^/]+~i', $url)) {
   $html .= button(['text'=>$label, 'url'=>$url], $style);
  }
 }
 return $html === '' ? '' : tag('div', ['class'=>$class], $html);
}
/** Mirrors `flowPlacement` in frontend/kit/flow-layout.ts. */
function flow_placement(int $grid,array $column,array $palette,int $max_col): array {
 $span=min($grid,max(1,(int)($column['span']??0)?:(int)($palette['span']??0)?:(int)round($grid/max(1,$max_col))));
 $start=(int)($column['start']??0)?:(int)($palette['start']??0);
 return ['start'=>$start?min($grid-$span+1,max(1,$start)):0,'span'=>$span];
}
/** Mirrors `flowColumnLayout`: the default placement and per-range placements read by the generated grid rules. */
function flow_column_layout(int $grid,array $column,array $palette,int $max_col,int $mobile_grid=0): array {

 $base=\SiteTheme\breakpoint_media('columns');$names=\SiteTheme\layout_breakpoints();
 $below=array_slice($names,0,max(0,(int)array_search($base,$names,true)));
 $own=$grid?flow_placement($grid,$column,$palette,$max_col):['start'=>0,'span'=>1];$layers=$grid&&empty($column['fullRow'])?['default'=>$own]:[];
 foreach($names as $name){
  $value=$column['responsive'][$name]??null;
  if($grid&&empty($column['fullRow'])&&is_array($value)&&(!empty($value['span'])||!empty($value['start'])))$layers[$name]=flow_placement(in_array($name,$below,true)?($mobile_grid?:$grid):$grid,$value,['span'=>$own['span']],$max_col);
 }
 $style='';foreach($layers as $name=>$place)$style.='--site-col-'.$name.'-start:'.($place['start']?:'auto').';--site-col-'.$name.'-span:'.$place['span'].';';
 $classes=array_map(fn($name)=>'site-col-at-'.$name,array_keys($layers));
 foreach($column['responsive']??[] as $name=>$value){if(!in_array($name,$names,true))continue;
 $v=['top'=>'flex-start','center'=>'center','bottom'=>'flex-end'][$value['verticalAlign']??'']??null;
 $h=['left'=>'flex-start','center'=>'center','right'=>'flex-end','stretch'=>'stretch'][$value['horizontalAlign']??'']??null;
 if($v){$classes[]='site-align-v-'.$name;$style.='--site-align-'.$name.'-vertical:'.$v.';';}
 if($h){$classes[]='site-align-h-'.$name;$style.='--site-align-'.$name.'-horizontal:'.$h.';--site-align-'.$name.'-text:'.(($value['horizontalAlign']??'')==='stretch'?'inherit':$value['horizontalAlign']).';';}}
 return ['class'=>implode(' ',$classes),'style'=>$style];
}
function drag_elements(array $children,string $palette=''): array {
 $result=[];foreach($children as $child){
  if($child['type']==='Cols'){$result+=drag_elements($child['children'],$child['props']['name']);continue;}
  $find=function($node)use(&$find){if(!empty($node['props']['name']))return $node['props']['name'];foreach($node['children']??[] as $c){$key=$find($c);if($key)return $key;}return null;};
  $key=$find($child);if($key)$result[($palette?$palette.':':'').$key]=$child;
 }return $result;
}
function icon_mask(?string $name,array $site): string {
 foreach($site['icons']??[] as $icon)if($name&&($icon['value']??'')===$name)return 'url("data:image/svg+xml,'.rawurlencode($icon['svg']).'")';
 return '';
}
/** Core blocks keep their own markup; only a layout holding kit elements is rebuilt around them. */
function holds_elements(array $block): bool {
 foreach($block['innerBlocks']??[] as $child)if(!str_starts_with($child['name']??'','core/')||holds_elements($child))return true;
 return false;
}
/** Library icons as list markers: one for the list, one per top-level item over it. */
function list_icons(string $html,array $block,array $site): string {
 $processor=new \WP_HTML_Tag_Processor($html);$depth=0;$index=0;
 $items=array_values(array_filter($block['innerBlocks']??[],fn($child)=>($child['name']??'')==='core/list-item'));
 while($processor->next_tag(['tag_closers'=>'visit'])){
  $tag=$processor->get_tag();
  if(in_array($tag,['UL','OL'],true)){
   if($processor->is_tag_closer()){$depth--;continue;}
   $depth++;
   if($depth===1&&($mask=icon_mask($block['attrs']['metadata']['siteListIcon']??null,$site))){$processor->add_class('site-icon-list');$processor->set_attribute('style','--site-list-icon:'.$mask);}
   continue;
  }
  if($tag!=='LI'||$processor->is_tag_closer()||$depth!==1)continue;
  $mask=icon_mask($items[$index++]['attrs']['metadata']['siteListIcon']??null,$site);
  if($mask){$processor->add_class('site-icon-item');$processor->set_attribute('style','--site-list-icon:'.$mask);}
 }
 return $processor->get_updated_html();
}
function native_blocks(array $blocks,array $context,array $elements=[]): string {
 $html='';foreach($blocks as $block){
  $name=$block['name']??'';
  if(str_starts_with($name,'core/')){
   if(holds_elements($block)){$html.=tag('div',['class'=>$block['attrs']['className']??null],native_blocks($block['innerBlocks'],$context,$elements));continue;}
   $markup=wp_kses_post($block['html']??'');
   $html.=$name==='core/list'?list_icons($markup,$block,$context['site']??[]):$markup;continue;
  }
  $key=$block['attrs']['element']??'';if(isset($elements[$key]))$html.=node($elements[$key],array_replace($context,['data'=>$block['attrs']['data']??[]]));
 }return $html;
}
/** One paging window for repeaters and relationships, after filtering/resolving rows. */
function collection(array $rows,array $props,array $context,callable $render): string {
 $data=$context['data']??[];
 $display=!empty($props['displaySettings'])?($data[($props['name']??'').'Display']??[]):[];
 $loading=$display['loading']??$props['loading']??'all';
 if(!in_array($loading,['pagination','lazyload','show-more'],true))$loading='all';
 $size=max(1,(int)($display['perPage']??$props['perPage']??count($rows)));
 $pages=max(1,(int)ceil(count($rows)/$size));
 $key='list-'.($data['sectionId']??'').'-'.($props['name']??'');
 $raw=(string)($_GET[$key]??'1');$page=max(1,min($pages,ctype_digit($raw)?(int)$raw:1));
 $offset=$loading==='pagination'?($page-1)*$size:0;
 $visible=$loading==='all'?$rows:array_slice($rows,$offset,$loading==='pagination'?$size:$page*$size);
 $html='';foreach($visible as $i=>$row)$html.=$render($row,$offset+$i);
 $content=tag('div',['class'=>classes($props)],$html);
 if($loading==='all')return $content;
 $navigation='';
 if($pages>1){
  if($loading==='pagination'){for($i=1;$i<=$pages;$i++)$navigation.=tag('a',['href'=>esc_url(add_query_arg($key,$i)),'class'=>'btn-ghost','aria-current'=>$i===$page?'page':null],(string)$i);}
  elseif($page<$pages){$appearance=$display['button']??$props['loadMoreButton']??[];$navigation=button(['url'=>add_query_arg($key,$page+1),'text'=>trim($appearance['text']??'')?:'LoadMore','style'=>($appearance['style']??'')?:'outline','metadata'=>['siteButtonIcon'=>$appearance['icon']??'','siteButtonIconPosition'=>$appearance['iconPosition']??'after']],null,$context['site']??[]);}
 }
 return tag('div',['class'=>'site-loaded-list'],$content.($navigation?tag('nav',['class'=>'mt-10 flex justify-center gap-2','aria-label'=>'List pages'],$navigation):''));
}
function node(array $node,array $context): string {
 $type=$node['type'];$p=$node['props']??[];$children=$node['children']??[];$data=$context['data']??[];$site=$context['site']??[];$record=$context['record']??[];
 $value=$data[$p['name']??'']??null;$class=classes($p);
 if($type==='#text')return esc_html($node['value']);
 if(ctype_lower(substr($type,0,1))){$attributes=$p;unset($attributes['children'],$attributes['className'],$attributes['adminClassName'],$attributes['frontClassName'],$attributes['initial']);if($class)$attributes['class']=$class;return tag($type,$attributes,nodes($children,$context));}
 switch($type){
 case 'Accordion':return tag('div',['class'=>$class,'data-disclosure-mode'=>'accordion','data-icon-position'=>$p['iconPosition']??'after'],tag('div',['data-disclosure-items'=>true],nodes($children,array_replace($context,['disclosure'=>$p]))));
 case 'AccordionItem':return tag('details',['class'=>$class,'data-disclosure-item'=>true],nodes($children,$context));
 case 'AccordionContent':return tag('div',['class'=>$class,'data-disclosure-content'=>true],nodes($children,$context));
 case 'AccordionTrigger':
  $settings=$context['disclosure']??[];$icon='';
  if(!array_key_exists('icon',$settings))$icon='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m6 9 6 6 6-6"></path></svg>';
  elseif($settings['icon'])$icon=node(['type'=>'Icon','props'=>['name'=>'indicator']],array_replace($context,['data'=>['indicator'=>$settings['icon']]]));
  return tag('summary',['class'=>$class],nodes($children,$context).($icon?tag('span',['data-disclosure-icon'=>true],$icon):''));
 case 'Section':if(!empty($p['when'])&&empty($data[$p['when']]))return '';return tag('section',['id'=>$data['sectionId']??null,'class'=>$class],nodes($children,$context));
 case 'Text':case 'Heading':return tag($type==='Heading'?'h'.($p['level']??2):'p',['class'=>$class],wp_kses_post((string)($value??'')));
 case 'Paragraphs':return tag('div',['class'=>'site-paragraph-flow '.$class],implode('',array_map(fn($v,$i)=>tag('div',['class'=>trim('site-description-row '.(is_array($v)&&($v['style']??'')==='accent-line'?'is-style-studio-accent-line ':'').($i?($p['paragraphClassName']??''):''))],tag('p',[],wp_kses_post(is_array($v)?($v['text']??''):$v))),is_array($value)?$value:[],array_keys(is_array($value)?$value:[]))));
 case 'Image':return image($value,$class);
 case 'Icon':
  if(!$value)return '';$name=is_string($value)?$value:($value['type']??'');
  foreach($site['icons']??[] as $icon){if(($icon['value']??'')===$name){$mask='url("data:image/svg+xml,'.rawurlencode($icon['svg']).'")';return tag('span',['class'=>trim('inline-flex shrink-0 leading-none text-flame '.$class),'aria-hidden'=>'true'],tag('span',['style'=>'display:inline-block;width:.9em;height:.9em;background-color:currentColor;mask:'.$mask.' center/contain no-repeat;-webkit-mask:'.$mask.' center/contain no-repeat']));}}return '';
 case 'Choice':case 'RecordEdit':return '';
 case 'Toggle':return ($value??($p['default']??false))?classed_content($class,nodes($children,$context)):'';
 case 'Show':
  $visible=is_array($p['when'])?(bool)array_filter($p['when'],fn($key)=>trim(wp_strip_all_tags((string)($data[$key]??'')))!==''):(isset($p['is'])?($data[$p['when']]??null)===$p['is']:!empty($data[$p['when']]));return $visible?classed_content($class,nodes($children,$context)):'';
 case 'Button':return button(is_array($value)?$value:[],$p['style']??null,$site,$class);
 case 'SocialLinks':return social_links($site['settings']['socialLinks']??[],$class,$p['buttonStyle']??'text');
 case 'Buttons':$html='';foreach(is_array($value)?$value:[] as $i=>$button)$html.=button($button,$p['styles'][$i]??null,$site);return tag('div',['class'=>'site-actions '.($class?:'flex flex-wrap gap-3')],$html);
 case 'Background':case 'Media':
  if(!$value)return '';if(is_string($value)||($value['type']??'image')==='image')return image(is_string($value)?$value:['url'=>$value['image']??$value['url']??'','alt'=>$value['alt']??''],$class?:'absolute inset-0 h-full w-full object-cover');
  return tag('video',['class'=>$class?:'absolute inset-0 h-full w-full object-cover','poster'=>esc_url(background_poster($value['poster']??'')),'src'=>esc_url($value['video']??$value['mp4']??''),'muted'=>$value['muted']??true,'preload'=>'none','data-site-background'=>'true','data-autoplay'=>($value['autoplay']??true)?'true':'false','autoplay'=>false,'loop'=>$value['loop']??true,'playsinline'=>true,'controls'=>$value['controls']??false]);
 case 'List':
  $rows=is_array($value)?$value:[];
  if(!empty($p['gallery']))$rows=array_values(array_filter($rows,fn($row)=>!empty($row['image']['url'])));

  return collection($rows,$p,$context,fn($row,$i)=>nodes($children,array_replace($context,['data'=>$row])));

 case 'Slider':
  if(!$children){$html='';foreach(is_array($value)?$value:[] as $row)$html.=image($row,'w-full h-full object-cover');return tag('div',['class'=>$class],$html);}
  foreach($children as &$child)if(in_array($child['type'],['Records','List'],true))$child['props']['className']=trim(($child['props']['className']??'').' site-slider-items '.($p['trackClassName']??''));unset($child);
  return tag('div',['class'=>$class,'data-slider'=>$p['name']??'slider','data-slider-below'=>$p['activeBelow']??null,'data-slider-loop'=>!empty($p['loop'])?'true':'false','role'=>'region','aria-roledescription'=>'carousel','aria-label'=>$p['label']??'Slider'],tag('div',['data-slider-viewport'=>'','tabindex'=>'0'],tag('div',['data-slider-track'=>'','class'=>$p['trackClassName']??null],nodes($children,$context))));
 case 'SliderButton':
  $direction=($p['direction']??'next')==='previous'?'previous':'next';
  return tag('button',['type'=>'button','class'=>$class,'data-slider-for'=>$p['slider']??'','data-slider-button'=>$direction,'aria-label'=>$p['label']??($direction==='previous'?'Previous slide':'Next slide'),'disabled'=>true],$children?nodes($children,$context):($direction==='previous'?'←':'→'));
 case 'SliderPagination':return tag('div',['class'=>$class,'data-slider-for'=>$p['slider']??'','data-slider-pagination'=>'','data-slider-page-class'=>$p['buttonClassName']??'','data-slider-page-label'=>$p['pageLabel']??'Slide','role'=>'group','aria-label'=>$p['label']??'Slider pages'],'');
 case 'RecordContent':$blocks=$record[$p['field']??'']??[];return is_array($blocks)&&$blocks?classed_content($class,native_blocks($blocks,$context)):'';
 case 'RecordText':$text=$record[$p['field']??'']??'';return $text?tag(in_array($p['as']??'p',['p','span','div','blockquote'],true)?($p['as']??'p'):'p',['class'=>$class],wp_kses_post((string)$text)):'';
 case 'Gallery':$html='';foreach(is_array($value)?$value:[] as $row)$html.=image($row,'w-full h-full object-cover');return tag('div',['class'=>$class],$html);
 case 'PricingPlans':return pricing_plans(is_array($value)?$value:null,$site,$class);
 // The form is interactive and mounts in the browser.
 case 'Form':return tag('div',['class'=>$class],'');
 case 'ReviewsCarousel':return reviews_carousel(is_array($value)?$value:null,$site,$class);
 case 'Records':
  $library=$site[($p['type']??'post').'s']??[];$rows=[];
  foreach(is_array($value)?$value:[] as $item){if(is_array($item)&&!empty($item['manual'])){$rows[]=$item;continue;}$id=is_array($item)?($item['id']??0):$item;foreach($library as $r)if((string)$r['id']===(string)$id)$rows[]=$r;}
  if(!empty($p['latest'])&&($data[$p['modeField']??'']??'latest')!=='manual'){$rows=$library;usort($rows,fn($a,$b)=>(strtotime($b['publishedAt']??$b['date']??'')<=>strtotime($a['publishedAt']??$a['date']??''))?:((int)($b['id']??0)<=>(int)($a['id']??0)));$rows=array_slice($rows,0,max(0,(int)$p['latest']));}
  return collection($rows,$p,$context,fn($row,$i)=>nodes($children,array_replace($context,['record'=>$row,'index'=>$i])));
 case 'RecordDate':$timestamp=strtotime($record['publishedAt']??$record['date']??'');return $timestamp===false?'':tag('time',['class'=>$class,'datetime'=>gmdate('c',$timestamp)],gmdate('d.m.Y',$timestamp));
 case 'RecordTitle':return tag('h3',['class'=>$class],wp_kses_post($record['title']??''));
 case 'RecordExcerpt':return tag('p',['class'=>$class],wp_kses_post($record['excerpt']??''));
 case 'RecordIndex':return tag('span',['class'=>$class],sprintf('%02d',($context['index']??0)+1));
 case 'RecordImage':return image(['url'=>$record['image']??'','alt'=>$record['alt']??''],$class);
 case 'RecordLink':$url=$record['url']??$record['to']??'';return $url?tag('a',['href'=>esc_url($url),'class'=>$class],nodes($children,$context)):tag('div',['class'=>$class],nodes($children,$context));
 case 'Area':
  $html='';foreach(is_array($value)?$value:[] as $item)foreach($children as $child)if(strtolower($child['props']['type']??$child['type'])===($item['type']??'')){$child['props']['name']='value';$html.=node($child,array_replace($context,['data'=>['value'=>$item['value']??null]]));break;}return tag('div',['class'=>$class],$html);
 case 'Drag':
  $elements=drag_elements($children);$blocks=$context['blocks']??[];$palettes=array_values(array_filter($children,fn($c)=>$c['type']==='Cols'));
  if(!$palettes)return $class?tag('div',['class'=>$class],native_blocks($blocks,$context,$elements)):native_blocks($blocks,$context,$elements);
  $grid=min(24,max(0,(int)($p['grid']??0)));$mobile_grid=$grid?min($grid,max(1,(int)($p['mobileGrid']??6)?:6)):0;$gap=$p['gap']??null;$gap=is_int($gap)||is_float($gap)?($gap>=0?$gap.'rem':''):(is_string($gap)&&preg_match('/^[\d.]+(rem|em|%)$/',trim($gap))?trim($gap):'');$max_col=max(1,(int)($p['maxCol']??2));
  $html='';foreach($blocks as $block){if(!str_ends_with($block['name']??'','-column'))continue;$a=$block['attrs'];$palette=$a['palette']??$palettes[0]['props']['name'];$definition=null;foreach($palettes as $c)if($c['props']['name']===$palette)$definition=$c;
   $layout=flow_column_layout($grid,$a,$definition['props']??[],$max_col,$mobile_grid);
   $html.=tag('div',['class'=>trim('site-flow-column '.(!empty($a['fullRow'])?'is-full-row ':'').$layout['class'].' '.classes($definition['props']??[])),'style'=>$layout['style']?:null,'data-vertical-align'=>$a['verticalAlign']??'top','data-horizontal-align'=>$a['horizontalAlign']??'stretch'],native_blocks($block['innerBlocks']??[],$context,$elements));
  }return tag('div',['class'=>trim('site-flow-drag '.($grid?'has-grid ':'').$class),'style'=>'--site-flow-columns:'.($grid?:$max_col).($mobile_grid?';--site-flow-mobile-columns:'.$mobile_grid:'').($gap?';--site-flow-gap:'.$gap:'')],$html);
 default:throw new \RuntimeException('Unsupported kit node: '.$type);
 }
}
