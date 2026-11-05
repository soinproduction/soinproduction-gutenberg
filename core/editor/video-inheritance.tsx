import { useEffect } from 'react';
import { editorMedia } from './environment.js';
import { mediaId, rememberMedia } from './media.js';
import { inheritPlayback, inheritPoster, mediaWithDefaults, playbackKeys, type MediaVariant, type MediaDefaults } from '../media/universal/model.js';
declare const wp: any;
export function useVideoDefaults(id?: number,url?: string,fallback: MediaDefaults = {}): MediaDefaults {
  const attachment=id || (url?mediaId(url):0);
  const media=wp.data.useSelect((select:any)=>attachment?select('core').getMedia(attachment):null,[attachment]);
  useEffect(()=>{if(!attachment)return;const refresh=()=>wp.data.dispatch('core').invalidateResolution('getMedia',[attachment]);window.addEventListener('focus',refresh);return()=>window.removeEventListener('focus',refresh);},[attachment]);
  return media?.site_video_defaults ?? editorMedia()['attachment:'+attachment]?.video ?? fallback;
}
export function VideoInheritance({value,defaults,onChange,background=false,library=true}:{value:any;defaults:MediaDefaults;onChange:(next:any)=>void;background?:boolean;library?:boolean}){
  const variant:MediaVariant=background?{...value,inherit_poster:value.inherit_poster ?? true,poster_url:value.poster}:{...value};
  if(!library){variant.inherit_playback=false;variant.inherit_poster=false;}
  const resolved=mediaWithDefaults(variant,defaults);
  const customPlayback=!inheritPlayback(variant),customPoster=!inheritPoster(variant);
  const patch=(next:any)=>onChange({...value,...next});
  const {ToggleControl,Button}=wp.components;const {MediaUpload,MediaUploadCheck}=wp.blockEditor;
  return <div className="site-video-inheritance">
    <p className="sp-media-help">{library ? 'Media Library settings apply everywhere. Overrides below affect this component only.' : 'Settings apply to this component only.'}</p>
    {library && !background && <ToggleControl label="Custom poster for this component" checked={customPoster} onChange={(enabled:boolean)=>patch({inherit_poster:!enabled,...(enabled?background?{poster:resolved.poster_url}:{poster_id:resolved.poster_id,poster_url:resolved.poster_url}:{})})}/>}
    {!background && resolved.poster_url && <img className="site-video-inheritance-poster" src={resolved.poster_url} alt="Video poster"/>}
    {!background && customPoster && <div className="site-media-actions"><MediaUploadCheck><MediaUpload allowedTypes={['image']} value={variant.poster_id} onSelect={(asset:any)=>{rememberMedia(asset);patch(background?{poster:asset.url,poster_id:asset.id,inherit_poster:false}:{poster_url:asset.url,poster_id:asset.id,inherit_poster:false});}} render={({open}:any)=><Button variant="secondary" onClick={open}>Select poster</Button>}/></MediaUploadCheck><Button variant="tertiary" onClick={()=>patch(background?{poster:'',poster_id:0}:{poster_url:'',poster_id:0})}>No poster</Button></div>}
    {library && <ToggleControl label="Custom playback for this component" checked={customPlayback} onChange={(enabled:boolean)=>patch({inherit_playback:!enabled,...(enabled?Object.fromEntries(playbackKeys.map(key=>[key,resolved[key] ?? (background?key!=='controls':key==='controls')])):{})})}/>}
    {customPlayback && <div className="site-video-inheritance-options">{playbackKeys.map(key=><ToggleControl key={key} label={{autoplay:'Autoplay',muted:'Muted',loop:'Loop',controls:'Player controls',custom_play:'Play button'}[key]} checked={resolved[key] ?? (background?key!=='controls':key==='controls')} onChange={(checked:boolean)=>patch({[key]:checked,inherit_playback:false})}/>)}</div>}
  </div>;
}
