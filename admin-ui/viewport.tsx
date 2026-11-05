'use client';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { BREAKPOINTS, LAYOUT_BREAKPOINTS } from '../generated/responsive.js';

declare const wp: any;

/**
 * Editor viewport per site breakpoint. The canvas gets exactly the breakpoint width from our own stylesheet:
 * Gutenberg's devices know only two widths and its editor settings are re-synced, which would drop a custom one.
 * Wider than the window, the canvas keeps its real width and is scaled down with CSS zoom, so media queries
 * inside it still see the breakpoint.
 */
const breakpoints = (Object.entries(BREAKPOINTS) as [string, number][]).filter(([name]) => LAYOUT_BREAKPOINTS.includes(name));
/** Breakpoints shown and edited in the editor, narrowest first. */
export const editorBreakpoints = breakpoints.map(([name]) => name);
let selected: string | null = null;
let canvasWidth = 0;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach(listener => listener());
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };

/** The breakpoint chosen in the header, or null when the canvas fits the window. */
export function useViewport() {
  return useSyncExternalStore(subscribe, () => selected, () => null);
}

/** Width of the editor canvas document, which is what the site's media queries see. */
export function useCanvasWidth() {
  return useSyncExternalStore(subscribe, () => canvasWidth, () => 0);
}

/** Screen range of a breakpoint layout: up to the next breakpoint, the widest one open-ended. */
export function breakpointRange(name: string) {
  const index = breakpoints.findIndex(([key]) => key === name);
  const [, width] = breakpoints[index] ?? [name, 0];
  const next = breakpoints[index + 1]?.[1];
  return index===0&&next ? `Below ${next}px` : next ? `${width}–${next - 1}px` : `${width}px and up`;
}

export function breakpointLabel(name: string) {
  const words: Record<string, string> = { ios: 'iOS', hd: 'HD' };
  return name.split('-').map(word => words[word] ?? word[0].toUpperCase() + word.slice(1)).join(' ');
}

/** Device outline drawn from the breakpoint width: phones, tablets, a laptop and monitors grow with it. */
// Gutenberg's Button sets width and height on its icon, so the breakpoint comes in as `value`.
export function BreakpointIcon({ value: width }: { value: number }) {
  const shape = (() => {
    if (width < 640) {
      const w = Math.round((7 + Math.min(1, Math.max(0, (width - 320) / 320)) * 4) * 2) / 2;
      const x = 12 - w / 2;
      return <><rect x={x} y="3" width={w} height="18" rx="2" /><path d={`M${12 - 1} 18h2`} /></>;
    }
    if (width < 900) return <><rect x="5.5" y="3" width="13" height="18" rx="1.5" /><path d="M11 18h2" /></>;
    if (width < 1150) return <><rect x="2.5" y="5" width="19" height="14" rx="1.5" /><path d="M18.5 11v2" /></>;
    if (width < 1360) return <><rect x="4" y="5" width="16" height="11" rx="1" /><path d="M2 19h20" /></>;
    const w = Math.round((16 + Math.min(6, (width - 1360) / 90)) * 2) / 2;
    return <><rect x={12 - w / 2} y="4" width={w} height="12" rx="1" /><path d="M12 16v4M8 20h8" /></>;
  })();
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {shape}
    </svg>
  );
}

