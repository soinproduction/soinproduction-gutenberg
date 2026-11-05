'use client';
import { DisclosureView } from '../../core/ui/disclosure.js';
import type { DisclosureSettings } from '../../core/ui/disclosure.js';
import { BREAKPOINTS } from '../../generated/responsive.js';
import { useFieldScope } from '../../core/fields/render.js';
import type { ReactNode } from 'react';
import { Props } from '../../shared/index.js';
import { useClasses } from '../../shared/index.js';

/** Modes, motion and indicators are configured in code; only item content is editable. */
export function Accordion(props:Props & DisclosureSettings & {children:ReactNode}){
 const {mode='accordion',multiple=false,firstOpen=false,duration=240,icon,iconPosition='after',responsive}=props;
 return <DisclosureView editor={!!useFieldScope().edit} settings={{mode,multiple,firstOpen,duration,icon,iconPosition,responsive}} breakpoints={BREAKPOINTS} className={useClasses(props)}>{props.children}</DisclosureView>;
}
