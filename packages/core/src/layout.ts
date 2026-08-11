export interface IconLayoutRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface IconCanvasSize {
  width: number;
  height: number;
}

export interface IconViewportSize {
  width: number;
  height: number;
}

export interface IconObjectSize {
  width: number;
  height: number;
}

export interface IconSceneTransform {
  x: number;
  y: number;
  scale: number;
}

/**
 * Projects a DOM rect (measured relative to the canvas element) into scene-space
 * position and scale, so a Three.js object can sit exactly over its DOM counterpart.
 * `canvas` is the render target's CSS-pixel size; `viewport` is the camera's world-unit
 * size at the icon's depth (e.g. from R3F's `useThree((s) => s.viewport)`). `object`
 * is the unscaled geometry size. The returned uniform scale fits the object inside the
 * rect without distortion.
 */
export function projectRectToScene(
  rect: IconLayoutRect,
  canvas: IconCanvasSize,
  viewport: IconViewportSize,
  object: IconObjectSize
): IconSceneTransform {
  if (
    canvas.width <= 0 ||
    canvas.height <= 0 ||
    viewport.width <= 0 ||
    viewport.height <= 0 ||
    object.width <= 0 ||
    object.height <= 0
  ) {
    return { x: 0, y: 0, scale: 0 };
  }

  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  const x = (centerX / canvas.width - 0.5) * viewport.width;
  const y = (0.5 - centerY / canvas.height) * viewport.height;
  const worldWidth = (rect.width / canvas.width) * viewport.width;
  const worldHeight = (rect.height / canvas.height) * viewport.height;
  const scale = Math.min(worldWidth / object.width, worldHeight / object.height);
  return { x, y, scale };
}
