import { useEffect, useRef, useState } from 'react';
import {
  ClampToEdgeWrapping,
  LinearFilter,
  LinearMipmapLinearFilter,
  SRGBColorSpace,
  TextureLoader,
  type Texture,
  type WebGLRenderer
} from 'three';

/**
 * Loads a texture with the color-space/mipmap/anisotropy settings a rotating,
 * grazing-angle icon face needs, and disposes it on unmount. TextureLoader
 * does not set colorSpace itself — skipping that step produces the classic
 * "washed out" look because sRGB-encoded pixels get treated as linear.
 */
export function useIconTexture(
  url: string,
  gl: WebGLRenderer,
  onError?: (error: unknown) => void
): Texture | null {
  const [loaded, setLoaded] = useState<{ url: string; texture: Texture } | null>(null);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  useEffect(() => {
    if (!url) return;

    let cancelled = false;
    let loadedTexture: Texture | null = null;
    const loader = new TextureLoader();

    loader.load(
      url,
      (tex) => {
        if (cancelled) {
          tex.dispose();
          return;
        }

        tex.colorSpace = SRGBColorSpace;
        tex.generateMipmaps = true;
        tex.minFilter = LinearMipmapLinearFilter;
        tex.magFilter = LinearFilter;
        tex.wrapS = ClampToEdgeWrapping;
        tex.wrapT = ClampToEdgeWrapping;
        tex.anisotropy = Math.min(8, gl.capabilities.getMaxAnisotropy());
        tex.needsUpdate = true;

        loadedTexture = tex;
        setLoaded({ url, texture: tex });
      },
      undefined,
      (error) => {
        if (!cancelled) onErrorRef.current?.(error);
      }
    );

    return () => {
      cancelled = true;
      loadedTexture?.dispose();
    };
  }, [url, gl]);

  // Derived during render rather than reset via a second effect: as soon as `url` changes,
  // a texture loaded for the previous url stops being returned, with no extra render pass.
  return loaded && loaded.url === url ? loaded.texture : null;
}
