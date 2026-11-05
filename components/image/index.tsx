'use client';
import { useField } from '../../core/fields/render.js';
import { Field } from '../../core/fields/render.js';
import { Props } from '../../shared/index.js';
import { kit } from '../../shared/index.js';

export function ImageView({ name, className, width, height }: Props & { name: string; width?: number; height?: number }) {
  const { edit } = useField(name);
  return edit ? (
    <Field name={name} className={className} />
  ) : (
    <Field name={name} imageProps={{ loading: 'lazy', width, height, className }} />
  );
}

/** `width` and `height` are the image proportions for the browser, sizing stays in classes. */
export const Image = kit<Props & { width?: number; height?: number }>(
  'image',
  ({ label }) => ({ type: 'image', label: label ?? 'Image' }),
  (props) => <ImageView {...props} />
);
