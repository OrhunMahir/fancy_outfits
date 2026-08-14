# FANCY OUTFITS

*A pixel-art legal drama sim. Read the file. Pick your line. Don't get HENDERED.*

> **⚠️ License:** Source available for **viewing only** — this is **not** open source.
> All rights reserved; no use, copying, redistribution or derivative works without
> written permission. See [LICENSE](LICENSE).

You're a lawyer (maybe) at **Parson Henderson LLP**. Case files land in your inbox during a
fictional workday where every action costs hours; the winning argument is usually hiding somewhere in the text. Safe options never fail
but drain your Boldness; bluffs pay big and burn Reputation when they collapse. Climb from Junior
Associate to **NAME PARTNER** before your secret — or your reputation — ends you.

## Running the game

| Command | What it does |
|---|---|
| `npm install` | one-time setup |
| `npm run dev` | dev server in the browser (Vite) |
| `npm run build` | static production build in `dist/` (deployable to GitHub Pages / itch.io) |
| `npm start` | build + open as a desktop app (Electron, the Steam target) |

Requires **Node.js 22.12+**.

**Tech:** React 18 + Vite 7, zero asset files — sounds are WebAudio synthesis, graphics are CSS +
runtime-generated SVG. Game logic lives in `src/game/` (plain JS, framework-free); UI in
`src/components/`. Case generation is fully offline and procedural — **no API keys, no network**.

---

## Changelog

### v19.22 — The Contradiction Board *(2026-08-13)*
- **Prep work you choose, not prep work that happens to you:** eligible files now offer CASE PREP —
  spend 1.5 hours and 6 fatigue to pin each sworn statement to the exhibit that makes it
  impossible. Unlike the Evidence Timeline, this is a deliberate option on the file, and unlike a
  COVERT ACTION it risks nothing but your afternoon: there is no coin call and nobody gets caught.
- **Limited attempts, and one exhibit that proves nothing:** three statements, four exhibits and
  four attempts. A decoy pin costs credibility; run out and the chart collapses. You can also close
  the binder early and bank what you already proved.
- **The chart never wins the case:** a complete chart adds +15% to that file's risky legal plays, a
  partial chart adds a proportional share, an empty one costs only the hours. The legal decision is
  still yours to make afterwards, and the file goes straight back onto the desk.
- **Two hosts, so it stays rare but repeatable:** the hand-written Pemberton estate hearing carries
  the authored six-contradiction bundle, and half of the generated contested-estate filings carry
  their own — with the generated names running through the statements and exhibits.
- **Court files may now carry prep (but still never a burglary):** the board is dealt from a
  run/case/action identity, survives save and reload mid-chart, and every persisted board is
  re-derived and compared on load. Save schema v17 migrates older careers with no board and fresh
  counters; the run ledger reports charts attempted and completed.

### v19.21 — Nobody walks in cold for free *(2026-08-13)*
- **Skipping the chronology now costs something:** GO IN COLD still spends no hour and no fatigue,
  but the play you already committed to argues at −4%. That is deliberately lighter than the −10%
  of a muddled chronology, so sitting down with the binder remains the better bet. Saved evidence
  edges are validated against the exact set of outcomes the game can stamp, so a hand-edited
  advantage is refused.
- **The chronology reaches the whole docket:** five procedural templates — the late filing, the two
  signed reports, the backdated warning email, the patent that predates itself and the assembled
  loan guaranty — now carry their own seven-event chronology. Every date lives in the case body and
  never on the cards, and the generated names and figures run through the events too, so the same
  template reads differently in a different career.
- **The safe route has a price again — but never a chance of failing:** a safe play is still 100%.
  What changed is what it pays. Settling real files back to back reads as COASTING: each
  consecutive quiet settlement returns 1 less Influence and drains 2 more Boldness, up to four
  deep, and any risky play anywhere clears the record. Careful lawyering also got slower (×1.75
  hours instead of ×1.5). The case pane prints the exact coasting cost before you choose.
- **Measured, not guessed:** the decision came from paired 64-seed cohorts (320 careers per cell).
  The coasting penalty leaves ordinary careers untouched while cutting the always-settle career's
  Influence by a third; a ×2.0 hour price was rejected as a disguised global difficulty increase.
  Save schema v16 migrates older careers with a clean streak; the soak keeps a `safe_legacy`
  control variant.

