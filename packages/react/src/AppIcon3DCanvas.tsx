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
  return <Canvas className={className} style={style} camera={{ position: [0, 0, 4.2], fov: 38 }} dpr={[1, 2]} shadows {...canvasProps}>
    <color attach="background" args={['#f2f3f6']} />
    <ambientLight intensity={1.35} />
    <directionalLight position={[3, 4, 5]} intensity={2.4} castShadow />
    <directionalLight position={[-4, 1, 2]} intensity={0.8} color="#c7d4ff" />
    <Suspense fallback={null}><AppIcon3D {...icon} /></Suspense>
  </Canvas>;
}
