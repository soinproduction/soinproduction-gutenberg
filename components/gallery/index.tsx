'use client';
import { Field } from '../../core/fields/render.js';
import { kit } from '../../shared/index.js';
import { Props } from '../../shared/index.js';

export const Gallery = kit<Props & { max?: number }>(
  'gallery',
  ({ label, max }) => ({ type: 'gallery', label: label ?? 'Gallery', max }),
  ({ name, className }) => <Field name={name} className={className} />
);