### v19.20 — Put the file in order *(2026-08-13)*
- **Evidence Timeline:** not a separate action — after you commit to a risky play on a file whose
  text carries a chronology, a preparation window opens 25% of the time. Ordering the events
  correctly gives that specific play +12%; a muddled order costs it 10% and leaves a light mark.
  The case is never won or lost by the puzzle itself.
- **Reading is the edge:** the board is dealt from an authored event pool by run/case identity, is
  never dealt already solved, and the cards carry no dates — only the case file does.
- **Playable by hand, thumb or keyboard:** per-card up/down buttons at 44px, no drag and drop.
  Preparation costs half an hour and 3 fatigue whether you succeed or not; declining is free.
  Save schema v15 rebuilds the board from its identity, so a mid-puzzle reload cannot reroll it.

### v19.19.1 — The question comes first *(2026-08-12)*
- **First playable morning checkpoint:** a queued Fraud confrontation now opens before REP/INFL
  decay, rival progress, delayed results and roster drift. The guaranteed cover decision can never
  be skipped by a passive morning loss; resolving it resumes the remaining morning exactly once.
- **Crash-safe continuation:** save schema v14 persists and strictly validates that pre-morning
  continuation. Reloading the active confrontation cannot replay or skip the morning pipeline, and
  schema-v13 identity records migrate without changing their suspicion or pending scene.

### v19.19 — The secret gets tired *(2026-08-12)*
- **Fraud identity pressure:** THE FRAUD now records the highest work-fatigue reached each day. At
  80–89 / 90–94 / 95–99 / 100 FATIGUE, one end-of-day slip check uses 0.5% / 1.5% / 3% / 5%.
  Coffee cannot erase an already reached peak, only one roll can occur per day, and a terminal day
  never records a confrontation the player could not answer.
- **No random instant loss:** a hit schedules a visible cover-story decision for the next morning.
  Failed technical or aggressive answers raise SUSPICION through an alumni question, conflicting bar
  records and a malpractice-insurer proof request. Only a deliberately chosen risky failure at the
  final inquiry can expose the secret; every stage keeps a 100% nonlethal survival route with a real
  BOLD/INFL cost.
- **Strict, resumable chain:** pending event kind/day, suspicion, daily peak and counters persist in
  save schema v14. Active scenes are rebuilt/validated against canonical content, cannot be edited
  into ordinary XP-paying crises, survive reload without a reroll, take priority over weekend/crisis
  content and open before ordinary morning passives; the remaining morning resumes after the answer.
  Schema-v12 careers start
  from a clean identity-pressure baseline; an already-open legacy credentials audit is grandfathered.
- **Visible and measurable:** THE SECRET panel shows suspicion, today's peak/band, spent check and due
  follow-up. The info panel documents the exact bands. Regression coverage includes boundaries,
  reload idempotence, migration/tamper rejection, safe routes at terminal stat floors, exact EXPOSED
  cause and promotion-summary interruption; deterministic soak output now reports Fraud checks,
  hits, stages and exposure.

### v19.18 — Earn the edge *(2026-08-12)*
- **Independent career progression:** resolved work now earns deterministic XP across eight levels.
  Every level gained grants one spendable point; scenario-native ranks are separate and never consume
  those points. XP has no RNG calls, cannot go negative and is capped at 780.
- **Two real skills:** SNEAKY widens lockpick tolerance, adds attempts at ranks 2/5, slows Power Cut
  rings by 7% per rank and widens their windows. ENDURANCE cuts positive work fatigue by 6% per rank
  after the scenario's own fatigue profile; rest, coffee, overtime and narrative penalties are not
  discounted. A twelfth procedural filing can surface either COVERT board in later careers, so
  SNEAKY points earned after the two hand-written actions still have work to do.
- **No XP leaks or farms:** immediate cases award at resolution; delayed filings only at REPLY;
  delegated results award a smaller amount only on final handback; COVERT and genuine crisis results
  award once. Starts, clicks, hidden rolls, favors, deadlines, chores and shopping award nothing.
