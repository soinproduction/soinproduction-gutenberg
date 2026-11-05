import { ChevronDown, GripVertical, Link as LinkIcon, Plus, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
declare const wp: any;
const { Button } = wp.components;
export function RepeatableList({
  items,
  onChange,
  heading = 'Items',
  addLabel = 'Add item',
  deleteLabel = 'Delete item',
  emptyLabel = 'New item',
  createItem,
  renderFields,
  renderSummary,
  renderThumbnail,
  getItemLabel,
  onAdd,
  addDisabled = false,
  focusRequest,
}: any) {
  const dragged = useRef<number | null>(null);
  const dropRef = useRef<number | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<number | null>(null);
  const [drop, setDrop] = useState<number | null>(null);
  const [open, setOpen] = useState<number | null>(null);
  // Lets the canvas open one item: { index } is a new object on every request.
  useEffect(() => {
    if (!focusRequest) return;
    setOpen(focusRequest.index);
    const card = listRef.current?.children[focusRequest.index] as HTMLElement | undefined;
    requestAnimationFrame(() => card?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }));
  }, [focusRequest]);
  const update = (index: number, patch: any) =>
    onChange(
      items.map((item: any, i: number) =>
        i === index
          ? {
              ...item,
              ...patch,
            }
          : item
      )
    );
  const moveTo = (from: number, to: number) => {
    if (from === to) return;
    setOpen(null);
    const next = [...items];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange(next);
  };
  useEffect(() => {
    if (active === null) return;
    const doc = listRef.current?.ownerDocument;
    if (!doc) return;
    const finish = (event: MouseEvent | PointerEvent) => {
      if (dragged.current === null) return;
      event.preventDefault();
      event.stopPropagation();
      const from = dragged.current;
      const cards = Array.from(listRef.current?.children ?? []) as HTMLElement[];
      let boundary = cards.length;
      for (let i = 0; i < cards.length; i++) {
        const rect = cards[i].getBoundingClientRect();
        if (event.clientY < rect.top + rect.height / 2) {
          boundary = i;
          break;
        }
      }
      dragged.current = null;
      dropRef.current = null;
      setActive(null);
      setDrop(null);
      moveTo(from, boundary > from ? boundary - 1 : boundary);
    };
    doc.addEventListener('pointerup', finish, true);
    doc.addEventListener('mouseup', finish, true);
    return () => {
      doc.removeEventListener('pointerup', finish, true);
      doc.removeEventListener('mouseup', finish, true);
    };
  }, [active, items]);
  return (
    <div className="site-menu-editor">
      <div className="site-menu-heading">
        <strong>{heading}</strong>
        <span>{items.length}</span>
      </div>
      <p className="site-menu-hint">
        Drag the handle to reorder items. The preview updates immediately.
      </p>
      <div className="site-menu-list" ref={listRef}>
        {items.map((item: any, index: number) => (
          <div
            className={`site-menu-card ${active === index ? 'is-dragging' : ''} ${
              drop === index ? 'drop-before' : ''
            } ${drop === items.length && index === items.length - 1 ? 'drop-after' : ''}`}
            key={index}
          >
            <div className="site-menu-card-head">
              <button
                type="button"
                className="site-menu-grip"
                aria-label={`Drag: ${getItemLabel?.(item) || item.label || emptyLabel}`}
                title="Drag to reorder. The Up and Down keys also work."
                onPointerDown={(event) => {
                  if (event.button !== 0) return;
                  event.preventDefault();
                  event.stopPropagation();
                  event.currentTarget.setPointerCapture(event.pointerId);
                  dragged.current = index;
                  dropRef.current = index;
                  setActive(index);
                }}
                onPointerMove={(event) => {
                  if (dragged.current === null) return;
                  event.preventDefault();
                  event.stopPropagation();
                  const cards = Array.from(listRef.current?.children ?? []) as HTMLElement[];
                  let boundary = cards.length;
                  for (let i = 0; i < cards.length; i++) {
                    const rect = cards[i].getBoundingClientRect();
                    if (event.clientY < rect.top + rect.height / 2) {
                      boundary = i;
                      break;
                    }
                  }
                  dropRef.current = boundary;
                  setDrop(boundary);
                }}
                onPointerUp={(event) => {
                  if (dragged.current === null) return;
                  event.preventDefault();
                  event.stopPropagation();
                  const from = dragged.current;
                  const boundary = dropRef.current ?? from;
                  moveTo(from, boundary > from ? boundary - 1 : boundary);
                  dragged.current = null;
                  dropRef.current = null;
                  setActive(null);
                  setDrop(null);
                  if (event.currentTarget.hasPointerCapture(event.pointerId))
                    event.currentTarget.releasePointerCapture(event.pointerId);
                }}
                onPointerCancel={() => {
                  dragged.current = null;
                  dropRef.current = null;
                  setActive(null);
                  setDrop(null);
                }}
                onKeyDown={(event) => {
                  if (event.key === 'ArrowUp' && index > 0) {
                    event.preventDefault();
                    moveTo(index, index - 1);
                  }
                  if (event.key === 'ArrowDown' && index < items.length - 1) {
                    event.preventDefault();
                    moveTo(index, index + 1);
                  }
                }}
              >
                <GripVertical size={18} />
              </button>
              <button
                type="button"
                className={
                  'site-menu-toggle' +
                  (renderThumbnail ? ' site-menu-toggle-with-thumbnail' : '')
                }
                aria-expanded={open === index}
                onClick={() => setOpen(open === index ? null : index)}
              >
                <>
                  {renderThumbnail && (
                    <span className="site-menu-thumbnail">{renderThumbnail(item)}</span>
                  )}
                </>
                <span className="site-menu-card-title">
                  <strong>{getItemLabel?.(item) || item.label || emptyLabel}</strong>
                  <small>
                    {renderSummary ? (
                      renderSummary(item)
                    ) : (
                      <>
                        {<LinkIcon size={11} />} {item.to || emptyLabel}
                      </>
                    )}
                  </small>
                </span>
                <ChevronDown size={16} className={open === index ? 'is-open' : ''} />
              </button>
            </div>
            {open === index && (
              <div className="site-menu-card-body">
                {renderFields?.(item, (patch: any) => update(index, patch), index)}
                <Button
                  variant="tertiary"
                  isDestructive
                  className="site-menu-delete"
                  onClick={() => {
                    onChange(items.filter((_: any, i: number) => i !== index));
                    setOpen(null);
                  }}
                >
                  <Trash2 size={16} /> {deleteLabel}
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>
      <Button
        variant="secondary"
        className="site-menu-add"
        disabled={addDisabled}
        onClick={() => {
          if (addDisabled) return;
          if (onAdd) {
            onAdd();
            return;
          }
          onChange([...items, createItem ? createItem() : {}]);
          setOpen(items.length);
        }}
      >
        <Plus size={16} /> {addLabel}
      </Button>
    </div>
  );
}
