'use client';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { buttonClasses, type ButtonAppearance } from './button-appearance.js';
import { ButtonLabel } from '../icons/button.js';
import { Pagination } from './pagination.js';
export type ListLoading = 'pagination' | 'lazyload' | 'show-more';
export function listWindow(total: number, perPage?: number, loading?: ListLoading, requested = 1) {
    const size = Number.isFinite(perPage) && perPage! > 0 ? Math.max(1, Math.floor(perPage!)) : total || 1;
    const pages = Math.max(1, Math.ceil(total / size));
    const page = Math.max(1, Math.min(pages, requested));
    const offset = loading === 'pagination' ? (page - 1) * size : 0;
    const limit = loading ? (loading === 'pagination' ? size : page * size) : total;
    return { page, pages, offset, limit, hasMore: offset + limit < total };
}

export function listPageFromUrl(url: string, key: string, total: number, perPage?: number, loading?: ListLoading) {
    const raw = new URL(url).searchParams.get(key) ?? '';
    const requested = /^\d+$/.test(raw) ? Number(raw) : 1;
    return listWindow(total, perPage, loading, requested).page;
}
export function listPageUrl(url: string, key: string, page: number) {
    const next = new URL(url);
    if (page > 1) next.searchParams.set(key, String(page));
    else next.searchParams.delete(key);
    return next.pathname + next.search + next.hash;
}


export function LoadedCollection({ pageKey, total, perPage, loading, loadMoreButton, children }: {
 pageKey: string; total: number; perPage?: number; loading?: ListLoading; loadMoreButton?: ButtonAppearance;
 children: (window: {offset: number; limit: number}) => ReactNode;
}) {
    const [requested, setPage] = useState(1);
    const { page, pages, offset, limit, hasMore } = listWindow(total, perPage, loading, requested);
    const sentinel = useRef<HTMLDivElement>(null);
    const list = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const sync = () => setPage(loading ? listPageFromUrl(window.location.href, pageKey, total, perPage, loading) : 1);
        sync();
        window.addEventListener('popstate', sync);
        window.addEventListener('site:list-page', sync);
        return () => {
            window.removeEventListener('popstate', sync);
            window.removeEventListener('site:list-page', sync);
        };
    }, [pageKey, total, perPage, loading]);
    const navigate = (next: number, replace = false) => {
        const target = listWindow(total, perPage, loading, next).page;
        const url = listPageUrl(window.location.href, pageKey, target);
        if (replace) window.history.replaceState(window.history.state, '', url);
        else window.history.pushState(window.history.state, '', url);
        setPage(target);
        window.dispatchEvent(new Event('site:list-page'));
    };
    useEffect(() => {
        if (loading !== 'lazyload' || !hasMore || !sentinel.current || typeof IntersectionObserver === 'undefined') return;
        let used = false;
        const observer = new IntersectionObserver(entries => {
            if (!used && entries.some(entry => entry.isIntersecting)) {
                used = true;
                navigate(page + 1, true);
            }
        }, { rootMargin: '200px' });
        observer.observe(sentinel.current);
        return () => observer.disconnect();
    }, [loading, hasMore, page, pageKey, total, perPage]);
    const go = (next: number) => { navigate(next); list.current?.scrollIntoView({behavior:'smooth',block:'start'}); };
    return <div ref={list} className="site-loaded-list">
      {children({offset,limit})}
      {loading === 'pagination' && pages > 1 && <Pagination page={page} pages={pages} label="List pages" onPageChange={go} />}
      {loading && loading !== 'pagination' && hasMore && <div ref={sentinel} className="mt-10 flex justify-center"><button type="button" className={buttonClasses('is-style-studio-'+(loadMoreButton?.style||'outline'))} onClick={()=>navigate(page+1)}><ButtonLabel attributes={{metadata:{siteButtonIcon:loadMoreButton?.icon,siteButtonIconPosition:loadMoreButton?.iconPosition}}}>{loadMoreButton?.text?.trim()||'LoadMore'}</ButtonLabel></button></div>}
    </div>;
}
