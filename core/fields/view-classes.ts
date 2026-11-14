export type ViewClasses = {
  className?: string;
  adminClassName?: string;
  frontClassName?: string;
};

export function viewClasses({ className, adminClassName, frontClassName }: ViewClasses, editor: boolean) {
  return [className, editor ? adminClassName : frontClassName].filter(Boolean).join(' ') || undefined;
}
