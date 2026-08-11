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

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `src` | `string` | *(required)* | Browser-reachable image URL, subject to CORS. |
| `preset` | `'ceramic' \| 'aluminum' \| 'glass'` | `'ceramic'` | Material preset — see [Presets](#presets). |
| `edgeColor` | `string` | sampled from artwork | Hex color for the icon's edge; omit to sample from the source image's perimeter. |
| `autoRotate` | `boolean` | `true` | Spins the icon when idle. Respects `prefers-reduced-motion`. |
| `interactive` | `boolean` | `true` | Enables pointer-drag rotation with inertia. |
| `quality` | `'low' \| 'medium' \| 'high'` | `'medium'` | Mesh smoothness / segment count. |
| `onReady` | `(event: { mesh: Mesh; textureUrl: string }) => void` | — | Called once the mesh and texture are ready. |

`AppIcon3DCanvas` accepts all `AppIcon3D` props plus `canvasProps` (forwarded to the underlying React Three Fiber `<Canvas>`), `className`, and `style`.

## Presets

| Ceramic | Aluminum | Glass |
| --- | --- | --- |
| Glossy dielectric with a soft bevel | Brushed-metal feel with high metalness | Clear-coated, partially transmissive surface |

Try each in the [interactive demo](https://app-icon-3d-demo.vercel.app).

## Accessibility

The renderer respects `prefers-reduced-motion`; automatic spinning stops when users request less motion. Keep a text alternative or nearby app name for meaningful artwork, and do not make a 3D preview the only way to access important information. Provide an accessible label for the canvas in your product context.

## Supported formats and limits

- Browser-reachable image URLs supported by the browser and allowed by CORS.
- V1 makes a polished extruded icon object; it does not infer deep, semantic 3D geometry from arbitrary artwork.

See the [repository](https://github.com/DanielJamesTronca/app-icon-3d) for the CLI exporter, contribution guide, and license.
