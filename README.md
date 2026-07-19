# FANCY OUTFITS

*A pixel-art legal drama sim. Read the file. Pick your line. Don't get HENDERED.*

> **⚠️ License:** Source available for **viewing only** — this is **not** open source.
> All rights reserved; no use, copying, redistribution or derivative works without
> written permission. See [LICENSE](LICENSE).

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

### v19.2 — Weekday display *(2026-07-12)*
- The topbar now shows the day of the week (`DAY 11 · MONDAY`) instead of a Friday countdown.
  Day 1 is Monday, day 5 is Friday (highlighted gold — it's still review day), day 6 starts
  the next week. Purely cosmetic; the Friday/weekend cycle is unchanged.

### v19.1 — Balance & cleanup pass *(2026-07-12)*
- **Delegation is no longer a free lunch:** delegated wins now have their INFLUENCE reward
  damped like every other case (×0.6), and you can hand off at most **2 files per day** — the
  reliable-colleague spam loop is closed.
- **Performance:** the activity log now renders only its 80 most recent lines (long endless
  runs were re-rendering thousands of DOM rows on every action). Removed a dead `dailyLog`
  array that grew unbounded and bloated the save.
- **Daily goal:** "close a file without playing it safe" now needs **2+** files, not one
  trivial errand.
- **Polish:** fired employees can no longer send you on coffee runs (or send you home for
  exhaustion); the "we were impressed" client message now reads a clean matter name instead
  of echoing a full case title.

### v19 — THE {CLIENT} WAR *(2026-07-12)*
- **Long-form retainer matters:** once you're Senior Associate with a client on the book,
  mornings carry a chance that one of YOUR clients comes under siege — *"THE TESLER MOTORS
  WAR"* — a three-stage matter measured in weeks, one active at a time:
  - **Stage 1 — Opening Shots:** a 300-page complaint built on a clause from a draft that was
    never executed (paragraph 214 vs. the signed version).
  - **Stage 2 — The Injunction:** their "irreparable harm" affidavit vs. the executive's
    *"WE ARE CRUSHING IT"* post, timestamped in exhibit 12.
  - **Stage 3 — Final Trial:** everything the client is, on one verdict.
- **The dilemma repeats at every stage:** settle safe and the war ends small — *"wars you skip
  don't pay like wars you win"* — or press on. Winning the final trial pays big (up to +15 INF,
  +$2,500, +FIRM) and **permanently DOUBLES the client's retainer** (capped at $800/wk).
- Stages arrive ~4 days apart with their own judges and stakes; war files can't be delegated.
  Miss a stage deadline and the war dies on your desk. Lose the client mid-war and the war
  ends *"the only way wars end without clients: quietly, unpaid."*

### v18.1 — Exhaustion has consequences *(2026-07-12)*
- **Past 75 FATIGUE, every worked hour is a hazard roll.** Per-hour odds of a clumsy incident:
  `(fatigue−75)×4+10` — **30% at 80**, 70% at 90, **CERTAIN at 100**. Longer jobs compound the
  risk; the FATIGUE bar shows the live per-hour risk (`⚠ 30%/h sent-home risk`).
- **The incidents:** pouring a triple espresso onto a partner's deposition notes (and lap),
  falling asleep mid-sentence (your own sentence), shredding the ORIGINAL, calling the client
  by the opposing party's name — twice, with confidence — walking into the glass wall, or
  stapling your tie to a filing.
- **The consequence:** whoever outranks you points at the elevator — *"Home. Now. Before you
  cost us a client."* (At Senior Partner+, you catch your own reflection and send yourself.)
  **−6 REP, −4 INFL**, the day ends immediately, and whatever was still due today burns.
  At FATIGUE 100 it's not a risk, it's a verdict: *"your body filed its own motion — granted."*

### v18 — The Boomerang & office decor *(2026-07-12)*
- **New scenario: THE BOOMERANG** — fired once, hired back. Every colleague starts at −25
  relationship (they remember why), your REP starts stained at 42 — but you know the building:
  **delegation works from day one**, INFLUENCE starts at 18, and Marv kept your mug (his gift
  moments are active from the start). Special crisis: *The Old File* — photocopies of your
  termination file appear in the break room; bury it with receipts, own it standing on a chair,
  or let it burn out. Joins the DAILY rotation.
