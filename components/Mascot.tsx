/**
 * Maskot "AM" — kepala topeng brutalist dengan mata lightning.
 * Varian:
 *  - mark  : kotak kecil untuk navbar (stroke tebal, bg lime)
 *  - badge : versi besar untuk hero/OG
 * Semua SVG inline, tanpa dependensi, aman untuk server component.
 */
export function Maskot({
  size = 40,
  variant = 'mark',
  className = '',
  animated = false,
}: {
  size?: number;
  variant?: 'mark' | 'badge';
  className?: string;
  animated?: boolean;
}) {
  const badge = variant === 'badge';
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
      role="img"
      aria-label="Maskot AM Prem.ID"
    >
      {/* wajah */}
      <rect x="6" y="6" width="88" height="88" rx="0" fill={badge ? '#0A0A0A' : '#00E676'} stroke="#0A0A0A" strokeWidth="8" />

      {/* garis rahang */}
      <path d="M22 78h56" stroke={badge ? '#00E676' : '#0A0A0A'} strokeWidth="7" strokeLinecap="square" />

      {/* mata kiri: lightning */}
      <path
        d="M30 28h16l-6 13h9L31 62l4-15h-9z"
        fill={badge ? '#FFE500' : '#0A0A0A'}
        stroke={badge ? '#0A0A0A' : 'none'}
        strokeWidth={badge ? 3 : 0}
      />
      {/* mata kanan: lightning */}
      <path
        d="M60 28h16l-6 13h9L61 62l4-15h-9z"
        fill={badge ? '#FFE500' : '#0A0A0A'}
        stroke={badge ? '#0A0A0A' : 'none'}
        strokeWidth={badge ? 3 : 0}
      />

      {/* aksen garis */}
      <path d="M22 22h10M68 22h10" stroke={badge ? '#00E676' : '#0A0A0A'} strokeWidth="6" strokeLinecap="square" />

      {animated && (
        <circle cx="82" cy="18" r="6" fill="#FFE500" stroke="#0A0A0A" strokeWidth="4">
          <animate attributeName="opacity" values="1;0.2;1" dur="1.2s" repeatCount="indefinite" />
        </circle>
      )}
    </svg>
  );
}
