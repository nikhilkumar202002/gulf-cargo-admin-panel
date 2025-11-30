  /** @type {import('tailwindcss').Config} */
  export default {
    content: [
      "./index.html",              // 👈 add this
      "./src/**/*.{js,jsx,ts,tsx}", 
    ],
    theme: {
      extend: {},
    },
    plugins: [],
  }
