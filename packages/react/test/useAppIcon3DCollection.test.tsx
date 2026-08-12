// @vitest-environment jsdom
import { act, createRef, forwardRef, useImperativeHandle, type RefObject } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  useAppIcon3DCollection,
  type AppIcon3DCollectionBinding
} from '../src/useAppIcon3DCollection.js';

interface ProbeProps {
  items: Array<{ id: string | number }>;
}

const Probe = forwardRef<AppIcon3DCollectionBinding, ProbeProps>(function Probe({ items }, ref) {
  const binding = useAppIcon3DCollection(items);
  useImperativeHandle(ref, () => binding, [binding]);
  return null;
});

let root: Root;
let host: HTMLDivElement;
let bindingRef: RefObject<AppIcon3DCollectionBinding | null>;

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
  bindingRef = createRef<AppIcon3DCollectionBinding>();
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

describe('useAppIcon3DCollection', () => {
  it('preserves motion by id while items are reordered, added, and removed', () => {
    act(() => root.render(<Probe ref={bindingRef} items={[{ id: 'a' }, { id: 'b' }]} />));
    const originalA = bindingRef.current?.motions.get('a');
    const originalB = bindingRef.current?.motions.get('b');

    act(() => root.render(<Probe ref={bindingRef} items={[{ id: 'b' }, { id: 'c' }]} />));

    expect(bindingRef.current?.motions.has('a')).toBe(false);
    expect(bindingRef.current?.motions.get('b')).toBe(originalB);
    expect(bindingRef.current?.motions.get('b')).not.toBe(originalA);
    expect(bindingRef.current?.motions.has('c')).toBe(true);
  });

  it('returns slot attributes and suppresses the click following a drag', () => {
    act(() => root.render(<Probe ref={bindingRef} items={[{ id: 42 }]} />));
    const binding = bindingRef.current!;
    const motion = binding.motions.get(42)!;
    motion.didDrag = true;
    const props = binding.getSlotProps(42);
    const event = { preventDefault: vi.fn(), stopPropagation: vi.fn() };

    expect(props['data-app-icon-id']).toBe('42');
    props.onClick(event as never);
    expect(event.preventDefault).toHaveBeenCalledTimes(1);
    expect(event.stopPropagation).toHaveBeenCalledTimes(1);
  });
});
