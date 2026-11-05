'use client';
import * as Primitive from '@radix-ui/react-checkbox';
import { Check } from 'lucide-react';
import { forwardRef } from 'react';
import type { ComponentPropsWithoutRef, ElementRef } from 'react';
import { clsx as cn } from 'clsx';
export const Checkbox = forwardRef<ElementRef<typeof Primitive.Root>, ComponentPropsWithoutRef<typeof Primitive.Root>>(({className,...props},ref) => <Primitive.Root {...props} ref={ref} className={cn('site-checkbox',className)}><Primitive.Indicator><Check aria-hidden="true" /></Primitive.Indicator></Primitive.Root>);
Checkbox.displayName = 'Checkbox';
