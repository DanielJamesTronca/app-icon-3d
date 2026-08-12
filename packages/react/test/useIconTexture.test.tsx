// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { WebGLRenderer } from 'three';
import { useIconTextureResource } from '../src/useIconTexture.js';

const cacheState = vi.hoisted(() => ({
  acquired: [] as Array<{ url: string; size: number }>,
  released: [] as Array<{ url: string; size: number }>
}));

vi.mock('../src/texture-cache.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/texture-cache.js')>();
  const { Texture: MockTexture, SRGBColorSpace: colorSpace } = await import('three');
  return {
    ...actual,
    acquireIconTexture: vi.fn(async (_renderer, url: string, size: number) => {
      if (url.includes('missing')) throw new Error(`Unable to load ${url}`);
      cacheState.acquired.push({ url, size });
      const texture = new MockTexture();
      texture.colorSpace = colorSpace;
      return { texture, edgeColor: '#123456', size };
    }),
    releaseIconTexture: vi.fn((_renderer, url: string, size: number) => {
      cacheState.released.push({ url, size });
    })
  };
});

const renderer = {} as WebGLRenderer;

function Probe({ url, onError }: { url: string; onError?: (error: unknown) => void }) {
  const resource = useIconTextureResource(url, renderer, onError, {
    targetSize: 220,
    maxTextureSize: 1024
  });
  return <span>{resource ? `${resource.edgeColor}:${resource.size}` : 'pending'}</span>;
}

let root: Root;
let host: HTMLDivElement;

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  cacheState.acquired.length = 0;
  cacheState.released.length = 0;
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

describe('useIconTextureResource', () => {
  it('uses an adaptive bucket and releases the cached texture on unmount', async () => {
    await act(async () => root.render(<Probe url="/icon.png" />));

    expect(host.textContent).toBe('#123456:256');
    expect(cacheState.acquired).toEqual([{ url: '/icon.png', size: 256 }]);
    act(() => root.unmount());
    expect(cacheState.released).toEqual([{ url: '/icon.png', size: 256 }]);
    root = createRoot(host);
  });

  it('reports loader failures without producing a resource', async () => {
    const onError = vi.fn();
    await act(async () => root.render(<Probe url="/missing.png" onError={onError} />));

    expect(host.textContent).toBe('pending');
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0]?.[0]).toBeInstanceOf(Error);
  });
});
