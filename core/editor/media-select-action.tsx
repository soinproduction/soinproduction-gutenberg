import { Image, Film, Images, RefreshCw } from 'lucide-react';
declare const wp: any;

/** One media-library affordance shared by background and field controls. */
export function MediaSelectAction({ selected = false, kind = 'image', label, onClick }: {
  selected?: boolean;
  kind?: 'image' | 'video' | 'media' | 'cover';
  label?: string;
  onClick: () => void;
}) {
  const Icon = selected ? RefreshCw : kind === 'video' ? Film : kind === 'media' ? Images : Image;
  const name = kind === 'cover' ? 'cover image' : kind;
  const title = label ?? (selected ? `Replace ${name}` : `Select ${name}`);
  return (
    <wp.components.Button
      className={`site-media-select-action ${selected ? 'is-replace' : 'is-empty'}`}
      onClick={onClick}
      aria-label={title}
      label={selected ? title : undefined}
    >
      <Icon size={selected ? 16 : 22} strokeWidth={1.65} aria-hidden="true" />
      <span className="site-media-select-copy">
        <span>{selected ? 'Replace' : title}</span>
        {!selected && <span className="site-media-select-hint">From Media Library</span>}
      </span>
    </wp.components.Button>
  );
}
