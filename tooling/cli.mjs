#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {syncSections} from './sync-sections.mjs';
import {syncKit} from './sync-kit.mjs';
const source=path.resolve(fileURLToPath(new URL('..',import.meta.url)));
const command=process.argv[2]??'help';
const args=process.argv.slice(3);
const project=path.resolve(args.includes('--project')?args[args.indexOf('--project')+1]:process.cwd());
if(command==='prepare'){
 const destination=path.join(project,'kit');
 const marker=path.join(destination,'.kit-package.json');
 if(destination!==source){
  if(fs.existsSync(destination)&&!fs.existsSync(marker))throw new Error('kit/ is authored source. Move it aside before preparing the npm-managed kit copy.');
  const folders=['components','core','ui','admin-ui','modules','adapters','hooks','styles','schema','shared','tooling'];
  fs.mkdirSync(destination,{recursive:true});
  for(const folder of folders){fs.rmSync(path.join(destination,folder),{recursive:true,force:true});fs.cpSync(path.join(source,folder),path.join(destination,folder),{recursive:true});}
  for(const file of ['index.tsx','bootstrap.php'])fs.copyFileSync(path.join(source,file),path.join(destination,file));
  const meta=JSON.parse(fs.readFileSync(path.join(source,'package.json'),'utf8'));
  fs.writeFileSync(marker,JSON.stringify({name:meta.name,version:meta.version},null,2)+'\n');
 }
 syncSections(project);
 syncKit(project,{directory:destination});
 console.log('Prepared component/editor/PHP/style connections in '+destination);
}else{
 console.log('Usage: soinproduction-kit prepare [--project PATH]\nCreates an npm-managed local kit source copy and regenerates host connections. See README.md for the host configuration.');
 if(command!=='help')process.exitCode=1;
}
