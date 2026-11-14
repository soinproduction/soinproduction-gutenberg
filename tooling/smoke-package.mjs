import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
const temporary=fs.mkdtempSync(path.join(os.tmpdir(),'kit-packed-'));
try{
 const root=process.cwd();
 const archive=execFileSync('npm',['pack','--ignore-scripts','--silent','--pack-destination',temporary],{cwd:root,encoding:'utf8'}).trim().split('\n').at(-1);
 const consumer=path.join(temporary,'consumer');fs.mkdirSync(consumer);
 fs.writeFileSync(path.join(consumer,'package.json'),JSON.stringify({name:'kit-smoke-consumer',version:'1.0.0',private:true,type:'module'}));
 execFileSync('npm',['install',path.join(temporary,archive),'--ignore-scripts','--no-audit','--no-fund'],{cwd:consumer,stdio:'pipe',env:{...process.env,npm_config_userconfig:os.devNull}});
 execFileSync(process.execPath,['--input-type=module','-e',"import {Background,Heading,Drag,SocialLinks} from 'soinproduction-gutenberg'; if([Background,Heading,Drag,SocialLinks].some(value=>typeof value!=='function'))throw new Error('Missing public exports');"],{cwd:consumer,stdio:'pipe'});
 fs.mkdirSync(path.join(consumer,'config'));fs.mkdirSync(path.join(consumer,'src/sections/section-example'),{recursive:true});
 fs.writeFileSync(path.join(consumer,'tsconfig.json'),JSON.stringify({compilerOptions:{paths:{'@kit':['./kit/index.tsx'],'@kit/*':['./kit/*']}}}));
 fs.writeFileSync(path.join(consumer,'kit.config.json'),JSON.stringify({modules:[]}));
 fs.writeFileSync(path.join(consumer,'config/breakpoints.json'),JSON.stringify({breakpoints:{mobile:480,tablet:768},media:{columns:'tablet'},layoutIgnore:[]}));
 fs.writeFileSync(path.join(consumer,'src/sections/section-example/section.json'),JSON.stringify({slug:'section-example',title:'Example'}));
 fs.writeFileSync(path.join(consumer,'src/sections/section-example/section.tsx'),"import {Background,Heading,Section,SocialLinks,section} from '@kit';export default section({slug:'example',title:'Example'},()=> <Section><Background name='background'/><Heading name='heading'/><SocialLinks/></Section>);");
 execFileSync(process.execPath,['node_modules/.bin/soinproduction-kit','prepare'],{cwd:consumer,stdio:'pipe'});
 if(!fs.existsSync(path.join(consumer,'kit/editor/root-sections.ts')))throw new Error('Missing prepared editor integration');
 if(!fs.existsSync(path.join(consumer,'node_modules/soinproduction-gutenberg/dist/editor/seo.js')))throw new Error('Missing compiled editor integration');
 const connections=JSON.parse(fs.readFileSync(path.join(consumer,'kit/generated/connections.json'),'utf8'));
 for (const component of ['background', 'social-links']) {
  if (!connections.components.includes(component)) throw new Error('Installed package did not connect ' + component);
 }
 execFileSync(process.execPath,['--input-type=module','-e',"import {buildSync} from 'esbuild';buildSync({entryPoints:['src/sections/section-example/section.tsx'],bundle:true,write:false,platform:'node',format:'esm',packages:'external',jsx:'automatic',tsconfig:'tsconfig.json'});"],{cwd:consumer,stdio:'pipe'});
 if(!fs.existsSync(path.join(consumer,'node_modules/soinproduction-gutenberg/dist/components/forms/server.php')))throw new Error('Missing packaged server files');
 console.log('Packed npm installation, public ESM exports, PHP assets and host preparation verified in a clean consumer.');
}catch(error){if(error.stdout)console.error(String(error.stdout));if(error.stderr)console.error(String(error.stderr));throw error;}finally{fs.rmSync(temporary,{recursive:true,force:true});}
