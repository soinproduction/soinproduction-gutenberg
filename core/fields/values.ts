import { selectedRecords } from '../relationships/selection.js';

import { relationshipRecords } from './records.js';
import { emptyValues,type FieldDefinition } from './schema.js';
import { parseDocument } from 'htmlparser2';
/** Explicit schema bindings: stored values, current record attributes and live collections. */
export function valuesFor(
  schema: FieldDefinition[],
  stored: any = {},
  site: any = {},
  record: any = {}
) {
  const data = { ...emptyValues(schema), ...stored };
  for (const field of schema) {
    if (field.recordField && Object.hasOwn(record, field.recordField)) {
      const text = (nodes: any[]): string =>
        nodes
          .map((node) =>
            node.type === 'text' ? node.data : node.children ? text(node.children) : ''
          )
          .join('');
      const current = text(parseDocument(String(data[field.name] ?? '')).children);
      if (current !== String(record[field.recordField] ?? ''))
        data[field.name] = record[field.recordField];
    }
    if (field.recordSource && Object.hasOwn(record, field.recordSource))
      data[field.name] = record[field.recordSource];
    if (field.resolveValue)
      data[field.name] = field.resolveValue({ value: data[field.name], site, record });
    if (field.type !== 'relationship' || !field.resolveRecords) continue;
    const selection = stored[field.name];
    const mode = field.fromPosts ? 'all' : selection?.mode ?? 'all';
    const records = relationshipRecords(field, site);
    let selected =
      mode === 'manual'
        ? selection.items ?? []
        : mode === 'selected'
          ? selectedRecords(selection.ids ?? [], records)
          : records;
    if (field.excludeCurrent) selected = selected.filter((r: any) => r.slug !== record.slug);
    if (!field.fromPosts && selection?.overrides)
      selected = selected.map((r: any) => ({
        ...r,
        ...selection.overrides[r.id],
        ...(r.data && selection.overrides[r.id]?.data
          ? { data: { ...r.data, ...selection.overrides[r.id].data } }
          : {}),
      }));
    data[field.name] = selected;
  }
  return data;
}
export function fieldAt(
  schema: FieldDefinition[],
  path: (string | number)[]
): FieldDefinition | undefined {
  let field = schema.find((f) => f.name === path[0]);
  for (const key of path.slice(1)) {
    if (typeof key === 'number') {
      if (field?.itemType === 'string') field = { name: String(key), type: 'richText' };
      continue;
    }
    field = field?.fields?.find((f) => f.name === key);
  }
  return field;
}
