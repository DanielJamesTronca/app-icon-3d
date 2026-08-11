// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  LinearFilter,
  LinearMipmapLinearFilter,
  SRGBColorSpace,
  Texture,
  type WebGLRenderer
} from 'three';
import { useIconTexture } from '../src/useIconTexture.js';

const loaderState = vi.hoisted(() => ({ textures: [] as Texture[] }));

vi.mock('three', async (importOriginal) => {
  const actual = await importOriginal<typeof import('three')>();
  class MockTextureLoader {
    load(
      url: string,
      onLoad?: (texture: InstanceType<typeof actual.Texture>) => void,
      _onProgress?: unknown,
      onError?: (error: unknown) => void
    ) {
      queueMicrotask(() => {
        if (url.includes('missing')) {
          onError?.(new Error(`Unable to load ${url}`));
          return;
        }
        const texture = new actual.Texture();
        loaderState.textures.push(texture);
        onLoad?.(texture);
      });
      return new actual.Texture();
    }
  }
  return { ...actual, TextureLoader: MockTextureLoader };
});

const renderer = {
  capabilities: { getMaxAnisotropy: () => 16 }
} as WebGLRenderer;

function Probe({ url, onError }: { url: string; onError?: (error: unknown) => void }) {
  const texture = useIconTexture(url, renderer, onError);
  return <span>{texture ? 'loaded' : 'pending'}</span>;
}

let root: Root;
let host: HTMLDivElement;

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  loaderState.textures.length = 0;
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

describe('useIconTexture', () => {
  it('configures the loaded texture and disposes it on unmount', async () => {
    await act(async () => root.render(<Probe url="/icon.png" />));

    expect(host.textContent).toBe('loaded');
    const texture = loaderState.textures[0];
    expect(texture).toBeInstanceOf(Texture);
    expect(texture.colorSpace).toBe(SRGBColorSpace);
    expect(texture.minFilter).toBe(LinearMipmapLinearFilter);
    expect(texture.magFilter).toBe(LinearFilter);
    expect(texture.anisotropy).toBe(8);

    const dispose = vi.spyOn(texture, 'dispose');
    act(() => root.unmount());
    expect(dispose).toHaveBeenCalledTimes(1);
    root = createRoot(host);
  });

  it('reports loader failures without producing a texture', async () => {
    const onError = vi.fn();
    await act(async () => root.render(<Probe url="/missing.png" onError={onError} />));

    expect(host.textContent).toBe('pending');
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0]?.[0]).toBeInstanceOf(Error);
  });
});
