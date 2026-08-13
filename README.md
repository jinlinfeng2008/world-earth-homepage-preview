# World Earth Homepage · Public Preview

This repository is a **public deployment mirror**. It is not the source of truth
and it is not the primary development repository.

## Source of Truth

```
jinlinfeng2008/travel-earth-engine
branch: world-earth-homepage-v1
```

All product code and world data assets in this repository are copied
byte-for-byte from that branch. Any future change must happen there first;
this repository only exists to give the current state a public, runnable
GitHub Pages URL.

## What this repository contains

- `world-earth-homepage-v1/` — the clean World Earth homepage runtime,
  copied unmodified from the source of truth.
- `public/` — the 21 public world data assets (Earth, landscape, ocean,
  civilization, cloud, atmosphere, aurora) required by the current runtime.
- `vite.config.js` / `.github/workflows/deploy-pages.yml` — deployment-only
  configuration for GitHub Pages. These do not exist in the source of truth
  repository and do not change any product logic or visual behavior; they
  only adapt root-relative asset paths to the GitHub Pages project subpath
  at build time.

## What this repository does NOT contain

No private data, no real photos, no Founder dataset. The public preview
runs in fixture mode only, with six synthetic placeholder records. Real
Founder photo validation happens separately, outside of any Git repository.

## Do not treat this repository as a development target

Future agents (GPT, Claude, Codex) must not edit product code here and
must not treat this repository as the primary World Earth codebase.
