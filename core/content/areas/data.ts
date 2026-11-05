import type { ContentBlock } from '../context.js';
import { templateBlocks } from '../template.js';
export type BlockTemplate = [string, Record<string, any>?, BlockTemplate[]?];
export type ContentAreaDefinition = {
  allowedBlocks: string[];
  initializedKey: string;
  template?: BlockTemplate[] | ((data: any, site: any) => BlockTemplate[]);
  templateLock?: 'all' | 'insert' | false;
  appender?: boolean;
  prepare?: (blocks: ContentBlock[], data: any, site: any) => ContentBlock[];
  initialize?: (data: any, site: any) => Record<string, any>;
};
/** Initial templates never replace saved content, including an intentionally empty area. */
export function areaBlocks(
  definition: ContentAreaDefinition,
  data: any,
  existing: ContentBlock[] = [],
  site: any = {}
): ContentBlock[] {
  if (data[definition.initializedKey] || existing.some((block) => block.name !== 'core/buttons'))
    return definition.prepare?.(existing, data, site) ?? existing;
  const template =
    typeof definition.template === 'function'
      ? definition.template(data, site)
      : definition.template ?? [];
  const defaults = templateBlocks(template);
  const buttons = existing.filter((block) => block.name === 'core/buttons');
  const blocks = [
    ...defaults.filter((block) => block.name !== 'core/buttons' || !buttons.length),
    ...buttons,
  ];
  return definition.prepare?.(blocks, data, site) ?? blocks;
}
