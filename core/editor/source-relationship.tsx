import { relationshipRecords } from '../fields/records.js';
import { RelationshipPicker } from './relationship.js';
declare const wp: any;
export function SourceRelationship({ field, value, setValue, site }: any) {
  const selection = field.fromPosts ? { mode: 'all' } : value ?? { mode: 'all', ids: [] };
  const records = relationshipRecords(field, site);
  if (field.fromPosts)
    return (
      <wp.components.Notice status="info" isDismissible={false}>
        {field.label}: all published records. Edit the records to change their content or order.
      </wp.components.Notice>
    );
  return (
    <div className="site-field">
      <wp.components.SelectControl
        label={field.label}
        value={selection.mode}
        options={[
          { value: 'all', label: 'All published records' },
          { value: 'selected', label: 'Select records' },
          ...(selection.mode === 'manual' ? [{ value: 'manual', label: 'Saved custom list' }] : []),
        ]}
        onChange={(mode: string) => setValue({ ...selection, mode })}
      />
      {selection.mode === 'selected' && (
        <RelationshipPicker
          label={field.label}
          records={records.map((r: any) => ({ key: String(r.id), label: r.title, image: r.image }))}
          value={(selection.ids ?? []).map(String)}
          onChange={(ids) => setValue({ ...selection, ids: ids.map(Number) })}
        />
      )}
    </div>
  );
}
