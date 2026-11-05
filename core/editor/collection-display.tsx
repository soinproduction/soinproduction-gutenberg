import { ButtonIconSettings } from './button-icon-settings.js';
import { EditorAction } from '../ui/editor-action.js';
import { buttonStyleOptions } from '../ui/button-appearance.js';
import { LayoutGrid, ListOrdered, ArrowDown, Plus, ImagePlus, X } from 'lucide-react';
declare const wp: any;
const modes = [
  { value: 'all', label: 'Show all', description: 'Display every item', Icon: LayoutGrid },
  { value: 'pagination', label: 'Pagination', description: 'Numbered pages', Icon: ListOrdered },
  { value: 'lazyload', label: 'Infinite scroll', description: 'Load while scrolling', Icon: ArrowDown },
  { value: 'show-more', label: 'Show more', description: 'Load with a button', Icon: Plus },
];
/** Native Gutenberg controls; the authored collection owns its content and markup. */
export function CollectionDisplaySettings({ label, value, onChange }: { label: string; value: any; onChange: (value: any) => void }) {
  const display=value ?? {}, mode=display.loading ?? 'all';
  return <div className="site-list-display-settings">
    <p className="site-collection-display-title">{label}</p>
    <fieldset className="site-collection-modes">
      <legend>Loading mode: <strong>{modes.find(item=>item.value===mode)?.label}</strong></legend>
      <div role="group" aria-label="Loading mode" className="site-collection-mode-options">
        {modes.map(({value, label, Icon})=><wp.components.Button key={value} label={label} aria-label={label} aria-pressed={mode===value} className="site-collection-mode" onClick={()=>onChange({...display,loading:value})}>
          <Icon size={20} strokeWidth={1.75} aria-hidden="true" />
        </wp.components.Button>)}
      </div>
    </fieldset>
    {mode!=='all' && <wp.components.__experimentalNumberControl label="Items per page" min={1} step={1} value={display.perPage ?? 7} spinControls="custom" __next40pxDefaultSize
      onChange={(raw:string)=>{const perPage=Number(raw);if(Number.isFinite(perPage)&&perPage>=1)onChange({...display,perPage:Math.floor(perPage)});}} />}
    {mode==='show-more' && <div className="site-collection-button-settings">
      <div className="site-collection-button-row"><wp.components.TextControl label="Button text" __next40pxDefaultSize __nextHasNoMarginBottom value={display.button?.text ?? 'LoadMore'} placeholder="LoadMore" onChange={(text:string)=>onChange({...display,button:{...display.button,text}})} />
      <wp.components.Dropdown popoverProps={{placement:'bottom-start'}} renderToggle={({isOpen,onToggle}:any)=><EditorAction action="style" label="Button style" aria-expanded={isOpen} aria-pressed={Boolean(display.button?.style)} onClick={onToggle} />} renderContent={({onClose}:any)=><div className="site-button-styles" role="group" aria-label="Button style">
        {buttonStyleOptions.map(option=><button type="button" className="site-button-style-tile" key={option.value} aria-pressed={(display.button?.style??'')===option.value} onClick={()=>{onChange({...display,button:{...display.button,style:option.value}});onClose();}}><span className={'site-button-style-sample is-'+(option.value||'default')}>Aa</span>{option.label}</button>)}
      </div>} />
      <wp.components.Dropdown popoverProps={{placement:'bottom-end'}} renderToggle={({isOpen,onToggle}:any)=><wp.components.Button label="Button icon" aria-label="Button icon" aria-expanded={isOpen} aria-pressed={Boolean(display.button?.icon && display.button.icon!=='none')} className="site-collection-icon-toggle" onClick={onToggle}><ImagePlus size={20} /></wp.components.Button>} renderContent={({onClose}:any)=><div className="site-collection-icon-popover"><div className="site-collection-icon-header"><span>Button icon</span><wp.components.Button label="Close" aria-label="Close icon settings" onClick={onClose}><X size={16} aria-hidden="true" /></wp.components.Button></div><ButtonIconSettings value={display.button??{}} onChange={button=>onChange({...display,button})} /></div>} />
      </div>
    </div>}
  </div>;
}
