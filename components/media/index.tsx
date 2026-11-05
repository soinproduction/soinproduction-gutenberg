'use client';
import { Field } from '../../core/fields/render.js';
import { kit } from '../../shared/index.js';
import { Props } from '../../shared/index.js';

export const Media = kit<Props>(
  'media',
  ({ label }) => ({ type: 'media', label: label ?? 'Media' }),
  ({ name, className }) => <Field name={name} className={className} />
);
