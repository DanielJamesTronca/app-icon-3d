# @danieljamestronca/app-icon-3d-cli

Turn a local PNG, JPEG, or WebP app icon into a portable GLB:

```sh
npx @danieljamestronca/app-icon-3d-cli input.png --preset ceramic --out icon.glb
```

All image processing is local. The GLB contains meshes, PBR materials, and an embedded PNG texture—no camera or lights.
