import {syncKit} from './sync-kit.mjs';
import fs from 'node:fs';
import {gzipSync} from 'node:zlib';
import path from 'node:path';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
import postcss from 'postcss';
import tailwind from '@tailwindcss/postcss';
import breakpoints from './breakpoints.cjs';
import remDimensions from './rem-css.cjs';
import {syncSections} from './sync-sections.mjs';
syncSections();
syncKit();
const output=path.resolve('../build/wordpress');fs.mkdirSync(output,{recursive:true});
const compiled=await build({stdin:{contents:"export {sections} from './src/sections/index.generated';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',write:false,jsx:'automatic',tsconfig:'tsconfig.json',alias:{'@kit':path.resolve('kit/adapters/wordpress/blueprint.ts')}});
const m={exports:{}};new Function('module','exports','require',compiled.outputFiles[0].text)(m,m.exports,createRequire(import.meta.url));
fs.writeFileSync(path.join(output,'sections.json'),JSON.stringify({version:1,sections:m.exports.sections},null,2)+'\n');
const result=await build({entryPoints:['src/wordpress.tsx'],outdir:output,entryNames:'runtime',bundle:true,platform:'browser',format:'esm',splitting:true,chunkNames:'chunks/[name]-[hash]',jsx:'automatic',minify:true,tsconfig:'tsconfig.json',loader:{'.css':'empty'},alias:{'next/navigation':path.resolve('kit/adapters/wordpress/router.tsx')},define:{'process.env.NODE_ENV':'"production"'},metafile:true,plugins:[{name:'defer-legacy-components',setup(builder){
 builder.onLoad({filter:/src\/blocks\/registry\.ts$/},async(args)=>{
  let source=fs.readFileSync(args.path,'utf8');
  source=source.replace(/import \{ Component as (\w+) \} from '([^']+)';/g,(original,name,file)=>{
   if(file.includes('/layout/header/')||file.includes('/layout/footer/'))return original;
   return `const ${name}Deferred = lazy(() => import('${file}').then(module => ({default:module.Component}))); const ${name} = (props:any) => <Suspense fallback={null}><${name}Deferred {...props}/></Suspense>;`;
  });
  return {contents:`import {lazy,Suspense} from 'react';\n${source}`,loader:'tsx',resolveDir:path.dirname(args.path)};
 });
}}]});
if(Object.keys(result.metafile.inputs).some(file=>/next\/(dist|server)/.test(file)))throw new Error('WordPress runtime must not bundle Next.js');
const css=await postcss([breakpoints(),tailwind({optimize:true}),remDimensions()]).process(fs.readFileSync('app/globals.css','utf8'),{from:path.resolve('app/globals.css')});
fs.copyFileSync('kit/adapters/wordpress/assets.htaccess',path.join(output,'.htaccess'));
fs.cpSync('node_modules/leaflet/dist/images',path.join(output,'images'),{recursive:true});
fs.writeFileSync(path.join(output,'site.css'),css.css.replaceAll('../node_modules/leaflet/dist/images/', './images/'));
const criticalClasses=new Set(['site-wordpress-section','site-wordpress-static','site-header-service-chevron','site-header-services-trigger','site-header-actions','site-actions','site-button-label','site-button-icon-after','site-button-icon-before','btn-primary','btn-ghost']);
function collectClasses(nodes){for(const node of nodes){for(const key of ['className','frontClassName'])for(const token of String(node.props?.[key]??'').split(/\s+/))if(token)criticalClasses.add(token);collectClasses(node.children??[]);}}
for(const section of m.exports.sections)collectClasses(section.template);
for(const file of ['src/blocks/layout/header/component.tsx','kit/core/ui/button.tsx']){
 const source=fs.readFileSync(file,'utf8');
 for(const match of source.matchAll(/(?:className=)?["']([^"'\n]+)["']/g))for(const token of match[1].split(/\s+/))if(token)criticalClasses.add(token);
}
const critical=postcss.parse(css.css);
critical.walkRules(rule=>{
 if(rule.parent?.type==='atrule'&&/keyframes$/.test(rule.parent.name))return;
 const selector=rule.selector.replace(/\\(.)/g,'$1');
 if(selector.includes('.')&&![...criticalClasses].some(token=>selector.includes('.'+token)))rule.remove();
});
fs.writeFileSync(path.join(output,'critical.css'),critical.toString());

const entries=result.metafile.outputs;
const entry=Object.keys(entries).find(key=>entries[key].entryPoint==='src/wordpress.tsx');
const initial=new Set();
function include(file){if(initial.has(file))return;initial.add(file);for(const item of entries[file].imports)if(item.kind!=='dynamic-import'&&entries[item.path])include(item.path);}
include(entry);
fs.writeFileSync(path.join(output,'runtime-manifest.json'),JSON.stringify({imports:[...initial].filter(file=>file!==entry).map(file=>path.relative(output,path.resolve(file)))}));
fs.mkdirSync('build',{recursive:true});
fs.writeFileSync('build/wordpress-bundle-meta.json',JSON.stringify(result.metafile));
fs.copyFileSync('kit/adapters/wordpress/assets.php',path.join(output,'assets.php'));
for(const file of [...Object.keys(result.metafile.outputs),'../build/wordpress/site.css'])if(/\.(js|css)$/.test(file))fs.writeFileSync(file+'.gz',gzipSync(fs.readFileSync(file),{level:9}));
console.log(`WordPress: ${m.exports.sections.length} portable sections, PHP blueprint and browser JS/CSS built (no server Node required).`);
