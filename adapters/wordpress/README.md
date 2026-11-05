# WordPress / PHP adapter

The approved declarative sections in `src/sections/index.generated.ts` are the source for both renderers. `npm run build:wordpress` compiles their JSX to `build/wordpress/sections.json`, builds browser React into `runtime.js`, and compiles shared site CSS. PHP interprets the blueprint with current CMS values on each request. Content changes do not require a rebuild; changes to components/styles do.

Node is required locally for building only. Deploy the theme PHP, its existing editor/module builds, and `build/wordpress/` (including `images/`). Keep the required WordPress plugins, uploads and database on the server. Never upload `.env*`, `node_modules`, or development credentials.

## Migration

Set `mode` to `next` or `wordpress` in the theme-root `render.config.json`. This is the sole renderer setting shared by PHP and the build scripts; there is no admin control or database option. `npm run dev` watches editor sources and starts Next in next mode, or rebuilds browser/PHP assets in wordpress mode. `npm run build` produces the selected target plus the editor. Restart dev after changing mode. In WordPress mode open the WordPress URL, not the Next port.

Legacy sections and the project header/footer still need migration: the PHP shell renders saved header/footer data through the legacy layout bridge, while new sections use the generated blueprint. Other legacy sections still require migration.

Supported sections: hero, marquee, studio introduction, services, gallery, and flexible content. Native WordPress SEO hooks (`wp_head`, `wp_footer`, language and body attributes) remain available. PHP supplies text, media and links before JavaScript. Browser React enhances interactive containers after a successful commit, using the same section components and shared interactions. Static declarative sections retain their server HTML; background video uses a small native enhancement. Header enhancement starts on navigation interaction and preserves the server logo node. If initial enhancement fails, the PHP fallback remains visible. This is progressive replacement, not React hydration.

PHP List applies saved item counts, loading mode and URL page state. Page links provide navigation without JavaScript; browser React enhances them with pagination/show-more/infinite scrolling. Gallery viewers, modal dialogs and dynamic filters require JavaScript.

## Extending the boilerplate

Use the declarative kit for new portable sections. Built-in HTML and the kit markers are serialized by `blueprint.ts`; callback props and unknown React components fail the build. Add a matching PHP primitive in `inc/rendering/renderer.php` when introducing a new kit node. Do not add a separate PHP template for each section.

`runtime.tsx` is the browser host adapter; `router.tsx` supplies browser navigation without a Next server. Modal and booking requests use WordPress REST directly. The forms adapter signs internal FormEngine requests server-side, retaining challenges and validation; signing secrets never enter the browser bundle.

Before rollout verify content parity, archives, SEO output, modal opening, booking availability, form submission and cache behavior on the target host. The current implementation is a migration foundation, not an automatic converter for arbitrary legacy React components.


## Automatic section discovery

Create a `src/sections/section-*` folder with `section.json` and `section.tsx`, exporting `section(meta, () => (...))` from `@kit`. `syncSections()` discovers it for both builds; PHP registration discovers the same metadata. WordPress dev watches these folders and regenerates the blueprint and browser bundle on edits. No PHP registry entry or second section template is required. Keep data-driven rendering inside kit primitives (List/Records/Drag/Show etc.); arbitrary callbacks or custom React-only components cannot execute on a PHP host and intentionally fail compilation.

The legacy header/footer bridge is in `inc/rendering/layouts.php`. It reads current CMS data on every request, including resolved menu references and modal buttons. Browser enhancement replaces the fallback after commit. The bridge exists for these old layout components only; new declarative sections never use this path.

## Loading and asset delivery

Deploy the entire generated `build/wordpress/` directory, including `chunks/`, `critical.css`, `runtime-manifest.json`, `assets.php`, images and precompressed `.gz` files. The runtime is an ES module with split chunks; booking/modal code loads on demand. Critical styles are generated from the shared stylesheet and blueprint classes and inlined; the full stylesheet loads asynchronously with a noscript fallback. Browser payloads include only referenced icons.

`assets.php/PATH` serves allowlisted generated assets with gzip negotiation and cache validators without bootstrapping WordPress. This requires PHP PATH_INFO support (verified locally on Apache); verify routing on the deployment host. The included `.htaccess` also supplies optional Apache compression/cache rules. Host/CDN configuration must be checked separately on Nginx-based managed hosting.

Background videos initially show an optimized WordPress poster. Automatic playback is suppressed on mobile, reduced-motion and data-saving connections; a play control remains available. Desktop playback follows the saved autoplay setting. Static-section classification is generated from supported primitives rather than section names.

Performance checks should use a production build, a logged-out browser and separate desktop/mobile profiles. Local HTTP affects Lighthouse Best Practices; deploy with HTTPS. Lighthouse scores are measurements of a particular run, not a guarantee for every device or host.
