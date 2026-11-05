export function buttonClasses(className?: string) {
  const style = String(className ?? 'is-style-studio-primary');
  return style.includes('studio-text')
    ? 'site-text-link eyebrow !text-foreground transition-colors hover:!text-flame'
    : style.includes('light-outline')
      ? 'btn-ghost !border-background/40 hover:!bg-background hover:!text-foreground'
      : style.includes('outline')
        ? 'btn-ghost'
        : style.includes('accent')
          ? 'btn-primary !bg-flame !text-flame-foreground hover:!opacity-90'
          : 'btn-primary';
}


export type ButtonAppearance = { text?: string; style?: string; icon?: string; iconPosition?: 'before' | 'after' };

export const buttonStyleOptions = [
  { value: '', label: 'Section default' },
  { value: 'primary', label: 'Primary' },
  { value: 'accent', label: 'Accent' },
  { value: 'outline', label: 'Outline' },
  { value: 'light-outline', label: 'Light outline' },
  { value: 'text', label: 'Text link' },
];
