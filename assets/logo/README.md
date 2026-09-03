# Logo pack

Generated from `src/game/logo.js` — the same builder the start screen draws with,
so nothing here can drift from what the game shows. Regenerate the SVGs with:

```
node scripts/build-logo.mjs
```

| File | Use |
| --- | --- |
| `fancy-outfits-mark.svg` | Lettered logo. 96px and above: title art, store capsule, README, press. |
| `fancy-outfits-icon.svg` | No lettering, gold frame. Any surface we don't control: Steam library icon, favicon, exe icon, taskbar. |
| `fancy-outfits-icon-plain.svg` | No lettering, no frame. Inside the game, where the ground is already our navy. |
| `png/` | Rasterised at native size, never downscaled, so pixel edges stay hard. |
| `fancy-outfits.ico` | Windows executable icon — 16/24/32/48/64/128/256. |
| `fancy-outfits.icns` | macOS app icon — 16 through 1024 including @2x. |

The PNG/`.ico`/`.icns` set is **not** produced by the script: it needs a browser to
rasterise and `iconutil` for the `.icns`, which not every machine has. They are built
once at release time from the SVG masters above and committed alongside them.

The mark's own lettering is deliberately cut by the pocket line, so it never spells
the title. Write FANCY OUTFITS beside it — that is what the icon files are for.

Do not swap the lettering back to a live font. It was converted to geometry on
purpose: a font substitution slides the pocket cut off the middle of the C.
