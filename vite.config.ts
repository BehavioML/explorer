import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

const browserNodeFsShimPath = new URL(
  './src/adapters/validator/browserNodeFsShim.ts',
  import.meta.url,
).pathname;

export default defineConfig(({ command, mode }) => {
  const configuredBase = loadEnv(mode, '.', 'VITE_').VITE_BASE_PATH;

  return {
    base: configuredBase ?? (command === 'build' ? '/explorer/' : '/'),
    plugins: [react()],
    resolve: {
      alias: {
        'node:fs': browserNodeFsShimPath,
        'node:path': 'path-browserify',
      },
    },
  };
});
