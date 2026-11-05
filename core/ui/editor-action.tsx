import { ArrowDown,ArrowUp,Copy,Image,Link,Paintbrush,Plus,Trash2,AlignVerticalJustifyCenter,RectangleHorizontal,Columns2,GripVertical } from 'lucide-react';
declare const wp: any;
const icons = { drag: GripVertical, addColumn: Columns2, add: Plus, up: ArrowUp, down: ArrowDown, duplicate: Copy, remove: Trash2, style: Paintbrush, image: Image, link: Link, alignment: AlignVerticalJustifyCenter, fullRow: RectangleHorizontal, columns: Columns2,GripVertical };
export function EditorAction({ action, label, children, ...props }: any) {
  const Icon = icons[action as keyof typeof icons] ?? Plus;
  return (
    <wp.components.Button
      {...props}
      label={label}
      aria-label={label}
      className={'site-editor-action ' + (!children ? 'is-icon-only' : '')}
      isDestructive={action === 'remove'}
    >
      <Icon aria-hidden="true" size={16} strokeWidth={1.75} />
      {children && <span>{children}</span>}
    </wp.components.Button>
  );
}
