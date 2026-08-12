import { describe, expect, it } from 'vitest';
import { getIconTextureBucket } from '../src/texture-cache.js';

describe('getIconTextureBucket', () => {
  it('selects the smallest useful adaptive bucket', () => {
    expect(getIconTextureBucket(1)).toBe(128);
    expect(getIconTextureBucket(129)).toBe(256);
    expect(getIconTextureBucket(500)).toBe(512);
    expect(getIconTextureBucket(900)).toBe(1024);
  });

  it('respects the configured maximum', () => {
    expect(getIconTextureBucket(900, 512)).toBe(512);
    expect(getIconTextureBucket(2048, 2048)).toBe(1024);
  });
});
