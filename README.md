# app-icon-3d

Turn your app icon into a tactile 3D object—on the web or in a portable GLB—with no backend and no telemetry.

[Live demo](https://app-icon-3d-demo.vercel.app) · [React package](https://www.npmjs.com/package/@danieljamestronca/app-icon-3d) · [CLI package](https://www.npmjs.com/package/@danieljamestronca/app-icon-3d-cli)

![Rotating empty 3D app icon](./media/app-icon-3d.gif)

## React

```sh
npm install three @react-three/fiber @danieljamestronca/app-icon-3d
```

For a self-contained canvas:

```tsx
import { AppIcon3DCanvas } from '@danieljamestronca/app-icon-3d';

export function Icon() {
  return <AppIcon3DCanvas src="/icon.png" preset="ceramic" autoRotate interactive />;
}
```

Or place `AppIcon3D` inside an existing React Three Fiber `<Canvas>`. It accepts `src`, `preset`, `edgeColor`, `autoRotate`, `interactive`, `quality`, and `onReady`.

```tsx
<Canvas>
  <AppIcon3D src="/icon.png" preset="aluminum" edgeColor="#657089" />
</Canvas>
```

The framework-free geometry and material helpers are exported too: `createAppIconGeometry`, `createAppIconMaterials`, `createSquircleShape`, and `getPresetMaterialValues`.

### Rendering many icons in one canvas

`AppIcon3DCollection` renders a whole set of icons in a single shared
WebGL context, positioned to exactly cover DOM elements you already control. Render your own
markup for layout, labels, and links; give each item's wrapper `data-app-icon-id={item.id}`, and
the collection measures and mirrors it into the scene. The canvas itself is `pointer-events: none`, so
`useIconPointer` drives interaction — hover yaw/pitch, drag-to-spin with fling inertia, and
click-vs-drag detection — from plain DOM pointer events on your own elements, leaving your
surrounding `<button>` or `<a>` free to handle focus, keyboard access, and navigation.

```tsx
import { useRef, useState } from 'react';
import {
  AppIcon3DCollection,
  createIconMotion,
  useIconPointer,
  type IconMotion
} from '@danieljamestronca/app-icon-3d';

const items = [
  { id: 'weather', src: '/icons/weather.png', edgeColor: '#3a6ff7' },
  { id: 'notes', src: '/icons/notes.png', edgeColor: '#f7b23a' }
];

export function IconGrid() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [motions] = useState(
    () => new Map(items.map((item, i) => [item.id, createIconMotion(i * 1.17)]))
  );
  const pointer = useIconPointer();

  return (
    <div ref={containerRef} className="relative grid grid-cols-2 gap-4">
      {items.map((item) => (
        <button key={item.id} className="relative aspect-square">
          <div
            data-app-icon-id={item.id}
            className="absolute inset-0"
            onPointerEnter={() => pointer.onPointerEnter(motions.get(item.id) as IconMotion)}
            onPointerLeave={() => pointer.onPointerLeave(motions.get(item.id) as IconMotion)}
            onPointerDown={(e) => pointer.onPointerDown(e, motions.get(item.id) as IconMotion)}
            onPointerMove={(e) => pointer.onPointerMove(e, motions.get(item.id) as IconMotion)}
            onPointerUp={(e) => pointer.onPointerUp(e, motions.get(item.id) as IconMotion)}
            onPointerCancel={() => pointer.onPointerCancel(motions.get(item.id) as IconMotion)}
          />
        </button>
      ))}
      <AppIcon3DCollection containerRef={containerRef} items={items} motions={motions} />
    </div>
  );
}
```

`AppIcon3DCollection` owns viewport/tab-visibility gating (it stops its render loop off-screen or on a
hidden tab), WebGL context-loss detection (call your `onContextLost` to swap in a flat fallback),
and shared geometry across every item. Its studio environment is owned by that collection's renderer,
so separate canvases cannot dispose one another's resources. Use `iconScale` or an item's `scale`
when an icon should be optically smaller than its measured DOM slot. It never renders DOM markup,
so it composes with a grid, a list, or anything
else your layout needs.

## CLI

```sh
npx @danieljamestronca/app-icon-3d-cli input.png --preset ceramic --out icon.glb
```

The `app-icon-3d` command accepts local PNG, JPEG, and WebP files. It normalizes the artwork to a square, samples the non-transparent perimeter for the edge color (or accepts `--edge-color #RRGGBB`), and writes a self-contained GLB. It includes textured front/rear caps and PBR edge materials, intentionally without a camera or lighting.

## Presets

| Ceramic                             | Aluminum                               | Glass                                        |
| ----------------------------------- | -------------------------------------- | -------------------------------------------- |
| Glossy dielectric with a soft bevel | Brushed-metal feel with high metalness | Clear-coated, partially transmissive surface |

Try each in the [interactive demo](https://app-icon-3d-demo.vercel.app). The original SVG sample artwork in `apps/demo/public` is MIT-licensed with this repository.

## Supported formats and limits

- Renderer: browser-reachable image URLs supported by the browser and allowed by CORS.
- Exporter: local `.png`, `.jpg`, `.jpeg`, and `.webp` inputs.
- V1 makes a polished extruded icon object; it does not infer deep, semantic 3D geometry from arbitrary artwork.
- GLB export favors a portable 1024px embedded PNG texture. Use `--quality low|medium|high` to control mesh smoothness.

## Accessibility

The renderer respects `prefers-reduced-motion`; automatic spinning stops when users request less motion. Keep a text alternative or nearby app name for meaningful artwork, and do not make a 3D preview the only way to access important information. The canvas has an accessible label in the demo; provide an equivalent label in your product context.

## Development

Requires Node 22.14+ and Corepack.

```sh
corepack pnpm install
pnpm lint && pnpm typecheck && pnpm test
pnpm build && pnpm build:demo
```

See [CONTRIBUTING.md](./CONTRIBUTING.md) for contribution and release details.

## License

[MIT](./LICENSE) © Daniel James Tronca.
