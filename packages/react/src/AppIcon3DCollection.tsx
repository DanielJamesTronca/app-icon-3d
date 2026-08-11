'use client';

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type RefObject
} from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useStore, useThree } from '@react-three/fiber';
import {
  DEFAULT_ICON_MOTION_TUNING,
  applyIconMotion,
  createAppIconGeometry,
  createAppIconMaterials,
  createIconEnvironment,
  getIconGeometryDimensions,
  projectRectToScene,
  updateIconMotion,
  type IconGeometryOptions,
  type IconMaterialOverrides,
  type IconMotion,
  type IconMotionTuning,
  type IconPreset
} from '@danieljamestronca/app-icon-3d-core';
import { useIconTexture } from './useIconTexture.js';
import { useReducedMotion } from './useReducedMotion.js';

export interface AppIcon3DCollectionItem {
  id: string | number;
  src: string;
  edgeColor?: string;
  preset?: IconPreset;
  materialOverrides?: IconMaterialOverrides;
  /** Optional optical-size multiplier layered on top of the collection's `iconScale`. */
  scale?: number;
}

export interface AppIcon3DCollectionShadow {
  opacity: number;
}

export interface AppIcon3DCollectionCamera {
  fov?: number;
  position?: [number, number, number];
  near?: number;
  far?: number;
}

export interface AppIcon3DCollectionProps {
  /** Element whose `[data-app-icon-id]` descendants get measured and mirrored into the scene. */
  containerRef: RefObject<HTMLElement | null>;
  items: AppIcon3DCollectionItem[];
  /** One IconMotion per item id, created with `createIconMotion` and owned by the caller (pointer
   *  handlers write into it directly; this component only reads it every frame). */
  motions: Map<string | number, IconMotion>;
  /** Shared geometry parameters — one geometry instance is built and reused across every item. */
  geometry?: IconGeometryOptions;
  /** Shared optical-size multiplier. `1` fits each icon inside its measured DOM slot. */
  iconScale?: number;
  /** Default material envMapIntensity when an item doesn't set one via materialOverrides. */
  envMapIntensity?: number;
  environmentIntensity?: number;
  environmentRotationY?: number;
  toneMappingExposure?: number;
  ambientLightIntensity?: number;
  directionalLightIntensity?: number;
  directionalLightPosition?: [number, number, number];
  /** Soft contact-shadow sprite under each icon. Pass `false` to disable. */
  shadow?: AppIcon3DCollectionShadow | false;
  camera?: AppIcon3DCollectionCamera;
  motionTuning?: IconMotionTuning;
  /** Defaults to the browser's prefers-reduced-motion setting when omitted. */
  reducedMotion?: boolean;
  /** External pause switch (e.g. a menu overlay open) layered on top of the built-in
   *  viewport/tab-visibility gating. */
  paused?: boolean;
  dpr?: [number, number];
  onItemReady?: (id: string | number) => void;
  onItemError?: (id: string | number, error: unknown) => void;
  onContextLost?: () => void;
}

interface IconLayout {
  left: number;
  top: number;
  width: number;
  height: number;
}

const DEFAULT_CAMERA: Required<AppIcon3DCollectionCamera> = {
  fov: 22,
  position: [0, 0, 5.6],
  near: 1.5,
  far: 12
};
const DEFAULT_DIRECTIONAL_LIGHT_POSITION: [number, number, number] = [2.2, 3, 4];
const DEFAULT_SHADOW: AppIcon3DCollectionShadow = { opacity: 0.16 };

// `process` isn't guaranteed to exist for every consumer of a browser-targeted ESM bundle
// (only bundler-defined builds get it inlined), so this guards rather than assuming Node.
const isDev = typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production';

function hasCoarsePointer(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;
}

function getDefaultDpr(): [number, number] {
  if (typeof window === 'undefined') return [1, 2];
  if (hasCoarsePointer()) return [1, 1.25];
  return [1, window.innerWidth > 2560 ? 1.5 : 2];
}

function createSoftShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 64;
  const context = canvas.getContext('2d')!;
  const gradient = context.createRadialGradient(64, 32, 2, 64, 32, 58);
  gradient.addColorStop(0, 'rgba(0, 0, 0, 0.9)');
  gradient.addColorStop(0.38, 'rgba(0, 0, 0, 0.42)');
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 128, 64);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

/** Assigns a renderer-owned procedural studio environment to the collection scene. */
function SceneEnvironment({ intensity, rotationY }: { intensity: number; rotationY: number }) {
  const store = useStore();

  useLayoutEffect(() => {
    const { gl, scene } = store.getState();
    const environment = createIconEnvironment(gl);
    scene.environment = environment;
    return () => {
      if (scene.environment === environment) scene.environment = null;
      environment.dispose();
    };
  }, [store]);

  useLayoutEffect(() => {
    const { scene } = store.getState();
    scene.environmentIntensity = intensity;
    scene.environmentRotation.set(0, rotationY, 0);
  }, [store, intensity, rotationY]);

  return null;
}

function RendererSettings({ toneMappingExposure }: { toneMappingExposure: number }) {
  const store = useStore();

  useLayoutEffect(() => {
    const { gl } = store.getState();
    gl.toneMapping = THREE.NeutralToneMapping;
    gl.toneMappingExposure = toneMappingExposure;
  }, [store, toneMappingExposure]);

  return null;
}

function ContextLossListener({ onLost }: { onLost: () => void }) {
  const gl = useThree((state) => state.gl);

  useEffect(() => {
    const handleContextLost = (event: Event) => {
      event.preventDefault();
      onLost();
    };
    gl.domElement.addEventListener('webglcontextlost', handleContextLost);
    return () => gl.domElement.removeEventListener('webglcontextlost', handleContextLost);
  }, [gl, onLost]);

  return null;
}

interface IconMeshProps {
  item: AppIcon3DCollectionItem;
  motion: IconMotion;
  geometry: THREE.BufferGeometry;
  objectSize: { width: number; height: number; depth: number };
  idleMotion: boolean;
  envMapIntensity: number;
  motionTuning: IconMotionTuning;
  shadowOpacity: number | null;
  shadowTexture: THREE.CanvasTexture | null;
  onReady: () => void;
  onError: (error: unknown) => void;
}

/** One icon's scene contents: shared geometry, its own texture/materials, and per-frame motion. */
function IconMesh({
  item,
  motion,
  geometry,
  objectSize,
  idleMotion,
  envMapIntensity,
  motionTuning,
  shadowOpacity,
  shadowTexture,
  onReady,
  onError
}: IconMeshProps) {
  const gl = useThree((s) => s.gl);
  const texture = useIconTexture(item.src, gl, onError);
  const groupRef = useRef<THREE.Group>(null);

  const materials = useMemo(
    () =>
      createAppIconMaterials({
        preset: item.preset,
        edgeColor: item.edgeColor,
        map: texture ?? undefined,
        envMapIntensity,
        overrides: item.materialOverrides
      }),
    [item.preset, item.edgeColor, texture, envMapIntensity, item.materialOverrides]
  );

  useEffect(() => () => materials.dispose(), [materials]);

  const readySource = useRef<string | null>(null);
  useEffect(() => {
    if (texture && readySource.current !== item.src) {
      readySource.current = item.src;
      onReady();
    }
  }, [item.src, texture, onReady]);

  useFrame(({ clock }, rawDelta) => {
    updateIconMotion(motion, rawDelta, clock.getElapsedTime(), { idle: idleMotion }, motionTuning);
    if (groupRef.current) applyIconMotion(groupRef.current, motion, motionTuning);
  });

  return (
    <>
      {shadowTexture && shadowOpacity !== null && (
        <sprite
          position={[0, objectSize.height * -0.55, -objectSize.depth / 2 - 0.04]}
          scale={[objectSize.width * 0.9, objectSize.height * 0.2, 1]}
        >
          <spriteMaterial
            map={shadowTexture}
            color={0x000000}
            transparent
            opacity={shadowOpacity}
            depthWrite={false}
            toneMapped={false}
          />
        </sprite>
      )}
      <group ref={groupRef}>
        <mesh geometry={geometry} material={materials.all} />
      </group>
    </>
  );
}

