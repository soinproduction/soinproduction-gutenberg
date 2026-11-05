import {enhanceStaticMedia} from './static-media.js';
import {Component, useEffect, useLayoutEffect, useState, type ReactNode} from 'react';
import {createRoot} from 'react-dom/client';
import {createPortal} from 'react-dom';
import {ContentProvider} from '../../core/content/context.js';
import type {ModuleDefinition} from '../../core/modules/types.js';
import type {ComponentType} from 'react';
import {resolveMedia as mediaValues} from '../../core/media/values.js';

export function mountWordPress({getModules,BlockList,SiteShell}: {
 getModules:()=>ModuleDefinition[];
 BlockList:ComponentType<any>;
 SiteShell:ComponentType<any>;
}) {
/** Keep PHP visible until an island has committed successfully. */
function Island({target, children}: { target: HTMLElement; children: ReactNode }) {
    const [mount] = useState(() => {
        const element = document.createElement('div');
        element.style.display = 'contents';
        return element;
    });
    useLayoutEffect(() => {
        const fallback = Array.from(target.childNodes);
        target.replaceChildren(mount);
        return () => {
            target.replaceChildren(...fallback);
        };
    }, [target, mount]);
    return createPortal(children, mount);
}

class FallbackBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
    state = {failed: false};

    static getDerivedStateFromError() {
        return {failed: true};
    }

    render() {
        return this.state.failed ? null : this.props.children;
    }
}

/** Keep the already functional PHP header until a visitor interacts with navigation. */
function InteractiveHeader({target,site}:{target:HTMLElement;site:any}) {
 const [active,setActive]=useState(false);
 useEffect(()=>{
  const enable=()=>{
   site.runtime.initialMobileMenu=!!target.querySelector('details[data-mobile-menu][open]');
   const menu=target.querySelector<HTMLElement>('details[data-menu-index][open]');
   site.runtime.initialDesktopMenu=menu?'services-'+menu.dataset.menuIndex:'';
   setActive(true);
  };
  const click=()=>requestAnimationFrame(enable);
  const hover=(event:PointerEvent)=>{if(event.pointerType==='mouse')enable();};
  target.addEventListener('click',click,{once:true});
  target.addEventListener('pointerover',hover);
  target.addEventListener('keyup',click,{once:true});
  return ()=>{target.removeEventListener('click',click);target.removeEventListener('pointerover',hover);target.removeEventListener('keyup',click);};
 },[target,site]);
 return active?<Island target={target}><BlockList blocks={site.header} site={site}/></Island>:null;
}

/** PHP owns crawlable HTML; browser React provides shared interactions. */
const payload = document.getElementById('site-wordpress-data');
if (payload) {
    const {site, instances} = JSON.parse(payload.textContent ?? '{}');
    site.runtime.retainedHeaderLogo = document.querySelector('#site-header-root header img');
    const root = document.createElement('div');
    root.id = 'site-wordpress-runtime';
    document.body.append(root);
    enhanceStaticMedia();
    const islands = instances.flatMap((instance: any) => {
        if (instance.static) return [];
        const target = document.getElementById(instance.id);
        const definition = getModules().find(section => section.name === instance.block.name);
        if (!target || !definition) return [];
        const View = definition.View;
        return [<FallbackBoundary key={instance.id}><Island target={target}>
            <ContentProvider data={mediaValues(instance.block.attrs.data ?? {}, site.media)}
                             innerBlocks={instance.block.innerBlocks ?? []} site={site}><View
                data={mediaValues(instance.block.attrs.data ?? {}, site.media)}
                blocks={instance.block.innerBlocks ?? []} site={site}/></ContentProvider>
        </Island></FallbackBoundary>];
    });
    for (const part of ['header', 'footer'] as const) {
        const target = document.getElementById(`site-${part}-root`);
        if (target && site[part]?.length) islands.push(
            <FallbackBoundary key={part}>{part==='header'?<InteractiveHeader target={target} site={site}/>:<Island target={target}><BlockList blocks={site[part]}
                                                                            site={site}/></Island>}</FallbackBoundary>
        );
    }
    createRoot(root).render(<SiteShell site={site} chrome={false}>{islands}</SiteShell>);
}

}
