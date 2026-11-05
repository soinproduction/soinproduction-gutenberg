'use client';
import { createContext } from 'react';
export const ModalContext = createContext<(id: number, plan?: string) => void>(() => {});
