# Universal media (`sp-media`)

Reusable React implementation of the SP media field, with no ACF or jQuery dependency.

```tsx
import { fields } from '@kit/core/fields/schema';

export const schema = fields()
  .addMedia('visual', {
    label: 'Section media',
    instructions: 'Choose an image, a video or a remote player.',
    settings: true,           // show controls once in Section settings
    optional: false,
    scaffold: true,
    media: {
      sources: ['library', 'youtube', 'vimeo'],
      displays: ['inline', 'popup'],
      responsive: true,      // Desktop → Tablet → Mobile inheritance
    },
  })
  .build();
```

All `media` options are optional. `sources` defaults to all three sources, `displays` to both display modes, and `responsive` to false. Use nonempty arrays to restrict choices. Generic field options such as `label`, `instructions`, `settings`, `optional`, `scaffold`, and `defaultValue` are also available.

```tsx
import { Field } from '@kit/core/fields/render';
export function Component() {
  return <Field name="visual" className="rounded-xl" />;
}
```

`npm run render:module -- your-section` generates this Field automatically. It uses the same renderer in Next and Gutenberg. The native Media block exposes the same field without creating a section.

## Stored values

```ts
import type { MediaValue } from '@kit/core/media/universal/model';

const value: MediaValue = {
  kind: 'sp-media',
  source: 'library',            // library | youtube | vimeo
  display: 'inline',            // inline | popup
  attachment_id: 123,           // required for library images/videos
  poster_id: 124,               // optional cover from the media library
  alt: 'Studio interior',       // image alternative text
  title: 'Studio tour',         // remote player accessible title
  url: '',                     // remote video URL; library URLs are resolved from ID
  autoplay: false,
  muted: false,
  loop: false,
  controls: true,
  playsinline: true,
  custom_play: true,
};
```

`url`, `poster_url`, `media_type`, `mime_type`, and library `title` are hydrated from WordPress attachments for frontend output. A missing/deleted library attachment renders nothing, rather than falling back to a stale URL. Gallery/repeater/group nesting uses the same hydration.

Responsive values use `{kind:'sp-media', desktop:{...}, tablet:{...}, mobile:{...}}`. Desktop is required. Empty Tablet inherits Desktop; empty Mobile inherits Tablet. Breakpoints match the SP module: Mobile below 576px, Tablet below 1024px, Desktop from 1024px. Image variants use `<picture>`; mixed/video variants mount only the selected viewport's player after hydration.

YouTube accepts standard watch, short, shorts, live and embed URLs over HTTPS. Vimeo accepts public and unlisted video URLs, preserving their privacy hash. Arbitrary iframe HTML and unrecognized providers are rejected.

## Direct renderer

```tsx
import { UniversalMedia } from '@kit/core/media/universal/component';
<UniversalMedia value={value} className="my-media" style={{ minHeight: 360 }} />
```

Props: `value`, `className`, `style`, `editor` (defaults to false). `editor` shows an inert cover preview so the player cannot capture editor input. Playback preferences belong to the saved value.

Popup uses an accessible native modal dialog, supports Escape and restores focus. Custom play defers iframe/player mounting until a click; external providers can still impose their own playback/privacy restrictions.
