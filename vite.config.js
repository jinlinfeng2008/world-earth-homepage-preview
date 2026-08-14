import { defineConfig } from 'vite'

export default defineConfig({
  base: process.env.WORLD_EARTH_BASE_PATH || '/',
  build: { chunkSizeWarningLimit: 650 },
})
