import { describe, expect, it } from 'vitest';
import { DEFAULT_ICON_MOTION_TUNING, applyIconMotion, createIconMotion, updateIconMotion } from '../src/index.js';

describe('motion', () => {
  it('starts at the configured rest yaw and idle speed', () => {
    const motion = createIconMotion(0);
    expect(motion.spinY).toBe(DEFAULT_ICON_MOTION_TUNING.restYaw);
    expect(motion.velY).toBe(DEFAULT_ICON_MOTION_TUNING.idleSpeed);
    expect(motion.scale).toBe(DEFAULT_ICON_MOTION_TUNING.baseScale);
  });

  it('advances idle spin over time when idle', () => {
    const motion = createIconMotion(0);
    const before = motion.spinY;
    for (let i = 0; i < 30; i += 1) updateIconMotion(motion, 1 / 60, i / 60, { idle: true });
    expect(motion.spinY).toBeGreaterThan(before);
  });

  it('does not idle-spin when idle motion is disabled', () => {
    const motion = createIconMotion(0);
    for (let i = 0; i < 600; i += 1) updateIconMotion(motion, 1 / 60, i / 60, { idle: false });
    expect(motion.velY).toBeCloseTo(0, 2);
  });

  it('leaves spin and tilt untouched while dragging', () => {
    const motion = createIconMotion(0);
    motion.dragging = true;
    motion.spinY = 1.23;
    motion.tiltX = 0.05;
    updateIconMotion(motion, 1 / 60, 0, { idle: true });
    expect(motion.spinY).toBe(1.23);
    expect(motion.tiltX).toBe(0.05);
  });

  it('clamps tilt to the configured range even from an out-of-range start', () => {
    const motion = createIconMotion(0);
    motion.tiltX = 10;
    updateIconMotion(motion, 1 / 60, 0, { idle: false });
    expect(motion.tiltX).toBeLessThanOrEqual(DEFAULT_ICON_MOTION_TUNING.tiltClamp);
  });

  it('eases toward the active scale on hover and back down on release', () => {
    const motion = createIconMotion(0);
    motion.pointerInside = true;
    for (let i = 0; i < 60; i += 1) updateIconMotion(motion, 1 / 60, i / 60, { idle: false });
    expect(motion.scale).toBeCloseTo(DEFAULT_ICON_MOTION_TUNING.activeScale, 2);
    motion.pointerInside = false;
    for (let i = 0; i < 60; i += 1) updateIconMotion(motion, 1 / 60, i / 60, { idle: false });
    expect(motion.scale).toBeCloseTo(DEFAULT_ICON_MOTION_TUNING.baseScale, 2);
  });

  it('applies rest tilt, spin+hoverYaw, and scale onto an Object3D-like target', () => {
    const motion = createIconMotion(0);
    motion.tiltX = 0.1;
    motion.spinY = 0.5;
    motion.hoverYaw = 0.02;
    motion.scale = 1.3;
    const rotation = { x: 0, y: 0, z: 0, set(x: number, y: number, z: number) { this.x = x; this.y = y; this.z = z; } };
    const scale = { x: 0, y: 0, z: 0, setScalar(value: number) { this.x = this.y = this.z = value; } };
    applyIconMotion({ rotation, scale } as never, motion);
    expect(rotation.x).toBeCloseTo(DEFAULT_ICON_MOTION_TUNING.restTiltX + 0.1, 6);
    expect(rotation.y).toBeCloseTo(0.52, 6);
    expect(scale.x).toBeCloseTo(1.3, 6);
  });
});
