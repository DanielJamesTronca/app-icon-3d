import { describe, expect, it } from 'vitest';
import {
  createAppIconGeometry,
  createAppIconMaterials,
  getIconGeometryDimensions,
  getPresetMaterialValues,
  sampleEdgeColor
} from '../src/index.js';

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

  it('mirrors the rear cap U so a 180deg spin still reads right-side-up', () => {
    const geometry = createAppIconGeometry({ size: 2, depth: 0.3, quality: 'low' });
    const positions = geometry.getAttribute('position');
    const uv = geometry.getAttribute('uv');
    const cap = geometry.groups.find((group) => group.materialIndex === 0)!;
    const front = new Map<string, number>();
    const rear = new Map<string, number>();
    for (let offset = 0; offset < cap.count; offset += 1) {
      const index = cap.start + offset;
      const key = `${positions.getX(index).toFixed(4)},${positions.getY(index).toFixed(4)}`;
      const target = positions.getZ(index) < 0 ? rear : front;
      target.set(key, uv.getX(index));
    }
    expect(front.size).toBeGreaterThan(0);
    expect(rear.size).toBeGreaterThan(0);
    for (const [key, frontU] of front) {
      const rearU = rear.get(key);
      expect(rearU).toBeDefined();
      expect(rearU!).toBeCloseTo(1 - frontU, 5);
    }
  });

  it('honours an explicit bevelSegments override', () => {
    const coarse = createAppIconGeometry({ quality: 'high', bevelSegments: 1 });
    const cap = coarse.groups.find((group) => group.materialIndex === 1)!;
    const fine = createAppIconGeometry({ quality: 'high' });
    const fineCap = fine.groups.find((group) => group.materialIndex === 1)!;
    expect(cap.count).toBeLessThan(fineCap.count);
  });

  it('exposes stable preset values', () => {
    expect(getPresetMaterialValues('aluminum')).toMatchObject({ metalness: 0.9, roughness: 0.28 });
    expect(getPresetMaterialValues('glass').transmission).toBe(0.45);
  });

  it('applies envMapIntensity and per-material overrides', () => {
    const materials = createAppIconMaterials({
      preset: 'ceramic',
      envMapIntensity: 0.9,
      overrides: {
        face: { roughness: 0.34, clearcoat: 0.62, envMapIntensity: 0.78 },
        edge: { roughness: 0.25, metalness: 0.08 }
      }
    });
    expect(materials.face.roughness).toBeCloseTo(0.34, 5);
    expect(materials.face.clearcoat).toBeCloseTo(0.62, 5);
    expect(materials.face.envMapIntensity).toBeCloseTo(0.78, 5);
    expect(materials.edge.roughness).toBeCloseTo(0.25, 5);
    expect(materials.edge.metalness).toBeCloseTo(0.08, 5);
    expect(materials.edge.envMapIntensity).toBeCloseTo(0.9, 5);
    materials.dispose();
  });

  it('samples perimeter pixels deterministically', () => {
    const data = new Uint8Array(3 * 3 * 4).fill(0);
    for (let index = 0; index < data.length; index += 4) data.set([32, 64, 128, 255], index);
    expect(sampleEdgeColor({ width: 3, height: 3, data })).toBe('#204080');
  });
});
