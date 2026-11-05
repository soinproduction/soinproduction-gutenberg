'use client';
import { Field } from '../../core/fields/render.js';
import { kit } from '../../shared/index.js';
import { Props } from '../../shared/index.js';
import { AddButton } from '../../shared/index.js';
import { addClasses } from '../../shared/index.js';

export const Paragraphs = kit<Props & AddButton & { paragraphClassName?: string }>(
  'paragraphs',
  ({ label }) => ({ type: 'wysiwyg', label: label ?? 'Paragraphs' }),
  ({ name, className, paragraphClassName, buttonPosition, buttonText }) => (
    <Field
      name={name}
      className={className}
      options={{ paragraphClass: paragraphClassName, addClass: addClasses(buttonPosition), addText: buttonText }}
    />
  )
);
