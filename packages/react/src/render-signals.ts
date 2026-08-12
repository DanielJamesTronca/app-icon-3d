import type { IconMotion } from '@danieljamestronca/app-icon-3d-core';

const subscribers = new WeakMap<IconMotion, Set<() => void>>();

export function requestIconRender(motion: IconMotion) {
  subscribers.get(motion)?.forEach((callback) => callback());
}

export function subscribeIconRender(motion: IconMotion, callback: () => void) {
  let callbacks = subscribers.get(motion);
  if (!callbacks) {
    callbacks = new Set();
    subscribers.set(motion, callbacks);
  }
  callbacks.add(callback);
  return () => {
    callbacks?.delete(callback);
    if (callbacks?.size === 0) subscribers.delete(motion);
  };
}
