/** Ikon inline SVG. Sengaja TANPA 'use client' agar bisa dipakai
 *  server component maupun client component. */
export const Icon = {
  bolt: (p: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className={p.className} aria-hidden>
      <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" strokeLinejoin="round" />
    </svg>
  ),
  mail: (p: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className={p.className} aria-hidden>
      <rect x="2.5" y="4.5" width="19" height="15" rx="1" />
      <path d="m3 6 9 7 9-7" />
    </svg>
  ),
  key: (p: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className={p.className} aria-hidden>
      <circle cx="8" cy="8" r="4.5" />
      <path d="m11.5 11.5 9 9M17 17l2.5-2.5M19.5 19.5 22 17" strokeLinecap="square" />
    </svg>
  ),
  check: (p: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className={p.className} aria-hidden>
      <path d="m4 12.5 5.5 5.5L20 6.5" strokeLinecap="square" />
    </svg>
  ),
  x: (p: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" className={p.className} aria-hidden>
      <path d="M5 5l14 14M19 5 5 19" strokeLinecap="square" />
    </svg>
  ),
  shield: (p: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className={p.className} aria-hidden>
      <path d="M12 2.5 21 6v6c0 5-4 8-9 9.5C7 20 3 17 3 12V6l9-3.5Z" strokeLinejoin="round" />
      <path d="m8 12 3 3 5-6" strokeLinecap="square" />
    </svg>
  ),
  clock: (p: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className={p.className} aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5.5l4 2" strokeLinecap="square" />
    </svg>
  ),
  down: (p: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" className={p.className} aria-hidden>
      <path d="M12 4v13m0 0 5-5m-5 5-5-5M4 21h16" strokeLinecap="square" />
    </svg>
  ),
  arrow: (p: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" className={p.className} aria-hidden>
      <path d="M4 12h15m0 0-6-6m6 6-6 6" strokeLinecap="square" />
    </svg>
  ),
};
