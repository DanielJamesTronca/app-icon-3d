export interface RgbaImageData {
  width: number;
  height: number;
  data: Uint8Array;
}

/** Samples non-transparent perimeter pixels in a deterministic clockwise order. */
export function sampleEdgeColor(image: RgbaImageData): string {
  const pixels: [number, number, number][] = [];
  const add = (x: number, y: number) => {
    const offset = (y * image.width + x) * 4;
    const alpha = image.data[offset + 3] ?? 0;
    if (alpha > 8) pixels.push([image.data[offset] ?? 0, image.data[offset + 1] ?? 0, image.data[offset + 2] ?? 0]);
  };
  for (let x = 0; x < image.width; x += 1) add(x, 0);
  for (let y = 1; y < image.height; y += 1) add(image.width - 1, y);
  for (let x = image.width - 2; x >= 0; x -= 1) add(x, image.height - 1);
  for (let y = image.height - 2; y > 0; y -= 1) add(0, y);
  if (pixels.length === 0) return '#6e7585';
  const total = pixels.reduce((sum, pixel) => [sum[0] + pixel[0], sum[1] + pixel[1], sum[2] + pixel[2]], [0, 0, 0]);
  return `#${total.map((channel) => Math.round(channel / pixels.length).toString(16).padStart(2, '0')).join('')}`;
}
