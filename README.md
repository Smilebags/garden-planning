# garden-planning

A scale plan of the garden beds. The page is built from the JSON in `data/` and published with GitHub Pages on every push to `main`.

https://smilebags.github.io/garden-planning/

## Layout

Beds run left to right. Each one is 3.5 m long. The paths between them are 50 cm.

| Bed | Width |
| --- | --- |
| 1 | 50 cm |
| 2 | 1 m |
| 3 | 1 m |
| 4 | 1 m |
| 5 | 50 cm |

`bedIndex` starts at 1 for the narrow bed on the left.

Inside a bed, `xM` is metres from the left edge and `yM` is metres from the top. A plant is drawn on dates from `planted` inclusive until `removed` exclusive. `removed: null` means it is still in the ground.

## Data

`data/beds.json` holds `lengthM`, `gapM`, and `widthsM`.

`data/plants.json` describes each kind of plant: `name`, `spreadM` (canopy diameter), `appearance` colours (`foliage`, `outline`, and optional `fruit`), and `notes`.

`data/plantings.json` is the list of plants in the beds. Each entry has `id`, `plant`, `bedIndex`, `xM`, `yM`, `planted`, `removed`, and optional `notes`.

The starter plan is four tomatoes down the middle of bed 2, planted 1 November 2026.

## Build

```bash
npm test
npm run build
```

The build checks the data, then writes the site to `dist/`. Open `dist/index.html` from a local static server. The date control shows only the plants in the ground that day.
