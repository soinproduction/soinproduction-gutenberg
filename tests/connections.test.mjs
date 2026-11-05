import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {syncKit,publishKitAssets} from '../tooling/sync-kit.mjs';
function fixture(){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'kit-package-'));
 const put=(file,value)=>{fs.mkdirSync(path.dirname(path.join(root,file)),{recursive:true});fs.writeFileSync(path.join(root,file),typeof value==='string'?value:JSON.stringify(value));};
 put('tsconfig.json',{compilerOptions:{paths:{'@kit':['./kit/index.tsx'],'@kit/*':['./kit/*']}}});
 put('config/breakpoints.json',{breakpoints:{mobile:480,tablet:768},media:{columns:'tablet'},layoutIgnore:[]});put('kit.config.json',{modules:[]});
 put('kit/index.tsx',"export {Background} from './components/background';export {Heading} from './components/heading';");
 for(const id of ['background','heading','image']){put(`kit/components/${id}/index.tsx`,`export const ${id}=()=>null;`);put(`kit/components/${id}/manifest.json`,{id});}
 put('kit/components/background/manifest.json',{id:'background',dependencies:['image'],php:['server.php'],styles:['styles.css'],controls:[{name:'background',file:'editor.tsx',export:'Editor'}],modules:['media']});
 put('kit/components/background/server.php','<?php // server');put('kit/components/background/styles.css','.background{}');put('kit/components/background/editor.tsx','export const Editor=()=>null;');
 put('kit/modules/media/manifest.json',{id:'media',php:['bootstrap.php'],assets:[{source:'assets',output:'media'}]});put('kit/modules/media/bootstrap.php','<?php');put('kit/modules/media/assets/admin.js','window.loaded=true;');
 put('src/view.tsx',"import {Background as Cover} from '@kit';export const View=()=> <Cover/>;");
 return {root,put,options:{directory:path.join(root,'kit')}};
}
test('component imports connect transitive components, editor, PHP, styles and module assets',()=>{
 const {root,options}=fixture();try{const result=syncKit(root,options);assert.deepEqual(result.components,['background','image']);assert.deepEqual(result.modules,['media']);assert.deepEqual(result.php,['./components/background/server.php']);publishKitAssets(root,path.join(root,'output'),options);assert.equal(fs.readFileSync(path.join(root,'output/media/admin.js'),'utf8'),'window.loaded=true;');assert.match(fs.readFileSync(path.join(root,'kit/generated/editor.ts'),'utf8'),/background/);assert.match(fs.readFileSync(path.join(root,'kit/generated/styles.css'),'utf8'),/background/);}finally{fs.rmSync(root,{recursive:true,force:true});}
});
test('unused components and their server/editor/style connections disappear',()=>{
 const {root,put,options}=fixture();try{syncKit(root,options);put('src/view.tsx',"import {Heading} from '@kit';export const View=()=> <Heading/>;");const result=syncKit(root,options);assert.deepEqual(result.components,['heading']);assert.deepEqual(result.php,[]);assert.deepEqual(result.modules,[]);assert.doesNotMatch(fs.readFileSync(path.join(root,'kit/generated/editor.ts'),'utf8'),/background/);}finally{fs.rmSync(root,{recursive:true,force:true});}
});
test('missing server dependencies fail preparation',()=>{const {root,options}=fixture();try{fs.unlinkSync(path.join(root,'kit/components/background/server.php'));assert.throws(()=>syncKit(root,options),/Missing kit PHP/);}finally{fs.rmSync(root,{recursive:true,force:true});}});

test('npm preparation creates a managed host copy and never overwrites authored kit source',async()=>{
 const {execFileSync}=await import('node:child_process');
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'kit-prepare-'));
 const put=(file,value)=>{fs.mkdirSync(path.dirname(path.join(root,file)),{recursive:true});fs.writeFileSync(path.join(root,file),typeof value==='string'?value:JSON.stringify(value));};
 try{
  put('tsconfig.json',{compilerOptions:{paths:{'@kit':['./kit/index.tsx'],'@kit/*':['./kit/*']}}});
  put('config/breakpoints.json',{breakpoints:{mobile:480,tablet:768},media:{columns:'tablet'},layoutIgnore:[]});put('kit.config.json',{modules:[]});
  put('src/sections/section-example/section.json',{slug:'section-example',title:'Example'});
  put('src/sections/section-example/section.tsx',"import {Background,Heading,Section,section} from '@kit'; export default section({slug:'example',title:'Example'},()=> <Section><Background name='background'/><Heading name='heading'/></Section>);");
  execFileSync(process.execPath,['tooling/cli.mjs','prepare','--project',root]);
  const connections=JSON.parse(fs.readFileSync(path.join(root,'kit/generated/connections.json'),'utf8'));
  assert.ok(connections.components.includes('background'));
  assert.ok(connections.components.includes('heading'));
  assert.ok(fs.existsSync(path.join(root,'kit/.kit-package.json')));
  execFileSync(process.execPath,['tooling/cli.mjs','prepare','--project',root]);
  fs.unlinkSync(path.join(root,'kit/.kit-package.json'));
  assert.throws(()=>execFileSync(process.execPath,['tooling/cli.mjs','prepare','--project',root],{stdio:'pipe'}),/authored source/);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
