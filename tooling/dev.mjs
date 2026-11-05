import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {createRequire} from 'node:module';
import {prepareProject} from './prepare-project.mjs';
import {buildEditor,watchEditor} from './watch-editor.mjs';
import {nextRuntime,writeRuntime,clearRuntime} from './next-runtime.mjs';

export function renderMode(root){
 const file=path.resolve(root,'../render.config.json');
 const config=fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):{};
 const mode=config.mode??'next';
 if(!['next','wordpress'].includes(mode))throw new Error('render.config.json: mode must be next or wordpress');
 return mode;
}
export async function runDev({root=process.cwd(),args=process.argv.slice(2),env=process.env}={}){
 root=path.resolve(root);
 const configFile=path.join(root,'kit.config.json');
 const config=fs.existsSync(configFile)?JSON.parse(fs.readFileSync(configFile,'utf8')):{};
 if(fs.existsSync(configFile))prepareProject(root);
 const mode=renderMode(root);console.log(`[dev] Renderer: ${mode}`);
 const editor=(config.editor?.entry||mode==='wordpress')?watchEditor({root,build:async({signal})=>{
  await buildEditor(root,{signal});
  if(mode==='wordpress')await new Promise((resolve,reject)=>{
   const child=spawn(process.execPath,[path.join(root,'kit/tooling/build-wordpress.mjs')],{cwd:root,stdio:'inherit',signal});
   child.once('error',reject);child.once('close',code=>code===0?resolve():reject(new Error('WordPress build failed')));
  });
 }}):{ready:Promise.resolve(),close:async()=>{}};
 let next=null,stopping=false;
 const stop=async(code,signal='SIGTERM')=>{
  if(stopping)return;stopping=true;process.exitCode=code;clearRuntime(root);
  if(next&&next.exitCode===null&&next.signalCode===null)next.kill(signal);
  await editor.close();
 };
 process.once('SIGINT',()=>void stop(130,'SIGINT'));
 process.once('SIGTERM',()=>void stop(143));
 await editor.ready;
 if(!stopping&&mode==='next'){
  const runtime=await nextRuntime({args,env});
  if(stopping)return {stop};
  writeRuntime(root,runtime);console.log(`[dev] Frontend: ${runtime.origin}`);
  const require=createRequire(path.join(root,'package.json'));
  next=spawn(process.execPath,[require.resolve('next/dist/bin/next'),'dev',...runtime.args],{cwd:root,stdio:'inherit',env:runtime.env});
  next.once('error',error=>{console.error('[dev] Could not start Next.js:',error.message);void stop(1);});
  next.once('close',(code,signal)=>void stop(code??(signal?1:0)));
 }
 return {next,editor,stop};
}
export async function runStart({root=process.cwd(),args=process.argv.slice(2),env=process.env}={}){
 root=path.resolve(root);const runtime=await nextRuntime({args,env,mode:'start'});
 console.log(`[start] Frontend: ${runtime.origin}`);writeRuntime(root,runtime);
 const require=createRequire(path.join(root,'package.json'));
 const next=spawn(process.execPath,[require.resolve('next/dist/bin/next'),'start',...runtime.args],{cwd:root,stdio:'inherit',env:runtime.env});
 const stop=signal=>{clearRuntime(root);next.kill(signal);};
 process.once('SIGINT',()=>stop('SIGINT'));process.once('SIGTERM',()=>stop('SIGTERM'));
 next.once('error',error=>{clearRuntime(root);console.error(error);process.exitCode=1;});
 next.once('close',code=>{clearRuntime(root);process.exitCode=code??1;});
 return {next,runtime,stop};
}
