# @danieljamestronca/app-icon-3d

## 0.2.0

### Minor Changes

- 9486372: Add `AppIcon3DCollection` for rendering many icons in one shared WebGL canvas, positioned to match consumer-owned DOM layouts, plus the primitives behind it: `useIconPointer`, `useIconTexture`, `createIconMotion`/`updateIconMotion`/`applyIconMotion`, `projectRectToScene`, and `createIconEnvironment`. Also fix rear-cap artwork orientation, add geometry and material overrides, isolate environment resources per renderer, and report per-item texture failures.

## 0.1.1

### Patch Changes

- a7acf17: Add npm search keywords, author, and a package-scoped repository link so both packages are easier to find and link back to the right source directory.
- 0c76aef: Replace the stub package READMEs with full usage docs (install, examples, props/flags tables, presets, accessibility notes) so the npm page for each package stands on its own.
- 48c8ef5: Publish a source map alongside the bundled ESM output so consumers can step into the library while debugging instead of hitting the minified-looking bundle.

## 0.1.0

### Minor Changes

- abd479f: Initial public release with React Three Fiber rendering and local GLB export.
