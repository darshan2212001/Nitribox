module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#2d5016',
          foreground: '#ffffff',
        },
        secondary: {
          DEFAULT: '#f8f9fa',
          foreground: '#2d5016',
        },
      },
    },
  },
  plugins: [],
};
