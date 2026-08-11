// @vitest-environment jsdom
import {
  act,
  createRef,
  forwardRef,
  useImperativeHandle,
  type PointerEvent as ReactPointerEvent,
  type RefObject
} from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createIconMotion, type IconMotion } from '@danieljamestronca/app-icon-3d-core';
import { useIconPointer, type IconPointerHandlers } from '../src/useIconPointer.js';

let root: Root;
let host: HTMLDivElement;
let handlersRef: RefObject<IconPointerHandlers | null>;

const Probe = forwardRef<IconPointerHandlers>(function Probe(_props, ref) {
  const handlers = useIconPointer();
  useImperativeHandle(ref, () => handlers, [handlers]);
  return null;
});

function getHandlers(): IconPointerHandlers {
  if (!handlersRef.current) throw new Error('Pointer handlers were not initialized.');
  return handlersRef.current;
}

function pointerEvent(
  element: HTMLElement,
  overrides: Partial<ReactPointerEvent<HTMLElement>> = {}
): ReactPointerEvent<HTMLElement> {
  return {
    currentTarget: element,
    pointerId: 1,
    clientX: 50,
    clientY: 50,
    timeStamp: 100,
    ...overrides
  } as ReactPointerEvent<HTMLElement>;
}

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
  handlersRef = createRef<IconPointerHandlers>();
  act(() => root.render(<Probe ref={handlersRef} />));
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

describe('useIconPointer', () => {
  it('normalizes drag rates to the pointer surface and suppresses the resulting click', () => {
    const handlers = getHandlers();
    const motion = createIconMotion();
    const surface = document.createElement('div');
    surface.getBoundingClientRect = () => ({ left: 0, top: 0, width: 100, height: 200 }) as DOMRect;
    surface.setPointerCapture = () => undefined;
    surface.hasPointerCapture = () => true;
    surface.releasePointerCapture = () => undefined;

    handlers.onPointerDown(pointerEvent(surface), motion);
    expect(motion.dragging).toBe(true);
    expect(motion.rotPerPxY).toBeCloseTo(0.022);
    expect(motion.rotPerPxX).toBeCloseTo(0.00625);

    handlers.onPointerMove(
      pointerEvent(surface, { clientX: 75, clientY: 60, timeStamp: 116 }),
      motion
    );
    handlers.onPointerUp(
      pointerEvent(surface, { clientX: 75, clientY: 60, timeStamp: 116 }),
      motion
    );

    expect(motion.dragging).toBe(false);
    expect(motion.didDrag).toBe(true);
    expect(handlers.consumeClick(motion)).toBe(true);
    expect(handlers.consumeClick(motion)).toBe(false);
  });

  it('updates hover targets and clears them when the pointer leaves', () => {
    const handlers = getHandlers();
    const motion: IconMotion = createIconMotion();
    const surface = document.createElement('div');
    surface.getBoundingClientRect = () => ({ left: 0, top: 0, width: 100, height: 100 }) as DOMRect;

    handlers.onPointerEnter(motion);
    handlers.onPointerMove(pointerEvent(surface, { clientX: 100, clientY: 0 }), motion);
    expect(motion.pointerInside).toBe(true);
    expect(motion.hoverYaw).toBeGreaterThan(0);
    expect(motion.hoverPitch).toBeGreaterThan(0);

    handlers.onPointerLeave(motion);
    expect(motion.pointerInside).toBe(false);
    expect(motion.hoverYaw).toBe(0);
    expect(motion.hoverPitch).toBe(0);
  });
});
