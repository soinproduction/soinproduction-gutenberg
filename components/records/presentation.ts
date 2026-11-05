import { recordChoices } from '../../core/relationships/selection.js';
export function presentRecordChoices(records: any[]) {
  return recordChoices(records, {
    label: (record) => record.title ?? record.author ?? 'Untitled record',
    image: (record) => record.image ?? record.avatar,
    description: (record) =>
      record.author && record.author !== record.title
        ? record.author
        : record.data?.featured
          ? 'Popular pricing plan'
          : undefined,
  });
}
