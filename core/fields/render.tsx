'use client';
import { viewClasses, type ViewClasses } from './view-classes.js';
import type { ButtonAppearance } from '../ui/button-appearance.js';
import { LoadedCollection, type ListLoading } from '../ui/loaded-collection.js';
import { reorderListItems } from './list-order.js';
import { ParagraphFlow } from '../content/paragraphs.js';
import { UniversalMedia } from '../media/universal/component.js';
import { recordUrl } from '../content/links.js';
import { areaBlocks } from '../content/areas/data.js';
import { NativeAreaContent } from '../content/areas/render.js';
import type { ContentBlock } from '../content/context.js';
import { ContentContext } from '../content/context.js';
import { richText as richNodes } from '../content/rich-text.js';
import { relationshipRecords, latestRecords, recordDate, safeUrl } from './records.js';
import type { FieldDefinition } from './schema.js';
import { emptyValue } from './schema.js';
import { fieldAt, valuesFor } from './values.js';
import { ButtonLabel } from '../icons/button.js';
import { Icon } from '../icons/icon.js';
import { LibraryImage } from '../media/image.js';
import { selectedRecords } from '../relationships/selection.js';
import { atPath, setPath } from '../utils/path.js';
import { modalHref } from '../utils/url.js';
import {
  createContext,
  createElement,
  useContext,
  useMemo,
  useId,
  type ComponentType,
  type ElementType,
  type ReactNode,
} from 'react';
export type ContentRendererProps = {
  blocks: ContentBlock[];
  options?: { fixedLayout?: boolean };
};
type Scope = {
  Content?: ComponentType<ContentRendererProps>;
  resolvedValue?: Record<string, any>;
  schema: FieldDefinition[];
  value: Record<string, any>;
  site: any;
  onChange?: (next: any) => void;
  edit?: EditField;
  record?: any;
  blockName?: string;
  extensions?: Record<string, any>;
  renderCustomField?: (props: any, scope: any) => ReactNode;
};
export type FieldProps = {
  name: string | (string | number)[];
  inline?: boolean;
  editor?: boolean;
  value?: any;
  localized?: boolean | string;
  imageProps?: React.ImgHTMLAttributes<HTMLImageElement>;
  options?: any;
  as?: ElementType;
  className?: string;
  children?: ReactNode;
};
export type EditField = (
  props: FieldProps & {
    field: FieldDefinition;
    value: any;
    setValue: (value: any) => void;
    site: any;
    nested?: boolean;
  }
) => ReactNode;
const FieldContext = createContext<Scope>({ schema: [], value: {}, site: {} });
const RecordContext = createContext<any>({});
export function FieldScope({ children, ...scope }: Scope & { children: ReactNode }) {
  const resolvedValue = useMemo(
    () => scope.resolvedValue ?? valuesFor(scope.schema, scope.value, scope.site, scope.record),
    [scope.resolvedValue, scope.schema, scope.value, scope.site, scope.record]
  );
  return (
    <FieldContext.Provider value={{ ...scope, resolvedValue }}>{children}</FieldContext.Provider>
  );
}
export const useFieldScope = () => useContext(FieldContext);
export function useValues() {
  const scope = useContext(FieldContext);
  return scope.resolvedValue ?? valuesFor(scope.schema, scope.value, scope.site, scope.record);
}
export function useField(name: FieldProps['name']) {
  const scope = useContext(FieldContext),
    path = Array.isArray(name) ? name : [name];
  const root = scope.schema.find((f) => f.name === path[0]);
  const field =
    fieldAt(scope.schema, path) ??
    (root && path.length > 1
      ? { name: String(path.at(-1)), type: 'richText' as const }
      : undefined);
  if (!field) throw new Error(`Field "${path.join('.')}" is missing from schema.ts`);
  const data =
    scope.resolvedValue ?? valuesFor(scope.schema, scope.value, scope.site, scope.record);
  const value =
    atPath(path.length > 1 || field.recordField || field.recordMeta ? data : scope.value, path) ??
    (path.length === 1 ? data[path[0]] : emptyValue(field));
  const stored = { ...scope.value };
  for (const definition of scope.schema)
    if (definition.recordField || definition.recordMeta)
      stored[definition.name] = data[definition.name];
  const setValue = (next: any) => {
    if (root?.type === 'relationship' && root.resolveRecords && typeof path[1] === 'number') {
      const record = data[path[0]]?.[path[1]],
        selection = scope.value[path[0]] ?? { mode: 'all' };
      if (selection.mode === 'manual') {
        scope.onChange?.(setPath(stored, [path[0], 'items', ...path.slice(1)], next));
        return;
      }
      if (record?.id) {
        scope.onChange?.(
          setPath(stored, [path[0], 'overrides', String(record.id), ...path.slice(2)], next)
        );
        return;
      }
    }
    scope.onChange?.(setPath(stored, path, next));
  };
  return { ...scope, field, value, setValue };
}
export function ListActions({ name, index }: { name: FieldProps['name']; index?: number }) {
  const scope = useField(name);
  if ((scope.field.type === 'relationship' && scope.field.resolveRecords) || scope.field.readOnly)
    return null;
  return scope.edit
    ? scope.edit({
        name,
        field: { ...scope.field, type: 'custom', control: 'list-actions' },
        value: scope.value,
        setValue: scope.setValue,
        site: scope.site,
        options: { index, itemType: scope.field.itemType, fields: scope.field.fields },
      })
    : null;
}
export function EditorRecordLink({ id, label, className }: { id: number; label: string; className?: string }) {
  const scope = useContext(FieldContext);
  return scope.edit
    ? scope.edit({
        name: '',
        className,
        field: { name: '', type: 'custom', control: 'edit-record' },
        value: id,
        setValue: () => {},
        site: scope.site,
        options: { label },
      })
    : null;
}
export function actionUrl(value: any, site: any) {
  const modal = (site.modals ?? []).find((m: any) => Number(m.id) === Number(value?.modalId));
  return value?.modalId
    ? modal
      ? modalHref(modal)
      : ''
    : safeUrl(value?.linkId ? recordUrl(site, value.linkId) : value?.url);
}
export function Action({ value, site = {}, className = '' }: any) {
  const url = actionUrl(value, site);
  if (!url || !value?.text) return null;
  return (
    <a
      href={url}
      className={'wp-block-button__link ' + className}
      data-modal-plan={value.plan || undefined}
    >
      <ButtonLabel
        attributes={{
          metadata: {
            siteButtonIcon: value.icon,
            siteButtonIconPosition: value.iconPosition,
          },
        }}
      >
        {richNodes(value.text)}
      </ButtonLabel>
    </a>
  );
}
export function renderField(
  field: FieldDefinition,
  value: any,
  site: any = {},
  props: Omit<FieldProps, 'name'> = {}
): ReactNode {
  const Tag = props.as ?? field.tag ?? (field.type === 'richText' ? 'div' : 'span');
  const className = props.className;
  switch (field.type) {
    case 'group':
      return <div className={className}>{renderFields(field.fields ?? [], value ?? {}, site)}</div>;
    case 'repeater':
      return (
        <div className={className ?? 'grid gap-6 for-small-tablet:grid-cols-3'}>
          {(Array.isArray(value) ? value : []).map((row: any, index: number) => (
            <article key={index}>{renderFields(field.fields ?? [], row, site)}</article>
          ))}
        </div>
      );
    case 'relationship':
      return (
        <FieldScope schema={[field]} value={{ [field.name]: value }} site={site}>
          <Relationship name={field.name} className={className}>
            <article>
              <RecordImage />
              <RecordTitle />
              <RecordExcerpt />
              <RecordLink>Read more</RecordLink>
            </article>
          </Relationship>
        </FieldScope>
      );

    case 'content':
    case 'custom':
      return props.children ?? null;
    case 'media':
      return <UniversalMedia value={value} className={className} editor={!!props.editor} />;
    case 'image': {
      const image =
        typeof value === 'string' ? { url: value, alt: props.imageProps?.alt ?? '' } : value;
      return image?.url ? (
        <LibraryImage
          {...props.imageProps}
          src={image.url}
          alt={image.alt ?? ''}
          className={className ?? props.imageProps?.className}
        />
      ) : null;
    }
    case 'gallery':
      return (
        <div className={className ?? 'grid gap-4 for-small-tablet:grid-cols-3'}>
          {(Array.isArray(value) ? value : []).map((image: any, i: number) => (
            <LibraryImage
              key={image.id ?? i}
              src={image.url}
              alt={image.alt ?? ''}
              className="w-full object-cover"
            />
          ))}
        </div>
      );
    case 'icon':
      return value ? (
        <span className={className}>
          <Icon icon={{ type: value }} />
        </span>
      ) : null;
    case 'wysiwyg':
      return (
        <ParagraphFlow
          value={Array.isArray(value) ? value : []}
          className={className}
          paragraphClass={props.options?.paragraphClass}
        />
      );
    case 'buttons':
      return (
        <div className={'site-actions ' + (className ?? 'flex flex-wrap gap-3')}>
          {(Array.isArray(value) ? value : []).map((button: any, i: number) => (
            <Action key={i} value={button} site={site} />
          ))}
        </div>
      );
    case 'link':
      return <Action value={value} site={site} className={className} />;
    case 'toggle':
      return value
        ? createElement(Tag, { className }, props.children ?? field.label ?? field.name)
        : null;
    case 'color':
      return null;
    case 'richText':
      return props.inline ? (
        <>{richNodes(props.value ?? value)}</>
      ) : (
        createElement(Tag, { className }, richNodes(value))
      );
    default: {
      const text = props.localized
        ? Number(props.value ?? value ?? 0).toLocaleString(
            typeof props.localized === 'string' ? props.localized : undefined
          )
        : String(value ?? '');
      return props.inline ? <>{text}</> : createElement(Tag, { className }, text);
    }
  }
}
export function Field(props: FieldProps) {
  const { field, value, setValue, edit, site } = useField(props.name);
  const definition = props.imageProps
    ? { ...field, type: 'image' as const, storage: 'url' as const }
    : props.inline
      ? { ...field, type: props.localized ? ('number' as const) : ('richText' as const) }
      : field;
  const current = props.imageProps?.src ?? props.value ?? value;
  return (
    <>
      {edit
        ? edit({ ...props, field: definition, value: current, setValue, site })
        : renderField(definition, current, site, props)}
    </>
  );
}
export function Group({ name, children, className }: FieldProps) {
  const scope = useField(name);
  return (
    <div className={className}>
      <FieldScope
        {...scope}
        schema={scope.field.fields ?? []}
        value={scope.value}
        onChange={scope.setValue}
      >
        {children}
      </FieldScope>
    </div>
  );
}
export function Repeater({ name, children, className, renderRow, addText, appender, offset = 0, limit, itemFocusKey, perPage, loading, loadMoreButton }: FieldProps & { loadMoreButton?: ButtonAppearance; perPage?: number; loading?: ListLoading; itemFocusKey?: string; offset?: number; limit?: number; appender?: ReactNode; renderRow?: (row: ReactNode, index: number) => ReactNode; addText?: string }) {
  const scope = useField(name);
  const rows = Array.isArray(scope.value) ? scope.value : [];
  const grouped = Boolean(scope.field.controlOptions?.itemPanels);
  const settings = scope.field.fields?.filter(field => field.settings || (grouped && field.type === 'image')) ?? [];
  const id=useId().replace(/[^a-zA-Z0-9_-]/g,'');
  const root=useFieldScope();
  const render=(offset:number,limit?:number) => (
    <>
      <div className={className ?? 'grid gap-6 for-small-tablet:grid-cols-3'}>
        {rows.slice(offset, limit === undefined ? undefined : offset + limit).map((row: any, visibleIndex: number) => {
          const index = offset + visibleIndex;
          return (
          <FieldScope
            key={index}
            {...scope}
            resolvedValue={undefined}
            schema={scope.field.fields ?? []}
            value={row}
            edit={scope.edit ? (props) => scope.edit!({ ...props, nested: true, options: { ...props.options, itemPanel: grouped } }) : undefined}
            onChange={(next) =>
              scope.setValue(rows.map((old: any, i: number) => (i === index ? next : old)))
            }
          >
            {renderRow ? renderRow(children, index) : children}
            {scope.edit && settings.length > 0 && scope.edit({
              name,
              options: {
                itemFocusKey: itemFocusKey ? `${itemFocusKey}-${index}` : undefined,
                listKey: itemFocusKey, index, total: rows.length,
                onMove: (from: number, target: number) => scope.setValue(reorderListItems(rows, from, target)),
              },
              field: { name: scope.field.name, type: 'custom', control: 'row-settings', label: `Item ${index + 1}`, fields: settings },
              value: row,
              setValue: next => scope.setValue(rows.map((old: any, i: number) => i === index ? next : old)),
              site: scope.site,
            })}
          </FieldScope>
        ); })}
        {appender}
      </div>
      {scope.edit && appender === undefined &&
        scope.edit({
          name,
          field: scope.field,
          value: rows,
          setValue: scope.setValue,
          site: scope.site,
          options: { addText },
        })}
    </>
  );
  return !scope.edit && loading ? <LoadedCollection pageKey={`list-${root.value.sectionId||id}-${name}`} total={rows.length} perPage={perPage} loading={loading} loadMoreButton={loadMoreButton}>{window=>render(window.offset,window.limit)}</LoadedCollection> : render(offset,limit);
}
export function Relationship({ name, children, className, options, perPage, loading, loadMoreButton }: FieldProps & { loadMoreButton?: ButtonAppearance; perPage?: number; loading?: ListLoading }) {
  const scope = useField(name);
  const library=relationshipRecords(scope.field,scope.site);
  const source=scope.field.controlOptions??{};
  const latest=Number(source.latest)>0&&useValues()[String(source.modeField)]!=='manual';
  const records = latest?latestRecords(library,Number(source.latest)):selectedRecords(scope.value,library);
  const update = (record: any, patch: any) =>
    scope.setValue(scope.value.map((item: any) => (item === record ? { ...item, ...patch } : item)));
  const id=useId().replace(/[^a-zA-Z0-9_-]/g,'');
  const root=useFieldScope();
  const render=(offset=0,limit=records.length) => (
    <div className={className ?? 'grid gap-6 for-small-tablet:grid-cols-3'}>
      {records.slice(offset,offset+limit).map((record, visibleIndex) => (
        <RecordContext.Provider
          key={record.id}
          value={{ ...record, index:offset+visibleIndex, update: (patch: any) => update(record, patch) }}
        >
          {children}
        </RecordContext.Provider>
      ))}
      {scope.edit &&
        scope.edit({
          name,
          field: scope.field,
          value: scope.value,
          setValue: scope.setValue,
          site: scope.site,
          options: {
            ...options,
            // An empty copy of the record's markup gives the add tile the exact card size.
            shape: (
              <RecordContext.Provider value={{ index: records.length, title: '', excerpt: '' }}>
                {children}
              </RecordContext.Provider>
            ),
          },
        })}
    </div>
  );
  return !scope.edit && loading ? <LoadedCollection pageKey={`list-${root.value.sectionId||id}-${name}`} total={records.length} perPage={perPage} loading={loading} loadMoreButton={loadMoreButton}>{window=>render(window.offset,window.limit)}</LoadedCollection> : render();
}
export function RecordImage(classes: ViewClasses) {
  const className = viewClasses(classes, Boolean(useFieldScope().edit));
  const record = useContext(RecordContext);
  const { edit, site } = useContext(FieldContext);
  const image = record.image ? (
    <LibraryImage src={record.image} alt={record.alt ?? ''} className={className} />
  ) : null;
  if (!record.manual || !edit) return image;
  return (
    <>
      {image}
      {edit({
        name: 'image',
        field: { name: 'image', type: 'custom', control: 'record-tools' },
        value: record,
        setValue: record.update,
        site,
      })}
    </>
  );
}
/** A hand-written record is edited on the canvas like any other text. */
function ManualText({ name, label, as, className }: { name: string; label: string; as: ElementType; className?: string }) {
  const record = useContext(RecordContext);
  const scope = useContext(FieldContext);
  return scope.edit!({
    name,
    as,
    className,
    nested: true,
    field: { name, label, type: 'richText' },
    value: record[name],
    setValue: (value) => record.update({ [name]: value }),
    site: scope.site,
  });
}
export function RecordTitle({ as = 'h3', ...classes }: ViewClasses & { as?: ElementType }) {
  const className = viewClasses(classes, Boolean(useFieldScope().edit));
  const record = useContext(RecordContext);
  const { edit } = useContext(FieldContext);
  if (record.manual && edit) return <ManualText name="title" label="Title" as={as} className={className} />;
  return createElement(as, { className }, richNodes(record.title));
}
export function RecordExcerpt(classes: ViewClasses) {
  const className = viewClasses(classes, Boolean(useFieldScope().edit));
  const record = useContext(RecordContext);
  const { edit } = useContext(FieldContext);
  if (record.manual && edit) return <ManualText name="excerpt" label="Description" as="p" className={className} />;
  return <p className={className}>{richNodes(record.excerpt)}</p>;
}
/** Text from the current linked/manual record without a project-specific card renderer. */
export function RecordText({field,as='p',...classes}:ViewClasses & {field:string;as?:'p'|'span'|'div'|'blockquote'}) {
  const className = viewClasses(classes, Boolean(useFieldScope().edit));
 const record=useContext(RecordContext);
 const {edit}=useContext(FieldContext);
 const Wrapper=as==='span'?'span':'div';
 if(record.manual&&edit)return <Wrapper style={{display:'contents'}} onClick={event=>{if(event.currentTarget.closest('summary'))event.preventDefault();}}><ManualText name={field} label={field.replace(/([A-Z])/g,' $1').replace(/^./,letter=>letter.toUpperCase())} as={as} className={className} /></Wrapper>;
 const value=record[field];
 return value?createElement(as,{className},richNodes(value)):null;
}
/** Additional native content stored on the current record. */
export function RecordDate(classes: ViewClasses) {
  const className = viewClasses(classes, Boolean(useFieldScope().edit));
 const record=useContext(RecordContext),date=recordDate(record.publishedAt??record.date);
 return date?<time className={className} dateTime={date.dateTime}>{date.text}</time>:null;
}
export function RecordContent({ field, ...classes }: ViewClasses & { field: string }) {
  const className = viewClasses(classes, Boolean(useFieldScope().edit));
 const record=useContext(RecordContext);
 const Content=useFieldScope().Content??NativeAreaContent;
 if (!Array.isArray(record[field]) || !record[field].length) return null;
 const content = <Content blocks={record[field]} />;
 return className ? <div className={className}>{content}</div> : content;
}
export function RecordLink({ children, ...classes }: ViewClasses & { children: ReactNode }) {
  const className = viewClasses(classes, Boolean(useFieldScope().edit));
  const record = useContext(RecordContext);
  const url = safeUrl(record.url);
  return url ? (
    <a href={url} className={className}>
      {children}
    </a>
  ) : (
    <div className={className}>{children}</div>
  );
}
/** Position in the list, 01, 02… */
export function RecordIndex(classes: ViewClasses) {
  const className = viewClasses(classes, Boolean(useFieldScope().edit));
  const record = useContext(RecordContext);
  return <span className={className}>{String(record.index + 1).padStart(2, '0')}</span>;
}
export function RecordEdit({ label, ...classes }: ViewClasses & { label: string }) {
  const className = viewClasses(classes, Boolean(useFieldScope().edit));
  const record = useContext(RecordContext);
  return record.manual || !record.id ? null : <EditorRecordLink id={record.id} label={label} className={className} />;
}

