# @danieljamestronca/app-icon-3d-cli

Turn a local app-icon image into a portable GLB — no backend, no telemetry, all image processing stays on your machine.

[Live demo](https://app-icon-3d-demo.vercel.app) · [Repository](https://github.com/DanielJamesTronca/app-icon-3d) · [React package](https://www.npmjs.com/package/@danieljamestronca/app-icon-3d)

## Usage

```sh
npx @danieljamestronca/app-icon-3d-cli input.png --out icon.glb
```

```
Usage: app-icon-3d <input.png|jpg|webp> --out <icon.glb> [--preset ceramic|aluminum|glass] [--edge-color #RRGGBB] [--quality low|medium|high]
```

| Flag | Values | Default | Description |
| --- | --- | --- | --- |
| `--out`, `-o` | path | *(required)* | Output `.glb` path. |
| `--preset` | `ceramic` \| `aluminum` \| `glass` | `ceramic` | Material preset — see [Presets](#presets). |
| `--edge-color` | `#RRGGBB` | sampled from artwork | Overrides the sampled edge color. |
| `--quality` | `low` \| `medium` \| `high` | `high` | Mesh smoothness / segment count. |

## What it does

The `app-icon-3d` command accepts local `.png`, `.jpg`, `.jpeg`, and `.webp` files. It normalizes the artwork to a square, samples the non-transparent perimeter for the edge color (or accepts `--edge-color`), and writes a self-contained GLB with textured front/rear caps and PBR edge materials — intentionally without a camera or lighting, so you can drop it into any scene. GLB export favors a portable 1024px embedded PNG texture.

All image processing is local; nothing is uploaded anywhere.

## Presets

| Ceramic | Aluminum | Glass |
| --- | --- | --- |
| Glossy dielectric with a soft bevel | Brushed-metal feel with high metalness | Clear-coated, partially transmissive surface |

Try each in the [interactive demo](https://app-icon-3d-demo.vercel.app).

See the [repository](https://github.com/DanielJamesTronca/app-icon-3d) for the React renderer, contribution guide, and license.