interface PositionedIconProps extends IconMeshProps {
  layout: IconLayout;
  opticalScale: number;
}

function PositionedIcon({ layout, objectSize, opticalScale, ...meshProps }: PositionedIconProps) {
  const size = useThree((state) => state.size);
  const viewport = useThree((state) => state.viewport);
  const { x, y, scale } = projectRectToScene(layout, size, viewport, objectSize);

  return (
    <group position={[x, y, 0]} scale={scale * opticalScale}>
      <IconMesh {...meshProps} objectSize={objectSize} />
    </group>
  );
}

/**
 * Renders every item in `items` inside a single shared WebGL canvas, positioned to exactly
 * cover each item's `[data-app-icon-id]` DOM counterpart inside `containerRef`. The canvas
 * itself is `pointer-events: none`; render your own DOM overlay per item (sized via CSS,
 * hooked up with `useIconPointer`) so it keeps handling focus, keyboard access, and clicks.
 *
 * Automatically pauses the render loop — and hides the canvas without unmounting it, so there's
 * no flash on resume — when the container leaves the viewport, the tab is hidden, or `paused`
 * is set. On WebGL context loss it stops rendering and calls `onContextLost`; render your own
 * flat fallback in response.
 */
export function AppIcon3DCollection({
  containerRef,
  items,
  motions,
  geometry: geometryOptions,
  iconScale = 1,
  envMapIntensity = 1.1,
  environmentIntensity = 0.7,
  environmentRotationY = Math.PI * 0.15,
  toneMappingExposure = 0.94,
  ambientLightIntensity = 0.12,
  directionalLightIntensity = 0.4,
  directionalLightPosition = DEFAULT_DIRECTIONAL_LIGHT_POSITION,
  shadow = DEFAULT_SHADOW,
  camera,
  motionTuning = DEFAULT_ICON_MOTION_TUNING,
  reducedMotion,
  paused = false,
  dpr,
  onItemReady,
  onItemError,
  onContextLost
}: AppIcon3DCollectionProps) {
  const detectedReducedMotion = useReducedMotion();
  const effectiveReducedMotion = reducedMotion ?? detectedReducedMotion;

  const [inViewport, setInViewport] = useState(true);
  const [pageVisible, setPageVisible] = useState(
    () => typeof document === 'undefined' || !document.hidden
  );
  const [contextLost, setContextLost] = useState(false);
  const [layouts, setLayouts] = useState<Record<string, IconLayout>>({});
  const warnedRef = useRef(false);
  const itemIdsKey = items.map((item) => String(item.id)).join('\u0000');

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => setInViewport(entry.isIntersecting), {
      rootMargin: '100px'
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [containerRef]);

  useEffect(() => {
    const handleVisibility = () => setPageVisible(!document.hidden);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  // Plain useEffect, not useLayoutEffect: `containerRef` is typically owned by an ANCESTOR
  // element the caller renders around this component (see the README example). React commits
  // refs and layout effects bottom-up, so a descendant's layout effect can still observe an
  // ancestor's ref as null — that ancestor's own ref commits after this component's subtree
  // does. A plain effect runs after the full commit (including ancestor refs), so it's the
  // only options that reliably sees `containerRef.current` populated here.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      if (isDev && items.length > 0 && !warnedRef.current) {
        warnedRef.current = true;
        console.warn(
          '[AppIcon3DCollection] containerRef.current is null, so no icons can be measured or rendered. ' +
            'Make sure containerRef is attached to a mounted DOM element that AppIcon3DCollection renders inside of — see the README usage example.'
        );
      }
      return;
    }

    const tiles = Array.from(container.querySelectorAll<HTMLElement>('[data-app-icon-id]'));

    if (isDev && items.length > 0 && tiles.length === 0 && !warnedRef.current) {
      warnedRef.current = true;
      console.warn(
        '[AppIcon3DCollection] Found 0 elements with a [data-app-icon-id] attribute inside containerRef, ' +
          `but received ${items.length} item(s). Give each item's DOM overlay element ` +
          'data-app-icon-id={item.id} so AppIcon3DCollection can measure and position it — see the README usage example.'
      );
    }

    const measure = () => {
      const containerRect = container.getBoundingClientRect();
      const next: Record<string, IconLayout> = {};

      for (const tile of tiles) {
        const id = tile.dataset.appIconId!;
        const rect = tile.getBoundingClientRect();
        next[id] = {
          left: rect.left - containerRect.left,
          top: rect.top - containerRect.top,
          width: rect.width,
          height: rect.height
        };
      }

      setLayouts(next);
    };

    measure();
    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(container);
    tiles.forEach((tile) => resizeObserver.observe(tile));
    return () => resizeObserver.disconnect();
  }, [containerRef, itemIdsKey, items.length]);

  const resolvedDpr = useMemo(() => dpr ?? getDefaultDpr(), [dpr]);
  const resolvedCamera = useMemo(() => ({ ...DEFAULT_CAMERA, ...camera }), [camera]);

  // Memoize the `geometry` prop object on the caller's side (e.g. useMemo) — an inline
  // object literal here would rebuild this geometry, shared by every item, on every render.
  const sharedGeometry = useMemo(() => createAppIconGeometry(geometryOptions), [geometryOptions]);
  useEffect(() => () => sharedGeometry.dispose(), [sharedGeometry]);
  const objectSize = useMemo(() => {
    return getIconGeometryDimensions(sharedGeometry);
  }, [sharedGeometry]);

  const shadowEnabled = shadow !== false;
  const shadowTexture = useMemo(
    () => (shadowEnabled ? createSoftShadowTexture() : null),
    [shadowEnabled]
  );
  useEffect(() => () => shadowTexture?.dispose(), [shadowTexture]);

  const active = inViewport && pageVisible && !paused && !contextLost;

  const handleReady = useCallback((id: string | number) => onItemReady?.(id), [onItemReady]);
  const handleError = useCallback(
    (id: string | number, error: unknown) => onItemError?.(id, error),
    [onItemError]
  );
  const handleContextLost = useCallback(() => {
    setContextLost(true);
    onContextLost?.();
  }, [onContextLost]);

  if (contextLost) return null;

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 1,
        visibility: active ? 'visible' : 'hidden'
      }}
    >
      <Canvas
        style={{ pointerEvents: 'none' }}
        gl={{
          antialias: true,
          alpha: true,
          preserveDrawingBuffer: false,
          powerPreference: 'high-performance',
          toneMapping: THREE.NeutralToneMapping,
          toneMappingExposure
        }}
        camera={resolvedCamera}
        dpr={resolvedDpr}
        frameloop={active ? 'always' : 'never'}
      >
        <ContextLossListener onLost={handleContextLost} />
        <RendererSettings toneMappingExposure={toneMappingExposure} />
        <SceneEnvironment intensity={environmentIntensity} rotationY={environmentRotationY} />
        <ambientLight intensity={ambientLightIntensity} />
        <directionalLight
          position={directionalLightPosition}
          intensity={directionalLightIntensity}
        />
        {items.map((item) => {
          const layout = layouts[String(item.id)];
          const motion = motions.get(item.id);
          if (!layout || !motion) return null;
          return (
            <PositionedIcon
              key={item.id}
              layout={layout}
              objectSize={objectSize}
              opticalScale={iconScale * (item.scale ?? 1)}
              item={item}
              motion={motion}
              geometry={sharedGeometry}
              idleMotion={!effectiveReducedMotion}
              envMapIntensity={envMapIntensity}
              motionTuning={motionTuning}
              shadowOpacity={shadowEnabled && shadow ? shadow.opacity : null}
              shadowTexture={shadowTexture}
              onReady={() => handleReady(item.id)}
              onError={(error) => handleError(item.id, error)}
            />
          );
        })}
      </Canvas>
    </div>
  );
}
