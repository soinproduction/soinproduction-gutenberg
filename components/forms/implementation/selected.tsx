'use client';
import { useContext } from 'react';
import { ContentContext, ContentProvider } from '../../../core/content/context.js';
import { useValues } from '../../../core/fields/render.js';
import { StudioForm } from './component.js';
import { defaultForm } from '../../../modules/forms/frontend/schema.js';

/** A published form record chosen in the sidebar; the form itself is edited as a record. */
export function SelectedForm({ name, className }: { name: string; className?: string }) {
  const { site, editor } = useContext(ContentContext);
  const id = Number(useValues()[name]);
  const form = (site.forms ?? []).find((item: any) => Number(item.id) === id);
  if (!form) return editor ? <p className={className}>Choose a form in the sidebar.</p> : null;
  return (
    <div className={className}>
      <ContentProvider data={form.data} site={site}>
        <StudioForm key={form.id} data={{ ...defaultForm(), ...form.data }} formId={form.id} editor={editor} />
      </ContentProvider>
    </div>
  );
}
