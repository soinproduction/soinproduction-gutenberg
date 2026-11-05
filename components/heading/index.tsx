'use client';
import { Field } from '../../core/fields/render.js';
import { kit } from '../../shared/index.js';
import { Props } from '../../shared/index.js';

export const Heading = kit<Props & { level?: 1 | 2 | 3 | 4 }>(
  'heading',
  ({ label, level = 2 }) => ({ type: 'richText', tag: `h${level}`, label: label ?? 'Heading' }),
  ({ name, level = 2, className }) => <Field name={name} as={`h${level}`} className={className} />
);
