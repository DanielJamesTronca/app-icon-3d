import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: { resolve: true },
  sourcemap: true,
  clean: true,
  tsconfig: 'tsconfig.build.json',
  banner: { js: "'use client';" },
  noExternal: ['@danieljamestronca/app-icon-3d-core']
});
