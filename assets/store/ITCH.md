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
