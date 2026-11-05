'use client';
import type { ReactNode } from 'react';
import { richNodes } from '../content/rich-text.js';
import { EyebrowIcon } from '../icons/eyebrow.js';
export function Eyebrow({
  text,
  symbol = '—',
  icon,
  iconColor,
  children,
}: {
  children?: ReactNode;
  text: string;
  symbol?: string;
  icon?: any;
  iconColor?: string;
}) {
  return (
    <p className="eyebrow">
      <EyebrowIcon icon={icon} symbol={symbol} color={iconColor} />
      {icon?.type === 'none' ? '' : ' '}
      {children ?? richNodes(text)}
    </p>
  );
}