- **Training UI and strict resume:** the sidebar exposes LEVEL/XP, available points, innate ranks and
  exact current/next effects with accessible controls. Save schema v12 strictly validates XP, level,
  point conservation and skill ranks. New COVERT challenges snapshot their skills; active v9/v10
  lockpick/Power Cut saves migrate under legacy rules without changing the board, fatigue or timing
  checkpoint. Schema-11 late-work checkpoints also migrate without losing the active puzzle.
- **Measured pace:** the final 720-career soak ended with 342/342 deterministic replays and zero
  integrity failures. Standard technical/mixed winners reached median level 5; 30-day Endless
  careers reached median level 7, leaving level 8 as the long-career target.

### v19.17 — Cut the current *(2026-08-12)*
- **Second playable COVERT ACTION:** Aldergate's NimbusHost file exposes a three-circuit service
  bypass. Stop each rotating marker inside its visible amber window; all three contacts must align
  before the local patch ledger prints. The recovered ledger adds +12% to that file's later risky
  legal plays instead of resolving the lawsuit for free.
- **Failure stays legible:** one missed circuit visibly arcs and moves to the same explicit coin-call
  escape rule as the lockpick. Escape preserves the lawsuit but burns the route; capture archives
  the file and applies the full REP/FIRM/BOLD fallout. Every branch commits 1.5 hours and 8 FATIGUE.
- **Deterministic timing without DAILY drift:** board targets, starting angles, speeds, directions and
  the escape coin derive from run/case/action identity. Animation never consumes gameplay RNG, and
  frame deltas are capped so a hidden/background tab cannot jump a marker across the board.
- **Strict resume contract:** introduced in save schema v10; current schema v14 still persists each locked/missed circuit, elapsed timing and
  active marker. Static board values are re-derived on load; inconsistent angles/elapsed time, phase,
  circuit order, target, speed or action identity are rejected. Desktop and compact layouts use the
  same keyboard/touch control and blocking focus-safe modal.

### v19.16 — Interactive covert action vertical slice *(2026-08-11)*
- **The first playable minigame:** Redvale's document-hold file now offers a purple COVERT ACTION.
  The player gets three paperclip tests against a hidden lock position; breaking the pick opens a
  visible heads-or-tails escape call instead of silently rolling another case percentage.
- **Evidence, not an automatic win:** opening the cabinet recovers the archive index and adds +12%
  to this file's later risky legal plays. Escaping loses the route but preserves the case; getting
  caught poisons and archives it with severe REP/FIRM/BOLD fallout. Every branch spends 1.5 hours
  and 7 FATIGUE, and the action can only be attempted once.
- **DAILY/save integrity:** lock and coin outcomes derive from run/case/action identity without
  consuming the shared RNG. Save schema v9 resumes the exact phase and attempts, migrates v8
  safely, and rejects forged targets, phases, counters, briefings, case markers and impossible
  success positions.
- **Modal and mobile-ready UI:** the target never appears in the DOM; keyboard focus is trapped and
  restored, background controls become inert, touch targets are 48–52px, safe areas and reduced
  motion are respected, and the dialog fits a 390×844 viewport without horizontal clipping.

### v19.15 — Earned Final Warning *(2026-08-09)*
- **One earned exception:** a fatal aggressive loss can be stayed once per run, but only when the
  play began at BOLD 70+, after at least three landed bluffs, with bluff wins still ahead of
  losses. The intervention restores REP to 28 and costs 15 BOLD. Ordinary losses, reckless early
  spam, deadlines and non-aggressive failures receive no protection.
- **Instant, delayed and crisis-safe:** eligibility is snapshotted before the losing roll and
  persists with delayed filings, so save/load and hidden replies cannot change the rule. The
  sidebar shows the unused/spent state; the run ledger records consumption.
- **Save schema v8:** old slots receive one unused warning. The consumed state and delayed-choice
  snapshot persist; malformed snapshots or warning state are rejected.
- **Measured limitation:** the 2,560-career paired Standard A/B produced 205/205 identical replays
  and zero integrity failures. Technical and Mixed were exactly unchanged; Bold Mixed moved only
  from 68.1% to 68.4%. The warning activated in 4.4% of pure-aggressive careers, but that route
  still won 0%. Exploratory restoration values up to REP 80 reached only 1.9%, so the requested
  5–12% band needs a separate post-success recovery/probation mechanic rather than a larger reset.

