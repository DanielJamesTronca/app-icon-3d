#!/usr/bin/env node
import { parseArgs } from 'node:util';
import { exportAppIconGlb } from './exporter.js';

const usage = `Usage: app-icon-3d <input.png|jpg|webp> --out <icon.glb> [--preset ceramic|aluminum|glass] [--edge-color #RRGGBB] [--quality low|medium|high]`;

async function main() {
  const { values, positionals } = parseArgs({
    options: {
      out: { type: 'string', short: 'o' },
      preset: { type: 'string', default: 'ceramic' },
      'edge-color': { type: 'string' },
      quality: { type: 'string', default: 'high' },
      help: { type: 'boolean', short: 'h' }
    },
    allowPositionals: true
  });
  if (values.help) { console.log(usage); return; }
  const input = positionals[0];
  if (!input || !values.out) throw new Error(usage);
  if (!['ceramic', 'aluminum', 'glass'].includes(values.preset ?? '')) throw new Error('--preset must be ceramic, aluminum, or glass.');
  if (!['low', 'medium', 'high'].includes(values.quality ?? '')) throw new Error('--quality must be low, medium, or high.');
  await exportAppIconGlb({ input, output: values.out, preset: values.preset as 'ceramic' | 'aluminum' | 'glass', edgeColor: values['edge-color'], quality: values.quality as 'low' | 'medium' | 'high' });
  console.log(`Wrote ${values.out}`);
}

main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
