import { fields } from './schema.js';
/** Composable section controls; opting in does not alter the section's layout. */
export function sectionSettings({
  anchor,
  number = false,
  background,
}: { anchor?: string; number?: boolean; background?: string } = {}) {
  const preset = fields();
  if (anchor !== undefined)
    preset.addText('sectionId', {
      label: 'Section anchor',
      settings: true,
      scaffold: false,
      defaultValue: anchor,
      instructions: 'Unique anchor used in page links. Leave empty to remove.',
    });
  if (number)
    preset.addText('sectionNumber', {
      label: 'Section number',
      settings: true,
      scaffold: false,
      placeholder: '01',
      instructions: 'Leave empty to hide.',
    });
  if (background !== undefined)
    preset.addColorPicker('sectionBackground', {
      label: 'Section background',
      settings: true,
      scaffold: false,
      defaultValue: background,
    });
  return preset;
}

/** Shared native action/content area. Initial button content is supplied by the host renderer. */
export function actionArea() {
  return fields().addContentArea('actions', {
    initializedKey: '__actionsInitialized',
    allowedBlocks: [
      'core/buttons',
      'core/heading',
      'core/paragraph',
      'core/image',
      'core/list',
      'core/quote',
      'core/group',
      'core/columns',
      'core/separator',
      'core/spacer',
    ],
  });
}
