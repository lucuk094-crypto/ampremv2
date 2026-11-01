'use client';

/**
 * Nada notifikasi kotak masuk.
 *
 * Dibuat dengan Web Audio API — tidak memerlukan berkas audio, jadi tetap
 * berfungsi tanpa jaringan dan tanpa aset eksternal.
 * Tiga nada naik (A5 → D6 → G6) supaya terdengar seperti "pesan masuk".
 */
export function playChime(volume = 0.14): void {
  if (typeof window === 'undefined') return;
  try {
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;

    const ctx = new Ctor();
    const now = ctx.currentTime;
    const notes = [880, 1174.66, 1567.98];

    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      const at = now + i * 0.085;
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(volume, at + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(at);
      osc.stop(at + 0.34);
    });

    window.setTimeout(() => {
      void ctx.close().catch(() => {});
    }, 900);
  } catch {
    /* audio diblokir browser — abaikan */
  }
}
