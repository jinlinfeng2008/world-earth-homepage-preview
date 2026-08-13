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
- `demo-assets/` — a 159-record **public demo photo dataset** and 36
  synthetic, non-photorealistic placeholder images (flat icon + gradient
  style; no real people, no real photos, no identity of any kind), spread
  across the same 159 real public WGS84 places already defined in
  `world-earth-homepage-v1/life-photo/place-catalog.js`. Its only purpose
  is to give the public preview a photo density and global distribution
  comparable to the Founder's private 159-record dataset, without using
  any of it.
- `vite.config.js` / `.github/workflows/deploy-pages.yml` — deployment-only
  configuration for GitHub Pages. Neither exists in the source-of-truth
  repository and neither changes any product logic or visual behavior.
  `vite.config.js` does no build-time text rewriting of any kind inside
  `world-earth-homepage-v1/`; all path/base-path and dataset adaptation
  happens through one small runtime script injected into the built HTML
  only, which patches `window.fetch` / `HTMLImageElement.src` at the
  network layer.

## Default mode: public demo dataset (159 records)

Visiting the site with no query parameters (or with `?photoDataset=fixture`,
which resolves to the same code path in the unmodified application) loads
the 159-record public demo dataset by default, redirected purely at the
network layer — `fixture-provider.js` and `source-policy.js` are never
modified and always validate the exact same root-relative strings they
validated before this dataset existed.

Append `?rawFixture=1` to get the original 6-record minimal system-test
fixture instead (the one used by the repository's own automated tests).

`?photoDataset=founder&photoDatasetUrl=<url>` continues to work exactly as
before, for authorized Founder-dataset visual validation using an external
URL — unaffected by the demo dataset swap.

## What this repository does NOT contain

No private data, no real photos, no Founder dataset, no `_private/` content,
no real EXIF/GPS. The public demo dataset's `captureLocation` is `null` for
every record and its `displayLocation` is the same real, public WGS84 place
already curated in the source of truth — it does not invent a second set of
geographic facts.

## Do not treat this repository as a development target

Future agents (GPT, Claude, Codex) must not edit product code here and
must not treat this repository as the primary World Earth codebase.
