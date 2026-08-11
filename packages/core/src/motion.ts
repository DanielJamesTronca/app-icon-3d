import type { Object3D } from 'three';

/** Tunable constants driving idle spin, hover response, and drag feel. */
export interface IconMotionTuning {
  /** rad/s, idle display-turntable speed. */
  idleSpeed: number;
  /** Approach rate back to idle speed after a drag releases. */
  spinReturn: number;
  /** Initial yaw offset so a grid of icons doesn't start perfectly aligned. */
  restYaw: number;
  /** Base pitch (look-down) angle applied in addition to hover/drag tilt. */
  restTiltX: number;
  pitchSpring: number;
  pitchDamp: number;
  /** rad, subtle idle pitch wobble amplitude. */
  idlePitchAmplitude: number;
  /** rad/s, idle pitch wobble rate. */
  idleRate: number;
  /** rad, clamp on total pitch (hover + idle wobble + drag). */
  tiltClamp: number;
  baseScale: number;
  activeScale: number;
  /** Approach rate for the hover/active scale transition. */
  scaleApproachRate: number;
  /** rad, max yaw offset from hovering at the element's horizontal edge. */
  hoverYawAmplitude: number;
  /** rad, max pitch offset from hovering at the element's vertical edge. */
  hoverPitchAmplitude: number;
  /** rad, full-width drag -> yaw. Scaled by 1/element-width at drag start. */
  yawPerDragWidth: number;
  /** rad, full-height drag -> pitch. Scaled by 1/element-height at drag start. */
  pitchPerDragHeight: number;
  /** rad/s, clamp on release-fling angular velocity. */
  flingClamp: number;
  /** px of travel before a press is treated as a drag rather than a click. */
  clickSlop: number;
  /** s, guards the frame loop against tab-switch stalls. */
  dtClamp: number;
}

export const DEFAULT_ICON_MOTION_TUNING: IconMotionTuning = {
  idleSpeed: 0.21,
  spinReturn: 1.35,
  restYaw: -0.075,
  restTiltX: -0.095,
  pitchSpring: 19,
  pitchDamp: 8.5,
  idlePitchAmplitude: 0.009,
  idleRate: 0.42,
  tiltClamp: 0.3,
  baseScale: 1,
  activeScale: 1.032,
  scaleApproachRate: 10,
  hoverYawAmplitude: 0.085,
  hoverPitchAmplitude: 0.052,
  yawPerDragWidth: 2.2,
  pitchPerDragHeight: 1.25,
  flingClamp: 5.5,
  clickSlop: 8,
  dtClamp: 0.05
};

/** Per-icon mutable motion state. Owned by the consumer, written by pointer handlers and the frame loop. */
export interface IconMotion {
  spinY: number;
  velY: number;
  tiltX: number;
  velX: number;
  dragging: boolean;
  didDrag: boolean;
  lastX: number;
  lastY: number;
  lastT: number;
  travel: number;
  emaVX: number;
  emaVY: number;
  rotPerPxY: number;
  rotPerPxX: number;
  hoverYaw: number;
  hoverPitch: number;
  pointerInside: boolean;
  phase: number;
  scale: number;
}

export function createIconMotion(
  phase = 0,
  tuning: IconMotionTuning = DEFAULT_ICON_MOTION_TUNING
): IconMotion {
  return {
    spinY: tuning.restYaw,
    velY: tuning.idleSpeed,
    tiltX: 0,
    velX: 0,
    dragging: false,
    didDrag: false,
    lastX: 0,
    lastY: 0,
    lastT: 0,
    travel: 0,
    emaVX: 0,
    emaVY: 0,
    rotPerPxY: 0,
    rotPerPxX: 0,
    hoverYaw: 0,
    hoverPitch: 0,
    pointerInside: false,
    phase,
    scale: tuning.baseScale
  };
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Framerate-independent exponential approach: same wall-clock decay at 30Hz and 120Hz. */
export function approach(current: number, target: number, rate: number, dt: number): number {
  return current + (target - current) * (1 - Math.exp(-rate * dt));
}

/**
 * Advances idle spin and hover-pitch spring integration for one frame. Call once per
 * frame from the render loop with the raw (unclamped) frame delta; drag updates are
 * applied separately by the pointer handlers and are left untouched while dragging.
 */
export function updateIconMotion(
  motion: IconMotion,
  rawDelta: number,
  elapsed: number,
  opts: { idle: boolean },
  tuning: IconMotionTuning = DEFAULT_ICON_MOTION_TUNING
): void {
  const dt = Math.min(rawDelta, tuning.dtClamp);

  if (!motion.dragging) {
    const idleTime = elapsed * tuning.idleRate + motion.phase;
    const ambientPitch = opts.idle ? Math.cos(idleTime * 0.83) * tuning.idlePitchAmplitude : 0;
    const targetPitch = motion.hoverPitch + ambientPitch;

    motion.velY = approach(motion.velY, opts.idle ? tuning.idleSpeed : 0, tuning.spinReturn, dt);
    motion.spinY += motion.velY * dt;

    motion.velX += (targetPitch - motion.tiltX) * tuning.pitchSpring * dt;
    motion.velX *= Math.exp(-tuning.pitchDamp * dt);
    motion.tiltX += motion.velX * dt;
  }

  motion.tiltX = clamp(motion.tiltX, -tuning.tiltClamp, tuning.tiltClamp);
  motion.scale = approach(
    motion.scale,
    motion.pointerInside || motion.dragging ? tuning.activeScale : tuning.baseScale,
    tuning.scaleApproachRate,
    dt
  );
}

/** Writes the current motion state onto an Object3D's rotation and scale. */
export function applyIconMotion(
  group: Pick<Object3D, 'rotation' | 'scale'>,
  motion: IconMotion,
  tuning: IconMotionTuning = DEFAULT_ICON_MOTION_TUNING
): void {
  group.rotation.set(tuning.restTiltX + motion.tiltX, motion.spinY + motion.hoverYaw, 0);
  group.scale.setScalar(motion.scale);
}
