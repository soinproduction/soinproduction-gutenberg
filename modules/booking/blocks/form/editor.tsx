import { SchemaEditor } from '../../../../core/fields/editor.js';
import { Component } from './component.js';
import { moduleInfo,schema } from './schema.js';
export function Edit(props: any) {
  return (
    <SchemaEditor {...props} schema={schema} Component={Component} blockName={moduleInfo.name} />
  );
}
