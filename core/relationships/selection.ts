export function relationshipChoices(records: any, value: any, search: any = '') {
  const selected = new Set(value);
  const query = search.trim().toLocaleLowerCase();
  return records.filter(
    (record: any) =>
      record.available !== false &&
      !selected.has(record.key) &&
      (!query || `${record.label} ${record.description ?? ''}`.toLocaleLowerCase().includes(query))
  );
}
export function moveRelationship<T>(value: T[], from: number, boundary: number) {
  const next = [...new Set(value)];
  if (from < 0 || from >= next.length) return next;
  const [item] = next.splice(from, 1);
  next.splice(
    Math.max(0, Math.min(next.length, boundary > from ? boundary - 1 : boundary)),
    0,
    item
  );
  return next;
}
export type Choice = {
  key: string;
  label: string;
  image?: string;
  description?: string;
  available?: boolean;
};
export function recordChoices<T extends Record<string, any>>(
  records: T[],
  options: {
    label?: (record: T) => string;
    image?: (record: T) => string | undefined;
    description?: (record: T) => string | undefined;
  } = {}
): Choice[] {
  return records.map((record) => ({
    key: String(record.id),
    label: options.label?.(record) ?? record.title ?? 'Untitled record',
    image: options.image?.(record) ?? record.image,
    description: options.description?.(record) ?? record.description,
  }));
}

export function uniqueRecordIds(ids: unknown[] = []): number[] {
  return [...new Set(ids.map(Number).filter((id: any) => Number.isInteger(id) && id > 0))];
}

export function availableRecords(ids: any, records: any, currentId: any = 0) {
  const used = new Set(uniqueRecordIds(ids).filter((id: any) => id !== Number(currentId)));
  return records.filter((record: any) => !used.has(Number(record.id)));
}

export function selectedRecords(value: any, records: any[]) {
  const seen = new Set<number>();
  return (Array.isArray(value) ? value : []).flatMap((item) => {
    if (item && typeof item === 'object') return item.manual ? [item] : [];
    const id = Number(item);
    if (seen.has(id)) return [];
    seen.add(id);
    const record = records.find((entry) => Number(entry.id) === id);
    return record ? [record] : [];
  });
}
