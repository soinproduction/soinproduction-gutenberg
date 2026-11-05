import { moveRelationship,relationshipChoices } from '../relationships/selection.js';
import { GripVertical,Image as ImageIcon,Plus,X } from 'lucide-react';
import { EditorAction } from '../ui/editor-action.js';
import { useRef,useState } from 'react';
type RecordOption = {
  key: string;
  label: string;
  image?: string;
  description?: string;
  available?: boolean;
};
export function RelationshipPicker({
  records,
  value,
  onChange,
  label = 'Records',
  onAddCustom,
}: {
  records: RecordOption[];
  value: string[];
  onChange: (value: string[]) => void;
  label?: string;
  onAddCustom?: () => void;
}) {
  const [search, setSearch] = useState('');
  const [active, setActive] = useState<number | null>(null);
  const [drop, setDrop] = useState<number | null>(null);
  const list = useRef<HTMLDivElement>(null);
  const drag = useRef<{ from: number; boundary: number } | null>(null);
  const available = relationshipChoices(records, value, search);
  const unique = [...new Set(value)];
  const thumbnail = (record: RecordOption) => (
    <span className="site-relationship-thumbnail">
      {record.image ? (
        <img src={record.image} alt="" loading="lazy" />
      ) : (
        <ImageIcon size={17} aria-hidden="true" />
      )}
    </span>
  );
  const finish = (commit: boolean) => {
    const current = drag.current;
    drag.current = null;
    setActive(null);
    setDrop(null);
    if (current && commit) onChange(moveRelationship(unique, current.from, current.boundary));
  };
  return (
    <div className="site-relationship">
      <p className="site-menu-hint">Click to select. Drag selected records to reorder.</p>
      <div className="site-relationship-panels">
        <section className="site-relationship-panel">
          <h4>Available</h4>
          <input
            type="search"
            aria-label={'Search ' + label}
            placeholder="Search records…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="site-relationship-options">
            {available.map((record: RecordOption) => (
              <button
                key={record.key}
                type="button"
                className="site-relationship-option"
                aria-label={'Add ' + record.label}
                onClick={() => onChange([...unique, record.key])}
              >
                {thumbnail(record)}
                <span className="site-relationship-copy">
                  <strong>{record.label}</strong>
                  {record.description && <small>{record.description}</small>}
                </span>
                <Plus size={15} aria-hidden="true" />
              </button>
            ))}
            {!available.length && (
              <p className="site-relationship-empty">
                {search ? 'No matching records.' : 'All available records selected.'}
              </p>
            )}
          </div>
        </section>
        <section className="site-relationship-panel">
          <h4>
            Selected <span>{unique.length}</span>
          </h4>
          <div className="site-relationship-selected" ref={list}>
            {unique.map((key, index) => {
              const record = records.find((record) => record.key === key) ?? {
                key,
                label: 'Unavailable record',
              };
              return (
                <div
                  key={key}
                  className={
                    'site-relationship-row' +
                    (active === index ? ' is-dragging' : '') +
                    (drop === index ? ' drop-before' : '') +
                    (drop === unique.length && index === unique.length - 1 ? ' drop-after' : '')
                  }
                >
                  <div className="site-relationship-row-main">
                    <button
                      type="button"
                      className="site-relationship-grip"
                      aria-label={'Reorder ' + record.label}
                      title="Drag to reorder, or use Up and Down keys"
                      onPointerDown={(e) => {
                        if (e.button !== 0) return;
                        e.preventDefault();
                        drag.current = { from: index, boundary: index };
                        setActive(index);
                        e.currentTarget.setPointerCapture(e.pointerId);
                      }}
                      onPointerMove={(e) => {
                        if (!drag.current) return;
                        e.preventDefault();
                        const rows = Array.from(list.current?.children ?? []) as HTMLElement[];
                        let boundary = rows.findIndex((row) => {
                          const r = row.getBoundingClientRect();
                          return e.clientY < r.top + r.height / 2;
                        });
                        if (boundary < 0) boundary = rows.length;
                        const container = list.current;
                        if (container) {
                          const bounds = container.getBoundingClientRect();
                          if (e.clientY < bounds.top + 28) container.scrollTop -= 12;
                          else if (e.clientY > bounds.bottom - 28) container.scrollTop += 12;
                        }
                        drag.current.boundary = boundary;
                        setDrop(boundary);
                      }}
                      onPointerUp={(e) => {
                        if (!drag.current) return;
                        e.preventDefault();
                        finish(true);
                      }}
                      onPointerCancel={() => finish(false)}
                      onLostPointerCapture={() => {
                        if (drag.current) finish(false);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'ArrowUp' && index > 0) {
                          e.preventDefault();
                          onChange(moveRelationship(unique, index, index - 1));
                        }
                        if (e.key === 'ArrowDown' && index < unique.length - 1) {
                          e.preventDefault();
                          onChange(moveRelationship(unique, index, index + 2));
                        }
                      }}
                    >
                      <GripVertical size={17} />
                    </button>
                    {thumbnail(record)}
                    <span className="site-relationship-copy">
                      <strong>{record.label}</strong>
                      {record.description && <small>{record.description}</small>}
                    </span>
                    <button
                      type="button"
                      className="site-relationship-icon"
                      aria-label={'Remove ' + record.label}
                      onClick={() => onChange(unique.filter((id) => id !== key))}
                    >
                      <X size={15} />
                    </button>
                  </div>
                </div>
              );
            })}
            {!unique.length && (
              <p className="site-relationship-empty">
                No records selected. Add records from Available.
              </p>
            )}
          </div>
          {onAddCustom && (
            <div className="site-relationship-add">
              <EditorAction
                action="add"
                label="Add custom card"
                onClick={onAddCustom}
              >
                Add custom card
              </EditorAction>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
