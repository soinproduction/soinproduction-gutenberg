import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import {fileURLToPath} from 'node:url';

const kitRoot=path.resolve(fileURLToPath(new URL('..',import.meta.url)));
const write=(file,text)=>{fs.mkdirSync(path.dirname(file),{recursive:true});if(!fs.existsSync(file)||fs.readFileSync(file,'utf8')!==text)fs.writeFileSync(file,text);};
const relative=(from,to)=>{const value=path.relative(from,to).replaceAll(path.sep,'/');return value.startsWith('.')?value:'./'+value;};
const files=directory=>fs.existsSync(directory)?fs.readdirSync(directory,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name)).flatMap(entry=>entry.isDirectory()?files(path.join(directory,entry.name)):[path.join(directory,entry.name)]):[];

/** Follow actual imports, including named barrel exports, without activating every kit export. */
export function discoverComponents(root,entries,{directory=kitRoot}={}) {
 const config=ts.readConfigFile(path.join(root,'tsconfig.json'),ts.sys.readFile).config;
 const options=ts.parseJsonConfigFileContent(config,ts.sys,root).options;
 const manifests=new Map(files(path.join(directory,'components')).filter(file=>file.endsWith('/manifest.json')).map(file=>[path.dirname(file),JSON.parse(fs.readFileSync(file,'utf8'))]));
 const active=new Set(),visited=new Set();
 function visit(file,selected){
  const key=file+':'+(selected?.join(',')??'*');if(visited.has(key))return;visited.add(key);
  for(const [folder,manifest]of manifests)if(file.startsWith(folder+path.sep))active.add(manifest.id);
  if(!/\.[cm]?[jt]sx?$/.test(file))return;
  const source=ts.createSourceFile(file,fs.readFileSync(file,'utf8'),ts.ScriptTarget.Latest,true);
  const resolve=(specifier,names)=>{const resolved=ts.resolveModuleName(specifier,file,options,ts.sys).resolvedModule?.resolvedFileName;if(resolved&&!resolved.includes('/node_modules/'))visit(resolved,names);};
  for(const statement of source.statements){
   if(ts.isImportDeclaration(statement)&&!statement.importClause?.isTypeOnly){
    const bindings=statement.importClause?.namedBindings;
    const names=bindings&&ts.isNamedImports(bindings)?bindings.elements.filter(item=>!item.isTypeOnly).map(item=>item.propertyName?.text??item.name.text):undefined;
    resolve(statement.moduleSpecifier.text,names);
   }
   if(ts.isExportDeclaration(statement)&&statement.moduleSpecifier&&!statement.isTypeOnly){
    const bindings=statement.exportClause;
    if(selected&&bindings&&ts.isNamedExports(bindings)&&!bindings.elements.some(item=>selected.includes(item.name.text)))continue;
    const names=bindings&&ts.isNamedExports(bindings)?bindings.elements.filter(item=>!selected||selected.includes(item.name.text)).map(item=>item.propertyName?.text??item.name.text):undefined;
    resolve(statement.moduleSpecifier.text,names);
   }
  }
 }
 entries.forEach(file=>visit(path.resolve(root,file)));
 const byId=new Map([...manifests.values()].map(item=>[item.id,item]));
 const expand=id=>{const item=byId.get(id);if(!item)throw new Error(`Unknown kit component: ${id}`);for(const dependency of item.dependencies??[])if(!active.has(dependency)){active.add(dependency);expand(dependency);}};
 [...active].forEach(expand);
 return [...active].sort().map(id=>byId.get(id));
}

