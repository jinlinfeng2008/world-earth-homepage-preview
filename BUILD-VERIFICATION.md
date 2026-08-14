# Build Verification

## Source

- Source repository: local `travel-earth-engine` working tree
- Source commit: `a7aff758370cbfef09c7c65cca3cf2658883e7f8`
- Source runtime: `world-earth-homepage-v1` and its approved dependencies
- Package identity: `WORLD_EARTH_HOMEPAGE_CROSS_PLATFORM_BASELINE_V1`

## Zero-visual-impact packaging changes

- Copied current renderer modules into this package.
- Replaced parent-project imports with package-local imports.
- Replaced root-only static URLs with base-relative package URLs.
- Made the packaged 159-record dataset the default.
- Routed the Founder dataset and Fixture through one provider.
- Added package integrity checks, manifests and deployment configuration.
- Added a runtime `destroy()` entry that stops RAF and releases the WebGL renderer.
- Updated the deployment-only Vite patch from 7.3.2 to 7.3.6 to remove a
  published high-severity Windows development-server path bypass.
- Did not change camera values, color values, render budgets, collision logic,
  Core selection, transition timing, geographic projection, CSS or shaders.

## Verified commands

```sh
npm ci
npm test
npm run build
npm run preview
```

The production runtime was checked at `390x844` and `1280x720` with 159 DOM
photo elements, one Core, zero failed images and zero console errors/warnings.

GitHub Pages subpath simulation used:

```sh
WORLD_EARTH_BASE_PATH=/world-earth-homepage-complete-v1/ npm run build
```

The built output was served below that exact subpath. Page, JS, CSS, dataset,
photos, textures and geographic assets returned successfully.

## Environment note

The package freezes Node 20.x for CI and deployment. Final ZIP clean-room
verification passed with Node 20.19.5 and npm 10.8.2. Initial local packaging
also passed with Node 24.13.1/npm 11.8.0; the lock file does not depend on the
parent project or global packages.

`npm audit --audit-level=high` passes. One low-severity Windows-only esbuild
development-server advisory remains in the locked toolchain and does not affect
the static production output; Claude must review it before publication.
