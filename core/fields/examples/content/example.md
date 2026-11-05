# Content area

A native Gutenberg child-block area. Its order and content live in innerBlocks, not in an attribute array.

```ts
fields()
 .addContentArea('content', {
   allowedBlocks: ['core/heading', 'core/paragraph', 'core/image', 'core/buttons'],
   initializedKey: '__contentInitialized', // defaults to __<field name>Initialized
   template: data => [
     ['core/heading', {level: 2, content: data.heading}],
     ['core/paragraph', {content: data.description}],
   ],
 }, {
   label: 'Content',
   instructions: 'Add text, images and buttons in this area.',
   scaffold: true,
 })
 .build();
```

`template` may also be a static Gutenberg template array. The callback receives resolved schema values and the host site data. `allowedBlocks` restricts new insertions; it never deletes already saved children. A saved initialized area can be empty, and its template will not return after deletion.

```tsx
import {ContentArea} from '@kit/core/fields/render';
<ContentArea name="content" className="space-y-6" />
```

The callback receives a ready React content slot, not a raw block array. The same callback executes on the frontend and in Gutenberg. All surrounding markup belongs in `component.tsx`:

```tsx
<ContentArea name="content" className="section-content">
 {content => (
   <section className="grid gap-8">
     <header className="section-heading">More about us</header>
     <div className="section-body">{content}</div>
     <footer className="section-footer">Shared footer</footer>
   </section>
 )}
</ContentArea>
```

Changing any of these tags, classes or static elements changes both environments. The editor supplies its native `InnerBlocks` as `content`; the frontend supplies the site's configured content renderer. Keep the slot mounted once to retain a single editable block list, including its appender.

The default core renderer supports native HTML. A host can configure a `Content` component on `defineModule` (or `FieldScope`) for its own registered child blocks. The site's registry supplies `NativeContent` once for every existing and generated module. This is content rendering infrastructure, not a second section layout. Registered child blocks use their own shared components in frontend rendering and editing.

The current contract supports one root content area per block. Multiple independent regions require separate child container blocks. Declaring two root areas fails validation instead of silently attaching both editors to the same innerBlocks.

Do not rename `initializedKey` for an existing block without deliberately accounting for its saved state. Existing section data and innerBlocks are preserved; no startup migration runs.

For fixed grids, the section schema can also declare:

```ts
.addContentArea('content', {
  allowedBlocks: ['project/text-column'],
  template: sectionTemplate,
  initializedKey: '__sectionContent',
  templateLock: 'all', // false (default), 'insert', or 'all'; child areas keep their own rules
  appender: false,    // true by default
  prepare: blocks => wrapInColumns(blocks), // pure and idempotent; preserve saved children
  initialize: (data, site) => ({ selectedIds: initialSelection(data, site) }),
})
```

`initialize` only fills missing attributes when the area is mounted. Existing values, including empty selections, are preserved. `prepare` runs in both editor initialization and frontend resolution; it must preserve content and return already prepared trees unchanged.

For a grid, declare its element and classes directly on the shared area:

```tsx
<ContentArea name="content" as="section" className="section-columns" />
```

`as={null}` returns the callback layout without an additional authored container in either environment. The normal element form also receives Gutenberg’s native layout and drop-zone props on its shared root.

Button-only areas use this same API. A shared button renderer may pass `options={{template, fixedLayout}}` for an editor-only initial template. Frontend defaults belong in the schema's `template`; omitting it leaves existing saved buttons as the source of truth.

All site sections now use this declaration for native child content and actions. There are no separate native-text or native-buttons editor adapters. Fixed child containers (columns, review areas, contact slots) remain normal Gutenberg blocks with their own editing permissions.

To reuse the standard action area without copying allowed-block lists:

```ts
import {actionArea} from '@kit/core/fields/presets';
const schema = fields().addRichText('heading').addFields(actionArea()).build();
```

The CLI commands `create:section`, `create:component` and `create:layout` start new modules with a native `content` area. `render:module` emits the shared `(content) => …` slot layout for every content field. With `npm run dev` running, editing `component.tsx` automatically rebuilds Gutenberg; refresh its page after the `[editor] Ready` message. Without dev mode, run `npm run build:editor` manually. Existing saved data, child identities, initialized empty areas and manual-layout overwrite protection are preserved.
