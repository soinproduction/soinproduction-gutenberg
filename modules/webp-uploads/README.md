# SP WebP Uploads — Gutenberg theme module

Adapted from Alexandra's PHP kit module v2.3.0. This copy is self-contained: it does not load the PHP kit or ACF.

## Responsibilities

- `bootstrap.php`, `class-module.php`, `configuration.php`: boot, hooks, options and module state.
- `conversion.php`: upload MIME checks, collision-safe filenames, conversion, resizing, transparency and animation checks.
- `attachments.php`: existing attachment conversion and replacement while keeping its ID.
- `references.php`: old → WebP URL maps and safe string/serialized-value replacement.
- `gutenberg.php`: typed attachment IDs in native blocks, Universal Media, nested fields and `__media` maps.
- `unused.php`: conservative database and filesystem usage detection.
- `ajax.php`: nonce/capability checks and bounded maintenance batches.
- `admin.php`, `views/page.php`, `assets/`: admin integration, markup, CSS and JavaScript.

Theme wiring is in `inc/integrations/webp-uploads.php`. The UI is **Media → Uploads WebP** (`upload.php?page=sp-uploads-webp-convert`). `npm run build:editor` publishes only the static assets to `build/webp-uploads`; PHP sources and frontend environment files remain private.

## Defaults and workflow

New JPEG/PNG/static GIF uploads convert to WebP. Quality 90; maximum side 2560 px; animated GIFs are skipped. WebP, SVG, AVIF and video pass through unchanged. The accepted original upload remains usable if optimization fails. Originals are retained by default (`delete_original=0`). Attachment metadata and generated sizes are managed by WordPress.

Existing media is changed only through the explicit maintenance buttons. Progress survives reload but is paused until the user starts/resumes processing. Conversion does not silently rewrite all site content. ID-bound fields resolve the current attachment URL automatically. The separate URL replacement operation updates saved content/excerpts/postmeta; options/custom tables/code/CDN caches are outside its write scope.

The unused finder checks Gutenberg references before the generic ID/path/URL/DB/filesystem scan. Errors keep files conservatively. Findings require review; deletion is permanent and rechecks references. Keep a recoverable database/uploads backup before bulk conversion, URL replacement, replacement-in-place or deletion. No maintenance operation is started by installing/booting this module.

## Integration in another theme

Load `bootstrap.php` once. Supply `sp_webp_assets_url` with the public URL of the three built asset files. To allow replacement SVGs, supply `sp_webp_valid_replacement_svg` with the theme's strict SVG validator; the default rejects replacement SVGs. This theme uses its existing `valid_logo_svg` validator.

Attachment replacement controls are also loaded in Gutenberg's media modal. Paths are resolved with `realpath` and confined to uploads. Fake `.webp` files do not receive a WebP MIME exemption. Ajax maintenance requires both a nonce and `manage_options`; single-file replacement requires upload/edit permissions for that attachment.

## Verification

`wp eval-file wp-content/themes/complex-studio/frontend/tests/webp-uploads.php` runs 19 checks on newly generated temporary files and records, then restores settings and removes fixtures. It covers real upload conversion, transparency, resizing, attachment identity, Gutenberg/field-map references, URL maps, SVG policy, upload path confinement and capability checks. Existing media is not modified.
