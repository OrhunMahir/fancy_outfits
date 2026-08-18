# FANCY OUTFITS
*A pixel-art legal drama sim — "Papers, Please" meets Suits.*

Firm: **Parson Henderson LLP** (any resemblance to Pearson Hardman is strictly billable).

---

## 1. Core Fantasy
You are a lawyer (maybe). Read case files, pick your line, bluff, grovel, or backstab your way from Junior Associate to Name Partner — before your secret ruins you or your reputation hits zero.

## 2. Core Loop
1. **Day starts** — real-time clock (e.g. 10 min = 1 in-game day; prototype uses ~90s).
2. **Desk fills up** — case files, partner errands ("get my coffee, and also win this deposition"), and random crises land in your inbox.
3. **Read the file** — actual case text. You must interpret it like a real lawyer: spot the weak clause, the missing signature, the bluffable gap.
4. **Choose a response** — 2–4 dialogue/action options, each with:
   - a **success chance** (modified by your traits and the situation),
   - a **cost/reward profile** (stats up/down, relationship changes, money).
   - Rare **COVERT ACTIONS** replace the percentage roll with a short player-executed minigame.
     They create evidence or consequences, then return the player to the legal decision; they do
     not automatically win the underlying case.
5. **Resolve or defer** — some cases resolve instantly; others go out and the opposing party answers days later. Every case has a **deadline**; miss it and it auto-fails.
6. **Clock runs out** — day ends, summary screen, consequences tick (rivals scheme, deadlines approach).

## 3. Player Stats
| Stat | What it does | Fail state |
|---|---|---|
| **Reputation** (0–100) | Firm's opinion of you. Failed bluffs, lost cases, botched errands lower it. | Below threshold → fired → game over. |
| **Boldness** (0–100) | Risk-taking trait. Raises bluff/aggressive-option success. Capitulating lowers it; wins raise it. | Never fatal, but low Boldness locks you into safe, low-reward options. |
| **Influence** (0–100) | Political capital inside Parson Henderson. Drives promotion, protects you in crises. | — |
| **Money** | Some scenarios need it (student debt). | Debt scenario: miss a payment → game over. |

**The trade-off that drives everything:** the safe option (capitulate/settle) is ~100% success but drains Boldness. The bold option (bluff/attack) pays big but its chance scales with Boldness — and failure hits Reputation. Cowardice is a slow death; recklessness a fast one.

## 4. Career Ladder
Junior Associate → Senior Associate → Junior Partner → Senior Partner → **Name Partner** (win condition).

- Crossing an Influence threshold makes the player promotion-ready. Titles normally change on the
  morning after the five-day Friday Partner Review, at most one rank per review; reload cannot
  replay a consumed review.
- Senior Partner is the one measured exception: positive Influence genuinely clipped above 100
  becomes **Exceptional Review momentum**. At 36 points, after two mornings in rank, REP 30+ and
  the normal FIRM gate can bring the Name Partner vote forward. It never resolves in the earning
  action, and a scheduled Friday decision always takes priority.
- Early ranks get mostly errands and doc review; case quality rises with rank.
- Higher rank = higher stakes: crises target you more, rivals notice you.

## 5. NPCs & Relationships
Every named NPC (partners, associates, paralegals) has:
- a **relationship score** with you (−100..100), moved by favors, wins, betrayals;
- **traits** that change how delegation and politics work:
  - **Reliable** — delegated tasks almost always get done.
  - **Brave** — will back you in a crisis.
  - **Lazy** — chance a delegated task silently doesn't happen.
  - **Traitor** — may sell you out when it benefits them (crisis events check this).

Delegation unlocks at Senior Associate: hand one case per day to an NPC, their traits + relationship decide the outcome. You eat the consequences either way.

## 6. Crisis Events
Random firm-level drama in the Suits mold — e.g. a Louis-type partner maneuvering behind a Harvey-type's back, a merger threat, a mole leaking files. Crises:
- interrupt the day with forced choices (pick a side, stay neutral, exploit it);
- check NPC traits (a Traitor ally flips, a Brave one shields you);
- shift Influence/Reputation in big chunks. High-risk, high-reward politics.

## 7. Judges
Each courtroom case draws a judge with stats:
- **Temper** — low tolerance for aggressive options (bluff penalty).
- **By-the-book** — rewards technically correct interpretations. Temper handles theatrics.
- **Corruptible** — opens a special (very risky) option.
- **Memory (per run)** — every judge has a stable ID and a lifetime W/L transcript, while live odds use the three most recent appearances at weights `1 / .35 / .15`. A bluff contributes −5 after a win or −6 after a loss (capped −8); technical wins contribute +4 and losses −3 (−6..+6); bribery contributes −7 (capped −8). Safe and different-style appearances enter the recent window, cooling an old pattern without deleting the career record. Safe options remain guaranteed.
Judge stats, prior appearance, deterministic style-aware quote, career record, active-recall rule and exact live modifier are visible before the choice. Delayed outcomes enter memory only when their REPLY is revealed, so hidden results never leak through later odds; their archive context is frozen when the filing is sent, not recomputed on reply day. Court history resets with a new run and persists through save/load.

