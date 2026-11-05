'use client';
import { focusListItem } from '../../core/fields/item-focus.js';
import { LoadedList } from './loading.js';
import type { ListLoading } from './loading.js';
import { useField } from '../../core/fields/render.js';
import { useFieldScope } from '../../core/fields/render.js';
import { FieldScope } from '../../core/fields/render.js';
import { Repeater } from '../../core/fields/render.js';
import { emptyValues } from '../../core/fields/schema.js';
import { EditorAction } from '../../core/ui/editor-action.js';
import { Children } from 'react';
import { cloneElement } from 'react';
import { isValidElement } from 'react';
import { useEffect } from 'react';
import { useId } from 'react';
import { useRef } from 'react';
import { useState } from 'react';
import type { ReactElement } from 'react';
import type { ReactNode } from 'react';
import { Props } from '../../shared/index.js';
import { AddButton } from '../../shared/index.js';
import { useClasses } from '../../shared/index.js';
import { addClasses } from '../../shared/index.js';
import { collectFields } from '../../schema/index.js';
declare const wp: any;

/** Fills the width with copies of the rows and doubles them, for a seamless CSS scroll. */
export function LoopingRows({ name, className, children }: { name: string; className?: string; children: ReactNode }) {
  const scope = useField(name);
  const items: any[] = Array.isArray(scope.value) ? scope.value : [];
  const track = useRef<HTMLDivElement>(null);
  const [repeats, setRepeats] = useState(1);
  const signature = JSON.stringify(items);
  // Copies exist only for the animation, so screen readers skip them.
  const hiddenCopy = Children.map(children, (child) =>
    isValidElement(child) ? cloneElement(child as ReactElement<any>, { 'aria-hidden': true }) : child
  );
  useEffect(() => {
    const element = track.current;
    const viewport = element?.parentElement;
    if (!element || !viewport || !items.length) return;
    let alive = true;
    const measure = () => {
      const first = element.children[0],
        last = element.children[items.length - 1];
      if (!alive || !first || !last) return;
      const gap = parseFloat(getComputedStyle(element).columnGap) || 0;
      const width = last.getBoundingClientRect().right - first.getBoundingClientRect().left + gap;
      if (width > 0) setRepeats(Math.max(1, Math.min(128, Math.ceil(viewport.clientWidth / width))));
    };
    measure();
    document.fonts?.ready.then(measure);
    const observer = new ResizeObserver(measure);
    observer.observe(viewport);
    observer.observe(element);
    return () => {
      alive = false;
      observer.disconnect();
    };
  }, [signature]);
  return (
    <div ref={track} className={className}>
      {Array.from({ length: repeats * 2 }).flatMap((_, copy) =>
        items.map((row: any, index: number) => (
          <FieldScope key={copy + '-' + index} {...scope} resolvedValue={undefined} schema={scope.field.fields ?? []} value={row}>
            {copy > 0 ? hiddenCopy : children}
          </FieldScope>
        ))
      )}
    </div>
  );
}

export type ListProps = Props & AddButton & {
  name: string;
  loop?: boolean;
  gallery?: boolean;
  displaySettings?: boolean;
  perPage?: number;
  loading?: ListLoading;
  /** Where the editor's add button sits: "bottom center", "top left", "bottom stretch"… */
  children: ReactNode;
  max?: number;
};

export function ListView({ name, loop, gallery, displaySettings, perPage, loading, buttonPosition = 'bottom right', buttonText, children, ...classes }: ListProps) {
  const itemFocusKey = useId();
  const className = useClasses(classes);
  const rootScope=useFieldScope();
  const display = displaySettings ? rootScope.value[name + 'Display'] ?? {} : {};
  const { edit, value, setValue, field } = useField(name);
  const count = Array.isArray(value) ? value.length : 0;
  const box = useRef<HTMLDivElement>(null);
  const previous = useRef(count);
  useEffect(() => {
    // A new row may land outside the visible part of the list.
    if (edit && count > previous.current) {
      const row = gallery ? box.current?.firstElementChild?.children[count - 1] : box.current?.firstElementChild?.lastElementChild;
      row?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
      row?.querySelector<HTMLElement>('[contenteditable="true"]')?.focus();
    }
    previous.current = count;
  }, [count, edit, gallery]);
  if (loop && !gallery && !loading && !edit) return <LoopingRows name={name} className={className}>{children}</LoopingRows>;
  if (!edit) return <LoadedList name={name} gallery={gallery} loadMoreButton={display.button} perPage={display.perPage ?? perPage} loading={display.loading === 'all' ? undefined : display.loading ?? loading} className={className}>{children}</LoadedList>;
  // In the editor a looping list stays still on one line; the section's animation is switched off by CSS.
  const rows: any[] = Array.isArray(value) ? value : [];
  return (
    <div ref={box} className={'site-list-editor ' + addClasses(buttonPosition)}>
      <Repeater
        name={name}
        itemFocusKey={itemFocusKey}
        addText={buttonText}
        appender={gallery ? (count < (field.max ?? Infinity) ? <div role="button" tabIndex={0} className="site-record-add" aria-label={buttonText ?? 'Add photo'} contentEditable={false}
          onClick={() => setValue([...rows, emptyValues(field.fields ?? [])])}
          onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setValue([...rows, emptyValues(field.fields ?? [])]); } }}>
          <div className="site-record-add-shape" aria-hidden="true"><FieldScope schema={field.fields ?? []} value={emptyValues(field.fields ?? [])} site={{}}>{children}</FieldScope></div>
          <svg className="site-record-add-frame" aria-hidden="true"><rect rx="2" /></svg>
          <span className="site-record-add-label"><svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 5v14M5 12h14" /></svg></span>
        </div> : null) : undefined}
        className={loop ? className + ' site-loop-list !w-auto' : className}
        renderRow={(row, index) => (
          <div className="site-editor-row" onClick={event => {
            if ((event.target as HTMLElement).closest('.site-button-tools')) return;
            wp.data.dispatch('core/edit-post')?.openGeneralSidebar?.('edit-post/block');
            focusListItem(`${itemFocusKey}-${index}`);
          }}>
            {row}
            <span className="site-button-tools" contentEditable={false}>
              <EditorAction action="remove" label="Remove item" onClick={() => setValue(rows.filter((_, i) => i !== index))} />
            </span>
          </div>
        )}
      >
        {children}
      </Repeater>
    </div>
  );
}

/** Repeating rows: children are the fields of one row. `loop` repeats them for an endless line. */
export const List = Object.assign(ListView, {
  kind: 'list',
  field: ({ label, children, max }: any) => ({
    type: 'repeater' as const,
    controlOptions: { itemPanels: true },
    label: label ?? 'List',
    max,
    fields: collectFields(children),
  }),
});
