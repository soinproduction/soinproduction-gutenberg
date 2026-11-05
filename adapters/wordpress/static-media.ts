import {mediaViewportQueries} from '../../core/responsive/breakpoints.js';
/** Enhance server video in place, preserving the already painted LCP element. */
export function enhanceStaticMedia() {
 document.querySelectorAll<HTMLVideoElement>('.site-wordpress-static video[data-site-background]').forEach(video => {
  const mobile=mediaViewportQueries()[0];
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
  const manual=mobile?.matches || reduced.matches || (navigator as Navigator & {connection?:{saveData?:boolean}}).connection?.saveData;
  const button=document.createElement('button');
  button.type='button';button.className='absolute right-6 top-6 z-10 flex h-9 w-9 items-center justify-center border border-background/40 bg-foreground/30 text-background';
  const update=()=>{button.textContent=video.paused?'▶':'Ⅱ';button.setAttribute('aria-label',video.paused?'Відтворити відео':'Призупинити відео');};
  button.addEventListener('click',()=>{if(video.paused)void video.play().catch(()=>{});else video.pause();});
  video.addEventListener('play',update);video.addEventListener('pause',update);update();video.parentElement?.append(button);
  // A muted background may autoplay on desktop; mobile keeps its poster until requested.
  video.muted=true;
  if(!manual && video.dataset.autoplay==='true')void video.play().catch(()=>{});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)video.pause();});
 });
}
