/** Scope authored styles without mistaking escaped utility names for CSS nesting. */
export function scopeEditorSelector(selector) {
 if(selector.replace(/\\./g,'').includes('&')||selector.startsWith('.editor-styles-wrapper'))return selector;
 if([':root',':host','body','html'].includes(selector))return '.editor-styles-wrapper';
 return '.editor-styles-wrapper '+selector;
}
