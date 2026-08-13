# World Earth Homepage V1

Clean application extraction of the Founder-approved World Earth first screen.

## Run

From `earth-engine-prototype`:

```sh
npm run dev
```

Open `/world-earth-homepage-v1/`. The default dataset is the public test fixture.

For authorized visual validation, provide an external dataset explicitly:

```text
/world-earth-homepage-v1/?photoDataset=founder&photoDatasetUrl=<authorized-local-dataset-url>
```

The application directory contains no Founder photos or private dataset. Shared
world textures and geographic data remain in the prototype's public asset tree.

## Runtime modules

- `world/`: Earth, landscape, ocean, civilization, Cloud V2, Atmosphere V2 and Aurora V7.
- `life-photo/`: WGS84 contract, place catalog, source policy and dataset provider.
- `core/`: stars and camera navigation.
- `fixtures/`: synthetic media and records used by tests and the default preview.

The current Life Photo identity model is one DOM element per geographic photo.
The same `.life-thumb` changes between thumbnail, emerging, core and receding
states at its projected WGS84 anchor. There is no separate Core card.
