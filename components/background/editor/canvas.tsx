import { useVideoDefaults } from '../../../core/editor/video-inheritance.js';
import { useBackgroundSelection } from './selection.js';
import { mediaWithDefaults } from '../../../core/media/universal/model.js';
import { MediaSelectAction } from '../../../core/editor/media-select-action.js';
import { EditorAction } from '../../../core/ui/editor-action.js';
import { mediaId } from '../../../core/editor/media.js';
declare const wp: any;
const { MediaUpload, MediaUploadCheck } = wp.blockEditor;
const { Button } = wp.components;
/** Removes the chosen file of the current type, the other one stays. */
const withoutMedia = (value: any) =>
  value.type === 'image'
    ? { ...value, image: '', alt: '' }
    : { ...value, video: '', webm: '', attachment_id: 0, poster: '', poster_id: 0, library_defaults: undefined };
const BACKGROUND_TYPES = [
  { value: 'video', label: 'Video', icon: 'video-alt3' },
  { value: 'image', label: 'Image', icon: 'format-image' },
];
export function BackgroundSettings({ value = {}, onChange }: any) {
  const defaults=useVideoDefaults(value.attachment_id,value.video,value.library_defaults);
  const resolved=mediaWithDefaults({...value,inherit_poster:value.inherit_poster ?? true,poster_url:value.poster},defaults);
  const type = value.type === 'image' ? 'image' : 'video';
  const selection=useBackgroundSelection(value,onChange);
  const picker = (key: string, label: string, allowed: string) => (
    <MediaUploadCheck>
      <MediaUpload
        value={mediaId(value[key])}
        allowedTypes={[allowed]}
        onClose={selection.close}
        onSelect={(media:any)=>selection.select(media,allowed==='video')}
        render={({ open }: any) => (
          <MediaSelectAction selected={Boolean(value[key])} kind={allowed as 'image' | 'video'} label={(value[key] ? 'Replace ' : 'Select ') + label} onClick={() => selection.open(open,allowed==='video')} />
        )}
      />
    </MediaUploadCheck>
  );
  return (
    <div className="site-background-settings">
      <div className="site-segmented" role="radiogroup" aria-label="Background type">
        {BACKGROUND_TYPES.map((option) => (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={type === option.value}
            onClick={() => onChange({ ...value, type: option.value })}
          >
            <span className={'dashicons dashicons-' + option.icon} aria-hidden="true" />
            {option.label}
          </button>
        ))}
      </div>
      {type === 'image' ? (
        <div className="site-media-setting">
          {value.image && <img src={value.image} alt="" />}
          <div className="site-media-actions">
            {picker('image', 'image', 'image')}
            {value.image && <EditorAction action="remove" label="Remove image" onClick={() => onChange(withoutMedia(value))} />}
          </div>
          {value.image && (
            <wp.components.TextControl
              label="Alt text"
              help="From the Media Library; a change here applies to this section only."
              value={value.alt ?? ''}
              onChange={(alt: string) => onChange({ ...value, alt })}
            />
          )}
        </div>
      ) : (
        <div className="site-media-setting">
            {value.video && (
              <video key={value.video} src={value.video} poster={resolved.poster_url || undefined} controls muted playsInline preload="metadata" />
            )}
            {/* Library defaults remain linked until this component overrides them. */}
            <div className="site-media-actions">
            {picker('video', 'video', 'video')}
            {value.video && <EditorAction action="remove" label="Remove video" onClick={() => onChange(withoutMedia(value))} />}
            </div>
        </div>
      )}
    </div>
  );
}
export function BackgroundCanvas({ value = {}, onChange, selected, className = 'absolute inset-0 h-full w-full object-cover' }: any) {
  const selection=useBackgroundSelection(value,onChange);
  const defaults=useVideoDefaults(value.attachment_id,value.video,value.library_defaults);
  const resolved=mediaWithDefaults({...value,inherit_poster:value.inherit_poster ?? true,poster_url:value.poster},defaults);
  const video = value.type !== 'image';
  const preview = video ? resolved.poster_url : value.image;
  return (
    <>
      {video && value.video ? (
        <video
          key={value.video}
          src={value.video}
          poster={resolved.poster_url || undefined}
          aria-hidden
          autoPlay={resolved.autoplay ?? true}
          loop={resolved.loop ?? true}
          muted={resolved.muted ?? true}
          controls={resolved.controls ?? false}
          playsInline
          className={className}
        />
      ) : (
        preview && <img src={preview} alt="Background image" className={className} />
      )}
      {selected && (
        <div className="site-background-tools" contentEditable={false}>
          <MediaUploadCheck>
            <MediaUpload
              value={mediaId(video ? value.video : value.image)}
              allowedTypes={[video ? 'video' : 'image']}
              onClose={selection.close}
              onSelect={(media:any)=>selection.select(media,video)}
              render={({ open }: any) => (
                <Button
                  variant="secondary"
                  icon={video ? 'video-alt3' : 'format-image'}
                  onClick={()=>selection.open(open,video)}
                >
                  {video ? 'Replace video' : 'Replace media'}
                </Button>
              )}
            />
          </MediaUploadCheck>
          {(video ? value.video : value.image) && (
            <EditorAction
              action="remove"
              label={video ? 'Remove video' : 'Remove image'}
              onClick={() => onChange(withoutMedia({ ...value, type: video ? 'video' : 'image' }))}
            />
          )}
        </div>
      )}
    </>
  );
}
