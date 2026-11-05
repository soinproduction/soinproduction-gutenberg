'use client';
import { ContentContext, ContentProvider } from '../content/context.js';
import { sectionFields } from './section.js';
import { type ContentRendererProps, FieldScope } from '../fields/render.js';
import type { FieldDefinition } from '../fields/schema.js';
import { valuesFor } from '../fields/values.js';
import type { ModuleDefinition, ModuleProps } from './types.js';
import type { ComponentType } from 'react';
import { useContext } from 'react';
export function defineModule(config: {
  name: string;
  title: string;
  kind: 'section' | 'component' | 'layout';
  schema: FieldDefinition[];
  Component: ComponentType;
  Content?: ComponentType<ContentRendererProps>;
  parent?: string[];
  icon?: string;
  preview?: string;
}): ModuleDefinition {
  const schema = sectionFields(config.schema, config.kind);
  function View({ data, site = {}, blocks = [], record }: ModuleProps) {
    const parent = useContext(ContentContext);
    const currentRecord = record ?? parent.record;
    const resolvedValue = valuesFor(schema, data, site, currentRecord);
    return (
      <ContentProvider data={resolvedValue} site={site} record={currentRecord} innerBlocks={blocks}>
        <FieldScope
          Content={config.Content}
          schema={schema}
          value={data}
          resolvedValue={resolvedValue}
          site={site}
          record={currentRecord}
          blockName={config.name}
        >
          <config.Component />
        </FieldScope>
      </ContentProvider>
    );
  }
  return { ...config, schema, View };
}
