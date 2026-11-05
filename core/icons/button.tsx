'use client';
import { useSite } from '../content/context.js';
import { iconMask } from './library.js';
import type { CSSProperties, ReactNode } from 'react';
export function buttonIconStyle(
  metadata: any = {},
  library: unknown = []
): CSSProperties | undefined {
  const mask = iconMask(metadata.siteButtonIcon, library);
  if (!mask) return undefined;
  return {
    '--site-button-icon': mask,
  } as CSSProperties;
}
export function ButtonLabel({ attributes, children }: { attributes: any; children: ReactNode }) {
  const site = useSite();
  const style = buttonIconStyle(attributes.metadata, site.icons);
  return style ? (
    <span
      className={
        'site-button-label site-button-icon-' +
        (attributes.metadata?.siteButtonIconPosition === 'before' ? 'before' : 'after')
      }
      style={style}
    >
      {children}
    </span>
  ) : (
    <>{children}</>
  );
}
