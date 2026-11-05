import { useIsEditor } from '../../../core/content/context.js';
import { Button } from '../../../core/ui/button.js';
type PlanId = string;
import { createContext, useContext } from 'react';

export const BookingPlanContext = createContext<string | undefined>(undefined);

export const BookingContext = createContext<(plan?: PlanId) => void>(() => {});

export function BookingButton({
  plan,
  className = '',
  style,
  children,
}: {
  plan?: PlanId;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  const open = useContext(BookingContext);
  const editor = useIsEditor();
  return (
    <Button
      style={style}
      onClick={() => {
        if (!editor) open(plan);
      }}
      className={`btn-primary h-auto whitespace-normal ${className}`}
    >
      {children}
    </Button>
  );
}
