# FANCY OUTFITS

*A pixel-art legal drama sim. Read the file. Pick your line. Don't get HENDERED.*

You're a lawyer (maybe) at **Parson Henderson LLP**. Case files land in your inbox on a real-time
day clock; the winning argument is usually hiding somewhere in the text. Safe options never fail
but drain your Boldness; bluffs pay big and burn Reputation when they collapse. Climb from Junior
Associate to **NAME PARTNER** before your secret — or your reputation — ends you.

## Running the game

| Command | What it does |
|---|---|
| `npm install` | one-time setup |
| `npm run dev` | dev server in the browser (Vite) |
| `npm run build` | static production build in `dist/` (deployable to GitHub Pages / itch.io) |
| `npm start` | build + open as a desktop app (Electron, the Steam target) |

**Tech:** React 18 + Vite 5, zero asset files — sounds are WebAudio synthesis, graphics are CSS +
runtime-generated SVG. Game logic lives in `src/game/` (plain JS, framework-free); UI in
`src/components/`. Case generation is fully offline and procedural — **no API keys, no network**.

---

## Changelog

### v6 — Multi-stage cases *(2026-07-06)*
- **Cases can now chain.** Any option outcome — win *or* loss — can spawn a follow-up filing
  that lands in your inbox days later, marked with a gold **FOLLOW-UP FILING** tag. Follow-ups
  are stake-scaled at the rank you hold when they arrive, and each stage draws its own judge.
- **Hand-written chains:**
  - *CASE: Aldergate data breach* — turn the breach on the cloud vendor via their own 72-hour
    SLA and they appeal (*COURT: Aldergate v. NimbusHost*); botch the press-conference bluff and
    you earn a personal *sanctions hearing* where the only thing on the docket is your career.
  - *COURT: Halcyon v. Kessler* — win the dismissal and Halcyon appeals on a precedent that was
    overturned two years ago (*APPEAL: Halcyon v. Kessler*).
- **Generated chains:** the procedural generator's late-filing court template now has a 50%
  chance to carry an appeal stage, built from the same parties with a fresh hidden clue.
- **Balance fix:** the final promotion now needs 95 Influence instead of a perfect 100 —
  the stat caps at 100, so one bad day could previously wall off the ending forever.

### v5.1 — Day-timer bar *(2026-07-06, commit `8e587f1`)*
- New timer bar in the topbar, next to the clock. It shrinks linearly as the day runs out:
  gold normally, **amber under 30 seconds, red under 15** — and the clock digits turn red with it.

### v5 — Saves, money, stakes *(2026-07-06, commit `6a89324`)*
- **Save/load:** the run auto-saves to `localStorage` after every meaningful action (choices,
  delegations, crises, purchases, day transitions). The start screen gains a **CONTINUE** button
  showing day / rank / scenario. The save is deleted when the run ends — this is a roguelike.
- **FIRM RECORD (lifetime stats):** total runs, wins, longest career, best rank reached, and
  causes of death, persisted across runs and shown on the start screen.
- **Money sinks** (money finally matters outside the Debtor scenario):
  - **TAILORED SUIT** — $1,200: +8 REP on the spot; each suit is fancier, the price grows ×1.5.
  - **BRIBE MARV** — $600: the copy-room guy reveals a random colleague's hidden trait (+5 rel);
    if everyone is already known, he says nice things about you instead (+4 rel with everyone).
  - **HIRE DETECTIVE** — $900: attaches a dossier to one open case file, +12% on all of its
    risky plays.
- **Rank-scaled stakes:** cases drawn at higher rank hit harder in both directions — rewards
  scale ×1.15 → ×1.6, failures scale ×1.3 → ×2.2 (failures grow faster, by design). The
  multipliers are printed on the case file: `STAKES ×1.45 win / ×1.9 loss`. Promotion never
  retro-scales files already on your desk.

