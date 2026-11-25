import { defineConfig } from 'vite'

export default defineConfig({
  base: './',
  build: {
    rollupOptions: {
      input: { landing: 'index.html', workspace: 'app.html' },
    },
  },
})
