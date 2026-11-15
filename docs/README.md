# Gutenberg Kit documentation

The Russian component reference and pattern guide are a standalone React/Vite application. The component package itself is not used as a documentation-site UI dependency.

## Local development

```sh
cd docs
npm ci
npm run dev
```

`npm run build` produces `docs/dist`. `npm run preview` serves that production build. GitHub Actions publishes it to GitHub Pages when documentation changes reach `main`; CI also builds documentation on pull requests.

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

No external font requests are needed. Fonts and OFL licenses live in `public/fonts`. The original SoinLAB symbol is in `public/soinlab-symbol.svg`; it was supplied through the owner's SoinLAB design assets. Lucide icons reuse the site's existing dependency.