### v19.14 — Influence above the ceiling matters *(2026-08-09)*
- **Exceptional Review:** only while Senior Partner, genuinely clipped positive Influence above
  100 becomes visible partner momentum instead of disappearing. At 36/36, after at least two
  mornings in rank, a Name Partner vote can land on a non-Friday morning.
- **Still earned, never automatic:** the early vote requires REP 30+ and the ordinary FIRM gate;
  it cannot fire during the action that filled it. The completed Friday review has priority, so a
  normal promotion never masquerades as an exceptional one.
- **Honest UI and save schema v7:** the sidebar shows live momentum, earliest decision day and
  gates. Momentum, Senior Partner date, consumed exceptional decision and one-shot hint persist;
  old Senior Partner saves begin their wait on migration day rather than receiving a free vote.
- **Measured threshold:** 3,840 paired Standard careers compared off/24/30/36-point models.
  The selected 36-point rule kept Technical and Mixed at their day-21 median while controlled
  Bold play moved to day 20; Exceptional Review appeared in 35.3% / 30.9% / 37.8% respectively.
  Win-rate lift stayed to 3–5 points and day-12 wins remained zero. All 330 extreme replays matched
  with zero integrity failures.

### v19.13 — Judges remember the recent record *(2026-08-09)*
- **Recent-weighted recall:** judges still keep the full career W/L transcript, but today's odds
  use only the last three appearances at `×1 / ×0.35 / ×0.15`. A different approach can cool an
  old pattern; three nearby technical wins can still earn the +6 credibility cap.
- **No arbitrary Friday amnesia:** a weekly half-life model reduced saturation further but created
  an invisible calendar cliff. The shipped rolling model makes forgetting depend on what the player
  does in court, while preserving guaranteed safe plays and the existing −8/+6 caps.
- **Honest court UI:** the file separates CAREER totals from ACTIVE RECALL and prints the exact
  recent-weighted effect before the choice. Judge-specific lines and immutable archive snapshots
  remain intact.
- **Save schema v6:** active recall persists as a bounded 12-event transcript. v3–v5 aggregate-only
  slots retain every lifetime counter and seed recall from the last known hearing; malformed,
  future-dated, out-of-order or counter-inconsistent events are rejected.
- **Measured result:** in the final 640-career Endless comparison, post-day-20 cap occupancy fell
  from 53.3% to 24.9% overall (Technical +6: 54.4%→26.8%; Aggressive −8: 53.1%→13.8%).
  Standard progression stayed stable; all 88 extreme replays matched and integrity failures were 0.

### v19.12 — The payroll can finally sink you *(2026-08-08)*
- **Headcount has a cost:** after Name Partner, morning operating load is now
  `ceil(employee count / 10)` FIRM. The starting ~13-person roster therefore costs 2 FIRM;
  trimming it below 11 reduces the load to 1, but every firing still costs morale and creates
  wrongful-termination heat.
- **Roster downside has teeth:** an employee acts on 30% of mornings. Their PERFORMANCE sets the
  win chance (`50 + performance×8`); a routine win restores +1 FIRM while a loss costs −2.
- **Honest management UI:** the misleading `IMPACT n/day` label is gone. The FIRM tab now shows
  each employee's real win chance, current headcount cost and the exact win/loss stakes.
- **Measured decision, not a threshold hack:** raising the collapse floor was rejected. Across
  1,280 paired 80-day Endless careers, the old rules produced 0 collapses in 7,400 competent and
  6,390 bad-management post-NP days. The shipped rules produced 3.4% collapse under competent
  management and 12.5% under repeated bad firings; FIRM-cap occupancy fell from 53.7%/37.2% to
  4.0%/2.0%. All 132 selected extreme replays were identical, with zero invariant failures.

### v19.11 — Controlled-risk & Boomerang audit *(2026-08-08)*
- **A real risk-route model:** the soak runner now includes `bold_mixed`, a visible-information
  policy that spends a healthy REP/Boldness buffer on aggressive shots, recovers with careful work,
  delegates under deadline pressure and uses rival truces. It chose AGGRESSIVE in 9% of 320
  Standard careers, won 63.4% and was fired 14.4% of the time versus Technical's 69.4% / 5.6%.
