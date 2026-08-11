import { useCallback, useMemo } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { DEFAULT_ICON_MOTION_TUNING, clamp, type IconMotion, type IconMotionTuning } from '@danieljamestronca/app-icon-3d-core';

export interface IconPointerHandlers {
  onPointerDown: (event: ReactPointerEvent<HTMLElement>, motion: IconMotion) => void;
  onPointerMove: (event: ReactPointerEvent<HTMLElement>, motion: IconMotion) => void;
  onPointerUp: (event: ReactPointerEvent<HTMLElement>, motion: IconMotion) => void;
  onPointerCancel: (motion: IconMotion) => void;
  onPointerEnter: (motion: IconMotion) => void;
  onPointerLeave: (motion: IconMotion) => void;
  /** Call from onClick. Returns true if the gesture was a drag (the click should be suppressed). */
  consumeClick: (motion: IconMotion) => boolean;
}

/**
 * DOM pointer handlers that drive an IconMotion: hover yaw/pitch while idle, drag-to-spin
 * with per-element drag-rate normalization, click-vs-drag slop, and release fling inertia.
 *
 * Designed to run on plain DOM overlay elements rather than R3F raycasting, so the
 * underlying canvas can stay `pointer-events: none` while a sibling interactive element
 * (a button, a link) keeps handling focus, keyboard access, and navigation.
 */
export function useIconPointer(tuning: IconMotionTuning = DEFAULT_ICON_MOTION_TUNING): IconPointerHandlers {
  const onPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLElement>, motion: IconMotion) => {
      event.currentTarget.setPointerCapture(event.pointerId);
      const rect = event.currentTarget.getBoundingClientRect();
      motion.rotPerPxY = tuning.yawPerDragWidth / rect.width;
      motion.rotPerPxX = tuning.pitchPerDragHeight / rect.height;
      motion.dragging = true;
      motion.didDrag = false;
      motion.travel = 0;
      motion.lastX = event.clientX;
      motion.lastY = event.clientY;
      motion.lastT = event.timeStamp;
      motion.emaVX = 0;
      motion.emaVY = 0;
    },
    [tuning]
  );

  const onPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLElement>, motion: IconMotion) => {
      if (!motion.dragging) {
        const rect = event.currentTarget.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
        const y = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
        motion.hoverYaw = clamp(x, -1, 1) * tuning.hoverYawAmplitude;
        motion.hoverPitch = clamp(-y, -1, 1) * tuning.hoverPitchAmplitude;
        return;
      }

      const dx = event.clientX - motion.lastX;
      const dy = event.clientY - motion.lastY;
      const dt = Math.max((event.timeStamp - motion.lastT) / 1000, 1 / 240);

      motion.travel += Math.abs(dx) + Math.abs(dy);
      if (motion.travel > tuning.clickSlop) motion.didDrag = true;

      motion.spinY += dx * motion.rotPerPxY;
      motion.tiltX = clamp(motion.tiltX - dy * motion.rotPerPxX, -tuning.tiltClamp, tuning.tiltClamp);

      const a = 1 - Math.exp(-dt / 0.08);
      motion.emaVX += (dx / dt - motion.emaVX) * a;
      motion.emaVY += (dy / dt - motion.emaVY) * a;

      motion.lastX = event.clientX;
      motion.lastY = event.clientY;
      motion.lastT = event.timeStamp;
    },
    [tuning]
  );

  const onPointerUp = useCallback(
    (event: ReactPointerEvent<HTMLElement>, motion: IconMotion) => {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      motion.dragging = false;
      motion.velY = clamp(motion.emaVX * motion.rotPerPxY, -tuning.flingClamp, tuning.flingClamp);
      motion.velX = clamp(-motion.emaVY * motion.rotPerPxX, -tuning.flingClamp, tuning.flingClamp);
    },
    [tuning]
  );

  const onPointerCancel = useCallback((motion: IconMotion) => {
    motion.dragging = false;
    motion.didDrag = true;
    motion.velY = 0;
    motion.velX = 0;
    motion.pointerInside = false;
    motion.hoverYaw = 0;
    motion.hoverPitch = 0;
  }, []);

  const onPointerEnter = useCallback((motion: IconMotion) => {
    motion.pointerInside = true;
  }, []);

  const onPointerLeave = useCallback((motion: IconMotion) => {
    motion.pointerInside = false;
    motion.hoverYaw = 0;
    motion.hoverPitch = 0;
  }, []);

  const consumeClick = useCallback((motion: IconMotion) => {
    if (motion.didDrag) {
      motion.didDrag = false;
      return true;
    }
    return false;
  }, []);

  return useMemo(
    () => ({ onPointerDown, onPointerMove, onPointerUp, onPointerCancel, onPointerEnter, onPointerLeave, consumeClick }),
    [onPointerDown, onPointerMove, onPointerUp, onPointerCancel, onPointerEnter, onPointerLeave, consumeClick]
  );
}
