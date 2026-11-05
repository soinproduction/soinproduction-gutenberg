'use client';
import { useField } from '../../core/fields/render.js';
import { BackgroundMedia } from './implementation/component.js';
import { kit } from '../../shared/index.js';
import { Props } from '../../shared/index.js';

/** Full-size video or image behind the section, chosen in the sidebar. */
export function BackgroundView({ name, className }: { name: string; className?: string }) {
  const scope = useField(name);
  return <BackgroundMedia path={[name]} value={scope.value} className={className} />;
}

export const Background = kit<Props>(
  'background',
  ({ label }) => ({
    type: 'custom',
    label: label ?? 'Video or image',
    settings: true,
    control: 'background',
    defaultValue: { type: 'video', video: '', webm: '', poster: '' },
  }),
  (props) => <BackgroundView name={props.name} className={props.className} />
);
