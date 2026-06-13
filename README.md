# Classic 16 Swatches

Photoshop UXP panel that recreates the compact classic swatch picker layout with 16 swatches per full row. The panel is built from the Photoshop UXP React scaffold and renders the swatches through the scaffolded `entrypoints.setup` panel flow.

## Build

```sh
npm install
npm run build
```

The build output is written to `dist/`.

## Load In Photoshop

In UXP Developer Tools, add the plugin from `dist/manifest.json`, then load or reload it while Photoshop is running.

During development, run:

```sh
npm run watch
```

## Behavior

The panel renders 124 swatches in a fixed 16-column grid. Clicking a swatch immediately sets the Photoshop foreground color.
