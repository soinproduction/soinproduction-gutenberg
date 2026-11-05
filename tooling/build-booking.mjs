import fs from 'node:fs';
import { build } from 'esbuild';
await build({entryPoints:['kit/modules/booking/admin.js'],outdir:'../build/booking',bundle:true,format:'iife',platform:'browser',minify:true,legalComments:'eof',target:['es2020']});
fs.mkdirSync('../build/previews/sections',{recursive:true});
fs.copyFileSync('kit/modules/booking/blocks/section/preview.svg','../build/previews/sections/booking.svg');
console.log('Booking calendar admin bundle built.');