/** Components own the connection metadata; the project never maintains a component registry. */
export function syncKit(root=process.cwd(),{directory=kitRoot}={}) {
 const config=JSON.parse(fs.readFileSync(path.join(root,'config/breakpoints.json'),'utf8'));
 const responsive=`export const BREAKPOINTS=${JSON.stringify(config.breakpoints)} as const;\nexport const COLUMN_BREAKPOINT=${JSON.stringify(config.media.columns)};\nexport const LAYOUT_BREAKPOINTS:readonly string[]=${JSON.stringify(Object.keys(config.breakpoints).filter(name=>!config.layoutIgnore.includes(name)))};\n`;
 write(path.join(directory,'generated/responsive.ts'),responsive);
 const entries=files(path.join(root,'src')).filter(file=>/\.[jt]sx?$/.test(file)&&!/(?:registry|generated)\./.test(path.basename(file)));
 const components=discoverComponents(root,entries,{directory});
 const generated=path.join(directory,'generated');
 const editorImports=[],editorEntries=[],php=new Set(),styles=new Set(),assets=[];
 const moduleIds=new Set(JSON.parse(fs.readFileSync(path.join(root,'kit.config.json'),'utf8')).modules??[]);
 for(const item of components){
  const folder=path.join(directory,'components',item.id);
  for(const control of item.controls??[]){
   const name=`control${editorEntries.length}`;
   editorImports.push(`import { ${control.export} as ${name} } from '${relative(generated,path.join(folder,control.file)).replace(/\.tsx?$/,'')}';`);
   editorEntries.push(`${JSON.stringify(control.name)}: ${name}`);
  }
  for(const module of item.modules??[])moduleIds.add(module);
  for(const file of item.styles??[])styles.add(relative(generated,path.resolve(folder,file)));
  for(const asset of item.assets??[])assets.push({...asset,source:relative(directory,path.resolve(folder,asset.source))});
  for(const file of item.php??[])php.add(relative(directory,path.resolve(folder,file)));
 }
 write(path.join(generated,'editor.ts'),`${editorImports.join('\n')}\nexport const componentControls: Record<string, import('react').ComponentType<any>> = {${editorEntries.join(',')}};\n`);
 const modulePhp=[];
 for(const id of [...moduleIds].sort()){
  if(!/^[a-z][a-z0-9-]*$/.test(id))throw new Error(`Invalid kit module: ${id}`);
  const folder=path.join(directory,'modules',id);
  const module=JSON.parse(fs.readFileSync(path.join(folder,'manifest.json'),'utf8'));
  for(const file of module.php??[])modulePhp.push(relative(directory,path.resolve(folder,file)));
  for(const asset of module.assets??[])assets.push({...asset,source:relative(directory,path.resolve(folder,asset.source))});
 }
 for(const file of [...php,...modulePhp])if(!fs.existsSync(path.resolve(directory,file)))throw new Error(`Missing kit PHP dependency: ${file}`);
 write(path.join(generated,'modules.php'),`<?php\n// Generated by kit. Do not edit.\nreturn ${JSON.stringify(modulePhp)};\n`);
 write(path.join(generated,'styles.css'),`/* Generated from component manifests. */\n${[...styles].sort().map(file=>`@import "${file}";`).join('\n')}\n`);
 const connections={version:1,components:components.map(item=>item.id),modules:[...moduleIds].sort(),assets,php:[...php].sort()};
 write(path.join(generated,'connections.json'),JSON.stringify(connections,null,2)+'\n');
 write(path.join(generated,'connections.php'),`<?php\n// Generated by kit/tooling/sync-kit.mjs. Do not edit.\nreturn ${JSON.stringify(connections.php).replace(/^\[/,'[').replace(/\]$/,']')};\n`);
 return connections;
}

/** Publish declared assets; adding an asset-owning component needs no build-script edit. */
export function publishKitAssets(root=process.cwd(),output=path.resolve(root,'../build'),{directory=kitRoot}={}) {
 const manifest=JSON.parse(fs.readFileSync(path.join(directory,'generated/connections.json'),'utf8'));
 for(const asset of manifest.assets??[]){
  const source=path.resolve(directory,asset.source),destination=path.resolve(output,asset.output);
  if(!source.startsWith(path.resolve(directory)+path.sep)||!destination.startsWith(path.resolve(output)+path.sep))throw new Error('Kit asset path escapes its root');
  fs.mkdirSync(path.dirname(destination),{recursive:true});fs.cpSync(source,destination,{recursive:true});
 }
}
