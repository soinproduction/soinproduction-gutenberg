'use client';
import { useSite } from '../content/context.js';
import { iconMask } from './library.js';
import { Children, cloneElement, isValidElement, type CSSProperties, type ReactNode } from 'react';
export function listIconStyle(metadata: any = {}, library: unknown = []): CSSProperties | undefined {
  const mask = iconMask(metadata.siteListIcon, library);
  return mask ? ({ '--site-list-icon': mask } as CSSProperties) : undefined;
}
const withIcon = (element: any, style: CSSProperties | undefined, className: string, children?: ReactNode) => {
  const props = element.props;
  return cloneElement(element, {
    ...(style && {
      style: { ...props.style, ...style },
      className: [props.className, className].filter(Boolean).join(' '),
    }),
    ...(children !== undefined && { children }),
  });
};
/** Walk saved list blocks with their HTML so nested lists keep their own metadata. */
function decorateList(list: any, metadata: any, items: any[], library: unknown): ReactNode {
  let itemIndex = 0;
  const rows = Children.map(list.props.children, row => {
    if (!isValidElement(row) || row.type !== 'li') return row;
    const item = items[itemIndex++];
    const nested = (item?.innerBlocks ?? []).filter((block: any) => block.name === 'core/list');
    let nestedIndex = 0;
    const visit = (children: ReactNode): ReactNode => Children.map(children, child => {
      if (!isValidElement(child)) return child;
      if (child.type === 'ul' || child.type === 'ol') {
        const block = nested[nestedIndex++];
        return decorateList(child, block?.attrs?.metadata, block?.innerBlocks ?? [], library);
      }
      const props = child.props as any;
      return props.children === undefined ? child : cloneElement(child as any, {}, visit(props.children));
    });
    return withIcon(row, listIconStyle(item?.attrs?.metadata, library), 'site-icon-item', visit((row.props as any).children));
  });
  return withIcon(list, listIconStyle(metadata, library), 'site-icon-list', rows);
}
/** Markers come from the library: an icon for the whole list, and an icon per item over it. */
export function IconList({ metadata, items = [], children }: { metadata: any; items?: any[]; children: ReactNode }) {
  const site = useSite();
  return <>{Children.map(children, child => isValidElement(child) && (child.type === 'ul' || child.type === 'ol')
    ? decorateList(child, metadata, items, site.icons)
    : child)}</>;
}