- **Boomerang false alarm resolved:** the former mixed model refused every colleague at the initial
  hostile relationship score, so the scenario's day-one delegation perk was never used. Allowing a
  deadline-pressured handoff at the visible ~55% estimate moved the same 64-seed cohort from 21.9%
  to 71.9% wins without changing a single shipped Boomerang or NPC number.
- **Causal rival telemetry:** deterministic runs now split rival INF into passive growth and growth
  fed by player failures, record delegated W/L, deadline results, rival actions, NPC relationship,
  aggressive opportunity bands and the day each promotion threshold became ready.
- **Rejected reward inflation:** aggressive-INF multipliers 1.50 and 1.75 produced the same 59.4%
  win rate and day-21 median as 1.25 across 480 paired careers. Extra INF is mostly clipped while
  Friday review is pending, so no gameplay reward constant changed.
- **Verification:** the main comparison covered 960 careers with 79/79 identical extreme replays
  and zero invariant failures. Seed `2874639110` changed from an old no-delegation OUTPACED run with
  nine misses to a day-21 win with 16 handoffs and zero misses; the new trace replayed identically.

### v19.10 — Measured career progression rebalance *(2026-08-08)*
- **Promotions now belong to Partner Review:** crossing an Influence threshold marks the career
  promotion-ready, but the title changes only on the morning after Friday review and at most one
  rank per review. The sidebar, info panel and one-shot log message make the wait explicit.
- **Delegation is relief, not a parallel career:** the daily handoff cap is now one. The case panel
  shows `used/limit`, disables colleagues after the slot is spent and the engine keeps the same
  strict guard. Existing delegated rewards and success odds were not nerfed.
- **Measured selection:** exact positive-INF attribution and new mixed/FIRM-only policies compared
  immediate progression, Friday cadence, delegated-INF reduction and distributed reward cuts.
  Reward cuts alone still produced 100% Technical wins around day 11; Friday cadence plus one
  handoff moved the 320-career Technical cohort to 69.4% wins, median day 21 and zero day-12 wins.
- **Save schema v5:** consumed review day and the one-shot readiness hint persist across reloads, so
  reopening a slot cannot replay a promotion decision. Old slots migrate both fields safely.
- **Verification:** the final paired Standard run covered 1,280 careers with 96/96 identical
  replays and zero invariant failures; the separate Endless A/B covered 1,920 careers with 201/201
  identical replays and zero invariant failures. Full evidence is in
  [`BALANCE_SOAK_REPORT.md`](BALANCE_SOAK_REPORT.md).

### v19.9 — Deterministic career soak & integrity *(2026-08-08)*
- **A real long-career laboratory:** the new headless soak runner drives public engine actions
  across Standard and Endless careers with independent game/policy RNG streams, five player
  policies, a dedicated post-partnership FIRM stress policy, provenance hashes and exact replay
  traces. The audited matrix covered 3,520 careers; all 252 suspicious/extreme replays matched and
  no engine invariant failed. See [`BALANCE_SOAK_REPORT.md`](BALANCE_SOAK_REPORT.md).
- **Measured, not silently retuned:** the visible Technical route reached Name Partner in 315/320
  Standard careers (median day 10), while pure Aggressive won 10/320 and exact max-chance play won
  2/320. No balance constant changed in this pass; the report defines controlled progression,
  judge-memory and FIRM-endgame A/B tests instead of mixing them with integrity fixes.
- **Save-stable procedural identity:** save schema v4 persists a monotonic case sequence. Generated
  cases, nested appeals, Client War stages and lawsuits keep unique IDs across save/reload, and
  damaged or lagging sequence data is rejected rather than allowing identity collisions.
- **Resolved integrity bugs:** late work can no longer save a negative clock; morning batches perform
  one promotion transition; stale event choices cannot double-apply; expired delegated work cannot
  be revived by Lazy/missing colleagues; Endless low-FIRM promotion and eventual career records have
  correct ordering; two-hour overtime uses its compounded fatigue risk.
- **Bounded long-run state:** inbox notifications keep the newest 80 messages without deleting live
  filings, old saves are repaired on load, archives retain filing IDs, and stricter validation covers
  live deadlines plus delegated and procedural metadata.
