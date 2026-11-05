import { forwardRef, type ComponentPropsWithoutRef } from 'react';

/** Shared authored div. Editor attributes and ref are attached to this same element. */
export const LayoutElement = forwardRef<
  HTMLDivElement,
  ComponentPropsWithoutRef<'div'> & { layoutClassName: string }
>(function LayoutElement({ layoutClassName, className, ...props }, ref) {
  return (
    <div {...props} ref={ref} className={[layoutClassName, className].filter(Boolean).join(' ')} />
  );
});
