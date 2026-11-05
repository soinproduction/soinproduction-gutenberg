# React field kit

This is a native React/Gutenberg field library, without ACF. The schema describes stored fields. React components edit those fields in Gutenberg and render their values in Next. The schema is TypeScript source, not a content export.

## Workflow

Run commands from the theme's `frontend` directory:

```sh
npm run create:section -- benefits
# Edit src/blocks/sections/benefits/schema.ts
npm run render:module -- benefits
```

`create:component` uses the same workflow for an article/component wrapper. Creation registers PHP, Gutenberg, Next and CSS. All existing and generated modules use the [same five-file contract](../../blocks/README.md).

`render:module` writes real JSX directly into `component.tsx` and rebuilds Gutenberg. Edit that file to customize the shared layout. Regeneration refuses to overwrite manually edited markup; `--stdout` prints a proposal without writing files, and `--force` explicitly replaces the whole layout. No extra generated file or automatic JSX merge is used. During `npm run dev`, editor builds run automatically after source changes; refresh Gutenberg when `[editor] Ready` appears. Outside dev mode use `npm run build:editor`.

## A section with text, buttons, a repeater and related posts

```ts
import { fields } from '@kit/core/fields/schema';

export const schema = fields()
  .addRichText('heading', { label: 'Heading', tag: 'h2' })
  .addWysiwyg('description', { label: 'Description' })
  .addButtons('buttons', { label: 'Buttons' })
  .addRepeater('items', fields()
    .addIcon('icon', { label: 'Icon' })
    .addRichText('title', { label: 'Title', tag: 'h3' })
    .addWysiwyg('text', { label: 'Description' })
  )
  .addRelationship('posts', { label: 'Related posts', postType: 'post' })
  .build();
```

A working, empty-by-default example is registered as **Content Section** (`src/blocks/content-section`). It is not inserted into existing pages automatically.

## Examples for every field

See [the field examples catalogue](./examples/README.md): one `example.md` per supported type, with all applicable options, stored values, rendering and current limitations.

## Fields available now

| Method | Stored value | Gutenberg |
| --- | --- | --- |
| `addText(name, options)` | string | Inline plain text / text input in repeaters |
| `addTextarea(name, options)` | string | Multiline input |
| `addNumber(name, options)` | number or empty string | Number input (`min`, `max`, `step`) |
| `addTrueFalse(name, options)` | boolean | Toggle |
| `addSelect(name, {choices})` | string | Select; choices are `{value: label}` |
| `addColorPicker(name, options)` | color string | Native color control; use the value in your layout |
| `addRichText(name, options)` | formatted string | Inline RichText; `tag` may be h1–h6, p, span, div |
| `addWysiwyg(name, options)` | array of paragraph HTML | RichText paragraphs, insert/remove paragraphs |
| `addMedia` | Media library ID or provider URL; optional screen variants | [Universal media](./examples/media/example.md) |
| `addImage(name, options)` | `{id, url, alt}` | Media Library, replace/remove, alternative text |
| `addGallery(name, options)` | array of image objects | Media Library; add/remove and drag to reorder |
| `addIcon(name, options)` | CMS icon ID | Visual icon picker |
| `addLink(name, options)` | action object | Custom URL, page, service, post or modal |
| `addButtons(name, options)` | array of action objects | Add/remove/reorder; text, destination, icon, plan key |
| `addRepeater(name, childBuilder, options)` | array of field objects | Add/remove/drag; inline text editing and settings |
| `addGroup(name, childBuilder, options)` | field object | Nested fields |
| `addRelationship(name, {postType})` | array of IDs | Available/Selected lists, search, thumbnails, drag, no duplicates |

Common options: `label`, `instructions`, `placeholder`, `defaultValue`. List fields support `min`/`max`; empty saved lists remain empty. A minimum prevents removal below that size; it does not seed content automatically. Relationship sources: `post`, `page`, `service`, `tariff`, `review`, `faq`, using the site's existing published-record API. Relationships store IDs; current titles and images come from those records at render time. Not every ACF field or ACF option is implemented.

`addWysiwyg` is a controlled paragraph editor, not TinyMCE or an unrestricted Gutenberg canvas. For headings/lists/custom layouts, add explicit fields or use native Gutenberg components in a custom module.

Color/toggle/select/number values are available through `useField(name).value` for layout-specific conditions and styles. Generated markup for these is deliberately basic; the generator cannot infer their purpose.

## Shared rendering components

Import from `@kit/core/fields/render`:

```tsx
<Field name="heading" as="h2" className="text-5xl" />
<Field name="description" className="space-y-4" />
<Field name="buttons" className="flex gap-4" />
<Repeater name="items" className="grid gap-6 for-small-tablet:grid-cols-3">
  <article>
    <Field name="icon" />
    <Field name="title" as="h3" />
    <Field name="text" />
  </article>
</Repeater>
<Relationship name="posts" className="grid gap-6 for-small-tablet:grid-cols-3">
  <article>
    <RecordImage className="aspect-[4/3] w-full object-cover" />
    <RecordTitle />
    <RecordExcerpt />
    <RecordLink>Read more</RecordLink>
  </article>
</Relationship>
```

