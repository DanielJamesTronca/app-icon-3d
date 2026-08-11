import { access, writeFile } from 'node:fs/promises';
import { extname, resolve } from 'node:path';
import { Accessor, Document, NodeIO } from '@gltf-transform/core';
import sharp from 'sharp';
import { createAppIconGeometry, createAppIconMaterials, sampleEdgeColor, type IconPreset } from '@danieljamestronca/app-icon-3d-core';

const supportedExtensions = new Set(['.png', '.jpg', '.jpeg', '.webp']);

export interface ExportIconOptions {
  input: string;
  output: string;
  preset?: IconPreset;
  edgeColor?: string;
  quality?: 'low' | 'medium' | 'high';
  textureSize?: number;
}

export interface NormalizedIconImage {
  png: Uint8Array;
  width: number;
  height: number;
  edgeColor: string;
}

export async function normalizeIconImage(input: string, textureSize = 1024): Promise<NormalizedIconImage> {
  const extension = extname(input).toLowerCase();
  if (!supportedExtensions.has(extension)) throw new Error(`Unsupported input format "${extension}". Use PNG, JPEG, or WebP.`);
  await access(input);
  const processor = sharp(input).rotate().resize(textureSize, textureSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).ensureAlpha();
  const [png, raw] = await Promise.all([
    processor.clone().png().toBuffer(),
    processor.clone().raw().toBuffer({ resolveWithObject: true })
  ]);
  return {
    png,
    width: raw.info.width,
    height: raw.info.height,
    edgeColor: sampleEdgeColor({ width: raw.info.width, height: raw.info.height, data: raw.data })
  };
}

function createAttributes(document: Document, geometry: ReturnType<typeof createAppIconGeometry>) {
  const buffer = document.createBuffer('geometry');
  const attribute = (name: string, type: 'VEC2' | 'VEC3') => {
    const value = geometry.getAttribute(name);
    if (!value) throw new Error(`Missing ${name} geometry attribute.`);
    return document.createAccessor(name).setType(type).setArray(new Float32Array(value.array)).setBuffer(buffer);
  };
  return {
    buffer,
    position: attribute('position', 'VEC3'),
    normal: attribute('normal', 'VEC3'),
    uv: attribute('uv', 'VEC2')
  };
}

function createPrimitive(
  document: Document,
  attributes: ReturnType<typeof createAttributes>,
  indices: Uint32Array<ArrayBuffer>,
  material: ReturnType<Document['createMaterial']>
) {
  const accessor = document.createAccessor('indices').setType(Accessor.Type.SCALAR).setArray(indices).setBuffer(attributes.buffer);
  return document.createPrimitive()
    .setAttribute('POSITION', attributes.position)
    .setAttribute('NORMAL', attributes.normal)
    .setAttribute('TEXCOORD_0', attributes.uv)
    .setIndices(accessor)
    .setMaterial(material);
}

/** Builds a self-contained GLB with icon caps and edge walls; cameras and lights are deliberately omitted. */
export async function exportAppIconGlb(options: ExportIconOptions): Promise<void> {
  const input = resolve(options.input);
  const output = resolve(options.output);
  const image = await normalizeIconImage(input, options.textureSize);
  const geometry = createAppIconGeometry({ quality: options.quality ?? 'high' });
  const preset = options.preset ?? 'ceramic';
  const materials = createAppIconMaterials({ preset, edgeColor: options.edgeColor ?? image.edgeColor });
  const document = new Document();
  const texture = document.createTexture('icon-texture').setMimeType('image/png').setImage(image.png);
  const faceMaterial = document.createMaterial('icon-face').setBaseColorTexture(texture).setMetallicFactor(materials.face.metalness).setRoughnessFactor(materials.face.roughness);
  const edgeColor = materials.edge.color;
  const edgeMaterial = document.createMaterial('icon-edge').setBaseColorFactor([edgeColor.r, edgeColor.g, edgeColor.b, 1]).setMetallicFactor(materials.edge.metalness).setRoughnessFactor(materials.edge.roughness);
  const attributes = createAttributes(document, geometry);
  const index = geometry.getIndex();
  const source = index
    ? new Uint32Array(index.array)
    : new Uint32Array(Array.from({ length: geometry.getAttribute('position').count }, (_, index) => index));
  const mesh = document.createMesh('app-icon');
  for (const group of geometry.groups) {
    const groupIndices = source.slice(group.start, group.start + group.count);
    mesh.addPrimitive(createPrimitive(document, attributes, groupIndices, group.materialIndex === 0 ? faceMaterial : edgeMaterial));
  }
  if (geometry.groups.length === 0) mesh.addPrimitive(createPrimitive(document, attributes, source, faceMaterial));
  const node = document.createNode('app-icon').setMesh(mesh);
  document.createScene('Scene').addChild(node);
  await writeFile(output, await new NodeIO().writeBinary(document));
  geometry.dispose();
  materials.dispose();
}
