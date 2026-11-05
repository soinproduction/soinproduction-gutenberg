import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {syncSections} from './sync-sections.mjs';
import {syncKit} from './sync-kit.mjs';
import {normalizeSourceImports} from './materialize-source.mjs';
export const packageRoot=path.resolve(fileURLToPath(new URL('..',import.meta.url)));
const hasFiles=folder=>fs.readdirSync(folder,{withFileTypes:true}).some(entry=>entry.isDirectory()?hasFiles(path.join(folder,entry.name)):true);

/** Keep watched source files stable; only refresh the source copy when the installed version changes. */
export function prepareProject(project=process.cwd(),{force=false}={}){
 const root=path.resolve(project),destination=path.join(root,'kit'),markerFile=path.join(destination,'.kit-package.json');
 const metadata=JSON.parse(fs.readFileSync(path.join(packageRoot,'package.json'),'utf8'));
 let marker;try{marker=JSON.parse(fs.readFileSync(markerFile,'utf8'));}catch{}
 const required=['index.tsx','core/fields/render.tsx','editor/seo.ts','tooling/sync-sections.mjs','tooling/sync-kit.mjs'];
 const reusable=!force&&marker?.name===metadata.name&&marker?.version===metadata.version&&required.every(file=>fs.existsSync(path.join(destination,file)));
 if(!reusable&&destination!==packageRoot){
  if(fs.existsSync(destination)&&!marker&&hasFiles(destination))throw new Error('kit/ is authored source. Move it aside before preparing the npm-managed kit copy.');
  fs.mkdirSync(destination,{recursive:true});
  const folders=['components','editor','core','ui','admin-ui','modules','adapters','hooks','styles','schema','shared','tooling'];
  for(const folder of folders){fs.rmSync(path.join(destination,folder),{recursive:true,force:true});fs.cpSync(path.join(packageRoot,folder),path.join(destination,folder),{recursive:true});}
  for(const file of ['index.tsx','bootstrap.php'])fs.copyFileSync(path.join(packageRoot,file),path.join(destination,file));
  normalizeSourceImports(destination);
  fs.writeFileSync(markerFile,JSON.stringify({name:metadata.name,version:metadata.version},null,2)+'\n');
 }
 syncSections(root);syncKit(root,{directory:destination});
 return {root,directory:destination,version:metadata.version,refreshed:!reusable};
}
