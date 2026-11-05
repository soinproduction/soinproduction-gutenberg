const fs=require('node:fs');
const path=require('node:path');
function load(file){
 const config=JSON.parse(fs.readFileSync(file,'utf8'));
 for(const key of ['breakpoints']){
  const entries=Object.entries(config[key]??{});let previous=0;
  if(!entries.length)throw new Error(`Missing ${key}`);
  for(const [name,value] of entries){
   if(!/^(?:[a-z][a-z0-9-]*|2xl)$/.test(name)||!Number.isFinite(value)||value<=previous)throw new Error(`Invalid or unordered breakpoint: ${name}`);
   previous=value;
  }
 }
 for(const target of Object.values(config.media??{}))if(!(target in config.breakpoints))throw new Error(`Unknown media breakpoint: ${target}`);
 for(const name of config.layoutIgnore??[])if(!(name in config.breakpoints))throw new Error(`Unknown layoutIgnore breakpoint: ${name}`);
 return config;
}
const rem=value=>`${value/16}rem`;
function css(config){
 return `@theme { --breakpoint-*: initial; }\n`+
 Object.entries(config.breakpoints).map(([name,value])=>`@custom-media --site-up-${name} (width >= ${rem(value)});\n@custom-media --site-down-${name} (width < ${rem(value)});`).join('\n')+'\n'+
 Object.entries(config.breakpoints).map(([name,value])=>`@custom-variant ${name} (@media (width < ${rem(value)}));\n@custom-variant for-${name} (@media (width >= ${rem(value)}));`).join('\n')+
 `\n:root { ${Object.entries(config.media).map(([name,target])=>`--site-media-${name}: ${rem(config.breakpoints[target])};`).join(' ')} }`+
 `\n/* Drag grid: the default placement applies from the columns breakpoint up; a breakpoint placement only within its own range. */\n`+
 grid(config)+'\n'+Object.entries(config.breakpoints).map(([name,value])=>`[data-slider-below="${name}"]{--site-slider-until:${value}} @media (width >= ${rem(value)}) { [data-slider-below="${name}"]>[data-slider-viewport]{overflow:visible;touch-action:auto} [data-slider-below="${name}"] [data-slider-track]{display:block} [data-slider-below="${name}"] .site-slider-items{display:grid} }`).join('\n');
}
function grid(config){
 const base=config.media.columns;if(!base)return '';
 const names=Object.keys(config.breakpoints).filter(name=>!(config.layoutIgnore??[]).includes(name));
 const rule=(name,query)=>`@media ${query} { .site-flow-drag.has-grid>.site-flow-column.site-col-at-${name} { grid-column: var(--site-col-${name}-start) / span var(--site-col-${name}-span); } }`;
 return [rule('default',`(width >= ${rem(config.breakpoints[base])})`),
  ...names.map((name,index)=>{const next=names[index+1];const query=index===0?(next?`(width < ${rem(config.breakpoints[next])})`:'(width >= 0rem)'):`(width >= ${rem(config.breakpoints[name])})`+(next?` and (width < ${rem(config.breakpoints[next])})`:'');return rule(name,query)+`\n@media ${query} { .site-flow-column[data-vertical-align].site-align-v-${name}, .editor-styles-wrapper .site-flow-column[data-vertical-align].site-align-v-${name} { justify-content: var(--site-align-${name}-vertical); } .site-flow-column[data-horizontal-align].site-align-h-${name}, .editor-styles-wrapper .site-flow-column[data-horizontal-align].site-align-h-${name} { --site-column-content-align: var(--site-align-${name}-horizontal); align-items: var(--site-align-${name}-horizontal); text-align: var(--site-align-${name}-text); } }`;}),
  `/* Narrower than the columns breakpoint, a Drag grid uses its mobileGrid tracks. */\n@media (width < ${rem(config.breakpoints[base])}) { .site-flow-drag.has-grid { grid-template-columns: repeat(var(--site-flow-mobile-columns, var(--site-flow-columns)), minmax(0, 1fr)); } }`].join('\n');
}
module.exports=(options={})=>{
 let config;
 return {postcssPlugin:'site-breakpoints',Once(root,{result}){
  const file=options.configPath??path.resolve(process.cwd(),'config/breakpoints.json');config=load(file);
  const output=options.outputPath??path.resolve(process.cwd(),'src/site/styles/breakpoints.css');
  const content='/* Generated from config/breakpoints.json. Do not edit. */\n'+css(config)+'\n';
  if(!fs.existsSync(output)||fs.readFileSync(output,'utf8')!==content)fs.writeFileSync(output,content);
  result.messages.push({type:'dependency',plugin:'site-breakpoints',file});
 },AtRule:{'custom-media'(rule){if(rule.params.startsWith('--site-'))rule.remove();},media(rule){
  rule.params=rule.params.replace(/\(--site-(up|down)-([a-z0-9-]+)\)/g,(_,direction,name)=>{
   const value=config.breakpoints[name];if(!value)throw rule.error(`Unknown breakpoint: ${name}`);
   return `(width ${direction==='up'?'>=':'<'} ${rem(value)})`;
  });
 }}};
};
module.exports.postcss=true;module.exports.load=load;module.exports.css=css;
