import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {nextRuntime,writeRuntime,clearRuntime} from '../tooling/next-runtime.mjs';

test('Next chooses a free port and gives dev URLs the same origin',async()=>{
 const result=await nextRuntime({args:['--webpack'],env:{},findPort:async()=>48123});
 assert.deepEqual(result.args,['--webpack','--port','48123']);
 assert.equal(result.origin,'http://127.0.0.1:48123');
 assert.equal(result.env.NEXT_PUBLIC_SITE_URL,result.origin);
 assert.equal(result.env.FORM_ENGINE_ORIGIN,result.origin);
});
test('explicit CLI port takes precedence over PORT and avoids auto-selection',async()=>{
 for(const args of [['--port','4321'],['--port=4321'],['-p','4321'],['-p4321']]){
  const result=await nextRuntime({args,env:{PORT:'5432'},findPort:async()=>{throw new Error('Should not select another port');}});
  assert.deepEqual(result.args,['--port','4321']);
 }
});
test('production start respects PORT without changing its canonical URL',async()=>{
 const result=await nextRuntime({mode:'start',env:{PORT:'5678',NEXT_PUBLIC_SITE_URL:'https://example.com'}});
 assert.equal(result.port,5678);assert.equal(result.env.NEXT_PUBLIC_SITE_URL,'https://example.com');
});
test('port zero selects a real port; invalid ports fail clearly',async()=>{
 assert.equal((await nextRuntime({args:['--port','0'],env:{},findPort:async()=>48999})).port,48999);
 for(const value of ['-1','65536','abc'])await assert.rejects(()=>nextRuntime({args:['--port',value],env:{}}),/port must be/);
});
test('a server only clears its own runtime address',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'next-runtime-'));
 try{writeRuntime(root,{origin:'http://127.0.0.1:48123',port:48123},123);clearRuntime(root,456);assert.ok(fs.existsSync(path.join(root,'build/next-server.json')));clearRuntime(root,123);assert.ok(!fs.existsSync(path.join(root,'build/next-server.json')));}finally{fs.rmSync(root,{recursive:true,force:true});}
});
test('runtime file can be configured but cannot escape the project',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'kit-runtime-config-'));
 try{fs.writeFileSync(path.join(root,'kit.config.json'),JSON.stringify({runtime:{file:'.runtime/next.json'}}));writeRuntime(root,{origin:'http://127.0.0.1:48123',port:48123});assert.ok(fs.existsSync(path.join(root,'.runtime/next.json')));clearRuntime(root);fs.writeFileSync(path.join(root,'kit.config.json'),JSON.stringify({runtime:{file:'../outside.json'}}));assert.throws(()=>writeRuntime(root,{}),/inside the project/);}finally{fs.rmSync(root,{recursive:true,force:true});}
});
test('PHP consumes the runtime and preserves public origins',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'kit-runtime-php-'));
 try{
 writeRuntime(root,{origin:'http://127.0.0.1:48123',port:48123});
 const helper=path.resolve('adapters/next/runtime.php'),file=path.join(root,'build/next-server.json');
 const get=configured=>execFileSync('php',['-r',`define('ABSPATH','/');require ${JSON.stringify(helper)};echo SiteTheme\\Kit\\frontend_origin(${JSON.stringify(configured)},${JSON.stringify(file)});`],{encoding:'utf8'});
 assert.equal(get('http://127.0.0.1:3000'),'http://127.0.0.1:48123');assert.equal(get('https://example.com'),'https://example.com');
 writeRuntime(root,{origin:'http://outside.example:48123',port:48123});assert.equal(get('http://127.0.0.1:3000'),'http://127.0.0.1:3000');
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
