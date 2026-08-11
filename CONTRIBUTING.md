# Contributing

Thanks for helping improve app-icon-3d. By participating, you agree to follow the [Code of Conduct](./CODE_OF_CONDUCT.md).

## Local setup

Use Node 22.14 or newer and Corepack:

```sh
corepack pnpm install
pnpm lint && pnpm typecheck && pnpm test
pnpm build && pnpm build:demo
```

Keep changes focused. Include tests for observable behavior and update documentation when the public API changes. The renderer must remain free of Node and image-processing dependencies, and image transformations must never leave the user’s device.

## Releases

Public packages are versioned with Changesets. Add a changeset for any user-facing package change:

```sh
pnpm changeset
```

Maintainers publish through the GitHub Actions release workflow using npm trusted publishing; do not add an npm token to repository secrets.
