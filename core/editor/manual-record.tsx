import { rememberMedia } from './media.js';
import { EditorAction } from '../ui/editor-action.js';
import { useState } from 'react';
declare const wp: any;
/** A page found by search keeps only its path, so the link works on any host of the site. */
export const linkPath = ({ id, kind, url = '' }: { id?: number | string; kind?: string; url?: string }) => {
  if (!['post-type','taxonomy'].includes(kind ?? '') || !/^\d+$/.test(String(id)) || Number(id)<=0 || !/^https?:/.test(url)) return url;
  const { pathname, search, hash } = new URL(url);
  return pathname + search + hash;
};
export const newManualRecord = () => ({
  id: 'manual-' + Date.now().toString(36),
  manual: true,
  title: '',
  excerpt: '',
  image: '',
  alt: '',
  url: '',
});
function LinkModal({ url, onChange, onClose }: { url: string; onChange: (url: string) => void; onClose: () => void }) {
  const { Modal } = wp.components;
  const LinkControl = wp.blockEditor.LinkControl ?? wp.blockEditor.__experimentalLinkControl;
  return (
    <Modal title="Link" className="site-link-modal" onRequestClose={onClose}>
      <LinkControl
        value={{ url }}
        settings={[]}
        onChange={(next: any) => onChange(linkPath(next))}
        onRemove={() => onChange('')}
      />
    </Modal>
  );
}
/** Buttons over a hand-written card: its text is edited on the canvas, these set the rest. */
export function RecordTools({ value, setValue }: any) {
  const { MediaUpload, MediaUploadCheck } = wp.blockEditor;
  const [linkOpen, setLinkOpen] = useState(false);
  return (
    <div className="site-background-tools" contentEditable={false}>
      <MediaUploadCheck>
        <MediaUpload
          allowedTypes={['image']}
          onSelect={(media: any) => {
            rememberMedia(media);
            setValue({ image: media.url, alt: media.alt ?? '' });
          }}
          render={({ open }: any) => (
            <EditorAction action="image" label={value.image ? 'Replace image' : 'Select image'} onClick={open} />
          )}
        />
      </MediaUploadCheck>
      {value.image && <EditorAction action="remove" label="Remove image" onClick={() => setValue({ image: '', alt: '' })} />}
      <EditorAction action="link" label={value.url ? 'Edit link: ' + value.url : 'Add link'} onClick={() => setLinkOpen(true)} />
      {linkOpen && <LinkModal url={value.url ?? ''} onChange={(url) => setValue({ url })} onClose={() => setLinkOpen(false)} />}
    </div>
  );
}
