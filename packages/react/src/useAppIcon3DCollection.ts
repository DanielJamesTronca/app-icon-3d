'use client';

import { useCallback, useState, type MouseEvent, type PointerEvent } from 'react';
import {
  createIconMotion,
  type IconMotion,
  type IconMotionTuning
} from '@danieljamestronca/app-icon-3d-core';
import { useIconPointer } from './useIconPointer.js';

export interface AppIcon3DSlotProps {
  'data-app-icon-id': string;
  onPointerEnter: () => void;
  onPointerLeave: () => void;
  onPointerDown: (event: PointerEvent<HTMLElement>) => void;
  onPointerMove: (event: PointerEvent<HTMLElement>) => void;
  onPointerUp: (event: PointerEvent<HTMLElement>) => void;
  onPointerCancel: () => void;
  onClick: (event: MouseEvent<HTMLElement>) => void;
}

export interface AppIcon3DCollectionBinding {
  motions: Map<string | number, IconMotion>;
  getSlotProps: (id: string | number) => AppIcon3DSlotProps;
}

/**
 * Owns stable per-item motion objects and returns the DOM handlers required by
 * AppIcon3DCollection. Items may be added, removed, or reordered without resetting
 * the motion of ids that remain present.
 */
export function useAppIcon3DCollection(
  items: ReadonlyArray<{ id: string | number }>,
  tuning?: IconMotionTuning
): AppIcon3DCollectionBinding {
  const [motions] = useState(() => new Map<string | number, IconMotion>());
  const pointer = useIconPointer(tuning);
  const liveIds = new Set(items.map((item) => item.id));

  for (const id of motions.keys()) {
    if (!liveIds.has(id)) motions.delete(id);
  }
  items.forEach((item, index) => {
    if (!motions.has(item.id)) {
      motions.set(item.id, createIconMotion(index * 1.17, tuning));
    }
  });

  const getSlotProps = useCallback(
    (id: string | number): AppIcon3DSlotProps => {
      const motion = motions.get(id);
      if (!motion) throw new Error(`No AppIcon3DCollection item exists for id "${String(id)}".`);

      return {
        'data-app-icon-id': String(id),
        onPointerEnter: () => pointer.onPointerEnter(motion),
        onPointerLeave: () => pointer.onPointerLeave(motion),
        onPointerDown: (event) => pointer.onPointerDown(event, motion),
        onPointerMove: (event) => pointer.onPointerMove(event, motion),
        onPointerUp: (event) => pointer.onPointerUp(event, motion),
        onPointerCancel: () => pointer.onPointerCancel(motion),
        onClick: (event) => {
          if (pointer.consumeClick(motion)) {
            event.preventDefault();
            event.stopPropagation();
          }
        }
      };
    },
    [motions, pointer]
  );

  return { motions, getSlotProps };
}
