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

## Default mode: exactly the reviewed Codex baseline

Visiting the site with no query parameters loads exactly what the reviewed
`travel-earth-engine@world-earth-homepage-v1` source produces by default:
the real, committed 6-record system-test fixture (`fixture-asia-1`,
`fixture-asia-2`, `fixture-europe-1`, `fixture-europe-2`,
`fixture-north-america-1`, `fixture-north-america-2`). Nothing is swapped;
`fixture-provider.js` and `source-policy.js` are not modified and serve
the same file they always have.

Append `?demo=159` to see the 159-record public demo dataset instead —
one record per real public WGS84 place already in
`world-earth-homepage-v1/life-photo/place-catalog.js`, using 36 synthetic
placeholder images. This is an explicit opt-in only; it never changes what
"no parameters" means.

`?photoDataset=founder&photoDatasetUrl=<url>` continues to work exactly as
before, for authorized Founder-dataset visual validation using an external
URL — unaffected by either of the above.

## What this repository does NOT contain

No private data, no real photos, no Founder dataset, no `_private/` content,
no real EXIF/GPS. The public demo dataset's `captureLocation` is `null` for
every record and its `displayLocation` is the same real, public WGS84 place
already curated in the source of truth — it does not invent a second set of
geographic facts.

## Do not treat this repository as a development target

Future agents (GPT, Claude, Codex) must not edit product code here and
must not treat this repository as the primary World Earth codebase.
