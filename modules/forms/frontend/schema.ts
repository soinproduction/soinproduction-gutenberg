export const columnCount = (value: unknown) =>
  Math.max(1, Math.min(3, Math.trunc(Number(value)) || 1));
export const fieldTypes = [
  { value: 'text', label: 'Text' },
  { value: 'email', label: 'Email' },
  { value: 'tel', label: 'Phone' },
  { value: 'textarea', label: 'Textarea' },
  { value: 'select', label: 'Select' },
  { value: 'radio', label: 'Radio buttons' },
  { value: 'checkbox', label: 'Checkbox' },
  { value: 'number', label: 'Number' },
  { value: 'date', label: 'Date' },
  { value: 'hidden', label: 'Hidden' },
  { value: 'metric', label: 'Metric / UTM' },
];
export function formFields(data: any = {}) {
  const ids = new Set();
  return (Array.isArray(data.fields) ? data.fields : [])
    .filter(
      (field: any) =>
        field &&
        /^[a-zA-Z][\w-]{0,63}$/.test(field.id ?? '') &&
        !ids.has(field.id) &&
        ids.add(field.id)
    )
    .map((field: any) => ({
      ...field,
      span: columnCount(field.span),
      type: fieldTypes.some((t: any) => t.value === field.type) ? field.type : 'text',
      options: [
        ...new Set(
          (Array.isArray(field.options) ? field.options : [])
            .map(String)
            .map((v: any) => v.trim())
            .filter(Boolean)
        ),
      ].slice(0, 100),
    }));
}
/** Neutral insertion defaults; existing form copy is read from its Gutenberg record. */
export function defaultForm() {
  return {
    columns: 1,
    successAction: 'message',
    heading: 'Contact us',
    submitLabel: 'Send message',
    successEyebrow: 'Message sent',
    successTitle: 'Thank you!',
    successMessage: 'Your message has been received.',
    errorMessage: 'Unable to send your message. Please try again.',
    fields: [
      {
        id: 'name',
        type: 'text',
        label: 'Name',
        placeholder: 'Your name',
        required: true,
        showLabel: true,
      },
      {
        id: 'email',
        type: 'email',
        label: 'Email',
        placeholder: 'Your email',
        required: true,
        showLabel: true,
      },
      {
        id: 'message',
        type: 'textarea',
        label: 'Message',
        placeholder: 'Your message',
        required: false,
        showLabel: true,
      },
    ],
  };
}

/** Sixty tracks support thirds, halves and fifths without rounding gaps. */
export const fieldWidths = [100, 75, 66.6667, 60, 50, 40, 33.3333, 25, 20];
export function fieldTracks(field: any, columns: unknown) {
  const width = Number(field.width);
  return fieldWidths.includes(width)
    ? Math.round(width * 0.6)
    : Math.round(
        (60 * Math.min(columnCount(field.span), columnCount(columns))) / columnCount(columns)
      );
}
