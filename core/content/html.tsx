import { parseDocument } from 'htmlparser2';
import React from 'react';
import { domProps } from './html-props.js';
export function htmlNodes(
  html: string,
  rootClass?: string,
  transform?: (node: any, index: number) => React.ReactNode | undefined
): React.ReactNode[] {
  const visit = (node: any, index: number): React.ReactNode => {
    const custom = transform?.(node, index);
    if (custom !== undefined) return custom;
    if (node.type === 'text') return node.data;
    if (
      node.type !== 'tag' ||
      ['script', 'style', 'object', 'embed', 'link', 'meta', 'base', 'iframe'].includes(node.name)
    )
      return null;
    return React.createElement(
      node.name,
      { ...domProps(node.attribs), key: index },
      ['img', 'br', 'hr'].includes(node.name) ? undefined : node.children.map(visit)
    );
  };
  return parseDocument(html).children.map((node: any, index: number) => {
    const result = visit(node, index);
    return rootClass && React.isValidElement(result)
      ? React.cloneElement(result as any, {
          className: [(result.props as any).className, rootClass].filter(Boolean).join(' '),
        })
      : result;
  });
}
