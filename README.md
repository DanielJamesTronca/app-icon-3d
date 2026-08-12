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

The convenience canvas is transparent by default so it composes with the host page. Pass
`scenePreset="dark-studio"` for the original dark backdrop, or use `scene` and `canvasProps` to
control its background, camera, lighting, environment, exposure, and renderer options.

Or place `AppIcon3D` inside an existing React Three Fiber `<Canvas>`. In addition to image,
interaction, and quality controls, it accepts geometry and material overrides, environment intensity,
and ready/error callbacks.

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
the collection measures and mirrors it into the scene. The canvas itself is `pointer-events: none`;
`useAppIcon3DCollection` supplies DOM interaction props for hover yaw/pitch, drag-to-spin, fling
inertia, and click-vs-drag detection while surrounding buttons and links keep focus and navigation.

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

export function IconGrid() {
  const containerRef = useRef<HTMLDivElement>(null);
  const collection = useAppIcon3DCollection(items);

  return (
    <div ref={containerRef} className="relative grid grid-cols-2 gap-4">
      {items.map((item) => (
        <button key={item.id} className="relative aspect-square">
          <div
            className="absolute inset-0"
            {...collection.getSlotProps(item.id)}
          />
        </button>
      ))}
      <AppIcon3DCollection
        containerRef={containerRef}
        items={items}
        motions={collection.motions}
      />
    </div>
  );
}
```

`AppIcon3DCollection` portals one pointer-free canvas to `document.body`, clips it to the visible
intersection of the collection and browser viewport, and mounts only visible slots plus `overscan`.
For a scrollable or virtualized list, pass its element as `viewportRef`; the package remains a renderer
and never owns card markup or list state. Use `portalTarget` and `zIndex` for custom stacking contexts.

Textures are decoded into adaptive 128/256/512/1024 buckets, capped by `maxTextureSize`, cached per
renderer, and evicted toward `textureCacheBytes` (64 MiB by default) once unused. Repeated URLs share
their decoded/GPU texture. Omit `edgeColor` to sample it locally from the image perimeter.

`motionMode="idle"` is the default and rotates visible icons. Use `"interaction"` to render only
during hover/drag/inertia or `"static"` for a stationary collection. Reduced motion converts idle
animation to interaction-only. Hidden tabs, offscreen collections, paused collections, and lost
contexts stop rendering automatically.

### Long and virtualized lists

Keep DOM virtualization in your chosen list library. Attach `containerRef` to its inner layout element,
`viewportRef` to its scrollport, spread `getSlotProps(id)` over each mounted visual slot, and pass the
complete item/motion collections to the renderer. Only DOM slots currently mounted by the virtualizer
can create 3D objects.

The demo and CI exercise a 50-item responsive grid and a 100-item scrollport. They assert bounded
canvas dimensions and fewer than 20 simultaneously mounted 3D icons; actual FPS remains dependent on
device, artwork, DPR, material, and slot size.

## Migrating from 0.2

- `AppIcon3DCanvas` is transparent by default; add `scenePreset="dark-studio"` to preserve the old look.
- Prefer `useAppIcon3DCollection(items)` over manually maintaining a motion map and wiring every
  pointer handler. The lower-level APIs remain available.
- Collection canvases are portaled and fixed instead of nested inside the layout root. Use `zIndex`
  or `portalTarget` when the page has a custom stacking context.
- Use `viewportRef` for nested scrolling and `motionMode` to choose idle, interaction-only, or static
  rendering.

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
