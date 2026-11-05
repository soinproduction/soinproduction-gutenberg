import fs from 'node:fs';
import path from 'node:path';
export const blockGroups = ['sections', 'elements', 'layout'];
export const groupForKind = { section: 'sections', component: 'elements', layout: 'layout' };
export function listBlocks(root) {
  const base = path.join(root, 'src/blocks');
  return blockGroups.flatMap((group) => {
    const directory = path.join(base, group);
    return fs.existsSync(directory)
      ? fs
          .readdirSync(directory, { withFileTypes: true })
          .filter((entry) => entry.isDirectory())
          .map((entry) => ({
            group,
            slug: entry.name,
            directory: path.join(directory, entry.name),
          }))
      : [];
  });
}
export function resolveBlock(root, slug) {
  if (!/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(slug ?? ''))
    throw new Error('Use a lowercase block name.');
  const matches = listBlocks(root).filter((block) => block.slug === slug);
  if (matches.length > 1)
    throw new Error(`Ambiguous block name: ${slug}. Names must be unique across groups.`);
  if (!matches.length)
    throw new Error(
      `No schema.ts in ${slug}. Block was not found in sections, elements or layout.`
    );
  return matches[0].directory;
}
