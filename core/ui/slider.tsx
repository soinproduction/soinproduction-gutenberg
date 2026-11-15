'use client';
import { useClasses, type Classes } from '../../shared/index.js';
import { useEffect, useRef, type ReactNode } from 'react';
import EmblaCarousel from 'embla-carousel';

/** One controller for any authored slide markup. Controls are scoped to their section. */
export function mountSlider(root: HTMLElement) {
 const viewport=root.querySelector<HTMLElement>('[data-slider-viewport]');
 const slot=root.querySelector<HTMLElement>('[data-slider-track]');
 if(!viewport||!slot)return ()=>{};
 const child=slot.children.length===1?slot.firstElementChild:null;
 // List and Records may wrap their item track in LoadedCollection.
 const collection=child?.classList.contains('site-loaded-list')?child.firstElementChild:child;
 const track=collection?.classList.contains('site-slider-items')?collection as HTMLElement:slot;
 const scope=root.closest('section')??root.parentElement??root;
 const controls=Array.from(scope.querySelectorAll<HTMLButtonElement>('[data-slider-button]')).filter(button=>button.dataset.sliderFor===root.dataset.slider);
 const paginations=Array.from(scope.querySelectorAll<HTMLElement>('[data-slider-pagination]')).filter(element=>element.dataset.sliderFor===root.dataset.slider);
 const until=parseFloat(root.ownerDocument.defaultView!.getComputedStyle(root).getPropertyValue('--site-slider-until'));
 const api=EmblaCarousel(viewport,{...(until?{breakpoints:{[`(min-width: ${until}px)`]:{active:false}}}:{}),container:track,slides:Array.from(track.children) as HTMLElement[],align:'start',loop:root.dataset.sliderLoop==='true',slidesToScroll:1,watchDrag:(_api,event)=>{
  const target=event.target as Element|null;
  return !target?.closest('input,textarea,select,button,a,[contenteditable="true"],[role="textbox"],.components-popover');
 }});
 const keyboard=(event:KeyboardEvent)=>{
  if(event.target!==viewport)return;
  if(event.key==='ArrowLeft'){event.preventDefault();api.scrollPrev();}
  if(event.key==='ArrowRight'){event.preventDefault();api.scrollNext();}
 };
 viewport.addEventListener('keydown',keyboard);
 const handlers=controls.map(button=>{
  const click=()=>button.dataset.sliderButton==='previous'?api.scrollPrev():api.scrollNext();
  button.addEventListener('click',click);return ()=>button.removeEventListener('click',click);
 });
 const sync=()=>{
  for(const button of controls)button.disabled=button.dataset.sliderButton==='previous'?!api.canScrollPrev():!api.canScrollNext();
  Array.from(track.children).forEach((slide,index)=>{slide.setAttribute('role','group');slide.setAttribute('aria-roledescription','slide');slide.setAttribute('aria-label',`${index+1} / ${track.children.length}`);});
  const count=track.children.length?api.scrollSnapList().length:0;
  for(const pagination of paginations){
   if(pagination.children.length!==count){
    pagination.replaceChildren(...Array.from({length:count},(_,index)=>{
     const button=root.ownerDocument.createElement('button');button.type='button';
     button.className=pagination.dataset.sliderPageClass??'';
     button.setAttribute('aria-label',`${pagination.dataset.sliderPageLabel??'Slide'} ${index+1}`);
     button.addEventListener('click',()=>api.scrollTo(index));return button;
    }));
   }
   Array.from(pagination.children).forEach((button,index)=>button.setAttribute('aria-current',index===api.selectedScrollSnap()?'true':'false'));
  }
 };
 api.on('select',sync);api.on('reInit',sync);sync();
 const observer=new MutationObserver(()=>api.reInit({slides:Array.from(track.children) as HTMLElement[]}));
 observer.observe(track,{childList:true});
 root.dataset.sliderReady='true';
 return ()=>{observer.disconnect();viewport.removeEventListener('keydown',keyboard);handlers.forEach(remove=>remove());api.destroy();delete root.dataset.sliderReady;paginations.forEach(element=>element.replaceChildren());};
}
export function SliderViewport({name,children,className,trackClassName,loop=false,label='Slider',editor=false,activeBelow}:{name:string;children:ReactNode;className?:string;trackClassName?:string;loop?:boolean;label?:string;editor?:boolean;activeBelow?:string}) {
 const ref=useRef<HTMLDivElement>(null);
 useEffect(()=>{if(ref.current)return mountSlider(ref.current);},[editor,name,loop,activeBelow]);
 return <div ref={ref} className={className} data-slider={name} data-slider-below={activeBelow} data-slider-loop={loop?'true':'false'} data-slider-editor={editor?'true':undefined} role="region" aria-roledescription="carousel" aria-label={label}>
  <div data-slider-viewport tabIndex={editor?undefined:0}><div className={trackClassName} data-slider-track>{children}</div></div>
 </div>;
}
export function SliderButton({slider,direction='next',children,label,...classes}:Classes & {slider:string;direction?:'previous'|'next';children?:ReactNode;label?:string}){
 return <button type="button" data-slider-for={slider} data-slider-button={direction} className={useClasses(classes)} aria-label={label??(direction==='previous'?'Previous slide':'Next slide')} disabled>{children??(direction==='previous'?'←':'→')}</button>;
}
export function SliderPagination({slider,buttonClassName,label='Slider pages',pageLabel='Slide',...classes}:Classes & {slider:string;buttonClassName?:string;label?:string;pageLabel?:string}){
 return <div data-slider-for={slider} data-slider-pagination data-slider-page-class={buttonClassName} data-slider-page-label={pageLabel} className={useClasses(classes)} role="group" aria-label={label} />;
}
