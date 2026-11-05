'use client';
import type { ListLoading } from '../list/loading.js';
import { useFieldScope } from '../../core/fields/render.js';
import { Relationship } from '../../core/fields/render.js';
import type { ReactNode } from 'react';
import { kit } from '../../shared/index.js';
import { Props } from '../../shared/index.js';
import { AddButton } from '../../shared/index.js';
import { addClasses } from '../../shared/index.js';

/** Sidebar option. Its value drives <Show>, nothing is rendered in the layout. */
/** Records of a post type chosen in the sidebar; children are the markup of one record. `manual` also allows cards written by hand. */
export const Records = kit<Props & AddButton & { type: string; max?: number; manual?: boolean; latest?:number; modeField?:string; displaySettings?: boolean; perPage?: number; loading?: ListLoading; children: ReactNode }>(
  'records',
  ({ label, type, max, manual, latest, modeField }) => ({ controlOptions:{latest,modeField}, type: 'relationship', label: label ?? 'Records', postType: type, max, manual, defaultValue: [] }),
  ({ name, className, children, buttonPosition, buttonText = 'Add card', displaySettings, perPage, loading }) => {
    const scope=useFieldScope();
    const display=displaySettings?scope.value[name+'Display']??{}:{};
    return <Relationship name={name} className={className} perPage={display.perPage??perPage} loadMoreButton={display.button} loading={display.loading==='all'?undefined:display.loading??loading} options={{ addClass: addClasses(buttonPosition), addText: buttonText }}>{children}</Relationship>;
  }
);
