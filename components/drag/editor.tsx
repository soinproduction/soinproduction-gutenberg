'use client';
import { MonitorSmartphone, AlignVerticalJustifyCenter, AlignVerticalJustifyStart, AlignVerticalJustifyEnd, AlignHorizontalJustifyStart, AlignHorizontalJustifyCenter, AlignHorizontalJustifyEnd, StretchHorizontal } from 'lucide-react';
import { useState } from 'react';
import { EditorAction } from '../../core/ui/editor-action.js';
import { flowColumnLayout, flowLayers, flowTracks, resolveFlowTemplate, type Placement } from './layout.js';
import { BREAKPOINTS, COLUMN_BREAKPOINT, LAYOUT_BREAKPOINTS } from '../../generated/responsive.js';
import { BreakpointIcon, breakpointLabel, breakpointRange, editorBreakpoints, setViewport, useCanvasWidth, useViewport } from '../../admin-ui/viewport.js';
declare const wp: any;
export function flowPalettes(field: any) {
    const palettes = field.controlOptions.palettes ?? [];
    return palettes.length ? palettes : [{ name: '', label: 'Column', template: field.controlOptions.dragTemplate ?? [], className: '' }];
}
export function FlowDragEditor({ field, className }: { field: any; className?: string }) {
    const {name,clientId} = wp.blockEditor.useBlockEditContext();
    const palettes = flowPalettes(field);
    const appender = false;
    const template = palettes.filter((palette:any)=>palette.initial !== false).map((palette:any) => [name+'-column',{
        palette:palette.name,fullRow:palette.fullRow ?? false,metadata:{name:palette.label}
    },resolveFlowTemplate(palette.template ?? [],name,palette.name)]);
    const grid=Number(field.controlOptions.grid)||0,mobileGrid=Number(field.controlOptions.mobileGrid)||grid;
    // The guides follow the tracks the canvas shows: mobileGrid below the columns breakpoint.
    const tracks=useCanvasWidth()<BREAKPOINTS[COLUMN_BREAKPOINT as keyof typeof BREAKPOINTS]?mobileGrid:grid;
    const {children,...props}=wp.blockEditor.useInnerBlocksProps({'data-toolbar-position':field.controlOptions.toolbarPosition ?? 'top right',className:['site-flow-drag',grid?'has-grid':'',className].filter(Boolean).join(' '),style:{'--site-flow-columns':grid||field.controlOptions.maxCol||2,'--site-flow-mobile-columns':grid?mobileGrid:undefined,'--site-flow-gap':field.controlOptions.gap}},{
        allowedBlocks:[name+'-column'],template,templateInsertUpdatesSelection:false,templateLock:false,renderAppender:appender,
    });
    return <div {...props}>
        <svg className="site-record-add-frame site-flow-drag-frame" aria-hidden="true"><rect rx="2" /></svg>
        <div className="site-flow-drag-tools site-inline-tools" contentEditable={false} onClick={(event:any)=>event.stopPropagation()}>
            <wp.blockEditor.Inserter rootClientId={clientId} isAppender __experimentalIsQuick
                renderToggle={({onToggle,disabled,isOpen}:any)=><EditorAction action="addColumn" label="Add column" aria-expanded={isOpen} disabled={disabled} onClick={onToggle} />} />
        </div>
        {children}
        {grid ? <div className="site-flow-guides" aria-hidden="true">{Array.from({length:tracks},(_,index)=><span key={index} />)}</div> : null}
    </div>;
}
export function registerFlowColumn(section:any,field:any) {
    const palettes=flowPalettes(field);
    wp.blocks.registerBlockType(section.name+'-column',{
        apiVersion:3,title:'Content column',category:'site',icon:'columns',parent:[section.name],
        attributes:{palette:{type:'string',default:palettes[0].name},start:{type:'number',default:0},span:{type:'number',default:0},responsive:{type:'object',default:{}},fullRow:{type:'boolean',default:false},verticalAlign:{type:'string',enum:['top','center','bottom'],default:'top'},horizontalAlign:{type:'string',enum:['stretch','left','center','right'],default:'stretch'}},
        supports:{html:false,reusable:false},
        variations:[{name:'columns',title:'Columns',icon:'columns',isDefault:true,isActive:(attrs:any)=>attrs.palette==='',scope:['inserter','block'],
            attributes:{palette:'',metadata:{name:'Columns'}},innerBlocks:[]}],
        edit: ({attributes,setAttributes,clientId}:any) => <FlowColumnEditor section={section} field={field} palettes={palettes} attributes={attributes} setAttributes={setAttributes} clientId={clientId} />,
        save:()=> <wp.blockEditor.InnerBlocks.Content />,
    });
}
function FlowColumnEditor({section,field,palettes,attributes,setAttributes,clientId}:any) {
    const palette=attributes.palette===''?{name:'',label:'Columns',className:'',buttonPosition:'bottom center'}:palettes.find((item:any)=>item.name===attributes.palette)??palettes[0];
    const layout=wp.data.useSelect((select:any)=>{
        const store=select('core/block-editor'),parent=store.getBlockRootClientId(clientId);
        const siblings=store.getBlocks(parent).filter((block:any)=>block.name===section.name+'-column');
        return {parent,ids:siblings.map((block:any)=>block.clientId),index:siblings.findIndex((block:any)=>block.clientId===clientId),empty:store.getBlockCount(clientId)===0};
    },[clientId]);
    const moveTo=(index:number)=>wp.data.dispatch('core/block-editor').moveBlocksToPosition([clientId],layout.parent,layout.parent,index);
    const appender = wp.blockEditor.InnerBlocks.ButtonBlockAppender;
    const grid=Number(field.controlOptions.grid)||0,maxCol=Number(field.controlOptions.maxCol)||2,mobileGrid=Number(field.controlOptions.mobileGrid)||grid;
    const names=[...LAYOUT_BREAKPOINTS];
    const chosen=useViewport();
    const canvasWidth=useCanvasWidth();
    // Without a chosen breakpoint the editor shows and edits the default placement only; a breakpoint shows the site as it is in that range.
    const columnLayout=flowColumnLayout(grid,chosen?attributes:{...attributes,responsive:{}},palette,maxCol,COLUMN_BREAKPOINT,names,mobileGrid);
    const layers=flowLayers(grid,attributes,palette,maxCol,COLUMN_BREAKPOINT,names,mobileGrid);
    // The layer an edit writes to: `default` or the chosen breakpoint.
    const target=grid?chosen??'default':null;
    const tracks=chosen?flowTracks(grid,mobileGrid,COLUMN_BREAKPOINT,names,chosen):grid;
    const aboveBase=(name:string)=>names.indexOf(name)>=names.indexOf(COLUMN_BREAKPOINT);
    // Below the columns breakpoint the default placement stacks, so the canvas has nothing to resize.
    const resizable=Boolean(target&&(chosen||canvasWidth>=BREAKPOINTS[COLUMN_BREAKPOINT as keyof typeof BREAKPOINTS]));
    const responsive:Record<string,Placement>=attributes.responsive??{};
    const adaptive=editorBreakpoints.filter(name=>responsive[name]);
    // A breakpoint without a placement of its own uses the default from the columns breakpoint up and spans the row below it.
    const inherited=chosen&&!layers[chosen]&&aboveBase(chosen)?'default':undefined;
    const placement=target?layers[target]??(inherited?layers.default:{start:1,span:tracks}):null;
    const place=(value:{start:number;span:number})=>{
        if(!target)return;
        if(target==='default')setAttributes({...value,fullRow:false});
        else setAttributes({fullRow:false,responsive:{...responsive,[target]:{...responsive[target],...value}}});
    };
    const alignment=chosen?{...attributes,...responsive[chosen]}:attributes;
    const align=(value:Placement)=>chosen?setAttributes({responsive:{...responsive,[chosen]:{...responsive[chosen],...value}}}):setAttributes(value);
    const reset=()=>{const {[target as string]:_removed,...rest}=responsive;setAttributes({responsive:rest});};
    const blockProps=wp.blockEditor.useBlockProps({style:{...columnLayout.style,'--site-flow-color':columnColors[Math.max(0,layout.index)%columnColors.length]},'data-button-position':palette.buttonPosition??'bottom right','data-vertical-align':attributes.verticalAlign??'top','data-horizontal-align':attributes.horizontalAlign??'stretch',className:['site-flow-column',layout.empty?'is-empty':'',attributes.fullRow?'is-full-row':'',adaptive.length?'has-adaptive':'',...columnLayout.classes,palette.className].filter(Boolean).join(' ')});
    const innerProps=wp.blockEditor.useInnerBlocksProps(blockProps,{
        allowedBlocks:[section.name+'-element',...(field.controlOptions.allow??[])],templateLock:false,renderAppender:appender,templateInsertUpdatesSelection:false,
    });
    const fullRow=Boolean(attributes.fullRow);
    const setFullRow=(value:boolean)=>setAttributes({fullRow:value});
    const controls = <>
        <wp.components.ToggleControl label="Full row" checked={fullRow} onChange={setFullRow} />
        {grid && !fullRow ? <ColumnLayout grid={tracks} target={target} isDefault={!chosen} placement={placement} inherited={inherited} own={!chosen||Boolean(chosen&&responsive[chosen])}
            placed={adaptive} color={columnColors[Math.max(0,layout.index)%columnColors.length]} onPlace={place} onReset={chosen&&responsive[chosen]?reset:undefined} /> : null}
        <AlignmentButtons label="Vertical alignment" value={alignment.verticalAlign??'top'} options={[
            {value:'top',label:'Top',Icon:AlignVerticalJustifyStart},
            {value:'center',label:'Center',Icon:AlignVerticalJustifyCenter},
            {value:'bottom',label:'Bottom',Icon:AlignVerticalJustifyEnd},
        ]} onChange={(verticalAlign:string)=>align({verticalAlign})} />
        <AlignmentButtons label="Horizontal alignment" value={alignment.horizontalAlign??'stretch'} options={[
            {value:'left',label:'Left',Icon:AlignHorizontalJustifyStart},
            {value:'center',label:'Center',Icon:AlignHorizontalJustifyCenter},
            {value:'right',label:'Right',Icon:AlignHorizontalJustifyEnd},
            {value:'stretch',label:'Stretch',Icon:StretchHorizontal},
        ]} onChange={(horizontalAlign:string)=>align({horizontalAlign})} />

    </>;
    const {children,...containerProps}=innerProps;
    return <>
        <wp.blockEditor.InspectorControls><wp.components.PanelBody title={`Column ${layout.index+1}`}>
            <p>{grid?`Drag the column edges to place it on the ${tracks}-column grid.`:`Rows are arranged automatically. Up to ${field.controlOptions.maxCol} columns per row.`}</p>
            {controls}
        </wp.components.PanelBody></wp.blockEditor.InspectorControls>
        <div {...containerProps}>
            <svg className="site-record-add-frame site-flow-column-frame" aria-hidden="true"><rect rx="2" /></svg>
            <div className="site-flow-column-tools site-inline-tools" contentEditable={false} onClick={(event:any)=>event.stopPropagation()}>
                <EditorAction action="up" label="Move column earlier" disabled={layout.index===0} onClick={()=>moveTo(layout.index-1)} />
                <EditorAction action="down" label="Move column later" disabled={layout.index===layout.ids.length-1} onClick={()=>moveTo(layout.index+1)} />
                <wp.components.Dropdown popoverProps={{placement:'bottom-end'}} renderToggle={({isOpen,onToggle}:any)=><EditorAction action="alignment" label="Column alignment" aria-expanded={isOpen} onClick={onToggle} />} renderContent={()=><div className="site-flow-column-settings">{controls}</div>} />
                <EditorAction action={fullRow?"columns":"fullRow"} label={fullRow?"Return to columns":"Full row"} aria-pressed={fullRow} isPressed={fullRow} onClick={()=>setFullRow(!fullRow)} />
            </div>
            {adaptive.length ? <span className="site-flow-adaptive" contentEditable={false}>
                {adaptive.map(name=><button key={name} type="button" className={'has-settings'+(name===target?' is-current':'')} title={`${breakpointLabel(name)} · own layout at ${breakpointRange(name)}`}
                    onClick={(event)=>{event.stopPropagation();setViewport(name);}}>
                    <BreakpointIcon value={BREAKPOINTS[name as keyof typeof BREAKPOINTS]} />
                </button>)}
            </span> : null}
            {grid && target && resizable && !fullRow ? <>
                <span className="site-flow-resize is-start" contentEditable={false} aria-hidden="true" onPointerDown={(event:any)=>resizeColumn(event,'start',tracks,target,place)} />
                <span className="site-flow-resize is-end" contentEditable={false} aria-hidden="true" onPointerDown={(event:any)=>resizeColumn(event,'end',tracks,target,place)} />
            </> : null}
            {children}
        </div>
    </>;
}

