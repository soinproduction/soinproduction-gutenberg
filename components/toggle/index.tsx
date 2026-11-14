'use client';
import { useClasses, type Classes } from '../../shared/index.js';
import { useValues } from '../../core/fields/render.js';
import type { ReactNode } from 'react';

export function ToggleView({ name, children, ...classes }: Classes & { name: string; label: string; default?: boolean; children?: ReactNode }) {
  const className = useClasses(classes);
  return useValues()[name] ? (className ? <div className={className}>{children}</div> : <>{children}</>) : null;
}

/** Sidebar switch. Wrapped markup shows only while it is on; its fields stay part of the section. */
export const Toggle = Object.assign(ToggleView, {
  kind: 'toggle',
  wraps: true,
  field: ({ label, default: fallback }: any) => ({ type: 'toggle' as const, label, settings: true, defaultValue: Boolean(fallback) }),
});
