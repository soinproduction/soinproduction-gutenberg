'use client';
import { useValues } from '../../core/fields/render.js';
import type { ReactNode } from 'react';

export function ToggleView({ name, children }: { name: string; label: string; default?: boolean; children?: ReactNode }) {
  return <>{useValues()[name] ? children : null}</>;
}

/** Sidebar switch. Wrapped markup shows only while it is on; its fields stay part of the section. */
export const Toggle = Object.assign(ToggleView, {
  kind: 'toggle',
  wraps: true,
  field: ({ label, default: fallback }: any) => ({ type: 'toggle' as const, label, settings: true, defaultValue: Boolean(fallback) }),
});