/** Each column and its handles get their own colour, so neighbours are easy to tell apart. */
const columnColors=['#3858e9','#d9480f','#7c3aed','#0b8a7a','#c2255c','#a16207'];
/** Grid lines of the Drag container, measured from its rendered tracks; the middle of a gap counts as the line. */
function gridLines(container: HTMLElement, grid: number) {
    const style=getComputedStyle(container);
    const tracks=style.gridTemplateColumns.split(' ').map(parseFloat);
    if(tracks.length!==grid||tracks.some(Number.isNaN))return null;
    const gap=parseFloat(style.columnGap)||0;
    let x=container.getBoundingClientRect().left+(parseFloat(style.borderLeftWidth)||0)+(parseFloat(style.paddingLeft)||0);
    const lines=[x];
    tracks.forEach((track,index)=>{x+=track;lines.push(index<grid-1?x+gap/2:x);x+=gap;});
    return lines;
}
const nearestLine=(lines:number[],x:number)=>lines.reduce((best,line,index)=>Math.abs(line-x)<Math.abs(lines[best]-x)?index:best,0)+1;
/** Drags one edge to a grid line; the column previews through CSS variables and saves once on release. */
function resizeColumn(event: any, edge: 'start' | 'end', grid: number, breakpoint: string, place: (value: { start: number; span: number }) => void) {
    const handle=event.currentTarget as HTMLElement,column=handle.closest('.site-flow-column') as HTMLElement|null,container=column?.parentElement;
    const lines=column&&container?gridLines(container,grid):null;
    if(!column||!container||!lines||event.button!==0)return;
    event.preventDefault();event.stopPropagation();
    const box=column.getBoundingClientRect();
    let start=nearestLine(lines,box.left),end=Math.max(start+1,nearestLine(lines,box.right));
    const initial=[start,end].join(),startVar=`--site-col-${breakpoint}-start`,spanVar=`--site-col-${breakpoint}-span`;
    const before={placed:column.classList.contains('site-col-at-'+breakpoint),full:column.classList.contains('is-full-row'),start:column.style.getPropertyValue(startVar),span:column.style.getPropertyValue(spanVar)};
    const guides=Array.from(container.querySelector(':scope>.site-flow-guides')?.children??[]);
    const preview=()=>{
        column.style.setProperty(startVar,String(start));column.style.setProperty(spanVar,String(end-start));
        handle.dataset.span=`${end-start} / ${grid}`;
        guides.forEach((guide,index)=>guide.classList.toggle('is-covered',index>=start-1&&index<end-1));
    };
    container.style.setProperty('--site-flow-active',getComputedStyle(column).getPropertyValue('--site-flow-color'));
    column.classList.remove('is-full-row');column.classList.add('is-resizing','site-col-at-'+breakpoint);container.classList.add('is-resizing');handle.classList.add('is-active');preview();
    handle.setPointerCapture(event.pointerId);
    const move=(next:PointerEvent)=>{
        const line=nearestLine(lines,next.clientX);
        if(edge==='start')start=Math.min(line,end-1);else end=Math.max(line,start+1);
        preview();
    };
    const stop=()=>{
        handle.removeEventListener('pointermove',move);handle.removeEventListener('pointerup',stop);handle.removeEventListener('pointercancel',stop);
        container.classList.remove('is-resizing');column.classList.remove('is-resizing');handle.classList.remove('is-active');
        guides.forEach(guide=>guide.classList.remove('is-covered'));
        // React rewrites the class and the variables from the saved placement on the next render.
        if([start,end].join()!==initial)return place({start,span:end-start});
        // Released without a change: put back what React rendered.
        column.classList.toggle('site-col-at-'+breakpoint,before.placed);column.classList.toggle('is-full-row',before.full);
        for(const [name,value] of [[startVar,before.start],[spanVar,before.span]])value?column.style.setProperty(name,value):column.style.removeProperty(name);
    };
    handle.addEventListener('pointermove',move);handle.addEventListener('pointerup',stop);handle.addEventListener('pointercancel',stop);
}

