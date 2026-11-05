'use client';
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useField, useFieldScope } from '../../core/fields/render.js';
import { LibraryImage } from '../../core/media/image.js';
import { plainText, richNodes } from '../../core/content/rich-text.js';

type Photo = { image: { url: string; alt?: string }; caption?: string };
const GalleryFields = createContext({ image: 'image', caption: 'caption' });
const OpenPhoto = createContext<(photo: Photo) => void>(() => {});

/** Editing stays on the canvas; only the published photograph opens the viewer. */
export function GalleryPhoto({ children }: { children: ReactNode }) {
    const { edit, value } = useFieldScope();
    const fields = useContext(GalleryFields);
    const image = value[fields.image];
    const caption = value[fields.caption];
    const open = useContext(OpenPhoto);
    const className = 'site-list-gallery-photo group relative block h-full w-full overflow-hidden text-left';
    return edit ? <div className={className}>{children}</div> : (
        <button type="button" className={className + ' cursor-zoom-in'} disabled={!image?.url}
            aria-label={`Відкрити фото: ${image?.alt || plainText(caption) || 'Фото студії'}`}
            onClick={() => open({ image, caption })}>
            {children}
            <span aria-hidden="true" className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center border border-background/60 bg-background/80 text-lg leading-none opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">+</span>
        </button>
    );
}

