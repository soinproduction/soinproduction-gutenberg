import {syncSections} from './sync-sections.mjs';
import { groupForKind, listBlocks } from './block-paths.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { renderModule } from './render-module.mjs';

export function createModule(root, kind, slug, { build = true } = {}) {
  if (!Object.hasOwn(groupForKind, kind)) throw new Error('Use section, component or layout.');
  if (!/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(slug ?? ''))
    throw new Error('Use a lowercase name, for example benefits or quote-card.');
  const group = groupForKind[kind];
  const directory = path.join(root, 'src/blocks', group, slug);
  const existing = listBlocks(root);
  const collision = existing.some((block) => {
    const file = path.join(block.directory, 'register.php');
    return (
      fs.existsSync(file) &&
      new RegExp('[\'"]name[\'"]\\s*=>\\s*[\'"]site/' + slug + '[\'"]').test(
        fs.readFileSync(file, 'utf8')
      )
    );
  });
  if (collision)
    throw new Error(`Block site/${slug} is already registered; nothing was overwritten.`);
  if (existing.some((block) => block.slug === slug) || fs.existsSync(directory))
    throw new Error(`Module ${slug} already exists; nothing was overwritten.`);
  const title = slug
    .split('-')
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(' ');
  const name = `site/${slug}`;
  const files = {
    'schema.ts': `import {fields} from '@kit/core/fields/schema';
export const schema=fields()
 .addRichText('heading',{label:'Heading',tag:'h2'})
 .addWysiwyg('description',{label:'Description'})
 .addImage('image',{label:'Image'})
 .addContentArea('content',{allowedBlocks:['core/heading','core/paragraph','core/image','core/buttons','core/list','core/quote','core/group']})
 .build();
export const moduleInfo={name:'${name}',title:'${title}',kind:'${kind}',icon:'${
      kind === 'section' ? 'layout' : 'block-default'
    }',preview:'${group}/${slug}.svg'} satisfies import('@kit/core/modules/types').ModuleInfo;
`,
    'editor.tsx': `import {Component} from './component';
import {schema,moduleInfo} from './schema';
import {SchemaEditor} from '@kit/core/fields/editor';
import type {ModuleProps} from '@kit/core/modules/types';
export function Edit(props:ModuleProps&{onChange:(data:any)=>void}){return <SchemaEditor {...props} schema={schema} Component={Component} blockName={moduleInfo.name}/>;}
`,
    'register.php': `<?php
return ['id'=>'${slug}','group'=>'custom','name'=>'${name}','title'=>'${title}','kind'=>'${kind}','icon'=>'${
      kind === 'section' ? 'layout' : 'block-default'
    }','attributes'=>['data'=>['type'=>'object','default'=>new \\stdClass()]]];
`,
    'preview.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720"><rect width="1280" height="720" fill="#fafaf8"/><text x="64" y="140" font-family="sans-serif" font-size="48">${title}</text><rect x="64" y="200" width="700" height="18" fill="#d8d8d2"/><rect x="64" y="245" width="520" height="18" fill="#d8d8d2"/><rect x="64" y="350" width="300" height="240" fill="#e6e6e0"/><rect x="390" y="350" width="300" height="240" fill="#e6e6e0"/><rect x="716" y="350" width="300" height="240" fill="#e6e6e0"/></svg>`,
    'styles.css': `/* Shared by Next and Gutenberg. Put Tailwind layout classes in component.tsx. */
`,
  };

  const registry = path.join(root, 'src/blocks/registry.ts'),
    editor = path.join(root, 'src/blocks/editor-registry.ts'),
    css = path.join(root, 'app/globals.css');
  const original = new Map(
    [registry, editor, css].map((f) => [f, fs.existsSync(f)?fs.readFileSync(f, 'utf8'):null])
  );
  try {
    fs.mkdirSync(directory, { recursive: true });
    for (const [file, text] of Object.entries(files))
      fs.writeFileSync(path.join(directory, file), text);
    renderModule(root, slug, { build: false });
    syncSections(root);
    if (build) execFileSync(process.execPath, [path.join(root,'kit/tooling/build-editor.mjs')], { cwd: root, stdio: 'inherit' });
  } catch (error) {
    for (const [file, text] of original) {if(text===null)fs.rmSync(file,{force:true});else fs.writeFileSync(file,text);}
    fs.rmSync(directory, { recursive: true, force: true });
    throw error;
  }
  return { name, directory };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const result = createModule(
      process.cwd(),
      process.argv[2],
      process.argv[3]
    );
    console.log(
      `Created ${result.name}\n${result.directory}\nConnected to Gutenberg and Next. Edit component.tsx and styles.css, then refresh the editor.`
    );
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
