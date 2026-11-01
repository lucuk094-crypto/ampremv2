'use client';

import { useEffect, useRef } from 'react';

export type LogKind = 'sys' | 'info' | 'step' | 'ok' | 'err' | 'wait' | 'data';

export type LogLine = { id: number; t: string; kind: LogKind; msg: string };

const KIND: Record<LogKind, { tag: string; cls: string }> = {
  sys: { tag: 'SYSTEM', cls: 'text-white/70' },
  info: { tag: 'INFO', cls: 'text-white' },
  step: { tag: ' STEP ', cls: 'text-sun' },
  ok: { tag: '  OK  ', cls: 'text-lime' },
  err: { tag: ' ERROR', cls: 'text-[#FF5C5C]' },
  wait: { tag: ' WAIT ', cls: 'text-[#7AC7FF]' },
  data: { tag: ' DATA ', cls: 'text-[#C9A7FF]' },
};

export function Terminal({
  lines,
  busy,
  onClear,
  className = '',
}: {
  lines: LogLine[];
  busy?: boolean;
  onClear?: () => void;
  className?: string;
}) {
  const body = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = body.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines, busy]);

  return (
    <div className={`brutal flex flex-col overflow-hidden bg-ink ${className}`}>
      {/* title bar */}
      <div className="flex items-center justify-between gap-2 border-b-[3px] border-ink bg-ink2 px-3 py-2">
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 border-2 border-white/30 bg-[#FF5C5C]" />
          <span className="h-3 w-3 border-2 border-white/30 bg-sun" />
          <span className="h-3 w-3 border-2 border-white/30 bg-lime" />
          <span className="ml-2 truncate font-mono text-[10px] font-bold uppercase tracking-widest text-white/60">
            amnox_terminal.log
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-widest text-lime">
            <span className="h-1.5 w-1.5 animate-blink rounded-full bg-lime" />
            live
          </span>
          {onClear && (
            <button
              type="button"
              onClick={onClear}
              className="border-2 border-white/25 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-widest text-white/70 transition-colors hover:border-lime hover:text-lime"
            >
              clr
            </button>
          )}
        </div>
      </div>

      {/* body */}
      <div
        ref={body}
        className="grid-lines h-[260px] overflow-y-auto px-3 py-2 font-mono text-[11px] leading-relaxed sm:h-[300px] sm:text-[12px]"
        style={{ backgroundImage: 'none' }}
        role="log"
        aria-live="polite"
        aria-label="Log aktivitas"
      >
        {lines.map((l) => (
          <div key={l.id} className="term-line flex gap-2 py-[1px]">
            <span className="shrink-0 text-white/25">{l.t}</span>
            <span className={`shrink-0 font-bold ${KIND[l.kind].cls}`}>[{KIND[l.kind].tag}]</span>
            <span className={`min-w-0 break-words ${l.kind === 'err' ? 'text-[#FF9A9A]' : 'text-white/85'}`}>
              {l.msg}
            </span>
          </div>
        ))}
        {busy && (
          <div className="flex gap-2 py-[1px] text-lime">
            <span className="text-white/25">{'>>'}</span>
            <span className="animate-blink">▊ memproses…</span>
          </div>
        )}
        {!lines.length && !busy && (
          <div className="font-mono text-[11px] text-white/35">
            [SYSTEM] Terminal siap. Pilih plan lalu mulai aktivasi.
          </div>
        )}
      </div>
    </div>
  );
}
