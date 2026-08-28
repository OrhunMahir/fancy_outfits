/* DEV ONLY — never reaches a player.
   Everything here is behind `import.meta.env.DEV` at the call site, so Vite
   drops the whole module from `npm run build`. It exists so a change to a
   minigame can be looked at in two clicks instead of being hunted for across a
   twenty-day career.

   Rule it keeps: it drives the REAL engine functions. Nothing here reimplements
   game rules, so what you see in the panel is what a player would get. */
import { S, notify } from "./state.js";
import { createBarHeat } from "./ethics.js";
import { buildPool } from "./content.js";
import { genCaseFrom, TEMPLATE_COUNT } from "./casegen.js";
import * as engine from "./engine.js";

export const DEV_TEMPLATE_COUNT=TEMPLATE_COUNT;
export const devCaseIds=()=>buildPool().map(c=>({id:c.id,title:c.title,tier:c.tier||0}));

/* Anything that puts a new filing on the desk must first close whatever board
   is open. Otherwise `choose()` refuses (a challenge is already live), the old
   board stays on screen, and its case is gone from the inbox — so every button
   in it silently does nothing. That reads as a freeze. */
export function devClearBoard(){
  if(!S) return;
  S.actionChallenge=null;
  for(const c of S.inbox||[]){
    if(!c||c.msg) continue;
    delete c.actionInProgress;
    delete c.timelineInProgress;
    delete c.objectionInProgress;
  }
  notify();
}

const desk=(c,{hours=8}={})=>{
  devClearBoard();
  S.inbox=[c]; S.openCase=c; S.hours=hours; S.event=null; S.summary=null; S.pendingSummary=null;
  notify();
  return c;
};

/* Put a specific filing on the desk, hand-written or procedural. */
export function devSpawnCase(id){
  const raw=buildPool().find(c=>c.id===id);
  return raw?desk(engine.instantiateCase(raw)):null;
}
export function devSpawnTemplate(index){
  return desk(engine.instantiateCase(genCaseFrom(index)));
}

/* Open a board directly. Each one is reached the way a player reaches it —
   the right filing, the right option — so the board is dealt for real. */
const BOARD_HOSTS={
  lockpick:{case:"redvale",pick:c=>c.opts.find(o=>o.action?.type==="lockpick")},
  power_cut:{case:"breach",pick:c=>c.opts.find(o=>o.action?.type==="power_cut")},
  contradiction:{case:"court2",pick:c=>c.opts.find(o=>o.action?.type==="contradiction")},
  redaction:{case:"nda",pick:c=>c.opts.find(o=>o.action?.type==="redaction")},
  /* The Vance file carries BOTH a chronology and a deposition, and choose()
     flips between them — so a host that wants one has to take the other off the
     file first, or the panel gives you whichever board the coin felt like. */
  timeline:{case:"depo",pick:c=>c.opts.find(o=>o.style==="technical"),force:{timelineTrigger:100},strip:["objection"]},
  objection:{case:"court1",pick:c=>c.opts.find(o=>o.style==="technical"),force:{objectionTrigger:100}},
  deposition:{case:"depo",pick:c=>c.opts.find(o=>o.style==="technical"),force:{objectionTrigger:100},strip:["timeline"]},
};

export function devOpenBoard(kind,{sneaky=0,reroll=true}={}){
  const host=BOARD_HOSTS[kind];
  if(!host||!S) return null;
  /* A board is dealt from runSeed|caseId|actionId, so opening the same file
     twice in one career is SUPPOSED to give the same board. That makes the dev
     panel look like nothing ever changes, so it rolls a fresh run seed each
     time unless you ask it not to. */
  if(reroll) S.seed=(S.seed+0x9e3779b1)>>>0;
  if(sneaky) S.progression={...S.progression,skills:{...S.progression.skills,sneaky}};
  const c=devSpawnCase(host.case);
  if(!c) return null;
  for(const key of host.strip||[]) delete c[key];
  const o=host.pick(c);
  if(!o) return null;
  if(host.force) engine.setBalanceExperiment(host.force);
  engine.choose(c,o);
  if(host.force) engine.setBalanceExperiment(null);
  return S.actionChallenge;
}

