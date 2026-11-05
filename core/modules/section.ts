import type { FieldDefinition } from '../fields/schema.js';
import { useValues } from '../fields/render.js';
/** Every section has one shared anchor control; explicit presets retain their defaults. */
export function sectionFields(schema: FieldDefinition[], kind?: string): FieldDefinition[] {
  if (kind !== 'section' || schema.some((field) => field.name === 'sectionId')) return schema;
  return [
    {
      name: 'sectionId',
      type: 'text',
      label: 'Section anchor',
      settings: true,
      scaffold: false,
      defaultValue: '',
      instructions: 'Optional link target, without #. Spaces become hyphens.',
    },
    ...schema,
  ];
}
export function useSectionAnchor(): string | undefined {
  const anchor = String(useValues().sectionId ?? '')
    .trim()
    .replace(/^#+/, '')
    .replace(/\s+/g, '-');
  return anchor || undefined;
}
