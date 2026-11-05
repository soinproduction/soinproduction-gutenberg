'use client';
import type { CSSProperties } from 'react';
import { FlowDragEditor } from './editor.js';
import { flowColumnLayout } from './layout.js';
import { flowGap } from './layout.js';
import { flowMobileGrid } from './layout.js';
import { COLUMN_BREAKPOINT } from '../../generated/responsive.js';
import { LAYOUT_BREAKPOINTS } from '../../generated/responsive.js';
import { useField } from '../../core/fields/render.js';
import { FieldScope } from '../../core/fields/render.js';
import { emptyValues } from '../../core/fields/schema.js';
import type { FieldDefinition } from '../../core/fields/schema.js';
import { EditorAction } from '../../core/ui/editor-action.js';
import { NativeAreaContent } from '../../core/content/areas/render.js';
import { ContentContext } from '../../core/content/context.js';
import { resolveMedia as mediaValues } from '../../core/media/values.js';
import { Children } from 'react';
import { createElement } from 'react';
import { isValidElement } from 'react';
import { useCallback } from 'react';
import { useContext } from 'react';
import type { ReactElement } from 'react';
import type { ReactNode } from 'react';
import { Cols } from '../cols/index.js';
import { collectFields } from '../../schema/index.js';
import { AddButton } from '../../shared/index.js';
import { addClasses } from '../../shared/index.js';
import { Classes } from '../../shared/index.js';
import { useClasses } from '../../shared/index.js';
declare const wp: any;

export const fieldIcons: Record<string, string> = {
  text: 'editor-textcolor',
  richText: 'heading',
  wysiwyg: 'editor-paragraph',
  repeater: 'list-view',
  buttons: 'button',
  image: 'format-image',
  gallery: 'format-gallery',
  media: 'admin-media',
};

/** A new element starts with one row, so a list or buttons are ready to fill in. */
export function firstRows(fields: FieldDefinition[]) {
  const rows: Record<string, any[]> = {};
  for (const field of fields) {
    if (field.type === 'repeater') rows[field.name] = [emptyValues(field.fields ?? [])];
    if (field.type === 'buttons') rows[field.name] = [{ text: '', url: '', modalId: 0 }];
  }
  return rows;
}

export function dragDefinition(children: ReactNode) {
  const elements: any[] = [];
  const palettes: any[] = [];
  const walk = (nodes: ReactNode, namespace = ''): any[] => (Children.toArray(nodes).filter(isValidElement) as ReactElement<any>[]).flatMap(child => {
    const { initial = true, ...props } = child.props;
    if (child.type === Cols) {
      const id = props.name;
      if (!/^[a-z][a-z0-9-]*$/.test(id ?? '') || palettes.some(item => item.name === id)) throw new Error('Cols needs a unique lowercase name');
      const palette:any={name:id,label:props.label ?? id,className:props.className,buttonPosition:props.buttonPosition??'bottom right',initial,span:props.span,start:props.start};
      palettes.push(palette);
      const items=walk(props.children,id);palette.template=items;
      return [['core/column',{className:['site-drag-column',props.className].filter(Boolean).join(' '),lock:{move:true,remove:true},metadata:{name:props.label ?? id,siteDragPalette:id}},items]];
    }
    const markup = createElement(child.type, props);
    const fields = collectFields(markup);
    if (!fields.length) throw new Error('Each Drag element needs a named field');
    const main = fields.find(field => field.type !== 'icon') ?? fields[0];
    const componentKind=(child.type as any).kind??('group:'+fields.map(field=>field.type+':'+(field.tag??'')).join('|'));
    const element = { componentKind, key: namespace ? `${namespace}:${fields[0].name}` : fields[0].name, palette: namespace, initial, data: firstRows(fields), label: main.label ?? main.name, icon: fieldIcons[main.type] ?? 'block-default', fields, markup, View: () => markup };
    if (elements.some(item => item.key === element.key)) throw new Error(`Duplicate Drag element "${element.key}"`);
    elements.push(element);
    return initial ? [['__element__', { element: element.key, data: element.data }]] : [];
  });
  const template = walk(children);
  return { elements, palettes, template: palettes.length ? [['core/columns',{className:'site-drag-columns has-free-width',lock:{move:true,remove:true}},template]] : template };
}

export function DragEditor({ elements, allow = [], className, buttonPosition = 'bottom left', buttonText }: AddButton & { elements: any[]; allow?: string[]; className?: string }) {
  const { name, clientId } = wp.blockEditor.useBlockEditContext();
  const appender = useCallback(() => <wp.blockEditor.Inserter rootClientId={clientId} isAppender __experimentalIsQuick
    renderToggle={({onToggle,disabled,isOpen}:any)=><div className={'site-editor-add is-compact'+(buttonText?' has-text':'')}>
      <EditorAction action="add" label={buttonText??'Add block'} aria-expanded={isOpen} disabled={disabled} onClick={onToggle}>{buttonText}</EditorAction>
    </div>} />,[clientId,buttonText]);
  const props=wp.blockEditor.useInnerBlocksProps({className:['site-drag',addClasses(buttonPosition),className].filter(Boolean).join(' ')},{
    allowedBlocks:[name+'-element',...allow],template:elements.filter(element=>element.initial).map(element=>[name+'-element',{element:element.key,data:element.data}]),
    templateInsertUpdatesSelection:false,renderAppender:appender,
  });
  return <div {...props} />;
}

