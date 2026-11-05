# Administration design standard

User-approved reference: Media → Icons, 28 October 2026. Apply this visual language to every custom admin component in this theme and future reusable modules.

## Product language

- White surfaces, subtle cool-gray dividers, restrained blue accent. No gradients or ornamental shadows.
- Ink `#1e293b`, muted text `#68778c`, border `#e5eaf1`, accent `#3858e9`.
- Page headings 28px with a small uppercase context label and one concise explanation.
- Cards: 12px radius, 24–28px padding. Controls: 7px radius, 40px standard height, 32px compact height. Dialogs: 16px radius.
- Related toolbar actions have equal width and height. Icons page uses two 164 × 40px actions. Icon + text have 8px gap and 16px icon size.
- Search/filter controls above data. Collection navigation left; details/preview right when useful.
- Import and complex settings use focused dialogs with conditional fields. Destructive actions are quiet red secondary actions.
- English UI, visible keyboard focus, accessible names, responsive layouts, clear empty states. The website's authored content must retain its own design.

## Source ownership

`tokens.css` owns shared values. `admin.css` styles custom admin pages, tables, schedules/maps and entries. `editor.css` styles only our editor controls and dialogs, not authored site blocks. Existing modules keep layout rules and standalone fallback values; shared tokens supply the theme language.

`bootstrap.php` is reusable. Host filters `sp_admin_ui_assets_url` and `sp_admin_ui_screen` provide asset URLs and eligible screens. `page_header()` provides consistent settings-page headers. Build publishes the CSS into `build/admin-ui`, and appends editor controls to the Gutenberg UI bundle.

When adding a custom page, use `sp-ui-page`, `SpAdminUI\page_header()`, `sp-ui-card`, and `sp-ui-savebar`. Reuse tokens rather than introducing a second palette or new control measurements. Do not style generic WordPress or third-party plugin screens globally.

## Block editor

The block editor follows Gutenberg, not the page standard above: `editor.css` redefines the tokens for it (2px radius, `#e0e0e0` and `#949494` borders, `#1e1e1e` ink) and sidebar fields stay native. Custom admin pages keep the Icons design.

## Editor buttons

`editor.css` owns one editor button: 32px outline, 2px radius, 13px text, 16px Lucide icon, blue hover, quiet red for destructive actions. Render it with `EditorAction` from `src/core/ui/editor-action.tsx`. Related actions floating over content use transparent containers (`site-inline-tools`, `site-description-row-tools`, `site-button-tools`) with equal 28px borderless buttons; only individual buttons have a background. Modules set only the position of these buttons, never their look.

## Opt-in form controls

Import `enhanceControls` from `controls.js` and `controls.css`, then call
`enhanceControls(container)` after rendering a custom admin view or dialog.
It progressively enhances date/time fields and selects, and adds the shared custom
checkbox appearance. Named source inputs/selects remain the form submission source;
programmatic value changes should dispatch `change` to synchronise their triggers.

Menus use the browser popover top layer so they work inside modal dialogs. Date
pickers support month navigation and arrow keys; select/time menus support arrow,
Home/End and Escape keys. Time fields retain editable HH:MM input (whole hours when
`step=3600`). No site-specific configuration, dependencies or global input reset.
The booking module uses Russian UI at the user's explicit request.

Popover positions follow their anchors during page/dialog scrolling and resize; an offscreen anchor closes its popover. List scrolling remains independent. Time fields without an hourly step provide separate 24-hour and 00–59 minute columns plus a Done action, while `step=3600` retains whole-hour choices.

Floating card actions use `--site-card-tools-inset` (20px by default) from the top and right edges. Apply this consistently to list items, media/background controls and record controls. Text button tools and column-outline tools keep their own anchor positions.
