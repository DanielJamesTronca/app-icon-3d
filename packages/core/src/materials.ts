import { Color, MeshPhysicalMaterial, type Material, type MeshPhysicalMaterialParameters, type Texture } from 'three';

export type IconPreset = 'ceramic' | 'aluminum' | 'glass';

export interface IconMaterialOverrides {
  face?: Partial<MeshPhysicalMaterialParameters>;
  edge?: Partial<MeshPhysicalMaterialParameters>;
}

export interface IconMaterialOptions {
  preset?: IconPreset;
  edgeColor?: string | number;
  map?: Texture;
  /** Shared environment reflection strength for both cap and edge materials. */
  envMapIntensity?: number;
  /** Per-material PBR overrides, applied after the preset and envMapIntensity. */
  overrides?: IconMaterialOverrides;
}

export interface IconMaterials {
  face: MeshPhysicalMaterial;
  edge: MeshPhysicalMaterial;
  all: Material[];
  dispose: () => void;
}

const presets: Record<IconPreset, { metalness: number; roughness: number; clearcoat: number; transmission: number; ior: number }> = {
  ceramic: { metalness: 0, roughness: 0.22, clearcoat: 0.55, transmission: 0, ior: 1.5 },
  aluminum: { metalness: 0.9, roughness: 0.28, clearcoat: 0.12, transmission: 0, ior: 1.45 },
  glass: { metalness: 0, roughness: 0.08, clearcoat: 1, transmission: 0.45, ior: 1.48 }
};

export function getPresetMaterialValues(preset: IconPreset = 'ceramic') {
  return { ...presets[preset] };
}

/** Creates separate cap and edge PBR materials. Apply these to the geometry's cap and wall groups. */
export function createAppIconMaterials(options: IconMaterialOptions = {}): IconMaterials {
  const preset = options.preset ?? 'ceramic';
  const values = presets[preset];
  const edgeColor = new Color(options.edgeColor ?? '#6e7585');
  const shared = { ...values, envMapIntensity: options.envMapIntensity ?? 1.1 };
  const face = new MeshPhysicalMaterial({
    ...shared,
    ...(options.map ? { map: options.map } : {}),
    color: '#ffffff',
    ...options.overrides?.face
  });
  const edge = new MeshPhysicalMaterial({ ...shared, color: edgeColor, ...options.overrides?.edge });
  return {
    face,
    edge,
    all: [face, edge],
    dispose: () => { face.dispose(); edge.dispose(); }
  };
}
