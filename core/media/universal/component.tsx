'use client';
import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from 'react';
import {mediaViewportQueries} from '../../responsive/breakpoints.js';
import { createPortal } from 'react-dom';
import {
  embedUrl,
  mediaPoster,
  mediaWithDefaults,
  mediaUrl,
  mediaVariants,
  usableMedia,
  type MediaValue,
  type MediaVariant,
} from './model.js';
function viewport() {
  const queries=mediaViewportQueries();
  return queries[0]?.matches?'mobile':queries[1]?.matches?'tablet':'desktop';
}
function subscribe(update: () => void) {
  const queries=mediaViewportQueries();
  queries.forEach(q=>q.addEventListener('change',update));
  return ()=>queries.forEach(q=>q.removeEventListener('change',update));
}
export function UniversalMedia({
  value,
  className = '',
  editor = false,
  style,
}: {
  value: MediaValue;
  className?: string;
  editor?: boolean;
  style?: CSSProperties;
}) {
  value=value.desktop?{...value,desktop:mediaWithDefaults(value.desktop),...(value.tablet?{tablet:mediaWithDefaults(value.tablet)}:{}),...(value.mobile?{mobile:mediaWithDefaults(value.mobile)}:{})}:{...value,...mediaWithDefaults(value)};
  const variants = mediaVariants(value);
  const device = useSyncExternalStore<string>(subscribe, viewport, () => 'pending');
  const activeDevice = (device === 'pending' ? 'desktop' : device) as
    | 'desktop'
    | 'tablet'
    | 'mobile';
  if (
    variants &&
    Object.values(variants).every(
      (item) =>
        item.media_type === 'image' &&
        (item.source ?? 'library') === 'library' &&
        (item.display ?? 'inline') === 'inline'
    )
  ) {
    return (
      <picture className={'sp-media ' + className} style={style}>
        <source media="(max-width:35.99875rem)" srcSet={mediaUrl(variants.mobile.url)} />
        <source media="(max-width:63.99875rem)" srcSet={mediaUrl(variants.tablet.url)} />
        <img
          src={mediaUrl(variants.desktop.url)}
          alt={variants[activeDevice].alt ?? ''}
          loading="lazy"
        />
      </picture>
    );
  }
  if (variants && device === 'pending' && !editor) {
    const poster = mediaPoster(variants.desktop);
    return (
      <div className={'sp-media ' + className} style={style}>
        {poster ? (
          <img src={poster} alt={variants.desktop.alt ?? ''} loading="lazy" />
        ) : (
          <span className="sp-media-placeholder" />
        )}
      </div>
    );
  }
  const selected = variants ? variants[activeDevice] : value;
  return (
    <MediaItem
      key={JSON.stringify(selected)}
      value={selected}
      className={className}
      editor={editor}
      style={style}
    />
  );
}
function MediaItem({
  value,
  className,
  editor,
  style,
}: {
  value: MediaVariant;
  className: string;
  editor: boolean;
  style?: CSSProperties;
}) {
  const [open, setOpen] = useState(false),
    [playing, setPlaying] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  if (!usableMedia(value))
    return editor ? (
      <div className={'sp-media-empty ' + className}>Choose media in the block settings.</div>
    ) : null;
  const display = value.display ?? 'inline';
  const poster = mediaPoster(value),
    video = value.source !== 'library' && value.source ? true : value.media_type === 'video';
  const preview = (
    <>
      {poster ? (
        <img src={poster} alt={value.alt ?? ''} loading="lazy" />
      ) : (
        <span className="sp-media-placeholder">
          {value.source === 'library' ? 'Video' : value.source === 'youtube' ? 'YouTube' : 'Vimeo'}
        </span>
      )}
    </>
  );
  return (
    <div className={`sp-media sp-media--${display} ${className}`} style={style}>
      {editor ? (
        <div className="sp-media-editor-preview">
          {preview}
          <span className="sp-media-badge">
            {display} · {video ? 'Video' : 'Image'}
          </span>
        </div>
      ) : display === 'popup' ? (
        <button
          ref={trigger}
          type="button"
          className="sp-media-trigger"
          onClick={() => setOpen(true)}
          aria-label={video ? 'Play video' : 'Enlarge image'}
        >
          {preview}
          <span className="sp-media-play" aria-hidden>
            {video ? '▶' : '+'}
          </span>
        </button>
      ) : video &&
        display === 'inline' &&
        value.custom_play !== false &&
        !value.autoplay &&
        !playing ? (
        <button
          type="button"
          className="sp-media-trigger"
          onClick={() => setPlaying(true)}
          aria-label="Play video"
        >
          {preview}
          <span className="sp-media-play" aria-hidden>
            ▶
          </span>
        </button>
      ) : (
        <Player value={value} playing={playing} />
      )}
      {open &&
        createPortal(
          <MediaDialog
            value={value}
            onClose={() => {
              setOpen(false);
              trigger.current?.focus();
            }}
          />,
          document.body
        )}
    </div>
  );
}
function Player({ value, playing = false }: { value: MediaVariant; playing?: boolean }) {
  const video = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (playing) void video.current?.play().catch(() => {});
  }, [playing]);
  if (value.source && value.source !== 'library')
    return (
      <iframe
        src={embedUrl(value, playing)}
        title={value.title || 'Video player'}
        allow="autoplay; fullscreen; picture-in-picture"
        allowFullScreen
        loading={playing ? 'eager' : 'lazy'}
        referrerPolicy="strict-origin-when-cross-origin"
      />
    );
  if (value.media_type === 'image')
    return <img src={mediaUrl(value.url)} alt={value.alt ?? ''} loading="lazy" />;
  return (
    <video
      ref={video}
      src={mediaUrl(value.url)}
      poster={mediaUrl(value.poster_url) || undefined}
      autoPlay={playing || !!value.autoplay}
      muted={!!value.muted}
      loop={!!value.loop}
      controls={value.controls !== false}
      playsInline={value.playsinline !== false}
      preload="metadata"
      aria-label={value.title || 'Video'}
    />
  );
}
function MediaDialog({ value, onClose }: { value: MediaVariant; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null),
    close = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const element = dialog.current;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    element?.showModal();
    close.current?.focus();
    return () => {
      element?.close();
      document.body.style.overflow = overflow;
    };
  }, []);
  return (
    <dialog
      className="sp-media-dialog"
      ref={dialog}
      aria-label={value.title || 'Media viewer'}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <button
        type="button"
        ref={close}
        className="sp-media-close"
        onClick={onClose}
        aria-label="Close media"
      >
        ×
      </button>
      <div className="sp-media-dialog-content">
        <Player value={{ ...value, display: 'inline' }} playing={value.media_type !== 'image'} />
      </div>
    </dialog>
  );
}
