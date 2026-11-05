'use client';
import type { ReactNode } from 'react';
import { Classes } from '../../shared/index.js';
import { AddButton } from '../../shared/index.js';

/** Native Gutenberg columns inside Drag; each column owns an independent block flow. */
export function Cols({ children }: Classes & AddButton & { name: string; label?: string; span?: number; start?: number; children: ReactNode }) { return <>{children}</>; }
