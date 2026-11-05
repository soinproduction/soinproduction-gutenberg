'use client';
import { useSite } from '../content/context.js';
import { iconMask } from './library.js';
import { LibraryImage } from '../media/image.js';
import { lineColor } from '../utils/color.js';
export function Icon({
  icon = { type: 'spark' },
  color,
  library,
}: {
  icon?: any;
  color?: string;
  library?: unknown;
}) {
  const site = useSite();
  const mask = iconMask(icon.type, library ?? site.icons);
  if (icon.type === 'none' || (!mask && !(icon.type === 'image' && icon.url))) return null;

  return (
    <span
      aria-hidden="true"
      className="site-marquee-icon flex shrink-0 items-center justify-center text-flame"
      style={lineColor(color) ? { color: lineColor(color) } : undefined}
    >
      {mask ? (
        <span
          style={{
            width: '0.9em',
            height: '0.9em',
            display: 'inline-block',
            backgroundColor: 'currentColor',
            maskImage: mask,
            WebkitMaskImage: mask,
            maskSize: 'contain',
            WebkitMaskSize: 'contain',
            maskRepeat: 'no-repeat',
            WebkitMaskRepeat: 'no-repeat',
            maskPosition: 'center',
            WebkitMaskPosition: 'center',
          }}
        />
      ) : icon.type === 'image' && icon.url ? (
        <LibraryImage src={icon.url} alt="" className="h-[0.9em] w-[0.9em] object-contain" />
      ) : null}
    </span>
  );
}
