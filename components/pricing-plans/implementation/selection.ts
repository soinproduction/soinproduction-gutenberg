import { selectedRecords, uniqueRecordIds } from '../../../core/relationships/selection.js';

/** Chosen plan ids in saved order without duplicates; no saved choice means every plan. */
export function selectedTariffIds(value: unknown, records: any[] = []) {
  if (Array.isArray(value)) return uniqueRecordIds(value);
  return uniqueRecordIds(records.map((record: any) => record.id));
}
export function selectedTariffs(value: unknown, records: any[] = []) {
  return selectedRecords(selectedTariffIds(value, records), records);
}