- **Regression entry points:** `npm test` covers the confirmed edge cases, `npm run test:soak` runs a
  small deterministic matrix, and `npm run soak` runs the full 64-seed Standard/Endless audit.

### v19.8 — Judges remember *(2026-08-08)*
- **Per-career court history:** all seven judges now have stable IDs and remember your resolved
  appearances. Their case card shows first appearance vs. prior history, the last approach/result,
  a judge-specific line and the exact live style modifier before you choose.
- **Small, capped consequences:** a familiar bluff loses 5 points after a prior win or 6 after a
  prior loss (total cap −8); technical wins build +4 credibility and losses spend 3 (−6..+6);
  repeated judge bribes lose 7 points (cap −8). Safe lawyering stays guaranteed and cannot erase
  an existing pattern. Other judges are unaffected.
- **No hidden-result leak:** instant hearings update memory once after the roll; delayed hearings
  update only when REPLY reveals the already-rolled result. Memory helpers and dialogue consume no
  RNG, preserving DAILY runs and save/reload continuity. A delayed file freezes its visible court
  context when it is sent, so another hearing before the reply cannot rewrite the archive.
- **Audit trail and integrity:** the case archive freezes the memory context that applied at each
  hearing. Save schema v3 migrates older slots to empty court history, supports old live judge
  snapshots without IDs, rebuilds v3 judges from their stable catalog IDs and rejects live judge
  sentinels, delegated court files, malformed style/memory data and stale double-resolution attempts.
- **Regression coverage:** `npm test` covers all IDs/quotes, exact caps, safe/other-judge isolation,
  live and delayed recording, archive immutability, old-save fallback, malformed saves, RNG cursor
  stability and identical DAILY traces.

### v19.7 — Firm confidence & scenario endings *(2026-08-07)*
- **FIRM now matters in Standard careers:** its condition changes client-impress,
  prospect and post-loss walk-away odds. The bands are visible in the sidebar, while
  non-Standard modes keep their established client curve.
- **Partnership has a business-health gate:** promotions now require 40 / 45 / 50 FIRM
  in Standard mode (the $5,000 buy-in still applies). A struggling firm does not cause
  an early game over; instead, a 1.5-hour turnaround plan restores 10 FIRM at the cost
  of 6 FATIGUE, with a five-day cooldown.
- **Delegation is economically complete:** real delegated matters move FIRM +1 on a win
  and -1 on an ordinary loss. A Lazy colleague's silent return remains unresolved work,
  so it does not double-charge business health before the deadline outcome.
- **Scenario payoffs:** The Defector and The Boomerang now have bespoke terminal victory
  and loss lines. Boomerang victories unlock the permanent **RETURN TO SENDER**
  achievement, bringing the total to 11.
- **Save schema v2:** older slots migrate the new cooldown/hint fields in order. The
  regression harness covers every FIRM boundary, mode isolation, promotion and buy-in
  guards, turnaround recovery, delegated outcomes, migrations and all special endings.

### v19.6 — Save integrity & desktop security *(2026-08-07)*
- **Client Wars now end cleanly:** losing the retained client, missing a stage deadline, ending
  the matter or loading an older inconsistent save removes every matching inbox/follow-up
  carrier. Stale filings are discarded instead of reviving a dead three-stage matter.
- **Versioned, validated saves:** slots carry a schema version and migrate through an ordered
  pipeline. Malformed, incompatible and newer-version saves are preserved and labelled rather
  than silently deleted or overwritten; legacy single-slot saves move only after a verified copy.
- **No end-of-day rollback:** nightly penalties, deadlines, reviews and debt are checkpointed
  before the walk-out animation. Reloading during that animation resumes the summary and advances
  the calendar exactly once.
- **Storage failures are visible:** quota, blocked-storage and serialization failures keep the last
  good slot and show a persistent warning. A terminal screen retries a failed slot deletion before
  reloading, so a finished run cannot revive. Logs and case archives are bounded on disk while their
  all-time archive count remains accurate; stat and ledger counters are range-checked on load.
