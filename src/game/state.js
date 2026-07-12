// Single mutable game state `S` + a minimal subscription store.
// Engine functions mutate S directly, then call notify(); React components
// subscribe via useGame() and re-render. No framework state library.
import { DAY_HOURS, PRICES, FIRM_START } from "./constants.js";
import { settings } from "./settings.js";
import { rnd, rand } from "./utils.js";
import { buildClientPool } from "./clients.js";

const NEMESES=["Miles Sorren","Tripp Vanderbilt III","Ashley Kang","Bradford Lowe"];

export let S=null; // null until a scenario is picked on the start screen
export function setS(v){ S=v; }

let version=0;
const listeners=new Set();
export function subscribe(fn){ listeners.add(fn); return ()=>listeners.delete(fn); }
export const getVersion=()=>version;
export function notify(){ version++; listeners.forEach(fn=>fn()); }

export function newState(scenario,difficulty){
  return {
    scenario, day:1, rank:0,
    // the fictional workday: hours remaining, overtime taken today, and how tired you are
    hours:settings.dayLen||DAY_HOURS, otHours:0, otToday:0, fatigue:0,
    coffeeToday:0,  // each cup helps less; the third one mostly vibrates
    npcStories:[],  // rel>=40 unlocks each colleague's story scene, once per run
    difficulty:difficulty||"easy", // easy | medium | hard | realistic — blurs INFO only, never the dice
    mode:"standard", dailyDate:null, // standard | ironman | endless | daily (set by startGame)
    endlessWon:false, runRecorded:false, // endless: win once, keep billing; stats recorded once per run
    seed:Math.floor(rand()*1e9), // per-run seed so odds ranges are stable but not centered
    rep:50, bold:40, inf:10, firm:FIRM_START,
    buyinPaid:false, buyinHinted:false, // rank 2->3 needs the partnership buy-in
    // Name Partner endgame: the roster you manage, and the fired suing you back
    roster:null, fireHeat:0, everFired:false, firedNames:[],
    // the client book: parody brands, signed from a per-run shuffled pool
    clients:[], clientPool:buildClientPool(),
    money: scenario==="debtor" ? 3000 : 1500,
    debtDue: scenario==="debtor" ? 3 : null,
    suitCost:PRICES.suit, // each suit is fancier and pricier than the last
    inbox:[], pool:[], usedCrises:[], openCase:null, npcs:[],
    followups:[], // multi-stage cases waiting to land: {day, case}
    weekStart:{inf:10, rep:50}, weekMissed:0, // Friday review baseline (reset every WEEK_LEN days)
    // the rival associate: gains INF nightly and from YOUR failures; name partner before you = game over
    nemesis:{name:rnd(NEMESES), inf:10, rank:0},
    marvBribes:0, // Marv remembers who pays — his lines and gifts depend on it
    // per-run ledger for the end-of-run breakdown
    runStats:{safe:0,bluffW:0,bluffL:0,techW:0,techL:0,deleg:{},bribeTry:0,bribeW:0,favorHelp:0,favorNo:0,miss:0,crises:0,fired:0},
    // daily objective ("close 2 files today") + per-day counters feeding it
    objective:null, today:{resolved:0,wins:0,safeUsed:0,aggWin:0,delegated:0,moneyGained:0},
    archive:[], // every resolved case: {day,title,play,style,win,note,via}
    dailyLog:[], logEntries:[], over:false,
    // UI state (pause is DERIVED from these — see isPaused() in engine.js)
    infoOpen:false, event:null, summary:null, flash:null, userPaused:false, settingsOpen:false, rosterOpen:false, archiveOpen:false,
    // office character: "arriving" | "working" | "leaving" (leaving also freezes the clock)
    charAnim:"arriving", leaving:false,
    sceneRank:null, // during a promotion walk the scene briefly keeps the OLD office
    shakeSeq:0,     // bumped on failures → App shakes the screen (if enabled in settings)
  };
}