- **Office decor:** four one-time purchases, all drawn into the pixel office, each with a small
  passive perk:
  - **AQUARIUM** ($800) — two salaried fish; +3 overnight rest.
  - **REAL ART** ($600) — clients notice taste; +1 INFL every Friday.
  - **ESPRESSO MACHINE** ($1,500) — your own; cups cost $40 instead of $120.
  - **SECOND MONITOR** ($700) — fewer alt-tabs; every play costs −0.25h.

### v17.1 — Working into the dark *(2026-07-12)*
- Pick a play that needs more hours than the day has left and the game now stops you:
  *"THE DAY IS ENDING — this play needs 3h, you have 2h. Finishing tonight means 1h into the
  dark, and that kind of hour bills YOU."* Push through and every overflowing hour costs
  **+5 extra FATIGUE** (on top of the usual toil) — or step back, and the file waits for
  the morning. Finishing late chains straight into the quitting-time prompt.

### v17 — The rival fights back & the weekend *(2026-07-12)*
- **Rival interaction:** the RIVAL panel now has moves (one attempt per 2 days, real hours):
  - **SABOTAGE** (1h): his exhibit binder goes 'missing' — his influence drops. Get caught and
    it's −10 REP, the whole floor knows, and he **holds a grudge** (harder sabotage, meaner
    retaliation) for the rest of the run.
  - **TRUCE** (0.5h): four days where he doesn't feed on your failures. Usually accepted.
  - **ALLIANCE** (1h): three days of trading favors — you BOTH gain +1 INF each morning.
    Odds depend on who's ahead; refusal gets your olive branch forwarded to the floor, annotated.
- **He retaliates too:** no pact means mornings carry a chance he raids your inbox — a file
  gets **POACHED** outright (he takes the credit) or **TAMPERED** (pages reordered, −6% on its
  risky plays, marked in red on the file).
- **The weekend:** every Saturday after the Friday review, a choice card:
  - *Sleep* — curtains closed, −30 FATIGUE;
  - *Networking golf* (−$200, a gamble) — +INF, +REP, and the next court case arrives
    **pre-read** (you know the judge's handicap AND their reasoning). Win or lose, the fresh
    air takes −10 FATIGUE off;
  - *Go to the office* — Monday starts with +2 hours, and +10 FATIGUE, and the plants judge you.

### v16.1 — Overlay hotfix *(2026-07-12)*
- Overlay boxes (the "i" panel included) are now capped to the screen height and scroll
  internally — the info panel could previously grow past the viewport and trap you with
  no reachable close button. Info text size trimmed slightly.

### v16 — NPC stories, espresso & the grind *(2026-07-12)*
- **NPC stories:** earn a colleague's trust (rel 40+) and they open a door of their own —
  once per run, each: *DANA'S LEDGER* (fifteen years of partners' sins, one page for you),
  *RAQUEL'S SECRET* (she passed the bar eight months ago), *HAROLD'S MIDNIGHT* (the wrong
  county, eleven days ago), *KATRINA'S OFFER* (a napkin with a blank second name). Choices
  move the relationship hard in both directions.
- **Espresso in EXPENSES** ($120): fatigue relief with diminishing returns — cup one −14,
  cup two −8, after that −2 and your left eye starts billing independently. Counter resets
  overnight.
- **Case archive detail view:** click any entry in LOG to unfold the full case text, the
  judge, and the outcome.
- **The grind is real now (balance):**
  - fatigue hits harder — risky plays lose up to **−25%** (was −15%), overnight recovery
    trimmed to 18;
  - **careful play is slow play**: safe options cost ×1.5 hours (+extra fatigue), technical
    ×1.25 — the bluff is the only fast move in the building; every option shows its hour cost;
  - more files: 3–5 cases land every morning.

### v15.1 — Balance pass: the easy career is over *(2026-07-10)*
- **The workload is real now:** 3 files on day one, 2–4 every morning (partners get buried),
  more favors (35%) and more boss chores (14%) — the 8-hour day finally runs out, and
  overtime/fatigue stop being theoretical.
- **Influence slowed down** (runs were ending in ~10 days):
  - all case INF rewards globally damped (×0.6),
  - rank-scaling no longer inflates INF — higher rank now scales **fees and fallout**, not
    influence (`STAKES ×1.3 fees / ×1.6 fallout`),
  - influence **decays nightly** (−1, −2 at partner level) — yesterday's win is yesterday's news,
  - promotion thresholds raised to 35/60/85/95, daily-goal rewards trimmed.
