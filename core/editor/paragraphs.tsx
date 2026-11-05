import { ParagraphFlow, paragraphText, paragraphAccent, type ParagraphValue } from '../content/paragraphs.js';
import { EditorAction } from '../ui/editor-action.js';
import { useEffect, useRef, useState } from 'react';
declare const wp: any;
const { RichText } = wp.blockEditor;
// A constrained text flow: paragraphs can change, while the section's layout stays fixed.
export function ParagraphEditor({
  value,
  onChange,
  className,
  paragraphClass,
  addClass,
  addText = 'Add paragraph',
}: {
  value: ParagraphValue[];
  onChange: (value: ParagraphValue[]) => void;
  selected: boolean;
  className?: string;
  paragraphClass?: string;
  addClass?: string;
  addText?: string;
}) {
  const [focus, setFocus] = useState<number | null>(null);
  const nodes = useRef<(HTMLElement | null)[]>([]);
  const focusAtEnd = useRef(false);
  useEffect(() => {
    if (focus === null) return;
    const node = nodes.current[focus];
    if (node) {
      node.focus();
      const range = node.ownerDocument.createRange();
      range.selectNodeContents(node);
      range.collapse(!focusAtEnd.current);
      const selection = node.ownerDocument.defaultView?.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
    }
    setFocus(null);
  }, [focus, value.length]);
  const add = (after: number) => {
    focusAtEnd.current = false;
    const index = after + 1;
    onChange([...value.slice(0, index), '', ...value.slice(index)]);
    setFocus(index);
  };
  const remove = (index: number) => {
    focusAtEnd.current = true;
    onChange(value.filter((_, i) => i !== index));
    if (value.length > 1) setFocus(Math.max(0, index - 1));
  };
  const split = (index: number, event: any) => {
    if (
      event.key !== 'Enter' ||
      event.shiftKey ||
      event.metaKey ||
      event.ctrlKey ||
      event.nativeEvent?.isComposing
    )
      return;
    const node = nodes.current[index];
    const selection = node?.ownerDocument.defaultView?.getSelection();
    if (!node || !selection?.rangeCount || !node.contains(event.target)) return;
    const range = selection.getRangeAt(0);
    if (!node.contains(range.startContainer) || !node.contains(range.endContainer)) return;
    event.preventDefault();
    event.stopPropagation();
    const before = range.cloneRange();
    before.selectNodeContents(node);
    before.setEnd(range.startContainer, range.startOffset);
    const after = range.cloneRange();
    after.selectNodeContents(node);
    after.setStart(range.endContainer, range.endOffset);
    const html = (r: Range) => {
      const box = node.ownerDocument.createElement('div');
      box.appendChild(r.cloneContents());
      return box.textContent?.replace(/\uFEFF/g, '') ? box.innerHTML.replace(/\uFEFF/g, '') : '';
    };
    onChange([...value.slice(0, index), (paragraphAccent(value[index])?{text:html(before),style:'accent-line' as const}:html(before)), html(after), ...value.slice(index + 1)]);
    focusAtEnd.current = false;
    setFocus(index + 1);
  };
  return (
    <ParagraphFlow
      value={value}
      className={className}
      paragraphClass={paragraphClass}
      rowProps={(index) => ({ onKeyDownCapture: (event) => split(index, event) })}
      renderParagraph={(html, index) => (
        <RichText
          ref={(node: HTMLElement | null) => {
            nodes.current[index] = node;
          }}
          tagName="p"
          value={html}
          placeholder="Write description…"
          allowedFormats={['core/bold', 'core/italic', 'core/strikethrough', 'site/accent']}
          onChange={(text: string) => onChange(value.map((v, i) => (i === index ? (typeof v==='string'?text:{...v,text}) : v)))}
          __unstableOnSplitAtEnd={() => add(index)}
          onRemove={() => {
            if (!paragraphText(value[index])) remove(index);
          }}
        />
      )}
      renderTools={(index) => (
        <div className="site-description-row-tools" contentEditable={false}>
          <EditorAction action="style" label="Accent line" isPressed={paragraphAccent(value[index])} aria-pressed={paragraphAccent(value[index])} onClick={()=>onChange(value.map((v,i)=>i===index?(paragraphAccent(v)?paragraphText(v):{text:paragraphText(v),style:'accent-line'}):v))} />
          <EditorAction action="add" label="Add paragraph after" onClick={() => add(index)} />
          <EditorAction action="remove" label="Remove paragraph" onClick={() => remove(index)} />
        </div>
      )}
      renderAdd={() =>
        !value.length && (
          <div className={['site-description-add', addClass].filter(Boolean).join(' ')} contentEditable={false}>
            <EditorAction action="add" label={addText} onClick={() => add(value.length - 1)}>
              {addText}
            </EditorAction>
          </div>
        )
      }
    />
  );
}
