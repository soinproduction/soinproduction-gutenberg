'use client';
import { SelectedForm } from './implementation/selected.js';
import { kit } from '../../shared/index.js';
import { Props } from '../../shared/index.js';

/** A published form chosen in the sidebar. */
export const Form = kit<Props>(
  'form',
  ({ label }) => ({ type: 'custom', control: 'form-selection', label: label ?? 'Form', settings: true, optional: true }),
  ({ name, className }) => <SelectedForm name={name} className={className} />
);
