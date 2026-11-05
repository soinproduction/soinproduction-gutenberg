'use client';
import {useEffect,useRef,useContext,createContext,useId,type ReactNode} from 'react';
export type DisclosureSettings={mode?:'accordion'|'tabs';multiple?:boolean;firstOpen?:boolean;duration?:number;icon?:string;iconPosition?:'before'|'after';responsive?:Record<string,'accordion'|'tabs'>};
export function disclosureMode(settings:DisclosureSettings,width:number,breakpoints:Record<string,number>){
 const range=Object.entries(breakpoints).sort((a,b)=>a[1]-b[1]).filter(([,min])=>width>=min).at(-1)?.[0];
 return (range&&settings.responsive?.[range])||settings.mode||'accordion';
}
/** Native details remain usable without JS; enhancement adds tabs, keyboard navigation and motion. */
const SettingsContext=createContext<DisclosureSettings>({});
export function DisclosureView({children,className,settings,breakpoints,editor=false}:{children:ReactNode;className?:string;settings:DisclosureSettings;breakpoints:Record<string,number>;editor?:boolean}){
 const ref=useRef<HTMLDivElement>(null);
 useEffect(()=>{
  const root=ref.current;if(!root)return;
  const doc=root.ownerDocument,win=doc.defaultView!;
  const nav=doc.createElement('div');nav.className='site-disclosure-tabs';nav.setAttribute('role','tablist');nav.setAttribute('aria-label','Sections');root.prepend(nav);
  const items=()=>Array.from(root.querySelectorAll<HTMLDetailsElement>('details[data-disclosure-item]'));
  const animations=new Map<Element,Animation>();
  const intended=new Map<Element,boolean>();
  let mode='';
  const reduced=win.matchMedia('(prefers-reduced-motion: reduce)');
  const animate=(item:HTMLDetailsElement,open:boolean)=>{
   const panel=item.querySelector<HTMLElement>('[data-disclosure-content]');
   const previous=animations.get(item);
   if(previous&&intended.get(item)===open)return;
   // Capture the visible height before cancelling an interrupted transition.
   const from=item.getBoundingClientRect().height;
   previous?.cancel();intended.set(item,open);
   if(!panel||!item.animate||reduced.matches||!settings.duration){item.open=open;intended.delete(item);return;}
   const summary=item.querySelector('summary')!;
   item.open=true;
   const expanded=item.getBoundingClientRect().height;
   const border=parseFloat(win.getComputedStyle(item).borderTopWidth)+parseFloat(win.getComputedStyle(item).borderBottomWidth);
   const collapsed=summary.getBoundingClientRect().height+border;
   // Clip the outer box so answer padding cannot cause a jump at either end.
   const animation=item.animate([{height:from+'px',overflow:'hidden'},{height:(open?expanded:collapsed)+'px',overflow:'hidden'}],{duration:settings.duration,easing:'cubic-bezier(.2,.7,.2,1)',fill:'both'});
   animations.set(item,animation);
   animation.onfinish=()=>{if(animations.get(item)!==animation)return;item.open=open;animation.cancel();animations.delete(item);intended.delete(item);};
  };
  const select=(index:number,focus=false)=>{
   animations.forEach(animation=>animation.cancel());animations.clear();intended.clear();
   items().forEach((item,i)=>{item.open=i===index;const tab=nav.children[i] as HTMLButtonElement;tab?.setAttribute('aria-selected',String(i===index));if(tab)tab.tabIndex=i===index?0:-1;});
   if(focus)(nav.children[index] as HTMLElement)?.focus();
  };
  const setup=()=>{
   const rows=items();
   nav.replaceChildren(...rows.map((item,i)=>{
    const button=doc.createElement('button');button.type='button';button.setAttribute('role','tab');button.textContent=item.querySelector('summary')?.textContent?.trim()||`Item ${i+1}`;
    const id=root.id+'-'+i;item.id=id;button.id=id+'-tab';button.setAttribute('aria-controls',id);
    button.onclick=()=>select(i);
    button.onkeydown=event=>{let next=i;if(event.key==='ArrowRight')next=(i+1)%rows.length;else if(event.key==='ArrowLeft')next=(i+rows.length-1)%rows.length;else if(event.key==='Home')next=0;else if(event.key==='End')next=rows.length-1;else return;event.preventDefault();select(next,true);};return button;
   }));
   rows.forEach(item=>{item.removeAttribute('name');});
   update();
  };
  const update=()=>{
   const next=disclosureMode(settings,win.innerWidth,breakpoints);const changed=next!==mode;mode=next;root.dataset.disclosureMode=mode;nav.hidden=mode!=='tabs';
   const rows=items();rows.forEach(item=>{if(mode==='tabs'){item.setAttribute('role','tabpanel');item.setAttribute('aria-labelledby',item.id+'-tab');}else{item.removeAttribute('role');item.removeAttribute('aria-labelledby');}});
   if(mode==='tabs')select(Math.max(0,rows.findIndex(item=>item.open)));
   else if(changed&&!settings.multiple){let found=false;rows.forEach(item=>{if(item.open){if(found)item.open=false;found=true;}});}
  };
  const click=(event:MouseEvent)=>{
   const target=event.target as Element;const summary=target.closest('summary');if(!summary||!root.contains(summary)||mode==='tabs'||target.closest('[contenteditable=true],input,textarea,a,button'))return;
   const item=summary.parentElement as HTMLDetailsElement;if(!item.matches('[data-disclosure-item]'))return;
   event.preventDefault();const open=!(intended.get(item)??item.open);
   if(open&&!settings.multiple)items().filter(row=>row!==item&&row.open).forEach(row=>animate(row,false));
   animate(item,open);
  };
  const initial=items();if(settings.firstOpen&&initial[0])initial[0].open=true;
  setup();root.addEventListener('click',click);win.addEventListener('resize',update);
  const observer=new MutationObserver(records=>{if(records.some(record=>!nav.contains(record.target)))setup();});
  const slot=root.querySelector('[data-disclosure-items]');if(slot)observer.observe(slot,{childList:true,subtree:true,characterData:true});
  return ()=>{observer.disconnect();root.removeEventListener('click',click);win.removeEventListener('resize',update);animations.forEach(animation=>animation.cancel());nav.remove();};
 },[JSON.stringify(settings),JSON.stringify(breakpoints)]);
 return <SettingsContext.Provider value={settings}><div ref={ref} id={'disclosure-'+useStableId()} className={className} data-disclosure-editor={editor?'true':undefined} data-disclosure-mode={settings.mode||'accordion'} data-icon-position={settings.iconPosition||'after'}><div data-disclosure-items>{children}</div></div></SettingsContext.Provider>;
}
import {Icon} from '../icons/icon.js';
function useStableId(){return useId().replace(/[^a-zA-Z0-9_-]/g,'');}
export function AccordionItem({children,className}:{children:ReactNode;className?:string}){return <details data-disclosure-item className={className}>{children}</details>;}
export function AccordionTrigger({children,className}:{children:ReactNode;className?:string}){const settings=useContext(SettingsContext);return <summary className={className}>{children}{settings.icon!==''&&<span data-disclosure-icon>{settings.icon?<Icon icon={{type:settings.icon}} />:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>}</span>}</summary>;}
export function AccordionContent({children,className}:{children:ReactNode;className?:string}){return <div data-disclosure-content className={className}>{children}</div>;}
