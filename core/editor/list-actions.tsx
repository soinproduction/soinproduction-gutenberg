import { emptyValues } from '../fields/schema.js';
import { EditorAction } from '../ui/editor-action.js';
export function ListActionsEditor({ field, value, setValue, options = {} }: any) {
  const list = Array.isArray(value) ? value : [],
    index = options.index;
  if (index === undefined)
    return (
      <div className="site-inline-add">
        <EditorAction
          action="add"
          label="Add item"
          onClick={() =>
            setValue([
              ...list,
              field.itemType === 'string'
                ? ''
                : list.length
                  ? structuredClone(list.at(-1))
                  : emptyValues(options.fields ?? []),
            ])
          }
        >
          Add item
        </EditorAction>
      </div>
    );
  const move = (to: number) => {
    const next = [...list];
    [next[index], next[to]] = [next[to], next[index]];
    setValue(next);
  };
  return (
    <div className="site-inline-tools" contentEditable={false}>
      <EditorAction action="up" label="Move up" disabled={!index} onClick={() => move(index - 1)} />
      <EditorAction
        action="down"
        label="Move down"
        disabled={index === list.length - 1}
        onClick={() => move(index + 1)}
      />
      <EditorAction
        action="duplicate"
        label="Duplicate"
        onClick={() =>
          setValue([
            ...list.slice(0, index + 1),
            structuredClone(list[index]),
            ...list.slice(index + 1),
          ])
        }
      />
      <EditorAction
        action="remove"
        label="Delete"
        onClick={() => setValue(list.filter((_: any, i: number) => i !== index))}
      />
    </div>
  );
}
