import { useEffect, useRef, useState } from 'react';
import type { Texture, WebGLRenderer } from 'three';
import {
  acquireIconTexture,
  DEFAULT_MAX_TEXTURE_SIZE,
  DEFAULT_TEXTURE_CACHE_BYTES,
  getIconTextureBucket,
  releaseIconTexture,
  type IconTextureResource
} from './texture-cache.js';

export interface UseIconTextureOptions {
  targetSize?: number;
  maxTextureSize?: number;
  textureCacheBytes?: number;
}

/**
 * Loads a texture with the color-space/mipmap/anisotropy settings a rotating,
 * grazing-angle icon face needs, and disposes it on unmount. TextureLoader
 * does not set colorSpace itself — skipping that step produces the classic
 * "washed out" look because sRGB-encoded pixels get treated as linear.
 */
export function useIconTexture(
  url: string,
  gl: WebGLRenderer,
  onError?: (error: unknown) => void,
  options: UseIconTextureOptions = {}
): Texture | null {
  return useIconTextureResource(url, gl, onError, options)?.texture ?? null;
}

export function useIconTextureResource(
  url: string,
  gl: WebGLRenderer,
  onError?: (error: unknown) => void,
  options: UseIconTextureOptions = {}
): IconTextureResource | null {
  const maxTextureSize = options.maxTextureSize ?? DEFAULT_MAX_TEXTURE_SIZE;
  const cacheBytes = options.textureCacheBytes ?? DEFAULT_TEXTURE_CACHE_BYTES;
  const size = getIconTextureBucket(options.targetSize ?? maxTextureSize, maxTextureSize);
  const [loaded, setLoaded] = useState<{ key: string; resource: IconTextureResource } | null>(null);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  useEffect(() => {
    if (!url) return;

    let cancelled = false;
    let acquired = false;
    acquireIconTexture(gl, url, size, cacheBytes).then(
      (resource) => {
        if (cancelled) {
          releaseIconTexture(gl, url, size, cacheBytes);
          return;
        }
        acquired = true;
        setLoaded({ key: `${url}\u0000${size}`, resource });
      },
      (error) => {
        if (!cancelled) onErrorRef.current?.(error);
      }
    );

    return () => {
      cancelled = true;
      if (acquired) releaseIconTexture(gl, url, size, cacheBytes);
    };
  }, [url, gl, size, cacheBytes]);

  // Derived during render rather than reset via a second effect: as soon as `url` changes,
  // a texture loaded for the previous url stops being returned, with no extra render pass.
  return loaded?.key === `${url}\u0000${size}` ? loaded.resource : null;
}
