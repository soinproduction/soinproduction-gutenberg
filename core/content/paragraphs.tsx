import type { HTMLAttributes, ReactNode } from 'react';
import { richText } from './rich-text.js';

/** Paragraph structure is shared; the editor supplies editable text and tools. */
export type ParagraphValue = string | {text:string;style?:'accent-line'};
export const paragraphText=(value:ParagraphValue)=>typeof value==='string'?value:value.text;
export const paragraphAccent=(value:ParagraphValue)=>typeof value!=='string'&&value.style==='accent-line';
export function ParagraphFlow({
  value,
  className,
  paragraphClass,
  renderParagraph,
  renderTools,
  renderAdd,
  rowProps,
}: {
  value: ParagraphValue[];
  className?: string;
  paragraphClass?: string;
  renderParagraph?: (html: string, index: number) => ReactNode;
  renderTools?: (index: number) => ReactNode;
  renderAdd?: () => ReactNode;
  rowProps?: (index: number) => HTMLAttributes<HTMLDivElement>;
}) {
  return (
    <div className={['site-paragraph-flow', className].filter(Boolean).join(' ')}>
      {value.map((html, index) => (
        <div
          key={index}
          {...rowProps?.(index)}
          className={['site-description-row', paragraphAccent(html)?'is-style-studio-accent-line':undefined, index ? paragraphClass : undefined]
            .filter(Boolean)
            .join(' ')}
        >
          {renderParagraph ? renderParagraph(paragraphText(html), index) : <p>{richText(paragraphText(html))}</p>}
          {renderTools?.(index)}
        </div>
      ))}
      {renderAdd?.()}
    </div>
  );
}
