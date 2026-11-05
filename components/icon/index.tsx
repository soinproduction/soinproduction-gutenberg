'use client';
import { Field } from '../../core/fields/render.js';
import { kit } from '../../shared/index.js';
import { Props } from '../../shared/index.js';

/** `default` is the icon of new content; "No icon" stays empty. */
export const Icon = kit<Props & { default?: string; settings?: boolean }>(
  'icon',
  ({ label, default: fallback, settings }) => ({ type: 'icon', label: label ?? 'Icon', defaultValue: fallback, settings }),
  ({ name, className }) => <Field name={name} className={className} />
);
