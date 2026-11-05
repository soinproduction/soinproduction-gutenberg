import { Select } from '../../../ui/select.js';
import { Input, Textarea } from '../../../ui/input.js';
import { Checkbox } from '../../../ui/checkbox.js';
import { RadioItem, RadioGroup } from '../../../ui/radio-group.js';
import { SelectControl } from '../../../ui/select.js';
import { metricSources } from './metrics.js';
import { WidthPicker } from './layout-controls.js';
import { useEffect } from 'react';
import { columnCount, defaultForm, fieldTypes, fieldTracks } from './schema.js';
declare const wp: any;
export const fieldBlockNames = fieldTypes.map((field) => 'form-engine/field-' + field.value);
export function fieldTemplate() {
  return defaultForm().fields.map((field) => ['form-engine/field-' + field.type, { field }]);
}
export function fieldsFromBlocks(blocks: any[] = []) {
  return blocks
    .filter((block) => fieldBlockNames.includes(block.name))
    .map((block) => ({ ...block.attrs.field, type: block.name.replace('form-engine/field-', '') }));
}
export function registerFieldBlocks(parent: string) {
  wp.hooks.addFilter(
    'blocks.registerBlockType',
    'form-engine/single-form',
    (settings: any, name: string) =>
      name === parent
        ? { ...settings, supports: { ...settings.supports, multiple: false } }
        : settings
  );
  wp.blocks.registerBlockType('form-engine/success', {
    apiVersion: 3,
    title: 'Success content',
    category: 'form-engine',
    parent: [parent],
    supports: { html: false, multiple: false, reusable: false },
    edit: () => {
      const props = wp.blockEditor.useBlockProps({ className: 'fe-success-content' });
      const inner = wp.blockEditor.useInnerBlocksProps(props, {
        allowedBlocks: [
          'core/paragraph',
          'core/heading',
          'core/image',
          'core/buttons',
          'core/group',
          'core/columns',
          'core/spacer',
        ],
        templateLock: false,
      });
      return <div {...inner} />;
    },
    save: () => (
      <div className="fe-success-content">
        <wp.blockEditor.InnerBlocks.Content />
      </div>
    ),
  });
  for (const kind of fieldTypes) {
    wp.blocks.registerBlockType('form-engine/field-' + kind.value, {
      apiVersion: 3,
      title: kind.label,
      description: 'Add a ' + kind.label.toLowerCase() + ' form field.',
      category: 'form-engine',
      icon: kind.value === 'email' ? 'email' : kind.value === 'date' ? 'calendar-alt' : 'feedback',
      attributes: { field: { type: 'object', default: {} } },
      supports: { html: false, reusable: false },
      example: { attributes: { field: { label: kind.label, id: 'preview', showLabel: true } } },
      edit: ({ attributes, setAttributes, clientId }: any) => {
        const field = attributes.field ?? {};
        const invisible = kind.value === 'hidden' || kind.value === 'metric';
        const update = (patch: any) => setAttributes({ field: { ...field, ...patch } });
        useEffect(() => {
          const store = wp.data.select('core/block-editor');
          const siblings = store.getBlocks(store.getBlockRootClientId(clientId));
          const first = siblings.find((b: any) => b.attributes.field?.id === field.id);
          if (!field.id || (first && first.clientId !== clientId))
            update({
              id: 'field-' + clientId.replace(/-/g, '').slice(0, 12),
              ...(field.label ? {} : { label: kind.label, showLabel: true }),
            });
        }, [clientId, field.id]);
        const { InspectorControls, useBlockProps } = wp.blockEditor;
        const { PanelBody, TextControl, ToggleControl, TextareaControl } =
          wp.components;
        const columns = wp.data.useSelect(
          (select: any) => {
            const store = select('core/block-editor');
            return columnCount(
              store.getBlockAttributes(store.getBlockRootClientId(clientId))?.data?.columns
            );
          },
          [clientId]
        );
        const inside = wp.data.useSelect(
          (select: any) => {
            const store = select('core/block-editor');
            return store.getBlockName(store.getBlockRootClientId(clientId)) === parent;
          },
          [clientId]
        );
        const props = useBlockProps({
          className: 'fe-field fe-native-field' + (invisible ? ' fe-invisible-field' : ''),
          style: { '--fe-span': invisible ? 60 : fieldTracks(field, columns) },
          'data-form-field': kind.value,
        });
        const preview = invisible ? (
          <div className="fe-hidden-preview">
            <span
              className={
                'dashicons dashicons-' + (kind.value === 'hidden' ? 'hidden' : 'chart-bar')
              }
            />
            <strong>{kind.label}</strong>
            <code>{field.id || 'field key'}</code>
            <small>
              {kind.value === 'hidden'
                ? 'Static: ' + (field.defaultValue || '(empty)')
                : metricSources.find(
                    (source) => source.value === (field.metricSource ?? 'utm_source')
                  )?.label}
            </small>
          </div>
        ) : kind.value === 'textarea' ? (
          <Textarea
            className="field"
            disabled
            placeholder={field.placeholder || field.label || kind.label}
            rows={4}
          />
        ) : kind.value === 'select' ? (
          <Select className="field" disabled placeholder={field.placeholder || kind.label} defaultValue={field.defaultValue} options={(field.options ?? []).filter(Boolean).map((option: string) => ({value:option,label:option}))} />
        ) : kind.value === 'checkbox' ? (
          <span>
            <Checkbox disabled /> {field.label || kind.label}
          </span>
        ) : kind.value === 'radio' ? (
          <div>
            {(field.options?.length ? field.options : ['Option']).map(
              (option: string, i: number) => (
                <label key={i} style={{ display: 'block' }}>
                  <RadioGroup disabled><RadioItem value={option} /></RadioGroup> {option}
                </label>
              )
            )}
          </div>
        ) : (
          <Input
            className="field"
            disabled
            type={kind.value}
            placeholder={field.placeholder || field.label || kind.label}
          />
        );
        return (
          <>
            <InspectorControls>
              <PanelBody title={kind.label + ' field'}>
                <TextControl
                  label="Field key"
                  value={field.id ?? ''}
                  help="Unique key for email templates and webhook."
                  onChange={(id: string) => update({ id })}
                />
                <TextControl
                  label="Label"
                  value={field.label ?? ''}
                  onChange={(label: string) => update({ label })}
                />
                {!invisible && (
                  <>
                    <TextControl
                      label="Placeholder"
                      value={field.placeholder ?? ''}
                      onChange={(placeholder: string) => update({ placeholder })}
                    />
                    <WidthPicker
                      value={
                        field.width ?? (100 * Math.min(columns, columnCount(field.span))) / columns
                      }
                      onChange={(width: number) => update({ width })}
                    />
                    <ToggleControl
                      label="Required"
                      checked={Boolean(field.required)}
                      onChange={(required: boolean) => update({ required })}
                    />
                    <ToggleControl
                      label="Show label"
                      checked={Boolean(field.showLabel)}
                      onChange={(showLabel: boolean) => update({ showLabel })}
                    />
                  </>
                )}
                {['select', 'radio'].includes(kind.value) && (
                  <TextareaControl
                    label="Options — one per line"
                    value={(field.options ?? []).join('\n')}
                    onChange={(value: string) => update({ options: value.split('\n') })}
                  />
                )}
                {kind.value === 'metric' ? (
                  <>
                    <SelectControl
                      label="Metric source"
                      value={field.metricSource ?? 'utm_source'}
                      options={metricSources}
                      onChange={(metricSource: string) => update({ metricSource })}
                    />
                    {field.metricSource === 'query' && (
                      <TextControl
                        label="UTM parameter key"
                        help="Only utm_* parameters are accepted. No auth tokens or personal-data parameters."
                        value={field.queryKey ?? ''}
                        onChange={(queryKey: string) => update({ queryKey })}
                      />
                    )}
                    <ToggleControl
                      label="Remember first value in this tab"
                      help="Off by default. Uses session storage only when enabled."
                      checked={Boolean(field.remember)}
                      onChange={(remember: boolean) => update({ remember })}
                    />
                    <p className="fe-help">
                      Metrics are client-provided attribution, never proof of identity or
                      authorization.
                    </p>
                  </>
                ) : kind.value === 'checkbox' ? (
                  <ToggleControl
                    label="Checked by default"
                    checked={Boolean(field.defaultValue)}
                    onChange={(defaultValue: boolean) => update({ defaultValue })}
                  />
                ) : (
                  <TextControl
                    label={kind.value === 'hidden' ? 'Fixed value' : 'Default value'}
                    value={field.defaultValue ?? ''}
                    onChange={(defaultValue: string) => update({ defaultValue })}
                  />
                )}
                {kind.value === 'number' && (
                  <>
                    <TextControl
                      type="number"
                      label="Minimum"
                      value={field.min ?? ''}
                      onChange={(min: string) =>
                        update({ min: min === '' ? undefined : Number(min) })
                      }
                    />
                    <TextControl
                      type="number"
                      label="Maximum"
                      value={field.max ?? ''}
                      onChange={(max: string) =>
                        update({ max: max === '' ? undefined : Number(max) })
                      }
                    />
                  </>
                )}
              </PanelBody>
            </InspectorControls>
            <div {...props}>
              {!inside && (
                <wp.components.Notice status="warning" isDismissible={false}>
                  Drag this field into the form to include it in submission.
                </wp.components.Notice>
              )}
              {!invisible && field.showLabel && !['checkbox', 'radio'].includes(kind.value) && (
                <label className="mb-2 block text-sm">
                  {field.label || kind.label}
                  {field.required ? ' *' : ''}
                </label>
              )}
              <div style={{ pointerEvents: 'none' }}>{preview}</div>
            </div>
          </>
        );
      },
      save: () => null,
    });
  }
}
