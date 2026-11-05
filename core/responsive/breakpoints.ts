/** Package-level helpers: the host owns all breakpoint values (CSS lengths or pixels). */
export function createBreakpoints(values:Record<string,number|string>) {
 const get=(name:string)=>{
  const value=values[name];
  if(typeof value==='number'&&Number.isFinite(value)&&value>0)return `${value}px`;
  if(typeof value==='string'&&/^\d+(?:\.\d+)?(?:px|rem|em)$/.test(value))return value;
  throw new Error(`Unknown or invalid breakpoint: ${name}`);
 };
 return {up:(name:string)=>`(width >= ${get(name)})`,down:(name:string)=>`(width < ${get(name)})`,between:(from:string,to:string)=>`(width >= ${get(from)}) and (width < ${get(to)})`};
}
/** Media boundaries are supplied by the host CSS, without importing a theme into core. */
export function mediaViewportQueries() {
 const styles=getComputedStyle(document.querySelector('.editor-styles-wrapper')??document.documentElement);
 const mobile=styles.getPropertyValue('--site-media-mobile').trim();
 const desktop=styles.getPropertyValue('--site-media-desktop').trim();
 if(!mobile||!desktop)return [];
 const bp=createBreakpoints({mobile,desktop});
 return [matchMedia(bp.down('mobile')),matchMedia(bp.down('desktop'))];
}