- **Picking the highest odds is no longer free:** every non-safe play takes a flat −4
  (opposing counsel exists), stacking with rank pressure and fatigue.

### v15 — The 8-hour workday: hours, overtime & fatigue *(2026-07-10)*
- **The real-time countdown is gone.** The day is now a fictional workday, 09:00 → 17:00
  (6/8/10h in settings). Reading is free; DOING costs hours by complexity: errands 1h, real
  cases 2h, court appearances 3h, delegation 0.5h. The topbar shows the wall clock and hours
  remaining; the day ends when you GO HOME — or when the clock does it for you.
- **Overtime:** run out of hours with files still burning and the building asks the eternal
  question — go home, or +2 hours at the desk for **+12 FATIGUE**. Repeatable, at your peril.
- **FATIGUE (new stat):** rises with every hour worked, spikes with overtime, and drags every
  risky play down — up to **−15%** at full exhaustion. Only sleep clears it (−22 overnight,
  +3 per hour you *didn't* bill — leaving early is now a strategy).
- **Boss chores (hierarchy-consistent):** partners interrupt your day — *"SUMMONS: Lou Bitt
  needs a triple espresso from the GOOD place"*. Accept: time + fatigue + a little influence.
  Decline: −3 REP ('Of course. Busy.'). Or volunteer the intern and pray. Requests only flow
  DOWN the hierarchy: a Senior Partner sends an associate for coffee, never the reverse — and
  once you outrank everyone, nobody sends you anywhere.
- The PAUSE button retired with honors: with no ticking clock, thinking is finally free.

### v14.1 — Save slots, restart, fullscreen & layout *(2026-07-10)*
- **3 save slots.** The start screen gains a SLOT 1/2/3 picker (each shows its saved day or
  "empty"); new runs write to the selected slot and CONTINUE loads per slot. The old single
  save migrates to slot 1 automatically.
- **Restart option** in SETTINGS: wipes the current slot and returns to the title screen —
  with a two-step confirm (*"SURE? THIS CAREER ENDS NOW."*).
- **Fullscreen launch:** the Electron (desktop/Steam) build now opens fullscreen.
- **No-scroll layout:** the game now fits the screen exactly — topbar and office scene are
  fixed bands, the three panels stretch to fill the rest, and long columns (the ASSOCIATE FILE
  sidebar included) scroll *internally* instead of scrolling the page. Windows under 900px wide
  fall back to the old stacked layout.

### v14 — Daily goals & the case archive *(2026-07-10)*
- **Daily objectives:** every morning the firm sets a mini-goal — *"Close 2 files"*, *"Win a
  case"*, *"Land an aggressive play"*, *"Close a file without ever playing it safe"*,
  *"Delegate a file"* (Senior Associate+), *"Bank $1,200"*. Meet it by end of day for a bonus:
  sometimes **+INFLUENCE**, sometimes **+REP**, sometimes **+FIRM** health. Miss it and nothing
  happens — the firm merely notices. Progress is tracked live in the side panel
  (`TODAY'S GOAL: Close 2 files (1/2) → +6 INFL`).
  - No information leaks: a delayed case's hidden outcome never counts toward "win" goals until
    the reply actually lands.
- **CASE ARCHIVE** (new **LOG** button in the topbar): every resolved file on record — the day,
  the case, the exact play you chose, WON/LOST, and the outcome text. Delayed replies are tagged
  (finally answering *"which case was that REPLY about?"*), delegations show who you handed the
  file to, and missed deadlines are archived in shame as *"(deadline missed)"*.

### v13.1 — Clients are earned, never given *(2026-07-09)*
- **Zero-start:** scenarios that begin from nothing now begin with ZERO clients. The Legacy
  keeps one family-friend account; the Defector brings one along from Snidely Fitch.
  Promotions no longer auto-sign logos — rank only raises the book's *capacity*.
- **How clients arrive now** (reputation opens every door):
  - Win a real case with high REP and a prospect may write in: *"We followed the Aldergate
    matter. We were impressed. Represent us."*
  - A retiring partner may hand you their account on the way out — if the firm likes you
    (REP ≥ 55): *"Give it to the one with the future."*
  - A **dinner invitation** lands as an event: no pitch decks, a menu without prices — land it
    quietly, over-promise on the wine, or send apologies and bill the evening instead.
- **How clients leave:** every public case failure carries a ~12% chance (worse below 30 REP)
  that a client walks: *"Nothing personal. Everything reputational."*
- **Global events are rarer** (~7% on crisis-free mornings, down from 15%), and the walk-in
  prospect event is gone — acquisition goes through the earned paths above.
- Zero-client Friday penalty now only bites partners (rank 2+); juniors just get watched.

### v13 — The client book & global events *(2026-07-09)*
- **CLIENT LIST:** the firm's book of clients — strictly parody brands (**Abibas**,
  **Mike Sportswear**, **McRonald's**, **Guccy**, **Goggle**, **Tesler Motors**, **Dolce &
  Banana**…), capacity growing with rank (3 → 11), shown in the side panel.
