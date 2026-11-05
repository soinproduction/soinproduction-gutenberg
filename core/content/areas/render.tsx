import { safeUrl } from '../../fields/records.js';
import { IconList } from '../../icons/list.js';
import { Fragment } from 'react';
import type { ContentBlock } from '../context.js';
import { htmlNodes } from '../html.js';
import { richText } from '../rich-text.js';
/** Native-block fallback. Host projects may supply their own renderer for custom elements. */
export function NativeAreaContent({ blocks }: { blocks: ContentBlock[] }) {
  return (
    <>
      {blocks.map((block, index) => {
        if (block.name === 'core/list' && block.html)
          return (
            <IconList key={index} metadata={block.attrs.metadata} items={block.innerBlocks}>
              {htmlNodes(block.html)}
            </IconList>
          );
        if (block.html) return <Fragment key={index}>{htmlNodes(block.html)}</Fragment>;
        if (block.name === 'core/heading') {
          const level = Math.max(1, Math.min(6, Number(block.attrs.level) || 2));
          return (
            <Fragment key={index}>
              {htmlNodes(`<h${level}>${block.attrs.content ?? ''}</h${level}>`)}
            </Fragment>
          );
        }
        if (block.name === 'core/buttons')
          return (
            <div key={index} className="wp-block-buttons">
              <NativeAreaContent blocks={block.innerBlocks ?? []} />
            </div>
          );
        if (block.name === 'core/button') {
          const href = safeUrl(block.attrs.url);
          return href ? (
            <div key={index} className="wp-block-button">
              <a className="wp-block-button__link wp-element-button" href={href}>
                {richText(block.attrs.text)}
              </a>
            </div>
          ) : null;
        }
        if (block.name === 'core/image') {
          const src = safeUrl(block.attrs.url ?? block.attrs.src);
          return src ? (
            <figure key={index} className="wp-block-image">
              <img src={src} alt={block.attrs.alt ?? ''} />
            </figure>
          ) : null;
        }
        if (block.name === 'core/paragraph')
          return <p key={index}>{richText(block.attrs.content)}</p>;
        return (
          <Fragment key={index}>
            <NativeAreaContent blocks={block.innerBlocks ?? []} />
          </Fragment>
        );
      })}
    </>
  );
}