### v4 — The floor comes alive *(2026-07-05, commit `e4637a4`)*
- **NPC relationship system:** four colleagues — Dana Paulsen, Raquel Lane, Harold Gustavson,
  Katrina Bergman — each run randomly deals them one trait each: **Reliable / Brave / Lazy /
  Traitor**. Traits start hidden; delegations and crises reveal them. Relationship scores
  (−100..+100) are visible in the new **THE FLOOR** panel.
- **Delegation** (unlocks at Senior Associate): hand any non-court case to a colleague; the die
  rolls the moment you hand it over, the report lands next morning. Odds = 60 + rel/5 + trait
  modifier (Reliable +25, Brave +10, Lazy −20, Traitor −5). A Lazy colleague may silently return
  the file with its deadline still burning; a Traitor makes sure the whole floor knows whose case
  failed (extra −4 REP).
- **NPCs in crises:** a slighted Traitor (rel < 25) may leak your position (−8% on every crisis
  option); a loyal Brave (rel ≥ 40) stands behind you (+8%). Shown on the crisis screen, and it
  outs their trait.
- **Procedural case generator:** 7 templates × pools of names, amounts and hidden clues produce
  unlimited fresh cases, fully offline — no LLM, no API key ships with the game (deliberate
  design decision). Kicks in when the 9 hand-written cases run out, or randomly after day 3.
  This also fixed the old "cases repeat on long runs" bug.
- **PAUSE button:** the pause screen deliberately covers the desk — no free reading time,
  the timer tension stays intact.
- **Office scene v2 + your character:** door, wall clock, filing cabinet, bookshelf, rug, blinds,
  coffee and case files on the desk, waste bin. Your associate now **sits at the desk working**,
  in a suit that upgrades with rank; at day's end they stand up and walk out the door (the summary
  waits for the walk), and each morning they walk back in and sit down.

### v3 — React + Vite + Electron *(2026-07-05, commit `a92ea96`)*
- Migrated the whole game from a single-file vanilla `index.html` to **React 18 + Vite 5**:
  game logic extracted to `src/game/` (plain JS modules, React-free), UI split into one component
  per panel/overlay in `src/components/`. Gameplay, balance and all case text ported 1:1.
- **Electron shell** for the Steam desktop target (`npm start`); web deploys now use the Vite
  build output.
- Two long-standing bugs died in the migration: a missed-deadline case no longer lingers open on
  the desk, and the info panel can no longer un-pause the end-of-day summary (pause is now derived
  from "is any overlay open" instead of a flag).
- The pre-React single-file version is preserved on the [`old-main`](../../tree/old-main) branch.

### v2 — Difficulty & atmosphere *(2026-07-05, commit `12126e9`)*
- Difficulty pass: 75-second days, firing threshold REP < 20, deadline penalty −9, 60% daily
  crisis chance, nightly REP decay ("the firm forgets fast"), rank pressure on success odds.
- **Respect system:** below 30 REP risky plays get −12%, someone's lunch appears on your desk and
  your chair becomes a stool; above 70 REP you get +5% and associates fetch YOUR coffee.
- **WebAudio SFX** (10 synthesized effects + mute) — no audio files.
- **Dynamic pixel office** that upgrades with rank: bullpen → shared office → your office →
  corner office → name on the wall.
- In-game "i" info panel.

### v1 — First playable *(2026-07-05, commit `0a86e44`)*
- Core loop: real-time day clock, inbox, hand-written case files with hidden winning clues,
  2–4 options per case with computed success odds, deferral and deadlines, delayed responses
  (the die rolls at choice time, the result arrives days later as a REPLY).
- Stats: Reputation / Boldness / Influence / Money. Career ladder to Name Partner (win) and
  firing (loss). Three roguelike starting scenarios: **The Fraud**, **The Debtor**, **The Legacy**.
- Four judges with temper/by-the-book stats on court cases; crisis events; single-file vanilla
  HTML+CSS+JS build.
