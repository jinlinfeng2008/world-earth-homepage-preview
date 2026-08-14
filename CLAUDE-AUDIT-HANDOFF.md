# Claude Audit Handoff

## Package

- Directory: `world-earth-homepage-complete-v1/`
- ZIP: adjacent `world-earth-homepage-complete-v1.zip`
- Identity: `WORLD_EARTH_HOMEPAGE_CROSS_PLATFORM_BASELINE_V1`
- Source commit: `a7aff758370cbfef09c7c65cca3cf2658883e7f8`

## Contents

- 159 Dataset records and 159 physical photo files.
- Original media bytes preserved; reused source images are copied per record.
- Current Earth, Landscape, Ocean, Civilization, Cloud V2, Atmosphere V2,
  Aurora V7, World Color, camera and Life Photo modules.
- Complete runtime geographic data and textures.
- No historical renderer experiments, density experiment, `node_modules`,
  cache, symlink, absolute Mac path or parent-project runtime dependency.

## Verification

```sh
npm ci
npm test
npm run build
npm run preview
```

For GitHub Pages subpath:

```sh
WORLD_EARTH_BASE_PATH=/world-earth-homepage-complete-v1/ npm run build
```

Review `BUILD-VERIFICATION.md`, `VISUAL-BASELINE.md`, `PHOTO-ALLOWLIST.json`,
`ASSET-MANIFEST.json` and `FREEZE-MANIFEST.json`.

## Required Claude audit

1. Recalculate every manifest hash.
2. Confirm exactly 159 records and 159 physical photos.
3. Confirm each packaged photo matches its recorded source hash.
4. Confirm no private publication occurs during audit.
5. Re-run clean clone and ZIP extraction tests.
6. Inspect all runtime requests for package closure.
7. Compare current renderer/CSS/camera/Photo logic with Founder reference.
8. Inspect GitHub Actions and subpath configuration.
9. Review npm audit findings before any public repository decision.

`npm audit --audit-level=high` currently passes. One low-severity transitive
esbuild development-server advisory remains and is documented in
`BUILD-VERIFICATION.md`.

The final ZIP was installed, tested and built with Node 20.19.5/npm 10.8.2.

## Publication boundary

No Git commit or GitHub push was performed in the source repository by Codex.
The photographs are authorized for this private package only. Founder approval
is required before any upload or deployment.
