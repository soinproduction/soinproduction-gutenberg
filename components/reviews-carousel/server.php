<?php
namespace SiteTheme\Rendering;
defined('ABSPATH') || exit;
/** Review cards in a row until the carousel script takes over; the same records as the Next carousel. */
function reviews_carousel(?array $ids,array $site,string $class): string {
 $library=$site['reviews']??[];
 $ids=$ids??array_column($library,'id');$cards='';$seen=[];
 foreach($ids as $id){
  if(isset($seen[(string)$id]))continue;$seen[(string)$id]=true;
  $review=null;foreach($library as $item)if((string)$item['id']===(string)$id){$review=$item;break;}
  if(!$review)continue;
  $media=empty($review['image'])?'':tag('div',['class'=>'img-zoom relative aspect-[16/9] overflow-hidden'],image(['url'=>$review['image'],'alt'=>$review['alt']??''],'h-full w-full object-cover').(empty($review['category'])?'':tag('span',['class'=>'absolute bottom-4 left-4 bg-background px-3 py-2 text-xs'],wp_kses_post($review['category']))));
  $note=(!empty($review['note'])||!empty($review['example']))?tag('p',['class'=>'mt-2 text-xs text-muted-foreground'],wp_kses_post($review['note']??'')):'';
  $body=tag('div',['class'=>'flex flex-1 flex-col p-6 for-small-tablet:p-8'],tag('blockquote',['class'=>'flex-1 text-base leading-relaxed'],'«'.wp_kses_post($review['text']??'').'»').tag('div',['class'=>'mt-7 border-t pt-5'],tag('p',['class'=>'text-sm font-semibold'],wp_kses_post($review['author']??'')).$note));
  $cards.=tag('div',['class'=>'min-w-0 shrink-0 grow-0 basis-full pl-5 for-mobile:basis-1/2 for-tablet:basis-1/3'],tag('article',['class'=>'flex h-full min-w-0 flex-col bg-background text-foreground shadow-soft'],$media.$body));
 }
 return $cards?tag('div',['class'=>$class],tag('div',['class'=>'overflow-hidden'],tag('div',['class'=>'-ml-5 flex'],$cards))):'';
}
