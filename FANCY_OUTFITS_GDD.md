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

- Promotion when Influence crosses a threshold **and** a promotion event fires.
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

Delegation unlocks at Senior Associate: hand a case to an NPC, their traits + relationship decide the outcome. You eat the consequences either way.

## 6. Crisis Events
Random firm-level drama in the Suits mold — e.g. a Louis-type partner maneuvering behind a Harvey-type's back, a merger threat, a mole leaking files. Crises:
- interrupt the day with forced choices (pick a side, stay neutral, exploit it);
- check NPC traits (a Traitor ally flips, a Brave one shields you);
- shift Influence/Reputation in big chunks. High-risk, high-reward politics.

## 7. Judges
Each courtroom case draws a judge with stats:
- **Temper** — low tolerance for aggressive options (bluff penalty).
- **By-the-book** — rewards technically correct interpretations, punishes theatrics.
- **Corruptible** — opens a special (very risky) option.
Judge stats are visible on the case file, so reading the file matters twice.

## 8. Starting Scenarios (roguelike seeds)
Each run starts with a different hook:
- **The Fraud** — you never went to law school. Certain events can expose you; some options are "too risky for someone with your secret."
- **The Debtor** — $180k student debt, payment due every N days. Miss one → game over. Pushes you toward money options.
- **The Legacy** — a name partner is your estranged parent. Influence is easier, Reputation is harsher (everyone assumes nepotism).

## 9. Terminology (all names are legally distinct, your honor)
Parson Henderson LLP · "the Denny Crane clause" · opposing firm **Snidely Fitch** · the copy-room guy who knows everything · "You just got LITT up" is trademarked, we say **"You've been HENDERED."**

## 10. Prototype Scope (v0.1 — this build)
IN: day timer, case queue with deadlines & deferral, multi-option choices with computed success %, Reputation/Boldness/Influence/Money, promotions, firing/game-over, 3 starting scenarios, delayed case responses, judge stats on court cases, simple crisis events, pixel UI.
OUT (later): NPC delegation, full relationship web, AI-generated cases, multiplayer, save games.

## 11. Later: AI-generated cases
Case files are plain JSON (`title, body, deadline, judge?, options[{text, baseChance, boldnessWeight, effects}]`). An LLM can generate these at runtime from a prompt template; the engine doesn't care where JSON comes from. Multiplayer (shared firm, competing associates) only makes sense after the day-cycle is server-authoritative.
