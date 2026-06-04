import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      'node:fs': '/src/adapters/validator/browserNodeFsShim.ts',
      'node:path': 'path-browserify',
    },
  },
});
