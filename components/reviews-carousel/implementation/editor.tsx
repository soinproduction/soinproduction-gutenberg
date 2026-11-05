import { RelationshipPicker } from '../../../core/editor/relationship.js';
import { uniqueRecordIds } from '../../../core/relationships/selection.js';
import { presentRecordChoices as relationshipRecords } from '../../records/presentation.js';
import { selectedReviewIds } from './selection.js';

/** Sidebar picker of the reviews a carousel shows. */
export function ReviewsField({ value, site, onChange }: { value: unknown; site: any; onChange: (value: any[]) => void }) {
  const records = site.reviews ?? [];
  return (
    <RelationshipPicker
      label="Reviews"
      records={relationshipRecords(records)}
      value={selectedReviewIds(value, records).map(String)}
      onChange={(keys) => onChange(uniqueRecordIds(keys))}
    />
  );
}
