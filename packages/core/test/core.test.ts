import { describe, expect, it } from 'vitest';
import { createAppIconGeometry, getIconGeometryDimensions, getPresetMaterialValues, sampleEdgeColor } from '../src/index.js';

describe('core', () => {
  it('creates centred bevelled geometry with valid UVs', () => {
    const geometry = createAppIconGeometry({ size: 2, depth: 0.3, quality: 'low' });
    const dimensions = getIconGeometryDimensions(geometry);
    expect(dimensions.width).toBeCloseTo(2, 2);
    expect(dimensions.height).toBeCloseTo(2, 2);
    expect(dimensions.depth).toBeCloseTo(0.3, 2);
    const uv = geometry.getAttribute('uv');
    expect(uv.count).toBeGreaterThan(0);
    for (let index = 0; index < uv.count; index += 1) expect(Number.isFinite(uv.getX(index))).toBe(true);
    const cap = geometry.groups.find((group) => group.materialIndex === 0);
    expect(cap).toBeDefined();
    const capUvs = Array.from({ length: cap!.count }, (_, offset) => uv.getX(cap!.start + offset));
    expect(Math.min(...capUvs)).toBeCloseTo(0, 5);
    expect(Math.max(...capUvs)).toBeCloseTo(1, 5);
  });

  it('exposes stable preset values', () => {
    expect(getPresetMaterialValues('aluminum')).toMatchObject({ metalness: 0.9, roughness: 0.28 });
    expect(getPresetMaterialValues('glass').transmission).toBe(0.45);
  });

  it('samples perimeter pixels deterministically', () => {
    const data = new Uint8Array(3 * 3 * 4).fill(0);
    for (let index = 0; index < data.length; index += 4) data.set([32, 64, 128, 255], index);
    expect(sampleEdgeColor({ width: 3, height: 3, data })).toBe('#204080');
  });
});
