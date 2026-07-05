// Single mutable game state `S` + a minimal subscription store.
// Engine functions mutate S directly, then call notify(); React components
// subscribe via useGame() and re-render. No framework state library.
import { DAY_SECONDS } from "./constants.js";

export let S=null; // null until a scenario is picked on the start screen
export function setS(v){ S=v; }

let version=0;
const listeners=new Set();
export function subscribe(fn){ listeners.add(fn); return ()=>listeners.delete(fn); }
export const getVersion=()=>version;
export function notify(){ version++; listeners.forEach(fn=>fn()); }

export function newState(scenario){
  return {
    scenario, day:1, secs:DAY_SECONDS, rank:0,
    rep:50, bold:40, inf:10,
    money: scenario==="debtor" ? 3000 : 1500,
    debtDue: scenario==="debtor" ? 3 : null,
    inbox:[], pool:[], usedCrises:[], openCase:null, npcs:[],
    dailyLog:[], logEntries:[], over:false,
    // UI state (pause is DERIVED from these — see isPaused() in engine.js)
    infoOpen:false, event:null, summary:null, flash:null, userPaused:false,
    // office character: "arriving" | "working" | "leaving" (leaving also freezes the clock)
    charAnim:"arriving", leaving:false,
  };
}
