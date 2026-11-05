'use client';
import { Field } from '../../../core/fields/render.js';
import type { ContentPath } from '../../../core/utils/path.js';
import { StudioVideo } from './video.js';
export function BackgroundMedia({ path, value, className = 'absolute inset-0 h-full w-full object-cover' }: { path: ContentPath; value: any; className?: string }) {
  return (
    // The editor canvas draws the same media with the same classes.
    <Field name={path} options={{ mediaClassName: className }}>
      {value?.type === 'image' ? (
        <img
          loading="lazy"
          decoding="async"
          src={value.image}
          alt={value.alt ?? ''}
          aria-hidden={value.alt ? undefined : true}
          className={className}
        />
      ) : (
        <StudioVideo
          background
          className={className}
          media={{ mp4: value?.video, webm: value?.webm, poster: value?.poster,autoplay:value?.autoplay,muted:value?.muted,loop:value?.loop,controls:value?.controls,custom_play:value?.custom_play }}
        />
      )}
    </Field>
  );
}
