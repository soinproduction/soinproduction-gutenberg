# Gutenberg Kit documentation

The Russian component reference and pattern guide are a React/Vite application. The documentation shell has its own styles; interactive examples import the actual Kit components from this checkout in an isolated iframe.

## Local development

```sh
npm ci --ignore-scripts
cd docs
npm ci
npm run dev
```

`npm run build` produces `docs/dist`. `npm run preview` serves that production build. GitHub Actions publishes it to GitHub Pages when documentation changes reach `main`; CI also builds documentation on pull requests.

After a build, `npx playwright install chromium` and `npm run test:previews` check all 39 component examples at 1920, 400 and 320 px, plus interactive states and the form's isolated transport. CI runs these checks. To use an existing Chrome installation locally, set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` to its executable.

## Content

- `catalog.js`: categories, component descriptions, syntax, relationships and prop-table assembly.
- `props.js`: extracted JSX signatures.
- `settings.js`: editor settings and explanations.
- `usage.js`: usage scenarios.
- `pattern.jsx`: the component-pattern guide; its full technical reference remains `PATTERN.md`.

Existing `#Component` and `#Component-section` links are preserved. Search indexes names, descriptions, field types and props, with a category filter. `/`, `Cmd+K` and `Ctrl+K` open search; arrows and Enter select a result, Escape dismisses it.

## Interface

`components.jsx` contains the shared shell, catalog, search, buttons, breadcrumbs, code snippets, outline and footer. `reference.css` owns the documentation tokens and responsive layouts. See `DESIGN.md` for their relationship to the SoinLAB system.

The overview previews show the structure described by the adjacent JSX. They are illustrative HTML, not a mounted WordPress editor or live Kit runtime.

Every component reference also has a live example next to its JSX and data. `previews/examples.jsx` builds both the mounted tree and serialized JSX; `previews/options.js` defines the controls. `preview.html` runs the actual source components with `ContentProvider` and `FieldScope`. `previews/runtime.css` supplies the SoinLAB host theme, isolated from the documentation shell. The `demo-*` classes belong to these examples, not the Kit API. Editor-only components are explicitly demonstrated in context rather than presented as a working WordPress editor.

`module-info.js` identifies `Form` as part of the optional **forms** module and `PricingPlans` as part of **booking**. The docs show both enabled and unavailable states without changing a project's configuration. The form demo intercepts only its local `__preview/forms/` transport inside the iframe; success/error responses are simulated and nothing is submitted or persisted. Links are also intercepted inside examples. All fixtures are illustrative.

`public/previews/architecture.png` and `lamp.png` reuse the owner's approved SoinLAB concept assets (`work-imgArchitecture.png` and `work-imgCatalogueProduct.png`). They are unchanged and shared across examples.

No external font requests are needed. Fonts and OFL licenses live in `public/fonts`. The original SoinLAB symbol is in `public/soinlab-symbol.svg`; it was supplied through the owner's SoinLAB design assets. Lucide icons reuse the site's existing dependency.
