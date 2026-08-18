// All difficulty/economy tuning lives here (see CLAUDE.md §9).
export const RANKS=["Junior Associate","Senior Associate","Junior Partner","Senior Partner","NAME PARTNER"];
export const RANK_REQ=[35,60,85,95]; // influence needed for next rank (95: the INF cap is 100, one bad day shouldn't wall off the finale)
export const INF_EARN=0.6;   // global multiplier on case INF rewards (balance v15.1: wins pile up too fast at 1.0)
export const DELEGATE_CAP=1; // one handoff per day: delegation is relief, not a second full docket
export const INF_DECAY=[1,1,2,2,2]; // nightly INF fade by rank — influence evaporates upward
export const DAY_HOURS=8;          // the fictional workday: 09:00 -> 17:00
export const TIER_HOURS=[1,2,3];   // resolving a file costs hours by complexity (tier)
export const DELEGATE_HOURS=.5;    // handing a file off is quick
export const OVERTIME_HOURS=2;     // one overtime block
export const OVERTIME_LIMIT=2;     // two late-night blocks, then the building closes
export const OVERTIME_FATIGUE=12;  // first block
export const OVERTIME_FATIGUE_STEP=6; // second block costs 18 fatigue
export const LATE_FATIGUE=5;       // extra fatigue PER HOUR a job runs past quitting time
// exhaustion hazard: above FATIGUE_DANGER every worked hour risks a clumsy
// incident — a boss sends you home (REP/INF loss, day over). Per-hour odds:
// (fatigue-75)*4+10 → 30% at 80, 70% at 90, CERTAIN at 100.
export const FATIGUE_DANGER=75;
export const SENTHOME_REP=-6, SENTHOME_INF=-4;
export const FATIGUE_REST=18;      // overnight recovery (+3 per unspent hour — leave early, rest more)
// careful play is SLOW play: hour cost multipliers by approach (v1.6)
export const SAFE_HOURS_MULT=1.75, TECH_HOURS_MULT=1.25;
// Safe plays never fail — that contract is untouchable. What they can lose is
// their PAYOFF: leaning on the quiet settlement over and over reads as coasting,
// so each consecutive safe resolution drains more Boldness and returns less
// Influence. One risky play anywhere resets the streak. Paired soak cohorts
// (v1.9.21) showed this leaves normal careers untouched while costing the
// always-settle career a third of its Influence; 2.0x safe hours was rejected
// as a disguised global difficulty change.
export const SAFE_COASTING=true;
// A flat step, not a multiplier: a safe file pays about 1 Influence after the
// draw-time scalers, so a percentage cut would round away to nothing.
export const SAFE_STREAK_CAP=4, SAFE_STREAK_BOLD=2, SAFE_STREAK_INF_STEP=1;
export const TECH_INF_MULT=.70, AGG_INF_MULT=1.25; // technical builds trust; aggression climbs faster
// Judges keep a bounded transcript. Live odds use the three most recent
// appearances with sharply fading weight; lifetime W/L counters remain UI-only.
export const JUDGE_MEMORY_WINDOW=3, JUDGE_MEMORY_EVENT_LIMIT=12;
export const JUDGE_MEMORY_WEIGHTS=Object.freeze([1,.35,.15]);
export const JUDGE_MEMORY_WEEKLY_DECAY=.5; // A/B control: halve older impressions each firm week
export const COFFEE_RELIEF=14, COFFEE_FALLOFF=6, COFFEE_LIMIT=2; // cup 1: -14, cup 2: -8, then stop
export const REP_FIRED=20;
// A proven closer gets one last conversation instead of an immediate firing.
// The protection is earned before the fatal aggressive play, consumed once,
// and burns Boldness so it cannot become a free reckless-play loop.
export const FINAL_WARNING_BOLD=70, FINAL_WARNING_BLUFF_WINS=3;
export const FINAL_WARNING_REP=28, FINAL_WARNING_BOLD_COST=15;
export const DEADLINE_PENALTY=-9;
// rank-scaled stakes: rewards grow, failures grow FASTER (indexed by rank at draw time)
export const STAKE_REWARD=[1,1.15,1.3,1.45,1.6];
export const STAKE_PENALTY=[1,1.3,1.6,1.9,2.2];
// weekly rhythm: every WEEK_LEN-th day is Friday — the partners review your week
export const WEEK_LEN=5;
export const REVIEW_GOOD=10; // week score >= this → praise (+4 REP +4 INFL)
export const REVIEW_BAD=0;   // week score <= this → scolding (-4 REP)
// money sinks
export const PRICES={suit:1200, detective:900, marv:600, coffee:120};
// office decor: one-time purchases, visible in the scene, small passive perks
export const DECOR={
  fish:    {cost:800,  name:"AQUARIUM",        desc:"Fish don't bill. Watching them: +3 overnight rest."},
  art:     {cost:600,  name:"REAL ART",        desc:"Clients notice taste. +1 INFL every Friday."},
  espresso:{cost:1500, name:"ESPRESSO MACHINE",desc:"Your own. Cups cost $40 instead of $120."},
  monitor: {cost:700,  name:"SECOND MONITOR",  desc:"Two screens, fewer alt-tabs: every play -0.25h."},
};
// Junior Partner -> Senior Partner requires buying into the partnership
export const BUYIN_COST=5000;
// firm health (4th stat). Collapse only threatens a sitting Name Partner.
export const FIRM_START=62;
export const FIRM_COLLAPSE=15;
// Name Partner operations: each employee acts on 30% of mornings. PERFORMANCE
// changes their win chance; a loss costs more than a routine win restores.
// Payroll scales with headcount so trimming a weak roster can reduce overhead.
export const ROSTER_ACTIVITY=.30, ROSTER_WIN_GAIN=1, ROSTER_LOSS_COST=2;
export const FIRM_PAYROLL_DIVISOR=10; // ceil(headcount / 10) FIRM each morning
// STANDARD career confidence: the firm affects client trust and partner gates.
export const FIRM_CRITICAL=25, FIRM_STABLE=50, FIRM_THRIVING=75;
export const FIRM_RANK_REQ=[0,40,45,50]; // current rank -> FIRM needed for the next promotion
export const FIRM_PLAN_GAIN=10, FIRM_PLAN_HOURS=1.5, FIRM_PLAN_FATIGUE=6, FIRM_PLAN_COOLDOWN=5;
// Once a Senior Partner has filled the normal 100-point Influence bar, further
// earned Influence becomes review momentum instead of disappearing. Enough
// momentum can trigger one early Name Partner decision on a later morning;
// the wait prevents a same-day rank cascade and preserves the weekly rhythm.
export const EXCEPTIONAL_REVIEW_THRESHOLD=36, EXCEPTIONAL_REVIEW_WAIT=2, EXCEPTIONAL_REVIEW_MIN_REP=30;
// firing employees builds litigation heat: +FIRE_HEAT per firing (more for a
// voted-out senior), decays x HEAT_DECAY nightly, but never below HEAT_MIN
// once you've fired anyone — ex-employees have long memories.
export const FIRE_HEAT=9, FIRE_HEAT_SENIOR=16, HEAT_DECAY=0.93, HEAT_MIN=1;
// EVIDENCE TIMELINE: a rare prep challenge that fires AFTER you commit to a
// risky play on a case whose text carries a datable chronology. It never wins
// or loses the case by itself — it only moves that play's odds, so reading the
// file stays the edge. The board is drawn from an authored event pool so the
// same case asks a different chronology in a different run.
export const TIMELINE_TRIGGER=25;          // % chance on an eligible risky play
export const TIMELINE_CARDS=4;             // events on the board (5 from rank 2)
export const TIMELINE_CARDS_SENIOR=5;
export const TIMELINE_SENIOR_RANK=2;       // rank at which the board grows
export const TIMELINE_EDGE_WIN=12;         // exact chronology: this play gets +12%
export const TIMELINE_EDGE_LOSS=-10;       // muddled chronology: -10%
export const TIMELINE_EDGE_DECLINE=-4;     // walked in unprepared: lighter than a miss, never free
export const TIMELINE_FAIL_REP=-2;         // a light mark, never a lost case
export const TIMELINE_HOURS=.5, TIMELINE_FATIGUE=3; // prep costs, paid either way
// The storage key stays stable; ordered migrations use the embedded schema.
export const SAVE_SCHEMA_VERSION=19;
export const SAVE_LOG_LIMIT=200, SAVE_ARCHIVE_LIMIT=200;
export const INBOX_MESSAGE_LIMIT=80; // notifications are history, not permanent case files
export const SAVE_KEY="fo_save_v1";
export const STATS_KEY="fo_stats_v1";
