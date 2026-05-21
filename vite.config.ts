import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import prefetchPlugin from 'vite-plugin-bundle-prefetch';

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), tailwindcss(), prefetchPlugin()],
});
