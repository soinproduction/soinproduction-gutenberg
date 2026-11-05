export type MediaSource = 'library' | 'youtube' | 'vimeo';
export type MediaDisplay = 'inline' | 'popup';
export type MediaDefaults = {poster_id?: number;poster_url?: string;autoplay?: boolean;muted?: boolean;loop?: boolean;controls?: boolean;custom_play?: boolean};
export type MediaVariant = {
  inherit_playback?: boolean;
  inherit_poster?: boolean;
  library_defaults?: MediaDefaults;
  source?: MediaSource;
  display?: MediaDisplay;
  attachment_id?: number;
  poster_id?: number;
  url?: string;
  poster_url?: string;
  alt?: string;
  title?: string;
  media_type?: 'image' | 'video' | 'embed';
  mime_type?: string;
  autoplay?: boolean;
  muted?: boolean;
  loop?: boolean;
  controls?: boolean;
  playsinline?: boolean;
  custom_play?: boolean;
};
export type MediaValue = MediaVariant & {
  kind: 'sp-media';
  desktop?: MediaVariant;
  tablet?: MediaVariant;
  mobile?: MediaVariant;
};
export type MediaOptions = {
  sources?: MediaSource[];
  displays?: MediaDisplay[];
  responsive?: boolean;
};
export const emptyMedia = (): MediaValue => ({
  kind: 'sp-media',
  source: 'library',
  display: 'inline',
  inherit_playback: true,
  inherit_poster: true,
  playsinline: true,
  custom_play: true,
});
export function mediaUrl(value: unknown) {
  if (typeof value !== 'string' || /[\u0000-\u0020\\]/.test(value)) return '';
  try {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password
      ? url.href
      : '';
  } catch {
    return '';
  }
}
export function providerId(
  input: string,
  provider: MediaSource
): { id: string; hash?: string } | null {
  try {
    const url = new URL(input);
    if (url.protocol !== 'https:' || url.username || url.password) return null;
    const host = url.hostname.replace(/^www\./, '');
    const parts = url.pathname.split('/').filter(Boolean);
    if (
      provider === 'youtube' &&
      [
        'youtube.com',
        'm.youtube.com',
        'music.youtube.com',
        'youtube-nocookie.com',
        'youtu.be',
      ].includes(host)
    ) {
      const id =
        host === 'youtu.be'
          ? parts[0]
          : ['embed', 'shorts', 'live'].includes(parts[0])
            ? parts[1]
            : url.searchParams.get('v');
      return id && /^[A-Za-z0-9_-]{11}$/.test(id) ? { id } : null;
    }
    if (provider === 'vimeo' && ['vimeo.com', 'player.vimeo.com'].includes(host)) {
      const index = parts[0] === 'video' ? 1 : 0;
      const id = parts[index],
        hash = url.searchParams.get('h') ?? parts[index + 1];
      return id && /^\d+$/.test(id) && (!hash || /^[A-Za-z0-9]+$/.test(hash))
        ? { id, ...(hash ? { hash } : {}) }
        : null;
    }
  } catch {
    /* Invalid URLs have no playable result. */
  }
  return null;
}
export function embedUrl(value: MediaVariant, playing = false) {
  const provider = value.source ?? 'library';
  const parsed = providerId(value.url ?? '', provider);
  if (!parsed) return '';
  const autoplay = playing || !!value.autoplay;
  const params = new URLSearchParams({
    autoplay: autoplay ? '1' : '0',
    loop: value.loop ? '1' : '0',
    controls: value.controls === false ? '0' : '1',
    playsinline: value.playsinline === false ? '0' : '1',
  });
  if (provider === 'youtube') {
    params.set('mute', value.muted ? '1' : '0');
    params.set('rel', '0');
    if (value.loop) params.set('playlist', parsed.id);
    return `https://www.youtube-nocookie.com/embed/${parsed.id}?${params}`;
  }
  params.set('muted', value.muted ? '1' : '0');
  params.set('dnt', '1');
  if (parsed.hash) params.set('h', parsed.hash);
  return `https://player.vimeo.com/video/${parsed.id}?${params}`;
}
export function usableMedia(value?: MediaVariant): boolean {
  return (
    !!value &&
    (value.source && value.source !== 'library'
      ? !!embedUrl(value)
      : !!Number(value.attachment_id) &&
        !!mediaUrl(value.url) &&
        ['image', 'video'].includes(value.media_type ?? ''))
  );
}
export function mediaVariants(value: MediaValue) {
  if (!value?.desktop) return null;
  const desktop = value.desktop;
  if (!usableMedia(desktop)) return null;
  const tablet = usableMedia(value.tablet) ? value.tablet! : desktop;
  return { desktop, tablet, mobile: usableMedia(value.mobile) ? value.mobile! : tablet };
}
export function mediaPoster(value: MediaVariant) {
  const poster = mediaUrl(value.poster_url);
  if (poster) return poster;
  if (value.media_type === 'image') return mediaUrl(value.url);
  const parsed = value.source === 'youtube' ? providerId(value.url ?? '', 'youtube') : null;
  return parsed ? `https://i.ytimg.com/vi/${parsed.id}/hqdefault.jpg` : '';
}

export const playbackKeys = ['autoplay','muted','loop','controls','custom_play'] as const;
export function inheritPlayback(value: MediaVariant) {return value.inherit_playback ?? !playbackKeys.some(key=>key!=='custom_play'&&Object.prototype.hasOwnProperty.call(value,key));}
export function inheritPoster(value: MediaVariant) {return value.inherit_poster ?? !value.poster_id;}
export function mediaWithDefaults(value: MediaVariant, defaults: MediaDefaults = value.library_defaults ?? {}): MediaVariant {
  const result={...value};
  if(inheritPlayback(value))for(const key of playbackKeys)if(typeof defaults[key]==='boolean')result[key]=defaults[key];
  if(inheritPoster(value)){result.poster_id=defaults.poster_id ?? 0;result.poster_url=defaults.poster_url ?? '';}
  return result;
}
