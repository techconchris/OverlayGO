/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['src/**/*.html', 'src/**/*.js'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        tech: ['Orbitron', 'sans-serif']
      },
      colors: {
        dark: '#0B0C10',
        darker: '#10161D',
        panel: '#1F2833',
        primary: '#66FCF1',
        mutedc: '#45A29E',
        lightc: '#C5C6C7'
      }
    }
  }
};