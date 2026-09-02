import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/unit-price-compare/',
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
  },
})
