import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
extend: {
  animation: {
    'fade-in': 'fadeIn 0.4s ease-out',
    'slide-up': 'slideUp 0.4s ease-out',

    /* Wise-style pulse */
    'wise-pulse': 'wisePulse 3s ease-in-out infinite',
  },
  keyframes: {
    fadeIn: {
      '0%': { opacity: '0' },
      '100%': { opacity: '1' },
    },
    slideUp: {
      '0%': { opacity: '0', transform: 'translateY(8px)' },
      '100%': { opacity: '1', transform: 'translateY(0)' },
    },

    /* Wise pulse (muy sutil) */
    wisePulse: {
      '0%': { opacity: '1' },
      '50%': { opacity: '0.65' },
      '100%': { opacity: '1' },
    },
  },
},

  },
  plugins: [
    require('tailwindcss-animate'),
  ],
};

export default config;

