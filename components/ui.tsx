'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/* ───────────────────────── Salin ke clipboard ───────────────────────── */
export function CopyButton({
  value,
  label = 'SALIN',
  className = '',
}: {
  value: string;
  label?: string;
  className?: string;
}) {
  const [done, setDone] = useState(false);
  const t = useRef<ReturnType<typeof setTimeout>>();

  const copy = useCallback(async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
      } else {
        const ta = document.createElement('textarea');
        ta.value = value;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setDone(true);
      clearTimeout(t.current);
      t.current = setTimeout(() => setDone(false), 1600);
    } catch {
      setDone(false);
    }
  }, [value]);

  useEffect(() => () => clearTimeout(t.current), []);

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={`Salin ${value}`}
      className={`chip press ${done ? 'bg-lime' : 'bg-white hover:bg-sun'} ${className}`}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" className="h-3 w-3 shrink-0" aria-hidden>
        {done ? <path d="m4 12.5 5.5 5.5L20 6.5" strokeLinecap="square" /> : <><rect x="9" y="9" width="12" height="12" /><path d="M15 5H5a2 2 0 0 0-2 2v10" strokeLinecap="square" /></>}
      </svg>
      {done ? 'TERSALIN' : label}
    </button>
  );
}

/* ───────────────────────── Scroll reveal ───────────────────────── */
export function Reveal({
  children,
  delay = 0,
  className = '',
  as: Tag = 'div',
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  as?: keyof JSX.IntrinsicElements;
}) {
  const ref = useRef<HTMLElement | null>(null);
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!('IntersectionObserver' in window)) {
      setSeen(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            setSeen(true);
            io.disconnect();
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const Comp = Tag as React.ElementType;
  return (
    <Comp
      ref={ref as never}
      className={`reveal ${seen ? 'in' : ''} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </Comp>
  );
}