### 7.1 Interactive Covert Actions
Two playable vertical slices now share one engine contract:

- **Redvale archive lock:** a three-attempt paperclip challenge gives qualitative feedback without
  exposing the hidden target. Opening it grants +12% to that file's later risky legal options.
- **NimbusHost service bypass:** three visible timing rings rotate at different deterministic speeds.
  The player stops each marker inside its amber isolation window; one miss alerts security. Aligning
  all three prints the patch ledger and grants +12% to the Aldergate file's later risky legal options.
- **Procedural backup preservation:** the twelfth generator template can offer either board type on
  later filings. This makes earned SNEAKY ranks reusable after the two hand-written actions without
  turning COVERT work into an always-available farm.

Neither action wins its lawsuit automatically. A broken pick or missed circuit moves to an explicit
heads-or-tails escape call. Escape preserves the case but consumes the route; capture poisons and
archives the case.

Targets, board geometry and coin face derive from `runSeed | caseId | actionId`, never the shared
gameplay RNG. Save schema v14 persists the exact challenge type, phase, attempts/circuit state,
timing checkpoint, identity and versioned SNEAKY/ENDURANCE snapshot. Static puzzle values are re-derived on load, while phase/state
invariants and the matching case marker are cross-validated. Only one action may be active. Future
minigames must keep this same contract: deterministic identity, one-shot completion, blocking modal,
no hidden result in UI, honest time/fatigue cost and strict save cross-validation.

### 7.2 Character Progression

Character LEVEL is independent from firm rank. XP thresholds are `0 / 50 / 120 / 210 / 320 / 450 /
600 / 780`; each gained level grants one point for the current career. SNEAKY improves both COVERT
board types (lock tolerance/attempts and Power Cut speed/window), while ENDURANCE reduces positive
work-generated fatigue after the scenario modifier. Scenario-native ranks do not consume points.

XP is written only at visible terminal/reveal points: instant case resolution, delayed REPLY,
delegated final handback, completed COVERT action and genuine crisis resolution. Hidden delayed
results, action starts/attempts, silent delegation returns, deadlines, favors, chores and purchases
award none. Progression consumes no shared RNG. New COVERT actions snapshot skills at start; skill
allocation is blocked while one is active. Schema v12 migrates older active puzzles with legacy rules
so their committed cost and exact board state do not change mid-action; the short-lived schema-11
late-work fatigue rule is upgraded without dropping its active checkpoint.

### 7.3 The Fraud — Identity Pressure

The Fraud's missing diploma becomes a stateful risk instead of a disconnected random death. Every
positive work interaction records the day's highest post-ENDURANCE FATIGUE. If that peak reaches 80,
one roll occurs only after all ordinary end-of-day terminal checks have cleared: 80–89 = 0.5%, 90–94
= 1.5%, 95–99 = 3%, 100 = 5%. Coffee can lower current fatigue but cannot launder the recorded peak.
A reload cannot reroll the checkpoint, and non-Fraud / sub-80 careers consume no extra gameplay RNG.

A hit schedules, but does not resolve, a fatigue-slip scene for the next playable morning. The random
hit never changes stats or ends the run. The player chooses a guaranteed nonlethal cover story or a
riskier technical/aggressive answer. Failed covers raise visible SUSPICION and schedule three identity
pressure stages: an alumni/faculty question, conflicting bar numbers, and a malpractice insurer asking
for primary-source proof of degree. Only a chosen risky failure at the final stage produces EXPOSED;
every stage retains a 100% BOLD/INFL-cost survival route.

`fraudRisk` persists suspicion, daily peak, the last checked day, slip/containment counters and the
exact pending `slip|inquiry` kind/day. Schema v14 strictly validates the state, canonical active
event and the exact-once pre-morning continuation. A due confrontation opens before ordinary morning
decay, rival/reply/roster effects; after the choice those effects resume once, even across reload.
Canonical scene rebuilding rejects marker/option tampering. Identity scenes grant no XP, so repeated
rare slips cannot become a progression farm.

## 8. Starting Scenarios (roguelike seeds)
Each run starts with a different hook:
- **The Fraud** — you never went to law school. Work-fatigue peaks of 80+ can cause a rare next-morning slip; failed cover stories escalate a visible three-stage identity inquiry. The random slip itself never exposes you.
- **The Debtor** — $180k student debt, payment due every N days. Miss one → game over. Pushes you toward money options.
- **The Legacy** — a name partner is your estranged parent. Influence is easier, Reputation is harsher (everyone assumes nepotism).

