import { forwardRef } from 'react';
import type { ComponentPropsWithoutRef } from 'react';
import { clsx as cn } from 'clsx';
export const Input = forwardRef<HTMLInputElement, ComponentPropsWithoutRef<'input'>>(({className,...props},ref) => <input {...props} ref={ref} className={cn('field site-text-input',className)} />);
Input.displayName = 'Input';
export const Textarea = forwardRef<HTMLTextAreaElement, ComponentPropsWithoutRef<'textarea'>>(({className,...props},ref) => <textarea {...props} ref={ref} className={cn('field site-text-input site-textarea',className)} />);
Textarea.displayName = 'Textarea';
