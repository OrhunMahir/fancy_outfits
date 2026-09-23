# itch.io page

itch takes the same images and copy as Steam; this file only says what goes where
and what differs. No fee, no review — the page is live the moment you publish it.

## Uploads (Dashboard → Create new project → Uploads)

| File | itch setting |
| --- | --- |
| `release/FANCY OUTFITS-<ver>-win.zip` | Kind: **Executable** · Platform: **Windows** |
| `release/FANCY OUTFITS-<ver>-arm64-mac.zip` | Kind: **Executable** · Platform: **macOS** · label "Apple Silicon" |
| `release/FANCY OUTFITS-<ver>-mac.zip` | Kind: **Executable** · Platform: **macOS** · label "Intel" |

Upload the **zips, not the installer/dmg** — itch's app and its `butler` tool handle
zips natively, and a zip needs no admin rights on the player's side.

Produce them with `npm run dist:win` and `npm run dist:mac`. `release/` is not in git.

## Page fields

- **Title:** FANCY OUTFITS
- **Short description / tagline** — `STORE_COPY.md` › *Short description* (213 chars; itch's
  field allows more, but that one is the sentence).
- **Cover image** — `assets/store/capsules/itch-cover-630x500.png` (itch's documented size;
  it is shown at 315×250 in listings).
- **Screenshots** — all of `assets/store/screenshots/`.
- **Description** — paste `ITCH_DESCRIPTION.md` (everything under its `---`). itch's editor
  takes the Markdown headings and bullets.
- **Download & install instructions** — the unsigned-build notes go HERE, not in the
  description: itch shows this box in the download modal, which is exactly the moment the
  player hits the warning.
- **Classification:** Games · **Kind:** Downloadable · **Genre:** Simulation
- **Tags:** ten from `STORE_COPY.md` › *Tags*, but **not** the one you picked as Genre —
  itch asks you not to repeat the genre, and a wasted slot is a search term you don't get.
- **Pricing:** your call. "No payments" or "$X or donate" both work for a soft launch; the
  point of being here first is feedback, not revenue.
- **Community:** enable comments — that is the feedback channel.

## Page background

`node scripts/store-backgrounds.mjs` renders the five candidates to
`assets/store/backgrounds/` plus `_preview.png`, which mocks itch's ~960px content
column over the middle of each — judging a page background without that column is
judging the wrong picture.

`node scripts/store-backgrounds.mjs --animate` renders the moving variants of the two
finalists as GIFs, from the same builder, so the still and the animation can never
drift apart: every motion model returns its rest pose at `t = 0`, which is the frame
the still PNG is.

| File | Loop | Size | What moves |
| --- | --- | --- | --- |
| `04-filing-cabinet.gif` | 2.16s, 18 frames | 530 KB | the sheets spilling out of the two open drawers, in a draught |
| `05-blotter.gif` | 3.04s, 12 frames | 198 KB | the HENDERED stamp lifts and comes down again, once per loop |

**Why the motion is that small.** itch takes one image for the page background, so an
animation has to be a GIF, and there file size is the design. A frame that moves all
over runs to megabytes at 2560x1440; a frame where one region moves stays small,
because GIF stores only the rectangle that changed. 05 also spends 2.6s of its 3.04s
loop on a single held frame, which costs nothing.

**05 was rebuilt for this.** The first version set the case text full-bleed, so the
column cut every sentence in half and the reader was handed line-starts on the left and
line-ends on the right. The rule now is: *nothing readable may cross the column's edge.*
The document lives inside a folder in the middle, entirely within the column's footprint
— invisible in the browser, whole when the image is seen on its own — and each gutter
carries objects that are complete at 250px wide, which is all the width a gutter has at
1280. The stamp stands on end because the gutter is tall and thin.

The column's own span is the constraint, and it is counter-intuitive: the column is 960
CSS px at every window, so against a `cover` background it is **widest on the smallest
screen**. At a 2560 viewport it covers source x 800..1760, which is the narrowest it
ever gets, so that span is what the document has to fit inside.

**The pick is 05.** `node scripts/store-itch-theme.mjs` prints the exact theme values
and renders `_theme.png` — the page as a visitor sees it, background at true viewport
scale. The blotter is cream, so the content column has to be darkened or the
description sits on top of the case text; itch exposes that as its own field.

| Edit theme field | Value | Why |
| --- | --- | --- |
| Background | `#f2e9d8` | the blotter's own paper, so nothing flashes white on load |
| Background image | `05-blotter.gif`, repeat **cover**, **fixed** on | fixed sizes it to the viewport, so it never moves as the page scrolls |
| Content background | `#1a1c2c` | the game's own `--bg`; the page is a case file and the column is the game on top of it |
| Text | `#e8dfcb` | |
| Link | `#ffcd75` | `--gold`, the logo's colour |
| Border | `#3d4763` | |
| Button background / text / shadow | `#ffcd75` / `#1a1c2c` / `#d9a44f` | the download button gets the promote colour |

