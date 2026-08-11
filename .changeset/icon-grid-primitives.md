---
'@danieljamestronca/app-icon-3d': minor
---

Add `AppIcon3DCollection` for rendering many icons in one shared WebGL canvas, positioned to match consumer-owned DOM layouts, plus the primitives behind it: `useIconPointer`, `useIconTexture`, `createIconMotion`/`updateIconMotion`/`applyIconMotion`, `projectRectToScene`, and `createIconEnvironment`. Also fix rear-cap artwork orientation, add geometry and material overrides, isolate environment resources per renderer, and report per-item texture failures.
