import { useRef } from 'react';
import { playbackKeys } from '../../../core/media/universal/model.js';
import { mediaId, rememberMedia } from '../../../core/editor/media.js';

/** Both entry points edit a section-local draft; the attachment is never updated. */
export function useBackgroundSelection(value: any, onChange: (next: any) => void) {
  const drafts = useRef<Record<number, any>>({});
  const currentVideo = value.attachment_id || mediaId(value.video);
  const saved = () => ({
    inherit_poster: value.inherit_poster ?? true,
    poster_id: value.poster_id ?? 0,
    poster_url: value.inherit_poster === false ? (value.poster ?? '') : '',
    inherit_playback: value.inherit_playback ?? true,
    ...Object.fromEntries(playbackKeys.map(key => [key, value[key]])),
  });
  const overrides = (id: number) => drafts.current[id] ?? (id === currentVideo ? saved() : null);
  const scope = { overrides, update: (id: number, patch: any) => { drafts.current[id] = { ...overrides(id), ...patch }; } };
  const setScope = (next: any) => { const bridge = (window as any).SPVideoPreview; if (bridge) bridge.scope = next; };
  return {
    open(open: () => void, video: boolean) { drafts.current = {}; setScope(video ? scope : null); open(); },
    close() { setScope(null); },
    select(media: any, video: boolean) {
      rememberMedia(media);
      const draft = video ? drafts.current[media.id] : null;
      onChange({
        ...value,
        [video ? 'video' : 'image']: media.url,
        ...(video ? {
          webm: '', attachment_id: media.id, library_defaults: media.site_video_defaults,
          ...(media.url !== value.video ? { inherit_playback: true, inherit_poster: true } : {}),
          ...(draft ? {
            inherit_poster: draft.inherit_poster, inherit_playback: draft.inherit_playback,
            poster_id: draft.poster_id ?? 0, poster: draft.poster_url ?? '',
            ...Object.fromEntries(playbackKeys.map(key => [key, draft[key]])),
          } : {}),
        } : { alt: media.alt ?? '' }),
      });
    },
  };
}
