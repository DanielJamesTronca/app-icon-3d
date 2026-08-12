# @danieljamestronca/app-icon-3d

Render a local or remote app-icon image as a polished, interactive 3D object inside React Three Fiber — no backend, no telemetry, all image work stays in the browser.

[Live demo](https://app-icon-3d-demo.vercel.app) · [Repository](https://github.com/DanielJamesTronca/app-icon-3d) · [CLI package](https://www.npmjs.com/package/@danieljamestronca/app-icon-3d-cli)

![Rotating empty 3D app icon](https://raw.githubusercontent.com/DanielJamesTronca/app-icon-3d/main/media/app-icon-3d.gif)

## Install

```sh
npm install three @react-three/fiber @danieljamestronca/app-icon-3d
```

## Usage

For a self-contained canvas:

```tsx
import { AppIcon3DCanvas } from '@danieljamestronca/app-icon-3d';

export function Icon() {
  return <AppIcon3DCanvas src="/icon.png" preset="ceramic" autoRotate interactive />;
}
```

Or place `AppIcon3D` inside an existing React Three Fiber `<Canvas>`:

```tsx
<Canvas>
  <AppIcon3D src="/icon.png" preset="aluminum" edgeColor="#657089" />
</Canvas>
```

The framework-free geometry and material helpers are exported too: `createAppIconGeometry`, `createAppIconMaterials`, `createSquircleShape`, and `getPresetMaterialValues`.

## `AppIcon3D` props

| Prop          | Type                                                  | Default              | Description                                                                      |
| ------------- | ----------------------------------------------------- | -------------------- | -------------------------------------------------------------------------------- |
| `src`         | `string`                                              | _(required)_         | Browser-reachable image URL, subject to CORS.                                    |
| `preset`      | `'ceramic' \| 'aluminum' \| 'glass'`                  | `'ceramic'`          | Material preset — see [Presets](#presets).                                       |
| `edgeColor`   | `string`                                              | sampled from artwork | Hex color for the icon's edge; omit to sample from the source image's perimeter. |
| `autoRotate`  | `boolean`                                             | `true`               | Spins the icon when idle. Respects `prefers-reduced-motion`.                     |
| `interactive` | `boolean`                                             | `true`               | Enables pointer-drag rotation with inertia.                                      |
| `quality`     | `'low' \| 'medium' \| 'high'`                         | `'medium'`           | Mesh smoothness / segment count.                                                 |
| `geometry`    | `IconGeometryOptions`                                  | —                    | Overrides size, corners, depth, bevel, and quality.                              |
| `materialOverrides` | `IconMaterialOverrides`                         | —                    | Overrides face and edge PBR parameters.                                          |
| `envMapIntensity` | `number`                                          | `1.1`                | Controls reflected environment strength.                                        |
| `onReady`     | `(event: { mesh: Mesh; textureUrl: string }) => void` | —                    | Called once the mesh and texture are ready.                                      |
| `onError`     | `(error: unknown) => void`                            | —                    | Reports image decode/load failures.                                              |

`AppIcon3DCanvas` accepts all `AppIcon3D` props plus `canvasProps` (forwarded to the underlying React Three Fiber `<Canvas>`), `className`, and `style`.
It is transparent by default. Use `scenePreset="dark-studio"` for the original backdrop or `scene`
to customize the background, camera, environment, exposure, and lights.

## Rendering multiple icons

`AppIcon3DCollection` mirrors consumer-owned DOM slots into one shared WebGL canvas. It does not
render cards, labels, links, or a specific CSS layout, so the same component can back a grid, list,
or any responsive collection. Give each visual slot `data-app-icon-id={item.id}`, keep interaction
and accessibility on the DOM. `useAppIcon3DCollection` owns stable motion objects and pointer props;
`useIconPointer` remains available for lower-level control.

```tsx
import { useRef } from 'react';
import {
  AppIcon3DCollection,
  useAppIcon3DCollection
} from '@danieljamestronca/app-icon-3d';

const items = [
  { id: 'weather', src: '/icons/weather.png', edgeColor: '#3a6ff7' },
  { id: 'notes', src: '/icons/notes.png', edgeColor: '#f7b23a' }
];

export function IconCollection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const collection = useAppIcon3DCollection(items);

  return (
    <div ref={containerRef} className="relative grid grid-cols-2 gap-4">
      {items.map((item) => {
        return (
          <button key={item.id} className="relative aspect-square">
            <div
              className="absolute inset-0"
              {...collection.getSlotProps(item.id)}
            />
          </button>
        );
      })}
      <AppIcon3DCollection
        containerRef={containerRef}
        items={items}
        motions={collection.motions}
      />
    </div>
  );
}
```

The collection portals one bounded canvas to `document.body`, clips it against the browser and an
optional `viewportRef`, and mounts only visible slots plus `overscan`. Pass `portalTarget` and `zIndex`
for custom stacking. Adaptive cached textures are capped by `maxTextureSize` (1024 by default) and
unused entries are evicted toward `textureCacheBytes` (64 MiB by default). Omitted edge colors are
sampled locally from the artwork.

Use `motionMode="idle" | "interaction" | "static"` to choose continuous visible rotation,
demand-driven pointer/inertia animation, or a stationary render. The collection also pauses offscreen,
on hidden tabs, when `paused`, and during context loss, then resumes after restoration.

For long lists, keep virtualization in the DOM layer: pass the scrollport as `viewportRef` and the
virtualizer's inner layout node as `containerRef`. Only mounted, visible DOM slots receive 3D objects.

## Presets

| Ceramic                             | Aluminum                               | Glass                                        |
| ----------------------------------- | -------------------------------------- | -------------------------------------------- |
| Glossy dielectric with a soft bevel | Brushed-metal feel with high metalness | Clear-coated, partially transmissive surface |

Try each in the [interactive demo](https://app-icon-3d-demo.vercel.app).

## Accessibility

The renderer respects `prefers-reduced-motion`; automatic spinning stops when users request less motion. Keep a text alternative or nearby app name for meaningful artwork, and do not make a 3D preview the only way to access important information. Provide an accessible label for the canvas in your product context.

## Supported formats and limits

- Browser-reachable image URLs supported by the browser and allowed by CORS.
- V1 makes a polished extruded icon object; it does not infer deep, semantic 3D geometry from arbitrary artwork.

See the [repository](https://github.com/DanielJamesTronca/app-icon-3d) for the CLI exporter, contribution guide, and license.