export function GalleryViewer({ name, children, offset = 0, limit }: { name: string; children: ReactNode; offset?: number; limit?: number }) {
    const { value, field } = useField(name);
    const fields = { image: field.fields?.find(item => item.type === 'image')?.name ?? 'image', caption: field.fields?.find(item => item.type === 'richText' || item.type === 'text')?.name ?? 'caption' };
    const photos: Photo[] = (Array.isArray(value) ? value : []).slice(offset, limit === undefined ? undefined : offset + limit).map(row => ({ image: row[fields.image], caption: row[fields.caption] })).filter(photo => photo.image?.url);
    const [slide, setSlide] = useState<{ active: Photo | null; previous: Photo | null; direction: number; version: number }>({ active: null, previous: null, direction: 1, version: 0 });
    const active = slide.active;
    const setActive = (photo: Photo | null) => setSlide(current => ({ active: photo, previous: null, direction: 1, version: current.version + 1 }));
    const [dragX, setDragX] = useState(0);
    const gesture = useRef<{ x: number; y: number; id: number } | null>(null);
    const dialog = useRef<HTMLDivElement>(null);
    const closeButton = useRef<HTMLButtonElement>(null);
    const index = active ? photos.findIndex(photo => photo.image.url === active.image.url && photo.caption === active.caption) : -1;
    const step = (direction: number) => setSlide(current => {
        const at = photos.findIndex(photo => photo.image.url === current.active?.image.url && photo.caption === current.active?.caption);
        if (photos.length < 2) return current;
        return { active: photos[(at + direction + photos.length) % photos.length], previous: current.active, direction, version: current.version + 1 };
    });
    useEffect(() => {
        if (!active || photos.length < 2) return;
        // Warm the adjacent photos so the animation does not reveal an unloaded frame.
        for (const direction of [-1, 1]) {
            const photo = photos[(index + direction + photos.length) % photos.length];
            const image = new window.Image();
            image.src = photo.image.url;
        }
    }, [active?.image.url, value, offset, limit]);
    useEffect(() => {
        if (!active) return;
        const previous = document.activeElement as HTMLElement;
        const overflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        closeButton.current?.focus();
        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') { event.preventDefault(); setActive(null); }
            if (event.key === 'ArrowRight') { event.preventDefault(); step(1); }
            if (event.key === 'ArrowLeft') { event.preventDefault(); step(-1); }
            if (event.key === 'Tab') {
                const buttons = dialog.current?.querySelectorAll<HTMLButtonElement>('button');
                if (!buttons?.length) return;
                const first = buttons[0], last = buttons[buttons.length - 1];
                if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
                else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
            }
        };
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('keydown', onKey);
            document.body.style.overflow = overflow;
            previous?.focus?.();
        };
    }, [!!active, value]);
    return <GalleryFields.Provider value={fields}><OpenPhoto.Provider value={setActive}>
        {children}
        {active && createPortal(
            <div ref={dialog} role="dialog" aria-modal="true" aria-label={active.image.alt || 'Фото студії'} onClick={() => setActive(null)} className="lightbox-enter fixed inset-0 z-[100] flex flex-col items-center justify-center bg-foreground/95 p-4 backdrop-blur-sm">
                <div className="absolute right-6 top-6 flex items-center gap-6">
                    <span className="font-display text-sm text-background/60">{index + 1} / {photos.length}</span>
                    <button ref={closeButton} type="button" aria-label="Закрити фото" onClick={() => setActive(null)} className="flex h-12 w-12 cursor-pointer items-center justify-center text-4xl font-light leading-none text-background hover:text-flame">×</button>
                </div>
                {photos.length > 1 && <>
                    <button type="button" aria-label="Попереднє фото" onClick={event => { event.stopPropagation(); step(-1); }} className="absolute left-4 z-10 flex h-12 w-12 cursor-pointer items-center justify-center border border-background/40 text-xl text-background hover:border-flame hover:text-flame for-small-tablet:left-10">←</button>
                    <button type="button" aria-label="Наступне фото" onClick={event => { event.stopPropagation(); step(1); }} className="absolute right-4 z-10 flex h-12 w-12 cursor-pointer items-center justify-center border border-background/40 text-xl text-background hover:border-flame hover:text-flame for-small-tablet:right-10">→</button>
                </>}
                <div className="site-gallery-deck" style={{ translate: `${dragX}px 0`, transition: dragX ? 'none' : 'translate .2s ease-out' }} data-direction={slide.direction < 0 ? 'previous' : 'next'} onClick={event => event.stopPropagation()}
                    onDragStart={event => event.preventDefault()}
                    onPointerDown={event => {
                        if (!event.isPrimary || (event.pointerType === 'mouse' && event.button !== 0)) return;
                        gesture.current = { x: event.clientX, y: event.clientY, id: event.pointerId };
                        event.currentTarget.setPointerCapture(event.pointerId);
                    }}
                    onPointerMove={event => {
                        const start = gesture.current;
                        if (!start || start.id !== event.pointerId) return;
                        const dx = event.clientX - start.x, dy = event.clientY - start.y;
                        if (Math.abs(dx) > Math.abs(dy)) setDragX(dx * .65);
                    }}
                    onPointerUp={event => {
                        const start = gesture.current;
                        gesture.current = null;
                        setDragX(0);
                        if (!start || start.id !== event.pointerId) return;
                        const dx = event.clientX - start.x, dy = event.clientY - start.y;
                        if (Math.abs(dx) >= 45 && Math.abs(dx) > Math.abs(dy) * 1.2) step(dx < 0 ? 1 : -1);
                    }}
                    onPointerCancel={() => { gesture.current = null; setDragX(0); }}>
                    {slide.previous && <div key={'out-' + slide.version} className="site-gallery-deck__card is-leaving" aria-hidden="true">
                        <LibraryImage src={slide.previous.image.url} alt="" className="site-gallery-deck__image shadow-lift" />
                    </div>}
                    <div key={'in-' + slide.version} className="site-gallery-deck__card is-entering"
                        onAnimationEnd={event => { if (event.target === event.currentTarget) setSlide(current => ({ ...current, previous: null })); }}>
                        <LibraryImage src={active.image.url} alt={active.image.alt ?? ''} className="site-gallery-deck__image shadow-lift" />
                    </div>
                </div>
                {(active.caption || active.image.alt) && <p className="mt-6 text-center text-sm uppercase tracking-[0.25em] text-background/70">{richNodes(active.caption)}{active.caption && active.image.alt ? ' — ' : ''}{active.image.alt}</p>}
            </div>, document.body)}
    </OpenPhoto.Provider></GalleryFields.Provider>;
}
