import { ButtonIconSettings } from '../editor/button-icon-settings.js';
import { CollectionDisplaySettings } from '../editor/collection-display.js';
import { GripVertical, Plus } from 'lucide-react';
import { MediaSelectAction } from '../editor/media-select-action.js';
import { SelectControl } from '../../ui/select.js';
import { ContentAreaEditor } from '../editor/content-area.js';
import { sectionFields } from '../modules/section.js';
import { MediaEditor } from '../media/universal/editor.js';
import { editorEnvironment } from '../editor/environment.js';
import { LibraryImage } from '../media/image.js';
import { ListActionsEditor } from '../editor/list-actions.js';
import { selectedRecords } from '../relationships/selection.js';

import { EditorAction } from '../ui/editor-action.js';
import { IconPicker } from '../editor/icons.js';
import { mediaId, rememberMedia, withMediaRefs } from '../editor/media.js';
import { ParagraphEditor } from '../editor/paragraphs.js';
import { RecordTools, newManualRecord } from '../editor/manual-record.js';
import { RelationshipPicker } from '../editor/relationship.js';
import { RepeatableList } from '../editor/repeater.js';
import { SourceRelationship } from '../editor/source-relationship.js';
import { relationshipRecords } from './records.js';
import type { EditField } from './render.js';
import { FieldScope, renderField, useFieldScope } from './render.js';
import { emptyValues, type FieldDefinition } from './schema.js';
import { ButtonLabel } from '../icons/button.js';
import type { ModuleProps } from '../modules/types.js';
import { useEffect, useRef, useState } from 'react';
import { onListItemFocus, selectedListItem } from './item-focus.js';
declare const wp: any;
type Props = Parameters<EditField>[0] & { controls?: boolean };
const labelOf = (field: FieldDefinition) =>
  field.label ?? field.name.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase());
function ItemSettings({ field, value, setValue, site, options }: Props) {
  const key = options?.itemFocusKey;
  const [open, setOpen] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const [drop, setDrop] = useState<'before' | 'after' | null>(null);
  const [dragging, setDragging] = useState(false);
  useEffect(() => {
    let frame = 0;
    const reveal = (selected: string) => {
      if (!key || selected !== key) return;
      setOpen(true);
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        frame = requestAnimationFrame(() => panel.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
      });
    };
    const unsubscribe = onListItemFocus(reveal);
    reveal(selectedListItem());
    return () => { unsubscribe(); cancelAnimationFrame(frame); };
  }, [key]);
  return <wp.blockEditor.InspectorControls><div ref={panel}
    className={'site-item-settings' + (drop ? ' is-drop-' + drop : '') + (dragging ? ' is-dragging' : '')}
    onDragOver={event => {
      if (!options?.listKey || !event.dataTransfer.types.includes('application/x-site-list-item')) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = 'move';
      const bounds = event.currentTarget.getBoundingClientRect();
      setDrop(event.clientY < bounds.top + bounds.height / 2 ? 'before' : 'after');
    }}
    onDragLeave={event => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setDrop(null); }}
    onDrop={event => {
      event.preventDefault(); setDrop(null);
      try {
        const data = JSON.parse(event.dataTransfer.getData('application/x-site-list-item'));
        if (data.listKey !== options?.listKey) return;
        options?.onMove?.(data.index, options.index + (drop === 'after' ? 1 : 0));
      } catch { /* Ignore unrelated drag data. */ }
    }}>
    {options?.listKey && <button type="button" className="site-item-drag-handle" draggable
      aria-label={'Reorder ' + field.label} title="Drag to reorder, or use arrow keys"
      onClick={event => event.stopPropagation()}
      onDragStart={event => {
        event.dataTransfer.setData('application/x-site-list-item', JSON.stringify({listKey: options.listKey, index: options.index}));
        event.dataTransfer.effectAllowed = 'move'; setDragging(true);
      }}
      onDragEnd={() => { setDragging(false); setDrop(null); }}
      onKeyDown={event => {
        if (event.key === 'ArrowUp' && options.index > 0) { event.preventDefault(); options.onMove(options.index, options.index - 1); }
        if (event.key === 'ArrowDown' && options.index < options.total - 1) { event.preventDefault(); options.onMove(options.index, options.index + 2); }
      }}><GripVertical size={18} aria-hidden="true" /></button>}

    <wp.components.PanelBody title={field.label} opened={open} onToggle={() => setOpen(current => !current)}>
      <FieldControls schema={field.fields ?? []} value={value} onChange={setValue} site={site} />
    </wp.components.PanelBody>
  </div></wp.blockEditor.InspectorControls>;
}