## 9. Terminology (all names are legally distinct, your honor)
Parson Henderson LLP · "the Denny Crane clause" · opposing firm **Snidely Fitch** · the copy-room guy who knows everything · "You just got LITT up" is trademarked, we say **"You've been HENDERED."**

## 10. Prototype Scope (v0.1 — this build)
IN: day timer, case queue with deadlines & deferral, multi-option choices with computed success %, Reputation/Boldness/Influence/Money, promotions, firing/game-over, 3 starting scenarios, delayed case responses, judge stats on court cases, simple crisis events, pixel UI.
OUT (later): NPC delegation, full relationship web, AI-generated cases, multiplayer, save games.

## 11. Later: AI-generated cases
Case files are plain JSON (`title, body, deadline, judge?, options[{text, baseChance, boldnessWeight, effects}]`). An LLM can generate these at runtime from a prompt template; the engine doesn't care where JSON comes from. Multiplayer (shared firm, competing associates) only makes sense after the day-cycle is server-authoritative.

## 12. Verified Balance Baseline (v19.9)

The deterministic career soak is the reference baseline for future tuning. It executes the real
engine through public player actions, separates policy RNG from game RNG, records source provenance
and can replay any suspicious seed action-for-action.

- **Coverage:** 3,520 careers across all five scenarios; Standard to 40 days and Endless to 50.
- **Integrity:** 252/252 extreme or suspicious replays matched; zero invariant failures.
- **Standard Technical route:** 315/320 wins, median Name Partner on day 10. This is the primary
  progression problem, but judge memory is not its cause: the +6 Technical memory cap appeared in
  only 2.5% of Standard Technical hearings.
- **Endless judge memory:** the v19.9 baseline found 58.2% of post-day-20 Technical hearings at
  the +6 cap. v19.13 resolves this with recent-weighted recall; see §14.
- **Endless FIRM:** normal Technical play produced no collapse in 11,039 post-partnership days.
  Even the destructive FIRM stress policy ended 301/315 post-partnership careers by firing and only
  six by FIRM collapse, so personal and business fail-state ordering needs an isolated experiment.
- **Queue health:** no run exceeded backlog 22 and no unbounded-growth signature appeared. Message
  state is capped at 80 while preserving live filings.

No gameplay balance constant changed while establishing this baseline. Full methodology, policy
limitations, suspicious seed replays and the proposed A/B roadmap are in
[`BALANCE_SOAK_REPORT.md`](BALANCE_SOAK_REPORT.md).

## 13. Name Partner Operations (v19.12)

The v19.9 baseline proved that the original Endless collapse rule was effectively dormant. The
live operating model is now:

- the roster begins at roughly 13 employees and costs `ceil(headcount / 10)` FIRM each morning;
- each employee attempts work on 30% of mornings;
- PERFORMANCE `-3..+4` produces a `50 + performance×8` percent win chance;
- a roster win restores +1 FIRM; a roster loss costs −2 FIRM;
- firing still costs −2 FIRM immediately, removes floor NPCs from delegation and creates lasting
  wrongful-termination heat.

This creates the intended management tradeoff: removing weak performers can improve future drift
and cross a payroll headcount boundary, but firing too quickly damages morale and adds lawsuits.
The collapse threshold remains 15. In the final 64-seed paired audit, competent management
collapsed in 3.4% of Name Partner careers and deliberately bad management in 12.5%, versus zero
for both under the old symmetric/no-overhead model. Save schema is unchanged because these are
derived rules, not new persistent fields.

## 14. Recent-Weighted Court Memory (v19.13)

Lifetime court history remains narrative truth, but it no longer acts as permanent probability
mass. Each judge persists at most 12 recent hearing events for save integrity; only the newest
three affect live odds:

- newest appearance: `×1`;
- previous appearance: `×0.35`;
- third appearance: `×0.15`;
- older appearances: career record and dialogue only, no live modifier.

The full-career legacy model and a Friday half-life model were tested on identical seeds. Friday
decay produced lower saturation but tied memory to an invisible calendar boundary. Rolling recall
was selected because players can repair or reinforce an impression through courtroom behavior.
In the final 640 Endless careers, total post-day-20 cap occupancy fell from 53.3% to 24.9%; the
Technical +6 cap fell 54.4%→26.8% and Aggressive −8 fell 53.1%→13.8%. Win cadence remained stable.

Save schema v6 migrates aggregate-only v3–v5 records by preserving all lifetime counters and using
the last known style/result/day as the initial active-recall event. Event order, enum values, day
bounds, counter consistency, tail consistency and the 12-event limit are validated on load.
