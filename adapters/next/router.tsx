'use client';
import {useSite,useIsEditor} from '../../core/content/context.js';
import {usePathname} from 'next/navigation';
export function Link({to,params={},search,hash,activeProps,children,...props}:any){
 const editor=useIsEditor();
 let href=String(to??'/').replace(/\$([\w]+)/g,(_,key)=>encodeURIComponent(params[key]??''));
 if(search) href+='?'+new URLSearchParams(search).toString(); if(hash) href+='#'+hash;
 return <a href={href} {...props} onClick={(event)=>{if(editor){event.preventDefault();return;}props.onClick?.(event);}} onAuxClick={(event)=>{if(editor)event.preventDefault();else props.onAuxClick?.(event);}}>{children}</a>;
}
export function useLocation({select}:any){return select({pathname:usePathname()});}
export function useBookingSearch():{plan?:string} { const site=useSite();const value=site.query?.plan;return site.settings?.plans?.some((p:any)=>p.id===value)?{plan:value}:{}; }

export function useNavigate(_options?:any){const editor=useIsEditor();return ({search}:any)=>{if(editor)return;window.location.assign(window.location.pathname+'?'+new URLSearchParams(search).toString());};}
