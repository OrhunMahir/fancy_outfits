// All difficulty/economy tuning lives here (see CLAUDE.md §9).
export const RANKS=["Junior Associate","Senior Associate","Junior Partner","Senior Partner","NAME PARTNER"];
export const RANK_REQ=[30,55,80,100]; // influence needed to be eligible for next rank
export const DAY_SECONDS=75;
export const REP_FIRED=20;
export const DEADLINE_PENALTY=-9;
// rank-scaled stakes: rewards grow, failures grow FASTER (indexed by rank at draw time)
export const STAKE_REWARD=[1,1.15,1.3,1.45,1.6];
export const STAKE_PENALTY=[1,1.3,1.6,1.9,2.2];
// money sinks
export const PRICES={suit:1200, detective:900, marv:600};
// localStorage keys (bump the suffix if the save shape changes)
export const SAVE_KEY="fo_save_v1";
export const STATS_KEY="fo_stats_v1";
