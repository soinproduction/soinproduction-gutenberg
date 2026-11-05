import { safeUrl } from '../fields/records.js';
import { DomUtils, parseDocument } from 'htmlparser2';
import type { ReactNode } from 'react';
export function richText(value: unknown, { links = true }: { links?: boolean } = {}): ReactNode {
  const visit = (node: any, index: number): ReactNode => {
    if (node.type === 'text') return node.data;
    if (node.type !== 'tag' || ['script', 'style', 'iframe', 'object', 'embed'].includes(node.name))
      return null;
    const children = node.children.map(visit);
    if (['b', 'strong'].includes(node.name)) return <strong key={index}>{children}</strong>;
    if (['i', 'em'].includes(node.name)) return <em key={index}>{children}</em>;
    if (['s', 'del'].includes(node.name)) return <s key={index}>{children}</s>;
    if (node.name === 'mark')
      return (
        <mark key={index} className="site-accent">
          {children}
        </mark>
      );
    if (node.name === 'br') return <br key={index} />;
    if (links && node.name === 'a') {
      const href = safeUrl(node.attribs?.href);
      return href ? (
        <a key={index} href={href}>
          {children}
        </a>
      ) : (
        <span key={index}>{children}</span>
      );
    }
    return <span key={index}>{children}</span>;
  };
  return parseDocument(String(value ?? '')).children.map(visit);
}

export function richNodes(value: unknown): ReactNode {
  return richText(value, { links: false });
}

export function plainText(value: unknown) {
  return DomUtils.textContent(parseDocument(String(value ?? ''))).replace(/[\r\n]+/g, ' ');
}
