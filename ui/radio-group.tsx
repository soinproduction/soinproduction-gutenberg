'use client';
import * as Primitive from '@radix-ui/react-radio-group';
import { clsx as cn } from 'clsx';
import type { ComponentPropsWithoutRef } from 'react';
export function RadioGroup(props: ComponentPropsWithoutRef<typeof Primitive.Root>) {return <Primitive.Root {...props} className={cn('site-radio-group',props.className)} />;}
export function RadioItem(props: ComponentPropsWithoutRef<typeof Primitive.Item>) {return <Primitive.Item {...props} className={cn('site-radio',props.className)}><Primitive.Indicator className="site-radio-dot" /></Primitive.Item>;}
