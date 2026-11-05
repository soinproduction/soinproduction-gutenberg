'use client';
import { MediaSelectAction } from '../../editor/media-select-action.js';
import { VideoInheritance, useVideoDefaults } from '../../editor/video-inheritance.js';
import { rememberMedia } from '../../editor/media.js';
import { mediaWithDefaults } from './model.js';
import { SelectControl } from '../../../ui/select.js';
import { useState } from 'react';
import { Image, Video, Monitor, Tablet, Smartphone, Trash2 } from 'lucide-react';
import {
  emptyMedia,
  providerId,
  type MediaOptions,
  type MediaValue,
  type MediaVariant,
  type MediaSource,
  type MediaDisplay,
} from './model.js';
declare const wp: any;
const sources: Record<MediaSource, string> = {
  library: 'Media library',
  youtube: 'YouTube',
  vimeo: 'Vimeo',
};
const displays: Record<MediaDisplay, string> = {
  inline: 'Inline',
  popup: 'Popup',
};
export function MediaEditor({
  value,
  onChange,
  options = {},
  label = 'Media',
}: {
  value?: MediaValue;
  onChange: (value: MediaValue) => void;
  options?: MediaOptions;
  label?: string;
}) {
  const [device, setDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const base = value?.kind === 'sp-media' ? value : emptyMedia();
  const responsive = !!options.responsive;
  const desktopValue: MediaVariant =
    base.desktop ??
    Object.fromEntries(
      Object.entries(base).filter(([key]) => !['kind', 'desktop', 'tablet', 'mobile'].includes(key))
    );
  const variant: MediaVariant = responsive
    ? base[device] ?? (device === 'desktop' ? desktopValue : {})
    : base;
  const defaults=useVideoDefaults(variant.attachment_id,variant.url,variant.library_defaults);
  const effective=mediaWithDefaults(variant,defaults);
  const update = (patch: Partial<MediaVariant>) => {
    const next = { ...variant, ...patch };
    if (!availableSources.includes(next.source ?? 'library')) next.source = availableSources[0];
    if (!availableDisplays.includes(next.display ?? 'inline')) next.display = availableDisplays[0];
    onChange(
      responsive
        ? {
            kind: 'sp-media',
            desktop: desktopValue,
            tablet: base.tablet,
            mobile: base.mobile,
            [device]: next,
          }
        : { ...base, ...next }
    );
  };
  const reset = () => {
    if (responsive) {
      const next = { ...base, kind: 'sp-media' as const, desktop: desktopValue };
      delete next[device];
      if (device === 'desktop') next.desktop = {};
      onChange(next);
    } else onChange(emptyMedia());
  };
  const source = variant.source ?? 'library',
    display = variant.display ?? options.displays?.[0] ?? 'inline';
  const availableSources = options.sources?.length
    ? options.sources
    : (Object.keys(sources) as MediaSource[]);
  const availableDisplays = options.displays?.length
    ? options.displays
    : (Object.keys(displays) as MediaDisplay[]);
  const currentSource = availableSources.includes(source) ? source : availableSources[0];
  const isVideo = currentSource !== 'library' || variant.media_type === 'video';
  const { Button, TextControl, ToggleControl, } = wp.components;
  const { MediaUpload, MediaUploadCheck } = wp.blockEditor;
  const select = (poster = false) => (
    <MediaUploadCheck>
      <MediaUpload
        allowedTypes={poster ? ['image'] : ['image', 'video']}
        value={poster ? variant.poster_id : variant.attachment_id}
        onSelect={(asset: any) => { rememberMedia(asset);wp.data.dispatch('core').invalidateResolution('getMedia',[asset.id]);
          update(
            poster
              ? { poster_id: asset.id, poster_url: asset.url }
              : {
                  source: 'library',
                  ...(asset.id!==variant.attachment_id?{inherit_playback:true,inherit_poster:true}:{}),
                  library_defaults:asset.site_video_defaults,
                  attachment_id: asset.id,
                  url: asset.url,
                  media_type: asset.type === 'video' ? 'video' : 'image',
                  mime_type: asset.mime,
                  alt: asset.alt ?? '',
                  title: asset.title ?? '',
                }
          );}
        }
        render={({ open }: any) => (
          <MediaSelectAction selected={Boolean(poster ? variant.poster_id || variant.poster_url : variant.attachment_id || variant.url)} kind={poster ? 'cover' : 'media'} onClick={open} />
        )}
      />
    </MediaUploadCheck>
  );
  return (
    <div className="sp-media-control">
      <div className="sp-media-control-heading">
        <strong>{label}</strong>
        <span>
          <Image size={16} />
          <Video size={16} />
        </span>
      </div>
      {responsive && (
        <div
          className="sp-media-tabs sp-media-device-tabs"
          role="group"
          aria-label="Media breakpoint"
        >
          {(
            [
              ['desktop', Monitor],
              ['tablet', Tablet],
              ['mobile', Smartphone],
            ] as const
          ).map(([name, Icon]) => (
            <button
              type="button"
              key={name}
              title={name}
              aria-label={name}
              aria-pressed={device === name}
              onClick={() => setDevice(name)}
            >
              <Icon size={16} />
              <span>{name}</span>
            </button>
          ))}
        </div>
      )}
      {responsive && device !== 'desktop' && !base[device]?.url && (
        <p className="sp-media-help">
          Inherits the nearest wider screen until you choose separate media.
        </p>
      )}
      <div className="sp-media-tabs" role="group" aria-label="Media source">
        {availableSources.map((item) => (
          <button
            type="button"
            key={item}
            aria-pressed={currentSource === item}
            onClick={() =>
              update({
                source: item,
                attachment_id: 0,
                url: '',
                media_type: item === 'library' ? undefined : 'embed',
              })
            }
          >
            {sources[item]}
          </button>
        ))}
      </div>
      {currentSource === 'library' ? (
        <>
          <div className="sp-media-control-preview">
            {variant.url ? (
              variant.media_type === 'video' ? (
                <video
                  src={variant.url}
                  poster={effective.poster_url}
                  muted
                  controls
                  preload="metadata"
                />
              ) : (
                <img src={variant.url} alt={variant.alt ?? ''} />
              )
            ) : (
              <span>
                <Image size={28} />
                Image or video from your media library
              </span>
            )}
          </div>
          <div className="sp-media-control-actions">
            {select()}
            <Button
              icon={<Trash2 size={16} />}
              label="Remove media"
              isDestructive
              onClick={reset}
              disabled={!variant.url}
            />
          </div>
          {variant.media_type === 'image' && (
            <TextControl
              label="Alternative text"
              value={variant.alt ?? ''}
              onChange={(alt: string) => update({ alt })}
            />
          )}
        </>
      ) : (
        <>
          <TextControl
            label={sources[currentSource] + ' URL'}
            type="url"
            placeholder={
              currentSource === 'youtube'
                ? 'https://www.youtube.com/watch?v=…'
                : 'https://vimeo.com/…'
            }
            value={variant.url ?? ''}
            onChange={(url: string) => update({ source: currentSource, url, media_type: 'embed' })}
          />
          {variant.url && !providerId(variant.url, currentSource) && (
            <p className="sp-media-error">
              Enter a valid HTTPS {sources[currentSource]} video URL.
            </p>
          )}
          <TextControl
            label="Accessible title"
            value={variant.title ?? ''}
            onChange={(title: string) => update({ title })}
          />
        </>
      )}
      <SelectControl
        label="Display"
        value={availableDisplays.includes(display) ? display : availableDisplays[0]}
        options={availableDisplays.map((value) => ({ value, label: displays[value] }))}
        onChange={(display: string) => update({ display: display as MediaDisplay })}
      />
      {isVideo && (
        <>
          <VideoInheritance value={variant} defaults={defaults} onChange={update} library={currentSource==='library'} />
          <details className="sp-media-advanced">
            <summary>Playback settings</summary>
            {(
              [
                ['playsinline', 'Play inline on mobile'],
                ['custom_play', 'Custom play button'],
              ] as const
            ).map(([key, label]) => (
              <ToggleControl
                key={key}
                label={label}
                checked={variant[key] ?? ['controls', 'playsinline', 'custom_play'].includes(key)}
                onChange={(checked: boolean) => update({ [key]: checked })}
              />
            ))}
            <p className="sp-media-help">Browsers usually require muted video for autoplay.</p>
          </details>
        </>
      )}
    </div>
  );
}
