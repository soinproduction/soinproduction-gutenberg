'use client';
import { ContentContext } from '../../../core/content/context.js';
import { ContentArea, useFieldScope } from '../../../core/fields/render.js';
import { ContentButton } from './content.js';
import {
  buttonLayoutStyle,
  buttonTemplate,
  type StudioAction,
} from './data.js';
import {NativeAreaContent} from '../../../core/content/areas/render.js';
import { useContext } from 'react';
export function SectionActions({
  defaults,
  className = '',
  fixedLayout = false,
}: {
  defaults: StudioAction[];
  className?: string;
  fixedLayout?: boolean;
}) {
  const BlockList = useFieldScope().Content ?? NativeAreaContent;
  const context = useContext(ContentContext),
    scope = useFieldScope();
  const groups = context.innerBlocks?.filter((block) => block.name === 'core/buttons') ?? [];
  const buttons = groups.flatMap((group) => group.innerBlocks ?? []);
  if (fixedLayout && !buttons.length && !context.editor) return null;
  className = [className, fixedLayout ? undefined : groups[0]?.attrs?.className]
    .filter(Boolean)
    .join(' ');
  const layout = groups[0]?.attrs?.layout;
  const style = fixedLayout ? {} : buttonLayoutStyle(layout);
  const content = (
    <>
      {buttons
        .filter((b) => b.name === 'core/button')
        .map((block, index) => (
          <ContentButton key={index} attributes={block.attrs} fixedLayout={fixedLayout} />
        ))}
      {!fixedLayout &&
        (context.innerBlocks ?? []).filter((b) => b.name !== 'core/buttons').length > 0 && (
          <div className="w-full">
            <BlockList
              blocks={(context.innerBlocks ?? []).filter((b) => b.name !== 'core/buttons')}
            />
          </div>
        )}
    </>
  );
  return scope.schema.some((field) => field.name === 'actions') ? (
    <ContentArea
      name="actions"
      className={'site-actions ' + className}
      style={style}
      options={{ template: buttonTemplate(defaults, context.site), fixedLayout }}
    />
  ) : (
    <div style={style} className={'site-actions ' + className}>
      {content}
    </div>
  );
}