/* Trials only appear on files that carry one, and only two do so far. */
export function devOpenTrial(caseId="court2"){
  const c=devSpawnCase(caseId);
  if(!c) return null;
  const o=c.opts.find(x=>x.trial);
  if(!o) return null;
  engine.choose(c,o);
  notify();
  return S.trial;
}

/* The bar heat is hidden from the player on purpose, so the only way to see a
   letter in development is to ask for one directly. */
export function devOpenBarLetter(stage=1){
  if(!S) return null;
  // A save from before the bar existed has no file; make one rather than no-op.
  if(!S.barHeat) S.barHeat=createBarHeat();
  // Anything already open would block the letter, so clear the desk first.
  S.trial=null; S.trialResult=null; S.actionChallenge=null; S.summary=null; S.benchOpen=false;
  const bar=S.barHeat;
  const want=Math.max(1,Math.min(3,Math.trunc(stage)||1));
  bar.caught=Math.max(bar.caught,4); bar.violations=Math.max(bar.violations,bar.caught);
  // runBarTick() decays first, so the letter has to be paid for twice.
  bar.heat=[0,26,54,80][want]+1;
  bar.stage=want-1; bar.pendingKind=null; bar.pendingDay=0;
  S.event=null;
  engine.runBarTick();
  notify();
  return S.event;
}

/* The coin only appears after a covert job fails, so fail one on purpose.
   `face` decides which side is already waiting, so both endings are reachable. */
export function devOpenCoin(face){
  if(!S) return null;
  let guard=0;
  while(guard++<40){
    const ch=devOpenBoard("lockpick");
    if(!ch) return null;
    engine.setLockTension(S.actionChallenge.breakAt); // snap the last pick
    const now=S.actionChallenge;
    if(now&&now.phase==="coin_call"&&(!face||now.coinFace===face)) return now;
    devClearBoard();
  }
  return S.actionChallenge;
}

export function devSetStats(patch){
  if(!S) return;
  for(const [k,v] of Object.entries(patch)){
    const n=Number(v);
    if(Number.isFinite(n)) S[k]=n;
  }
  notify();
}

export function devSetSneaky(rank){
  if(!S) return;
  S.progression={...S.progression,skills:{...S.progression.skills,sneaky:Math.max(0,Math.min(5,rank))}};
  notify();
}

/* What the board is hiding, so an effect can be judged against the truth. */
export function devRevealChallenge(){
  const ch=S&&S.actionChallenge;
  if(!ch) return null;
  if(ch.type==="lockpick")
    return {type:ch.type,give:ch.give,tolerance:ch.tolerance,breakAt:ch.breakAt,
      hintLead:ch.hintLead,hintTail:ch.hintTail,tension:ch.tension,picks:ch.attemptsLeft};
  if(ch.type==="timeline") return {type:ch.type,solution:ch.solution.join(" → ")};
  if(ch.type==="contradiction")
    return {type:ch.type,pairs:ch.solution.map(p=>p.statement+" ↔ "+p.document).join(" | ")};
  if(ch.type==="redaction")
    return {type:ch.type,privileged:ch.pages.filter(p=>p.priv).map(p=>p.id).join(", ")};
  if(ch.type==="objection")
    return {type:ch.type,improper:ch.lines.filter(l=>l.bad).map(l=>l.id+" ("+l.tag+")").join(", ")};
  if(ch.type==="power_cut")
    return {type:ch.type,rings:ch.rings.map(r=>`${r.target}°±${r.tolerance} @${r.speed}°/s`).join(" | ")};
  return {type:ch.type,coinFace:ch.coinFace};
}
