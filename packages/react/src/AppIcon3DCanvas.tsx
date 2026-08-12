import { Canvas, useStore, type CanvasProps } from '@react-three/fiber';
import { Suspense, useLayoutEffect } from 'react';
import { createIconEnvironment } from '@danieljamestronca/app-icon-3d-core';
import { AppIcon3D, type AppIcon3DProps } from './AppIcon3D.js';

export interface AppIcon3DDirectionalLight {
  position: [number, number, number];
  intensity: number;
  color?: string;
}

export interface AppIcon3DSceneOptions {
  /** CSS color for an opaque canvas, or null for transparency. */
  background?: string | null;
  camera?: CanvasProps['camera'];
  environment?: boolean;
  toneMappingExposure?: number;
  ambientLightIntensity?: number;
  directionalLights?: AppIcon3DDirectionalLight[];
}

export interface AppIcon3DCanvasProps extends AppIcon3DProps {
  canvasProps?: Omit<CanvasProps, 'children'>;
  className?: string;
  style?: React.CSSProperties;
  /** Transparent by default so the preview inherits the host site's visual design. */
  scenePreset?: 'transparent' | 'dark-studio';
  scene?: AppIcon3DSceneOptions;
}

const DEFAULT_LIGHTS: AppIcon3DDirectionalLight[] = [
  { position: [3, 4, 5], intensity: 2.1 },
  { position: [-4, 1, 2], intensity: 0.65, color: '#c7d4ff' }
];

function StudioEnvironment({ enabled }: { enabled: boolean }) {
  const store = useStore();
  useLayoutEffect(() => {
    if (!enabled) return;
    const { gl, scene } = store.getState();
    const environment = createIconEnvironment(gl);
    scene.environment = environment;
    return () => {
      if (scene.environment === environment) scene.environment = null;
      environment.dispose();
    };
  }, [enabled, store]);
  return null;
}

/** A self-contained canvas with configurable, host-friendly studio lighting. */
export function AppIcon3DCanvas({
  canvasProps,
  className,
  style,
  scenePreset = 'transparent',
  scene,
  ...icon
}: AppIcon3DCanvasProps) {
  const background = scene?.background ?? (scenePreset === 'dark-studio' ? '#151517' : null);
  const lights = scene?.directionalLights ?? DEFAULT_LIGHTS;
  const camera = scene?.camera ?? { position: [0, 0, 4.2], fov: 38 };
  const exposure = scene?.toneMappingExposure ?? 1;

  return (
    <Canvas
      className={className}
      style={style}
      camera={camera}
      dpr={[1, 1.5]}
      performance={{ min: 0.65 }}
      gl={{
        antialias: true,
        alpha: background === null,
        powerPreference: 'high-performance',
        toneMappingExposure: exposure
      }}
      {...canvasProps}
    >
      {background !== null && <color attach="background" args={[background]} />}
      <StudioEnvironment enabled={scene?.environment ?? true} />
      <ambientLight intensity={scene?.ambientLightIntensity ?? 1.2} />
      {lights.map((light, index) => (
        <directionalLight
          key={`${light.position.join(':')}:${index}`}
          position={light.position}
          intensity={light.intensity}
          color={light.color}
        />
      ))}
      <Suspense fallback={null}>
        <AppIcon3D {...icon} />
      </Suspense>
    </Canvas>
  );
}
