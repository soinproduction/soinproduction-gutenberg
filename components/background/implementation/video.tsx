import {mediaViewportQueries} from '../../../core/responsive/breakpoints.js';
import { useValues } from '../../../core/fields/render.js';
import { useIsEditor } from '../../../core/content/context.js';
import { Button } from '../../../core/ui/button.js';
import { Pause, Play } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

export function StudioVideo({
  background = false,
  media,
  className,
}: {
  background?: boolean;
  className?: string;
  media?: { mp4?: string; webm?: string; poster?: string;autoplay?:boolean;muted?:boolean;loop?:boolean;controls?:boolean;custom_play?:boolean };
}) {
  const video = media ?? {};
  const editor = useIsEditor();
  const ref = useRef<HTMLVideoElement>(null);
  const [active, setActive] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [manualStart, setManualStart] = useState(false);
  useEffect(() => {
    if (editor) return;
    if (!background) {
      setActive(true);
      return;
    }
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const mobile = mediaViewportQueries()[0];
    const automatic = () => !preference.matches && !mobile?.matches && !(navigator as Navigator & {connection?:{saveData?:boolean}}).connection?.saveData;
    const sync = () => {
      setActive(automatic());
      setManualStart(!automatic());
      if (!automatic()) ref.current?.pause();
    };
    sync();
    preference.addEventListener('change', sync);
    mobile?.addEventListener('change', sync);
    const visible = () => {
      if (document.hidden) ref.current?.pause();
      else if (automatic() && (video.autoplay ?? background)) ref.current?.play().catch(() => {});
    };
    document.addEventListener('visibilitychange', visible);
    return () => {
      preference.removeEventListener('change', sync);
      mobile?.removeEventListener('change', sync);
      document.removeEventListener('visibilitychange', visible);
    };
  }, [background, editor, video.autoplay]);
  if (editor)
    return (
      <img
        src={video.poster}
        alt="Відео студії"
        className={
          className ??
          (background
            ? 'absolute inset-0 h-full w-full object-cover'
            : 'aspect-video w-full bg-foreground object-cover')
        }
      />
    );
  return (
    <>
      {background && !active ? <img src={video.poster} alt="Відео студії" loading="eager" fetchPriority="high" className={className ?? 'absolute inset-0 h-full w-full object-cover'} /> : <video
        ref={ref}
        poster={video.poster}
        autoPlay={(video.autoplay ?? background) && active}
        muted={video.muted ?? background}
        loop={video.loop ?? background}
        playsInline
        controls={video.controls ?? !background}
        preload="none"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        aria-label="Відео студії"
        className={
          className ??
          (background
            ? 'absolute inset-0 h-full w-full object-cover'
            : 'aspect-video w-full bg-foreground object-cover')
        }
      >
        {active && (
          <>
            {video.webm && <source src={video.webm} type="video/webm" />}
            {video.mp4 && <source src={video.mp4} type="video/mp4" />}
          </>
        )}
      </video>}
      {background && (video.custom_play !== false || manualStart) && (
        <Button
          variant="outline"
          size="icon"
          title={playing ? 'Призупинити відео' : 'Відтворити відео'}
          aria-label={playing ? 'Призупинити відео' : 'Відтворити відео'}
          className="absolute right-6 top-6 z-10 border-background/40 bg-foreground/30 text-background hover:bg-background hover:text-foreground"
          onClick={() => {
            if (playing) ref.current?.pause();
            else {
              setActive(true);
              requestAnimationFrame(() => ref.current?.play().catch(() => {}));
            }
          }}
        >
          {playing ? <Pause /> : <Play />}
        </Button>
      )}
    </>
  );
}

/** Media comes from this section's Gutenberg settings. */
export function SectionVideo() {
  const { video } = useValues();
  return video?.type === 'image' ? (
    <img src={video.image} alt="" className="aspect-video w-full object-cover" />
  ) : (
    <StudioVideo media={{ mp4: video?.video, webm: video?.webm, poster: video?.poster,autoplay:video?.autoplay,muted:video?.muted,loop:video?.loop,controls:video?.controls }} />
  );
}
