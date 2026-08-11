# app-icon-3d workspace guide

## Commands

- `corepack pnpm install` — install dependencies.
- `pnpm lint && pnpm typecheck && pnpm test` — required local verification.
- `pnpm build && pnpm build:demo` — build publishable packages and the demo.
- `pnpm pack:check` — create tarballs for install verification.

## Boundaries

- `packages/core` is framework-free Three.js geometry, material, and image utilities.
- `packages/react` may depend on React, React Three Fiber, and core; it must not import Node or image-processing code.
- `packages/cli` is Node-only and may use Sharp. It bundles core so browser users never install Sharp.
- `apps/demo` is an example consumer, never a dependency of a published package.

## Expectations

Keep TypeScript strict and ESM-first. Add focused tests for any changes to geometry, UVs, materials, image sampling, CLI output, or interaction behavior. Do not add telemetry, a backend, or network image transformation: all image work stays local or in the user’s browser. Never publish, alter release automation, or expose credentials without explicit review.
