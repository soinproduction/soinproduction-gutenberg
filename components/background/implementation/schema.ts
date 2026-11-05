import { fields } from '../../../core/fields/schema.js';
/** Section-owned media; no shared video fallback or static asset paths. */
export function videoSettings() {
  return fields().addCustom('video', {
    label: 'Video or image',
    settings: true,
    control: 'background',
    defaultValue: { type: 'video', video: '', webm: '', poster: '' },
  });
}
