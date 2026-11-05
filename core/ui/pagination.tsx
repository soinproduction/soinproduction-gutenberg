'use client';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './button.js';

/** Shared numbered pagination for archives and Lists. */
export function Pagination({ page, pages, onPageChange, label = 'Pagination', previousLabel = 'Previous page', nextLabel = 'Next page', pageLabel = 'Page' }: {
    page: number; pages: number; onPageChange: (page: number) => void;
    label?: string; previousLabel?: string; nextLabel?: string; pageLabel?: string;
}) {
    return <nav aria-label={label} className="mt-14 flex flex-wrap items-center justify-center gap-2 border-t pt-8">
        <Button variant="outline" size="icon" aria-label={previousLabel} disabled={page === 1} onClick={() => onPageChange(page - 1)}><ChevronLeft /></Button>
        {Array.from({length: pages}, (_, i) => i + 1).map(number => <Button key={number} variant={page === number ? 'default' : 'outline'} size="icon"
            aria-label={`${pageLabel} ${number}`} aria-current={page === number ? 'page' : undefined} onClick={() => onPageChange(number)}>{number}</Button>)}
        <Button variant="outline" size="icon" aria-label={nextLabel} disabled={page === pages} onClick={() => onPageChange(page + 1)}><ChevronRight /></Button>
    </nav>;
}