- **Desktop/web hardening:** upgraded to Vite 7 and Electron 43, reached a zero-vulnerability npm
  audit, added a production Content Security Policy, and blocked Electron popups, external
  navigation and permission requests. Development alone permits Vite's inline Fast Refresh preamble
  and loopback HMR WebSocket; neither exception reaches the production HTML.
- **Regression harness:** `npm test` now exercises old-save migration, damaged/future slots,
  storage failure recovery, reload-at-day-end and Client War ownership/cleanup invariants.

### v19.5 — Approach rebalance & workday limits *(2026-08-07)*
- **No more "just press 2":** every live case deterministically shuffles its base options when
  it reaches the inbox. DAILY runs keep the same order for the same seed, templates stay
  immutable, and a judge's special golf/bribe option always remains last.
- **Distinct career paths:** technical case wins now earn ×0.70 INFLUENCE after normal case
  scaling, preserving their strong reputation profile; aggressive wins earn ×1.25, making
  high-Boldness risk the faster route up the firm. Safe/neutral, crisis and delegation rewards
  are unchanged.
- **The night has an ending:** overtime is capped at two blocks per day. The first adds 2 hours
  for 12 FATIGUE, the second adds 2 for 18; after that the building sends you home.
- **Coffee is a tool, not a time machine:** at most two espressos per day (14 then 8 FATIGUE).
  The espresso-machine decor still lowers their price, but no longer enables infinite recovery.
- **Deterministic shuffles:** client pools and hidden NPC traits now use Fisher–Yates instead of
  random `sort()`, keeping DAILY behavior portable and reproducible.
- **Regression harness:** `npm test` now covers shuffle/save determinism, style rewards, coffee
  and overtime guards/migration, plus all 20 scenario/mode start combinations.

### v19.4 — Integrity & consistency pass *(2026-07-12)*
- **Reload-skips-overtime exploit closed:** reloading with the day's hours spent no longer
  bypasses the quitting-time / overtime prompt — the clock state is re-derived on load.
- **Crises no longer vanish on reload:** an open crisis, favor, story, weekend or boss chore is
  now saved and restored (only the transient clock prompts are re-derived).
- **DAILY is deterministic across reloads:** the seeded RNG cursor is saved and resumed, so the
  same daily really is the same daily even if you reload mid-run.
- **Delayed & delegated results now count fairly:** a reply that lands in the morning credits
  that day's goal (previously it counted toward neither day), and a delayed win/loss moves FIRM
  health ±1 just like an instant one.
- **The Fraud can actually get caught:** failing the "do nothing" option in the bar-credentials
  audit is now an **EXPOSED** game over, matching the scenario's promise (other audit failures
  still just cost you).

### v19.3 — Stability hotfix + Windows hardening *(2026-07-12)*
- **Crash/soft-lock fixes:** firing a colleague who's mid-delegation no longer crashes the
  inbox — the file is handed back to your desk first. Favor generation no longer crashes when
  you've fired the entire floor (endless). The rival can no longer poach an active client-war
  stage (it used to soft-lock the war). Paying the partnership buy-in with high influence no
  longer cascades straight past Senior Partner to Name Partner in one step.
- **Windows "frozen window on startup" fix:** hardware acceleration is now disabled (a 2D
  pixel game doesn't need it, and it's the most common cause of unpainted/frozen Electron
  windows on Windows GPU drivers). The app launches maximized instead of forced-fullscreen,
  reveals only once painted, and F11 toggles fullscreen (Esc leaves it).

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
  losses, missed deadlines, crises and Friday reviews all nudge it. In this original v12 design
  it was "the partners' problem" before Name Partner (v19.7 later gave it Standard-career
  consequences); once your name is on the wall (ENDLESS), **FIRM below 15 =
  FIRM COLLAPSE, game over.** The name comes off the wall faster than it went up.
- **The payroll (FIRM tab):** on making Name Partner you inherit a ~13-person roster — the four
  floor colleagues, your rival, Daniel Hardwick, Lou Bitt and generated employees. Each shows
  their role, cases **won/lost**, PERFORMANCE and real win chance. Every employee acts on 30% of
  mornings: a win restores +1 FIRM, a loss costs −2. Operating load is
  `ceil(headcount / 10)` FIRM each morning, so payroll size and staff quality both matter.
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
