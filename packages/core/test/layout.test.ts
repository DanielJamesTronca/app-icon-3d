import { describe, expect, it } from 'vitest';
import { projectRectToScene } from '../src/index.js';

describe('layout', () => {
  it('projects a rect centered in the canvas to scene-space origin', () => {
    const result = projectRectToScene(
      { left: 400, top: 300, width: 200, height: 200 },
      { width: 1000, height: 800 },
      { width: 10, height: 8 },
      { width: 2, height: 2 }
    );
    expect(result.x).toBeCloseTo(0, 5);
    expect(result.y).toBeCloseTo(0, 5);
    expect(result.scale).toBeCloseTo(1, 5);
  });

  it('projects an off-center rect toward its DOM quadrant', () => {
    const result = projectRectToScene(
      { left: 0, top: 0, width: 100, height: 100 },
      { width: 1000, height: 800 },
      { width: 10, height: 8 },
      { width: 2, height: 2 }
    );
    // Top-left DOM rect -> negative x, positive y in scene space (y is flipped).
    expect(result.x).toBeLessThan(0);
    expect(result.y).toBeGreaterThan(0);
  });

  it('fits an object uniformly inside a non-square rect', () => {
    const result = projectRectToScene(
      { left: 0, top: 0, width: 80, height: 120 },
      { width: 400, height: 600 },
      { width: 4, height: 6 },
      { width: 2, height: 1 }
    );
    expect(result.scale).toBeCloseTo(0.4, 5);
  });

  it('returns a safe zero transform for unavailable dimensions', () => {
    expect(
      projectRectToScene(
        { left: 10, top: 10, width: 100, height: 100 },
        { width: 0, height: 600 },
        { width: 4, height: 6 },
        { width: 2, height: 2 }
      )
    ).toEqual({ x: 0, y: 0, scale: 0 });
  });
});
