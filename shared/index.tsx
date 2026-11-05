'use client';
import { useFieldScope } from '../core/fields/render.js';
import type { FieldDefinition } from '../core/fields/schema.js';
import type { ReactNode } from 'react';

export type Classes = {
  className?: string;
  /** Applied only in the editor. */
  adminClassName?: string;
  /** Applied only on the site. */
  frontClassName?: string;
  /** Inside Drag: `false` keeps the element out of a new section, the inserter still offers it. */
  initial?: boolean;
};

export type Props = Classes & { name?: string; label?: string };

/** The editor's add button: where it sits and what it says. */
export type AddButton = {
  buttonPosition?: `${'top' | 'bottom'} ${'left' | 'center' | 'right'}`;
  buttonText?: string;
};

export const addClasses = (position?: string) => position?.split(' ').map((part) => 'is-' + part).join(' ');

export type Kit<P> = ((props: P) => ReactNode) & {
  kind: string;
  field: (props: P) => Omit<FieldDefinition, 'name'>;
};

export function kit<P extends Props>(
  kind: string,
  field: Kit<P>['field'],
  render: (props: P & { name: string }) => ReactNode
) {
  function Component(props: P) {
    return render({ ...props, className: useClasses(props) } as P & { name: string });
  }
  return Object.assign(Component, { kind, field });
}

export function useClasses({ className, adminClassName, frontClassName }: Classes) {
  const { edit } = useFieldScope();
  return [className, edit ? adminClassName : frontClassName].filter(Boolean).join(' ') || undefined;
}