- **Retainers pay on Fridays:** $100–300/week per client, collected in the partner review.
- **GLOBAL EVENTS**, aimed at the book: client bankruptcies (save them with an all-nighter
  restructuring, or bill triple on the way down), Snidely Fitch poaching attempts
  (counter-poach their biggest client right back), and CEO scandals (there is no intern;
  everyone knows there is no intern).

### v12 — The firm is yours (and it can sink) *(2026-07-09)*
- **4th stat: FIRM** — a firm-health bar next to Reputation/Boldness/Influence. Case wins and
  losses, missed deadlines, crises and Friday reviews all nudge it. While you're an associate
  it's "the partners' problem"; once your name is on the wall (ENDLESS), **FIRM below 15 =
  FIRM COLLAPSE, game over.** The name comes off the wall faster than it went up.
- **The payroll (FIRM tab):** on making Name Partner you inherit a ~13-person roster — the four
  floor colleagues, your rival, Daniel Hardwick, Lou Bitt and generated employees. Each shows
  their role, cases **won/lost** and a daily **IMPACT** on firm health; they keep working (and
  winning/losing) every morning, so dead weight actively drags the firm down.
- **Firing:** fire anyone from the FIRM tab — except **Senior Partners, who require a partner
  vote** (odds scale with your REP/INF; a failed vote costs you and they remember). Firing a
  floor colleague also removes them from delegation. You can fire your rival.
- **Wrongful-termination lawsuits:** every firing builds litigation heat (+9, +16 for a voted-out
  senior). Heat decays ~7% nightly but **never reaches zero** — fire 5 people in a month and the
  risk spikes; spread 7 firings over two months and it stays lower, but ex-employees never fully
  forget. When it triggers, a real court case lands in YOUR inbox: *"LAWSUIT: Lou Bitt v. Parson
  Henderson"*, plaintiff's counsel: Snidely Fitch, at a compassionate discount.
- **Partnership buy-in:** Junior Partner → Senior Partner now costs **$5,000** on top of the
  influence requirement. The promotion waits (a BUY-IN button appears under EXPENSES) until you
  wire it.

### v11 — The Defector, achievements, game modes & keyboard *(2026-07-09)*
- **4th scenario: THE DEFECTOR** — you jumped ship from Snidely Fitch. You know their playbook
  (+8% on every risky play against Fitch-related files), and they know where you live: two
  scenario-exclusive sabotage crises (a doctored "poison file" memo with your forged initials,
  and a public counter-offer designed as a loyalty test).
- **Achievements (10)** — persisted across runs, listed on the start screen, designed to map onto
  Steamworks later: win on REALISTIC, win without a single safe play, win The Defector, win in
  IRONMAN, delegate 5 cases to the Traitor and live, 3 bribes taken in one run, Friday praise,
  survive to day 15, and more. Unlocks announce themselves in the log mid-run.
- **Game modes** (picked on the start screen alongside difficulty):
  - **STANDARD** — auto-save, as before.
  - **IRONMAN** — no save at all. Close the game, lose the career.
  - **ENDLESS** — making Name Partner doesn't end the run; the wall gets your name and the
    inbox keeps coming. The rival can no longer outpace a sitting Name Partner.
  - **DAILY** — a date-seeded challenge: everyone gets the same scenario, cases, judges and
    crises that day (difficulty locks to MEDIUM). Powered by a new deterministic RNG that all
    game logic now draws from.
- **Keyboard shortcuts** — 1-4 pick a case/crisis option (options are now numbered), Space
  defers a file or advances the day summary, Esc closes panels. Bribes you can't afford are
  ignored by the hotkeys too.

