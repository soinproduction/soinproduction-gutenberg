import type { ContentBlock } from '../content/context.js';
import type { ComponentType } from 'react';
export type ModuleProps = {
  /** Gutenberg instance ID, supplied only in the editor. */
  clientId?: string;
  kind?: 'section' | 'component' | 'layout';
  data: Record<string, any>;
  blocks?: ContentBlock[];
  site?: any;
  record?: any;
};
export type ModuleDefinition = {
  name: string;
  title: string;
  kind: 'section' | 'component' | 'layout';
  View: ComponentType<ModuleProps>;
  schema: import('../fields/schema.js').FieldDefinition[];
  Component?: ComponentType<any>;
  parent?: string[];
  /** WordPress Dashicon slug used in the block inserter. */
  icon?: string;
  /** Static inserter image, relative to the configured preview asset directory. */
  preview?: string;
};

export type ModuleInfo = Pick<ModuleDefinition, 'name' | 'title' | 'kind' | 'parent' | 'icon' | 'preview'>;
