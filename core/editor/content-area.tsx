import type { ContentAreaDefinition } from '../content/areas/data.js';
import { areaBlocks } from '../content/areas/data.js';
import { useEffect, type CSSProperties, type ElementType, type ReactNode } from 'react';
declare const wp: any;
/** Owns only native Gutenberg children; content and layout rules come from the schema. */
export function ContentAreaEditor({
  definition,
  data,
  onChange,
  site = {},
  templateData,
  as: Tag = 'div',
  className,
  style,
  render,
}: {
  render?: (props: Record<string, any>) => ReactNode;
  as?: ElementType | null;
  className?: string;
  style?: CSSProperties;
  definition: ContentAreaDefinition;
  data: any;
  onChange: (next: any) => void;
  site?: any;
  templateData?: any;
}) {
  const { clientId } = wp.blockEditor.useBlockEditContext();
  useEffect(() => {
    const derived = definition.initialize?.(templateData ?? data, site) ?? {};
    const missing = Object.fromEntries(
      Object.entries(derived).filter(([key]) => data[key] === undefined)
    );
    if (data[definition.initializedKey] && !Object.keys(missing).length) return;
    const current = wp.data.select('core/block-editor').getBlocks(clientId);
    const existing = current.map((block: any) => ({ ...block, attrs: block.attributes }));
    const next = areaBlocks(definition, templateData ?? data, existing, site);
    if (next !== existing) {
      const originals = new Map(current.map((block: any) => [block.clientId, block]));
      const create = (block: any): any =>
        originals.get(block.clientId) ??
        wp.blocks.createBlock(block.name, block.attrs, (block.innerBlocks ?? []).map(create));
      wp.data.dispatch('core/block-editor').replaceInnerBlocks(clientId, next.map(create), false);
    }
    onChange({ ...data, ...missing, [definition.initializedKey]: true });
  }, [clientId, data[definition.initializedKey]]);
  const props = wp.blockEditor.useInnerBlocksProps(
    { className, style },
    {
      allowedBlocks: definition.allowedBlocks,
      templateLock: definition.templateLock ?? false,
      renderAppender:
        definition.appender === false ? false : wp.blockEditor.InnerBlocks.ButtonBlockAppender,
    }
  );
  if (render) return render(props);
  // Direct Field usage keeps the default host element.
  const Element = Tag ?? 'div';
  return <Element {...props} />;
}
