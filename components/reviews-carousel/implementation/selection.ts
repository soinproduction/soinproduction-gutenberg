import { selectedRecords, uniqueRecordIds } from '../../../core/relationships/selection.js';

/** Chosen review ids in saved order without duplicates; no saved choice means every review. */
export function selectedReviewIds(value: unknown, records: any[] = []) {
  if (Array.isArray(value)) return uniqueRecordIds(value);
  return uniqueRecordIds(records.map((record: any) => record.id));
}
export function selectedReviews(value: unknown, records: any[] = []) {
  return selectedRecords(selectedReviewIds(value, records), records);
}
