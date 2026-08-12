import {
  CanvasTexture,
  ClampToEdgeWrapping,
  LinearFilter,
  LinearMipmapLinearFilter,
  SRGBColorSpace,
  type Texture,
  type WebGLRenderer
} from 'three';
import { sampleEdgeColor } from '@danieljamestronca/app-icon-3d-core';

export const DEFAULT_TEXTURE_CACHE_BYTES = 64 * 1024 * 1024;
export const DEFAULT_MAX_TEXTURE_SIZE = 1024;
const SIZE_BUCKETS = [128, 256, 512, 1024] as const;

export interface IconTextureResource {
  texture: Texture;
  edgeColor: string;
  size: number;
}

interface DecodedEntry {
  key: string;
  canvas: HTMLCanvasElement;
  edgeColor: string;
  bytes: number;
  references: number;
  lastUsed: number;
}

interface GpuEntry extends IconTextureResource {
  key: string;
  bytes: number;
  references: number;
  lastUsed: number;
}

const decodedEntries = new Map<string, DecodedEntry>();
const decodedPromises = new Map<string, Promise<DecodedEntry>>();
const rendererEntries = new WeakMap<WebGLRenderer, Map<string, GpuEntry>>();

export function getIconTextureBucket(targetSize: number, maxTextureSize = DEFAULT_MAX_TEXTURE_SIZE) {
  const cappedMaximum = Math.max(1, Math.min(DEFAULT_MAX_TEXTURE_SIZE, maxTextureSize));
  const desired = Math.max(1, Math.min(targetSize, cappedMaximum));
  return Math.min(
    cappedMaximum,
    SIZE_BUCKETS.find((bucket) => bucket >= desired) ?? DEFAULT_MAX_TEXTURE_SIZE
  );
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    if (!url.startsWith('data:') && !url.startsWith('blob:')) image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Unable to load icon texture: ${url}`));
    image.src = url;
  });
}

async function decode(url: string, size: number): Promise<DecodedEntry> {
  const key = `${url}\u0000${size}`;
  const cached = decodedEntries.get(key);
  if (cached) return cached;
  const pending = decodedPromises.get(key);
  if (pending) return pending;

  const promise = loadImage(url).then((image) => {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) throw new Error('Unable to create a canvas for icon texture processing.');
    context.drawImage(image, 0, 0, size, size);
    const pixels = context.getImageData(0, 0, size, size);
    const entry: DecodedEntry = {
      key,
      canvas,
      edgeColor: sampleEdgeColor({
        width: pixels.width,
        height: pixels.height,
        data: new Uint8Array(pixels.data.buffer)
      }),
      bytes: Math.ceil(size * size * 4 * (4 / 3)),
      references: 0,
      lastUsed: performance.now()
    };
    decodedEntries.set(key, entry);
    decodedPromises.delete(key);
    return entry;
  });
  decodedPromises.set(key, promise);
  promise.catch(() => decodedPromises.delete(key));
  return promise;
}

function evictDecoded(cacheBytes: number) {
  let total = 0;
  for (const entry of decodedEntries.values()) total += entry.bytes;
  if (total <= cacheBytes) return;
  const unused = [...decodedEntries.values()]
    .filter((entry) => entry.references === 0)
    .sort((a, b) => a.lastUsed - b.lastUsed);
  for (const entry of unused) {
    decodedEntries.delete(entry.key);
    total -= entry.bytes;
    entry.canvas.width = 0;
    entry.canvas.height = 0;
    if (total <= cacheBytes) break;
  }
}

function evictGpu(renderer: WebGLRenderer, cacheBytes: number) {
  const entries = rendererEntries.get(renderer);
  if (!entries) return;
  let total = 0;
  for (const entry of entries.values()) total += entry.bytes;
  if (total <= cacheBytes) return;
  const unused = [...entries.values()]
    .filter((entry) => entry.references === 0)
    .sort((a, b) => a.lastUsed - b.lastUsed);
  for (const entry of unused) {
    entry.texture.dispose();
    entries.delete(entry.key);
    const decoded = decodedEntries.get(entry.key);
    if (decoded) {
      decoded.references = Math.max(0, decoded.references - 1);
      decoded.lastUsed = performance.now();
    }
    total -= entry.bytes;
    if (total <= cacheBytes) break;
  }
  evictDecoded(cacheBytes);
}

export async function acquireIconTexture(
  renderer: WebGLRenderer,
  url: string,
  size: number,
  cacheBytes = DEFAULT_TEXTURE_CACHE_BYTES
): Promise<IconTextureResource> {
  const key = `${url}\u0000${size}`;
  let entries = rendererEntries.get(renderer);
  if (!entries) {
    entries = new Map();
    rendererEntries.set(renderer, entries);
  }
  const cached = entries.get(key);
  if (cached) {
    cached.references += 1;
    cached.lastUsed = performance.now();
    return cached;
  }

  const decoded = await decode(url, size);
  const concurrentlyCreated = entries.get(key);
  if (concurrentlyCreated) {
    concurrentlyCreated.references += 1;
    concurrentlyCreated.lastUsed = performance.now();
    return concurrentlyCreated;
  }
  decoded.references += 1;
  decoded.lastUsed = performance.now();
  const texture = new CanvasTexture(decoded.canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.generateMipmaps = true;
  texture.minFilter = LinearMipmapLinearFilter;
  texture.magFilter = LinearFilter;
  texture.wrapS = ClampToEdgeWrapping;
  texture.wrapT = ClampToEdgeWrapping;
  texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  texture.needsUpdate = true;
  const entry: GpuEntry = {
    key,
    texture,
    edgeColor: decoded.edgeColor,
    size,
    bytes: decoded.bytes,
    references: 1,
    lastUsed: performance.now()
  };
  entries.set(key, entry);
  evictGpu(renderer, cacheBytes);
  return entry;
}

export function releaseIconTexture(
  renderer: WebGLRenderer,
  url: string,
  size: number,
  cacheBytes = DEFAULT_TEXTURE_CACHE_BYTES
) {
  const entry = rendererEntries.get(renderer)?.get(`${url}\u0000${size}`);
  if (!entry) return;
  entry.references = Math.max(0, entry.references - 1);
  entry.lastUsed = performance.now();
  evictGpu(renderer, cacheBytes);
}

export function disposeIconTextureCache(renderer: WebGLRenderer) {
  const entries = rendererEntries.get(renderer);
  if (!entries) return;
  for (const entry of entries.values()) {
    entry.texture.dispose();
    const decoded = decodedEntries.get(entry.key);
    if (decoded) decoded.references = Math.max(0, decoded.references - 1);
  }
  entries.clear();
  rendererEntries.delete(renderer);
  evictDecoded(0);
}
