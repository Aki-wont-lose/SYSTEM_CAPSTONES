/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        sti: {
          blue: {
            DEFAULT: '#0B3D91',
            dark: '#062359',
            light: '#1E5FD9',
            50: '#EAF1FB',
            100: '#CFE0F7',
          },
          yellow: {
            DEFAULT: '#FDD835',
            dark: '#F9A825',
            light: '#FFF59D',
          },
          gray: {
            light: '#F5F6F8',
            DEFAULT: '#9AA1A9',
            dark: '#424242',
          }
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 2px 10px 0 rgba(11, 61, 145, 0.06)',
        cardHover: '0 8px 24px 0 rgba(11, 61, 145, 0.14)',
      },
      borderRadius: {
        xl: '1rem',
        '2xl': '1.25rem',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
