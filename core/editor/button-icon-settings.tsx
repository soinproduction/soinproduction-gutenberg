import { IconPicker } from './icons.js';
import { AlignHorizontalJustifyStart, AlignHorizontalJustifyEnd } from 'lucide-react';
declare const wp: any;
/** Shared button icon and placement controls, available even before choosing an icon. */
export function ButtonIconSettings({ value, onChange }: { value: any; onChange: (value: any) => void }) {
 return <div className="site-button-icon-settings">
  <fieldset className="site-button-icon-position">
   <legend>Icon position</legend>
   <div role="group" aria-label="Icon position">
    {([{value:'before',label:'Before text',Icon:AlignHorizontalJustifyStart},{value:'after',label:'After text',Icon:AlignHorizontalJustifyEnd}] as const).map(({value:position,label,Icon})=><wp.components.Button key={position} aria-pressed={(value.iconPosition||'after')===position} onClick={()=>onChange({...value,iconPosition:position})}><Icon size={16} aria-hidden="true" />{label}</wp.components.Button>)}
   </div>
  </fieldset>
  <IconPicker allowImage={false} value={{type:value.icon||'none'}} onChange={(icon:any)=>onChange({...value,icon:icon.type==='none'?'':icon.type})} />
 </div>;
}
