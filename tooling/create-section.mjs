import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {syncSections} from './sync-sections.mjs';
export function createSection(root,slug){
 if(!/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(slug??''))throw new Error('Use a lowercase name, for example consultation.');
 const folder='section-'+slug.replace(/^section-/,''),directory=path.join(root,'src/sections',folder);
 if(fs.existsSync(directory))throw new Error(`${folder} already exists; nothing was overwritten.`);
 const title=slug.replace(/^section-/,'').replace(/-/g,' ').replace(/^./,c=>c.toUpperCase());
 fs.mkdirSync(directory,{recursive:true});
 try{
  fs.writeFileSync(path.join(directory,'section.json'),JSON.stringify({slug:folder,title},null,2)+'\n');
  fs.writeFileSync(path.join(directory,'section.tsx'),`import {Heading,Section,Text,section} from '@kit';\nimport meta from './section.json';\nexport default section(meta,()=> (\n <Section className="py-20">\n  <div className="mx-auto max-w-7xl px-6">\n   <Heading name="title" className="text-4xl"/>\n   <Text name="text" className="mt-4"/>\n  </div>\n </Section>\n));\n`);
  syncSections(root);
 }catch(error){fs.rmSync(directory,{recursive:true,force:true});throw error;}
 return {directory,name:'site/'+folder};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))console.log(createSection(process.cwd(),process.argv[2]).directory);
