'use client';
import { Field } from '../../core/fields/render.js';
import { kit } from '../../shared/index.js';
import { Props } from '../../shared/index.js';

/** `settings` also shows the field in the sidebar, `placeholder` replaces the label on the canvas. */
export const Text = kit<Props & { settings?: boolean; placeholder?: string }>(
  'text',
  ({ label, settings, placeholder }) => ({ type: 'richText', tag: 'p', label: label ?? 'Text', settings, placeholder }),
  ({ name, className }) => <Field name={name} as="p" className={className} />
);
