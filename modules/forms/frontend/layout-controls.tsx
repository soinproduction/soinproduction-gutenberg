import { SelectControl } from '../../../ui/select.js';
import { fieldWidths } from './schema.js';
declare const wp: any;
const layouts = [
  [100],
  [50, 50],
  [33.3333, 33.3333, 33.3333],
  [60, 40],
  [40, 60],
  [25, 75],
  [75, 25],
  [25, 25, 25, 25],
];
export function WidthPicker({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="fe-picker">
      <span className="fe-setting-label">Field width</span>
      <div className="fe-width-options" role="group" aria-label="Field width">
        {fieldWidths.map((n) => (
          <button
            type="button"
            key={n}
            aria-label={Math.round(n) + '% width'}
            title={Math.round(n) + '% width'}
            aria-pressed={Math.abs(value - n) < 0.01}
            onClick={() => onChange(n)}
          >
            <span className="fe-width-preview" aria-hidden="true">
              <i style={{ width: n + '%' }} />
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
export function LayoutPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (widths: number[]) => void;
}) {
  return (
    <div className="fe-picker">
      <span className="fe-setting-label">Layout preset</span>
      <div className="fe-layout-options" role="group" aria-label="Layout preset">
        {layouts.map((widths) => {
          const key = widths.map(Math.round).join(' / ');
          return (
            <button
              type="button"
              key={key}
              aria-label={'Layout ' + key}
              title={key}
              aria-pressed={value === key}
              onClick={() => onChange(widths)}
            >
              <span
                aria-hidden="true"
                className="fe-mini-grid"
                style={{ gridTemplateColumns: widths.map((n) => n + 'fr').join(' ') }}
              >
                {widths.map((_, i) => (
                  <i className="is-filled" key={i} />
                ))}
              </span>
            </button>
          );
        })}
      </div>
      <p className="fe-help">
        Applies to existing fields in order. Each field can have its own width.
      </p>
    </div>
  );
}
export function FormDesignSettings({
  data,
  clientId,
  onChange,
  modals = [],
}: {
  data: any;
  clientId: string;
  onChange: (next: any) => void;
  modals?: any[];
}) {
  const { PanelBody, TextControl, ToggleControl, Button, ComboboxControl } =
    wp.components;
  const { InspectorControls, RichText } = wp.blockEditor;
  const set = (key: string, value: any) =>
    onChange({
      ...Object.fromEntries(Object.entries(data).filter(([name]) => name !== 'fields')),
      [key]: value,
    });
  const registry = wp.data.useRegistry();
  const pages =
    wp.data.useSelect(
      (select: any) =>
        select('core').getEntityRecords('postType', 'page', {
          per_page: -1,
          status: 'publish',
          orderby: 'title',
          order: 'asc',
        }),
      []
    ) ?? [];
  const applyLayout = (widths: number[]) => {
    const children = registry.select('core/block-editor').getBlocks(clientId);
    let index = 0;
    children.forEach((block: any) => {
      if (
        block.name.startsWith('form-engine/field-') &&
        !['hidden', 'metric'].includes(block.name.slice('form-engine/field-'.length))
      )
        registry.dispatch('core/block-editor').updateBlockAttributes(block.clientId, {
          field: { ...block.attributes.field, width: widths[index++ % widths.length] },
        });
    });
    onChange({
      ...Object.fromEntries(Object.entries(data).filter(([name]) => name !== 'fields')),
      columns: Math.min(widths.length, 3),
      layout: widths.map(Math.round).join(' / '),
    });
  };
  const editMessage = () => {
    const children = registry.select('core/block-editor').getBlocks(clientId);
    if (!children.some((b: any) => b.name === 'form-engine/success')) {
      const block = wp.blocks.createBlock('form-engine/success', {}, [
        wp.blocks.createBlock('core/paragraph', { content: data.successEyebrow ?? '' }),
        wp.blocks.createBlock('core/heading', {
          content: data.successTitle ?? 'Thank you!',
          level: 2,
        }),
        wp.blocks.createBlock('core/paragraph', { content: data.successMessage ?? '' }),
      ]);
      registry.dispatch('core/block-editor').insertBlocks(block, children.length, clientId, false);
    }
    set('previewSuccess', true);
  };
  const action = data.successAction ?? 'message';
  const rich = (key: string, label: string) => (
    <label className="fe-rich-setting">
      <span className="fe-setting-label">{label}</span>
      <RichText
        tagName="div"
        value={data[key] ?? ''}
        onChange={(v: string) => set(key, v)}
        allowedFormats={['core/bold', 'core/italic', 'core/link']}
      />
    </label>
  );
  return (
    <InspectorControls>
      <PanelBody title="Form layout" initialOpen>
        <LayoutPicker value={data.layout ?? ''} onChange={applyLayout} />
        {rich('heading', 'Heading')}
        {rich('submitLabel', 'Submit button')}
      </PanelBody>
      <PanelBody title="After submission" initialOpen>
        <div className="fe-action-options" role="group" aria-label="After submission">
          {[
            { value: 'message', label: 'Message', icon: 'admin-comments' },
            { value: 'redirect', label: 'Redirect', icon: 'external' },
            { value: 'modal', label: 'Modal', icon: 'welcome-widgets-menus' },
          ].map((item) => (
            <button
              type="button"
              key={item.value}
              aria-pressed={action === item.value}
              onClick={() => set('successAction', item.value)}
            >
              <span className={'dashicons dashicons-' + item.icon} />
              {item.label}
            </button>
          ))}
        </div>
        {action === 'redirect' ? (
          <>
            <SelectControl
              label="Destination"
              value={data.redirectSource ?? 'url'}
              options={[
                { label: 'Website page', value: 'page' },
                { label: 'Custom URL', value: 'url' },
              ]}
              onChange={(v: string) => set('redirectSource', v)}
            />
            {data.redirectSource === 'page' ? (
              <ComboboxControl
                label="Redirect page"
                value={String(data.redirectPageId ?? '')}
                options={pages.map((p: any) => ({
                  label: p.title.rendered.replace(/<[^>]*>/g, ''),
                  value: String(p.id),
                }))}
                onChange={(v: string) => set('redirectPageId', Number(v))}
              />
            ) : (
              <TextControl
                label="Redirect URL"
                value={data.redirectUrl ?? ''}
                placeholder="/thank-you or https://example.com"
                onChange={(v: string) => set('redirectUrl', v)}
              />
            )}
          </>
        ) : action === 'modal' ? (
          <>
            <SelectControl
              label="Success modal"
              value={data.successModalId ?? 0}
              options={[
                { label: 'Choose a published modal', value: 0 },
                ...modals.map((m) => ({ label: m.title, value: m.id })),
              ]}
              onChange={(v: string) => set('successModalId', Number(v))}
            />
            {Number(data.successModalId) > 0 && (
              <Button
                variant="link"
                href={'post.php?post=' + data.successModalId + '&action=edit'}
                target="_blank"
              >
                Edit modal in Gutenberg ↗
              </Button>
            )}
            <Button variant="link" href="post-new.php?post_type=site_modal" target="_blank">
              Create modal ↗
            </Button>
          </>
        ) : (
          <>
            <Button variant="secondary" onClick={editMessage}>
              Edit success content
            </Button>
            <p className="fe-help">
              Build the message on the canvas with headings, images and buttons.
            </p>
            <ToggleControl
              label="Preview success message"
              checked={Boolean(data.previewSuccess)}
              onChange={(v: boolean) => set('previewSuccess', v)}
            />
          </>
        )}
      </PanelBody>
      <PanelBody title="Error message" initialOpen={false}>
        {rich('errorMessage', 'Message shown if submission fails')}
      </PanelBody>
    </InspectorControls>
  );
}
