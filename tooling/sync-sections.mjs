import {syncBlocks} from './sync-blocks.mjs';
import fs from 'node:fs';
import path from 'node:path';

const identifier = (folder) =>
  folder.replace(/^section-/, '').replace(/-(.)/g, (_, letter) => letter.toUpperCase());

function write(file, content) {
  if (!fs.existsSync(file) || fs.readFileSync(file, 'utf8') !== content) fs.writeFileSync(file, content);
}

/** Every section-* folder with a section.tsx is connected; the file is rewritten only on change. */
export function syncSections(root = process.cwd()) {
  const directory = path.join(root, 'src/sections');
  fs.mkdirSync(directory, {recursive:true});
  const folders = fs
    .readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.startsWith('section-'))
    .map((entry) => entry.name)
    .filter((folder) => fs.existsSync(path.join(directory, folder, 'section.tsx')))
    .sort();
  const source = [
    '// Generated from the section-* folders by tools/sync-sections.mjs. Do not edit.',
    ...folders.map((folder) => `import ${identifier(folder)} from './${folder}/section';`),
    '',
    `export const sections = [${folders.map(identifier).join(', ')}];`,
    '',
  ].join('\n');
  const styles = [
    '/* Generated from the section-* folders by tools/sync-sections.mjs. Do not edit. */',
    ...folders
      .filter((folder) => fs.existsSync(path.join(directory, folder, 'styles.css')))
      .map((folder) => `@import "./${folder}/styles.css";`),
    '',
  ].join('\n');
  write(path.join(directory, 'index.generated.ts'), source);
  write(path.join(directory, 'styles.generated.css'), styles);
  if (fs.existsSync(path.join(root, 'src/blocks'))) syncBlocks(root);
  return folders;
}
