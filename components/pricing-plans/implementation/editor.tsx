import { RelationshipPicker } from '../../../core/editor/relationship.js';
import { uniqueRecordIds } from '../../../core/relationships/selection.js';
import { presentRecordChoices as relationshipRecords } from '../../records/presentation.js';
import { selectedTariffIds } from './selection.js';

/** Sidebar picker of the booking plans a pricing section shows. */
export function TariffsField({ value, site, onChange }: { value: unknown; site: any; onChange: (value: any[]) => void }) {
  const records = site.tariffs ?? [];
  return (
    <RelationshipPicker
      label="Pricing plans"
      records={relationshipRecords(records)}
      value={selectedTariffIds(value, records).map(String)}
      onChange={(keys) => onChange(uniqueRecordIds(keys))}
    />
  );
}
