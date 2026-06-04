import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const browserNodeFsShimPath = new URL(
  './src/adapters/validator/browserNodeFsShim.ts',
  import.meta.url,
).pathname;

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      'node:fs': browserNodeFsShimPath,
      'node:path': 'path-browserify',
    },
  },
});
