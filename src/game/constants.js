// All difficulty/economy tuning lives here (see CLAUDE.md §9).
export const RANKS=["Junior Associate","Senior Associate","Junior Partner","Senior Partner","NAME PARTNER"];
export const RANK_REQ=[35,60,85,95]; // influence needed for next rank (95: the INF cap is 100, one bad day shouldn't wall off the finale)
export const INF_EARN=0.6;   // global multiplier on case INF rewards (balance v15.1: wins pile up too fast at 1.0)
export const INF_DECAY=[1,1,2,2,2]; // nightly INF fade by rank — influence evaporates upward
export const DAY_HOURS=8;          // the fictional workday: 09:00 -> 17:00
export const TIER_HOURS=[1,2,3];   // resolving a file costs hours by complexity (tier)
export const DELEGATE_HOURS=.5;    // handing a file off is quick
export const OVERTIME_HOURS=2;     // one overtime block
export const OVERTIME_FATIGUE=12;  // ...and what it does to you
export const LATE_FATIGUE=5;       // extra fatigue PER HOUR a job runs past quitting time
// exhaustion hazard: above FATIGUE_DANGER every worked hour risks a clumsy
// incident — a boss sends you home (REP/INF loss, day over). Per-hour odds:
// (fatigue-75)*4+10 → 30% at 80, 70% at 90, CERTAIN at 100.
export const FATIGUE_DANGER=75;
export const SENTHOME_REP=-6, SENTHOME_INF=-4;
export const FATIGUE_REST=18;      // overnight recovery (+3 per unspent hour — leave early, rest more)
// careful play is SLOW play: hour cost multipliers by approach (v1.6)
export const SAFE_HOURS_MULT=1.5, TECH_HOURS_MULT=1.25;
export const COFFEE_RELIEF=14, COFFEE_FALLOFF=6, COFFEE_MIN=2; // cup 1: -14, cup 2: -8, then -2 and jitters
export const REP_FIRED=20;
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
// firing employees builds litigation heat: +FIRE_HEAT per firing (more for a
// voted-out senior), decays x HEAT_DECAY nightly, but never below HEAT_MIN
// once you've fired anyone — ex-employees have long memories.
export const FIRE_HEAT=9, FIRE_HEAT_SENIOR=16, HEAT_DECAY=0.93, HEAT_MIN=1;
// localStorage keys (bump the suffix if the save shape changes)
export const SAVE_KEY="fo_save_v1";
export const STATS_KEY="fo_stats_v1";