`Group` creates a nested field scope. `useField(name)` exposes value and setter inside that scope. `renderField(definition, value, site, props)` is the standalone frontend render function. `FieldScope` supplies schema, saved values, site records and optionally an editor adapter. The Next renderer imports no WordPress editor code; `editor.tsx` adds that adapter only in Gutenberg.

Buttons resolve modals by saved ID into the current `/#modal-slug`; a removed/unpublished modal produces no active button. Pricing/FAQ/review records have no public detail page by default, so their generated cards have no invented link. Customize those cards to open a modal or omit the link.

## Files

- `schema.ts`: typed field definitions and chainable builder.
- `render.tsx`: shared layout components and frontend render functions.
- `editor.tsx`: Gutenberg controls, composing existing relationship/media/repeater controls.
- `records.ts`: source collection lookup and safe URLs; ordered ID selection is in ../relationships/selection.ts.
- `../content/rich-text.tsx`: safe formatting/link rendering.
- `../../../kit/tooling/render-module.mjs`: schema-to-JSX generation at development time.

Renaming/removing a schema field does not rewrite stored content. Keep names stable; data migrations, when actually needed, are deliberate maintenance operations.

## Current site modules

All existing site sections, header/footer, record cards, forms and booking modal now use this field engine. Their schemas are colocated with their JSX. See [module structure](../../blocks/README.md).

Advanced declarations used by the site:

- `addCustom(name, {control, settings?, optional?})`: an explicitly named domain control. The editor adapter can pass `extensions={{controlName: MyEditor}}`; that React component receives field, value, setValue, site and scope. Site-specific controls are supplied explicitly by site/editor/module-editor.tsx and field-controls.tsx; the core does not import them. On the frontend, a custom Field renders its children, so the module owns the markup.
- `settings: true`: also expose the field in the selected block's settings panel.
- `optional: true`: leave an absent value absent rather than filling it with an empty default.
- `storage: 'url'` on images: keep the stored value as a URL string with the existing attachment-reference map. The regular image field still stores `{id,url,alt}`.
- `recordField: 'title' | 'excerpt' | 'slug'`: bind a value to the current WordPress record. The editor writes record changes through core/editor; matching rich formatting is retained.
- `recordMeta`: bind changes to an explicitly named WordPress meta field (currently used by popular pricing plans).
- `resolveRecords: true` on relationships: use a live collection selection object `{mode:'all'|'selected'|'manual',ids:[],items?:[],overrides?:{}}`. `fromPosts: true` forces all published records; `excludeCurrent: true` filters the current record slug. `useValues()` exposes resolved records while the saved value keeps IDs and per-record overrides.
- `itemType: 'string'` on repeaters: simple string-array rows for explicitly rendered lists.

`useValues()` reads current schema values, record bindings and live records. `Field` also supports `name={['items', index, 'title']}` for explicit paths in a hand-written layout. `inline` renders text without an extra frontend wrapper; `localized="uk-UA"` formats an inline number using that locale. `imageProps` forwards image attributes while the field keeps media editing. ListActions adds row controls in the editor and no frontend markup; EditorRecordLink provides a direct edit-record shortcut.

For native Gutenberg text/button flows, the site's custom schema fields preserve innerBlocks; these areas are not converted into plain string attributes. This keeps their existing ordering and formatting.

Host options: `collection` chooses the site-data collection; `basePath` sets its public route (`null` disables generated detail URLs). `resolveValue({value,site,record})` adds an explicit binding. `recordSource` chooses the normalized record property for a meta binding. `readOnly` suppresses list editing. `controlOptions` carries custom-control options without entity-specific properties in the core API.

## Composable presets and content areas

`addFields(preset)` combines a reusable FieldsBuilder with the current schema and rejects duplicate keys. `sectionSettings({anchor:'about', number:true, background:'#ffffff'})` from `core/fields/presets` adds the requested sectionId, sectionNumber and sectionBackground controls. They do not change the layout; connect their values in your component. These controls have `scaffold:false`, so the generator does not print settings as visible text.

`addContentArea(name, definition, options?)` declares allowed native blocks, initial template and initialization state. `ContentArea` supplies a ready React content slot to the same `(content) => …` layout callback in the frontend and Gutenberg. All surrounding markup stays in `component.tsx`; the argument is not a raw block array. The core renders native content by default; a host can supply `Content` on `defineModule` or `FieldScope` for custom child blocks. See the [full content-area example](examples/content/example.md). The current contract allows one root area per block; use child container blocks for multiple regions.

`scaffold:false` can be used on any field to omit it from generated JSX. It does not remove the field or alter saved values. The generator emits ContentArea with a shared content-slot callback for content fields and continues to protect manual layouts.
