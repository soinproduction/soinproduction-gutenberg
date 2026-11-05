'use client';
import { useEffect, useRef, useState } from 'react';
declare global {
  interface Window {
    turnstile?: {
      render: (element: HTMLElement, options: Record<string, unknown>) => string;
      remove: (id: string) => void;
    };
  }
}
let loading: Promise<void> | undefined;
function load() {
  if (window.turnstile) return Promise.resolve();
  if (!loading)
    loading = new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => {
        loading = undefined;
        reject(new Error('Challenge unavailable'));
      };
      document.head.appendChild(script);
    });
  return loading;
}
export function Turnstile({
  siteKey,
  onToken,
}: {
  siteKey: string;
  onToken: (token: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let disposed = false,
      id: string | undefined;
    load()
      .then(() => {
        if (disposed || !ref.current || !window.turnstile) return;
        id = window.turnstile.render(ref.current, {
          sitekey: siteKey,
          action: 'form-submit',
          callback: onToken,
          'expired-callback': () => onToken(''),
          'error-callback': () => {
            onToken('');
            setError(true);
          },
        });
      })
      .catch(() => setError(true));
    return () => {
      disposed = true;
      if (id) window.turnstile?.remove(id);
    };
  }, [siteKey, onToken]);
  return (
    <div className="site-turnstile fe-full">
      <div ref={ref} />
      {error && <p role="alert">Verification unavailable. Please reload and try again.</p>}
    </div>
  );
}
