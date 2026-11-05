'use client';
import { Icon } from './icon.js';
export function eyebrowIcon(icon: any, symbol = '—') {
  return icon && typeof icon === 'object' ? icon : { type: symbol === '✦' ? 'spark' : 'dash' };
}
export function EyebrowIcon({
  icon,
  symbol = '—',
  color,
}: {
  icon?: any;
  symbol?: string;
  color?: string;
}) {
  const value = eyebrowIcon(icon, symbol);
  if (value.type === 'none') return null;
  return (
    <span className="site-eyebrow-symbol">
      <Icon icon={value} color={color} />
    </span>
  );
}
