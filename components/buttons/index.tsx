'use client';
import { useField } from '../../core/fields/render.js';
import { Field } from '../../core/fields/render.js';
import { EditorAction } from '../../core/ui/editor-action.js';
import { buttonClasses } from './implementation/content.js';
import { Props } from '../../shared/index.js';
import { AddButton } from '../../shared/index.js';
import { addClasses } from '../../shared/index.js';
import { buttonStyle } from './shared/index.js';
import { ButtonStylePicker } from './shared/index.js';
import { SiteButton } from './shared/index.js';
import { kit } from '../../shared/index.js';
declare const wp: any;

export function ButtonsEditor({ name, className, styles = [], buttonPosition, buttonText }: Props & AddButton & { name: string; styles?: string[] }) {
    const scope = useField(name);
    const {clientId} = wp.blockEditor.useBlockEditContext();
    const items: any[] = Array.isArray(scope.value) ? scope.value : [];
    return (
      <Field
        name={name}
        className={className}
        options={{
          addClass: addClasses(buttonPosition),
          addText: buttonText,
          buttonClassName: (button: any, index: number) => buttonClasses(buttonStyle(button, styles[index])),
          buttonControl: (button: any, change: (next: any) => void, index: number) => (
            <span className="site-button-tools" contentEditable={false}>
              <ButtonStylePicker button={button} onChange={change} />
              <EditorAction
                action="remove"
                label="Remove button"
                onClick={() => {
                  const block = wp.data.select('core/block-editor').getBlock(clientId);
                  if (items.length === 1 && block?.name.endsWith('-element') && String(block.attributes?.element??'').split(':').at(-1) === name) {
                    wp.data.dispatch('core/block-editor').removeBlocks([clientId]);
                  } else scope.setValue(items.filter((_: any, i: number) => i !== index));
                }}
              />
            </span>
          ),
        }}
      />
    );
}

export function ButtonsView(props: Props & AddButton & { name: string; styles?: string[] }) {
  const {name,className,styles=[]}=props;
  const scope=useField(name);
  if(scope.edit)return <ButtonsEditor {...props} />;
  const buttons = Array.isArray(scope.value) ? scope.value : [];
  return (
    <div className={className ? 'site-actions ' + className : 'site-actions flex flex-wrap gap-3'}>
      {buttons.map((button: any, index: number) => (
        <SiteButton key={index} button={button} fallback={styles[index]} />
      ))}
    </div>
  );
}

/** `styles` is the default look by position; the editor can override it per button. */
export const Buttons = kit<Props & AddButton & { max?: number; styles?: string[] }>(
  'buttons',
  ({ label, max }) => ({ type: 'buttons', label: label ?? 'Buttons', max }),
  (props) => <ButtonsView {...props} />
);
