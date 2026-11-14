import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';
import ts from 'typescript';
const root=path.resolve(fileURLToPath(new URL('..',import.meta.url)));
const output=path.join(root,'dist');
fs.rmSync(output,{recursive:true,force:true});
const configFile=ts.readConfigFile(path.join(root,'tsconfig.json'),ts.sys.readFile);
const config=ts.parseJsonConfigFileContent(configFile.config,ts.sys,root);
const program=ts.createProgram(config.fileNames,{...config.options,emitDeclarationOnly:true});
const emitted=program.emit();
const diagnostics=[...ts.getPreEmitDiagnostics(program),...emitted.diagnostics];
if(diagnostics.length){console.error(ts.formatDiagnosticsWithColorAndContext(diagnostics,{getCanonicalFileName:f=>f,getCurrentDirectory:()=>root,getNewLine:()=> '\n'}));process.exit(1);}
await build({entryPoints:config.fileNames.filter(file=>!file.endsWith('.d.ts')),outbase:root,outdir:output,format:'esm',platform:'neutral',target:'es2020',jsx:'automatic',bundle:false,sourcemap:true});
const folders=['components','editor','core','ui','admin-ui','modules','adapters','wordpress','hooks','styles','schema','shared','tooling'];
for(const folder of folders){const source=path.join(root,folder);if(!fs.existsSync(source))continue;fs.cpSync(source,path.join(output,folder),{recursive:true,filter:file=>!(/\.tsx?$/.test(file))});}
fs.copyFileSync(path.join(root,'bootstrap.php'),path.join(output,'bootstrap.php'));
console.log(`Built ${config.fileNames.length} independent modules with declarations and server/assets sources.`);
