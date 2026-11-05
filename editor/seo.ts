import { useEffect } from 'react';
declare const wp: any;
/** Feed Rank Math the rendered page, including schema fields, without editor chrome/site parts. */
export function registerSeoAnalysis(useSiteData: () => any) {
  wp.plugins.registerPlugin('site-rank-math-analysis', {
    render: () => {
      const site = useSiteData();
      useEffect(() => {
        if (!site) return;
        const timer = setTimeout(() => (window as any).rankMathEditor?.refresh?.('content'), 250);
        return () => clearTimeout(timer);
      }, [site]);
      return null;
    },
  });
  wp.hooks.addFilter(
    'rank_math_content',
    'site/rendered-content',
    (fallback: string) => {
      const docs = [
        document,
        ...Array.from(document.querySelectorAll('iframe')).flatMap((frame) => {
          try {
            return frame.contentDocument ? [frame.contentDocument] : [];
          } catch {
            return [];
          }
        }),
      ];
      const root = docs.map((doc) => doc.querySelector('.is-root-container')).find(Boolean);
      if (!root) return fallback;
      const clone = root.cloneNode(true) as HTMLElement;
      clone
        .querySelectorAll(
          '.site-editor-ui,.site-inline-tools,.site-inline-add,.site-background-tools,.block-editor-inserter,.components-button,.block-editor-block-list__block-selection-button'
        )
        .forEach((node) => node.remove());
      return clone.innerHTML;
    },
    20
  );
  if (typeof wp.data.subscribe !== 'function') return;
  let previous: any, timer: ReturnType<typeof setTimeout>;
  wp.data.subscribe(() => {
    const blocks = wp.data.select('core/block-editor')?.getBlocks();
    if (blocks === previous) return;
    previous = blocks;
    clearTimeout(timer);
    timer = setTimeout(() => {
      (window as any).rankMathEditor?.refresh?.('content');
    }, 750);
  });
}
