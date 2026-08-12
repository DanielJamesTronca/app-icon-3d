// @vitest-environment jsdom
import { Suspense } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { create, waitFor } from '@react-three/test-renderer';
import { Mesh, MeshPhysicalMaterial, SRGBColorSpace, Texture } from 'three';
import { AppIcon3D } from '../src/AppIcon3D.js';

const textureState = vi.hoisted(() => ({ byUrl: new Map<string, Texture>() }));

vi.mock('../src/useIconTexture.js', async () => {
  const { Texture: MockTexture, SRGBColorSpace: colorSpace } = await import('three');
  return {
    useIconTextureResource(url: string) {
      let texture = textureState.byUrl.get(url);
      if (!texture) {
        texture = new MockTexture();
        texture.colorSpace = colorSpace;
        textureState.byUrl.set(url, texture);
      }
      return { texture, edgeColor: '#123456', size: 1024 };
    }
  };
});

beforeEach(() => {
  textureState.byUrl.clear();
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    }))
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

async function renderIcon(props: Parameters<typeof AppIcon3D>[0]) {
  const renderer = await create(
    <Suspense fallback={null}>
      <AppIcon3D {...props} />
    </Suspense>
  );
  await waitFor(() => renderer.scene.findAllByType('Mesh').length === 1);
  const mesh = renderer.scene.findByType('Mesh').instance as Mesh;
  return { renderer, mesh };
}

describe('AppIcon3D', () => {
  it('renders an sRGB-corrected display texture', async () => {
    const { renderer, mesh } = await renderIcon({ src: '/icon-clone.png' });
    const [face] = mesh.material as MeshPhysicalMaterial[];

    expect(face.map).toBeInstanceOf(Texture);
    expect(face.map?.colorSpace).toBe(SRGBColorSpace);

    await renderer.unmount();
  });

  it('disposes the geometry and materials on unmount', async () => {
    const { renderer, mesh } = await renderIcon({ src: '/icon-dispose.png' });
    const materials = mesh.material as MeshPhysicalMaterial[];
    const geometryDispose = vi.spyOn(mesh.geometry, 'dispose');
    const materialDisposes = materials.map((material) => vi.spyOn(material, 'dispose'));

    await renderer.unmount();

    expect(geometryDispose).toHaveBeenCalledTimes(1);
    materialDisposes.forEach((spy) => expect(spy).toHaveBeenCalledTimes(1));
  });

  it('calls onReady once with the rendered mesh and source url', async () => {
    const onReady = vi.fn();
    const { renderer, mesh } = await renderIcon({ src: '/icon-ready.png', onReady });

    expect(onReady).toHaveBeenCalledTimes(1);
    const [event] = onReady.mock.calls[0] as [{ mesh: Mesh; textureUrl: string }];
    expect(event.mesh).toBe(mesh);
    expect(event.textureUrl).toBe('/icon-ready.png');

    await renderer.unmount();
  });
});
