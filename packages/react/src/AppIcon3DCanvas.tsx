import { Canvas, type CanvasProps } from '@react-three/fiber';
import { Suspense } from 'react';
import { AppIcon3D, type AppIcon3DProps } from './AppIcon3D.js';

export interface AppIcon3DCanvasProps extends AppIcon3DProps {
  canvasProps?: Omit<CanvasProps, 'children'>;
  className?: string;
  style?: React.CSSProperties;
}

/** A self-contained, accessible canvas with neutral studio lights. */
export function AppIcon3DCanvas({ canvasProps, className, style, ...icon }: AppIcon3DCanvasProps) {
  return <Canvas className={className} style={style} camera={{ position: [0, 0, 4.2], fov: 38 }} dpr={[1, 1.5]} performance={{ min: 0.65 }} gl={{ antialias: true, powerPreference: 'high-performance' }} {...canvasProps}>
    <color attach="background" args={['#151517']} />
    <ambientLight intensity={1.2} />
    <directionalLight position={[3, 4, 5]} intensity={2.1} />
    <directionalLight position={[-4, 1, 2]} intensity={0.65} color="#c7d4ff" />
    <Suspense fallback={null}><AppIcon3D {...icon} /></Suspense>
  </Canvas>;
}
