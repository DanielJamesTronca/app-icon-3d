import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: { resolve: true },
  clean: true,
  tsconfig: 'tsconfig.build.json',
  noExternal: ['@danieljamestronca/app-icon-3d-core']
});
