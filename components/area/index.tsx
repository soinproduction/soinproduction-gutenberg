'use client';
import { useField } from '../../core/fields/render.js';
import { useFieldScope } from '../../core/fields/render.js';
import { FieldScope } from '../../core/fields/render.js';
import { EditorAction } from '../../core/ui/editor-action.js';
import { Children } from 'react';
import { cloneElement } from 'react';
import { isValidElement } from 'react';
import type { ReactElement } from 'react';
import type { ReactNode } from 'react';
import { Classes } from '../../shared/index.js';
import { AddButton } from '../../shared/index.js';
import { useClasses } from '../../shared/index.js';

export function AreaControls({ index, total, onMove, onRemove }: any) {
  return (
    <div className="mt-2 flex gap-1">
      <EditorAction action="up" label="Move up" disabled={!index} onClick={() => onMove(index, -1)} />
      <EditorAction action="down" label="Move down" disabled={index === total - 1} onClick={() => onMove(index, 1)} />
      <EditorAction action="remove" label="Remove" onClick={() => onRemove(index)} />
    </div>
  );
}

export const paletteKey = (element: ReactElement<any>) => element.props.type ?? (element.type as any).kind;

/**
 * Editable zone. Children are the components an editor may add, with their classes.
 * Everything outside an Area stays fixed in the layout.
 */
export const Area = Object.assign(
  ({ name, children, max, buttonPosition, buttonText, ...classes }: Classes & AddButton & { name: string; children: ReactNode; max?: number; label?: string }) => {
    const className = useClasses(classes);
    const scope = useField(name);
    const parent = useFieldScope();
    const palette = Children.toArray(children).filter(isValidElement) as ReactElement<any>[];
    const items: any[] = Array.isArray(scope.value) ? scope.value : [];
    const save = (next: any[]) => scope.setValue(next);
    const add = (type: string) => save([...items, { id: rowId(), type }]);
    const remove = (index: number) => save(items.filter((_, i) => i !== index));
    const move = (index: number, step: number) => {
      const next = [...items];
      next.splice(index + step, 0, ...next.splice(index, 1));
      save(next);
    };
    const position = buttonPosition ?? '';
    const addRow = scope.edit && (!max || items.length < max) && (
      <div
        className={[
          'flex flex-wrap gap-2',
          position.includes('top') ? 'mb-3' : 'mt-3',
          position.includes('center') ? 'justify-center' : position.includes('right') ? 'justify-end' : '',
        ].join(' ')}
      >
        {palette.map((entry) => {
          const label = entry.props.label ?? (entry.type as any).field(entry.props).label;
          return (
            <EditorAction key={paletteKey(entry)} action="add" label={'Add ' + label} onClick={() => add(paletteKey(entry))}>
              {palette.length === 1 ? (buttonText ?? label) : label}
            </EditorAction>
          );
        })}
      </div>
    );
    return (
      <div className={className}>
        {position.includes('top') && addRow}
        {items.map((item, index) => {
          const element = palette.find((entry) => paletteKey(entry) === item.type);
          if (!element) return null;
          const field = { name: 'value', ...(element.type as any).field(element.props) };
          return (
            <div key={item.id ?? index} className="contents">
              <FieldScope
                {...parent}
                resolvedValue={undefined}
                schema={[field]}
                value={{ value: item.value }}
                onChange={(next) => save(items.map((row, i) => (i === index ? { ...row, value: next.value } : row)))}
              >
                {cloneElement(element, { name: 'value' })}
              </FieldScope>
              {scope.edit && <AreaControls index={index} total={items.length} onMove={move} onRemove={remove} />}
            </div>
          );
        })}
        {!position.includes('top') && addRow}
      </div>
    );
  },
  {
    kind: 'area',
    field: ({ label }: any) => ({ type: 'custom' as const, label: label ?? 'Area', control: 'kit-area', defaultValue: [] }),
  }
);

/** crypto.randomUUID needs HTTPS, the local site runs on HTTP. */
export const rowId = () => Date.now().toString(36) + Math.random().toString(36).slice(2);
