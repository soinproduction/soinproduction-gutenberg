import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';

function option(args,names){
 for(let index=0;index<args.length;index++){
  const value=args[index];
  if(names.includes(value)){if(args[index+1]===undefined)throw new Error('Missing value for '+value);return args[index+1];}
  for(const name of names)if(value.startsWith(name+'='))return value.slice(name.length+1);
  if(names.includes('-p')&&/^-p\d+$/.test(value))return value.slice(2);
 }
}
function withoutPort(args){
 return args.filter((value,index)=>!['--port','-p'].includes(value)&&!['--port','-p'].includes(args[index-1])&&!/^--port=|^-p=|^-p\d+$/.test(value));
}
export function availablePort(host='0.0.0.0'){
 return new Promise((resolve,reject)=>{
  const server=net.createServer();server.once('error',reject);
  server.listen({host,port:0,exclusive:true},()=>{
   const port=server.address().port;
   server.close(error=>error?reject(error):resolve(port));
  });
 });
}
export async function nextRuntime({args=[],env=process.env,mode='dev',findPort=availablePort}={}){
 const host=option(args,['--hostname','-H'])??'0.0.0.0';
 const requested=option(args,['--port','-p'])??env.PORT;
 if(requested!==undefined&&!/^\d+$/.test(String(requested)))throw new Error('Next port must be an integer from 0 to 65535');
 let port=requested===undefined?0:Number(requested);
 if(port>65535)throw new Error('Next port must be an integer from 0 to 65535');
 if(port===0)port=await findPort(host);
 const hostname=['0.0.0.0','::'].includes(host)?'127.0.0.1':host;
 const protocol=args.includes('--experimental-https')?'https':'http';
 const origin=`${protocol}://${hostname.includes(':')?'['+hostname+']':hostname}:${port}`;
 const childEnv={...env,PORT:String(port)};
 if(mode==='dev'){
  childEnv.NEXT_PUBLIC_SITE_URL=origin;
  childEnv.FORM_ENGINE_ORIGIN=origin;
 }
 return {args:[...withoutPort(args),'--port',String(port)],env:childEnv,port,origin};
}
export function runtimeFile(root){
 const configFile=path.join(root,'kit.config.json');
 const config=fs.existsSync(configFile)?JSON.parse(fs.readFileSync(configFile,'utf8')):{};
 const value=config.runtime?.file??'build/next-server.json';
 if(typeof value!=='string')throw new Error('runtime.file must be a project-relative path');
 const file=path.resolve(root,value);
 if(!file.startsWith(path.resolve(root)+path.sep))throw new Error('runtime.file must stay inside the project');
 return file;
}
export function writeRuntime(root,runtime,pid=process.pid){
 const file=runtimeFile(root);
 fs.mkdirSync(path.dirname(file),{recursive:true});
 const temporary=file+'.'+pid+'.tmp';
 fs.writeFileSync(temporary,JSON.stringify({origin:runtime.origin,port:runtime.port,pid})+'\n');
 fs.renameSync(temporary,file);
}
export function clearRuntime(root,pid=process.pid){
 const file=runtimeFile(root);
 try{if(JSON.parse(fs.readFileSync(file,'utf8')).pid===pid)fs.unlinkSync(file);}catch(error){if(error.code!=='ENOENT'&&!(error instanceof SyntaxError))console.error('[next] Could not clear runtime address:',error.message);}
}
