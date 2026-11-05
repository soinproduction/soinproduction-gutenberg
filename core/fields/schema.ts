import type { MediaOptions } from '../media/universal/model.js';
import type { ContentAreaDefinition } from '../content/areas/data.js';
export type FieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'toggle'
  | 'select'
  | 'color'
  | 'richText'
  | 'wysiwyg'
  | 'media'
  | 'image'
  | 'gallery'
  | 'icon'
  | 'link'
  | 'buttons'
  | 'repeater'
  | 'group'
  | 'relationship'
  | 'custom'
  | 'content';
export type PostType = string;
export type FieldOptions = {
  label?: string;
  instructions?: string;
  placeholder?: string;
  defaultValue?: any;
  choices?: Record<string, string>;
  min?: number;
  max?: number;
  step?: number;
  postType?: PostType;
  tag?: string;
  settings?: boolean;
  scaffold?: boolean;
  optional?: boolean;
  storage?: 'url';
  control?: string;
  recordField?: string;
  recordMeta?: string;
  recordSource?: string;
  collection?: string;
  basePath?: string | null;
  readOnly?: boolean;
  resolveValue?: (context: { value: any; site: any; record: any }) => any;
  resolveRecords?: boolean;
  fromPosts?: boolean;
  excludeCurrent?: boolean;
  itemType?: 'string';
  controlOptions?: Record<string, unknown>;
  area?: ContentAreaDefinition;
  /** Relationship: cards written by hand can sit among the chosen records. */
  manual?: boolean;
  /** Children of a Drag, each one a block inside the section. */
  elements?: any[];
  media?: MediaOptions;
};
export type FieldDefinition = FieldOptions & {
  name: string;
  type: FieldType;
  fields?: FieldDefinition[];
};
const containers = new Set(['repeater', 'group']);
export function validateFields(schema: FieldDefinition[]): FieldDefinition[] {
  if (!Array.isArray(schema))
    throw new Error('A field schema must be an array. Call fields().build().');
  const names = new Set<string>();
  if (schema.filter((field) => field.type === 'content').length > 1)
    throw new Error(
      'One root content area is allowed per block. Use child container blocks for multiple regions.'
    );
  for (const field of schema) {
    if (
      !/^[a-zA-Z][a-zA-Z0-9_]*$/.test(field.name) ||
      ['constructor', 'prototype', '__proto__'].includes(field.name)
    )
      throw new Error(`Invalid field name: ${field.name}`);
    if (names.has(field.name)) throw new Error(`Duplicate field: ${field.name}`);
    names.add(field.name);
    if (
      field.type === 'content' &&
      (!field.area ||
        !field.area.initializedKey ||
        !Array.isArray(field.area.allowedBlocks) ||
        !field.area.allowedBlocks.length)
    )
      throw new Error('Content area requires allowedBlocks and initializedKey');
    if (
      field.area &&
      (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(field.area.initializedKey) ||
        ['__proto__', 'constructor', 'prototype'].includes(field.area.initializedKey) ||
        field.area.allowedBlocks.some((name) => !/^[a-z][a-z0-9-]*\/[a-z][a-z0-9-]*$/.test(name)))
    )
      throw new Error('Invalid content area block name or initialization key');
    if (
      ![
        'text',
        'textarea',
        'number',
        'toggle',
        'select',
        'color',
        'richText',
        'wysiwyg',
        'media',
        'image',
        'gallery',
        'icon',
        'link',
        'buttons',
        'repeater',
        'group',
        'relationship',
        'custom',
        'content',
      ].includes(field.type)
    )
      throw new Error(`Unknown field type: ${field.type}`);
    if (field.type === 'media') {
      for (const [key, allowed] of [
        ['sources', ['library', 'youtube', 'vimeo']],
        ['displays', ['inline', 'popup']],
      ] as const) {
        const choices = field.media?.[key];
        if (
          choices &&
          (!Array.isArray(choices) ||
            !choices.length ||
            choices.some((choice) => !(allowed as readonly string[]).includes(choice)))
        )
          throw new Error('Invalid media ' + key + ': ' + field.name);
      }
    }
    if (containers.has(field.type)) validateFields(field.fields ?? []);
    if (field.type === 'relationship' && !/^[a-z][a-z0-9_-]*$/i.test(field.postType ?? 'post'))
      throw new Error(`Unsupported post type: ${field.postType}`);
    if (
      field.min !== undefined &&
      (!Number.isInteger(field.min) || field.min < 0) &&
      containers.has(field.type)
    )
      throw new Error(`Invalid minimum: ${field.name}`);
    if (field.max !== undefined && field.min !== undefined && field.max < field.min)
      throw new Error(`Maximum below minimum: ${field.name}`);
    if (field.tag && !['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'span', 'div'].includes(field.tag))
      throw new Error(`Unsupported text tag: ${field.tag}`);
  }
  return schema;
}
export function emptyValue(field: FieldDefinition): any {
  if (field.optional) return undefined;
  if (field.defaultValue !== undefined) return structuredClone(field.defaultValue);
  if (['repeater', 'relationship', 'gallery', 'buttons', 'wysiwyg'].includes(field.type)) return [];
  if (field.type === 'group') return emptyValues(field.fields ?? []);
  if (field.type === 'toggle') return false;
  if (field.type === 'number') return '';
  if (field.type === 'image') return field.storage === 'url' ? '' : { id: 0, url: '', alt: '' };
  if (field.type === 'media') {
    return {
      kind: 'sp-media',
      inherit_playback: true,
      inherit_poster: true,
      source: field.media?.sources?.[0] ?? 'library',
      display: field.media?.displays?.[0] ?? 'inline',
      controls: true,
      playsinline: true,
      custom_play: true,
      autoplay: false,
      muted: false,
      loop: false,
    };
  }
  if (field.type === 'link') return { text: '', url: '' };
  return '';
}
export function emptyValues(schema: FieldDefinition[]) {
  return Object.fromEntries(
    schema.filter((field) => !field.optional).map((field) => [field.name, emptyValue(field)])
  );
}
export class FieldsBuilder {
  private definitions: FieldDefinition[] = [];
  private add(type: FieldType, name: string, options: FieldOptions = {}, children?: FieldsBuilder) {
    this.definitions.push({
      ...options,
      name,
      type,
      ...(children ? { fields: children.build() } : {}),
    });
    validateFields(this.definitions);
    return this;
  }
  addFields(preset: FieldsBuilder) {
    const definitions = [...this.definitions, ...preset.build()];
    validateFields(definitions);
    this.definitions = definitions;
    return this;
  }
  addContentArea(
    name: string,
    area: Omit<ContentAreaDefinition, 'initializedKey'> & { initializedKey?: string },
    options: Omit<FieldOptions, 'area'> = {}
  ) {
    return this.add('content', name, {
      ...options,
      optional: true,
      area: { ...area, initializedKey: area.initializedKey ?? '__' + name + 'Initialized' },
    });
  }
  addCustom(name: string, options: FieldOptions) {
    return this.add('custom', name, options);
  }
  addText(name: string, options?: FieldOptions) {
    return this.add('text', name, options);
  }
  addTextarea(name: string, options?: FieldOptions) {
    return this.add('textarea', name, options);
  }
  addNumber(name: string, options?: FieldOptions) {
    return this.add('number', name, options);
  }
  addTrueFalse(name: string, options?: FieldOptions) {
    return this.add('toggle', name, options);
  }
  addSelect(name: string, options: FieldOptions) {
    return this.add('select', name, options);
  }
  addColorPicker(name: string, options?: FieldOptions) {
    return this.add('color', name, options);
  }
  addRichText(name: string, options?: FieldOptions) {
    return this.add('richText', name, options);
  }
  addWysiwyg(name: string, options?: FieldOptions) {
    return this.add('wysiwyg', name, options);
  }
  addMedia(name: string, options?: FieldOptions) {
    return this.add('media', name, options);
  }
  addImage(name: string, options?: FieldOptions) {
    return this.add('image', name, options);
  }
  addGallery(name: string, options?: FieldOptions) {
    return this.add('gallery', name, options);
  }
  addIcon(name: string, options?: FieldOptions) {
    return this.add('icon', name, options);
  }
  addLink(name: string, options?: FieldOptions) {
    return this.add('link', name, options);
  }
  addButtons(name: string, options?: FieldOptions) {
    return this.add('buttons', name, options);
  }
  addRepeater(name: string, children: FieldsBuilder, options?: FieldOptions) {
    return this.add('repeater', name, options, children);
  }
  addGroup(name: string, children: FieldsBuilder, options?: FieldOptions) {
    return this.add('group', name, options, children);
  }
  addRelationship(name: string, options: FieldOptions = {}) {
    return this.add('relationship', name, { postType: 'post', ...options });
  }
  build(): FieldDefinition[] {
    const clone = (definitions: FieldDefinition[]): FieldDefinition[] =>
      definitions.map(({ resolveValue, fields, area, ...options }) => ({
        ...structuredClone(options),
        ...(area
          ? {
              area: {
                ...structuredClone({
                  ...area,
                  template: undefined,
                  prepare: undefined,
                  initialize: undefined,
                }),
                prepare: area.prepare,
                initialize: area.initialize,
                template:
                  typeof area.template === 'function'
                    ? area.template
                    : structuredClone(area.template),
              },
            }
          : {}),
        ...(resolveValue ? { resolveValue } : {}),
        ...(fields ? { fields: clone(fields) } : {}),
      }));
    return clone(validateFields(this.definitions));
  }
}
export function fields() {
  return new FieldsBuilder();
}
