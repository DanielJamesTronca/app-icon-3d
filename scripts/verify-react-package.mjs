import { readFile } from 'node:fs/promises';
import { URL } from 'node:url';

const entryUrl = new URL('../packages/react/dist/index.js', import.meta.url);
const packageUrl = new URL('../packages/react/package.json', import.meta.url);
const [entry, manifestText] = await Promise.all([
  readFile(entryUrl, 'utf8'),
  readFile(packageUrl, 'utf8')
]);
const manifest = JSON.parse(manifestText);

if (!entry.startsWith("'use client';")) {
  throw new Error('React package entry must preserve the use-client directive.');
}
if (/\b(?:sharp|node:fs|node:path)\b/.test(entry)) {
  throw new Error('React package entry contains a Node-only or image-processing dependency.');
}
if (manifest.type !== 'module' || !manifest.exports?.['.']?.types) {
  throw new Error('React package must publish an ESM entry with declarations.');
}

const exports = await import(entryUrl.href);
for (const name of ['AppIcon3D', 'AppIcon3DCanvas', 'AppIcon3DCollection', 'useAppIcon3DCollection']) {
  if (typeof exports[name] !== 'function') throw new Error(`Missing public export: ${name}`);
}
