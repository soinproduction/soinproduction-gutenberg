<?php
namespace SiteTheme\Rendering;
defined('ABSPATH') || exit;
/** Booking plan cards use the same current records as the booking modal. */
function pricing_plans(?array $ids,array $site,string $class): string {
 $library=$site['tariffs']??[];
 $ids=$ids??array_column($library,'id');$html='';$seen=[];
 foreach($ids as $id){
  if(isset($seen[(string)$id]))continue;$seen[(string)$id]=true;
  $record=null;foreach($library as $item)if((string)$item['id']===(string)$id){$record=$item;break;}
  if(!$record)continue;$card=$record['data']??[];$featured=!empty($card['featured']);
  $top=tag('div',['class'=>'flex items-center justify-between'],tag('p',['class'=>'eyebrow'.($featured?' !text-background/60':'')],wp_kses_post($card['note']??'')).($featured?tag('span',['class'=>'bg-flame px-2 py-1 text-[0.96rem] uppercase tracking-[0.2em] text-flame-foreground'],'Популярний'):''));
  $title=tag('h3',['class'=>'mt-6 text-2xl'],wp_kses_post($card['name']??''));
  $price=tag('p',['class'=>'mt-8'],tag('span',['class'=>'font-display text-5xl font-light'],number_format((float)($card['price']??0),0,',',"\u{00a0}")).' '.tag('span',['class'=>'text-sm opacity-60'],wp_kses_post($card['unit']??'')));
  $features='';foreach($card['features']??[] as $feature)$features.=tag('li',['class'=>'flex gap-3 border-b pb-3'.($featured?' border-background/15':'')],tag('span',['class'=>'opacity-40'],'—').wp_kses_post($feature));
  $actions=layout_actions($record['buttons']??[],$site,'mt-10');
  $plan=$card['id']??'hour';
  // The enclosing plan also supplies the selected tariff to modal links before enhancement.
  $actions=preg_replace('/data-modal-plan="[^"]*"/','',$actions);
  $actions=str_replace('<a ','<a data-modal-plan="'.esc_attr($plan).'" ',$actions);
  $html.=tag('div',['class'=>'site-tariff-preview'],tag('div',['data-motion'=>true,'data-booking-plan'=>$plan,'class'=>'flex flex-col p-10 transition-transform duration-500 hover:-translate-y-2 '.($featured?'bg-foreground py-14 text-background shadow-lift':'border bg-background shadow-soft')],$top.$title.$price.tag('ul',['class'=>'mt-8 flex-1 space-y-3 text-sm'],$features).$actions));
 }
 return $html?tag('div',['class'=>$class],$html):'';
}
