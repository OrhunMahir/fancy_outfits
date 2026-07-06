// Single mutable game state `S` + a minimal subscription store.
// Engine functions mutate S directly, then call notify(); React components
// subscribe via useGame() and re-render. No framework state library.
import { DAY_SECONDS, PRICES } from "./constants.js";

export let S=null; // null until a scenario is picked on the start screen
export function setS(v){ S=v; }

let version=0;
const listeners=new Set();
export function subscribe(fn){ listeners.add(fn); return ()=>listeners.delete(fn); }
export const getVersion=()=>version;
export function notify(){ version++; listeners.forEach(fn=>fn()); }

export function newState(scenario,difficulty){
  return {
    scenario, day:1, secs:DAY_SECONDS, rank:0,
    difficulty:difficulty||"easy", // easy | medium | hard | realistic — blurs INFO only, never the dice
    seed:Math.floor(Math.random()*1e9), // per-run seed so odds ranges are stable but not centered
    rep:50, bold:40, inf:10,
    money: scenario==="debtor" ? 3000 : 1500,
    debtDue: scenario==="debtor" ? 3 : null,
    suitCost:PRICES.suit, // each suit is fancier and pricier than the last
    inbox:[], pool:[], usedCrises:[], openCase:null, npcs:[],
    followups:[], // multi-stage cases waiting to land: {day, case}
    weekStart:{inf:10, rep:50}, weekMissed:0, // Friday review baseline (reset every WEEK_LEN days)
    dailyLog:[], logEntries:[], over:false,
    // UI state (pause is DERIVED from these — see isPaused() in engine.js)
    infoOpen:false, event:null, summary:null, flash:null, userPaused:false,
    // office character: "arriving" | "working" | "leaving" (leaving also freezes the clock)
    charAnim:"arriving", leaving:false,
  };
}