export function DragView({ name, maxCol: _maxCol, grid: _grid, mobileGrid: _mobileGrid, gap: _gap, allow, buttonPosition, buttonText, children: _children, ...classes }: Classes & AddButton & { name: string; label?: string; maxCol?: number | string; grid?: number; mobileGrid?: number; gap?: number | string; toolbarPosition?: AddButton['buttonPosition']; allow?: string[]; children: ReactNode }) {
  const className = useClasses(classes);
  const scope = useField(name);
  const { innerBlocks = [] } = useContext(ContentContext);
  const elements: any[] = scope.field.elements ?? [];
  if (scope.edit && scope.field.controlOptions?.flow) return <FlowDragEditor field={scope.field} className={className} />;
  if (scope.edit) return <DragEditor elements={elements} allow={allow} className={className} buttonPosition={buttonPosition} buttonText={buttonText} />;
  const renderBlocks = (blocks: typeof innerBlocks): ReactNode => blocks.map((block, index) => {
        if (['core/columns', 'core/column', 'core/group'].includes(block.name)) {
          return <div key={index} className={block.attrs.className}>{renderBlocks(block.innerBlocks??[])}</div>;
        }
        if (block.name.startsWith('core/')) return <NativeAreaContent key={index} blocks={[block]} />;
        const element = elements.find(({ key }) => key === block.attrs.element);
        if (!element) return null;
        const value = mediaValues(block.attrs.data ?? {}, scope.site?.media);
        return (
          <FieldScope key={index} schema={element.fields} value={value} site={scope.site} record={scope.record}>
            {element.markup}
          </FieldScope>
        );
      });
  const grid = Number(scope.field.controlOptions?.grid) || 0, maxCol = Number(scope.field.controlOptions?.maxCol) || 2;
  if (scope.field.controlOptions?.flow) return <div className={['site-flow-drag',grid?'has-grid':'',className].filter(Boolean).join(' ')} style={{'--site-flow-columns':grid||maxCol,'--site-flow-mobile-columns':grid?scope.field.controlOptions?.mobileGrid:undefined,'--site-flow-gap':scope.field.controlOptions?.gap} as CSSProperties}>
    {innerBlocks.filter(block=>block.name.endsWith('-column')).map((block,index)=>{
      const palettes:any[]=Array.isArray(scope.field.controlOptions?.palettes)?scope.field.controlOptions.palettes:[];
      // The first palette is the block default, so saved content may omit it.
      const palette=palettes.find(item=>item.name===(block.attrs.palette??palettes[0]?.name));
      const layout=flowColumnLayout(grid,block.attrs as any,palette,maxCol,COLUMN_BREAKPOINT,[...LAYOUT_BREAKPOINTS],Number(scope.field.controlOptions?.mobileGrid)||grid);
      return <div key={index} data-vertical-align={block.attrs.verticalAlign??'top'} data-horizontal-align={block.attrs.horizontalAlign??'stretch'} style={layout.style as CSSProperties} className={['site-flow-column',block.attrs.fullRow?'is-full-row':'',...layout.classes,palette?.className].filter(Boolean).join(' ')}>{renderBlocks(block.innerBlocks??[])}</div>;
    })}
  </div>;
  const content=renderBlocks(innerBlocks);
  return className ? <div className={className}>{content}</div> : content;
}

/**
 * Each child becomes a real Gutenberg block inside the section: toolbar, drag, inserter and List View are native.
 * `allow` adds native blocks to the inserter; blocks already saved stay on the site. Without a class it adds no markup on the site. A section can have one Drag.
 */
export const Drag = Object.assign(DragView, {
  kind: 'drag',
  field: ({ label, children, maxCol, grid, mobileGrid, gap, toolbarPosition, allow, className }: any) => ({
    type: 'custom' as const,
    label: label ?? 'Elements',
    control: 'kit-drag',
    ...(() => { const definition = dragDefinition(children); return { elements: definition.elements, controlOptions: { toolbarPosition: toolbarPosition ?? 'top right', dragTemplate: definition.template, palettes: definition.palettes, flow: Boolean(maxCol || grid) || definition.palettes.length > 0, grid: Math.min(24, Math.max(0, Math.floor(Number(grid) || 0))), mobileGrid: grid ? flowMobileGrid(Math.min(24, Math.floor(Number(grid))), mobileGrid) : 0, gap: flowGap(gap), maxCol: Math.max(1, Math.floor(Number(maxCol) || 2)), allow: allow ?? [], className } }; })(),
  }),
});
