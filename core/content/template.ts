import type { ContentBlock } from './context.js';
/** Shared representation of Gutenberg templates; no section layout decisions. */
export function templateBlocks(template: any[]): ContentBlock[] {
  return template.map(([name, attrs = {}, children = []]) => ({
    name,
    attrs,
    innerBlocks: templateBlocks(children),
    html:
      name === 'core/heading'
        ? `<h${attrs.level ?? 2}>${attrs.content ?? ''}</h${attrs.level ?? 2}>`
        : name === 'core/paragraph'
          ? `<p class="${attrs.className ?? ''}">${attrs.content ?? ''}</p>`
          : '',
  }));
}