function canvasBox() {
  return document.querySelector<HTMLElement>('.editor-resizable-editor');
}
function syncCanvas() {
  let style = document.getElementById('site-viewport-zoom');
  const width = selected ? BREAKPOINTS[selected as keyof typeof BREAKPOINTS] : 0;
  const container = canvasBox()?.parentElement;
  if (!width || !container) return style?.remove();
  const view = getComputedStyle(container);
  const available = container.clientWidth - parseFloat(view.paddingLeft) - parseFloat(view.paddingRight);
  const zoom = width > available ? Math.floor((available / width) * 1000) / 1000 : 1;
  if (!style) {
    style = document.createElement('style');
    style.id = 'site-viewport-zoom';
    document.head.append(style);
  }
  // Set the final viewport immediately; intermediate widths would repeatedly reflow the page.
  style.textContent = '.editor-resizable-editor__resize-handle{display:none!important}' +
    `.editor-resizable-editor{width:${zoom < 1 ? width + 1 : width}px!important;max-width:none!important;flex-shrink:0;margin-inline:auto;transition:none!important` +
    (zoom < 1 ? `;height:calc(100% / ${zoom})!important;max-height:none!important;zoom:${zoom}}` : '}');
}
let releaseViewportAnchor: (() => void) | undefined;
/** Keep the selected block at its screen Y while responsive content above it reflows. */
function preserveViewportAnchor() {
  releaseViewportAnchor?.();
  const frame = document.querySelector<HTMLIFrameElement>('iframe[name="editor-canvas"]');
  const doc = frame?.contentDocument ?? document;
  const id = wp.data.select('core/block-editor').getSelectedBlockClientId();
  const anchor = (id ? doc.getElementById('block-' + id) : null)
    ?? Array.from(doc.querySelectorAll<HTMLElement>('[data-block]')).find(element => {
      const rect = element.getBoundingClientRect();
      return rect.top >= 0 && rect.top < (doc.defaultView?.innerHeight ?? 0);
    });
  if (!anchor) return;
  const scale = () => frame ? frame.getBoundingClientRect().height / (frame.offsetHeight || 1) : 1;
  const top = () => (frame?.getBoundingClientRect().top ?? 0) + anchor.getBoundingClientRect().top * scale();
  const target = top();
  const containers: {element: HTMLElement; inside: boolean}[] = [];
  const collect = (element: HTMLElement | null, inside: boolean) => {
    for (; element; element = element.parentElement) {
      const view = element.ownerDocument.defaultView;
      if (element === element.ownerDocument.scrollingElement || /auto|scroll/.test(view?.getComputedStyle(element).overflowY ?? ''))
        containers.push({element, inside});
    }
  };
  collect(anchor.parentElement, true);
  if (frame) collect(frame.parentElement, false);
  let cancelled = false, raf = 0;
  const start = performance.now();
  const stop = () => {
    cancelled = true;
    cancelAnimationFrame(raf);
    for (const surface of new Set([document, doc])) {
      surface.removeEventListener('wheel', stop);
      surface.removeEventListener('pointerdown', stop);
      surface.removeEventListener('keydown', stop);
    }
    if (releaseViewportAnchor === stop) releaseViewportAnchor = undefined;
  };
  const restore = () => {
    if (cancelled || !anchor.isConnected) return stop();
    for (const {element, inside} of containers) {
      const delta = top() - target;
      if (Math.abs(delta) < .5) break;
      element.scrollTop += delta / (inside ? scale() : 1);
    }
    if (performance.now() - start < 450) raf = requestAnimationFrame(restore);
    else stop();
  };
  for (const surface of new Set([document, doc])) {
    surface.addEventListener('wheel', stop, {passive:true});
    surface.addEventListener('pointerdown', stop, {passive:true});
    surface.addEventListener('keydown', stop);
  }
  releaseViewportAnchor = stop;
  raf = requestAnimationFrame(restore);
}
export function setViewport(name: string | null) {
  if (name && !(name in BREAKPOINTS)) return;
  preserveViewportAnchor();
  selected = name;
  // Gutenberg's own device preview would size the canvas again.
  if (name && wp.data.select('core/editor').getDeviceType() !== 'Desktop') wp.data.dispatch('core/editor').setDeviceType('Desktop');
  syncCanvas();
  emit();
}

function ViewportBar() {
  const current = useViewport();
  const [host, setHost] = useState<HTMLElement | null>(null);
  useEffect(() => {
    const attach = () => {
      const settings = document.querySelector('.editor-header__settings');
      if (!settings) return;
      let element = settings.querySelector<HTMLElement>(':scope > .site-viewport-host');
      if (!element) {
        element = document.createElement('div');
        element.className = 'site-viewport-host';
        settings.prepend(element);
      }
      setHost(previous => (previous === element ? previous : element));
    };
    attach();
    const observer = new MutationObserver(attach);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    let frame: HTMLIFrameElement | null = null;
    const measure = () => {
      const width = frame?.contentWindow?.innerWidth ?? 0;
      if (width !== canvasWidth) { canvasWidth = width; emit(); }
    };
    const frameObserver = new ResizeObserver(measure);
    const findFrame = () => {
      const next = document.querySelector<HTMLIFrameElement>('iframe[name="editor-canvas"]');
      if (next && next !== frame) { frameObserver.disconnect(); frame = next; frameObserver.observe(next); }
      measure();
    };
    findFrame();
    const timer = window.setInterval(findFrame, 1000);
    return () => { window.clearInterval(timer); frameObserver.disconnect(); };
  }, []);
  useEffect(() => {
    const container = canvasBox()?.parentElement;
    const resize = new ResizeObserver(() => syncCanvas());
    if (container) resize.observe(container);
    // A device picked in Gutenberg's own menu replaces the breakpoint.
    const unsubscribe = wp.data.subscribe(() => {
      if (selected && wp.data.select('core/editor').getDeviceType() !== 'Desktop') {
        selected = null;
        syncCanvas();
        emit();
      }
    });
    return () => { resize.disconnect(); unsubscribe(); };
  }, [host]);
  if (!host) return null;
  const { Button } = wp.components;
  return createPortal(
    <div className="site-viewport-bar" role="group" aria-label="Site breakpoints">
      {breakpoints.map(([name, width]) => (
        <Button key={name} size="compact" icon={<BreakpointIcon value={width} />} label={`${breakpointLabel(name)} · ${breakpointRange(name)}${current === name ? ' · click again to fit the window' : ''}`} showTooltip isPressed={current === name} onClick={() => setViewport(current === name ? null : name)} />
      ))}
    </div>,
    host
  );
}

export function registerViewportBar() {
  wp.plugins.registerPlugin('site-viewports', { render: ViewportBar });
}
