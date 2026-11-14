'use client';
import { useField } from '../../core/fields/render.js';
import { Field } from '../../core/fields/render.js';
import { Props } from '../../shared/index.js';
import { ButtonStylePicker } from '../buttons/shared/index.js';
import { SiteButton } from '../buttons/shared/index.js';
import { kit } from '../../shared/index.js';

export function ButtonView({ name, className, style }: Props & { name: string; style?: string }) {
  const scope = useField(name);
  if (scope.edit)
    return (
      <span className="site-editor-button">
        <Field name={name} className={className} />
        <span className="site-button-tools" contentEditable={false}>
          <ButtonStylePicker button={scope.value ?? {}} onChange={scope.setValue} />
        </span>
      </span>
    );
  return scope.value?.text ? <SiteButton button={scope.value} fallback={style} className={className} /> : null;
}

export const Button = kit<Props & { style?: string }>(
  'button',
  ({ label }) => ({ type: 'link', label: label ?? 'Button' }),
  (props) => <ButtonView {...props} />
);
