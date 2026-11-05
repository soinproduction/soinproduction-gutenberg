# soinproduction-gutenberg

Portable React / WordPress components with their field engine, editors, PHP rendering, administration UI and module assets.

```sh
npm install soinproduction-gutenberg react react-dom
```

```tsx
import {Background, Heading, Section} from 'soinproduction-gutenberg';
```

The npm package includes compiled ESM, TypeScript declarations, source templates, PHP, CSS and browser/admin assets. React and React DOM are peers. Next is an optional peer used only by the Next adapter.

## WordPress project preparation

The host owns its theme tokens, authored sections/layouts, CMS data, endpoint configuration and secrets. Kit owns reusable component functionality.

For the existing declarative theme architecture, add this to the frontend's `package.json`:

```json
{"scripts":{"kit:prepare":"soinproduction-kit prepare"}}
```

Run preparation before the editor/site builds. This materializes an npm-managed `kit/` source tree from the installed version and generates the project's connections there. It does not modify `node_modules`. Subsequent preparations refresh the managed source from the installed package, so change reusable code in this repository rather than in the generated copy.

An existing hand-maintained `kit/` is never overwritten. Move it aside when migrating to the npm dependency.

The host supplies:

- `config/breakpoints.json`: `breakpoints`, `media.columns` and `layoutIgnore`.
- `kit.config.json`: enabled global modules and editor settings.
- `src/sections/section-*/section.tsx` and `section.json`: authored sections.
- Existing project content renderer and editor integration points when using legacy blocks.

Example `kit.config.json`:

```json
{
  "modules": ["forms", "icons", "video-posters"],
  "editor": {"entry":"src/site/editor/index.tsx","stylesheet":"app/globals.css"},
  "wordpress": {"entry":"src/wordpress.tsx"}
}
```

Point the host TypeScript aliases `@kit` and `@kit/*` to `kit/index.tsx` and `kit/*`; `@ui/*` to `kit/ui/*`; and `@forms/*` to `kit/modules/forms/frontend/*` where existing host code uses them. The generated source itself uses relative imports. Compile authored portable sections through the root `@kit` import so the WordPress compiler can substitute its markers.

Load `kit/bootstrap.php` once from the WordPress theme and supply module settings through host integration files. Deploy the managed kit's PHP and published assets along with the theme. Node is needed for preparation/building, not PHP request rendering.

## Automatic connections

Static imports/re-exports identify components. Each component's `manifest.json` describes transitive component dependencies, editor controls, PHP, styles, modules and assets. Preparation regenerates frontend/editor/PHP block registries and component connection files. Removing usage removes stale generated connections. No per-component project registry edits are needed.

New primitive kinds still need matching WordPress compiler/interpreter support; automatic discovery does not invent server rendering behavior.

## Structure

- `components/`: component-specific rendering, editing, metadata and server code.
- `core/`: fields, content, media, shared controls and utilities.
- `ui/`, `admin-ui/`: shared controls and administration design system.
- `modules/`: Forms, Booking, Icons, WebP Uploads, Video Posters and modal contexts.
- `adapters/`: WordPress and Next integration.
- `tooling/`: discovery, preparation, builds and generators.
- `generated/responsive.ts`: default responsive values for direct ESM use; host preparation replaces these with host values in the managed copy.

## Development and releases

```sh
npm ci
npm run check
npm pack --dry-run
```

CI checks types, isolated component-connection tests, package exports, PHP syntax and packaging. Push a matching `vX.Y.Z` tag to publish version `X.Y.Z` automatically. See [RELEASING.md](RELEASING.md) for one-time npm trusted-publisher setup.

Source is published without an open-source license grant (`UNLICENSED`).
