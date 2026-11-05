import {syncKit,publishKitAssets} from './sync-kit.mjs';
import { build } from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import postcss from 'postcss';
import tailwind from '@tailwindcss/postcss';
import breakpoints from './breakpoints.cjs';
import remDimensions from './rem-css.cjs';
import { scopeEditorSelector } from './editor-css.mjs';
import { syncSections } from './sync-sections.mjs';
import * as react from 'react';
import * as reactDom from 'react-dom';
syncSections();
syncKit();
const config=JSON.parse(fs.readFileSync('kit.config.json','utf8'));
const output = '../build';
fs.mkdirSync(output, { recursive: true });
const wpReact = {
  name: 'wordpress-react',
  setup(b) {
    b.onResolve({ filter: /^react(?:-dom)?(?:\/jsx-runtime)?$/ }, (args) => ({
      path: args.path,
      namespace: 'wp-react',
    }));
    b.onLoad({ filter: /.*/, namespace: 'wp-react' }, (args) => {
      if (args.path === 'react/jsx-runtime')
        return {
          contents:
            'export const Fragment=window.wp.element.Fragment; export function jsx(type,props,key){return window.wp.element.createElement(type,{...props,key});} export const jsxs=jsx;',
          loader: 'js',
        };
      const keys = Object.keys(args.path === 'react' ? react : reactDom).filter(
        (k) => k !== 'default' && k !== '__esModule' && /^[A-Za-z_$][\w$]*$/.test(k)
      );
      return {
        contents:
          'const source=window.wp.element; export default source;\n' +
          keys.map((k) => `export const ${k}=source[${JSON.stringify(k)}];`).join('\n'),
        loader: 'js',
      };
    });
    b.onResolve({ filter: /next\/navigation/ }, () => ({
      path: path.resolve('kit/adapters/wordpress/editor-router.tsx'),
    }));
    b.onResolve({ filter: /^@kit\/adapters\/next\/router$/ }, () => ({
      path: path.resolve('kit/adapters/wordpress/editor-router.tsx'),
    }));
  },
};
await build({
  entryPoints: [config.editor.entry],
  outfile: output + '/editor.js',
  bundle: true,
  format: 'iife',
  platform: 'browser',
  jsx: 'automatic',
  minify: true,
  tsconfig: 'tsconfig.json',
  define: { 'process.env.NODE_ENV': '"production"' },
  plugins: [wpReact],
  loader: { '.css': 'empty' },
});
// Isolate content CSS from the admin controls, including the reset and theme variables.
const css = fs.readFileSync('app/globals.css', 'utf8');
const result = await postcss([breakpoints(), tailwind(), remDimensions()]).process(css, { from: path.resolve('app/globals.css') });
const tree = postcss.parse(result.css);
// WordPress block wrappers use unlayered rules. Keep our scoped utilities at the
// same cascade level so absolute positioning and original spacing still work.
tree.walkAtRules('layer', (rule) => {
  if (rule.nodes) rule.replaceWith(...rule.nodes);
  else rule.remove();
});
tree.walkRules((rule) => {
  let parent = rule.parent;
  while (parent) {
    if (parent.type === 'atrule' && /keyframes$/.test(parent.name)) return;
    parent = parent.parent;
  }
  if (rule.selectors.includes('html')) rule.walkDecls('font-size', decl => decl.remove());
  rule.selectors = rule.selectors.map(scopeEditorSelector);
});
fs.writeFileSync(
  output + '/content.css',
  '/* Generated: shared site styles scoped to the Gutenberg canvas. Source: frontend/app/globals.css. Do not edit. */\n' +
  'html:has(> body.block-editor-iframe__body) { font-size: 62.5%; }\n' +
  (config.editor.fontImport ? '@import url('+JSON.stringify(config.editor.fontImport)+');\n' : '') +
    tree.toString()
);
fs.writeFileSync(
  output + '/editor.css',
  '/* Generated: Gutenberg controls and editor-only layout. Sources: frontend/kit/core/editor, frontend/src/site/editor and frontend/modules. Do not edit. */\n' +
  fs.readFileSync('kit/admin-ui/tokens.css', 'utf8') + '\n' +
  fs.readFileSync('kit/ui/forms.css', 'utf8') + '\n' +
  fs.readFileSync('kit/ui/forms-admin.css', 'utf8') + '\n' +
  fs.readFileSync('kit/core/editor/styles.css', 'utf8') +
    '\n' +
    fs.readFileSync('src/site/editor/styles.css', 'utf8') +
    '\n' +
    fs.readFileSync('kit/modules/forms/frontend/editor.css', 'utf8') +
    '\n' +
    fs.readFileSync('kit/core/media/universal/editor.css', 'utf8') +
    '\n' + fs.readFileSync('kit/admin-ui/editor.css', 'utf8')
);
for (const name of ['tokens.css', 'admin.css']) {
  fs.mkdirSync(output + '/admin-ui', { recursive: true });
  fs.copyFileSync('kit/admin-ui/' + name, output + '/admin-ui/' + name);
}
publishKitAssets(process.cwd(),path.resolve(output));
fs.cpSync('public/assets', '../assets', { recursive: true });
console.log('Gutenberg bundle and scoped Tailwind styles built.');

// Preview images are authored beside sections; no CMS instance is required to display them.
fs.rmSync(output + '/previews', { recursive: true, force: true });
for (const group of ['sections', 'elements', 'layout']) {
  for (const entry of fs.readdirSync('src/blocks/' + group, { withFileTypes: true })) {
    const source = 'src/blocks/' + group + '/' + entry.name + '/preview.svg';
    if (!entry.isDirectory() || !fs.existsSync(source)) continue;
    fs.mkdirSync(output + '/previews/' + group, { recursive: true });
    fs.copyFileSync(source, output + '/previews/' + group + '/' + entry.name + '.svg');
  }
}

await import('./build-booking.mjs');

// Kit sections keep their authored raster preview beside section.tsx.
for (const entry of fs.readdirSync('src/sections', { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  for (const extension of ['webp', 'png', 'jpg', 'jpeg', 'svg']) {
    const source = `src/sections/${entry.name}/preview.${extension}`;
    if (!fs.existsSync(source)) continue;
    fs.mkdirSync(output + '/previews/sections', { recursive: true });
    fs.copyFileSync(source, `${output}/previews/sections/${entry.name}.${extension}`);
  }
}

// Editor-only CSS uses the same named media queries as authored content.
const editorCssPath=output+'/editor.css';
const editorCss=await postcss([breakpoints()]).process(fs.readFileSync(editorCssPath,'utf8'),{from:path.resolve(editorCssPath)});
fs.writeFileSync(editorCssPath,editorCss.css);
