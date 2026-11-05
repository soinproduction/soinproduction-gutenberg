'use client';
import { useValues } from '../../core/fields/render.js';
import { useFieldScope } from '../../core/fields/render.js';
import type { ReactNode } from 'react';

export function Show({ when, is, children }: { when: string | string[]; is?: string; children: ReactNode }) {
  const values = useValues();
  const scope = useFieldScope();
  const visible = Array.isArray(when)
    ? Boolean(scope.edit) || when.some(name => {
        const value = scope.value[name];
        return typeof value === 'string' ? Boolean(value.replace(/<[^>]*>|&nbsp;|\u00a0/g, '').trim()) : Boolean(value);
      })
    : is === undefined ? values[when] : values[when] === is;
  return <>{visible ? children : null}</>;
}
