# SP Media

Portable media module adapted from the SP Universal Media behavior in the Alexandra PHP kit. The ACF field/UI is replaced with React and WordPress MediaUpload.

- `model.ts`: value/options types, provider URL validation, embed URLs, responsive inheritance.
- `editor.tsx` + `editor.css`: React field controls using WordPress components and MediaUpload.
- `component.tsx` + `styles.css`: shared image/video/embed renderer and native popup.
- `bootstrap.php`: WordPress attachment hydration; no content migration or automatic DB writes.

The module has no site-specific imports. `inc/integrations/media.php` loads its PHP adapter; `hydrate_media()` calls `SpMedia\hydrate()`. The core field API exposes `addMedia()` and `Field`. The optional `site/media` block lives in `src/blocks/elements/media`.

Usage/options: [Field example](../../fields/examples/media/example.md).

Frontend runtime dependencies are React and React DOM. The editor additionally uses WordPress's block editor/components and Lucide icons already installed in this project. Shared styles are included in Next and the Gutenberg content stylesheet; editor styles are bundled only into the editor stylesheet.

The module is available in the existing Field Playground. Existing section-specific image/background fields retain their current shape; sections can adopt `addMedia` explicitly when their media behavior is updated.

Checks: `npm test` (media.test.mjs), `npm run typecheck`, and `wp eval-file wp-content/themes/complex-studio/frontend/tests/media.php`.
