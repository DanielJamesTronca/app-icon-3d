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
import { createPortal } from 'react-dom';
import * as THREE from 'three';
import { Canvas, useFrame, useStore, useThree, type RootState } from '@react-three/fiber';
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
import { subscribeIconRender } from './render-signals.js';
import {
  DEFAULT_MAX_TEXTURE_SIZE,
  DEFAULT_TEXTURE_CACHE_BYTES,
  disposeIconTextureCache,
  getIconTextureBucket
} from './texture-cache.js';
import { useIconTextureResource } from './useIconTexture.js';
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

export type AppIcon3DMotionMode = 'idle' | 'interaction' | 'static';

export interface AppIcon3DCollectionStats {
  totalItems: number;
  visibleItems: number;
  canvasWidth: number;
  canvasHeight: number;
  textureSizes: number[];
}

export interface AppIcon3DCollectionProps {
  /** Layout root whose `[data-app-icon-id]` descendants are mirrored into the 3D scene. */
  containerRef: RefObject<HTMLElement | null>;
  /** Optional scrollport that clips the collection. Defaults to the browser viewport. */
  viewportRef?: RefObject<HTMLElement | null>;
  items: AppIcon3DCollectionItem[];
  motions: Map<string | number, IconMotion>;
  geometry?: IconGeometryOptions;
  iconScale?: number;
  envMapIntensity?: number;
  environmentIntensity?: number;
  environmentRotationY?: number;
  toneMappingExposure?: number;
  ambientLightIntensity?: number;
  directionalLightIntensity?: number;
  directionalLightPosition?: [number, number, number];
  shadow?: AppIcon3DCollectionShadow | false;
  camera?: AppIcon3DCollectionCamera;
  motionTuning?: IconMotionTuning;
  motionMode?: AppIcon3DMotionMode;
  reducedMotion?: boolean;
  paused?: boolean;
  dpr?: [number, number];
  /** CSS pixels beyond the clipped canvas used to preload nearby icons. */
  overscan?: number;
  /** Largest decoded texture edge. Values above 1024 are clamped to 1024. */
  maxTextureSize?: number;
  /** Per-renderer and decoded-source LRU target. Active textures are never evicted. */
  textureCacheBytes?: number;
  /** Portal host for the fixed, pointer-free canvas. Defaults to document.body. */
  portalTarget?: HTMLElement | null;
  zIndex?: number;
  onItemReady?: (id: string | number) => void;
  onItemError?: (id: string | number, error: unknown) => void;
  onContextLost?: () => void;
  onContextRestored?: () => void;
  /** Diagnostic callback used by performance tooling and consumer observability. */
  onRenderStats?: (stats: AppIcon3DCollectionStats) => void;
}