export function renderFields(
  schema: FieldDefinition[],
  value: Record<string, any>,
  site: any = {}
) {
  return schema.map((field) => (
    <div key={field.name}>{renderField(field, value[field.name] ?? emptyValue(field), site)}</div>
  ));
}

export function RecordScope({
  schema,
  children,
}: {
  schema: FieldDefinition[];
  children: ReactNode;
}) {
  const context = useContext(ContentContext),
    parent = useFieldScope();
  return (
    <FieldScope
      schema={schema}
      value={context.data}
      site={context.site}
      record={context.record}
      onChange={context.editor ? parent.onChange : undefined}
      edit={context.editor ? parent.edit : undefined}
      extensions={parent.extensions}
      blockName={parent.blockName}
    >
      {children}
    </FieldScope>
  );
}

/** A shared layout around a content slot: the same children run in Next and Gutenberg. */
export function ContentArea({
  name,
  className,
  children,
  as: Tag = 'div',
  style,
  options,
}: {
  name: string;
  className?: string;
  as?: ElementType | null;
  style?: React.CSSProperties;
  options?: { template?: any[]; fixedLayout?: boolean };
  children?: (content: ReactNode) => ReactNode;
}) {
  const scope = useField(name),
    data = useValues(),
    context = useContext(ContentContext);
  if (scope.field.type !== 'content' || !scope.field.area)
    throw new Error('ContentArea requires an addContentArea declaration');
  const layout = (content: ReactNode, hostProps: Record<string, any> = { className, style }) => {
    const body = children ? children(content) : content;
    return Tag ? <Tag {...hostProps}>{body}</Tag> : <>{body}</>;
  };
  if (scope.edit)
    return scope.edit({
      name,
      field: scope.field,
      value: scope.value,
      setValue: scope.setValue,
      site: scope.site,
      options: {
        ...options,
        className,
        style,
        render: ({ children: content, ...hostProps }: Record<string, any>) =>
          layout(content, hostProps),
      },
    });
  const blocks = areaBlocks(scope.field.area, data, context.innerBlocks ?? [], scope.site);
  const Content = scope.Content ?? NativeAreaContent;
  return layout(<Content blocks={blocks} options={options} />);
}
