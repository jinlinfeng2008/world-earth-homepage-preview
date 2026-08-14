# World Earth Homepage Complete V1

`WORLD_EARTH_HOMEPAGE_CROSS_PLATFORM_BASELINE_V1` is the self-contained private
engineering package for the Founder-approved World Earth first screen.

## Run

```sh
nvm use
npm ci
npm test
npm run build
npm run preview
```

The default runtime loads the packaged 159-record Founder dataset. Use
`?photoDataset=fixture` to run the six-record synthetic fixture through the same
dataset provider and rendering path.

Set `WORLD_EARTH_BASE_PATH=/repository-name/` when building for a subpath. Core
runtime code contains no GitHub account, repository, or production-domain name.

This package contains private photographs. Read `PRIVATE-DATA-NOTICE.md` before
any Git or deployment action.