interface IconLayout {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface SurfaceRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface VisibleDescriptor {
  id: string | number;
  key: string;
  textureSize: number;
}

const DEFAULT_CAMERA: Required<AppIcon3DCollectionCamera> = {
  fov: 22,
  position: [0, 0, 5.6],
  near: 1.5,
  far: 12
};
const DEFAULT_DIRECTIONAL_LIGHT_POSITION: [number, number, number] = [2.2, 3, 4];
const DEFAULT_SHADOW: AppIcon3DCollectionShadow = { opacity: 0.16 };
const isDev = typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production';

const windowViewportSubscribers = new Set<() => void>();
let listeningToWindowViewport = false;
const notifyWindowViewportSubscribers = () => {
  windowViewportSubscribers.forEach((subscriber) => subscriber());
};

function subscribeWindowViewport(subscriber: () => void) {
  windowViewportSubscribers.add(subscriber);
  if (!listeningToWindowViewport) {
    listeningToWindowViewport = true;
    window.addEventListener('resize', notifyWindowViewportSubscribers, { passive: true });
    window.addEventListener('scroll', notifyWindowViewportSubscribers, {
      passive: true,
      capture: true
    });
  }
  return () => {
    windowViewportSubscribers.delete(subscriber);
    if (windowViewportSubscribers.size === 0 && listeningToWindowViewport) {
      listeningToWindowViewport = false;
      window.removeEventListener('resize', notifyWindowViewportSubscribers);
      window.removeEventListener('scroll', notifyWindowViewportSubscribers, true);
    }
  };
}

function hasCoarsePointer(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;
}

function getDefaultDpr(): [number, number] {
  if (typeof window === 'undefined') return [1, 2];
  if (hasCoarsePointer()) return [1, 1.25];
  return [1, window.innerWidth > 2560 ? 1.5 : 2];
}

function intersectRects(a: SurfaceRect, b: SurfaceRect): SurfaceRect {
  const left = Math.max(a.left, b.left);
  const top = Math.max(a.top, b.top);
  const right = Math.min(a.left + a.width, b.left + b.width);
  const bottom = Math.min(a.top + a.height, b.top + b.height);
  return {
    left,
    top,
    width: Math.max(0, right - left),
    height: Math.max(0, bottom - top)
  };
}

function rectIntersects(a: SurfaceRect, b: SurfaceRect, overscan: number) {
  return !(
    a.left + a.width < b.left - overscan ||
    a.left > b.left + b.width + overscan ||
    a.top + a.height < b.top - overscan ||
    a.top > b.top + b.height + overscan
  );
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

function TextureCacheOwner() {
  const gl = useThree((state) => state.gl);
  useEffect(() => () => disposeIconTextureCache(gl), [gl]);
  return null;
}

function ContextLossListener({
  onLost,
  onRestored
}: {
  onLost: () => void;
  onRestored: () => void;
}) {
  const gl = useThree((state) => state.gl);
  useEffect(() => {
    const handleContextLost = (event: Event) => {
      event.preventDefault();
      onLost();
    };
    gl.domElement.addEventListener('webglcontextlost', handleContextLost);
    gl.domElement.addEventListener('webglcontextrestored', onRestored);
    return () => {
      gl.domElement.removeEventListener('webglcontextlost', handleContextLost);
      gl.domElement.removeEventListener('webglcontextrestored', onRestored);
    };
  }, [gl, onLost, onRestored]);
  return null;
}

function motionNeedsAnotherFrame(motion: IconMotion, tuning: IconMotionTuning) {
  return (
    motion.dragging ||
    motion.pointerInside ||
    Math.abs(motion.velX) > 0.001 ||
    Math.abs(motion.velY) > 0.001 ||
    Math.abs(motion.hoverPitch - motion.tiltX) > 0.001 ||
    Math.abs(motion.scale - tuning.baseScale) > 0.001
  );
}

interface IconMeshProps {
  item: AppIcon3DCollectionItem;
  motion: IconMotion;
  geometry: THREE.BufferGeometry;
  objectSize: { width: number; height: number; depth: number };
  motionMode: AppIcon3DMotionMode;
  envMapIntensity: number;
  motionTuning: IconMotionTuning;
  shadowOpacity: number | null;
  shadowTexture: THREE.CanvasTexture | null;
  textureSize: number;
  maxTextureSize: number;
  textureCacheBytes: number;
  onReady: () => void;
  onError: (error: unknown) => void;
}

function IconMesh({
  item,
  motion,
  geometry,
  objectSize,
  motionMode,
  envMapIntensity,
  motionTuning,
  shadowOpacity,
  shadowTexture,
  textureSize,
  maxTextureSize,
  textureCacheBytes,
  onReady,
  onError
}: IconMeshProps) {
  const gl = useThree((state) => state.gl);
  const invalidate = useThree((state) => state.invalidate);
  const resource = useIconTextureResource(item.src, gl, onError, {
    targetSize: textureSize,
    maxTextureSize,
    textureCacheBytes
  });
  const groupRef = useRef<THREE.Group>(null);
  const materials = useMemo(
    () =>
      createAppIconMaterials({
        preset: item.preset,
        edgeColor: item.edgeColor ?? resource?.edgeColor,
        map: resource?.texture,
        envMapIntensity,
        overrides: item.materialOverrides
      }),
    [
      item.preset,
      item.edgeColor,
      item.materialOverrides,
      resource,
      envMapIntensity
    ]
  );

  useEffect(() => () => materials.dispose(), [materials]);
  useEffect(() => {
    if (motionMode === 'static') return;
    return subscribeIconRender(motion, invalidate);
  }, [invalidate, motion, motionMode]);

  const readySource = useRef<string | null>(null);
  useEffect(() => {
    if (resource && readySource.current !== item.src) {
      readySource.current = item.src;
      onReady();
      invalidate();
    }
  }, [item.src, resource, invalidate, onReady]);

  useLayoutEffect(() => {
    if (groupRef.current) applyIconMotion(groupRef.current, motion, motionTuning);
  }, [motion, motionTuning]);

  useFrame(({ clock }, rawDelta) => {
    if (motionMode === 'static') return;
    updateIconMotion(
      motion,
      rawDelta,
      clock.getElapsedTime(),
      { idle: motionMode === 'idle' },
      motionTuning
    );
    if (groupRef.current) applyIconMotion(groupRef.current, motion, motionTuning);
    if (motionMode === 'interaction' && motionNeedsAnotherFrame(motion, motionTuning)) invalidate();
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
  layoutKey: string;
  layoutsRef: RefObject<Map<string, IconLayout>>;
  opticalScale: number;
}

function PositionedIcon({
  layoutKey,
  layoutsRef,
  objectSize,
  opticalScale,
  ...meshProps
}: PositionedIconProps) {
  const groupRef = useRef<THREE.Group>(null);
  useFrame((state) => {
    const layout = layoutsRef.current.get(layoutKey);
    if (!layout || !groupRef.current) return;
    const { x, y, scale } = projectRectToScene(layout, state.size, state.viewport, objectSize);
    groupRef.current.position.set(x, y, 0);
    groupRef.current.scale.setScalar(scale * opticalScale);
  });
  return (
    <group ref={groupRef}>
      <IconMesh {...meshProps} objectSize={objectSize} />
    </group>
  );
}

/**
 * Mirrors consumer-owned DOM slots into one bounded, portaled WebGL surface. Only slots
 * intersecting the collection's visible scrollport (plus overscan) own meshes and textures.
 */
export function AppIcon3DCollection({
  containerRef,
  viewportRef,
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
  motionMode = 'idle',
  reducedMotion,
  paused = false,
  dpr,
  overscan = 128,
  maxTextureSize = DEFAULT_MAX_TEXTURE_SIZE,
  textureCacheBytes = DEFAULT_TEXTURE_CACHE_BYTES,
  portalTarget,
  zIndex = 0,
  onItemReady,
  onItemError,
  onContextLost,
  onContextRestored,
  onRenderStats
}: AppIcon3DCollectionProps) {
  const detectedReducedMotion = useReducedMotion();
  const effectiveMotionMode = reducedMotion ?? detectedReducedMotion
    ? motionMode === 'idle'
      ? 'interaction'
      : motionMode
    : motionMode;
  const [pageVisible, setPageVisible] = useState(
    () => typeof document === 'undefined' || !document.hidden
  );
  const [surfaceVisible, setSurfaceVisible] = useState(false);
  const [contextLost, setContextLost] = useState(false);
  const [visible, setVisible] = useState<VisibleDescriptor[]>([]);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const layoutsRef = useRef(new Map<string, IconLayout>());
  const invalidateRef = useRef<RootState['invalidate'] | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const visibleSignatureRef = useRef('');
  const surfaceVisibleRef = useRef(false);
  const statsSignatureRef = useRef('');
  const warnedRef = useRef(new Set<string>());
  const itemIdsKey = items.map((item) => String(item.id)).join('\u0000');
  const resolvedDpr = useMemo(() => dpr ?? getDefaultDpr(), [dpr]);
  const resolvedCamera = useMemo(() => ({ ...DEFAULT_CAMERA, ...camera }), [camera]);

  const sharedGeometry = useMemo(() => createAppIconGeometry(geometryOptions), [geometryOptions]);
  useEffect(() => () => sharedGeometry.dispose(), [sharedGeometry]);
  const objectSize = useMemo(() => getIconGeometryDimensions(sharedGeometry), [sharedGeometry]);
  const shadowEnabled = shadow !== false;
  const shadowTexture = useMemo(
    () => (shadowEnabled ? createSoftShadowTexture() : null),
    [shadowEnabled]
  );
  useEffect(() => () => shadowTexture?.dispose(), [shadowTexture]);

  useEffect(() => {
    const handleVisibility = () => setPageVisible(!document.hidden);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    const wrapper = wrapperRef.current;
    if (!container || !wrapper) {
      if (isDev && items.length > 0 && !warnedRef.current.has('container')) {
        warnedRef.current.add('container');
        console.warn('[AppIcon3DCollection] containerRef must point to a mounted layout root.');
      }
      return;
    }

    const itemByKey = new Map(items.map((item) => [String(item.id), item]));
    if (isDev && itemByKey.size !== items.length && !warnedRef.current.has('items')) {
      warnedRef.current.add('items');
      console.warn('[AppIcon3DCollection] Item ids must be unique after string conversion.');
    }

    const measure = () => {
      animationFrameRef.current = null;
      const browserViewport: SurfaceRect = {
        left: 0,
        top: 0,
        width: window.innerWidth,
        height: window.innerHeight
      };
      const containerRect = container.getBoundingClientRect();
      const scrollportRect = viewportRef?.current?.getBoundingClientRect() ?? browserViewport;
      const surface = intersectRects(
        intersectRects(containerRect, scrollportRect),
        browserViewport
      );
      const hasSurface = surface.width > 0 && surface.height > 0;

      wrapper.style.transform = `translate3d(${surface.left}px, ${surface.top}px, 0)`;
      wrapper.style.width = `${Math.max(1, surface.width)}px`;
      wrapper.style.height = `${Math.max(1, surface.height)}px`;
      wrapper.style.visibility = hasSurface ? 'visible' : 'hidden';

      if (surfaceVisibleRef.current !== hasSurface) {
        surfaceVisibleRef.current = hasSurface;
        setSurfaceVisible(hasSurface);
      }

      const nextLayouts = new Map<string, IconLayout>();
      const nextVisible: VisibleDescriptor[] = [];
      const seenSlots = new Set<string>();
      const slots = container.querySelectorAll<HTMLElement>('[data-app-icon-id]');
      slots.forEach((slot) => {
        const key = slot.dataset.appIconId!;
        if (seenSlots.has(key) && isDev && !warnedRef.current.has(`slot:${key}`)) {
          warnedRef.current.add(`slot:${key}`);
          console.warn(`[AppIcon3DCollection] Duplicate DOM slot id "${key}".`);
        }
        seenSlots.add(key);
        const item = itemByKey.get(key);
        if (!item) return;
        const rect = slot.getBoundingClientRect();
        const slotRect: SurfaceRect = {
          left: rect.left,
          top: rect.top,
          width: rect.width,
          height: rect.height
        };
        if (!hasSurface || !rectIntersects(slotRect, surface, overscan)) return;
        nextLayouts.set(key, {
          left: rect.left - surface.left,
          top: rect.top - surface.top,
          width: rect.width,
          height: rect.height
        });
        nextVisible.push({
          id: item.id,
          key,
          textureSize: getIconTextureBucket(
            Math.max(rect.width, rect.height) * resolvedDpr[1],
            maxTextureSize
          )
        });
      });
      layoutsRef.current = nextLayouts;

      const signature = nextVisible.map((entry) => `${entry.key}:${entry.textureSize}`).join('|');
      if (signature !== visibleSignatureRef.current) {
        visibleSignatureRef.current = signature;
        setVisible(nextVisible);
      }
      const statsSignature = `${items.length}:${nextVisible.length}:${Math.round(surface.width)}:${Math.round(surface.height)}:${signature}`;
      if (statsSignature !== statsSignatureRef.current) {
        statsSignatureRef.current = statsSignature;
        onRenderStats?.({
          totalItems: items.length,
          visibleItems: nextVisible.length,
          canvasWidth: surface.width,
          canvasHeight: surface.height,
          textureSizes: nextVisible.map((entry) => entry.textureSize)
        });
      }
      invalidateRef.current?.();
    };

    const scheduleMeasure = () => {
      if (animationFrameRef.current === null) {
        animationFrameRef.current = window.requestAnimationFrame(measure);
      }
    };
    const resizeObserver = new ResizeObserver(scheduleMeasure);
    resizeObserver.observe(container);
    if (viewportRef?.current) resizeObserver.observe(viewportRef.current);
    const observeSlots = () => {
      resizeObserver.disconnect();
      resizeObserver.observe(container);
      if (viewportRef?.current) resizeObserver.observe(viewportRef.current);
      container
        .querySelectorAll<HTMLElement>('[data-app-icon-id]')
        .forEach((slot) => resizeObserver.observe(slot));
      scheduleMeasure();
    };
    observeSlots();
    const mutationObserver = new MutationObserver(observeSlots);
    mutationObserver.observe(container, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['data-app-icon-id']
    });
    const unsubscribeWindow = subscribeWindowViewport(scheduleMeasure);
    const scrollport = viewportRef?.current;
    scrollport?.addEventListener('scroll', scheduleMeasure, { passive: true });

    return () => {
      if (animationFrameRef.current !== null) cancelAnimationFrame(animationFrameRef.current);
      resizeObserver.disconnect();
      mutationObserver.disconnect();
      unsubscribeWindow();
      scrollport?.removeEventListener('scroll', scheduleMeasure);
    };
  }, [
    containerRef,
    viewportRef,
    itemIdsKey,
    items,
    maxTextureSize,
    onRenderStats,
    overscan,
    resolvedDpr
  ]);

  const handleReady = useCallback((id: string | number) => onItemReady?.(id), [onItemReady]);
  const handleError = useCallback(
    (id: string | number, error: unknown) => onItemError?.(id, error),
    [onItemError]
  );
  const handleContextLost = useCallback(() => {
    setContextLost(true);
    onContextLost?.();
  }, [onContextLost]);
  const handleContextRestored = useCallback(() => {
    setContextLost(false);
    onContextRestored?.();
  }, [onContextRestored]);

  const active = surfaceVisible && pageVisible && !paused && !contextLost;
  const target = portalTarget ?? (typeof document !== 'undefined' ? document.body : null);
  if (!target) return null;

  return createPortal(
    <div
      ref={wrapperRef}
      aria-hidden="true"
      data-app-icon-canvas=""
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: 1,
        height: 1,
        overflow: 'hidden',
        pointerEvents: 'none',
        visibility: 'hidden',
        zIndex
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
        frameloop={active && effectiveMotionMode === 'idle' ? 'always' : active ? 'demand' : 'never'}
        onCreated={(state) => {
          invalidateRef.current = state.invalidate;
        }}
      >
        <ContextLossListener onLost={handleContextLost} onRestored={handleContextRestored} />
        <TextureCacheOwner />
        <RendererSettings toneMappingExposure={toneMappingExposure} />
        <SceneEnvironment intensity={environmentIntensity} rotationY={environmentRotationY} />
        <ambientLight intensity={ambientLightIntensity} />
        <directionalLight
          position={directionalLightPosition}
          intensity={directionalLightIntensity}
        />
        {visible.map((descriptor) => {
          const item = items.find((candidate) => candidate.id === descriptor.id);
          const motion = item ? motions.get(item.id) : undefined;
          if (!item || !motion) return null;
          return (
            <PositionedIcon
              key={descriptor.key}
              layoutKey={descriptor.key}
              layoutsRef={layoutsRef}
              objectSize={objectSize}
              opticalScale={iconScale * (item.scale ?? 1)}
              item={item}
              motion={motion}
              geometry={sharedGeometry}
              motionMode={effectiveMotionMode}
              envMapIntensity={envMapIntensity}
              motionTuning={motionTuning}
              shadowOpacity={shadowEnabled && shadow ? shadow.opacity : null}
              shadowTexture={shadowTexture}
              textureSize={descriptor.textureSize}
              maxTextureSize={maxTextureSize}
              textureCacheBytes={textureCacheBytes}
              onReady={() => handleReady(item.id)}
              onError={(error) => handleError(item.id, error)}
            />
          );
        })}
      </Canvas>
    </div>,
    target
  );
}
