import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {execFileSync} from 'node:child_process';
test('public CLI generates every module type in a project without theme-specific tools',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'kit-generators-'));
 const cli=path.resolve('tooling/cli.mjs');
 try{
 fs.mkdirSync(path.join(root,'config'));fs.writeFileSync(path.join(root,'config/breakpoints.json'),JSON.stringify({layoutIgnore:[],breakpoints:{mobile:576,tablet:1024},media:{mobile:'mobile',desktop:'tablet',columns:'tablet'}}));
 fs.writeFileSync(path.join(root,'package.json'),'{}');
 fs.writeFileSync(path.join(root,'kit.config.json'),JSON.stringify({modules:[]}));
 fs.writeFileSync(path.join(root,'tsconfig.json'),JSON.stringify({compilerOptions:{baseUrl:'.',paths:{'@kit':['kit/index.tsx'],'@kit/*':['kit/*']}}}));
 fs.symlinkSync(path.resolve('node_modules'),path.join(root,'node_modules'),'dir');
 const run=(...args)=>execFileSync(process.execPath,[cli,...args,'--project',root],{encoding:'utf8'});
 for(const kind of ['component','section','layout']){
 run('create',kind,'test-'+kind,'--no-build');
 const group={component:'elements',section:'sections',layout:'layout'}[kind];
 assert.ok(fs.existsSync(path.join(root,'src/blocks',group,'test-'+kind,'component.tsx')));
 }
 run('new','section','declarative');assert.ok(fs.existsSync(path.join(root,'src/sections/section-declarative/section.tsx')));
 run('render','test-component','--no-build');
 assert.throws(()=>run('create','component','test-component','--no-build'));
 assert.ok(fs.existsSync(path.join(root,'kit/adapters/next/runtime.php')));
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
