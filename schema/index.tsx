'use client';
import type { FieldDefinition } from '../core/fields/schema.js';
import { Children } from 'react';
import { isValidElement } from 'react';
import type { ReactElement } from 'react';
import type { ReactNode } from 'react';
import { Slider } from '../components/slider/index.js';
import { Accordion } from '../components/accordion/index.js';

/** Reads the fields straight from the markup, so a section has no separate schema. */
export function collectFields(node: ReactNode, fields: FieldDefinition[] = []) {
  Children.forEach(node, (element) => {
    if (!isValidElement(element)) return;
    const props = element.props as any;
    if((element.type===Slider||element.type===Accordion) && props.children)return void collectFields(props.children,fields);
    const describe = (element.type as any)?.field;
    if (!describe) return void collectFields(props.children, fields);
    if (!props.name) throw new Error(`<${(element.type as any).kind}> needs a name`);
    if (fields.some((field) => field.name === props.name)) throw new Error(`Duplicate field "${props.name}"`);
    fields.push({ name: props.name, ...describe(props) });
    if (['list','records'].includes((element.type as any).kind) && props.displaySettings && !props.loop) {
      const settingsName = props.name + 'Display';
      if (fields.some(field => field.name === settingsName)) throw new Error(`Duplicate field "${settingsName}"`);
      fields.push({ name: settingsName, type: 'custom', control: 'list-display', settings: true, scaffold: false,
        label: (props.label ?? 'List') + ' · Display settings', defaultValue: { perPage: props.perPage ?? 7, loading: props.loading ?? 'all' } });
    }
    if ((element.type as any).wraps) collectFields(props.children, fields);
  });
  return fields;
}

export type SectionMeta = { slug: string; title: string; icon?: string; preview?: boolean | string };

/** The view must stay plain markup: move hooks into your own child component. */
export function section(meta: SectionMeta, View: () => ReactElement) {
  return {
    name: `site/${meta.slug}`,
    title: meta.title,
    icon: meta.icon ?? 'layout',
    kind: 'section' as const,
    preview: meta.preview ? `sections/${meta.slug}.${typeof meta.preview === 'string' ? meta.preview.replace(/^preview\./, '') : 'webp'}` : undefined,
    schema: collectFields(View()),
    Component: View,
  };
}
