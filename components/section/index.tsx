'use client';
import { useValues } from '../../core/fields/render.js';
import { useFieldScope } from '../../core/fields/render.js';
import { useSectionAnchor } from '../../core/modules/section.js';
import type { ReactNode } from 'react';
import { Classes } from '../../shared/index.js';
import { useClasses } from '../../shared/index.js';

/** Root of every section: connects the anchor from "Section settings". */
export function Section({ when, children, ...classes }: Classes & { when?: string; children: ReactNode }) {
  const className = useClasses(classes);
  const values = useValues();
  const editor = useFieldScope().edit;
  const anchor = useSectionAnchor();
  if (when && !editor && !(Array.isArray(values[when]) ? values[when].length : values[when])) return null;
  return (
    <section id={anchor} className={className}>
      {children}
    </section>
  );
}
