import { PMREMGenerator, type Texture, type WebGLRenderer } from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

export interface IconEnvironmentOptions {
  /** PMREM blur sigma. Softens the room's rectangular emitters into softbox-shaped highlights. */
  blur?: number;
}

/**
 * Creates a procedural PMREM studio environment owned by the caller's renderer.
 * No network request or HDR asset is required. The caller must dispose the returned
 * texture when the renderer or scene using it is unmounted.
 */
export function createIconEnvironment(
  renderer: WebGLRenderer,
  options: IconEnvironmentOptions = {}
): Texture {
  const pmrem = new PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const texture = pmrem.fromScene(room, options.blur ?? 0.04).texture;
  room.dispose();
  pmrem.dispose();
  return texture;
}
