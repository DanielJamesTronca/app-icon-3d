import { describe, expect, it } from 'vitest';
import { shouldAnimateIcon, updateIconRotation } from '../src/interaction.js';

describe('interaction', () => {
  it('honours reduced motion', () => {
    expect(shouldAnimateIcon(true, true)).toBe(false);
    expect(shouldAnimateIcon(true, false)).toBe(true);
  });

  it('keeps drag position and adds inertia after release', () => {
    const dragging = updateIconRotation({ x: 0, y: 0, velocityX: 1, velocityY: 2 }, 0.1, true, false, true);
    expect(dragging).toMatchObject({ x: 0, y: 0 });
    const released = updateIconRotation(dragging, 0.1, false, false, false);
    expect(released.x).toBeGreaterThan(0);
    expect(released.y).toBeGreaterThan(0);
    expect(released.velocityX).toBeLessThan(1);
  });
});