/**
 * Column placement for one breakpoint: device tabs (a dot marks an own placement), a strip of the grid tracks
 * where dragging across cells sets start and width, and the exact numbers below it.
 */
function ColumnLayout({grid,target,isDefault,placement,inherited,own,placed,color,onPlace,onReset}:{grid:number;target:string|null;isDefault:boolean;placement:{start:number;span:number}|null;inherited?:string;own:boolean;placed:string[];color:string;onPlace:(value:{start:number;span:number})=>void;onReset?:()=>void}) {
    const [range,setRange]=useState<[number,number]|null>(null);
    const start=placement?.start||1,end=start+(placement?.span??grid)-1;
    const shown=range?[Math.min(...range),Math.max(...range)]:[start,end];
    const select=(event:any,cell:number)=>{
        if(event.type==='pointerdown'){event.currentTarget.setPointerCapture(event.pointerId);setRange([cell,cell]);}
        else if(range&&event.buttons===1)setRange([range[0],cell]);
    };
    const finish=()=>{if(!range)return;const [from,to]=[Math.min(...range),Math.max(...range)];setRange(null);onPlace({start:from,span:to-from+1});};
    const cellAt=(event:any)=>{const box=event.currentTarget.getBoundingClientRect();return Math.min(grid,Math.max(1,Math.floor((event.clientX-box.left)/box.width*grid)+1));};
    const { __experimentalNumberControl: NumberControl } = wp.components;
    return <div className="site-flow-layout" style={{'--site-flow-color':color} as any}>
        <div className="site-flow-layout-tabs" role="tablist" aria-label="Breakpoint">
            <button type="button" role="tab" aria-selected={isDefault} className="has-own" title={`Default · from ${breakpointLabel(COLUMN_BREAKPOINT)} up, wherever a breakpoint has no layout of its own`} onClick={()=>setViewport(null)}><MonitorSmartphone size={20} strokeWidth={1.5} aria-hidden="true" /></button>
            {editorBreakpoints.map(name=>{const width=BREAKPOINTS[name as keyof typeof BREAKPOINTS];return <button key={name} type="button" role="tab" aria-selected={!isDefault&&name===target}
                className={placed.includes(name)?'has-own':undefined} title={`${breakpointLabel(name)} · ${breakpointRange(name)}`} onClick={()=>setViewport(name)}><BreakpointIcon value={width} /></button>;})}
        </div>
        {target&&placement?<>
            <div className="site-flow-layout-head">
                <strong>{isDefault?'Default':breakpointLabel(target)}</strong><span>{isDefault?`${BREAKPOINTS[COLUMN_BREAKPOINT as keyof typeof BREAKPOINTS]}px and up`:breakpointRange(target)}</span>
                {onReset?<wp.components.Button variant="link" isDestructive onClick={onReset}>Reset</wp.components.Button>:null}
            </div>
            <p className="site-flow-layout-state">{isDefault?`Applies from ${breakpointLabel(COLUMN_BREAKPOINT)} up wherever a breakpoint has no layout of its own; narrower, the column spans the row.`:own?'Own layout for this screen range only.':inherited?'Uses the default. A change applies to this screen range only.':'Spans the row. A change applies to this screen range only.'}</p>
            <div className={'site-flow-layout-grid'+(own?'':' is-inherited')+(placement.start?'':' is-auto')} style={{gridTemplateColumns:`repeat(${grid},1fr)`}}
                onPointerDown={(event)=>select(event,cellAt(event))} onPointerMove={(event)=>select(event,cellAt(event))} onPointerUp={finish} onPointerCancel={()=>setRange(null)}
                role="img" aria-label={`Columns ${shown[0]} to ${shown[1]} of ${grid}`}>
                {Array.from({length:grid},(_,index)=><span key={index} className={index+1>=shown[0]&&index+1<=shown[1]?'is-on':undefined} />)}
            </div>
            <p className="site-flow-layout-hint">Drag across the cells to place the column.</p>
            <div className="site-flow-layout-numbers">
                <NumberControl label="Start" min={1} max={grid-placement.span+1} value={placement.start||''} placeholder="Auto" spinControls="custom" __next40pxDefaultSize
                    onChange={(value:string)=>onPlace({start:value===''?0:Math.min(grid-placement.span+1,Math.max(1,Number(value))),span:placement.span})} />
                <NumberControl label="Width" min={1} max={grid} value={placement.span} spinControls="custom" __next40pxDefaultSize
                    onChange={(value:string)=>{const span=Math.min(grid,Math.max(1,Number(value)||1));onPlace({span,start:placement.start?Math.min(placement.start,grid-span+1):0});}} />
            </div>
        </>:<p className="site-flow-layout-state">Below the first breakpoint the column spans the row.</p>}
    </div>;
}

function AlignmentButtons({label,value,options,onChange}:any) {
    return <fieldset className="site-flow-alignment">
        <legend>{label}</legend>
        <div className="site-flow-alignment-options" role="group" aria-label={label}>
            {options.map(({value:option,label:optionLabel,Icon}:any)=><wp.components.Button
                key={option} label={optionLabel} aria-label={`${label}: ${optionLabel}`}
                aria-pressed={value===option} isPressed={value===option}
                onClick={()=>onChange(option)}><Icon size={20} strokeWidth={1.75} aria-hidden="true" /></wp.components.Button>)}
        </div>
    </fieldset>;
}