### v10 — Rival, promotions, Marv, settings & more *(2026-07-06)*
- **The rival associate.** A named nemesis climbs the ladder alongside you: he grinds influence
  every night AND feeds on your failures (lost cases, missed deadlines, botched delegations,
  blown crises). If he makes **Name Partner** before you do, it's game over — `OUTPACED`. His
  progress sits in the side panel: `RIVAL … AHEAD / behind`.
- **Promotion moment.** Getting promoted now plays a short ceremony: you pack up and walk out of
  the *old* office, then walk into the bigger one and sit down. The caption reads
  "PROMOTED — packing up the old desk…".
- **Marv grows up.** The copy-room oracle now drops recurring mini-events, and his tone and gifts
  depend on your bribe history — pay him once and folders start "accidentally" landing in your
  tray (free dossiers on live cases).
- **More content:** 12 procedural case templates (up from 7 — backdated emails, self-poisoned
  patents, Frankenstein loan guaranties, HOA tyrants…), 2 new firm-wide crises (billing audit,
  client defection), and 3 new judges including the very sociable Hon. T. Fairway.
- **Run ledger.** The end-of-run screen now breaks down your career: bluffs landed vs. blown,
  technical record, safe plays, bribes offered/taken, favors, most-delegated colleague, deadlines
  missed, crises faced, and how high the rival climbed.
- **Settings panel** (new **SET** button): day length (60 / 75 / 90s), SFX and music volume
  (off / low / full), and a screen-shake toggle. **Screen shake** now punctuates failures
  (respects the toggle). All preferences persist globally, separate from the run save.

### v9 — Ambience, endings, bribes & favors *(2026-07-06)*
- **Lo-fi office ambience** — fully procedural (Web Audio, still zero asset files): a slow
  4-chord loop of detuned triangles through a lowpass over vinyl-hiss noise. New **BGM** toggle
  in the topbar, independent of SFX; preference remembered across sessions. Stops on game over.
- **The ending remembers how you climbed.** Name Partner now crowns you as one of four:
  **THE SHARK** (Boldness ≥ 65), **THE BELOVED** (Reputation ≥ 70), **THE SURVIVOR**
  (Boldness ≤ 32) or **THE OPERATOR** — plus a scenario-specific closing line (the Fraud's
  diploma, the Debtor's paid loans, the Legacy's parent).
- **Corruptible judges** (the missing GDD judge stat): the case file now shows an **ETHICS**
  read — granite / flexible / 'sociable'. Flexible-or-worse judges quietly add a gold option:
  *"Invite the judge to 'discuss golf'"*. It costs real money win or lose, pays big influence,
  and a refusal goes on the record (−13 REP).
- **Reverse favors:** colleagues now ask YOU for help — one-day FAVOR files (Dana's phones,
  Raquel's night-school brief, Harold's double-booked depositions, Katrina's non-request).
  Help quietly (+10 rel), help loudly (risky, +INFL but it can read as credit theft), or
  decline (−8 rel). Ignoring the file entirely costs −10 rel. Favors can't be delegated back.

### v8 — Friday partner review *(2026-07-06)*
- **Every fifth day is FRIDAY.** The topbar counts down to it (`FRI IN 2`), and the end-of-day
  summary becomes a **partner review** of your week: influence gained, reputation kept, and
  deadlines missed all feed a weekly score.
- A strong week earns a nod from the partners (**+4 REP, +4 INFL**); a weak one gets measured
  out loud (**−4 REP**); an adequate one gets the driest sentence Parson Henderson can produce.
  Three flavor variants per verdict.
- The weekly baseline resets every Friday, so each week is judged on its own. Missing deadlines
  now hurts twice: once when it happens, and again in the review math (−3 score per miss).

### v7 — Fuzzy odds & difficulty modes *(2026-07-06)*
- Success odds are no longer an exact number. Pick a difficulty on the start screen:
  - **EASY** — tight range (e.g. `~75–85%`)
  - **MEDIUM** — wider range
  - **HARD** — the range is more of a rumor (`~35–65%`)
  - **REALISTIC** — no numbers anywhere. Read the file. Feel the odds.
- The displayed range is deliberately **off-center** (shifted by a hidden per-run seed), so the
  midpoint doesn't leak the true value — and it's stable, so re-opening a file won't reveal
  anything by flickering. Applies to case options, crisis choices and delegation odds alike.
- **The dice never change** — difficulty blurs your information, not the math. Safe (green)
  options still read `100%` outside REALISTIC. Your chosen mode is shown in the side panel and
  saved with the run.

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
