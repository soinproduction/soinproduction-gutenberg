export const metricSources = [
  { value: 'utm_source', label: 'UTM source' },
  { value: 'utm_medium', label: 'UTM medium' },
  { value: 'utm_campaign', label: 'UTM campaign' },
  { value: 'utm_content', label: 'UTM content' },
  { value: 'utm_term', label: 'UTM term' },
  { value: 'utm_id', label: 'UTM ID' },
  { value: 'utm_source_platform', label: 'UTM source platform' },
  { value: 'utm_creative_format', label: 'UTM creative format' },
  { value: 'utm_marketing_tactic', label: 'UTM marketing tactic' },
  ...['gclid', 'gbraid', 'wbraid', 'fbclid', 'msclkid', 'ttclid', 'yclid'].map((value) => ({
    value,
    label: value.toUpperCase(),
  })),
  { value: 'page_url', label: 'Page URL (no query or hash)' },
  { value: 'page_path', label: 'Page path' },
  { value: 'page_title', label: 'Page title' },
  { value: 'referrer', label: 'Referrer (no query or hash)' },
  { value: 'language', label: 'Browser language' },
  { value: 'timezone', label: 'Browser timezone' },
  { value: 'query', label: 'Custom UTM parameter' },
];
type Context = {
  url: string;
  referrer?: string;
  title?: string;
  language?: string;
  timezone?: string;
};
export function safeMetricUrl(raw: string) {
  try {
    const url = new URL(raw);
    return ['http:', 'https:'].includes(url.protocol) ? url.origin + url.pathname : '';
  } catch {
    return '';
  }
}
export function metricValue(
  field: any,
  context: Context,
  storage?: Pick<Storage, 'getItem' | 'setItem'>
) {
  const source = field.metricSource ?? 'utm_source';
  let value = '';
  let url: URL;
  try {
    url = new URL(context.url);
  } catch {
    return '';
  }
  if (source === 'page_url') value = safeMetricUrl(context.url);
  else if (source === 'page_path') value = url.pathname;
  else if (source === 'page_title') value = context.title ?? '';
  else if (source === 'referrer') value = safeMetricUrl(context.referrer ?? '');
  else if (source === 'language') value = context.language ?? '';
  else if (source === 'timezone') value = context.timezone ?? '';
  else {
    const key = source === 'query' ? String(field.queryKey ?? '') : source;
    if (/^(?:utm_[a-z0-9_]{1,40}|gclid|gbraid|wbraid|fbclid|msclkid|ttclid|yclid)$/.test(key))
      value = url.searchParams.get(key) ?? '';
  }
  value = value.replace(/[\u0000-\u001f]/g, '').slice(0, 500);
  if (field.remember && storage) {
    try {
      const key =
        'fe-attribution:' + source + ':' + (source === 'query' ? field.queryKey ?? '' : '');
      const saved = storage.getItem(key);
      if (saved !== null) return saved.slice(0, 500);
      if (value) storage.setItem(key, value);
    } catch {
      /* storage may be disabled */
    }
  }
  return value;
}
