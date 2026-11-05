#!/usr/bin/env node
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {prepareProject} from './prepare-project.mjs';
const command=process.argv[2]??'help';
const input=process.argv.slice(3),args=[];
let root=process.cwd();
for(let i=0;i<input.length;i++){
 if(input[i]==='--project'){if(!input[i+1])throw new Error('--project needs a path');root=input[++i];}
 else if(input[i].startsWith('--project='))root=input[i].slice(10);
 else args.push(input[i]);
}
root=path.resolve(root);
const noBuild=args.includes('--no-build');
const positional=args.filter(value=>!value.startsWith('--'));
if(command==='prepare'){
 const result=prepareProject(root,{force:args.includes('--force')});
 console.log(`Prepared kit ${result.version} in ${result.directory}`);
}else if(command==='dev'||command==='start'){
 const {runDev,runStart}=await import('./dev.mjs');
 await (command==='dev'?runDev:runStart)({root,args});
}else if(['build:editor','build:wordpress','build:booking'].includes(command)){
 prepareProject(root);process.chdir(root);
 await import(pathToFileURL(path.join(root,'kit/tooling/'+command.replace(':','-')+'.mjs')).href);
}else if(command==='create'||['create:component','create:section','create:layout'].includes(command)){
 prepareProject(root);
 const kind=command==='create'?positional[0]:command.split(':')[1];
 const slug=command==='create'?positional[1]:positional[0];
 const {createModule}=await import('./create-module.mjs');
 const result=createModule(root,kind,slug,{build:!noBuild});console.log(`Created ${result.name}\n${result.directory}`);
}else if(command==='new:section'||(command==='new'&&positional[0]==='section')){
 prepareProject(root);
 const {createSection}=await import('./create-section.mjs');
 const result=createSection(root,command==='new'?positional[1]:positional[0]);console.log(`Created ${result.name}\n${result.directory}`);
}else if(command==='render'||command==='render:module'){
 prepareProject(root);
 const {renderModule}=await import('./render-module.mjs');
 const output=renderModule(root,positional[0],{build:!noBuild,force:args.includes('--force'),stdout:args.includes('--stdout')});
 console.log(output);
}else{
 console.log(`Usage: soinproduction-kit COMMAND [--project PATH]\n\n  prepare [--force]\n  dev [Next options]                 Dynamic port and optional editor watcher\n  start [Next options]               Dynamic production port\n  create component NAME [--no-build]\n  create section NAME [--no-build]   Schema-based block\n  create layout NAME [--no-build]\n  new section NAME                  Declarative kit section\n  render NAME [--stdout|--force] [--no-build]\n  build:editor | build:wordpress | build:booking`);
 if(command!=='help')process.exitCode=1;
}
