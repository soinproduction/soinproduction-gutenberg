import { useSite } from '../content/context.js';
import { libraryIcons } from '../icons/library.js';
import { Icon } from '../icons/icon.js';
import { Ban, ImagePlus } from 'lucide-react';
import { useState } from 'react';
declare const wp: any;
const { TextControl } = wp.components;
export function IconPicker({ value, onChange, allowImage = true, allowNone = true, library }: any) {
  const [search, setSearch] = useState('');
  const [choosing, setChoosing] = useState(false);
  const [source, setSource] = useState('all');
  const site = useSite();
  const custom = libraryIcons(library ?? site.icons);
  const sources = Array.from(new Set(custom.map((icon) => icon.set)));
  const all = custom;
  const query = search.trim().toLowerCase();
  const options = all.filter(
    (option) =>
      !['image', 'none'].includes(option.value) &&
      (source === 'all' || option.set === source) &&
      (!query || option.label.toLowerCase().includes(query) || option.value.includes(query))
  );
  const tile = (option: any) => (
    <button
      key={option.value}
      type="button"
      className="site-icon-option"
      aria-label={option.label}
      title={option.label}
      aria-pressed={(value?.type ?? 'spark') === option.value}
      onClick={() => {
        if (option.value === 'none') setChoosing(false);
        onChange(option.value === value?.type ? value : { type: option.value });
      }}
    >
      {option.value === 'image' ? (
        <ImagePlus aria-hidden="true" />
      ) : option.value === 'none' ? (
        <Ban aria-hidden="true" />
      ) : (
        <Icon icon={{ type: option.value }} library={custom} />
      )}
    </button>
  );
  if (value?.type === 'none' && !choosing) return (
    <fieldset className="site-icon-picker">
      <legend>Icon</legend>
      <wp.components.Button variant="secondary" onClick={() => setChoosing(true)} aria-expanded={false}>
        Choose icon
      </wp.components.Button>
    </fieldset>
  );
  return (
    <fieldset className="site-icon-picker">
      <legend>Icon</legend>
      <TextControl
        label="Search icons"
        hideLabelFromVision
        placeholder="Search icons…"
        value={search}
        onChange={setSearch}
      />
      <wp.components.SelectControl
        label="Icon set"
        value={source}
        options={[
          { value: 'all', label: 'All icon sets' },
          ...sources.map((set) => ({ value: set, label: set })),
        ]}
        onChange={setSource}
      />
      <div className="site-icon-picker-grid site-icon-library" aria-label="Icon library">
        {options.map(tile)}
      </div>
      {!options.length && <p className="site-icon-empty">No icons found.</p>}
      <div className="site-icon-picker-alternatives">
        {[
          { value: 'image', label: 'Media Library' },
          ...(allowNone ? [{ value: 'none', label: 'No icon' }] : []),
        ]
          .filter(
            (option) =>
              ['image', 'none'].includes(option.value) && (allowImage || option.value !== 'image')
          )
          .map(tile)}
        <span>{allowImage ? 'Media Library / no icon' : 'No icon'}</span>
      </div>
    </fieldset>
  );
}
