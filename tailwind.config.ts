import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0A0A0A',
        ink2: '#141414',
        lime: { DEFAULT: '#00E676', dark: '#00B85E', soft: '#B6FFD2' },
        sun: { DEFAULT: '#FFE500', dark: '#E6CE00' },
        paper: '#F7F7F2',
      },
      fontFamily: {
        display: ['"Arial Black"', '"Archivo Black"', 'Impact', 'system-ui', 'sans-serif'],
        sans: ['system-ui', '-apple-system', 'Segoe UI', 'Helvetica Neue', 'Arial', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
      },
      boxShadow: {
        brutal: '6px 6px 0 0 #0A0A0A',
        'brutal-sm': '3px 3px 0 0 #0A0A0A',
        'brutal-lg': '10px 10px 0 0 #0A0A0A',
        'brutal-lime': '6px 6px 0 0 #00E676',
        'brutal-sun': '6px 6px 0 0 #FFE500',
      },
      keyframes: {
        marquee: { '0%': { transform: 'translateX(0)' }, '100%': { transform: 'translateX(-50%)' } },
        blink: { '0%,49%': { opacity: '1' }, '50%,100%': { opacity: '0.15' } },
        riseIn: { from: { opacity: '0', transform: 'translateY(14px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        slideDown: { from: { opacity: '0', transform: 'translateY(-8px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
      },
      animation: {
        marquee: 'marquee 28s linear infinite',
        blink: 'blink 1.1s steps(1,end) infinite',
        riseIn: 'riseIn .45s cubic-bezier(.2,.9,.2,1) both',
        slideDown: 'slideDown .3s ease-out both',
      },
    },
  },
  plugins: [],
};
export default config;
