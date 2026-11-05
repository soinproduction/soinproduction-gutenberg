import fs from 'node:fs';
import path from 'node:path';
import { syncSections } from './sync-sections.mjs';
const slug = process.argv[2];
if (!/^[a-z][a-z0-9-]*$/.test(slug ?? '')) throw new Error('Usage: npm run new:section -- name');
const folder = 'section-' + slug.replace(/^section-/, '');
const directory = path.join('src/sections', folder);
if (fs.existsSync(directory)) throw new Error(`${folder} already exists`);
const title = slug.replace(/^section-/, '').replace(/-/g, ' ').replace(/^./, (c) => c.toUpperCase());
fs.mkdirSync(directory, { recursive: true });
fs.writeFileSync(path.join(directory, 'section.json'), JSON.stringify({ slug: folder, title }, null, 2) + '\n');
fs.writeFileSync(path.join(directory, 'section.tsx'), `import { Heading, Section, Text, section } from '@kit';
import meta from './section.json';

export default section(meta, () => (
  <Section className="py-20">
    <div className="mx-auto max-w-7xl px-6">
      <Heading name="title" className="text-4xl" />
      <Text name="text" className="mt-4" />
    </div>
  </Section>
));
`);
syncSections();
console.log(`Created ${directory}. Run npm run build:editor and refresh Gutenberg.`);
