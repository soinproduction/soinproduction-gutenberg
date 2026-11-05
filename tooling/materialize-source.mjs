import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
/** The distributed ESM uses .js paths; a host TS source copy must resolve TS files. */
export function normalizeSourceImports(directory){
 const walk=folder=>fs.readdirSync(folder,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?walk(path.join(folder,entry.name)):[path.join(folder,entry.name)]);
 for(const file of walk(directory).filter(file=>/\.tsx?$/.test(file))){
  let text=fs.readFileSync(file,'utf8');
  const source=ts.createSourceFile(file,text,ts.ScriptTarget.Latest,true),edits=[];
  const visit=node=>{
   let specifier;
   if((ts.isImportDeclaration(node)||ts.isExportDeclaration(node))&&node.moduleSpecifier&&ts.isStringLiteral(node.moduleSpecifier))specifier=node.moduleSpecifier;
   if(ts.isCallExpression(node)&&node.expression.kind===ts.SyntaxKind.ImportKeyword&&ts.isStringLiteral(node.arguments[0]))specifier=node.arguments[0];
   if(ts.isImportTypeNode(node)&&ts.isLiteralTypeNode(node.argument)&&ts.isStringLiteral(node.argument.literal))specifier=node.argument.literal;
   if(specifier&&specifier.text.startsWith('.')&&specifier.text.endsWith('.js')){
    const base=path.resolve(path.dirname(file),specifier.text.slice(0,-3));
    if(['.ts','.tsx'].some(extension=>fs.existsSync(base+extension)))edits.push({start:specifier.getStart(source)+1,end:specifier.getEnd()-1,value:specifier.text.slice(0,-3)});
   }
   ts.forEachChild(node,visit);
  };
  visit(source);
  for(const edit of edits.sort((a,b)=>b.start-a.start))text=text.slice(0,edit.start)+edit.value+text.slice(edit.end);
  if(edits.length)fs.writeFileSync(file,text);
 }
}
