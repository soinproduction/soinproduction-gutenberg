import {useSyncExternalStore} from 'react';
const subscribe=(notify:()=>void)=>{window.addEventListener('popstate',notify);return()=>window.removeEventListener('popstate',notify);};
export function usePathname(){return useSyncExternalStore(subscribe,()=>window.location.pathname,()=>'/');}
export function useRouter(){return {push:(url:string)=>window.location.assign(url),replace:(url:string)=>window.location.replace(url),refresh:()=>window.location.reload()};}
