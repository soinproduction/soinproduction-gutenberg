# Icon library

Reusable WordPress module. No ACF, theme globals, font compiler, shell commands or external service.

## Admin workflow

Media → Icons → enter a set name, then:

- Import an IcoMoon ZIP containing `selection.json` (up to 10 MB). The module reads vector paths, never extracts or executes archive files, CSS, JavaScript or fonts.
- Choose SVGs from the native Media Library. Multiple selection and uploading new SVGs are available. SVGs must be static outlined vectors with a viewBox; convert text/strokes to paths when exporting. Unsupported references, scripts, styles and external resources are rejected.
- Use the same set name to replace an IcoMoon set or add more SVGs to a media set. Existing selections retain their namespaced IDs. Keep icon names when updating an archive.
- Remove collection removes it from the icon catalogue only, not the original Media Library files. Reimport under the same name to restore selections. Removed icons render empty rather than silently changing to a different icon.

In Gutenberg all existing icon pickers provide search and an Icon set filter. The existing Lucide collection is stored in the same CMS library and can be managed there. No bundled content-icon catalogue remains. Imported SVGs (including Font Awesome SVGs) and IcoMoon sets use the same picker, inherit text color, and work in buttons, eyebrows and the marquee. Native button icon position remains editable.

This is a monochrome SVG catalogue, **not a generated icon font**. It provides the same authoring workflow without requiring a font-generation service or server toolchain. Multicolor SVG paint is intentionally normalized to currentColor; use a regular image field for multicolor artwork.

## Structure / host integration

- `library.php`: pure SVG validation, IcoMoon parsing, attachment import, stable IDs and persistence.
- `admin.php`: capability/nonce-checked management UI and AJAX.
- `bootstrap.php`: module entry and public read-only `/sp-icons/v1/library` endpoint.
- `assets/`: standalone admin assets.

The host includes `bootstrap.php`, supplies the asset URL via `sp_icons_assets_url`, and publishes `assets/` into a public build directory. The host's SVG upload policy remains responsible for allowing safe SVG uploads. Management requires `manage_options`.

The library is stored in non-autoloaded `sp_icon_sets`. Host API passes `SpIcons\catalogue()` as `site.icons` through ContentProvider. React core consumes this data without importing WordPress endpoints or module PHP. Native Gutenberg button integrations pass the same library to `buttonIconStyle` and IconPicker.

New IDs: `custom:<set-key>:<icon-key>`. Each icon stores its permanent `value` in the library. Reimporting the same collection preserves existing values by icon name, including the original IDs of the transferred Lucide collection. IcoMoon names determine icon keys; SVG attachments use `media-<attachment-id>`. Unicode set names receive deterministic ASCII keys. Update by the same set name to preserve IDs.

Verification: `npm test`; `wp eval-file frontend/tests/icons.php` from the theme directory (with the local site's CLI connection configured). Integration tests use disposable fixtures and restore the original library.

The collection browser includes search, an icon detail preview, color testing, copy ID, per-icon removal and collection update/removal. Import runs in a separate dialog with ZIP and Media Library tabs.
