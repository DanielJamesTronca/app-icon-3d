import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Group, Mesh } from 'three';
import {
  createAppIconGeometry,
  createAppIconMaterials,
  type IconGeometryOptions,
  type IconMaterialOverrides,
  type IconPreset,
  type IconQuality
} from '@danieljamestronca/app-icon-3d-core';
import { updateIconRotation, type IconRotation } from './interaction.js';
import { useIconTextureResource } from './useIconTexture.js';
import { useReducedMotion } from './useReducedMotion.js';

export interface AppIconReadyEvent {
  mesh: Mesh;
  textureUrl: string;
}

export interface AppIcon3DProps {
  src: string;
  preset?: IconPreset;
  edgeColor?: string;
  autoRotate?: boolean;
  interactive?: boolean;
  quality?: IconQuality;
  geometry?: IconGeometryOptions;
  materialOverrides?: IconMaterialOverrides;
  envMapIntensity?: number;
  onReady?: (event: AppIconReadyEvent) => void;
  onError?: (error: unknown) => void;
}

const initialRotation: IconRotation = { x: -0.14, y: -0.44, velocityX: 0, velocityY: 0 };

/** Place inside an existing @react-three/fiber Canvas. */
export function AppIcon3D({
  src,
  preset = 'ceramic',
  edgeColor,
  autoRotate = true,
  interactive = true,
  quality = 'medium',
  geometry: geometryOptions,
  materialOverrides,
  envMapIntensity,
  onReady,
  onError
}: AppIcon3DProps) {
  const group = useRef<Group>(null);
  const mesh = useRef<Mesh>(null);
  const dragging = useRef(false);
  const pointer = useRef({ x: 0, y: 0 });
  const rotation = useRef<IconRotation>({ ...initialRotation });
  const reducedMotion = useReducedMotion();
  const gl = useThree((state) => state.gl);
  const resource = useIconTextureResource(src, gl, onError);
  const geometry = useMemo(
    () => createAppIconGeometry({ quality, ...geometryOptions }),
    [geometryOptions, quality]
  );
  const materials = useMemo(
    () =>
      createAppIconMaterials({
        preset,
        edgeColor: edgeColor ?? resource?.edgeColor,
        map: resource?.texture,
        envMapIntensity,
        overrides: materialOverrides
      }),
    [preset, edgeColor, resource, envMapIntensity, materialOverrides]
  );

  useEffect(() => () => {
    geometry.dispose();
    materials.dispose();
  }, [geometry, materials]);
  useEffect(() => {
    if (resource && mesh.current) onReady?.({ mesh: mesh.current, textureUrl: src });
  }, [onReady, resource, src]);

  useFrame((_, delta) => {
    const next = updateIconRotation(rotation.current, delta, autoRotate, reducedMotion, dragging.current);
    rotation.current = next;
    if (group.current) group.current.rotation.set(next.x, next.y, 0);
  });

  const onPointerDown = useCallback((event: ThreeEvent<PointerEvent>) => {
    if (!interactive) return;
    event.stopPropagation();
    if (event.nativeEvent.target instanceof HTMLElement) event.nativeEvent.target.setPointerCapture(event.pointerId);
    pointer.current = { x: event.clientX, y: event.clientY };
    dragging.current = true;
  }, [interactive]);
  const onPointerMove = useCallback((event: ThreeEvent<PointerEvent>) => {
    if (!dragging.current) return;
    const dx = event.clientX - pointer.current.x;
    const dy = event.clientY - pointer.current.y;
    pointer.current = { x: event.clientX, y: event.clientY };
    rotation.current.x += dy * 0.012;
    rotation.current.y += dx * 0.012;
    rotation.current.velocityX = dy * 0.5;
    rotation.current.velocityY = dx * 0.5;
    group.current?.rotation.set(rotation.current.x, rotation.current.y, 0);
  }, []);
  const onPointerEnd = useCallback((event: ThreeEvent<PointerEvent>) => {
    if (!dragging.current) return;
    if (event.nativeEvent.target instanceof HTMLElement) event.nativeEvent.target.releasePointerCapture(event.pointerId);
    dragging.current = false;
  }, []);

  return <group ref={group} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerEnd} onPointerCancel={onPointerEnd}>
    <mesh ref={mesh} geometry={geometry} material={materials.all} castShadow receiveShadow />
  </group>;
}
