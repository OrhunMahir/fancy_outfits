// All difficulty/economy tuning lives here (see CLAUDE.md §9).
export const RANKS=["Junior Associate","Senior Associate","Junior Partner","Senior Partner","NAME PARTNER"];
export const RANK_REQ=[30,55,80,95]; // influence needed for next rank (95: the INF cap is 100, one bad day shouldn't wall off the finale)
export const DAY_SECONDS=75;
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
export const PRICES={suit:1200, detective:900, marv:600};
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
