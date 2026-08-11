import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import sharp from 'sharp';
import { afterEach, describe, expect, it } from 'vitest';
import { exportAppIconGlb, normalizeIconImage } from '../src/exporter.js';

let directory = '';
afterEach(async () => { if (directory) await rm(directory, { recursive: true, force: true }); });

describe('GLB exporter', () => {
  it('normalizes an input and writes textured mesh data', async () => {
    directory = await mkdtemp(join(tmpdir(), 'app-icon-3d-'));
    const input = join(directory, 'icon.png');
    const output = join(directory, 'icon.glb');
    await sharp({ create: { width: 8, height: 4, channels: 4, background: '#204080' } }).png().toFile(input);
    const normalized = await normalizeIconImage(input, 32);
    expect(normalized).toMatchObject({ width: 32, height: 32, edgeColor: '#204080' });
    await exportAppIconGlb({ input, output, quality: 'low' });
    const document = await new NodeIO().read(output);
    expect(document.getRoot().listMeshes()).toHaveLength(1);
    expect(document.getRoot().listTextures()).toHaveLength(1);
    expect(document.getRoot().listMaterials().length).toBeGreaterThanOrEqual(2);
    expect(document.getRoot().listScenes()[0]?.listChildren()).toHaveLength(1);
  });
});