`_theme.png` is two real 1600x900 viewports, page top and page scrolled, not one tall
screenshot. background-attachment:fixed pins the image to the viewport, so the paper
never moves and there is no bottom of it to run out of — a tall preview that tries to
show the whole page reads as an empty lower half, which is a lie about the page.

Known trade-off: below about 1600px of window the HENDERED stamp runs partly under
the column. That is true of the still too — a background bleeding under the content
is normal, and the beat still reads.

## The background zoomed, and why

Setting the background to **cover** with a scrolling attachment blows the image up
until only its middle shows. `cover` sizes the image to whatever it is attached to,
and a scrolling background is attached to the whole *page* — several thousand pixels
tall — so a 2560x1440 image gets scaled four or five times and the gutters go off
screen entirely. That is the "it zoomed into the middle" problem, and it is not
something the art can be fixed to survive.

Two other measurements matter and both were wrong in the first pages:

- **The panel is 1265 CSS px, not 960.** itch puts the screenshots in a sub-column
  inside the same white panel, so it is far wider than a text column. Measured off
  the live page.
- **The gutter shrinks as the window shrinks, and the panel does not.** At natural
  size the image is centred, so a window `V` wide shows image x `1280 ± V/2` while the
  panel always covers `1280 ± 633`. The gutter is the difference: ~230px at a 1730
  window, ~170px at 1600, nothing at all below ~1290.
- **And it is cut from the outside in.** The first version put its labels at the
  cabinet's outer edge, so a 1730 window ate the front of every word — KESSLER came
  out as SLER. Everything now hugs the panel edge and is at most 150px wide.

`scripts/store-cabinets.mjs` renders three variants built around all of this: a wall
of drawers too full to sit flush, with post-its on some of them. The notes carry the
game's own case material, which is the only text on the page small enough to read in
a 330px gutter and worth reading when you do. Every
one is a **seamless vertical tile** — the drawer pitch divides 1440 exactly — so the
settings are:

| Edit theme field | Value |
| --- | --- |
| Background image | the chosen `cabinet/*.png` |
| Repeat | **repeat** — *not* cover, and not contain |
| Fixed / parallax | either; at natural size nothing is being scaled, so it cannot zoom |

At natural size the wall runs down a page of any height with no scaling at all, and
the cabinets sit in the outer 650px of each side, which is where the gutter falls once
a 1250px column is centred.

## Trailer and animated cover

`node scripts/store-trailer.mjs` (with `npm run dev` running) records both from the live
game: `assets/store/trailer/fancy-outfits-trailer.mp4` (1920x1080, ~28s) and
`cover.gif` (630x500, the Power Cut beat).

itch's *Gameplay video* field takes a YouTube/Vimeo link only, so the mp4 has to be uploaded
there first. The GIF can replace the static cover image directly — itch animates GIF covers in
listings, which is the cheapest visibility win on the page.

**The trailer is silent.** The game's ambience is synthesised in Web Audio at runtime and the
DevTools screencast carries no audio, so there is no sound track to mux. Rendering the same
`sound.js` chords through an OfflineAudioContext and muxing that in is possible but was not
done — say the word if it is wanted.

## AI disclosure

itch asks. The honest answer is **Yes**: LLMs wrote much of the code and much of the case
text. Graphics and sounds have no image or audio model behind them — they are drawn and
synthesised by code — but that code was LLM-written too, so all four boxes ticked is the
defensible reading. Under-ticking to dodge the filter tags would be both dishonest and
enforceable against the page.

The cost is real: some players filter AI-tagged projects out entirely. Worth knowing, not
worth lying about.

## Things Steam has that itch does not

- **No cloud saves.** Saves live in the app's user-data folder on that machine only. Say so in
  the description if you enable comments; someone will ask.
- **No achievements** shown anywhere — they still work inside the game.
- **No overlay, no launcher.** Windows players run the exe from the unzipped folder;
  SmartScreen will warn once (the exe is unsigned): *More info → Run anyway*.
- **macOS Gatekeeper** will refuse an unsigned app downloaded from a browser with "is damaged
  and can't be opened". This is not damage. Put this line on the page, verbatim:

  > macOS: after unzipping, right-click **FANCY OUTFITS.app → Open → Open**, or run
  > `xattr -cr "FANCY OUTFITS.app"` once in Terminal.

  The real fix is an Apple Developer ID and notarisation, which is a $99/year decision
  deferred until Steam.

## Updating later

`butler push release/FANCY\ OUTFITS-<ver>-win.zip <user>/fancy-outfits:windows` pushes a new
build in seconds and only uploads the diff. Worth setting up after the first manual upload;
not needed for it.
