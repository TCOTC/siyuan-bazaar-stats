/// <reference types="vitest/config" />
import { copyFileSync, existsSync } from 'node:fs'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

const base = process.env.VITE_BASE ?? '/'

function spaFallback() {
  return {
    name: 'spa-fallback',
    closeBundle() {
      const index = fileURLToPath(new URL('./dist/index.html', import.meta.url))
      if (existsSync(index)) {
        copyFileSync(index, fileURLToPath(new URL('./dist/404.html', import.meta.url)))
      }
    },
  }
}

export default defineConfig({
  base,
  plugins: [vue(), spaFallback()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    include: ['src/**/*.test.ts'],
  },
})
