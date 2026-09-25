# itch.io page

itch takes the same images and copy as Steam; this file only says what goes where
and what differs. No fee, no review — the page is live the moment you publish it.

## Uploads (Dashboard → Create new project → Uploads)

| File | itch setting |
| --- | --- |
| `release/FANCY OUTFITS-<ver>-win.zip` | Kind: **Executable** · Platform: **Windows** |
| `release/FANCY OUTFITS-<ver>-arm64-mac.zip` | Kind: **Executable** · Platform: **macOS** · label "Apple Silicon" |
| `release/FANCY OUTFITS-<ver>-mac.zip` | Kind: **Executable** · Platform: **macOS** · label "Intel" |
| `release/FANCY OUTFITS-<ver>-web.zip` | Kind: **HTML** · tick **This file will be played in the browser** |

Upload the **zips, not the installer/dmg** — itch's app and its `butler` tool handle
zips natively, and a zip needs no admin rights on the player's side.

Produce them with `npm run dist:win`, `npm run dist:mac` and `npm run pack:web`.
`release/` is not in git.

## Playing in the browser (Edit game → Embed options)

The web zip is the same `dist/` the desktop app loads (~0.2 MB, `index.html` at the zip
root — `pack:web` refuses to write it otherwise). Saves use the iframe's `localStorage`,
so they persist per browser; nothing reaches the desktop build's save files.

| Setting | Value | Why |
| --- | --- | --- |
| Kind of project | **HTML** | the page gets a Run game button above the description |
| Embed options | **Embed in page**, **manually set size 960 × 600** | 960 is the page panel; anything wider widens the panel and breaks the cabinet background's x = 800 edge |
| Fullscreen button | **on** | the 960×600 box is the preview; fullscreen is the desk at full size |
| Mobile friendly | **off** | the touch layout is not done yet (backlog: mobile + Capacitor) |
| Automatically start on page load | **off** | the click that starts it also unlocks Web Audio |
| Enable scrollbars | **off** | the game scrolls its own columns |
| SharedArrayBuffer support | **off** | not used |

At 960 × 600 the office scene shrinks to a 72px band and loses its caption
(`styles.css`, `max-height:680px` rule) so the case file and its options fit above the
fold; the topbar wraps onto two lines. Checked in the built preview at 1280×720 and
960×600.

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

- **The panel is 960 CSS px** — itch's standard column. An earlier "1265" came from
  reading pixels off a screenshot as if it were 1:1. Calibrate instead against a
  known quantity in the art: the drawer pitch is 180 in the source and measured 238
  on screen, so that screenshot was at 1.32x and its panel was really 960.
- **The gutter shrinks as the window shrinks, and the panel does not.** At natural
  size the image is centred, so a window `V` wide shows image x `1280 ± V/2` while the
  panel always covers `1280 ± 480`, so its edge is at image x 800. The gutter is the
  difference: 240px at a 1440 window, 160px at 1280, nothing below 960.
- **And it is cut from the outside in.** The first version put its labels at the
  cabinet's outer edge, so the window ate the front of every word — KESSLER came out
  as SLER. Everything now hugs image x 800 and is at most 150px wide, which holds
  down to a 1280 window.

`scripts/store-cabinets.mjs` renders three variants built around all of this: a wall
of drawers too full to sit flush, with post-its on some of them. The notes carry the
game's own case material, which is the only text on the page small enough to read in
a 330px gutter and worth reading when you do. Every
one is a **seamless vertical tile** — the drawer pitch divides 1440 exactly — so the
settings are:

| Edit theme field | Value |
| --- | --- |
| Font | **Anonymous Pro** |
| Background image | the chosen `cabinet/*.png` |
| Repeat | **repeat** — *not* cover, and not contain |
| Fixed / parallax | either; at natural size nothing is being scaled, so it cannot zoom |

At natural size the wall runs down a page of any height with no scaling at all, and
the cabinets sit in the outer 650px of each side, which is where the gutter falls once
a 1250px column is centred.

## What the top 100 pages actually do

Surveyed, not guessed: 100 game pages from itch's top-rated listings, fetched and
their generated theme CSS parsed.

| | of 100 |
| --- | --- |
| background image set | 91 |
| dark page background | 64 |
| **gameplay video embedded** | **62** |
| an animated GIF among cover/screenshots | 51 |
| content panel fully opaque | 76 |
| background fixed rather than scrolling | 30 |
| header banner image | 2 |

Two things stand out. A **gameplay video is on nearly two thirds of them** and is
the biggest single thing this page is missing — the trailer exists, it just needs
a YouTube upload and the link in itch's *Gameplay video* field. **An animated GIF
is on half of them**, and `assets/store/trailer/cover.gif` is sitting unused. The
banner, by contrast, is on two pages out of a hundred: skip it.

Fixed backgrounds are the minority. Leave **Fixed unchecked** so the wall scrolls;
the cabinet tiles seamlessly (8 drawers x 180 = 1440) so it runs unbroken down a
page of any length.

## The font

itch's picker is not a dropdown of a few faces — it takes **any Google Fonts family
name typed into the box**, so the choice is the whole library. Which means the
game's own face is available: **Press Start 2P is on Google Fonts.**

It is still wrong for body text. `node scripts/store-fonts.mjs` sets the same
paragraph five ways and the top row shows why: at paragraph length Press Start 2P
is a wall, and 04b_03 fails the same way for the same reason. Both are display
faces doing a body face's job.

The pairing the panel makes possible, because **Header font is its own field**:

| Field | Value |
| --- | --- |
| Font | **DotGothic16** |
| Header font | **Press Start 2P** |
| Size | Large |

Headings get the game's exact face. The body is **DotGothic16**, a dot-matrix face
that stays pixel without becoming a wall — the choice made on the page. **VT323**
and **Anonymous Pro** are the other two that survived the comparison, in that
order of pixel-ness.

## Headings as post-its

`node scripts/store-headings.mjs` renders each section heading onto a post-it and
prints the HTML to paste.

They are images because itch sanitises the description. Surveying the same 100
pages for what survives in a description's inline styles: `width`, `height`,
`font-size`, `color`, `background`, `background-color`, `background-size`,
`text-align`, `margin` — and nothing else. No padding, no border, no transform,
no box-shadow, which is all four of the things a post-it needs. So the post-it is
a picture and the heading is its alt text. Rendered at 2x and placed at half
width, so they stay sharp on a retina screen.

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