function MediaPicker({ value, setValue, label = 'Image' }: any) {
  const { MediaUpload, MediaUploadCheck } = wp.blockEditor;
  const { TextControl } = wp.components;
  return (
    <div className="site-field-media">
      {value?.url && <img src={value.url} alt={value.alt ?? ''} className="w-full object-cover" />}
      <div className="site-media-actions">
        <MediaUploadCheck>
          <MediaUpload
            value={value?.id}
            allowedTypes={['image']}
            onSelect={(media: any) => {
              rememberMedia(media);
              setValue({ id: media.id, url: media.url, alt: media.alt ?? '' });
            }}
            render={({ open }: any) => (
              <MediaSelectAction selected={Boolean(value?.url)} kind="image" label={value?.url ? 'Replace image' : 'Select ' + label.toLowerCase()} onClick={open} />
            )}
          />
        </MediaUploadCheck>
        {value?.url && (
          <EditorAction action="remove" label="Remove image" onClick={() => setValue({ id: 0, url: '', alt: '' })} />
        )}
      </div>
      {value?.url && (
        <TextControl
          label="Alternative text"
          value={value.alt ?? ''}
          onChange={(alt: string) => setValue({ ...value, alt })}
        />
      )}
    </div>
  );
}
function LinkControls({ value = {}, setValue, site = {} }: any) {
  const { TextControl, ComboboxControl } = wp.components;
  const modalId = Number(value.modalId) || 0;
  const pages = editorEnvironment().linkRecords?.(site) ?? [];
  const selected = pages.find((r) =>
    value.linkId ? Number(r.id) === Number(value.linkId) : r.url === value.url
  );
  const target = modalId
    ? 'modal:' + modalId
    : selected
      ? 'record:' + selected.kind + ':' + selected.id
      : 'url';
  return (
    <>
      <TextControl
        label="Button text"
        value={value.text ?? ''}
        onChange={(text: string) => setValue({ ...value, text })}
      />
      <ComboboxControl
        label="Action"
        allowReset={false}
        value={target}
        options={[
          { value: 'url', label: 'Custom URL' },
          ...(site.modals ?? []).map((r: any) => ({
            value: 'modal:' + r.id,
            label: 'Modal · ' + r.title,
          })),
          ...pages.map((r) => ({
            value: 'record:' + r.kind + ':' + r.id,
            label: r.kind + ' · ' + r.title,
          })),
        ]}
        onChange={(next: string | null) => {
          if (!next) return;
          if (next.startsWith('modal:'))
            setValue({ ...value, modalId: Number(next.slice(6)), linkId: 0, url: '' });
          else {
            const page = pages.find((r) => 'record:' + r.kind + ':' + r.id === next);
            setValue({ ...value, modalId: 0, linkId: page?.id ?? 0, url: page?.url ?? '' });
          }
        }}
      />
      {target === 'url' && (
        <TextControl
          label="URL"
          type="url"
          value={value.url ?? ''}
          onChange={(url: string) => setValue({ ...value, url, modalId: 0, linkId: 0 })}
        />
      )}
      {editorEnvironment().actionExtras?.({ value, setValue, site })}
      <ButtonIconSettings value={value} onChange={setValue} />
    </>
  );
}
function FieldControls({ schema, value, onChange, site }: any) {
  return (
    <div className="site-field-controls">
      {schema.map((field: FieldDefinition) => (
        <FieldEditor
          key={field.name}
          controls
          name={field.name}
          field={field}
          value={value[field.name]}
          setValue={(next) => onChange({ ...value, [field.name]: next })}
          site={site}
        />
      ))}
    </div>
  );
}
function CollectionControls({ field, value, setValue, site, focusRequest }: Props & { focusRequest?: { index: number } | null }) {
  const items = Array.isArray(value) ? value : [];
  const label = labelOf(field);
  const min = field.min ?? 0,
    max = field.max ?? Infinity;
  const update = (next: any[]) => {
    if ((next.length < min && next.length < items.length) || next.length > max) return;
    setValue(next);
  };
  const create = () =>
    field.type === 'gallery'
      ? { id: 0, url: '', alt: '' }
      : field.type === 'buttons'
        ? { text: '', url: '', modalId: 0, icon: '' }
        : emptyValues(field.fields ?? []);
  return (
    <RepeatableList
      heading={label}
      items={items}
      onChange={update}
      addLabel={
        'Add ' + (field.type === 'buttons' ? 'button' : field.type === 'gallery' ? 'image' : 'item')
      }
      deleteLabel="Remove item"
      focusRequest={focusRequest}
      createItem={create}
      addDisabled={items.length >= max}
      emptyLabel="Item"
      getItemLabel={(item: any) =>
        String(
          item.title ||
            item.heading ||
            (typeof item[field.fields?.[0]?.name ?? ''] === 'string' ? item[field.fields![0].name] : '') ||
            (typeof item.text === 'string' ? item.text : '') ||
            item.alt ||
            'Item'
        ).replace(/<[^>]*>/g, '')
      }
      renderSummary={() =>
        field.type === 'buttons' ? 'Button' : field.type === 'gallery' ? 'Image' : 'Repeater item'
      }
      renderThumbnail={
        field.type === 'gallery'
          ? (item: any) => (item.url ? <img src={item.url} alt="" /> : null)
          : undefined
      }
      renderFields={(item: any, _patch: any, index: number) => {
        const change = (next: any) =>
          setValue(items.map((old: any, i: number) => (i === index ? next : old)));
        return field.type === 'buttons' ? (
          <LinkControls value={item} setValue={change} site={site} />
        ) : field.type === 'gallery' ? (
          <MediaPicker value={item} setValue={change} />
        ) : (
          <FieldControls schema={field.fields ?? []} value={item} onChange={change} site={site} />
        );
      }}
    />
  );
}
function FieldEditor(props: Props) {
  const scope = useFieldScope();
  const [focusRequest, setFocusRequest] = useState<{ index: number } | null>(null);
  const { field, setValue, site, controls = false } = props;
  const value = props.value ?? emptyValues([field])[field.name],
    label = labelOf(field);
  const { RichText, InspectorControls } = wp.blockEditor;
  const { TextControl, TextareaControl, ToggleControl, PanelBody, ColorPalette } = wp.components;
  const inspector = (children: any) => (
    <InspectorControls>
      <PanelBody title={label}>
        {field.instructions && <p>{field.instructions}</p>}
        {children}
      </PanelBody>
    </InspectorControls>
  );
  if (field.control === 'row-settings') return <ItemSettings {...props} />;
  if (field.control === 'list-display') return <CollectionDisplaySettings label={label} value={value} onChange={setValue} />;
  if (field.type === 'content')
    return (
      <ContentAreaEditor
        render={props.options?.render}
        className={props.options?.className}
        style={props.options?.style}
        definition={{
          ...field.area!,
          ...(props.options?.template
            ? {
                template: props.options.fixedLayout
                  ? props.options.template.map((group: any) => [
                      group[0],
                      { ...group[1], lock: { move: true, remove: true } },
                      group[2],
                    ])
                  : props.options.template,
              }
            : {}),
          ...(props.options?.fixedLayout
            ? { allowedBlocks: ['core/buttons'], appender: false }
            : {}),
        }}
        data={scope.value}
        templateData={scope.resolvedValue}
        onChange={scope.onChange!}
        site={site}
      />
    );
  if (field.type === 'custom' && field.control === 'list-actions')
    return <ListActionsEditor {...props} />;
  if (field.type === 'custom' && field.control === 'record-tools') return <RecordTools {...props} />;
  if (field.type === 'custom') {
    const Extension = scope.extensions?.[field.control ?? ''];
    return Extension ? (
      <Extension {...props} scope={scope} />
    ) : (
      scope.renderCustomField?.(props, scope) ?? null
    );
  }
  if (field.type === 'relationship' && field.resolveRecords)
    return <SourceRelationship {...props} />;
  if (field.type === 'relationship') {
    if(Number(field.controlOptions?.latest)>0&&scope.value[String(field.controlOptions?.modeField)]!=='manual')return controls?<p className="site-field-empty">Latest {String(field.controlOptions?.latest)} published records. Choose Manual selection to pick individual records.</p>:null;
    const records = relationshipRecords(field, site);
    const manual = (Array.isArray(value) ? value : []).filter((item: any) => item?.manual);
    const addManual = () => setValue([...(value ?? []), newManualRecord()]);
    const canAdd = field.manual && (value ?? []).length < (field.max ?? Infinity);
    const picker = (
      <RelationshipPicker
        label={label}
        records={[
          ...records.map((r: any) => ({ key: String(r.id), label: r.title, image: r.image })),
          ...manual.map((r: any) => ({
            key: r.id,
            label: r.title || r.question || r.author || 'Custom card',
            image: r.image,
            description: 'Custom card',
            available: false,
          })),
        ]}
        value={selectedRecords(value, records).map((r: any) => String(r.id))}
        onChange={(ids) => {
          if (
            (ids.length >= (field.min ?? 0) || ids.length > value.length) &&
            ids.length <= (field.max ?? Infinity)
          )
            setValue(ids.map((id) => manual.find((r: any) => r.id === id) ?? Number(id)));
        }}
        onAddCustom={canAdd ? addManual : undefined}
      />
    );
    if (controls) return picker;
    return (
      <>
        {inspector(picker)}
        {!(value ?? []).length && !field.manual && (
          <p className="site-field-empty">Select {label.toLowerCase()} in the block settings.</p>
        )}
        {canAdd && (
          <div
            role="button"
            tabIndex={0}
            className={['site-record-add', props.options?.addClass].filter(Boolean).join(' ')}
            aria-label={props.options?.addText}
            contentEditable={false}
            onClick={addManual}
            onKeyDown={(event) => {
              if (event.key !== 'Enter' && event.key !== ' ') return;
              event.preventDefault();
              addManual();
            }}
          >
            <div className="site-record-add-shape" aria-hidden="true">
              {props.options?.shape}
            </div>
            <svg className="site-record-add-frame" aria-hidden="true">
              <rect rx="2" />
            </svg>
            <span className="site-record-add-label">
              <Plus aria-hidden="true" size={24} strokeWidth={1.5} />
            </span>
          </div>
        )}
      </>
    );
  }
  if (['repeater', 'buttons', 'gallery'].includes(field.type)) {
    const list = <CollectionControls {...props} value={value} focusRequest={focusRequest} />;
    if (controls) return list;
    if (field.type === 'repeater')
      return (
        <>
          {inspector(list)}
          {(value ?? []).length < (field.max ?? Infinity) && (
            <div className={['site-editor-add', (value ?? []).length ? 'is-compact' : 'is-empty', props.options?.addText && 'has-text'].filter(Boolean).join(' ')}>
              <EditorAction
                action="add"
                label={'Add ' + label}
                onClick={() => setValue([...(value ?? []), emptyValues(field.fields ?? [])])}
              >
                {props.options?.addText ?? ((value ?? []).length ? null : 'Add item')}
              </EditorAction>
            </div>
          )}
        </>
      );
    if (field.type === 'buttons')
      return (
        <>
          {inspector(list)}
          <div className={'site-actions relative ' + (props.className ?? 'flex flex-wrap gap-3')}>
            {value.map((button: any, index: number) => (
              <span
                key={index}
                className="site-editor-button"
                onClick={(event: any) => {
                  if (event.target.closest('.site-button-tools')) return;
                  setFocusRequest({ index });
                  wp.data.dispatch('core/edit-post')?.openGeneralSidebar?.('edit-post/block');
                }}
              >
                <span className={props.options?.buttonClassName?.(button, index) ?? 'wp-block-button__link'}>
                <ButtonLabel
                  attributes={{
                    metadata: {
                      siteButtonIcon: button.icon,
                      siteButtonIconPosition: button.iconPosition,
                    },
                  }}
                >
                  <RichText
                    tagName="span"
                    value={button.text ?? ''}
                    placeholder="Button text…"
                    allowedFormats={[]}
                    onChange={(text: string) =>
                      setValue(
                        value.map((old: any, i: number) => (i === index ? { ...old, text } : old))
                      )
                    }
                  />
                </ButtonLabel>
                </span>
                {props.options?.buttonControl?.(
                  button,
                  (next: any) => setValue(value.map((old: any, i: number) => (i === index ? next : old))),
                  index
                )}
              </span>
            ))}
            {value.length < (field.max ?? Infinity) && (
              <div className={['site-editor-add', value.length ? 'is-compact' : 'is-empty', props.options?.addClass, props.options?.addText && 'has-text'].filter(Boolean).join(' ')}>
                <EditorAction
                  action="add"
                  label="Add button"
                  onClick={() => setValue([...value, { text: '', url: '', modalId: 0 }])}
                >
                  {props.options?.addText ?? (value.length ? null : 'Add button')}
                </EditorAction>
              </div>
            )}
          </div>
        </>
      );
    return (
      <>
        {inspector(list)}
        {renderField(field, value, site, props)}
      </>
    );
  }
  if (field.type === 'group')
    return (
      <FieldControls schema={field.fields ?? []} value={value} onChange={setValue} site={site} />
    );
  if (field.type === 'richText') {
    const input = (
      <RichText
        tagName={controls ? 'div' : props.inline ? 'span' : props.as ?? field.tag ?? 'div'}
        className={props.className ?? (props.inline ? 'site-inline-text' : undefined)}
        value={value}
        placeholder={field.placeholder ?? label + '…'}
        allowedFormats={[
          'core/bold',
          'core/italic',
          'core/strikethrough',
          'core/link',
          'site/accent',
        ]}
        onChange={setValue}
      />
    );
    return controls ? (
      <label className="site-field-rich-control">
        <span>{label}</span>
        {input}
      </label>
    ) : (
      input
    );
  }
  if (field.type === 'wysiwyg')
    return (
      <ParagraphEditor
        value={Array.isArray(value) ? value : []}
        onChange={setValue}
        selected
        className={props.className}
        paragraphClass={props.options?.paragraphClass}
        addClass={props.options?.addClass}
        addText={props.options?.addText}
      />
    );
  if (field.type === 'image' && field.storage === 'url') {
    const picker = (
      <wp.blockEditor.MediaUploadCheck>
        <wp.blockEditor.MediaUpload
          value={mediaId(value)}
          allowedTypes={field.control === 'svg' ? ['image/svg+xml'] : ['image']}
          onSelect={(media: any) => {
            rememberMedia(media);
            setValue(media.url);
          }}
          render={({ open }: any) =>
            controls ? (
              <div className="site-media-setting">
                {value && <img src={value} alt="" />}
                <div className="site-media-actions">
                  <MediaSelectAction selected={Boolean(value)} kind="image" onClick={open} />
                  {value && (
                    <EditorAction action="remove" label="Remove image" onClick={() => setValue('')} />
                  )}
                </div>
              </div>
            ) : value ? (
              <LibraryImage
                {...props.imageProps}
                src={value}
                className={props.className ?? props.imageProps?.className}
                role="button"
                tabIndex={0}
                title="Click to replace image"
                onClick={(e: any) => {
                  e.preventDefault();
                  e.stopPropagation();
                  open();
                }}
                onKeyDown={(e: any) => {
                  if (['Enter', ' '].includes(e.key)) {
                    e.preventDefault();
                    open();
                  }
                }}
              />
            ) : (
              <MediaSelectAction kind="image" onClick={open} />
            )
          }
        />
      </wp.blockEditor.MediaUploadCheck>
    );
    return controls ? (
      <div className="site-media-setting">
        <strong>{label}</strong>
        {picker}
      </div>
    ) : (
      picker
    );
  }
  if (field.type === 'media') {
    const picker = (
      <MediaEditor label={label} value={value} onChange={setValue} options={field.media} />
    );
    return controls ? (
      picker
    ) : (
      <>
        {!props.nested && !field.settings && inspector(picker)}
        {renderField(field, value, site, { ...props, editor: true })}
      </>
    );
  }
  if (field.type === 'image') {
    const picker = <MediaPicker label={label} value={value} setValue={setValue} />;
    // With an image chosen the canvas shows the real layout; the picker moves to the sidebar.
    if (controls || !value?.url) return picker;
    return (
      <>
        {!props.options?.itemPanel && inspector(picker)}
        {renderField(field, value, site, props)}
      </>
    );
  }
  if (field.type === 'icon') {
    const picker = (
      <IconPicker
        allowImage={false}
        value={{ type: value || 'none' }}
        onChange={(icon: any) => setValue(icon.type === 'none' ? '' : icon.type)}
      />
    );
    return controls ? (
      picker
    ) : (
      <>
        {!props.nested && !field.settings && inspector(picker)}
        {renderField(field, value, site, props)}
      </>
    );
  }
  if (field.type === 'link')
    return controls ? (
      <LinkControls value={value} setValue={setValue} site={site} />
    ) : (
      <>
        {inspector(<LinkControls value={value} setValue={setValue} site={site} />)}
        {renderField(field, value, site, props)}
        {!value.text && <span>Configure {label.toLowerCase()} in block settings.</span>}
      </>
    );
  if (field.type === 'toggle')
    return <ToggleControl label={label} checked={Boolean(value)} onChange={setValue} />;
  if (field.type === 'select')
    return (
      <SelectControl
        label={label}
        value={value}
        options={[
          { label: 'Select…', value: '' },
          ...Object.entries(field.choices ?? {}).map(([value, label]) => ({ value, label })),
        ]}
        onChange={setValue}
      />
    );
  if (field.type === 'color')
    return (
      <fieldset>
        <legend>{label}</legend>
        <ColorPalette value={value} onChange={(color: string) => setValue(color ?? '')} />
      </fieldset>
    );
  if (field.type === 'textarea')
    return <TextareaControl label={label} value={value} onChange={setValue} />;
  if (field.type === 'number' && props.inline)
    return (
      <input
        className="site-inline-number"
        aria-label={label}
        type="number"
        min={field.min ?? 0}
        step={field.step}
        value={value}
        onChange={(event) => setValue(Math.max(field.min ?? 0, Number(event.target.value)))}
        onClick={(event) => event.stopPropagation()}
      />
    );
  if (field.type === 'number')
    return (
      <TextControl
        label={label}
        type="number"
        value={value}
        min={field.min}
        max={field.max}
        step={field.step}
        onChange={(number: string) => setValue(number === '' ? '' : Number(number))}
      />
    );
  return controls ? (
    <TextControl label={label} value={value} onChange={setValue} />
  ) : (
    <RichText
      tagName={props.as ?? field.tag ?? 'span'}
      className={props.className}
      value={value}
      placeholder={field.placeholder ?? label + '…'}
      allowedFormats={[]}
      onChange={setValue}
    />
  );
}
function SchemaSettings({ schema }: any) {
  const scope = useFieldScope();
  const fields = schema.filter((field: any) => field.settings);
  return fields.length ? (
    <wp.blockEditor.InspectorControls>
      <wp.components.PanelBody title="Section settings">
        {fields.map((field: any) => (
          <FieldEditor
            key={field.name}
            controls
            name={field.name}
            field={field}
            value={scope.value[field.name] ?? emptyValues([field])[field.name]}
            setValue={(value) => scope.onChange?.({ ...scope.value, [field.name]: value })}
            site={scope.site}
          />
        ))}
      </wp.components.PanelBody>
    </wp.blockEditor.InspectorControls>
  ) : null;
}
const editField: EditField = (props) => <FieldEditor {...props} />;
export function SchemaEditor({
  schema: declaredSchema,
  kind,
  Component,
  data,
  onChange,
  site = {},
  record = {},
  blockName,
  extensions = {},
  renderCustomField = editorEnvironment().renderCustomField,
}: ModuleProps & {
  schema: FieldDefinition[];
  Component: React.ComponentType;
  onChange: (next: any) => void;
  record?: any;
  blockName?: string;
  extensions?: Record<string, any>;
  renderCustomField?: (props: any, scope: any) => React.ReactNode;
}) {
  const schema = sectionFields(declaredSchema, kind);
  const props = wp.blockEditor.useBlockProps({
    className: 'site-preview site-schema-preview',
  });
  return (
    <div
      {...props}
      onSubmitCapture={(event: any) => {
        event.preventDefault();
        event.stopPropagation();
      }}
      onAuxClickCapture={(event: any) => {
        if (event.target.closest('a') && !event.target.closest('[data-site-edit-record]'))
          event.preventDefault();
      }}
      onClickCapture={(event: any) => {
        if (event.target.closest('a') && !event.target.closest('[data-site-edit-record]'))
          event.preventDefault();
      }}
    >
      <FieldScope
        schema={schema}
        value={data}
        site={site}
        onChange={(next) => onChange(withMediaRefs(next))}
        edit={editField}
        record={record}
        blockName={blockName}
        extensions={extensions}
        renderCustomField={renderCustomField}
      >
        <SchemaSettings schema={schema} />
        <Component />
      </FieldScope>
    </div>
  );
}
