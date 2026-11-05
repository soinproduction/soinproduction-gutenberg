# Reusable React / Gutenberg core

This is a source library, shared by the site and its editor. It contains no studio sections, CMS endpoints, booking rules, service URLs, theme configuration or project globals. It is not a published npm package.

```text
fields/         typed schema builder, shared field rendering, Gutenberg adapter
editor/         repeaters, relationship picker, icon/media controls, editor environment
content/        data context, RichText parsing and safe HTML attributes
icons/          one icon catalogue and renderers
media/          attachment resolution and Image
relationships/  ID normalization, ordering, selection and picker record mapping
modules/        shared module types and frontend adapter
ui/             generic UI primitives
utils/          paths, colors, URLs and class names
```

## Use in another project

Copy core/ and keep the `@kit/core/*` TypeScript alias pointed at it. The automated portability test builds both render and editor entry points from that directory alone. Use the same React instance on the frontend; Gutenberg's bundle must resolve React to `wp.element` as the current build script does.

Runtime dependencies: React/React DOM, htmlparser2 and lucide-react. The optional UI primitives additionally use the Radix, carousel and class-name packages listed in this project's package.json. Gutenberg controls use the host's `wp.blockEditor`, `wp.components` and data stores. Layout classes expect the host's Tailwind/theme CSS. Include `core/editor/styles.css` in the editor; site-specific styles are separate.

Create your own module registry, PHP registration list and CMS API adapter. The existing CLI tools can be copied with their registry insertion markers; their commands still create the same five-file module structure.

## Field declaration and one shared layout

```tsx
import {fields} from '@kit/core/fields/schema';
export const schema=fields()
 .addRichText('heading',{label:'Heading'})
 .addWysiwyg('description',{label:'Description'})
 .addRepeater('items',fields().addRichText('title'))
 .addRelationship('events',{postType:'event',collection:'events',basePath:'/events/'})
 .build();
```

```tsx
import {Field,Repeater,Relationship,RecordTitle,RecordLink} from '@kit/core/fields/render';
export function Component(){return <section>
 <Field name="heading" as="h2"/>
 <Field name="description"/>
 <Repeater name="items"><Field name="title" as="h3"/></Repeater>
 <Relationship name="events"><article><RecordTitle/><RecordLink>Read</RecordLink></article></Relationship>
</section>;}
```

`defineModule` supplies frontend contexts. `SchemaEditor` supplies editor contexts for the same Component. See [field examples](fields/examples/README.md) and [module contract](../blocks/README.md).

## Host integrations are explicit

- `configureEditor({media,linkRecords,actionExtras})` supplies attachment storage, available link destinations and extra action fields. Core controls read no project globals. The studio's implementation is `site/editor/environment.tsx`.
- `SchemaEditor` accepts `renderCustomField` and per-control `extensions`. The studio composes these in `site/editor/module-editor.tsx`; the core does not import that adapter.
- Relationship fields accept arbitrary `postType`, `collection` and `basePath`. Use `basePath:null` for records without public detail pages.
- `resolveValue({value,site,record})` is an optional schema callback for host-specific bindings. It stays in code; only field values are saved in WordPress. `recordSource` names the normalized record property; `recordMeta` names the field to save.
- Numeric `Field` accepts `localized="en-US"` or another explicit locale. `localized` alone uses the runtime locale.

## DRY rules

Use the existing core field, repeater, relationship and media controls before adding a new one. Add site-specific behavior through an adapter or schema option, not a branch inside the core. Keep local section markup in its module.

RichText uses one parser with explicit link-formatting policy. Ordered record lookup and duplicate prevention use one implementation. All selectable content icons come from the CMS catalogue in `site.icons`. There is no bundled icon catalogue, generated SVG file or separate icon build step. Run `npm run build:editor` after changing editor code.

## Section anchors

Every `kind: 'section'` module receives one `sectionId` field in **Section settings → Section anchor**. It is added by `sectionFields()` in the core and the editor receives the module kind from the shared registry. An explicit `sectionSettings({anchor: 'gallery'})` preset can supply a default without creating a second control. Empty saved values remove the ID.

The section's root element uses `const sectionAnchor = useSectionAnchor()` and `id={sectionAnchor}`. The CLI renderer generates this automatically; no extra DOM wrapper is introduced. Existing section components follow the same rule. Shared hero layouts forward the ID to their root. Elements and header/footer layouts do not acquire section settings.

## Admin-managed icon sets

Provide `site.icons` as an array of `{value, label, set, svg}` through ContentProvider.
New values use the `custom:<set>:<icon>` namespace. Previously selected icons retain their stable IDs as data in the CMS library; they have no separate renderer or bundled fallback.
IconPicker, Icon and ButtonLabel share the same catalogue. Native editor integrations can
pass the array explicitly to IconPicker and `buttonIconStyle(metadata, library)`.
The host validates SVGs before exposing them. This core uses SVG masks rather than
inserting uploaded XML into the page. No font generation or endpoint is built into the core.


## Responsive configuration

`responsive/breakpoints.ts` is portable and accepts host-owned values through `createBreakpoints(values)`. It imports no theme config. `up`, `down`, and `between` emit inclusive lower/exclusive upper CSS range queries. The universal media renderer reads `--site-media-mobile` and `--site-media-desktop` from host CSS (or the editor canvas). A host must provide these boundaries to enable responsive media variants; without them the desktop fallback is used.

The current theme supplies config/breakpoints.json, CSS generation and the JS/PHP adapters outside core. A future npm package can ship the generic helper and PostCSS generator; each consuming project owns its values. The generator accepts explicit `configPath` and `outputPath` options.
