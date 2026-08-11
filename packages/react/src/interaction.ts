export interface IconRotation {
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
}

export function shouldAnimateIcon(autoRotate: boolean, reducedMotion: boolean): boolean {
  return autoRotate && !reducedMotion;
}

/** Advances auto-rotation and damping without allocating during a render frame. */
export function updateIconRotation(
  rotation: IconRotation,
  delta: number,
  autoRotate: boolean,
  reducedMotion: boolean,
  dragging: boolean
): IconRotation {
  const damping = Math.pow(0.08, delta);
  const spin = shouldAnimateIcon(autoRotate, reducedMotion) && !dragging ? 0.34 * delta : 0;
  return {
    x: rotation.x + (dragging ? 0 : rotation.velocityX * delta),
    y: rotation.y + spin + (dragging ? 0 : rotation.velocityY * delta),
    velocityX: dragging ? rotation.velocityX : rotation.velocityX * damping,
    velocityY: dragging ? rotation.velocityY : rotation.velocityY * damping
  };
}
