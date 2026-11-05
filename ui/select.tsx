'use client';
import * as SelectPrimitive from '@radix-ui/react-select';
import { Check, ChevronDown } from 'lucide-react';
import { useEffect, useId, useState } from 'react';
import type { ReactNode } from 'react';
import { clsx as cn } from 'clsx';

type Option = { value: string; label: ReactNode; disabled?: boolean };
type Props = {
  options: Option[]; value?: string; defaultValue?: string; onValueChange?: (value: string) => void;
  placeholder?: ReactNode; name?: string; id?: string; required?: boolean; disabled?: boolean;
  className?: string; density?: 'site' | 'admin'; 'aria-label'?: string; 'aria-describedby'?: string;
};
export function Select({options, value, defaultValue = '', onValueChange, placeholder, className, density = 'site', id, ...props}: Props) {
  const [internal, setInternal] = useState(defaultValue);
  const [trigger, setTrigger] = useState<HTMLButtonElement | null>(null);
  useEffect(() => {
    const form = trigger?.form;
    const reset = () => { if (value === undefined) setInternal(defaultValue); };
    form?.addEventListener('reset', reset);
    return () => form?.removeEventListener('reset', reset);
  }, [trigger, value, defaultValue]);
  const empty = '__site_empty_option__';
  return <SelectPrimitive.Root value={value ?? internal} onValueChange={(next) => {
    const selected = next === empty ? '' : next;
    setInternal(selected); onValueChange?.(selected);
  }} name={props.name} required={props.required} disabled={props.disabled}>
    <SelectPrimitive.Trigger ref={setTrigger} id={id} aria-label={props['aria-label']} aria-describedby={props['aria-describedby']}
      className={cn('site-select-trigger', className)} data-density={density}>
      <SelectPrimitive.Value placeholder={placeholder ?? options.find(o => o.value === '')?.label} />
      <SelectPrimitive.Icon asChild><ChevronDown aria-hidden="true" /></SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
    <SelectPrimitive.Portal container={trigger?.ownerDocument.querySelector<HTMLElement>('.editor-styles-wrapper') ?? trigger?.ownerDocument.body}>
      <SelectPrimitive.Content className="site-select-menu" data-density={density} position="popper" sideOffset={6} collisionPadding={12}>
        <SelectPrimitive.ScrollUpButton className="site-select-scroll"><ChevronDown className="site-select-up" /></SelectPrimitive.ScrollUpButton>
        <SelectPrimitive.Viewport>
          {options.map(option => <SelectPrimitive.Item className="site-select-option" key={option.value} value={option.value || empty} disabled={option.disabled}>
            <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
            <SelectPrimitive.ItemIndicator><Check aria-hidden="true" /></SelectPrimitive.ItemIndicator>
          </SelectPrimitive.Item>)}
        </SelectPrimitive.Viewport>
        <SelectPrimitive.ScrollDownButton className="site-select-scroll"><ChevronDown /></SelectPrimitive.ScrollDownButton>
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  </SelectPrimitive.Root>;
}

/** Same field API as WordPress controls, shared by our custom inspector panels. */
export function SelectControl({label, help, onChange, ...props}: Omit<Props, 'onValueChange'> & {label?: ReactNode; help?: ReactNode; onChange: (value: string) => void}) {
  const id = useId();
  return <div className="site-select-control">
    {label && <label htmlFor={id}>{label}</label>}
    <Select {...props} id={id} density="admin" onValueChange={onChange} aria-describedby={help ? id + '-help' : undefined} />
    {help && <p id={id + '-help'}>{help}</p>}
  </div>;
}
