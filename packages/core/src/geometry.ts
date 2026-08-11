import {
  ExtrudeGeometry,
  Shape,
  type BufferGeometry,
  type ExtrudeGeometryOptions
} from 'three';

export type IconQuality = 'low' | 'medium' | 'high';

export interface IconGeometryOptions {
  /** Width and height of the icon face, in scene units. */
  size?: number;
  /** Continuous-corner radius as a fraction of the icon size. */
  cornerRadius?: number;
  /** Icon thickness. */
  depth?: number;
  /** Bevel size. */
  bevel?: number;
  quality?: IconQuality;
}

const qualitySegments: Record<IconQuality, number> = { low: 24, medium: 48, high: 72 };

/** A continuous-corner superellipse, matching the optical character of native app icons. */
export function createSquircleShape(size = 2, cornerRadius = 0.34): Shape {
  const half = size / 2;
  const shape = new Shape();
  const exponent = Math.max(2, 3 + cornerRadius * 9.09);
  const power = 2 / exponent;
  const segments = 72;
  for (let index = 0; index <= segments; index += 1) {
    const angle = Math.PI + (index / segments) * Math.PI * 2;
    const cosine = Math.cos(angle);
    const sine = Math.sin(angle);
    const x = half * Math.sign(cosine) * Math.pow(Math.abs(cosine), power);
    const y = half * Math.sign(sine) * Math.pow(Math.abs(sine), power);
    if (index === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  return shape;
}

/**
 * Creates a centered, bevelled continuous-corner icon geometry. The cap group has normalized UVs,
 * so a single icon texture renders on both the front and rear face.
 */
export function createAppIconGeometry(options: IconGeometryOptions = {}): BufferGeometry {
  const {
    size = 2,
    cornerRadius = 0.22,
    depth = 0.28,
    bevel = 0.06,
    quality = 'medium'
  } = options;
  const segments = qualitySegments[quality];
  const effectiveBevel = Math.min(Math.max(bevel, 0), size / 4, Math.max(0, depth / 2 - 0.0001));
  const faceSize = Math.max(0.001, size - effectiveBevel * 2);
  const extrudeDepth = Math.max(0.001, depth - effectiveBevel * 2);
  const extrudeOptions: ExtrudeGeometryOptions = {
    depth: extrudeDepth,
    bevelEnabled: effectiveBevel > 0,
    bevelThickness: effectiveBevel,
    bevelSize: effectiveBevel,
    bevelSegments: Math.max(1, Math.ceil(segments / 2)),
    curveSegments: segments
  };
  const geometry = new ExtrudeGeometry(createSquircleShape(faceSize, cornerRadius), extrudeOptions);
  geometry.translate(0, 0, -extrudeDepth / 2);
  const cap = geometry.groups.find((group) => group.materialIndex === 0);
  const positions = geometry.getAttribute('position');
  const uvs = geometry.getAttribute('uv');
  if (cap && positions && uvs) {
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (let index = cap.start; index < cap.start + cap.count; index += 1) {
      minX = Math.min(minX, positions.getX(index));
      maxX = Math.max(maxX, positions.getX(index));
      minY = Math.min(minY, positions.getY(index));
      maxY = Math.max(maxY, positions.getY(index));
    }
    const width = Math.max(maxX - minX, Number.EPSILON);
    const height = Math.max(maxY - minY, Number.EPSILON);
    for (let index = cap.start; index < cap.start + cap.count; index += 1) {
      uvs.setXY(
        index,
        (positions.getX(index) - minX) / width,
        (positions.getY(index) - minY) / height
      );
    }
    uvs.needsUpdate = true;
  }
  geometry.computeVertexNormals();
  return geometry;
}

/** Return the axis-aligned dimensions after bevelled extrusion. */
export function getIconGeometryDimensions(geometry: BufferGeometry): { width: number; height: number; depth: number } {
  geometry.computeBoundingBox();
  const box = geometry.boundingBox;
  if (!box) throw new Error('Unable to calculate geometry bounds.');
  return { width: box.max.x - box.min.x, height: box.max.y - box.min.y, depth: box.max.z - box.min.z };
}
