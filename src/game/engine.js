// Game engine: every state mutation and flow function lives here.
// Rules (CLAUDE.md §5): stats change ONLY through apply(); after mutating S,
// call notify() so React re-renders. Pause is derived — no S.paused flag.
import { S, setS, notify, newState } from "./state.js";
import { RANKS, RANK_REQ, INF_EARN, INF_DECAY, DELEGATE_CAP, DAY_HOURS, TIER_HOURS, DELEGATE_HOURS,
         OVERTIME_HOURS, OVERTIME_LIMIT, OVERTIME_FATIGUE, OVERTIME_FATIGUE_STEP, LATE_FATIGUE,
         FATIGUE_REST, SAFE_HOURS_MULT, TECH_HOURS_MULT, TECH_INF_MULT, AGG_INF_MULT,
         SAFE_COASTING, SAFE_STREAK_CAP, SAFE_STREAK_BOLD, SAFE_STREAK_INF_STEP,
         JUDGE_MEMORY_WINDOW, JUDGE_MEMORY_EVENT_LIMIT, JUDGE_MEMORY_WEIGHTS, JUDGE_MEMORY_WEEKLY_DECAY,
         COFFEE_RELIEF, COFFEE_FALLOFF, COFFEE_LIMIT, FATIGUE_DANGER, SENTHOME_REP, SENTHOME_INF,
         REP_FIRED, FINAL_WARNING_BOLD, FINAL_WARNING_BLUFF_WINS, FINAL_WARNING_REP, FINAL_WARNING_BOLD_COST, DEADLINE_PENALTY,
         STAKE_REWARD, STAKE_PENALTY, PRICES, DECOR, SAVE_SCHEMA_VERSION, SAVE_LOG_LIMIT, SAVE_ARCHIVE_LIMIT, INBOX_MESSAGE_LIMIT, SAVE_KEY, STATS_KEY,
         WEEK_LEN, REVIEW_GOOD, REVIEW_BAD, BUYIN_COST, FIRM_COLLAPSE,
         EXCEPTIONAL_REVIEW_THRESHOLD, EXCEPTIONAL_REVIEW_WAIT, EXCEPTIONAL_REVIEW_MIN_REP,
         ROSTER_ACTIVITY, ROSTER_WIN_GAIN, ROSTER_LOSS_COST, FIRM_PAYROLL_DIVISOR,
         FIRM_CRITICAL, FIRM_STABLE, FIRM_THRIVING, FIRM_RANK_REQ,
         FIRM_PLAN_GAIN, FIRM_PLAN_HOURS, FIRM_PLAN_FATIGUE, FIRM_PLAN_COOLDOWN,
         FIRE_HEAT, FIRE_HEAT_SENIOR, HEAT_DECAY, HEAT_MIN,
         TIMELINE_TRIGGER, TIMELINE_CARDS, TIMELINE_CARDS_SENIOR, TIMELINE_SENIOR_RANK,
         TIMELINE_EDGE_WIN, TIMELINE_EDGE_LOSS, TIMELINE_EDGE_DECLINE, TIMELINE_FAIL_REP, TIMELINE_HOURS, TIMELINE_FATIGUE } from "./constants.js";
import { clamp, rnd, rand, shuffle, hash, setSeed, clearSeed, getRngState, setRngState } from "./utils.js";
import { LOCK_MIN, LOCK_MAX, POWER_RING_COUNT, createLockpickChallenge, clampLockPosition, tryLockpick, callCoin,
         createPowerCutChallenge, advancePowerCut, stopPowerCut, powerAngleAt, powerAngleDistance,
         createTimelineChallenge, moveTimelineCard, submitTimeline,
         CONTRA_ATTEMPTS, CONTRA_STATEMENTS, createContradictionChallenge, selectContradictionStatement,
         pairContradiction, concedeContradiction } from "./minigames.js";
import { SFX, startAmbience, stopAmbience, applyBgmVolume } from "./sound.js";
import { settings, setSetting } from "./settings.js";
import { buildPool, JUDGES, crises, SCENARIOS, buildWeekend } from "./content.js";
import { genCase } from "./casegen.js";
import { buildNpcs, buildRoster, buildDemand, buildStory, bossAbove, delegationChance, relNpc, buildFavor, DELEGATE_WIN_TXT, DELEGATE_FAIL_TXT } from "./npcs.js";
import { buildLawsuit, buildBigMatter } from "./casegen.js";
import { CLIENT_CAP, CLIENT_NAMES, makeClient, buildGlobalEvent, buildDinnerEvent, PARTNERS } from "./clients.js";
import { ACHIEVEMENTS, unlock } from "./achievements.js";
import { CASE_XP, COVERT_XP, CRISIS_XP, DELEGATED_XP, MAX_SKILL, SKILL_IDS, SKILLS,
         addXp, allocateSkill, applyEnduranceToWorkFatigue, createProgression,
         enduranceFatigueMultiplier, getSkillRank, progressionInfo as getProgressionInfo,
         progressionValidationError, sneakyModifiers, startingSkillsFor } from "./progression.js";
import { FRAUD_RISK_VERSION, buildFraudAuditEvent, buildFraudInquiryEvent, buildFraudSlipEvent,
         createFraudRisk, createFraudRiskV1, fraudEventValidationError, fraudRiskInfo as getFraudRiskInfo,
         fraudRiskV1ValidationError, fraudRiskValidationError, fraudSlipChance } from "./fraud.js";
export { buildDemand, buildBigMatter }; // re-export: dev console + tests poke these directly

let flashSeq=0;
let terminalClearDone=false;
// Local, test-only balance hooks. Production never sets these, so the shipped
// rules remain the baseline while the soak runner can execute paired A/B runs
// through the real engine instead of copying formulas.
let balanceProbe=null;
let balanceExperiment=null;
export function setBalanceProbe(fn){ balanceProbe=typeof fn==="function"?fn:null; }
export function setBalanceExperiment(config){
  balanceExperiment=config&&typeof config==="object"?config:null;
}
export const delegationDailyLimit=()=>balanceExperiment&&Number.isSafeInteger(balanceExperiment.delegateCap)?
  clamp(balanceExperiment.delegateCap,0,10):DELEGATE_CAP;
const weeklyPromotionsEnabled=()=>balanceExperiment&&typeof balanceExperiment.weeklyPromotion==="boolean"?
  balanceExperiment.weeklyPromotion:true;
const exceptionalReviewConfig=()=>{
  if(balanceExperiment&&balanceExperiment.exceptionalReview===false) return null;
  const test=balanceExperiment&&balanceExperiment.exceptionalReview;
  return {
    threshold:test&&Number.isFinite(test.threshold)?Math.max(1,Math.round(test.threshold)):EXCEPTIONAL_REVIEW_THRESHOLD,
    wait:test&&Number.isFinite(test.wait)?Math.max(1,Math.round(test.wait)):EXCEPTIONAL_REVIEW_WAIT,
    minRep:test&&Number.isFinite(test.minRep)?clamp(Math.round(test.minRep),0,100):EXCEPTIONAL_REVIEW_MIN_REP,
  };
};
const finalWarningConfig=()=>{
  if(balanceExperiment&&balanceExperiment.finalWarning===false) return null;
  const test=balanceExperiment&&balanceExperiment.finalWarning;
  return {
    bold:test&&Number.isFinite(test.bold)?clamp(Math.round(test.bold),0,100):FINAL_WARNING_BOLD,
    wins:test&&Number.isFinite(test.wins)?Math.max(1,Math.round(test.wins)):FINAL_WARNING_BLUFF_WINS,
    rep:test&&Number.isFinite(test.rep)?clamp(Math.round(test.rep),REP_FIRED,100):FINAL_WARNING_REP,
    boldCost:test&&Number.isFinite(test.boldCost)?clamp(Math.round(test.boldCost),0,100):FINAL_WARNING_BOLD_COST,
  };
};

/* The clock stops whenever any overlay is up, the player hit PAUSE, or the
   character is walking out. Replaces the old S.paused flag. */
export const isPaused=()=>!!(S.infoOpen||S.event||S.summary||S.userPaused||S.settingsOpen||S.rosterOpen||S.archiveOpen||S.actionChallenge||S.leaving);
export const disrespected=()=>S.rep<30;
export function finalWarningInfo(){
  if(!S) return null;
  const cfg=finalWarningConfig();
  return cfg&&{used:!!S.finalWarningUsed,bold:cfg.bold,wins:cfg.wins,rep:cfg.rep,boldCost:cfg.boldCost};
}

/* STANDARD mode business confidence. Other modes keep their established
   balance; ENDLESS already makes FIRM lethal through payroll and collapse. */
export function firmCondition(value=S&&S.firm){
  const v=Number.isFinite(value)?value:0;
  if(v<FIRM_CRITICAL) return {id:"critical",label:"CRITICAL",prospect:-.04,walk:.10};
  if(v<FIRM_STABLE) return {id:"strained",label:"STRAINED",prospect:-.02,walk:.05};
  if(v<FIRM_THRIVING) return {id:"stable",label:"STABLE",prospect:0,walk:0};
  return {id:"thriving",label:"THRIVING",prospect:.02,walk:-.04};
}
export function clientConfidenceOdds(rep=S&&S.rep,mode=S&&S.mode,firm=S&&S.firm){
  const mod=mode==="standard"?firmCondition(firm):{prospect:0,walk:0};
  // Preserve the original client curve first, then let STANDARD FIRM move it.
  // Applying the modifier before the legacy cap made every high-REP band equal
  // and accidentally buffed DAILY / IRONMAN / ENDLESS by two percentage points.
  const baseImpress=clamp((rep-45)*.004,0,.14);
  const baseAcquisition=clamp((rep-50)*.0033,0,.12);
  return {
    impress:clamp(baseImpress+mod.prospect,0,.16),
    acquisition:clamp(baseAcquisition+mod.prospect,0,.14),
    walk:clamp(.12+(rep<30?.08:0)+mod.walk,.04,.30),
  };
}
export const promotionFirmRequirement=(rank=S&&S.rank,mode=S&&S.mode)=>mode==="standard"?(FIRM_RANK_REQ[rank]||0):0;
export const rosterWinChance=impact=>clamp(50+(Number.isFinite(impact)?impact:0)*8,0,100);
export const firmPayrollCost=(headcount=S&&S.roster?S.roster.length:0)=>headcount>0?Math.ceil(headcount/FIRM_PAYROLL_DIVISOR):0;
export function exceptionalReviewInfo(){
  const cfg=exceptionalReviewConfig();
  if(!S||!cfg||S.rank!==3||S.exceptionalReviewDay) return null;
  const earliest=(S.seniorPartnerDay||S.day)+cfg.wait;
  return {momentum:S.reviewMomentum||0,threshold:cfg.threshold,minRep:cfg.minRep,earliest,
    ready:(S.reviewMomentum||0)>=cfg.threshold&&S.rep>=cfg.minRep&&S.day>=earliest&&S.inf>=RANK_REQ[3]&&
      S.firm>=promotionFirmRequirement(3)};
}

/* ---------- judge memory: per-run, deterministic, visible before the roll ---------- */
const JUDGE_MEMORY_STYLES=["safe","aggressive","technical","bribe","neutral"];
const emptyJudgeMemory=()=>({seen:0,aggressiveW:0,aggressiveL:0,technicalW:0,technicalL:0,
  bribeW:0,bribeL:0,safe:0,neutralW:0,neutralL:0,lastStyle:null,lastWin:null,lastDay:0,recent:[]});
// Keep these pre-v3 display names forever: unopened legacy slots had no ids.
const LEGACY_JUDGE_IDS={
  "Hon. R. Ironwood":"ironwood", "Hon. C. Marsh":"marsh", "Hon. B. Pelt":"pelt",
  "Hon. D. Crane Jr.":"crane", "Hon. A. Whitlock":"whitlock",
  "Hon. M. Okonkwo":"okonkwo", "Hon. T. Fairway":"fairway",
};
const canonicalJudge=j=>{
  if(!j||j===true) return null;
  if(j.id!=null) return JUDGES.find(x=>x.id===j.id)||null; // stable id always wins over a conflicting name
  const legacyId=LEGACY_JUDGE_IDS[j.name];
  return JUDGES.find(x=>x.id===legacyId)||null;
};
export const judgeId=j=>canonicalJudge(j)?.id||null;
const judgeStyle=o=>o&&o.safe?"safe":JUDGE_MEMORY_STYLES.includes(o&&o.style)?o.style:"neutral";
const memoryFor=c=>{
  const id=judgeId(c&&c.judge);
  return id&&S&&S.judgeMemory&&S.judgeMemory[id]||null;
};
const judgeMemoryModel=()=>balanceExperiment&&["legacy","rolling","friday"].includes(balanceExperiment.judgeMemoryModel)?
  balanceExperiment.judgeMemoryModel:"rolling";
/* Two levers that price the safe route WITHOUT touching its 100% reliability:
   its hours (C) and its diminishing payoff when leaned on (A). Both ship off. */
const safeHoursMultiplier=()=>balanceExperiment&&Number.isFinite(balanceExperiment.safeHoursMult)?
  Math.max(1,balanceExperiment.safeHoursMult):SAFE_HOURS_MULT;
const safeCoastingEnabled=()=>balanceExperiment&&typeof balanceExperiment.safeCoasting==="boolean"?
  balanceExperiment.safeCoasting:SAFE_COASTING;
const recentJudgeEvents=m=>Array.isArray(m&&m.recent)?m.recent:[];
const memoryEventValue=(style,event)=>{
  if(event.style!==style) return 0;
  if(style==="aggressive") return event.win?-5:-6;
  if(style==="technical") return event.win?4:-3;
  if(style==="bribe") return -7;
  return 0;
};
const roundMemory=n=>n<0?-Math.round(-n):Math.round(n);
function rollingJudgeMemory(style,m){
  const recent=recentJudgeEvents(m).slice(-JUDGE_MEMORY_WINDOW).reverse();
  return roundMemory(recent.reduce((sum,event,index)=>sum+memoryEventValue(style,event)*(JUDGE_MEMORY_WEIGHTS[index]||0),0));
}
function fridayJudgeMemory(style,m){
  const week=Math.floor((((S&&S.day)||1)-1)/WEEK_LEN);
  return roundMemory(recentJudgeEvents(m).reduce((sum,event)=>{
    const eventWeek=Math.floor((event.day-1)/WEEK_LEN), age=Math.max(0,week-eventWeek);
    return sum+memoryEventValue(style,event)*Math.pow(JUDGE_MEMORY_WEEKLY_DECAY,age);
  },0));
}
/* Lifetime counters preserve the career transcript, but shipped odds use only
   three recent appearances: newest x1, previous x.35, third x.15. A safe or
   different style therefore cools an old pattern without deleting history.
   Pure arithmetic: DAILY RNG is untouched. */
export function judgeMemoryModifier(o,c){
  const m=memoryFor(c); if(!m) return 0;
  const style=judgeStyle(o);
  const model=judgeMemoryModel();
  let raw=0;
  if(model==="legacy"){
    if(style==="aggressive") raw=-(m.aggressiveW*5+m.aggressiveL*6);
    else if(style==="technical") raw=m.technicalW*4-m.technicalL*3;
    else if(style==="bribe") raw=-(m.bribeW+m.bribeL)*7;
  } else raw=model==="friday"?fridayJudgeMemory(style,m):rollingJudgeMemory(style,m);
  if(style==="aggressive"||style==="bribe") return clamp(raw,-8,0);
  if(style==="technical") return clamp(raw,-6,6);
  return 0;
}
const signedPct=n=>(n>0?"+":"")+n+"%";
const memoryStyleLabel=s=>({safe:"SAFE",aggressive:"AGGRESSIVE",technical:"TECHNICAL",bribe:"BRIBE",neutral:"NEUTRAL"}[s]||"UNKNOWN");
const memoryStyleCue=m=>({
  safe:"Last time, you kept it conventional.",
  aggressive:m.lastWin?"Your last bluff landed.":"Your last bluff collapsed.",
  technical:m.lastWin?"Your last technical argument held.":"Your last technical argument did not survive.",
  bribe:m.lastWin?"Our last 'golf conversation' was noticed.":"Your last 'golf invitation' was poorly timed.",
  neutral:m.lastWin?"Your last approach worked.":"Your last approach did not.",
}[m.lastStyle]||"");
export function judgeMemoryInfo(c){
  const def=canonicalJudge(c&&c.judge), m=memoryFor(c);
  if(!def) return null;
  if(!m||!m.seen) return {first:true,history:"FIRST APPEARANCE",quote:"",record:"No prior transcript.",effects:"NO MEMORY MODIFIER"};
  const effects=[
    ["AGGRESSIVE",judgeMemoryModifier({style:"aggressive"},c)],
    ["TECHNICAL",judgeMemoryModifier({style:"technical"},c)],
    ["BRIBE",judgeMemoryModifier({style:"bribe"},c)],
  ].filter(([,v])=>v).map(([label,v])=>label+" "+signedPct(v));
  return {first:false,
    history:m.seen+" PRIOR · LAST: "+memoryStyleLabel(m.lastStyle)+" — "+(m.lastWin?"WON":"LOST"),
    quote:memoryStyleCue(m)+" "+(m.lastWin?def.memoryGood:def.memoryBad),
    record:"CAREER: BLUFF "+m.aggressiveW+"W/"+m.aggressiveL+"L · TECH "+m.technicalW+"W/"+m.technicalL+"L",
    recall:judgeMemoryModel()==="rolling"?"ACTIVE RECALL: LAST "+Math.min(JUDGE_MEMORY_WINDOW,m.seen)+" HEARING(S), NEWEST WEIGHS MOST":
      judgeMemoryModel()==="friday"?"ACTIVE RECALL: OLDER IMPRESSIONS HALVE EACH FIRM WEEK":"ACTIVE RECALL: FULL CAREER (A/B LEGACY)",
    effects:effects.length?effects.join(" · "):"NO STYLE MODIFIER YET"};
}
const judgeMemoryArchiveText=c=>{
  const info=judgeMemoryInfo(c); if(!info) return "";
  return info.first?"FIRST APPEARANCE · NO MEMORY MODIFIER":info.history+" · "+info.effects;
};
export function rememberJudgeOutcome(c,o,win){
  const id=judgeId(c&&c.judge); if(!id||!S) return null;
  if(!S.judgeMemory||typeof S.judgeMemory!=="object") S.judgeMemory={};
  const m=S.judgeMemory[id]||emptyJudgeMemory(), style=judgeStyle(o), suffix=win?"W":"L";
  m.seen++;
  if(style==="safe") m.safe++;
  else m[style+suffix]++;
  m.lastStyle=style; m.lastWin=!!win; m.lastDay=S.day;
  if(!Array.isArray(m.recent)) m.recent=[];
  m.recent.push({style,win:!!win,day:S.day});
  if(m.recent.length>JUDGE_MEMORY_EVENT_LIMIT) m.recent=m.recent.slice(-JUDGE_MEMORY_EVENT_LIMIT);
  S.judgeMemory[id]=m;
  return m;
}
function logJudgeMemory(c,o){
  const info=judgeMemoryInfo(c); if(!info||info.first) return;
  const mod=judgeMemoryModifier(o,c), label=memoryStyleLabel(judgeStyle(o));
  log("["+c.judge.name+"] \""+info.quote+"\""+(mod?" ("+label+" "+signedPct(mod)+")":""),mod<0?"bad":mod>0?"good":"sys");
}

export function log(txt,cls){
  S.logEntries.unshift({txt,cls:cls||""});
  if(S.logEntries.length>SAVE_LOG_LIMIT) S.logEntries.length=SAVE_LOG_LIMIT;
}

export function flash(txt){
  const id=++flashSeq;
  S.flash={txt,id};
  setTimeout(()=>{ if(S&&S.flash&&S.flash.id===id){ S.flash=null; notify(); } },1000);
}
function doShake(){ if(settings.shake) S.shakeSeq++; }

/* the rival associate: your failures are his billable hours */
function nemesisGain(v,fromFailure){
  const N=S.nemesis; if(!N||S.over||!v) return;
  if(fromFailure&&S.rivalPact) return; // a pact means he doesn't feed on your stumbles
  const before=N.inf;
  N.inf=clamp(N.inf+v,0,100);
  if(balanceProbe&&N.inf>before) balanceProbe({kind:"nemesis",source:fromFailure?"failure":"passive",amount:N.inf-before,day:S.day});
  if(fromFailure&&rand()<.25)
    pushMsg("FLOOR NEWS","Your lost file found a new desk. "+N.name+" sends 'sympathies'.");
  while(N.rank<4&&N.inf>=RANK_REQ[N.rank]){
    N.rank++;
    if(N.rank===4){
      if(S.endlessWon){ N.rank=3; N.inf=94; pushMsg("FLOOR NEWS",N.name+" eyes the wall. The wall already has your name on it."); return; }
      gameOver("OUTPACED",N.name+" makes NAME PARTNER while you're still billing hours. The sign painters are on the wall. The name is not yours."); return; }
    pushMsg("FLOOR NEWS",N.name+" promoted to "+RANKS[N.rank]+". The floor compares résumés. Yours is quieter.");
    log(N.name+" outranks the room a little more.","bad");
    apply({rep:-3},true);
  }
}

/* ---------- rival interaction: sabotage, truce, alliance — and payback ---------- */
export const rivalOdds=()=>({
  sab:clamp(50+Math.round((S.bold-40)/2)-(S.nemesis&&S.nemesis.grudge?10:0),20,85),
  ally:clamp(40+(S.inf-(S.nemesis?S.nemesis.inf:0)),15,85),
});
export const rivalMoveReady=()=>!!(S.nemesis&&!S.rivalPact&&S.day>=S.rivalMoveDay&&!S.over);
export function rivalSabotage(){
  const N=S.nemesis; if(!rivalMoveReady()||S.hours<1) return;
  SFX.send(); S.rivalMoveDay=S.day+2; spendHours(1,3);
  if(rand()*100<rivalOdds().sab){
    N.inf=clamp(N.inf-rnd([6,8,10]),0,100);
    log("SABOTAGE: "+N.name+"'s exhibit binder is 'missing'. His week quietly collapses.","good");
  } else {
    N.grudge=true; nemesisGain(3);
    log("SABOTAGE FAILED: a paralegal saw everything. The floor knows. "+N.name+" KNOWS.","bad");
    apply({rep:-10}); doShake();
  }
  if(fatigueCheck(1)) return;
  checkClock(); saveGame(); notify();
}
export function rivalTruce(){
  const N=S.nemesis; if(!rivalMoveReady()||S.hours<0.5) return;
  SFX.send(); S.rivalMoveDay=S.day+2; spendHours(0.5,1);
  if(rand()*100<70){
    S.rivalPact={type:"truce",until:S.day+4};
    log("TRUCE: "+N.name+" shrugs. 'Four days. Then it's billing season again.' He won't feed on your failures.","sys");
  } else log("TRUCE REFUSED: "+N.name+" laughs at a normal volume, which is worse.","bad");
  if(fatigueCheck(0.5)) return;
  checkClock(); saveGame(); notify();
}
export function rivalAlly(){
  const N=S.nemesis; if(!rivalMoveReady()||S.hours<1) return;
  SFX.send(); S.rivalMoveDay=S.day+2; spendHours(1,2);
  if(rand()*100<rivalOdds().ally){
    S.rivalPact={type:"ally",until:S.day+3};
    log("ALLIANCE: three days of trading favors with "+N.name+". You both climb. Watch your back anyway.","sys");
  } else { apply({rep:-4}); log("ALLIANCE REFUSED: "+N.name+" forwards your olive branch to the whole floor. Annotated.","bad"); }
  if(fatigueCheck(1)) return;
  checkClock(); saveGame(); notify();
}
/* his side of the war: pact upkeep, expiry, and file raids on YOUR inbox */
export function rivalTick(){
  const N=S.nemesis; if(!N||S.over) return;
  if(S.rivalPact){
    if(S.day>=S.rivalPact.until){ pushMsg("RIVAL","The "+S.rivalPact.type+" with "+N.name+" quietly expires. Business resumes."); S.rivalPact=null; }
    else if(S.rivalPact.type==="ally"){ apply({inf:1},true,"rival"); N.inf=clamp(N.inf+1,0,100); }
    return;
  }
  if(rand()>= .12+(N.grudge?.08:0)) return;
  const targets=S.inbox.filter(c=>!c.msg&&!c.pending&&!c.delegated&&!c.favor&&!c.suit&&!c.big); // never poach a client-war stage (would soft-lock the war)
  if(!targets.length) return;
  const t=rnd(targets);
  if(rand()<.5){
    S.inbox=S.inbox.filter(x=>x!==t); if(S.openCase===t) S.openCase=null;
    N.inf=clamp(N.inf+4,0,100);
    pushMsg("FILE POACHED","'Heard you were swamped.' "+N.name+" took the "+t.title+" file. Hardwick approved it. Smiling.");
    log("RIVAL: "+N.name+" poached '"+t.title+"'.","bad");
  } else {
    t.tampered=true;
    pushMsg("TAMPERED FILE","The "+t.title+" file came back from 'the copy room' with pages out of order. "+N.name+" walks past, whistling. (-6% on its risky plays)");
  }
}

/* per-run ledger bookkeeping (die is already cast when this is called) */
/* Coasting: errands and favors are not a career choice, so only real files
   (tier>=1) count. The penalty is read BEFORE this play joins the streak, so
   the first quiet settlement is always free — the second one starts costing. */
const coastable=(c,o)=>!!(safeCoastingEnabled()&&c&&o&&!c.favor&&!c.msg&&(c.tier||0)>=1);
function safeCoastPenalty(c,o){
  if(!coastable(c,o)||!o.safe) return null;
  const step=Math.min(S.safeStreak||0,SAFE_STREAK_CAP);
  return step>0?{bold:-SAFE_STREAK_BOLD*step,inf:-SAFE_STREAK_INF_STEP*step,step}:null;
}
const coastFx=(fx,coast)=>!coast?fx:{...fx,
  bold:((fx&&fx.bold)||0)+coast.bold,
  ...((fx&&fx.inf)>0?{inf:Math.max(0,fx.inf+coast.inf)}:{})};
/* UI selector: what settling THIS file right now would cost in payoff. The
   dice never move, so showing it leaks nothing the difficulty modes hide. */
export const coastingPreview=(c,o)=>safeCoastPenalty(c,o);
function updateSafeStreak(c,o){
  if(!coastable(c,o)) return;
  S.safeStreak=o.safe?Math.min((S.safeStreak||0)+1,SAFE_STREAK_CAP):0;
}

function trackChoice(c,o,win){
  const r=S.runStats;
  updateSafeStreak(c,o);
  if(o.safe) r.safe++;
  else if(o.style==="aggressive"){ win?r.bluffW++:r.bluffL++; }
  else if(o.style==="technical"){ win?r.techW++:r.techL++; }
  if(o.bribe){ r.bribeTry++; if(win) r.bribeW++; }
  if(c&&c.favor){ if((o.relOk||0)>0) r.favorHelp++; else if((o.relOk||0)<0) r.favorNo++; }
  if(c){ // daily-objective counters (real files only, not crises)
    const t=S.today; t.resolved++;
    if(o.safe) t.safeUsed++;
    // delayed wins count when REVEALED — counting now would leak the pending die
    if(win&&!o.delay){ t.wins++; if(o.style==="aggressive") t.aggWin++; }
  }
}
const finalWarningSnapshot=()=>({bold:S.bold,wins:S.runStats.bluffW,losses:S.runStats.bluffL});
const aggressiveFailureContext=(o,snapshot)=>o&&o.style==="aggressive"?
  {aggressiveFailure:true,finalWarning:snapshot||finalWarningSnapshot()}:null;

/* ---------- daily objectives: "close 2 files today" → bonus INF/REP/FIRM ---------- */
const OBJ_DEFS={
  close:{desc:o=>"Close "+o.target+" files", cur:()=>S.today.resolved, make:()=>({target:rnd([2,3])})},
  wins:{desc:o=>"Win "+o.target+" case(s)", cur:()=>S.today.wins, make:()=>({target:rnd([1,2])})},
  nosafe:{desc:()=>"Close 2+ files without ever playing it safe", cur:()=>S.today.resolved>=2&&S.today.safeUsed===0?1:0, make:()=>({target:1})},
  aggwin:{desc:()=>"Land an aggressive play", cur:()=>S.today.aggWin, make:()=>({target:1})},
  deleg:{rank:1, desc:()=>"Delegate a file", cur:()=>S.today.delegated, make:()=>({target:1})},
  money:{desc:o=>"Bank $"+o.target, cur:()=>S.today.moneyGained, make:()=>({target:rnd([800,1200,1500])})},
};
const rewardTxt=r=>Object.entries(r).map(([k,v])=>"+"+v+" "+({inf:"INFL",rep:"REP",firm:"FIRM"}[k])).join(", ");
function newObjective(){
  S.today={resolved:0,wins:0,safeUsed:0,aggWin:0,delegated:0,moneyGained:0};
  const keys=Object.keys(OBJ_DEFS).filter(k=>!(OBJ_DEFS[k].rank>S.rank));
  const k=rnd(keys);
  S.objective={tid:k, ...OBJ_DEFS[k].make(), reward:rnd([{inf:4},{inf:5},{rep:4},{firm:4},{inf:3,rep:2}])};
  log("TODAY'S GOAL: "+OBJ_DEFS[k].desc(S.objective)+" ("+rewardTxt(S.objective.reward)+")","sys");
}
export function objectiveInfo(){
  if(!S||!S.objective) return null;
  const def=OBJ_DEFS[S.objective.tid], cur=def.cur();
  return {text:def.desc(S.objective), cur:Math.min(cur,S.objective.target),
    target:S.objective.target, reward:rewardTxt(S.objective.reward), done:cur>=S.objective.target};
}

/* ---------- independent character progression ---------- */
function awardXp(amount,reason){
  if(!S||S.over||!S.progression) return 0;
  const result=addXp(S.progression,amount);
  S.progression=result.progression;
  if(result.xpGained>0) log("+"+result.xpGained+" XP · "+reason,"sys");
  if(result.levelsGained>0){
    SFX.bell();
    log("LEVEL "+S.progression.level+" — "+result.pointsGained+" SKILL POINT"+(result.pointsGained===1?"":"S")+" READY.","sys");
  }
  return result.xpGained;
}
const caseXpFor=(c,o,win)=>{
  if(!c||c.favor) return 0;
  const tier=clamp(Math.trunc(c.tier||0),0,2);
  return CASE_XP[o&&o.safe?"safe":win?"win":"loss"][tier];
};
const delegatedXpFor=(c,win)=>DELEGATED_XP[win?"win":"loss"][clamp(Math.trunc(c&&c.tier||0),0,2)];

export function playerProgressionInfo(){
  if(!S||!S.progression) return null;
  const base=getProgressionInfo(S.progression), innate=startingSkillsFor(S.scenario), sneaky=sneakyModifiers(S.progression);
  const enduranceRank=getSkillRank(S.progression,"endurance");
  const multiplier=enduranceFatigueMultiplier(S.progression,S.scenario);
  const skills=SKILL_IDS.map(id=>{
    const rank=getSkillRank(S.progression,id), nextRank=Math.min(MAX_SKILL,rank+1);
    if(id==="sneaky"){
      const attempts=3+sneaky.lockAttemptBonus;
      const nextSneaky=sneakyModifiers({...S.progression,skills:{...S.progression.skills,sneaky:nextRank}});
      return {id,name:SKILLS[id].name,rank,innate:innate[id],canUpgrade:!S.actionChallenge&&S.progression.skillPoints>0&&rank<MAX_SKILL,
        currentText:`LOCK +${sneaky.lockToleranceBonus}° · ${attempts} ATTEMPTS · POWER −${rank*7}% SPEED / +${Math.round(sneaky.powerScore*.08)}° WINDOW`,
        nextText:`NEXT: LOCK +${nextSneaky.lockToleranceBonus}° · ${3+nextSneaky.lockAttemptBonus} ATTEMPTS · POWER −${nextRank*7}% SPEED / +${Math.round(nextSneaky.powerScore*.08)}° WINDOW`};
    }
    const scenarioBase=enduranceFatigueMultiplier({...S.progression,skills:{...S.progression.skills,endurance:0}},S.scenario);
    const nextMultiplier=enduranceFatigueMultiplier({...S.progression,skills:{...S.progression.skills,endurance:nextRank}},S.scenario);
    return {id,name:SKILLS[id].name,rank,innate:innate[id],canUpgrade:!S.actionChallenge&&S.progression.skillPoints>0&&rank<MAX_SKILL,
      currentText:`SCENARIO ×${scenarioBase.toFixed(2)} · SKILL −${enduranceRank*6}% · WORK FATIGUE ×${multiplier.toFixed(3)}`,
      nextText:`NEXT: SKILL −${nextRank*6}% · WORK FATIGUE ×${nextMultiplier.toFixed(3)}`};
  });
  return {...base,skillPoints:S.progression.skillPoints,skills};
}

export function playerFraudRiskInfo(){
  return S&&S.scenario==="fraud"?getFraudRiskInfo(S.fraudRisk,S.fatigue,S.day):null;
}

export function spendSkillPoint(skillId){
  if(!S||S.over||S.actionChallenge||!SKILL_IDS.includes(skillId)) return false;
  const result=allocateSkill(S.progression,skillId);
  if(!result.spent) return false;
  S.progression=result.progression;
  SFX.bell();
  log("TRAINING: "+SKILLS[skillId].name+" reaches rank "+getSkillRank(S.progression,skillId)+"/"+MAX_SKILL+".","sys");
  saveGame(); notify(); return true;
}

/* ---------- case archive: every resolved file, what you played, how it went ---------- */
function archiveCase(c,play,win,note,via,judgeMemorySnapshot){
  S.archiveTotal=(S.archiveTotal||S.archive.length)+1;
  S.archive.unshift({id:c.id||"", day:S.day, title:c.title, play, win, note:note||"", via:via||"",
    body:c.body||"", judge:c.judge?c.judge.name:"",
    judgeMemory:c.judge&&play!=="(deadline missed)"?
      (typeof judgeMemorySnapshot==="string"?judgeMemorySnapshot:judgeMemoryArchiveText(c)):""}); // snapshot at hearing; later appearances cannot rewrite history
  if(S.archive.length>SAVE_ARCHIVE_LIMIT) S.archive.length=SAVE_ARCHIVE_LIMIT;
}

/* effects: {rep,bold,inf,money,firm} */
export function apply(fx,quiet,source="other",endingContext){
  if(!fx) return;
  const map={rep:"REP",bold:"BOLD",inf:"INFL",money:"$",firm:"FIRM"};
  const beforeInf=S.inf, beforeFirm=S.firm;
  let parts=[];
  for(const k of ["rep","bold","inf","money","firm"]){
    if(!fx[k]) continue;
    let v=fx[k];
    if(k==="inf"&&v>0&&balanceExperiment&&balanceExperiment.infMultipliers){
      const mult=balanceExperiment.infMultipliers[source];
      if(Number.isFinite(mult)) v=Math.round(v*Math.max(0,mult));
      if(!v) continue;
    }
    if(S.scenario==="legacy"){ // nepotism: influence easier, reputation harsher
      if(k==="inf"&&v>0) v=Math.round(v*1.25);
      if(k==="rep"&&v<0) v=Math.round(v*1.25);
    }
    if(k==="money"){ S.money+=v; if(v>0&&S.today) S.today.moneyGained+=v; }
    else {
      if(k==="inf"&&v>0&&S.rank===3&&!S.exceptionalReviewDay){
        const overflow=Math.max(0,S.inf+v-100), cfg=exceptionalReviewConfig();
        if(overflow>0&&cfg){
          S.reviewMomentum=Math.min(cfg.threshold,(S.reviewMomentum||0)+overflow);
          if(balanceProbe) balanceProbe({kind:"inf_overflow",source,amount:overflow,momentum:S.reviewMomentum,day:S.day});
          if(S.reviewMomentum>=cfg.threshold&&!S.exceptionalReviewHinted){
            S.exceptionalReviewHinted=true; SFX.bell();
            log("EXCEPTIONAL REVIEW READY: the work above your Influence ceiling has the partners' attention. The decision can land on a coming morning.","sys");
          }
        }
      }
      S[k]=clamp(S[k]+v,0,100);
    }
    parts.push((v>0?"+":"")+v+" "+map[k]);
  }
  if(balanceProbe&&S.inf>beforeInf) balanceProbe({kind:"inf",source,amount:S.inf-beforeInf,day:S.day});
  if(balanceProbe&&fx.firm) balanceProbe({kind:"firm",source,amount:S.firm-beforeFirm,requested:fx.firm,day:S.day,
    postNamePartner:!!(S.endlessWon||S.rank===4)});
  if(parts.length&&!quiet) log(parts.join(", "),(fx.rep||0)<0?"bad":"good");
  checkEndings(endingContext); notify();
}

/* success chance for an option — the game's balance lives here, edit with care */
export function chance(o,c){
  if(o&&o.action) return null; // COVERT ACTIONS are executed, not resolved by the case die
  if(o.base>=100) return 100;
  let p=o.base+(o.boldW||0)*(S.bold-40)/10*5; // each 10 bold over 40 adds boldW*5
  const j=c&&c.judge;
  if(j){
    if(o.style==="aggressive") p-=j.temper/4;
    if(o.style==="technical")  p+=j.book/5;
    p+=judgeMemoryModifier(o,c);
  }
  if(c&&c.crisisMod&&!o.safe) p+=c.crisisMod.v; // a Traitor leaked / a Brave ally shields (GDD §5-6)
  if(c&&c.dossier&&!o.safe) p+=12;              // detective's dossier on this file
  if(c&&c.covertEdge&&!o.safe) p+=c.covertEdge;  // evidence recovered through a completed COVERT ACTION
  // an EVIDENCE TIMELINE only moves the play it was prepped for, never the whole file
  if(c&&c.timelineEdge&&!o.safe&&c.opts.indexOf(o)===c.timelineEdge.optionIndex) p+=c.timelineEdge.value;
  if(c&&c.tampered&&!o.safe) p-=6;              // the rival reordered these pages
  // the Defector knows Snidely Fitch's playbook
  if(S.scenario==="defector"&&!o.safe&&c&&/Snidely Fitch/.test((c.body||"")+(c.title||""))) p+=8;
  // respect: a low-rep associate gets no benefit of the doubt
  if(!o.safe){
    p-=4; // opposing counsel exists (balance v15.1: risky plays were too free)
    if(S.rep<30) p-=12; else if(S.rep>70) p+=5;
    p-=S.rank*2; // higher rank, higher stakes, sharper opponents
    p-=Math.round(S.fatigue*.25); // exhaustion dulls the blade (up to -25, v1.6)
  }
  return Math.round(clamp(p,5,95));
}

/* ---------- the fictional workday: hours are the currency of a day ---------- */
export const hoursFor=c=>TIER_HOURS[c.tier||0];
/* careful lawyering is SLOW lawyering: safe plays cost x1.5 hours, technical
   x1.25 — the bluff is the only fast move in the building (v1.6) */
export const optHours=(c,o)=>{
  if(o&&o.action) return Math.max(.5,Math.round(o.action.hours*4)/4);
  const m=o.safe?safeHoursMultiplier():(o.style==="technical"?TECH_HOURS_MULT:1);
  const dual=S.decor&&S.decor.monitor?0.25:0; // second monitor: fewer alt-tabs
  return Math.max(0.5,Math.round((hoursFor(c)*m-dual)*4)/4);
};
const workFatigue=(amount,progression=S&&S.progression,scenario=S&&S.scenario)=>
  applyEnduranceToWorkFatigue(amount,progression,scenario);
function spendHours(h,f,preparedFatigue=false){
  S.hours=Math.max(0,Math.round((S.hours-h)*4)/4); // late work may overshoot; persisted clock state never goes negative
  const fatigue=preparedFatigue?f:(f>0&&h>0?workFatigue(f):f);
  if(fatigue) S.fatigue=clamp(S.fatigue+fatigue,0,100);
}
function recordFraudFatiguePeak(hoursWorked){
  const risk=S&&S.fraudRisk;
  if(!risk||S.scenario!=="fraud"||!(hoursWorked>0)) return;
  risk.dailyPeak=Math.max(risk.dailyPeak||0,Math.round(S.fatigue));
}
function rollFraudSlipAtDayEnd(){
  const risk=S&&S.fraudRisk;
  if(!risk||S.scenario!=="fraud"||risk.pendingKind||risk.lastCheckDay===S.day) return false;
  const p=fraudSlipChance(risk.dailyPeak);
  if(!p) return false;
  // Persist the checkpoint before the roll: the open day-summary save cannot
  // reroll identity pressure by being reloaded.
  risk.lastCheckDay=S.day;
  const hit=rand()<p;
  if(balanceProbe) balanceProbe({kind:"fraud_slip_check",day:S.day,peak:risk.dailyPeak,probability:p,hit,
    sentHomeSameDay:!!S.sentHomeNote,enduranceRank:getSkillRank(S.progression,"endurance")});
  if(!hit) return false;
  risk.slipCount++;
  risk.pendingKind="slip";
  risk.pendingDay=S.day+1;
  log("THE SECRET: exhaustion opened your mouth before judgment did. A question is waiting for the morning.","bad");
  return true;
}
/* exhaustion hazard: past FATIGUE_DANGER every worked hour risks a clumsy
   incident. Per-hour odds (fatigue-75)*4+10 — 30% at 80, certain at 100. */
export const hazardPerHour=()=>S.fatigue>=100?100:(S.fatigue>FATIGUE_DANGER?clamp((S.fatigue-FATIGUE_DANGER)*4+10,0,100):0);
const INCIDENTS=[
  "You pour a triple espresso squarely onto {BOSS}'s deposition notes. And lap.",
  "You fall asleep mid-sentence in the conference room. Your own sentence.",
  "You feed the ORIGINAL signed contract into the shredder. The copy was in your other hand.",
  "You call the client by the opposing party's name. Twice. With confidence.",
  "You walk into the glass wall of the conference room. The glass wall wins.",
  "You staple your own tie to the Meridian filing. It takes three people to notice and one to photograph.",
];
function fatigueCheck(hoursWorked){
  if(!S||S.over||S.summary||S.leaving) return false;
  recordFraudFatiguePeak(hoursWorked);
  const ph=hazardPerHour(); if(!ph) return false;
  const p=S.fatigue>=100?1:1-Math.pow(1-ph/100,Math.max(1,hoursWorked||1));
  if(rand()>=p) return false;
  const boss=bossAbove(S.rank,S.firedNames);
  const what=rnd(INCIDENTS).replace("{BOSS}",boss||"a Senior Partner");
  SFX.lose(); doShake();
  log("EXHAUSTION: "+what,"bad");
  log(boss
    ? boss+" points at the elevator: 'Home. Now. Before you cost us a client.'"
    : "You catch your reflection in the glass wall. Even you can see it. You send yourself home.","bad");
  S.sentHomeNote=S.fatigue>=100
    ? "COLLAPSE at "+wallTime()+": your body filed its own motion — granted. The firm sent you home."
    : "SENT HOME at "+wallTime()+": "+what;
  apply({rep:SENTHOME_REP,inf:SENTHOME_INF});
  if(S.over) return true;
  if(S.event) S.event=null; // whatever was pending, the day is over
  S.pendingChoice=null;
  endDay();
  return true;
}

/* out of hours? the building asks the eternal question */
function checkClock(){
  if(!S||S.over||S.summary||S.event||S.hours>0) return;
  S.hours=0;
  const due=S.inbox.filter(c=>!c.msg&&!c.pending&&!c.delegated).length;
  const canStay=canOvertime(), otFatigue=overtimeFatigue();
  const opts=[{text:"Go home. Sleep is a legal strategy.",base:100,safe:true,home:true,ok:{fx:{},txt:""}}];
  if(canStay) opts.push({text:"Overtime: +"+OVERTIME_HOURS+" hours at the desk. (+"+otFatigue+" FATIGUE)",base:100,safe:true,ot:true,ok:{fx:{},txt:""}});
  SFX.bell();
  S.event={id:"overtime",title:wallTime()+" — QUITTING TIME",
    body:(due?due+" file(s) still sit on your desk. ":"The desk is clear. ")+
      "The cleaning crew is vacuuming around the associates who stayed. Fatigue at "+S.fatigue+"/100"+(S.fatigue>=60?" — your eyes are doing that thing again.":".")+
      (canStay?" Go home, or bill the night?":" Two overtime blocks are gone. The building is locking up. Go home."),
    opts};
  notify();
}
export const canOvertime=()=>!!S&&(S.otToday||0)<OVERTIME_LIMIT;
export const overtimeFatigue=()=>OVERTIME_FATIGUE+OVERTIME_FATIGUE_STEP*Math.min(S&&S.otToday||0,OVERTIME_LIMIT-1);
export const wallTime=()=>{
  const t=9+(settings.dayLen||DAY_HOURS)+S.otHours-S.hours;
  return String(Math.floor(t)).padStart(2,"0")+":"+String(Math.round(t%1*60)).padStart(2,"0");
};
/* the hierarchy asks for coffee: bosses interrupt your day with chores */
function maybeDemand(){
  if(!S||S.over||S.event||S.summary||S.hours<=0.5) return;
  if(rand()>=.14) return;
  const d=buildDemand(S.rank,S.firedNames);
  if(d){ SFX.open(); S.event=d; notify(); }
}

/* What the PLAYER sees. The dice always use the exact chance(); difficulty
   only blurs the display: easy = tight range, medium/hard = wider, realistic =
   no numbers at all. The range is shifted off-center by a per-run hash so the
   midpoint doesn't leak the true value, and it's stable (no flicker). */
const FUZZ={easy:5, medium:9, hard:14};
export function displayPct(p,key){
  if(S.difficulty==="realistic") return null;
  if(p>=100) return "100%";
  const half=FUZZ[S.difficulty]||FUZZ.easy;
  const off=hash(S.seed+"|"+key)%(half+1)-(half>>1);
  const r5=v=>Math.round(v/5)*5;
  let lo=clamp(r5(p+off-half),0,90), hi=clamp(r5(p+off+half),10,99);
  if(hi<=lo) hi=lo+5;
  return "~"+lo+"–"+hi+"%";
}
export const displayChance=(o,c)=>o&&o.action?null:displayPct(chance(o,c),((c&&c.id)||"ev")+"|"+o.text);

/* achievement helper: engine-side so every unlock gets the same fanfare */
function ach(id){
  if(!unlock(id)) return;
  const a=ACHIEVEMENTS.find(x=>x.id===id);
  SFX.bell();
  log("ACHIEVEMENT UNLOCKED: "+a.name+" — "+a.desc,"sys");
}

/* ---------- flow ----------
   modes: standard (default) · ironman (no save — close the game, lose the run)
   · endless (winning doesn't end the run) · daily (date-seeded, same for everyone) */
export function startGame(sc,diff,mode){
  terminalClearDone=false;
  mode=mode||"standard";
  if(mode==="daily"){
    const today=new Date().toISOString().slice(0,10);
    const h=hash("fo_daily_"+today);
    setSeed(h);
    sc=["fraud","debtor","legacy","defector","boomerang"][h%5]; diff="medium";
    setS(newState(sc,diff)); S.dailyDate=today;
  } else { clearSeed(); setS(newState(sc,diff)); }
  S.mode=mode; S.slot=activeSlot;
  S.pool=buildPool();
  S.npcs=buildNpcs();
  SFX.bell();
  log("Welcome to Parson Henderson, "+RANKS[0]+".","sys");
  if(sc==="debtor") log("Loan payment: $2000 due day 3.","sys");
  if(sc==="defector") log("You know where Snidely Fitch buries the bodies. They know you know.","sys");
  if(sc==="boomerang"){ // fired once, hired back: hostile floor, sharper start
    S.rep=42; S.inf=18; S.marvBribes=1;
    S.weekStart={inf:18,rep:42}; // Friday baseline matches the stained start
    S.npcs.forEach(n=>{ n.rel=-25; });
    log("Security badge reprinted. Same desk. The floor goes quiet when you pass.","sys");
    log("You know this building better than anyone — you can DELEGATE from day one.","sys");
    log("Marv kept your mug. Marv never doubted you.","sys");
  }
  if(mode==="ironman") log("IRONMAN: no save. Close the game, lose the career.","sys");
  if(mode==="daily") log("DAILY CHALLENGE "+S.dailyDate+": same seed for everyone. No excuses.","sys");
  // clients are EARNED, not handed out — you start with an empty book...
  if(sc==="legacy"){ const nc=signClient(); if(nc) log("A family friend parks the "+nc.name+" account with you. Nepotism has perks.","sys"); }
  else if(sc==="defector"){ const nc=signClient(); if(nc) log("You didn't leave Snidely Fitch empty-handed: "+nc.name+" came with you.","sys"); }
  else log("Zero clients on your book. Win loudly — they'll find you.","sys");
  drawCases(3);
  newObjective();
  sitDown(); startAmbience(); saveGame(); notify();
}

/* hand-written pool first; when it runs dry (or for late-run variety) the
   procedural generator takes over — no more repeating the same 9 files */
function drawCases(n){
  for(let i=0;i<n;i++){
    let avail=S.pool.filter(c=>!c.taken&&c.tier<=Math.max(1,S.rank));
    if(S.rank>=1) avail=S.pool.filter(c=>!c.taken);
    const useGen=!avail.length||(S.day>3&&rand()<.4);
    const c=useGen?genCase():rnd(avail);
    if(!useGen) c.taken=true;
    if(useGen&&c.tier===2&&S.rank<1){ i--; continue; } // no court cases before Senior Associate
    S.inbox.push(instantiateCase(c));
  }
}

/* turn a case template into a live inbox file (deep-copied, stake-scaled, judge drawn).
   A corruptible judge (GDD §7) quietly adds one very risky, very expensive option. */
export function instantiateCase(c){
  const inst={...c, opts:shuffle(JSON.parse(JSON.stringify(c.opts))),
    dueDay:S.day+c.deadline, judge:c.judge?rnd(JUDGES):null};
  if(S.golfEdge&&inst.judge){ // weekend golf pays off: this judge is pre-read
    inst.dossier=true; S.golfEdge=false;
    log("Weekend golf pays off: you know exactly how "+inst.judge.name+" thinks. (dossier attached)","sys");
  }
  if(inst.judge&&inst.judge.corrupt>=40){
    const cost=900+300*S.rank;
    inst.opts.push({text:"Invite the judge to 'discuss golf'. (-$"+cost+")",
      base:inst.judge.corrupt-15, boldW:1, style:"bribe", bribe:cost,
      ok:{fx:{inf:8,money:1400},txt:"The ruling lands your way. The golf never happens. Neither did this conversation."},
      fail:{fx:{rep:-13},txt:"The judge repeats your offer aloud. For the record. The stenographer types slowly, savoring it."}});
  }
  return scaleStakes(inst);
}

/* A Client War has exactly one owner and one carrier: either its current inbox
   stage or its queued follow-up. Every terminal/cancellation path goes through
   this idempotent cleanup so a lost client can never leave a ghost filing. */
const warBelongs=(c,client)=>!!(c&&c.big&&c.big.client===client);
export function endClientWar(client){
  if(!S||!client) return false;
  const inbox=Array.isArray(S.inbox)?S.inbox:[];
  const followups=Array.isArray(S.followups)?S.followups:[];
  const active=!!(S.bigCase&&S.bigCase.client===client);
  const inboxHits=inbox.filter(c=>warBelongs(c,client));
  const followupHits=followups.filter(f=>warBelongs(f&&f.case,client));
  const openHit=warBelongs(S.openCase,client);
  const pendingHit=warBelongs(S.pendingChoice&&S.pendingChoice.c,client);
  const touched=active||inboxHits.length>0||followupHits.length>0||openHit||pendingHit;

  if(inboxHits.length) S.inbox=inbox.filter(c=>!warBelongs(c,client));
  if(followupHits.length) S.followups=followups.filter(f=>!warBelongs(f&&f.case,client));
  if(openHit) S.openCase=null;
  if(pendingHit){ S.pendingChoice=null; if(S.event&&S.event.id==="latework") S.event=null; }
  if(active) S.bigCase=null;
  if(touched) S.bigDoneDay=Math.max(Number(S.bigDoneDay)||0,Number(S.day)||0);
  return touched;
}

/* Repair pre-v1.9.6 saves and fail closed on impossible multi-war states. */
function reconcileClientWarState(){
  if(!S) return 0;
  const retained=new Set((Array.isArray(S.clients)?S.clients:[]).map(c=>c&&c.name).filter(Boolean));
  const canonical=S.bigCase&&S.bigCase.client;
  const names=new Set([
    canonical,
    ...(Array.isArray(S.inbox)?S.inbox:[]).map(c=>c&&c.big&&c.big.client),
    ...(Array.isArray(S.followups)?S.followups:[]).map(f=>f&&f.case&&f.case.big&&f.case.big.client),
  ].filter(Boolean));
  let repaired=0;

  for(const name of names){
    if(!canonical||name!==canonical||!retained.has(name)){
      if(endClientWar(name)) repaired++;
    }
  }
  if(!S.bigCase) return repaired;

  const client=S.bigCase.client, stage=S.bigCase.stage;
  const carriers=[
    ...(Array.isArray(S.inbox)?S.inbox:[]).filter(c=>warBelongs(c,client)).map(ref=>({kind:"inbox",ref,c:ref})),
    ...(Array.isArray(S.followups)?S.followups:[]).filter(f=>warBelongs(f&&f.case,client)).map(ref=>({kind:"followup",ref,c:ref.case})),
  ];
  const matching=carriers.filter(x=>x.c.big.stage===stage);
  if(!matching.length){ if(endClientWar(client)) repaired++; return repaired; }
  if(carriers.length>1){
    const keep=matching[0];
    S.inbox=S.inbox.filter(c=>!warBelongs(c,client)||(keep.kind==="inbox"&&c===keep.ref));
    S.followups=S.followups.filter(f=>!warBelongs(f&&f.case,client)||(keep.kind==="followup"&&f===keep.ref));
    repaired++;
  }
  return repaired;
}

/* multi-stage cases: an outcome with `next` queues a follow-up filing that
   lands in the inbox `after` days later (stake-scaled at ITS spawn, not now) */
function queueFollowup(nx){
  S.followups.push({day:S.day+(nx.after||1), case:nx.case});
  log(nx.note||"Word around the floor: a follow-up filing is coming.","sys");
}
function spawnFollowups(){
  const due=S.followups.filter(f=>f.day<=S.day);
  S.followups=S.followups.filter(f=>!due.includes(f));
  due.forEach(f=>{
    if(f.case&&f.case.big){
      const b=f.case.big;
      const retained=S.clients.some(c=>c.name===b.client);
      const expected=S.bigCase&&S.bigCase.client===b.client&&S.bigCase.stage===b.stage;
      if(!retained||!expected){
        endClientWar(b.client);
        log("STALE FILING DISMISSED: THE "+b.client.toUpperCase()+" WAR no longer has a client or an active mandate.","sys");
        return;
      }
    }
    const inst=instantiateCase({...f.case, chain:true});
    S.inbox.unshift(inst);
    log("NEW FILING: "+inst.title,"sys");
  });
}

/* higher rank = higher stakes: FEES scale up, failures scale up FASTER.
   Balance v15.1: the reward multiplier applies to money/bold only — INF is
   instead globally damped (INF_EARN), so climbing doesn't snowball influence.
   Applied to a deep copy at draw time (promotion doesn't retro-scale open files). */
function scaleStakes(inst){
  const r=S.rank; inst.stakes=r;
  const mul=(fx,style,won)=>{ if(!fx) return;
    for(const k of ["rep","bold","inf","money","firm"]){
      if(!fx[k]) continue;
      if(fx[k]<0){ if(r) fx[k]=Math.round(fx[k]*STAKE_PENALTY[r]); continue; }
      if(k==="inf"){
        const aggressiveMult=balanceExperiment&&Number.isFinite(balanceExperiment.aggressiveInfMult)?
          Math.max(0,balanceExperiment.aggressiveInfMult):AGG_INF_MULT;
        const approach=won&&style==="technical"?TECH_INF_MULT:(won&&style==="aggressive"?aggressiveMult:1);
        fx[k]=Math.max(1,Math.round(fx[k]*INF_EARN*approach));
      }
      else if((k==="money"||k==="bold")&&r) fx[k]=Math.round(fx[k]*STAKE_REWARD[r]);
    }};
  inst.opts.forEach(o=>{
    mul(o.ok&&o.ok.fx,o.style,true); mul(o.fail&&o.fail.fx,o.style,false);
    if(o.action){
      mul(o.action.success&&o.action.success.fx,"covert",true);
      mul(o.action.escape&&o.action.escape.fx,"covert",false);
      mul(o.action.caught&&o.action.caught.fx,"covert",false);
    }
  });
  return inst;
}

/* no real-time clock anymore: the day advances only when you DO things */

/* character walk cycle: leaving takes ~1.4s before the summary shows;
   arriving plays over the first seconds of the new day */
function sitDown(){
  S.charAnim="arriving"; notify();
  setTimeout(()=>{ if(S&&!S.over&&S.charAnim==="arriving"){ S.charAnim="working"; notify(); } },1500);
}

export function endDay(){
  if(S.over||S.summary||S.leaving||S.actionChallenge) return;
  if(S.event&&S.event.id==="overtime") S.event=null; // the "go home" path closes the prompt
  const leftover=Math.max(0,S.hours); // unspent hours = extra rest tonight
  // deadlines
  let missed=S.inbox.filter(c=>!c.pending&&!c.delegated&&c.dueDay<=S.day&&!c.msg);
  if(missed.includes(S.openCase)) S.openCase=null; // don't keep showing a removed case
  S.weekMissed+=missed.filter(c=>!c.favor).length;
  missed.forEach(c=>{
    if(c.favor){ const n=S.npcs.find(x=>x.id===c.npc); if(n) relNpc(n,-10);
      archiveCase(c,"(ignored)",false,"-10 rel","favor");
      log("FAVOR IGNORED: "+c.title+" (-10 rel)","bad"); return; }
    log("DEADLINE MISSED: "+c.title,"bad"); S.runStats.miss++;
    archiveCase(c,"(deadline missed)",false,DEADLINE_PENALTY+" REP");
    if(c.big){ endClientWar(c.big.client);
      log("THE "+c.big.client.toUpperCase()+" WAR dies on your desk, unanswered. "+c.big.client+" notices.","bad"); }
    apply({rep:DEADLINE_PENALTY,firm:-2},true,"deadline"); nemesisGain(4,true);
  });
  S.inbox=S.inbox.filter(c=>!missed.includes(c));
  if(S.over) return;
  // day summary then advance
  const lines=[];
  lines.push("Day "+S.day+" closed at "+RANKS[S.rank]+".");
  if(S.sentHomeNote){ lines.push(S.sentHomeNote); lines.push("The floor will retell this for weeks."); S.sentHomeNote=null; }
  if(missed.length) lines.push(missed.length+" deadline(s) missed ("+DEADLINE_PENALTY+" REP each).");
  lines.push("The firm forgets fast: -1 REP, -"+INF_DECAY[S.rank]+" INFL overnight.");
  // sleep: base recovery + a bonus for every hour you DIDN'T bill
  const rested=Math.min(S.fatigue,Math.round(FATIGUE_REST+leftover*3+(S.decor&&S.decor.fish?3:0)));
  if(S.fatigue>0) lines.push("Sleep: -"+rested+" FATIGUE."+(leftover>=2?" Leaving early helped.":S.otToday?" Overtime did not.":""));
  S.fatigue=clamp(S.fatigue-rested,0,100);
  // daily objective: bonus if met, a dry note if not (no penalty)
  if(S.objective){
    const info=objectiveInfo();
    if(info.done){ apply(S.objective.reward,true,"objective"); lines.push("DAILY GOAL MET: "+info.text+" — "+info.reward+"."); SFX.bell(); }
    else lines.push("Daily goal missed: "+info.text+". No penalty. The firm merely notices.");
    S.objective=null;
  }
  // Friday: the partners review your week (influence gained, reputation kept, deadlines missed)
  const friday=S.day%WEEK_LEN===0;
  if(friday){
    const score=(S.inf-S.weekStart.inf)+Math.round((S.rep-S.weekStart.rep)/2)-S.weekMissed*3;
    lines.push("— PARTNER REVIEW, WEEK "+(S.day/WEEK_LEN)+" —");
    if(score>=REVIEW_GOOD){
      apply({rep:4,inf:4,firm:3},true,"review"); ach("friday");
      lines.push(rnd([
        "Hardwick, without looking up: 'Whoever you are — keep billing like that.' (+4 REP, +4 INFL)",
        "Your name comes up in the partners' meeting. Nobody laughs. Progress. (+4 REP, +4 INFL)",
        "A bottle appears on your desk. No card. Partners don't do cards. (+4 REP, +4 INFL)"]));
    } else if(score<=REVIEW_BAD){
      apply({rep:-4,firm:-3},true,"review");
      lines.push(rnd([
        "Hardwick's door was open. It closed as you walked past. (-4 REP)",
        "'We measure weeks here,' says the memo. Yours, apparently, was measured. (-4 REP)",
        "The partners' meeting mentions 'dead weight'. Several people glance at your desk. (-4 REP)"]));
    } else {
      lines.push(rnd([
        "The review is a shrug. Survival is a kind of praise here.",
        "'Adequate.' In this firm, that's almost a compliment. Almost.",
        "No praise, no warning. The most Parson Henderson sentence possible."]));
    }
    // retainers: the client book pays out on Fridays
    const ret=S.clients.reduce((a,c)=>a+c.fee,0);
    if(ret){ apply({money:ret},true); lines.push("Retainers collected: +$"+ret+" ("+S.clients.length+" client(s))."); }
    else if(S.rank>=2){ apply({firm:-4},true,"retainer"); lines.push("A partner with zero clients. The firm bills the air. (-4 FIRM)"); }
    else lines.push("No retainers yet. The partners are watching your book.");
    if(S.decor&&S.decor.art){ apply({inf:1},true,"decor"); lines.push("A client lingered at your painting. Taste is billable. (+1 INFL)"); }
    lines.push("The weekend happens to other people. You reread depositions.");
    S.weekStart={inf:S.inf, rep:S.rep}; S.weekMissed=0;
  }
  if(S.over) return; // the review itself can end you (REP floor)
  // debt
  if(S.debtDue!==null && S.day+1>=S.debtDue){
    if(S.money>=2000){S.money-=2000; S.debtDue+=3; lines.push("Loan payment made: -$2000. Next due day "+S.debtDue+".");}
    else { gameOver("STUDENT DEBT DEFAULT","You missed a loan payment. The collectors know where you bill hours. Career over."); return; }
  }
  // Roll only after every lethal end-of-day rule has cleared. A terminal
  // career never records a ghost slip the player could not possibly answer.
  const fraudSlip=rollFraudSlipAtDayEnd();
  if(fraudSlip) lines.push("THE SECRET: something you said under exhaustion drew a second look. A question is waiting tomorrow.");
  // walk out first, then the summary
  S.pendingSummary={title:"END OF DAY "+S.day+(friday?" — FRIDAY":""),lines,btnTxt:"START DAY "+(S.day+1),action:"nextDay"};
  saveGame(); // checkpoint BEFORE the walk animation so reload cannot undo the night
  S.leaving=true; S.charAnim="leaving"; notify();
  setTimeout(()=>{
    if(!S||S.over) return;
    S.leaving=false;
    SFX.bell();
    const pending=S.pendingSummary;
    S.pendingSummary=null;
    if(pending) showSummary(pending.title,pending.lines,pending.btnTxt,pending.action);
  },1400);
}

/* Serializable continuation for the end-of-day summary. A reload while the
   summary is open can now resume here exactly once instead of rolling back. */
function ensureMorningArrival(){
  if(S.charAnim!=="arriving"&&S.charAnim!=="working") sitDown();
}
function openDueFraudEvent(resumeMorning=false){
  const risk=S&&S.fraudRisk;
  if(!S||S.over||S.event||!risk||!risk.pendingKind||risk.pendingDay>S.day) return false;
  const kind=risk.pendingKind;
  risk.pendingKind=null; risk.pendingDay=0;
  risk.morningPhase=resumeMorning?"resume":"complete";
  if(kind==="inquiry") risk.inquiryCount++;
  S.event=kind==="inquiry"?buildFraudInquiryEvent(risk):buildFraudSlipEvent(risk);
  SFX.crisis();
  log("IDENTITY PRESSURE: a question you postponed has reached the morning calendar.","bad");
  return true;
}
function continueMorning(){
  if(S.fraudRisk&&S.fraudRisk.morningPhase==="resume") S.fraudRisk.morningPhase="idle";
  if(S.day>=15) ach("day15");
  nemesisGain(rnd([0,1,1,2,2,3])); // he grinds nights too
  if(S.over) return;
  apply({rep:-1,inf:-INF_DECAY[S.rank]},true); // the firm forgets fast — and influence evaporates upward
  if(S.over) return;
  newObjective(); // set the day's goal FIRST so replies that land this morning count toward it
  for(const c of S.inbox.filter(c=>c.pending&&c.pending.day<=S.day)){
    resolveDelayed(c);
    if(S.over) return;
  }
  for(const c of S.inbox.filter(c=>c.delegated&&c.delegated.day<=S.day)){
    resolveDelegated(c);
    if(S.over) return;
  }
  // Morning replies land together; promote once after all of them so an
  // ENDLESS Name Partner summary cannot be overwritten by a later resolver.
  checkPromotion(true);
  if(S.over) return;
  spawnFollowups();
  S.coffeeToday=0; // the espresso counter forgives overnight
  drawCases(3+(rand()<.4?1:0)+(S.rank>=2&&rand()<.4?1:0)); // v1.6: the inbox does not respect you
  if(S.summary){ // promotion morning: leave a playable desk, skip payroll/events behind the modal
    ensureMorningArrival(); saveGame(); return;
  }
  if(rand()<.35&&!S.inbox.some(c=>c.favor)) spawnFavor();
  if(rand()<.18) marvMoment();
  rosterTick();
  if(S.over) return; // payroll drift can collapse an ENDLESS firm
  litigationTick();
  if(S.over) return;
  rivalTick();
  if(S.over) return;
  // Saturday interlude: the morning after every Friday, the weekend asks what you did with it
  if(!S.event&&(S.day-1)%WEEK_LEN===0&&S.day>1){ SFX.bell(); S.event=buildWeekend(); }
  // low rep = casual disrespect
  if(disrespected()&&rand()<.5) pushMsg("FYI",rnd([
    "The partners' meeting you weren't told about went great, apparently.",
    "Someone booked 'your' desk for a client call. You can use the hallway.",
    "IT reset your password to 'temp123'. They didn't tell you either.",
    "Your nameplate now reads 'ASSOCIATE (TEMP)'. Nobody knows who ordered it.",
    "The intern got CC'd on your case. 'For oversight.'"]));
  // crisis? (a Traitor may leak your position; a loyal Brave shields you)
  const cs=crises();
  if(!S.event&&cs.length&&rand()<.6){
    const c=rnd(cs); S.usedCrises.push(c.id); SFX.crisis();
    const traitor=S.npcs.find(n=>n.trait==="Traitor"&&n.rel<25);
    const brave=S.npcs.find(n=>n.trait==="Brave"&&n.rel>=40);
    if(!c.fraudKind&&traitor&&rand()<.4){ traitor.known=true; c.crisisMod={v:-8,txt:traitor.name+" leaked your position before you entered the room. (-8% on every play)"}; }
    else if(!c.fraudKind&&brave){ brave.known=true; c.crisisMod={v:8,txt:brave.name+" is standing at your shoulder. (+8% on every play)"}; }
    S.event=c; S.runStats.crises++;
  }
  // no firm crisis today? the outside world may still bite (rare, repeatable)
  if(!S.event&&rand()<.07){
    const ge=buildGlobalEvent(S.clients);
    if(ge){ SFX.crisis(); S.event=ge; S.runStats.crises++; }
  }
  // a colleague you've earned (rel 40+) may open a door — once per run each
  if(!S.event){
    const friend=S.npcs.find(n=>n.rel>=40&&!S.npcStories.includes(n.id));
    if(friend){ const st=buildStory(friend); if(st){ S.npcStories.push(friend.id); SFX.open(); S.event=st; } }
  }
  clientAcquisition();
  // a retained client's existential, weeks-long matter (one at a time)
  if(!S.bigCase&&S.rank>=1&&S.clients.length&&S.day>=4&&S.day>=S.bigDoneDay+4&&rand()<.10){
    const cl=rnd(S.clients);
    S.bigCase={client:cl.name, stage:1};
    S.inbox.unshift(instantiateCase(buildBigMatter(cl.name)));
    SFX.crisis();
    log("RETAINER MATTER: "+cl.name+" is under siege. This one is measured in weeks, not hours.","sys");
  }
  ensureMorningArrival();
}
function advanceDay(){
  S.day++; S.hours=settings.dayLen||DAY_HOURS; S.otHours=0; S.otToday=0;
  if(S.fraudRisk) S.fraudRisk.dailyPeak=0;
  // A queued identity confrontation is the first playable checkpoint of the
  // morning. Ordinary decay, rival progress and delayed results cannot kill
  // the career before the player has seen the guaranteed cover choice. The
  // persisted marker resumes this exact morning pipeline after the event,
  // including after a reload, and is cleared before any passive runs.
  if(openDueFraudEvent(true)){
    ensureMorningArrival();
    saveGame(); notify(); return;
  }
  continueMorning();
}

function resolveDelayed(c){
  S.inbox=S.inbox.filter(x=>x!==c);
  const r=c.pending, out=r.win?r.o.ok:r.o.fail;
  archiveCase(c,r.o.text,r.win,out.txt,"delayed reply",r.judgeMemorySnapshot);
  rememberJudgeOutcome(c,r.o,r.win); // reveal first: hidden delayed outcomes never leak through future odds
  if(r.win){ SFX.win(); S.today.wins++; if(r.o.style==="aggressive") S.today.aggWin++;
    log("RESPONSE ["+c.title+"]: SUCCESS","good"); pushMsg("REPLY: "+c.title,out.txt);
    awardXp(caseXpFor(c,r.o,true),"CASE REPLY · "+c.title); apply(out.fx,false,"delayed");
    if((c.tier||0)>=1) apply({firm:1},true,"delayed"); // same firm effect as an instant win (v1.9.4 symmetry)
    maybeImpressClient(c); if((out.fx.rep||0)+(out.fx.inf||0)>=10) flash("HENDERED!"); }
  else { SFX.lose(); log("RESPONSE ["+c.title+"]: FAILED","bad"); pushMsg("REPLY: "+c.title,out.txt);
    awardXp(caseXpFor(c,r.o,false),"CASE REPLY · "+c.title);
    apply(out.fx,false,"delayed",aggressiveFailureContext(r.o,r.finalWarningSnapshot));
    if((c.tier||0)>=1) apply({firm:-1},true,"delayed");
    maybeLoseClientOnFail(); doShake(); nemesisGain(3,true); }
  if(out.next) queueFollowup(out.next);
}

/* a delegated case comes back the next morning — their traits + your
   relationship decided the outcome the moment you handed it over */
function burnDelegatedDeadline(c,handler){
  if(!(c.dueDay<S.day)) return false;
  S.weekMissed++; S.runStats.miss++;
  pushMsg("DEADLINE BURNED: "+c.title,handler+" The file returned after its deadline.");
  log("DELEGATION ["+c.title+"]: "+handler.toLowerCase()+" — deadline missed.","bad");
  archiveCase(c,"Delegated (file returned too late)",false,DEADLINE_PENALTY+" REP","deadline missed");
  apply({rep:DEADLINE_PENALTY,firm:-2},true,"deadline"); nemesisGain(4,true);
  return true;
}
function resolveDelegated(c){
  S.inbox=S.inbox.filter(x=>x!==c);
  const d=c.delegated, n=S.npcs.find(x=>x.id===d.npc);
  if(!n){
    c.delegated=null;
    if(!burnDelegatedDeadline(c,"Its handler no longer works here.")){
      S.inbox.push(c); log("A delegated file drifts back — its handler no longer works here.","sys");
    }
    return;
  }
  n.known=true;
  if(d.win){
    SFX.win(); relNpc(n,6); S.today.resolved++; S.today.wins++;
    pushMsg("DELEGATED: "+c.title, n.name+" "+rnd(DELEGATE_WIN_TXT));
    log("DELEGATION ["+c.title+"]: "+n.name+" delivered.","good");
    awardXp(delegatedXpFor(c,true),"DELEGATED FILE · "+c.title);
    archiveCase(c,"Delegated to "+n.name,true,"handled it","delegated");
    apply({rep:2,inf:Math.max(1,Math.round((3+(c.tier||0)*2)*INF_EARN)),money:(c.tier||0)*300,
      firm:(c.tier||0)>=1?1:0},false,"delegated"); // delegated glory is damped like all INF; real matters also move FIRM
  } else if(d.silent){
    relNpc(n,-3); c.delegated=null;
    if(!burnDelegatedDeadline(c,n.name+" 'never got around to it'.")){ // no free extension on the due date
      S.inbox.push(c); // enough time remains; the file really does come back
      pushMsg("RETURNED: "+c.title,n.name+" 'never got around to it'. The file is back on YOUR desk, deadline intact.");
      log("DELEGATION ["+c.title+"]: silently dropped by "+n.name+".","bad");
    }
  } else {
    SFX.lose(); relNpc(n,-5); S.today.resolved++;
    const traitorTax=n.trait==="Traitor"?4:0;
    pushMsg("DELEGATED: "+c.title, n.name+" "+rnd(DELEGATE_FAIL_TXT)+(traitorTax?" Somehow the whole floor knows it was YOUR case.":""));
    log("DELEGATION ["+c.title+"]: "+n.name+" failed it.","bad");
    awardXp(delegatedXpFor(c,false),"DELEGATED FILE · "+c.title);
    archiveCase(c,"Delegated to "+n.name,false,"botched it","delegated");
    apply({rep:-4-traitorTax,firm:(c.tier||0)>=1?-1:0},false,"delegated"); nemesisGain(3,true);
  }
}

/* Marv, the copy-room oracle. His generosity tracks your bribe history. */
function marvMoment(){
  if(S.marvBribes>0&&rand()<.5){
    const t=S.inbox.find(c=>!c.msg&&!c.pending&&!c.delegated&&!c.dossier&&!c.favor);
    if(t){ t.dossier=true;
      pushMsg("MARV (copy room)","A folder 'accidentally' lands in your tray. It concerns the "+t.title.replace(/^(CASE|COURT|MEMO|FAVOR|APPEAL|Errand|Doc review): ?/,"")+" file. (+12% on that file)");
      return; }
  }
  pushMsg("MARV (copy room)", rnd(S.marvBribes===0?[
    "Marv nods at you by the copier. He knows something. He always knows something.",
    "Marv: 'Big folders moving to the 14th floor today. Just saying.'",
    "Marv fixes the paper jam without looking. 'Partners are grumpy this week. Bill accordingly.'"
  ]:[
    "Marv slides you a coffee. The good kind. From the partners' machine.",
    "Marv: 'Heard your name upstairs. Good tone this time.'",
    "Marv 'loses' the copy-log page with your name on it. Officially, you owe him nothing."
  ]));
}
function boundInboxMessages(inbox){
  let messages=0;
  return inbox.filter(item=>!item.msg||++messages<=INBOX_MESSAGE_LIMIT);
}
function pushMsg(title,txt){
  S.inbox.unshift({msg:true,title,body:txt});
  S.inbox=boundInboxMessages(S.inbox); // endless careers otherwise accumulate hundreds of permanent DOM/save rows
}

/* choose option on open case. NOTE: for delayed options the die is rolled NOW,
   the outcome is only revealed later by resolveDelayed (CLAUDE.md §5). */
function actionRefs(ch=S&&S.actionChallenge){
  if(!S||!ch) return null;
  const c=S.inbox.find(item=>!item.msg&&item.id===ch.caseId);
  const o=c&&c.opts[ch.optionIndex];
  return c&&o&&o.action&&o.action.id===ch.actionId?{c,o,action:o.action}:null;
}

const legacySkillSnapshot=()=>({rulesVersion:0,sneaky:0,endurance:0});
const currentSkillSnapshot=()=>({rulesVersion:1,
  sneaky:getSkillRank(S.progression,"sneaky"),endurance:getSkillRank(S.progression,"endurance")});
const snapshotProgression=snapshot=>({skills:{sneaky:snapshot.sneaky,endurance:snapshot.endurance}});
function createActionChallenge(action,args,skillSnapshot=legacySkillSnapshot()){
  const snapshot={...skillSnapshot};
  const rank=snapshot.rulesVersion===1?clamp(Math.trunc(Number(snapshot.sneaky)||0),0,MAX_SKILL):0;
  const skill=sneakyModifiers({skills:{sneaky:rank}});
  const challenge=action.type==="contradiction"
    // Reading exhibits is lawyering, not burglary: SNEAKY buys nothing here.
    ?createContradictionChallenge({...args,pairs:action.pairs,decoys:action.decoys})
    :action.type==="power_cut"
    ?createPowerCutChallenge({...args,sneaky:skill.powerScore})
    :createLockpickChallenge({...args,toleranceBonus:skill.lockToleranceBonus,attemptBonus:skill.lockAttemptBonus});
  return {...challenge,skillSnapshot:snapshot};
}

function beginActionChallenge(c,o,cost){
  const optionIndex=c.opts.indexOf(o), action=o.action;
  if(optionIndex<0||!action||c.actionInProgress) return;
  if(S.hours<=0){ checkClock(); return; }
  const hoursBefore=S.hours;
  const lateExtra=Math.round(Math.max(0,cost-hoursBefore)*LATE_FATIGUE);
  if(lateExtra) log("You work past the lights. The night collects its fee. (+"+lateExtra+" FATIGUE)","bad");
  const rawWorkToil=Math.round(cost*2)+(action.fatigue||0);
  const skillSnapshot=currentSkillSnapshot();
  // ENDURANCE softens the work itself, never the explicit late-night penalty.
  const toil=workFatigue(rawWorkToil,snapshotProgression(skillSnapshot),S.scenario)+lateExtra;
  c.actionInProgress=action.id; // persisted: reload cannot reopen or duplicate the attempt
  S.actionChallenge={
    ...createActionChallenge(action,{runSeed:S.seed,caseId:c.id,actionId:action.id,cost,toil,lateExtra},skillSnapshot),
    optionIndex, startedDay:S.day, hoursBefore, caseTitle:c.title,
    actionTitle:action.title, body:action.body,
  };
  const prep=action.type==="contradiction";
  if(prep) S.runStats.contraTry++; else S.runStats.covertTry++;
  S.openCase=null;
  if(prep) SFX.open(); else SFX.crisis();
  log((prep?"CONTRADICTION BOARD: ":"COVERT ACTION STARTED: ")+action.title+" ("+cost+"h committed)","sys");
  saveGame(); notify();
}

/* ---------- EVIDENCE TIMELINE ----------
   Fires AFTER the player commits to a risky play on a case whose text carries a
   chronology. It cannot win or lose the file: it only moves THAT play's odds.
   The whole app is modal while a challenge is open, so rank (and therefore the
   board size) cannot change between begin and complete. */
const timelineCardCount=()=>S.rank>=TIMELINE_SENIOR_RANK?TIMELINE_CARDS_SENIOR:TIMELINE_CARDS;
export const timelineEligible=(c,o)=>!!(c&&o&&!c.msg&&!c.favor&&!c.timelineDone&&!c.timelineInProgress&&
  !o.safe&&!o.action&&plain(c.timeline)&&typeof c.timeline.id==="string"&&Array.isArray(c.timeline.events)&&c.timeline.events.length>=2);

function timelineRefs(ch=S&&S.actionChallenge){
  if(!S||!ch||ch.type!=="timeline") return null;
  const c=S.inbox.find(item=>!item.msg&&item.id===ch.caseId);
  const o=c&&c.opts[ch.optionIndex];
  return c&&o&&!o.safe&&!o.action&&plain(c.timeline)&&c.timeline.id===ch.actionId?{c,o}:null;
}

function beginTimelineChallenge(c,o,confirmedLate){
  const optionIndex=c.opts.indexOf(o);
  if(optionIndex<0||c.timelineInProgress||S.actionChallenge) return false;
  const skillSnapshot=currentSkillSnapshot();
  // ENDURANCE softens prep work exactly like any other billed hour.
  const toil=workFatigue(TIMELINE_FATIGUE,snapshotProgression(skillSnapshot),S.scenario);
  c.timelineDone=true;               // one offer per file, even across a mid-puzzle reload
  c.timelineInProgress=c.timeline.id;
  S.actionChallenge={
    ...createTimelineChallenge({runSeed:S.seed,caseId:c.id,optionIndex,timelineId:c.timeline.id,
      events:c.timeline.events,count:Math.min(timelineCardCount(),c.timeline.events.length),
      cost:TIMELINE_HOURS,toil,lateExtra:0}),
    skillSnapshot, optionIndex, startedDay:S.day, hoursBefore:S.hours, confirmedLate:!!confirmedLate,
    caseTitle:c.title, actionTitle:c.timeline.title, body:c.timeline.body,
  };
  S.openCase=null;
  SFX.open();
  log("EVIDENCE TIMELINE: "+c.timeline.title+" ("+TIMELINE_HOURS+"h prep committed)","sys");
  saveGame(); notify();
  return true;
}

export function moveTimelineEvent(id,direction){
  const ch=S&&S.actionChallenge;
  if(!ch||ch.phase!=="timeline"||!timelineRefs(ch)) return;
  S.actionChallenge=moveTimelineCard(ch,id,direction);
  SFX.click();
  saveGame(); notify();
}

export function submitTimelineOrder(){
  const ch=S&&S.actionChallenge;
  if(!ch||ch.phase!=="timeline"||!timelineRefs(ch)) return;
  const next=submitTimeline(ch);
  S.actionChallenge=next;
  if(next.phase==="timeline_success") SFX.open(); else SFX.lose();
  saveGame(); notify();
}

/* Walking away keeps the hour and the fatigue, but you argue a file you never
   laid end to end: the committed play goes in a little colder. Lighter than a
   muddled chronology, so sitting down with the binder is still worth it. */
export function declineTimelineChallenge(){
  const ch=S&&S.actionChallenge;
  if(!ch||ch.type!=="timeline"||ch.phase!=="timeline") return;
  const refs=timelineRefs(ch);
  S.actionChallenge=null;
  if(refs){
    delete refs.c.timelineInProgress;
    refs.c.timelineEdge={optionIndex:ch.optionIndex,value:TIMELINE_EDGE_DECLINE};
  }
  SFX.click();
  log("You go in cold. The hour stays yours; the chronology does not. ("+TIMELINE_EDGE_DECLINE+"% on this play)","bad");
  if(refs) choose(refs.c,refs.o,ch.confirmedLate,true);
  else { saveGame(); notify(); }
}

function completeTimelineChallenge(ch){
  const refs=timelineRefs(ch);
  S.actionChallenge=null;
  if(!refs){
    log("EVIDENCE TIMELINE CANCELLED: the underlying file could not be verified.","bad");
    saveGame(); notify(); return;
  }
  const {c,o}=refs;
  delete c.timelineInProgress;
  const solved=ch.phase==="timeline_success";
  c.timelineEdge={optionIndex:ch.optionIndex,value:solved?TIMELINE_EDGE_WIN:TIMELINE_EDGE_LOSS};
  if(solved){
    S.runStats.timelineW++;
    SFX.win();
    log("CHRONOLOGY LOCKED: the file reads in one direction now. (+"+TIMELINE_EDGE_WIN+"% on this play)","good");
  } else {
    S.runStats.timelineL++;
    doShake();
    log("MUDDLED CHRONOLOGY: "+ch.correct+"/"+ch.cards.length+" in place. (-"+Math.abs(TIMELINE_EDGE_LOSS)+"% on this play)","bad");
    apply({rep:TIMELINE_FAIL_REP},false,"case");
  }
  spendHours(ch.cost,ch.toil,true);
  if(S.over||fatigueCheck(ch.cost)){ saveGame(); notify(); return; }
  choose(c,o,ch.confirmedLate,true); // the play the prep was for now resolves
}

export function setLockpickPosition(value){
  const ch=S&&S.actionChallenge;
  if(!ch||ch.phase!=="lockpick") return;
  ch.position=clampLockPosition(value);
  notify();
}

export function attemptLockpick(){
  const ch=S&&S.actionChallenge;
  if(!ch||ch.phase!=="lockpick"||!actionRefs(ch)) return;
  const next=tryLockpick(ch,ch.position);
  S.actionChallenge=next;
  if(next.phase==="lock_success") SFX.open();
  else if(next.phase==="coin_call") SFX.lose();
  else SFX.click();
  saveGame(); notify();
}

export function advancePowerCutFrame(deltaMs){
  const ch=S&&S.actionChallenge;
  if(!ch||ch.phase!=="power_cut"||!actionRefs(ch)) return null;
  S.actionChallenge=advancePowerCut(ch,deltaMs);
  // The Power Cut component paints this returned snapshot locally. Avoid a
  // global store notification on every animation frame: that would rebuild
  // the whole office scene and sidebar at ~60fps on slower devices.
  return S.actionChallenge;
}

export function checkpointActionChallenge(){
  if(!S||!S.actionChallenge) return false;
  return saveGame();
}

export function stopPowerRing(){
  const ch=S&&S.actionChallenge;
  if(!ch||ch.phase!=="power_cut"||!actionRefs(ch)) return;
  const next=stopPowerCut(ch);
  S.actionChallenge=next;
  if(next.phase==="power_success") SFX.open();
  else if(next.phase==="coin_call") SFX.lose();
  else SFX.click();
  saveGame(); notify();
}

export function callActionCoin(side){
  const ch=S&&S.actionChallenge;
  if(!ch||ch.phase!=="coin_call"||!actionRefs(ch)||!["heads","tails"].includes(side)) return;
  S.actionChallenge=callCoin(ch,side);
  SFX.send();
  saveGame(); notify();
}

/* ---------- CONTRADICTION BOARD ----------
   A voluntary prep option on the file: honest hours spent hunting the exhibit
   that breaks a sworn statement. It never wins the case — a finished chart only
   strengthens that file's risky legal plays, and a collapsed one costs the
   hours you already spent. No coin call, no getting caught. */
const contradictionOpen=ch=>!!ch&&ch.type==="contradiction"&&ch.phase==="contradiction";

export function selectContradictionCard(statementId){
  const ch=S&&S.actionChallenge;
  if(!contradictionOpen(ch)||!actionRefs(ch)) return;
  S.actionChallenge=selectContradictionStatement(ch,statementId);
  SFX.click();
  saveGame(); notify();
}

export function pinContradiction(documentId){
  const ch=S&&S.actionChallenge;
  if(!contradictionOpen(ch)||!ch.selected||!actionRefs(ch)) return;
  const next=pairContradiction(ch,ch.selected,documentId);
  S.actionChallenge=next;
  if(next.phase==="contradiction_success") SFX.open();
  else if(next.phase==="contradiction_fail"){ SFX.lose(); doShake(); }
  else if(next.matched.length>(ch.matched||[]).length) SFX.send();
  else SFX.click();
  saveGame(); notify();
}

/* Stopping early banks whatever the chart already proves. */
export function closeContradictionBoard(){
  const ch=S&&S.actionChallenge;
  if(!contradictionOpen(ch)||!actionRefs(ch)) return;
  S.actionChallenge=concedeContradiction(ch);
  SFX.click();
  saveGame(); notify();
}

function completeContradictionChallenge(ch){
  const refs=actionRefs(ch);
  S.actionChallenge=null;
  if(!refs){
    log("CONTRADICTION BOARD CANCELLED: the underlying file could not be verified.","bad");
    saveGame(); notify(); return;
  }
  const {c,o,action}=refs;
  delete c.actionInProgress;
  c.opts=c.opts.filter(option=>option!==o); // one sitting per file, whatever it produced
  const found=ch.matched.length, total=ch.solution.length;
  const solved=ch.phase==="contradiction_success";
  const edge=solved?(action.edge||0):Math.floor((action.edge||0)*found/Math.max(1,total));
  const out=solved?action.success:(found?action.partial:action.miss);

  if(solved) S.runStats.contraW++; else S.runStats.contraL++;
  if(edge>0){
    c.covertEdge=Math.max(c.covertEdge||0,edge); // the file's evidence edge, however it was earned
    c.covertNote=(solved&&action.edgeText)||("CONTRADICTION CHART — "+found+"/"+total+" proven (+"+edge+"%)");
  }
  if(solved){ SFX.win(); log("["+c.title+"] "+out.txt,"good"); }
  else { SFX.lose(); log("["+c.title+"] "+out.txt,found?"sys":"bad"); if(!found) doShake(); }
  apply(out.fx,false,"case");
  if(!S.over) S.openCase=c; // the file stays on the desk: the legal play is still yours to make

  spendHours(ch.cost,ch.toil,true);
  if(!S.over&&fatigueCheck(ch.cost)) return;
  if(!S.over){ maybeDemand(); checkClock(); }
  saveGame(); notify();
}

export function completeActionChallenge(){
  const ch=S&&S.actionChallenge;
  if(ch&&ch.type==="timeline"){
    if(["timeline_success","timeline_fail"].includes(ch.phase)) completeTimelineChallenge(ch);
    return;
  }
  if(ch&&ch.type==="contradiction"){
    if(["contradiction_success","contradiction_fail"].includes(ch.phase)) completeContradictionChallenge(ch);
    return;
  }
  if(!ch||!["lock_success","power_success","coin_result"].includes(ch.phase)) return;
  const refs=actionRefs(ch);
  S.actionChallenge=null;
  if(!refs){
    log("COVERT ACTION CANCELLED: the underlying file could not be verified.","bad");
    saveGame(); notify(); return;
  }
  const {c,o,action}=refs;
  delete c.actionInProgress;
  c.opts=c.opts.filter(option=>option!==o); // one attempt, regardless of its outcome
  const success=ch.phase==="lock_success"||ch.phase==="power_success", escaped=!success&&!!ch.escaped;
  const out=success?action.success:(escaped?action.escape:action.caught);

  if(success){
    S.runStats.covertW++;
    awardXp(COVERT_XP.success,"COVERT ACTION · CLEAN");
    c.covertEdge=Math.max(c.covertEdge||0,action.edge||0);
    c.covertNote=action.edgeText||"Recovered evidence strengthens every risky legal play.";
    SFX.win();
    log("["+c.title+"] "+out.txt,"good");
    apply(out.fx,false,"covert");
    if(!S.over) S.openCase=c;
  } else if(escaped){
    S.runStats.covertEscape++;
    awardXp(COVERT_XP.escape,"COVERT ACTION · ESCAPED");
    SFX.click();
    log("["+c.title+"] "+out.txt,"sys");
    apply(out.fx,false,"covert");
    if(!S.over) S.openCase=c;
  } else {
    S.runStats.covertCaught++;
    awardXp(COVERT_XP.caught,"COVERT ACTION · CAUGHT");
    S.today.resolved++;
    S.inbox=S.inbox.filter(item=>item!==c);
    archiveCase(c,o.text,false,out.txt,"covert action — caught");
    SFX.lose(); doShake();
    log("["+c.title+"] "+out.txt,"bad");
    apply(out.fx,false,"covert");
    if(!S.over){ maybeLoseClientOnFail(); nemesisGain(4,true); }
  }

  spendHours(ch.cost,ch.toil,true);
  if(!S.over&&fatigueCheck(ch.cost)) return;
  if(!S.over){ checkPromotion(); maybeDemand(); checkClock(); }
  saveGame(); notify();
}

export function choose(c,o,confirmedLate,timelinePrepped){
  if(!S||S.actionChallenge||!c||!o||!S.inbox.includes(c)||c.pending||c.delegated) return; // stale/double clicks resolve nothing twice
  SFX.click();
  const cost0=optHours(c,o);
  // the job runs past quitting time? warn first — pushing through costs extra
  if(!confirmedLate&&cost0>S.hours&&S.hours>0){
    const over=Math.round((cost0-S.hours)*4)/4, extra=Math.round(over*LATE_FATIGUE);
    S.pendingChoice={c,o};
    S.event={id:"latework",title:wallTime()+" — THE DAY IS ENDING",
      body:"This play needs "+cost0+"h. You have "+S.hours+"h before the building empties. "+
        "Finishing tonight means "+over+"h into the dark — and that kind of hour bills YOU: +"+extra+" FATIGUE on top of the usual. "+
        (S.fatigue>=50?"You're already running on fumes. ":"")+
        "Are you sure you want to see this through?",
      opts:[
        {text:"Push through. Finish it tonight. (+"+extra+" extra FATIGUE)",base:100,safe:true,lateGo:true,ok:{fx:{},txt:""}},
        {text:"Step back. The file waits for the morning.",base:100,safe:true,lateNo:true,ok:{fx:{},txt:""}}]};
    notify(); return;
  }
  // A rare prep window opens BEFORE any money changes hands: resuming this play
  // after the challenge must not charge a bribe (or anything else) twice.
  if(!timelinePrepped&&timelineEligible(c,o)&&rand()*100<TIMELINE_TRIGGER&&beginTimelineChallenge(c,o,confirmedLate)) return;
  if(o.bribe){ // the golf money leaves your account win or lose
    if(S.money<o.bribe){ log("You can't afford the judge's 'green fees'.","bad"); notify(); return; }
    apply({money:-o.bribe},true);
  }
  if(o.action){ beginActionChallenge(c,o,cost0); return; }
  logJudgeMemory(c,o);
  const warningSnapshot=finalWarningSnapshot(); // earned record is measured before this roll
  const p=chance(o,c);
  const lateExtra=confirmedLate?Math.round(Math.max(0,cost0-S.hours)*LATE_FATIGUE):0;
  if(lateExtra) log("You work past the lights. The night collects its fee. (+"+lateExtra+" FATIGUE)","bad");
  const cost=cost0, workToil=Math.round(cost*2+(o.safe?2:0)); // careful play grinds you down too
  const toil=workFatigue(workToil)+lateExtra; // the night collects its full fee regardless of ENDURANCE
  if(o.delay){
    const win=rand()*100<p;
    c.pending={day:S.day+o.delay,win,o,
      finalWarningSnapshot:o.style==="aggressive"?warningSnapshot:undefined,
      judgeMemorySnapshot:c.judge?judgeMemoryArchiveText(c):""};
    trackChoice(c,o,win); SFX.send();
    log("Sent: '"+o.text+"' — response in "+o.delay+" day(s). ("+cost+"h)","sys");
    S.openCase=null;
    spendHours(cost,toil,true);
    if(fatigueCheck(cost)) return;
    maybeDemand(); checkClock();
    saveGame(); notify(); return;
  }
  S.inbox=S.inbox.filter(x=>x!==c); S.openCase=null;
  const win=rand()*100<p, out=win?o.ok:o.fail;
  const coast=safeCoastPenalty(c,o); // measured before this play joins the streak
  trackChoice(c,o,win);
  archiveCase(c,o.text,win,out.txt,c.favor?"favor":"");
  rememberJudgeOutcome(c,o,win);
  if(o.bribe&&win&&S.runStats.bribeW>=3) ach("bribe3");
  if(win){
    SFX.win();
    log("["+c.title+"] "+out.txt,"good");
    awardXp(caseXpFor(c,o,true),"CASE · "+c.title); apply(coastFx(out.fx,coast),false,c.favor?"favor":c.big?"big_case":"case");
    if(coast) log("COASTING: "+(coast.step+1)+" quiet settlements in a row. The floor notices what you don't take on.","bad");
    if((c.tier||0)>=1&&!c.favor){ apply({firm:1},true,c.big?"big_case":"case"); maybeImpressClient(c); } // wins keep the lights on — and attract logos
    if(((out.fx&&out.fx.rep)||0)+((out.fx&&out.fx.inf)||0)>=10) flash("HENDERED!");
  } else {
    SFX.lose();
    log("["+c.title+"] "+out.txt,"bad");
    awardXp(caseXpFor(c,o,false),"CASE · "+c.title);
    apply(out.fx,false,c.favor?"favor":c.big?"big_case":"case",aggressiveFailureContext(o,warningSnapshot));
    if((c.tier||0)>=1&&!c.favor){ apply({firm:-1},true,c.big?"big_case":"case"); maybeLoseClientOnFail(); }
    doShake(); if(!c.favor) nemesisGain(3,true);
  }
  if(c.favor){ // reverse favors: the relationship is the real payout
    const n=S.npcs.find(x=>x.id===c.npc), d=win?(o.relOk||0):(o.relFail||0);
    if(n&&d){ relNpc(n,d); log(n.name+(d>0?" will remember this. (+":" files this away. (")+d+" rel)",d>0?"good":"bad"); }
  }
  if(out.client&&out.client.boost){ // the war is won: the retainer doubles, permanently
    const cl=S.clients.find(x=>x.name===out.client.boost);
    if(cl){ cl.fee=Math.min(800,cl.fee*2); log("RETAINER DOUBLED: "+cl.name+" now pays $"+cl.fee+"/wk.","good"); }
  }
  if(c.big){ // THE {CLIENT} WAR bookkeeping: press on, or the matter ends here
    if(out.next) S.bigCase={client:c.big.client, stage:c.big.stage+1};
    else { endClientWar(c.big.client);
      if(!c.big.final&&win&&o.safe) log("THE "+c.big.client.toUpperCase()+" WAR ends early, by choice. Wars you skip don't pay like wars you win.","sys"); }
  }
  if(out.next) queueFollowup(out.next);
  spendHours(cost,toil,true);
  if(fatigueCheck(cost)) return;
  checkPromotion();
  maybeDemand(); checkClock();
  saveGame(); notify();
}

/* ---------- the client book (parody brands, weekly retainers) ---------- */
function signClient(){
  if(S.clients.length>=CLIENT_CAP(S.rank)||!S.clientPool.length) return null;
  const c=makeClient(S.clientPool.pop());
  S.clients.push(c);
  return c;
}
function loseClient(name){
  S.clients=S.clients.filter(c=>c.name!==name);
  log("CLIENT LOST: "+name+". Their logo comes off the lobby wall.","bad");
  if(endClientWar(name)){ // no client, no inbox stage, no queued follow-up, no war
    log("THE "+name.toUpperCase()+" WAR ends the only way wars end without clients: quietly, unpaid.","bad");
  }
}

/* a public failure makes clients nervous — some walk */
function maybeLoseClientOnFail(){
  if(!S.clients.length) return;
  if(rand()<clientConfidenceOdds().walk){
    const c=rnd(S.clients);
    loseClient(c.name);
    pushMsg("CLIENT LOST: "+c.name, rnd([
      "'We read the coverage. We're concerned.'",
      "'Our board asked questions we couldn't answer.'",
      "'Nothing personal. Everything reputational.'"]));
  }
}

/* a strong win can bring a client to YOU — reputation opens the door */
function maybeImpressClient(c){
  if(S.clients.length>=CLIENT_CAP(S.rank)||!S.clientPool.length) return;
  if(rand()<clientConfidenceOdds().impress){
    const nc=signClient();
    if(nc){
      const ref=c.title.replace(/^(CASE|COURT|MEMO|APPEAL|LAWSUIT|Errand|Doc review): ?/,"").replace(/ — .*/,"").trim();
      pushMsg("NEW CLIENT: "+nc.name,
        "'We followed your work on the "+ref+" matter. We were impressed. Represent us.' ($"+nc.fee+"/wk)");
    }
  }
}

/* mornings can bring an acquisition path: an inherited account (if the firm
   likes you) or a dinner invitation you still have to land */
export function clientAcquisition(){
  if(S.clients.length>=CLIENT_CAP(S.rank)||!S.clientPool.length) return;
  if(rand()>=clientConfidenceOdds().acquisition) return;
  if(S.rep>=55&&rand()<.5){
    const nc=signClient();
    if(nc) pushMsg("INHERITANCE","Partner "+rnd(PARTNERS)+" retires to 'consulting'. On the way out: 'The "+nc.name+" account? Give it to the one with the future.' Apparently that's you. ($"+nc.fee+"/wk)");
  } else if(!S.event){
    S.event=buildDinnerEvent(S.clientPool[S.clientPool.length-1]);
    SFX.bell();
  }
}

/* ---------- Name Partner endgame: the roster is yours, so are the lawsuits ---------- */

/* every morning some employees act; their quality moves FIRM health */
function rosterTick(){
  if(!S.roster) return;
  let drift=0, wins=0, losses=0;
  const winGain=balanceExperiment&&Number.isFinite(balanceExperiment.rosterWinGain)?
    Math.max(0,balanceExperiment.rosterWinGain):ROSTER_WIN_GAIN;
  const lossCost=balanceExperiment&&Number.isFinite(balanceExperiment.rosterLossCost)?
    Math.max(0,balanceExperiment.rosterLossCost):ROSTER_LOSS_COST;
  S.roster.forEach(e=>{
    if(rand()<ROSTER_ACTIVITY){ const win=rand()*100<rosterWinChance(e.impact);
      if(win){ e.won++; wins++; drift+=winGain; }
      else { e.lost++; losses++; drift-=lossCost; }
    }
  });
  const cappedDrift=clamp(drift,-3,3);
  if(cappedDrift) apply({firm:cappedDrift},true,"roster");
  const overhead=balanceExperiment&&Number.isFinite(balanceExperiment.firmDailyOverhead)?
    Math.max(0,Math.round(balanceExperiment.firmDailyOverhead)):
    balanceExperiment&&Number.isFinite(balanceExperiment.firmPayrollDivisor)&&balanceExperiment.firmPayrollDivisor>0?
      Math.ceil(S.roster.length/balanceExperiment.firmPayrollDivisor):firmPayrollCost(S.roster.length);
  if(overhead&&!S.over) apply({firm:-overhead},true,"payroll");
  if(balanceProbe) balanceProbe({kind:"roster",day:S.day,wins,losses,rawDrift:drift,cappedDrift,
    overhead,employees:S.roster.length,meanImpact:S.roster.length?S.roster.reduce((sum,e)=>sum+e.impact,0)/S.roster.length:0});
}

/* litigation heat: decays nightly but never reaches zero once you've fired
   anyone. High heat = an ex-employee lawsuit lands on YOUR desk. */
function litigationTick(){
  if(!S.everFired) return;
  S.fireHeat=Math.max(S.fireHeat*HEAT_DECAY,HEAT_MIN);
  if(rand()*100<Math.min(30,S.fireHeat)){
    S.inbox.unshift(instantiateCase(buildLawsuit(rnd(S.firedNames))));
    S.fireHeat=Math.max(S.fireHeat*.5,HEAT_MIN);
    if(balanceProbe) balanceProbe({kind:"lawsuit",day:S.day,heat:S.fireHeat});
    log("A process server is at reception. It's for the firm. It's about you.","bad");
  }
}

function dismissEmployee(e,heat){
  S.roster=S.roster.filter(x=>x!==e);
  if(e.src==="npc"){
    // hand back any file they were mid-delegation on BEFORE they leave the floor,
    // or resolveDelegated / the inbox would dereference a colleague who's gone
    S.inbox.forEach(c=>{ if(c.delegated&&c.delegated.npc===e.npcId){ c.delegated=null; } });
    S.npcs=S.npcs.filter(n=>n.id!==e.npcId);
  }
  if(e.src==="nemesis"){ S.nemesis=null; log(e.name+" — your rival — is escorted out. The floor is very quiet.","sys"); }
  S.fireHeat+=heat; S.everFired=true; S.firedNames.push(e.name);
  S.runStats.fired=(S.runStats.fired||0)+1;
  apply({firm:-2},true,"firing"); // morale: everyone updates their résumé a little
  if(balanceProbe) balanceProbe({kind:"firing",day:S.day,senior:!!e.senior,impact:e.impact,employees:S.roster.length});
  log("FIRED: "+e.name+". Security walks them out. They walk slowly, memorizing faces.","sys");
}
export function fireEmployee(id){
  if(!S.roster) return;
  const e=S.roster.find(x=>x.id===id); if(!e) return;
  SFX.send();
  if(e.senior){ // senior partners need a partner vote
    const p=clamp(30+S.rep/2+S.inf/4,20,90);
    if(rand()*100<p){ log("The vote carries. "+e.name+" is out.","sys"); dismissEmployee(e,FIRE_HEAT_SENIOR); }
    else { apply({rep:-6,firm:-3},false,"firing"); log("The vote FAILS. "+e.name+" stays — and remembers who called it.","bad"); doShake(); }
  } else dismissEmployee(e,FIRE_HEAT);
  saveGame(); notify();
}
export const voteChance=()=>clamp(30+S.rep/2+S.inf/4,20,90);

/* the partnership buy-in: rank 2 -> 3 costs real money */
export function payBuyIn(){
  if(S.rank!==2||S.buyinPaid||S.inf<RANK_REQ[2]||S.money<BUYIN_COST) return;
  if(S.firm<promotionFirmRequirement(2)){ checkPromotion(); return; }
  SFX.send();
  S.buyinPaid=true;
  log("Buy-in wired. The partnership agreement has your name in actual ink.","sys");
  apply({money:-BUYIN_COST},true);
  checkPromotion(); saveGame(); notify();
}

/* STANDARD recovery valve: trade scarce desk time for a credible turnaround
   plan. The cooldown prevents converting every spare hour into free FIRM. */
export const canPitchTurnaround=()=>!!S&&S.mode==="standard"&&!S.over&&!S.summary&&!S.event&&!S.leaving&&
  S.firm<FIRM_STABLE&&S.day>=(S.firmPlanDay||0)&&S.hours>=FIRM_PLAN_HOURS;
export function pitchTurnaround(){
  if(!canPitchTurnaround()) return;
  SFX.send();
  spendHours(FIRM_PLAN_HOURS,FIRM_PLAN_FATIGUE);
  S.firmPlanDay=S.day+FIRM_PLAN_COOLDOWN;
  log("TURNAROUND PLAN: clients, staffing, cash flow — ninety minutes of promises with footnotes. (+"+FIRM_PLAN_GAIN+" FIRM, "+FIRM_PLAN_HOURS+"h)","sys");
  apply({firm:FIRM_PLAN_GAIN},true,"turnaround");
  if(fatigueCheck(FIRM_PLAN_HOURS)) return;
  checkPromotion();
  checkClock(); saveGame(); notify();
}

/* an NPC asks YOU for help — a one-day file where rel is the real stake */
export function spawnFavor(){
  if(!S.npcs.length) return; // endless: you may have fired the entire floor
  const n=rnd(S.npcs);
  S.inbox.unshift(instantiateCase(buildFavor(n)));
  log(n.name.split(" ")[0]+" left a favor on your desk. Due today.","sys");
  notify();
}

/* hand a case to a colleague (unlocks at Senior Associate; court cases excluded —
   you can't send a paralegal to argue a motion). Die is rolled now, revealed tomorrow. */
export function delegateCase(c,npcId){
  if(!S||S.actionChallenge||(S.rank<1&&S.scenario!=="boomerang")||c.judge||c.msg||c.pending||c.delegated||c.favor||c.big) return; // no delegating YOUR client's war
  const dailyLimit=delegationDailyLimit();
  if(S.today.delegated>=dailyLimit){
    log("The floor has limits: today's handoff capacity is already spoken for.","sys"); notify(); return;
  }
  const n=S.npcs.find(x=>x.id===npcId);
  if(!n) return; // stale UI/save references must never dereference a fired or forged colleague
  SFX.send();
  const win=rand()*100<delegationChance(n);
  c.delegated={npc:n.id, day:S.day+1, win, silent:n.trait==="Lazy"&&!win&&rand()<.65};
  S.runStats.deleg[n.id]=(S.runStats.deleg[n.id]||0)+1;
  S.today.delegated++;
  if(n.trait==="Traitor"&&S.runStats.deleg[n.id]>=5) ach("traitor5");
  S.openCase=null;
  log("Handed '"+c.title+"' to "+n.name+". Report tomorrow. ("+DELEGATE_HOURS+"h)","sys");
  spendHours(DELEGATE_HOURS,1);
  if(fatigueCheck(DELEGATE_HOURS)) return;
  maybeDemand(); checkClock();
  saveGame(); notify();
}

/* resolve a crisis option (event overlay button) */
export function resolveCrisis(o){
  if(!S||S.actionChallenge||!S.event||!o||!Array.isArray(S.event.opts)||!S.event.opts.includes(o)) return; // stale/double clicks resolve nothing twice
  SFX.click();
  // the quitting-time prompt: go home or push into overtime
  // late-work confirmation: resume or abandon the pending play
  if(o.lateGo){ const pc=S.pendingChoice; S.event=null; S.pendingChoice=null; if(pc) choose(pc.c,pc.o,true); return; }
  if(o.lateNo){ S.event=null; S.pendingChoice=null; log("You put the file down. It will still be there tomorrow. Files always are.","sys"); notify(); return; }
  if(o.home){ S.event=null; endDay(); return; }
  if(o.ot){
    S.event=null;
    if(!canOvertime()){
      log("No more overtime. Security wants the floor empty and your keycard has stopped negotiating.","sys");
      checkClock(); saveGame(); notify(); return;
    }
    const fatigue=overtimeFatigue();
    S.hours+=OVERTIME_HOURS; S.otHours+=OVERTIME_HOURS; S.otToday++;
    S.fatigue=clamp(S.fatigue+fatigue,0,100);
    log("Overtime block "+S.otToday+"/"+OVERTIME_LIMIT+". The building empties around you. (+"+OVERTIME_HOURS+"h, +"+fatigue+" FATIGUE)","sys");
    if(fatigueCheck(OVERTIME_HOURS)) return; // every hour in the block contributes to the exhaustion hazard
    saveGame(); notify(); return;
  }
  const ev=S.event, resumeMorning=!!(ev.fraudKind&&S.fraudRisk&&S.fraudRisk.morningPhase==="resume"),
    p=chance(o,ev), warningSnapshot=finalWarningSnapshot();
  S.event=null;
  const win=rand()*100<p, out=win?o.ok:o.fail;
  trackChoice(null,o,win);
  if(o.hours||o.fatigue){
    spendHours(o.hours||0,o.fatigue||0);
    if((o.fatigue||0)>0&&fatigueCheck(o.hours||1)) return;
  } // boss chores cost time and stamina; an exhaustion incident ends the action and the day
  if(ev&&ev.npc){ // NPC story scenes move the relationship
    const n=S.npcs.find(x=>x.id===ev.npc), d=win?(o.relOk||0):(o.relFail||0);
    if(n&&d){ relNpc(n,d); log(n.name+(d>0?" won't forget this. (+":" recalibrates. (")+d+" rel)",d>0?"good":"bad"); }
  }
  const infSource=ev&&ev.fraudKind?"fraud":ev&&ev.weekend?"weekend":ev&&ev.story?"story":ev&&ev.demand?"demand":
    ev&&/^g_/.test(ev.id||"")?"client_event":"crisis";
  const grantsCrisisXp=infSource==="crisis";
  const resolveFraudState=()=>{
    const effect=out&&out.fraud, risk=S.fraudRisk;
    if(!effect||!risk||S.scenario!=="fraud"||!ev.fraudKind) return;
    const before=risk.suspicion;
    risk.morningPhase="idle";
    risk.suspicion=clamp(effect.set,0,3);
    if(effect.contained) risk.contained++;
    risk.pendingKind=effect.schedule&&risk.suspicion>0?"inquiry":null;
    risk.pendingDay=risk.pendingKind?S.day+1:0;
    if(effect.schedule)
      log("IDENTITY PRESSURE: "+before+" → "+risk.suspicion+". A follow-up lands day "+risk.pendingDay+".","bad");
    else if(effect.contained)
      log("IDENTITY PRESSURE CONTAINED: suspicion settles at "+risk.suspicion+"/3.","good");
    if(balanceProbe) balanceProbe({kind:"fraud_stage",day:S.day,eventKind:ev.fraudKind,stage:ev.fraudStage,
      style:o.safe?"safe":o.style||"neutral",win,scheduled:!!risk.pendingKind,contained:!!effect.contained,
      exposed:!!(!win&&out.expose),suspicion:risk.suspicion});
  };
  if(!win&&out.expose){
    SFX.lose(); log("[CRISIS] "+out.txt,"bad"); resolveFraudState();
    gameOver("EXPOSED","There is no bar record. No law school. No you-with-a-JD. The audit found the empty space where your credentials should be, and the firm found it at the same time. Security is very polite about it. The Fraud is over."); return;
  }
  if(win){ SFX.win(); log("[CRISIS] "+out.txt,"good");
    if(grantsCrisisXp) awardXp(CRISIS_XP[o.safe?"safe":"win"],"CRISIS · "+ev.title);
    resolveFraudState();
    apply(out.fx,false,infSource); if(((out.fx&&out.fx.inf)||0)>=10) flash("HENDERED!"); }
  else { SFX.lose(); log("[CRISIS] "+out.txt,"bad");
    if(grantsCrisisXp) awardXp(CRISIS_XP.loss,"CRISIS · "+ev.title);
    resolveFraudState();
    apply(out.fx,false,infSource,out.expose?null:aggressiveFailureContext(o,warningSnapshot));
    apply({firm:-2},true,infSource); doShake(); nemesisGain(3,true); }
  if(out.golf) S.golfEdge=true; // the next court judge arrives pre-read
  if(out.client){ // global events move the client book
    if(out.client.lose) loseClient(out.client.lose);
    if(out.client.gain){
      const nc=signClient();
      if(nc){ if(out.client.double) nc.fee*=2; log("NEW CLIENT: "+nc.name+" ($"+nc.fee+"/wk retainer).","good"); }
      else log("The prospect signs... with someone who has desk space. The book is full.","sys");
    }
  }
  if(out.next) queueFollowup(out.next); // crises may chain into case files too
  if(resumeMorning){
    if(!S.over){
      continueMorning();
      if(!S.over){ saveGame(); notify(); }
    }
    return;
  }
  checkPromotion(); checkClock(); saveGame(); notify();
}

function exceptionalPromotionOpen(morning){
  const cfg=exceptionalReviewConfig();
  if(!morning||!cfg||S.rank!==3||S.exceptionalReviewDay||S.inf<RANK_REQ[3]||
    S.rep<cfg.minRep||S.firm<promotionFirmRequirement(3)) return false;
  const seniorDay=S.seniorPartnerDay||S.day;
  if(S.day<seniorDay+cfg.wait||(S.reviewMomentum||0)<cfg.threshold) return false;
  S.exceptionalReviewDay=S.day;
  if(balanceProbe) balanceProbe({kind:"exceptional_review",day:S.day,momentum:S.reviewMomentum});
  log("EXCEPTIONAL REVIEW: sustained work above the Influence ceiling brought the Name Partner vote forward.","sys");
  return true;
}
function promotionWindowOpen(morning){
  if(!weeklyPromotionsEnabled()) return true;
  // The review is completed on Friday's end-of-day screen; its decision lands
  // the following morning. One review can grant at most one rung of the ladder.
  if(S.day>1&&(S.day-1)%WEEK_LEN===0){
    if(S.promotionReviewDay===S.day) return false;
    S.promotionReviewDay=S.day;
    return true;
  }
  return exceptionalPromotionOpen(morning);
}
function checkPromotion(morning=false){
  if(S.over) return;
  if(!promotionWindowOpen(morning)){
    if(S.rank<4&&S.inf>=RANK_REQ[S.rank]&&S.promotionHintRank!==S.rank){
      S.promotionHintRank=S.rank; SFX.bell();
      log("PROMOTION READY: your numbers qualify. Titles change after Friday's partner review.","sys");
    }
    return;
  }
  const oldRank=S.rank;
  while(S.rank<4 && S.inf>=RANK_REQ[S.rank]){
    const firmReq=promotionFirmRequirement(S.rank);
    if(S.firm<firmReq){
      if(S.firmGateHintRank!==S.rank){
        S.firmGateHintRank=S.rank; SFX.bell();
        log("PROMOTION HELD: the partnership will not elevate you while FIRM is "+S.firm+"/"+firmReq+". Pitch a turnaround from the FIRM CONTROL panel.","bad");
      }
      break;
    }
    // Junior Partner -> Senior Partner: influence isn't enough, you buy in
    if(S.rank===2&&!S.buyinPaid){
      if(!S.buyinHinted){ S.buyinHinted=true; SFX.bell();
        log("The Senior Partnership is yours — once you buy in. ($"+BUYIN_COST+", see EXPENSES.)","sys"); }
      break;
    }
    if(S.rank===3&&S.mode==="endless"&&S.firm<FIRM_COLLAPSE){
      gameOver("FIRM COLLAPSE","The partnership offers you the nameplate and the insolvency in the same envelope. There is no firm left to inherit.");
      return;
    }
    S.rank++; S.firmGateHintRank=null; S.promotionHintRank=null;
    if(S.rank===3){ S.seniorPartnerDay=S.day; S.reviewMomentum=0; S.exceptionalReviewHinted=false; }
    if(S.rank===4){ gameWin(); return; }
    SFX.promo(); flash("PROMOTED!");
    log("PROMOTED to "+RANKS[S.rank]+"!","sys");
    if(S.rank===1) log("Senior Associate perk unlocked: DELEGATE cases from the file view.","sys");
    apply({rep:5},true); // (the book doesn't grow with the title — clients are earned)
    if(weeklyPromotionsEnabled()) break;
    if(S.rank===3) break; // reaching Senior Partner (via buy-in) must NOT cascade straight to Name Partner
  }
  if(S.rank>oldRank&&!S.over) promoWalk(oldRank);
}

/* promotion moment: walk out of the OLD office, walk into the new one */
function promoWalk(oldRank){
  if(S.leaving) return; // already mid-transition (e.g. end of day) — skip the ceremony
  S.sceneRank=oldRank; S.leaving=true; S.charAnim="leaving";
  log("You pack one box. It's mostly coffee mugs.","sys"); notify();
  setTimeout(()=>{
    if(!S||S.over){ if(S) S.sceneRank=null; return; }
    S.sceneRank=null; S.leaving=false; S.charAnim="arriving"; notify();
    setTimeout(()=>{ if(S&&S.charAnim==="arriving"){ S.charAnim="working"; notify(); } },1500);
  },1500);
}

function tryFinalWarning(context){
  const cfg=finalWarningConfig(), snap=context&&context.finalWarning;
  if(!cfg||S.finalWarningUsed||!context?.aggressiveFailure||!snap||
    snap.bold<cfg.bold||snap.wins<cfg.wins||snap.wins<=snap.losses) return false;
  S.finalWarningUsed=true;
  if(balanceProbe) balanceProbe({kind:"final_warning",day:S.day,bold:snap.bold,wins:snap.wins,losses:snap.losses});
  SFX.bell(); flash("FINAL WARNING");
  log("FINAL WARNING: your winning bluff record buys one last meeting instead of a cardboard box.","sys");
  apply({rep:cfg.rep-S.rep,bold:-cfg.boldCost},false,"final_warning");
  pushMsg("FINAL WARNING","Hardwick stops Security at the elevator. Your record bought one exception. Reputation restored to "+cfg.rep+"; the scare cost "+cfg.boldCost+" BOLD. There will not be another.");
  return true;
}

function checkEndings(endingContext){
  if(S.over) return;
  if(S.rep<REP_FIRED){
    if(tryFinalWarning(endingContext)) return;
    gameOver("FIRED","Your reputation fell below what Parson Henderson tolerates (which is very little). Security walks you out. They keep the fancy outfit."); return;
  }
  // once the name is yours, so is the sinking
  if((S.endlessWon||S.rank===4)&&S.firm<FIRM_COLLAPSE)
    gameOver("FIRM COLLAPSE","Clients gone, partners fled, the lease unpaid. The sign painters return — this time with solvent. Your name comes off the wall faster than it went up.");
}

/* end-of-run breakdown for the final screen */
function ledger(){
  const r=S.runStats, top=Object.entries(r.deleg).sort((a,b)=>b[1]-a[1])[0];
  const topName=top&&S.npcs.find(n=>n.id===top[0]);
  return ["— RUN LEDGER —",
    "Bluffs: "+r.bluffW+" landed / "+r.bluffL+" blew up · Technical: "+r.techW+"W/"+r.techL+"L · Safe plays: "+r.safe,
    "Covert actions: "+r.covertTry+" attempted · "+r.covertW+" opened · "+r.covertEscape+" escaped · "+r.covertCaught+" caught",
    "Case prep: "+r.timelineW+" chronologies locked / "+r.timelineL+" muddled · "+
      r.contraTry+" contradiction charts ("+r.contraW+" complete)",
    "Final Warning: "+(S.finalWarningUsed?"SPENT":"unused"),
    "Bribes offered: "+r.bribeTry+(r.bribeTry?" ("+r.bribeW+" taken)":""),
    "Favors: "+r.favorHelp+" helped · "+r.favorNo+" declined"+
      (topName?" · Most delegated: "+topName.name+" ("+top[1]+"×)":""),
    "Deadlines missed: "+r.miss+" · Crises faced: "+r.crises+
      (r.fired?" · Employees fired: "+r.fired:"")+
      (S.nemesis?" · "+S.nemesis.name+" peaked at "+RANKS[S.nemesis.rank]+".":" · Your rival didn't outlast you.")];
}
function gameOver(title,txt){
  S.over=true; SFX.fired(); stopAmbience(); doShake();
  terminalClearDone=clearSave(); recordRun(false,title);
  const seal={
    defector:"Across town, Snidely Fitch sends a one-line note: 'We kept your old office open.' It is not an invitation.",
    boomerang:"Second exits are quieter. Marv keeps the mug again; the rest of the floor calls it precedent.",
  }[S.scenario];
  showSummary("GAME OVER: "+title,[txt,"","Survived "+S.day+" day(s) as "+RANKS[S.rank]+".",
    ...(seal?["",seal]:[]),"",...ledger()],"NEW GAME","reload");
}
function winAchievements(){
  ach("win");
  if(S.difficulty==="realistic") ach("win_realistic");
  if(S.runStats.safe===0) ach("win_nosafe");
  if(S.scenario==="defector") ach("win_defector");
  if(S.scenario==="boomerang") ach("win_boomerang");
  if(S.mode==="ironman") ach("win_ironman");
  if(S.bold>=65) ach("win_bold");
}
function gameWin(){
  winAchievements();
  if(S.mode==="endless"&&!S.endlessWon){
    // endless: take the title, keep the inbox — and inherit the payroll
    S.endlessWon=true; SFX.promo(); flash("NAME PARTNER!");
    recordRun(true,"NAME PARTNER");
    S.roster=buildRoster(S.npcs,S.nemesis);
    showSummary("YOU MADE NAME PARTNER — AND KEPT GOING",[
      "The sign painters add your name to the wall. The inbox does not attend the ceremony.",
      "ENDLESS: the firm is yours now — payroll included. Open the FIRM tab to meet it.",
      "Current operating load: -"+firmPayrollCost(S.roster.length)+" FIRM each morning. Roster failures cost "+ROSTER_LOSS_COST+"; wins restore "+ROSTER_WIN_GAIN+".",
      "Keep FIRM health above "+FIRM_COLLAPSE+" or the name comes off the wall.",
      "Day "+S.day+". Reputation "+S.rep+". Boldness "+S.bold+". Firm "+S.firm+"."],
      "KEEP BILLING","dismiss");
    return;
  }
  S.over=true; SFX.promo(); stopAmbience();
  terminalClearDone=clearSave(); recordRun(true,"NAME PARTNER");
  // the ending remembers HOW you climbed
  const epithet=
    S.bold>=65?"THE SHARK. You bluffed judges, partners and probability itself. The wall flinched first.":
    S.rep>=70?"THE BELOVED. Associates fetch your coffee out of genuine affection. Nobody remembers why they feared Fridays.":
    S.bold<=32?"THE SURVIVOR. You never once gambled. It turns out the building respects fear.":
    "THE OPERATOR. Nobody can quite explain how you did it. That is precisely the skill.";
  const seal={
    fraud:"P.S. You still never went to law school. The diploma on your wall is a photocopy of a rumor.",
    debtor:"The loans are PAID. The collectors send a fruit basket and, out of habit, an invoice for it.",
    legacy:"Your parent signs the wall change-order personally. They spell your name right. First try.",
    defector:"Across town, Snidely Fitch's name partner reads the announcement twice. By lunch, your old office has been converted into document storage.",
    boomerang:"The badge they once deactivated now opens the Name Partner suite. Marv puts your old mug on the desk. 'Knew you'd need it.'",
  }[S.scenario];
  showSummary("YOU MADE NAME PARTNER",[
    "The sign painters are already on the wall: PARSON HENDERSON & YOU.",
    epithet,
    "Day "+S.day+". Reputation "+S.rep+". Boldness "+S.bold+". Firm "+S.firm+".",
    ...(seal?[seal]:[]),
    S.nemesis?"Down the hall, "+S.nemesis.name+" quietly clears out his desk.":"Your rival's desk has been empty for a while now.","",
    "You've been HENDERED. Permanently.","",...ledger()],"NEW GAME","reload");
}

/* ---------- money sinks ---------- */
export function buySuit(){
  if(S.money<S.suitCost) return;
  SFX.send();
  const cost=S.suitCost;
  S.suitCost=Math.round(S.suitCost*1.5/100)*100; // the next one is fancier
  log("New tailored suit. The floor pretends not to stare. It stares.","sys");
  apply({money:-cost,rep:8});
  saveGame();
}
export function bribeMarv(){
  if(S.money<PRICES.marv) return;
  SFX.send();
  S.marvBribes++;
  const opener=S.marvBribes===1?"Marv pockets it smoothly — first time's awkward for everyone else. '":
    S.marvBribes>=3?"Marv: 'The usual arrangement.' He's already talking. '":"Marv (copy room): '";
  const unknown=S.npcs.filter(n=>!n.known);
  if(unknown.length){
    const n=rnd(unknown); n.known=true; relNpc(n,5);
    log(opener+n.name+"? "+n.trait+". You didn't hear it from me.'","sys");
  } else {
    S.npcs.forEach(n=>relNpc(n,4));
    log("Marv has nothing new — so he says nice things about you on every floor instead.","sys");
  }
  apply({money:-PRICES.marv});
  saveGame();
}
/* the firm's true fuel: two diminishing cups, then caffeine stops being a strategy */
export const coffeeRelief=()=>S&&S.coffeeToday<COFFEE_LIMIT?Math.max(0,COFFEE_RELIEF-COFFEE_FALLOFF*S.coffeeToday):0;
export const coffeeCost=()=>S.decor&&S.decor.espresso?40:PRICES.coffee; // your own machine grinds cheaper
export const canBuyCoffee=()=>!!S&&coffeeRelief()>0&&S.fatigue>0&&S.money>=coffeeCost();
export function buyCoffee(){
  if(!canBuyCoffee()) return;
  SFX.send();
  const relief=coffeeRelief(), cost=coffeeCost();
  S.fatigue=clamp(S.fatigue-relief,0,100);
  S.coffeeToday++;
  log(rnd(S.coffeeToday===1?[
    "Double espresso. The fog lifts. (-"+relief+" FATIGUE)",
    "Coffee. The billable kind of magic. (-"+relief+" FATIGUE)"]
  :[
    "Second cup. Less magic, more maintenance. The machine cuts you off after this one. (-"+relief+" FATIGUE)"]),"sys");
  apply({money:-cost},true);
  saveGame();
}

/* office decor: one-time purchases, visible in the scene, small passive perks */
export function buyDecor(id){
  const d=DECOR[id]; if(!d) return;
  S.decor=S.decor||{};
  if(S.decor[id]||S.money<d.cost) return;
  SFX.send();
  S.decor[id]=true;
  log(rnd({
    fish:["An aquarium arrives. Two fish. Zero billable hours between them. Perfect colleagues."],
    art:["The print goes up. It's either brilliant or upside down. Clients nod either way."],
    espresso:["The machine hisses like opposing counsel. The coffee is EXCELLENT."],
    monitor:["A second monitor. You can now ignore twice as many emails simultaneously."],
  }[id]),"sys");
  apply({money:-d.cost},true);
  saveGame();
}

export function hireDetective(c){
  if(!c||c.dossier||c.msg||S.money<PRICES.detective) return;
  SFX.send();
  c.dossier=true;
  log("Detective's dossier attached to '"+c.title+"': +12% on every risky play.","sys");
  apply({money:-PRICES.detective});
  saveGame();
}

/* ---------- versioned save/load (localStorage, 3 slots) ---------- */
const normalizeSlot=n=>clamp(Number.isFinite(Number(n))?Math.floor(Number(n)):1,1,3);
let activeSlot=(()=>{ try{ return normalizeSlot(Number(localStorage.getItem("fo_slot"))||1); }catch(e){ return 1; } })();
const slotKey=n=>SAVE_KEY+"_s"+normalizeSlot(n==null?activeSlot:n);
const plain=v=>!!v&&typeof v==="object"&&!Array.isArray(v);
const validSummary=sum=>plain(sum)&&["nextDay","dismiss","reload"].includes(sum.action)&&typeof sum.title==="string"&&Array.isArray(sum.lines)&&typeof sum.btnTxt==="string";
const persistedSummary=sum=>validSummary(sum)?{title:sum.title,lines:sum.lines.map(x=>String(x??"")),btnTxt:sum.btnTxt,action:sum.action}:null;

const validBig=b=>b==null||(plain(b)&&typeof b.client==="string"&&b.client.length>0&&Number.isInteger(b.stage)&&b.stage>=1&&b.stage<=3);
const validFx=fx=>fx==null||(plain(fx)&&Object.values(fx).every(Number.isFinite));
const validFinalWarningSnapshot=s=>s==null||(plain(s)&&Number.isFinite(s.bold)&&s.bold>=0&&s.bold<=100&&nonNegativeInt(s.wins)&&nonNegativeInt(s.losses));
const validJudge=j=>{
  if(j==null||j===true) return true;
  if(!plain(j)) return false;
  if(j.id!=null) return typeof j.id==="string"&&JUDGES.some(def=>def.id===j.id);
  const def=JUDGES.find(x=>x.name===j.name); // pre-v3 saves had no stable id
  return !!def&&j.temper===def.temper&&j.book===def.book&&j.corrupt===def.corrupt;
};
function validOutcome(out,depth){
  if(!plain(out)||!validFx(out.fx)||typeof out.txt!=="string") return false;
  if(out.expose!=null&&typeof out.expose!=="boolean") return false;
  if(out.fraud!=null){
    if(!plain(out.fraud)||!Number.isInteger(out.fraud.set)||out.fraud.set<0||out.fraud.set>3) return false;
    const keys=Object.keys(out.fraud);
    if(keys.some(key=>!["set","schedule","contained"].includes(key))||
      (out.fraud.schedule!=null&&typeof out.fraud.schedule!=="boolean")||
      (out.fraud.contained!=null&&typeof out.fraud.contained!=="boolean")) return false;
  }
  if(out.next==null) return true;
  return plain(out.next)&&(out.next.after==null||Number.isFinite(out.next.after))&&validCase(out.next.case,(depth||0)+1);
}
const validActionBase=a=>plain(a)&&typeof a.id==="string"&&a.id.length>0&&
  typeof a.title==="string"&&typeof a.body==="string"&&Number.isFinite(a.hours)&&a.hours>=.5&&a.hours<=12&&Number.isInteger(a.hours*4)&&
  Number.isFinite(a.fatigue)&&a.fatigue>=0&&a.fatigue<=100&&Number.isFinite(a.edge)&&a.edge>=0&&a.edge<=30&&
  typeof a.edgeText==="string";
const validContradictionCards=a=>{
  if(!Array.isArray(a.pairs)||a.pairs.length<CONTRA_STATEMENTS||a.pairs.length>12) return false;
  if(!Array.isArray(a.decoys)||a.decoys.length<1||a.decoys.length>12) return false;
  const ids=new Set();
  for(const p of a.pairs){
    if(!plain(p)||typeof p.id!=="string"||!p.id||typeof p.statement!=="string"||typeof p.document!=="string") return false;
    if(ids.has(p.id)) return false;
    ids.add(p.id);
  }
  for(const d of a.decoys){
    if(!plain(d)||typeof d.id!=="string"||!d.id||typeof d.text!=="string"||ids.has(d.id)) return false;
    ids.add(d.id);
  }
  return true;
};
const validAction=a=>validActionBase(a)&&(a.type==="contradiction"
  ?validContradictionCards(a)&&[a.success,a.partial,a.miss].every(out=>validOutcome(out,0)&&out.next==null)
  :["lockpick","power_cut"].includes(a.type)&&[a.success,a.escape,a.caught].every(out=>validOutcome(out,0)&&out.next==null));
function validOption(o,depth){
  if(!plain(o)||typeof o.text!=="string") return false;
  // Covert jobs and honest prep both suspend the desk, but they are not the same
  // kind of choice and must not borrow each other's label.
  if(o.action) return o.style===(o.action.type==="contradiction"?"prep":"covert")&&
    validAction(o.action)&&o.base==null&&o.ok==null&&o.fail==null;
  if(!Number.isFinite(o.base)||!validOutcome(o.ok,depth)) return false;
  if(o.style!=null&&!["technical","aggressive","bribe","neutral"].includes(o.style)) return false;
  for(const key of ["boldW","delay","bribe","hours","fatigue","relOk","relFail"])
    if(o[key]!=null&&!Number.isFinite(o[key])) return false;
  if(o.fail!=null&&!validOutcome(o.fail,depth)) return false;
  return !!o.safe||o.base>=100||validOutcome(o.fail,depth);
}
function validTimelineData(t){
  if(t==null) return true;
  if(!plain(t)||typeof t.id!=="string"||!t.id||typeof t.title!=="string"||typeof t.body!=="string") return false;
  if(!Array.isArray(t.events)||t.events.length<2||t.events.length>12) return false;
  const ids=new Set();
  for(const e of t.events){
    if(!plain(e)||typeof e.id!=="string"||!e.id||typeof e.text!=="string"||!Number.isFinite(e.at)) return false;
    if(ids.has(e.id)) return false;
    ids.add(e.id);
  }
  return true;
}
const TIMELINE_EDGE_VALUES=new Set([TIMELINE_EDGE_WIN,TIMELINE_EDGE_LOSS,TIMELINE_EDGE_DECLINE]);
function validTimelineEdge(edge,opts){
  if(edge==null) return true;
  // Only the three outcomes the game can actually stamp: a hand-written value
  // in between (a quiet +5, a forged -1) is a tampered save, not a real play.
  return plain(edge)&&nonNegativeInt(edge.optionIndex)&&edge.optionIndex<(opts||[]).length&&
    TIMELINE_EDGE_VALUES.has(edge.value);
}
function validCase(c,depth=0){
  return depth<=8&&plain(c)&&typeof c.id==="string"&&c.id.length>0&&typeof c.title==="string"&&typeof c.body==="string"&&validJudge(c.judge)&&
    Array.isArray(c.opts)&&c.opts.length>0&&validBig(c.big)&&c.opts.every(o=>validOption(o,depth))&&
    (c.covertEdge==null||(Number.isFinite(c.covertEdge)&&c.covertEdge>=0&&c.covertEdge<=30))&&
    (c.covertNote==null||typeof c.covertNote==="string")&&(c.actionInProgress==null||typeof c.actionInProgress==="string")&&
    validTimelineData(c.timeline)&&(c.timelineDone==null||typeof c.timelineDone==="boolean")&&
    (c.timelineInProgress==null||typeof c.timelineInProgress==="string")&&validTimelineEdge(c.timelineEdge,c.opts)&&
    // A burglary during a court appearance never made sense; preparing exhibits
    // for one is exactly what the night before a hearing is for.
    (!c.judge||c.opts.every(o=>!o.action||o.action.type==="contradiction"))&&
    (!c.big||c.opts.every(o=>o.delay==null&&!o.action)); // Client War has its own lifecycle; no delayed/action options
}

/* Persisted v3 judges trust only their stable id. Rebuild every live snapshot
   from the current catalog so future balance edits neither break old slots nor
   let forged temper/book/corrupt values reach chance() or the UI. */
function canonicalizeCaseJudges(c,depth=0){
  if(!plain(c)||depth>8) return;
  if(c.judge&&c.judge!==true){ const def=canonicalJudge(c.judge); if(def) c.judge=def; }
  const visitOption=o=>{
    if(!plain(o)) return;
    for(const result of [o.ok,o.fail]) if(plain(result)&&plain(result.next)) canonicalizeCaseJudges(result.next.case,depth+1);
  };
  if(Array.isArray(c.opts)) c.opts.forEach(visitOption);
  if(plain(c.pending)) visitOption(c.pending.o);
}
function canonicalizeSaveJudges(d){
  for(const key of ["inbox","pool"]) if(Array.isArray(d[key])) d[key].forEach(c=>canonicalizeCaseJudges(c));
  if(Array.isArray(d.followups)) d.followups.forEach(f=>canonicalizeCaseJudges(f&&f.case));
  if(plain(d.event)&&Array.isArray(d.event.opts)) for(const o of d.event.opts)
    for(const result of [o&&o.ok,o&&o.fail]) if(plain(result)&&plain(result.next)) canonicalizeCaseJudges(result.next.case,1);
}
function highestCaseSequence(d){
  let highest=0;
  const visit=(c,depth=0)=>{
    if(!plain(c)||depth>8) return;
    const match=typeof c.id==="string"&&c.id.match(/^(?:gen|appeal|big[123]_|suit)(\d+)$/);
    if(match) highest=Math.max(highest,Number(match[1])||0);
    const visitOption=o=>{
      if(!plain(o)) return;
      for(const result of [o.ok,o.fail]) if(plain(result)&&plain(result.next)) visit(result.next.case,depth+1);
    };
    if(Array.isArray(c.opts)) c.opts.forEach(visitOption);
    if(plain(c.pending)) visitOption(c.pending.o);
  };
  for(const key of ["inbox","pool","archive"]) if(Array.isArray(d[key])) d[key].forEach(c=>visit(c));
  if(Array.isArray(d.followups)) d.followups.forEach(f=>visit(f&&f.case));
  if(plain(d.event)&&Array.isArray(d.event.opts)) for(const o of d.event.opts)
    for(const result of [o&&o.ok,o&&o.fail]) if(plain(result)&&plain(result.next)) visit(result.next.case,1);
  return highest;
}
const deriveCaseSequence=d=>Math.max(Number.isInteger(d.archiveTotal)?d.archiveTotal:0,highestCaseSequence(d));
function backfillMissingCaseIds(d){
  let seq=deriveCaseSequence(d);
  const visit=(c,depth=0)=>{
    if(!plain(c)||depth>8) return;
    if(typeof c.id!=="string"||!c.id){
      if(seq>=Number.MAX_SAFE_INTEGER) return; // validation below reports an exhausted cursor
      const prefix=c.big&&Number.isInteger(c.big.stage)?"big"+c.big.stage+"_":
        c.suit?"suit":/^APPEAL:/.test(c.title||"")?"appeal":"gen";
      c.id=prefix+(++seq);
    }
    const visitOption=o=>{
      if(!plain(o)) return;
      for(const result of [o.ok,o.fail]) if(plain(result)&&plain(result.next)) visit(result.next.case,depth+1);
    };
    if(Array.isArray(c.opts)) c.opts.forEach(visitOption);
    if(plain(c.pending)) visitOption(c.pending.o);
  };
  for(const key of ["inbox","pool"]) if(Array.isArray(d[key])) d[key].forEach(c=>{ if(!c.msg) visit(c); });
  if(Array.isArray(d.followups)) d.followups.forEach(f=>visit(f&&f.case));
  if(plain(d.event)&&Array.isArray(d.event.opts)) for(const o of d.event.opts)
    for(const result of [o&&o.ok,o&&o.fail]) if(plain(result)&&plain(result.next)) visit(result.next.case,1);
  d.caseSeq=seq;
}

class SaveDataError extends Error{ constructor(code,message){ super(message); this.code=code; } }
const ensureArray=(d,key)=>{ if(d[key]==null) d[key]=[]; };
const RUN_COUNTER_KEYS=["safe","bluffW","bluffL","techW","techL","covertTry","covertW","covertEscape","covertCaught",
  "timelineW","timelineL","contraTry","contraW","contraL","bribeTry","bribeW","favorHelp","favorNo","miss","crises","fired"];
const TODAY_COUNTER_KEYS=["resolved","wins","safeUsed","aggWin","delegated","moneyGained"];
const nonNegativeInt=v=>Number.isSafeInteger(v)&&v>=0;
const validCounters=(v,keys)=>plain(v)&&keys.every(k=>nonNegativeInt(v[k]));
const backfillCounters=(v,keys)=>{
  if(v==null) v={};
  if(plain(v)) for(const key of keys) if(v[key]==null) v[key]=0;
  return v;
};
const migrateV0ToV1=raw=>{
  const d={...raw};
  if(!Number.isFinite(d.hours)) d.hours=settings.dayLen||DAY_HOURS;
  d.hours=clamp(d.hours,0,48);
  if(!Number.isFinite(d.fatigue)) d.fatigue=0;
  d.fatigue=clamp(d.fatigue,0,100);
  if(!Number.isFinite(d.otHours)) d.otHours=0;
  d.otHours=clamp(d.otHours,0,OVERTIME_HOURS*OVERTIME_LIMIT);
  if(!Number.isFinite(d.otToday)) d.otToday=Math.floor(d.otHours/OVERTIME_HOURS);
  d.otToday=clamp(Math.floor(d.otToday),0,OVERTIME_LIMIT);
  if(!Number.isFinite(d.coffeeToday)) d.coffeeToday=0;
  d.coffeeToday=clamp(Math.floor(d.coffeeToday),0,COFFEE_LIMIT);
  if(!plain(d.decor)) d.decor={};
  if(!d.mode) d.mode="standard";
  if(!d.difficulty) d.difficulty="easy";
  for(const key of ["inbox","pool","usedCrises","npcs","followups","clients","npcStories","firedNames","archive","logEntries"])
    ensureArray(d,key);
  // Client Book arrived after save/load. Rebuild the missing prospect list
  // without consuming RNG, excluding any brands already retained.
  if(d.clientPool==null){
    const retained=new Set(Array.isArray(d.clients)?d.clients.map(c=>c&&c.name):[]);
    d.clientPool=CLIENT_NAMES.filter(name=>!retained.has(name));
  }
  d.runStats=backfillCounters(d.runStats,RUN_COUNTER_KEYS);
  if(plain(d.runStats)&&d.runStats.deleg==null) d.runStats.deleg={};
  d.today=backfillCounters(d.today,TODAY_COUNTER_KEYS);
  if(d.weekStart==null) d.weekStart={inf:d.inf,rep:d.rep};
  if(Array.isArray(d.logEntries)) d.logEntries=d.logEntries.slice(0,SAVE_LOG_LIMIT);
  if(Array.isArray(d.archive)) d.archive=d.archive.slice(0,SAVE_ARCHIVE_LIMIT);
  d.archiveTotal=Math.max(Number(d.archiveTotal)||0,Array.isArray(raw.archive)?raw.archive.length:0);
  d.schemaVersion=1;
  return d;
};
const migrateV1ToV2=raw=>{
  const d={...raw};
  if(d.firmPlanDay==null) d.firmPlanDay=0;
  if(!Object.prototype.hasOwnProperty.call(d,"firmGateHintRank")) d.firmGateHintRank=null;
  d.schemaVersion=2;
  return d;
};
const migrateV2ToV3=raw=>{
  const d={...raw};
  if(!Object.prototype.hasOwnProperty.call(d,"judgeMemory")) d.judgeMemory={};
  canonicalizeSaveJudges(d); // name-only legacy judges become current stable-id records
  d.schemaVersion=3;
  return d;
};
const migrateV3ToV4=raw=>{
  const d={...raw};
  backfillMissingCaseIds(d); // old generated appeals could already be queued without an id
  d.schemaVersion=4;
  return d;
};
const migrateV4ToV5=raw=>{
  const d={...raw};
  if(d.promotionReviewDay==null) d.promotionReviewDay=0;
  if(!Object.prototype.hasOwnProperty.call(d,"promotionHintRank")) d.promotionHintRank=null;
  d.schemaVersion=5;
  return d;
};
const migrateV5ToV6=raw=>{
  const d={...raw};
  if(!plain(raw.judgeMemory)){ d.schemaVersion=6; return d; }
  d.judgeMemory={};
  for(const [id,old] of Object.entries(raw.judgeMemory)){
    if(!plain(old)){ d.judgeMemory[id]=old; continue; }
    const m={...old};
    // Aggregate-only v3-v5 saves cannot reconstruct every hearing. Preserve
    // the lifetime record and seed active recall from the last known outcome.
    if(!Array.isArray(m.recent)) m.recent=m.seen?[{style:m.lastStyle,win:m.lastWin,day:m.lastDay}]:[];
    d.judgeMemory[id]=m;
  }
  d.schemaVersion=6;
  return d;
};
const migrateV6ToV7=raw=>{
  const d={...raw};
  // Existing Senior/Name Partner saves did not record when the rank was
  // earned. Starting the wait today is conservative and cannot grant a free
  // promotion immediately after migration. These fields did not exist in v6,
  // so ignore same-named injected properties instead of trusting them.
  d.reviewMomentum=0;
  d.seniorPartnerDay=d.rank>=3?d.day:0;
  d.exceptionalReviewDay=0;
  d.exceptionalReviewHinted=false;
  d.schemaVersion=7;
  return d;
};
const migrateV7ToV8=raw=>{
  const d={...raw};
  d.finalWarningUsed=false;
  d.schemaVersion=8;
  return d;
};
const migrateV8ToV9=raw=>{
  const d={...raw};
  d.actionChallenge=null;
  if(Array.isArray(d.inbox)) d.inbox=d.inbox.map(c=>{
    if(!plain(c)||c.actionInProgress==null) return c;
    const repaired={...c}; delete repaired.actionInProgress; return repaired;
  });
  d.runStats=backfillCounters(d.runStats,RUN_COUNTER_KEYS);
  d.schemaVersion=9;
  return d;
};
const migrateV9ToV10=raw=>{
  if(raw.actionChallenge!=null&&(!plain(raw.actionChallenge)||raw.actionChallenge.type!=="lockpick"))
    throw new SaveDataError("invalid","A schema-9 slot cannot contain this COVERT ACTION type.");
  return {...raw,schemaVersion:10};
};
const migrateV10ToV11=raw=>{
  if(!Object.prototype.hasOwnProperty.call(SCENARIOS,raw.scenario))
    throw new SaveDataError("invalid","The scenario in this slot is unknown.");
  const d={...raw,progression:createProgression(raw.scenario),schemaVersion:11};
  if(plain(raw.actionChallenge)) d.actionChallenge={...raw.actionChallenge,skillSnapshot:legacySkillSnapshot()};
  return d;
};
const migrateV11ToV12=raw=>{
  const d={...raw,schemaVersion:12}, ch=raw.actionChallenge;
  if(!plain(ch)||ch.skillSnapshot?.rulesVersion!==1||!Array.isArray(raw.inbox)) return d;
  const c=raw.inbox.find(item=>plain(item)&&item.id===ch.caseId);
  const o=c&&Array.isArray(c.opts)?c.opts[ch.optionIndex]:null;
  if(!o?.action) return d;
  const expectedCost=Math.max(.5,Math.round(o.action.hours*4)/4);
  const lateExtra=Math.round(Math.max(0,expectedCost-ch.hoursBefore)*LATE_FATIGUE);
  if(lateExtra<=0) return d;
  const rawWorkToil=Math.round(expectedCost*2)+(o.action.fatigue||0);
  const oldToil=workFatigue(rawWorkToil+lateExtra,snapshotProgression(ch.skillSnapshot),raw.scenario);
  const newToil=workFatigue(rawWorkToil,snapshotProgression(ch.skillSnapshot),raw.scenario)+lateExtra;
  // A short-lived schema-11 build discounted the explicit late-work penalty.
  // Upgrade only its exact derived value; any other tampering still fails v12.
  if(ch.toil===oldToil) d.actionChallenge={...ch,toil:newToil};
  return d;
};
const migrateV12ToV13=raw=>{
  if(!Object.prototype.hasOwnProperty.call(SCENARIOS,raw.scenario))
    throw new SaveDataError("invalid","The scenario in this slot is unknown.");
  const fraudRisk=createFraudRiskV1(raw.scenario);
  const d={...raw,fraudRisk,schemaVersion:13};
  // Schema 12 could be saved with the original one-off credentials audit
  // open. Rebuild that unopened prompt from trusted current content; neither
  // its old serialized options nor an attached NPC modifier are authority.
  if(raw.scenario==="fraud"&&plain(raw.event)&&raw.event.id==="audit")
    d.event=buildFraudAuditEvent(fraudRisk);
  return d;
};
const migrateV13ToV14=raw=>{
  if(!Object.prototype.hasOwnProperty.call(SCENARIOS,raw.scenario))
    throw new SaveDataError("invalid","The scenario in this slot is unknown.");
  const legacyError=fraudRiskV1ValidationError(raw.fraudRisk,raw.scenario,raw.day);
  if(legacyError)
    throw new SaveDataError("invalid","The saved identity-pressure record is damaged ("+legacyError+").");
  const fraudRisk=raw.fraudRisk?{...raw.fraudRisk,version:FRAUD_RISK_VERSION,
    morningPhase:plain(raw.event)&&["slip","inquiry"].includes(raw.event.fraudKind)?"complete":"idle"}:null;
  return {...raw,fraudRisk,schemaVersion:14};
};
/* v14 -> v15 adds the EVIDENCE TIMELINE. Older runs carry no board and no
   per-case markers; the fresh counters are backfilled and any half-written
   timeline marker is cleared so a legacy file can never look mid-puzzle. */
const migrateV14ToV15=raw=>{
  const d={...raw,schemaVersion:15};
  d.runStats=backfillCounters(d.runStats,RUN_COUNTER_KEYS);
  const strip=list=>Array.isArray(list)?list.map(c=>{
    if(!plain(c)||c.msg) return c;
    const {timelineInProgress,timelineEdge,timelineDone,...rest}=c;
    return rest;
  }):list;
  d.inbox=strip(d.inbox);
  return d;
};
/* v15 -> v16 adds the safe-play streak. A legacy career has no history of
   consecutive settlements, so it resumes with a clean slate. */
const migrateV15ToV16=raw=>({...raw,schemaVersion:16,
  safeStreak:Number.isSafeInteger(raw.safeStreak)?clamp(raw.safeStreak,0,SAFE_STREAK_CAP):0});
/* v16 -> v17 adds the CONTRADICTION BOARD. Older careers carry no board and no
   counters; nothing else about them changes. */
const migrateV16ToV17=raw=>({...raw,schemaVersion:17,runStats:backfillCounters(raw.runStats,RUN_COUNTER_KEYS)});
const SAVE_MIGRATIONS={0:migrateV0ToV1,1:migrateV1ToV2,2:migrateV2ToV3,3:migrateV3ToV4,4:migrateV4ToV5,5:migrateV5ToV6,6:migrateV6ToV7,7:migrateV7ToV8,8:migrateV8ToV9,9:migrateV9ToV10,10:migrateV10ToV11,11:migrateV11ToV12,12:migrateV12ToV13,13:migrateV13ToV14,14:migrateV14ToV15,15:migrateV15ToV16,16:migrateV16ToV17};

const JUDGE_MEMORY_COUNTERS=["seen","aggressiveW","aggressiveL","technicalW","technicalL","bribeW","bribeL","safe","neutralW","neutralL"];
function validJudgeMemory(memory,day){
  if(!plain(memory)) return false;
  const entries=Object.entries(memory), known=new Set(JUDGES.map(j=>j.id));
  if(entries.length>JUDGES.length) return false;
  return entries.every(([id,m])=>{
    if(!known.has(id)||!plain(m)) return false;
    if(!JUDGE_MEMORY_COUNTERS.every(k=>Number.isSafeInteger(m[k])&&m[k]>=0&&m[k]<=1000000)) return false;
    const total=m.aggressiveW+m.aggressiveL+m.technicalW+m.technicalL+m.bribeW+m.bribeL+m.safe+m.neutralW+m.neutralL;
    if(m.seen!==total||m.seen<=0||!JUDGE_MEMORY_STYLES.includes(m.lastStyle)||typeof m.lastWin!=="boolean"||
      !Number.isInteger(m.lastDay)||m.lastDay<1||m.lastDay>day) return false;
    if(!Array.isArray(m.recent)||m.recent.length<1||m.recent.length>JUDGE_MEMORY_EVENT_LIMIT||m.recent.length>m.seen) return false;
    const recentCounts={aggressiveW:0,aggressiveL:0,technicalW:0,technicalL:0,bribeW:0,bribeL:0,safe:0,neutralW:0,neutralL:0};
    let previousDay=0;
    for(const event of m.recent){
      if(!plain(event)||!JUDGE_MEMORY_STYLES.includes(event.style)||typeof event.win!=="boolean"||
        !Number.isInteger(event.day)||event.day<1||event.day>day||event.day<previousDay||
        (event.style==="safe"&&!event.win)) return false;
      previousDay=event.day;
      const key=event.style==="safe"?"safe":event.style+(event.win?"W":"L");
      recentCounts[key]++;
    }
    if(Object.entries(recentCounts).some(([key,value])=>value>m[key])) return false;
    const last=m.recent.at(-1);
    if(last.style!==m.lastStyle||last.win!==m.lastWin||last.day!==m.lastDay) return false;
    if(m.lastStyle==="safe") return m.lastWin===true&&m.safe>0;
    const lastCounter=m.lastStyle+(m.lastWin?"W":"L");
    return Number.isSafeInteger(m[lastCounter])&&m[lastCounter]>0;
  });
}

const LOCK_ACTION_PHASES=new Set(["lockpick","lock_success","coin_call","coin_result"]);
const POWER_ACTION_PHASES=new Set(["power_cut","power_success","coin_call","coin_result"]);
function validSkillSnapshot(snapshot){
  if(!plain(snapshot)) return false;
  const keys=Object.keys(snapshot), expected=["rulesVersion","sneaky","endurance"];
  if(keys.length!==expected.length||keys.some(key=>!expected.includes(key))||![0,1].includes(snapshot.rulesVersion)||
    !Number.isInteger(snapshot.sneaky)||snapshot.sneaky<0||snapshot.sneaky>MAX_SKILL||
    !Number.isInteger(snapshot.endurance)||snapshot.endurance<0||snapshot.endurance>MAX_SKILL) return false;
  return snapshot.rulesVersion!==0||(snapshot.sneaky===0&&snapshot.endurance===0);
}
function validActionChallengeBase(ch,day,phases){
  if(!plain(ch)||!phases.has(ch.phase)||typeof ch.caseId!=="string"||!ch.caseId||
    typeof ch.actionId!=="string"||!ch.actionId||!nonNegativeInt(ch.optionIndex)||!nonNegativeInt(ch.startedDay)||ch.startedDay<1||ch.startedDay>day||
    typeof ch.caseTitle!=="string"||typeof ch.actionTitle!=="string"||typeof ch.body!=="string"||typeof ch.feedback!=="string"||
    !Number.isInteger(ch.runSeed)||ch.runSeed<0||ch.runSeed>0xffffffff||!Number.isFinite(ch.hoursBefore)||ch.hoursBefore<=0||ch.hoursBefore>48||
    !Number.isFinite(ch.cost)||ch.cost<.5||ch.cost>12||
    !Number.isSafeInteger(ch.toil)||ch.toil<0||ch.toil>200||!Number.isSafeInteger(ch.lateExtra)||ch.lateExtra<0||ch.lateExtra>200||
    !validSkillSnapshot(ch.skillSnapshot)||
    !["heads","tails"].includes(ch.coinFace)) return false;
  return true;
}
function validLockChallenge(ch,day){
  if(!validActionChallengeBase(ch,day,LOCK_ACTION_PHASES)||ch.type!=="lockpick"||
    !Number.isInteger(ch.target)||ch.target<LOCK_MIN||ch.target>LOCK_MAX||!Number.isInteger(ch.position)||ch.position<LOCK_MIN||ch.position>LOCK_MAX||
    !Number.isFinite(ch.tolerance)||ch.tolerance<1||ch.tolerance>30||!nonNegativeInt(ch.maxAttempts)||ch.maxAttempts<1||ch.maxAttempts>10||
    !nonNegativeInt(ch.attemptsLeft)||ch.attemptsLeft>ch.maxAttempts||!nonNegativeInt(ch.turn)||ch.turn>ch.maxAttempts) return false;
  if(ch.phase==="lockpick"&&ch.attemptsLeft<1) return false;
  if((ch.phase==="coin_call"||ch.phase==="coin_result")&&ch.attemptsLeft!==0) return false;
  const spent=ch.maxAttempts-ch.attemptsLeft;
  const inside=Math.abs(ch.position-ch.target)<=ch.tolerance;
  if(ch.phase==="lockpick"&&ch.turn!==spent) return false;
  if(ch.phase==="lockpick"&&ch.turn>0&&inside) return false;
  if(ch.phase==="lock_success"&&(ch.attemptsLeft<1||ch.turn!==spent+1||!inside)) return false;
  if((ch.phase==="coin_call"||ch.phase==="coin_result")&&(ch.turn!==ch.maxAttempts||inside)) return false;
  if(ch.phase==="coin_result") return ["heads","tails"].includes(ch.coinCall)&&typeof ch.escaped==="boolean"&&ch.escaped===(ch.coinCall===ch.coinFace);
  return ch.coinCall==null&&ch.escaped==null;
}

const POWER_RING_PHASES=new Set(["active","queued","locked","missed"]);
const closeNumber=(a,b,tolerance=1e-6)=>Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)<=tolerance;
function validPowerChallenge(ch,day){
  if(!validActionChallengeBase(ch,day,POWER_ACTION_PHASES)||ch.type!=="power_cut"||
    !Number.isInteger(ch.sneaky)||ch.sneaky<0||ch.sneaky>100||!Array.isArray(ch.rings)||ch.rings.length!==POWER_RING_COUNT||
    !Number.isInteger(ch.activeRing)||ch.activeRing<0||ch.activeRing>=POWER_RING_COUNT||
    !nonNegativeInt(ch.maxMisses)||ch.maxMisses!==1||!nonNegativeInt(ch.missesLeft)||ch.missesLeft>ch.maxMisses||
    !nonNegativeInt(ch.turn)||ch.turn>POWER_RING_COUNT||!Number.isFinite(ch.elapsedMs)||ch.elapsedMs<0||ch.elapsedMs>86400000) return false;

  let totalElapsed=0;
  for(let i=0;i<ch.rings.length;i++){
    const ring=ch.rings[i];
    if(!plain(ring)||ring.id!=="power_ring_"+(i+1)||!POWER_RING_PHASES.has(ring.phase)||
      !Number.isFinite(ring.startAngle)||ring.startAngle<0||ring.startAngle>=360||
      !Number.isFinite(ring.angle)||ring.angle<0||ring.angle>=360||
      !Number.isFinite(ring.elapsedMs)||ring.elapsedMs<0||ring.elapsedMs>86400000||
      !Number.isFinite(ring.speed)||ring.speed<=0||ring.speed>200||![1,-1].includes(ring.direction)||
      !Number.isInteger(ring.target)||ring.target<0||ring.target>=360||
      !Number.isInteger(ring.tolerance)||ring.tolerance<1||ring.tolerance>60||
      powerAngleDistance(ring.angle,powerAngleAt(ring))>1e-5) return false;
    totalElapsed+=ring.elapsedMs;
    if(ring.phase==="queued"&&ring.elapsedMs!==0) return false;
    if(ring.phase==="locked"&&powerAngleDistance(ring.angle,ring.target)>ring.tolerance) return false;
    if(ring.phase==="missed"&&powerAngleDistance(ring.angle,ring.target)<=ring.tolerance) return false;
  }
  if(!closeNumber(ch.elapsedMs,totalElapsed,.01)) return false;

  if(ch.phase==="power_cut"){
    if(ch.turn!==ch.activeRing||ch.missesLeft!==ch.maxMisses) return false;
    if(ch.rings.some((ring,index)=>ring.phase!==(index<ch.activeRing?"locked":index===ch.activeRing?"active":"queued"))) return false;
  }else if(ch.phase==="power_success"){
    if(ch.activeRing!==POWER_RING_COUNT-1||ch.turn!==POWER_RING_COUNT||ch.missesLeft!==ch.maxMisses||
      ch.rings.some(ring=>ring.phase!=="locked")) return false;
  }else{
    if(ch.turn!==ch.activeRing+1||ch.missesLeft!==0||
      ch.rings.some((ring,index)=>ring.phase!==(index<ch.activeRing?"locked":index===ch.activeRing?"missed":"queued"))) return false;
  }
  if(ch.phase==="coin_result") return ["heads","tails"].includes(ch.coinCall)&&typeof ch.escaped==="boolean"&&ch.escaped===(ch.coinCall===ch.coinFace);
  return ch.coinCall==null&&ch.escaped==null;
}
const TIMELINE_PHASES=new Set(["timeline","timeline_success","timeline_fail"]);
function validTimelineChallenge(ch,day){
  if(!validActionChallengeBase(ch,day,TIMELINE_PHASES)||ch.type!=="timeline"||typeof ch.confirmedLate!=="boolean") return false;
  if(!Array.isArray(ch.cards)||!Array.isArray(ch.order)||!Array.isArray(ch.solution)) return false;
  const size=ch.cards.length;
  if(size<2||size>12||ch.order.length!==size||ch.solution.length!==size) return false;
  if(ch.cards.some(card=>!plain(card)||typeof card.id!=="string"||!card.id||typeof card.text!=="string")) return false;
  const ids=ch.cards.map(card=>card.id), key=[...ids].sort().join("|");
  if(new Set(ids).size!==size||[...ch.order].sort().join("|")!==key||[...ch.solution].sort().join("|")!==key) return false;
  if(!nonNegativeInt(ch.correct)||ch.correct>size||!nonNegativeInt(ch.turn)) return false;
  const solvedNow=ch.order.every((id,index)=>id===ch.solution[index]);
  const scored=ch.order.reduce((sum,id,index)=>sum+(id===ch.solution[index]?1:0),0);
  if(ch.phase==="timeline"&&ch.correct!==0) return false;                       // unscored board
  if(ch.phase==="timeline_success"&&(!solvedNow||ch.correct!==size)) return false; // claimed win must actually be solved
  if(ch.phase==="timeline_fail"&&(solvedNow||ch.correct!==scored)) return false;   // and a loss must actually be wrong
  return ch.coinCall==null&&ch.escaped==null;
}
const CONTRA_PHASES=new Set(["contradiction","contradiction_success","contradiction_fail"]);
function validContradictionChallenge(ch,day){
  if(!validActionChallengeBase(ch,day,CONTRA_PHASES)||ch.type!=="contradiction") return false;
  if(!Array.isArray(ch.statements)||!Array.isArray(ch.documents)||!Array.isArray(ch.solution)||!Array.isArray(ch.matched)) return false;
  const size=ch.solution.length;
  if(ch.statements.length!==size||size<2||ch.documents.length<size||ch.documents.length>size+12) return false;
  const card=entry=>plain(entry)&&typeof entry.id==="string"&&!!entry.id&&typeof entry.text==="string";
  if(ch.statements.some(s=>!card(s))||ch.documents.some(d=>!card(d))) return false;
  const statementIds=new Set(ch.statements.map(s=>s.id)), documentIds=new Set(ch.documents.map(d=>d.id));
  if(statementIds.size!==size||documentIds.size!==ch.documents.length) return false;
  if(ch.solution.some(pair=>!plain(pair)||!statementIds.has(pair.statement)||!documentIds.has(pair.document))) return false;
  if(!nonNegativeInt(ch.maxAttempts)||ch.maxAttempts!==CONTRA_ATTEMPTS||!nonNegativeInt(ch.attemptsLeft)||ch.attemptsLeft>ch.maxAttempts) return false;
  if(!nonNegativeInt(ch.turn)||ch.turn>ch.maxAttempts+size) return false;
  if(ch.selected!=null&&!statementIds.has(ch.selected)) return false;
  // Every banked pair must be a real solution pair, claimed at most once.
  const seenStatements=new Set(), seenDocuments=new Set();
  for(const m of ch.matched){
    if(!plain(m)||!ch.solution.some(pair=>pair.statement===m.statement&&pair.document===m.document)) return false;
    if(seenStatements.has(m.statement)||seenDocuments.has(m.document)) return false;
    seenStatements.add(m.statement); seenDocuments.add(m.document);
  }
  if(ch.matched.length>size||ch.turn!==ch.matched.length+(ch.maxAttempts-ch.attemptsLeft)) return false;
  if(ch.phase==="contradiction"&&(ch.attemptsLeft<1||ch.matched.length===size)) return false;
  if(ch.phase==="contradiction_success"&&(ch.matched.length!==size||ch.selected!=null)) return false;
  if(ch.phase==="contradiction_fail"&&ch.matched.length===size) return false; // a finished chart is a success, not a miss
  return ch.coinCall==null&&ch.escaped==null;
}
function validActionChallenge(ch,day,progression){
  const valid=ch&&ch.type==="lockpick"?validLockChallenge(ch,day):ch&&ch.type==="power_cut"?validPowerChallenge(ch,day):
    ch&&ch.type==="timeline"?validTimelineChallenge(ch,day):
    ch&&ch.type==="contradiction"?validContradictionChallenge(ch,day):false;
  if(!valid) return false;
  if(ch.skillSnapshot.rulesVersion===1) return ch.skillSnapshot.sneaky===getSkillRank(progression,"sneaky")&&
    ch.skillSnapshot.endurance===getSkillRank(progression,"endurance");
  return true;
}

function migrateSaveData(raw){
  if(!plain(raw)) throw new SaveDataError("invalid","The slot is not a save object.");
  let d={...raw};
  let version=d.schemaVersion==null?0:Number(d.schemaVersion);
  if(!Number.isInteger(version)||version<0) throw new SaveDataError("invalid","The save schema number is invalid.");
  if(version>SAVE_SCHEMA_VERSION) throw new SaveDataError("future","This slot belongs to a newer version of FANCY OUTFITS.");
  while(version<SAVE_SCHEMA_VERSION){
    const migrate=SAVE_MIGRATIONS[version];
    if(!migrate) throw new SaveDataError("invalid","No safe migration exists for this slot.");
    d=migrate(d); version++;
    d.schemaVersion=version;
  }
  if(!Object.prototype.hasOwnProperty.call(SCENARIOS,d.scenario)) throw new SaveDataError("invalid","The scenario in this slot is unknown.");
  const progressionError=progressionValidationError(d.progression,d.scenario);
  if(progressionError) throw new SaveDataError("invalid","The saved training record is damaged ("+progressionError+").");
  if(!Number.isInteger(d.day)||d.day<1) throw new SaveDataError("invalid","The saved day is invalid.");
  const fraudError=fraudRiskValidationError(d.fraudRisk,d.scenario,d.day);
  if(fraudError) throw new SaveDataError("invalid","The saved identity-pressure record is damaged ("+fraudError+").");
  if(!Number.isInteger(d.rank)||d.rank<0||d.rank>=RANKS.length) throw new SaveDataError("invalid","The saved rank is invalid.");
  if(!["standard","ironman","endless","daily"].includes(d.mode)) throw new SaveDataError("invalid","The saved mode is invalid.");
  if(!["easy","medium","hard","realistic"].includes(d.difficulty)) throw new SaveDataError("invalid","The saved difficulty is invalid.");
  for(const key of ["rep","bold","inf"])
    if(!Number.isFinite(d[key])||d[key]<0||d[key]>100) throw new SaveDataError("invalid","The saved "+key+" value is invalid.");
  if(!Number.isFinite(d.money)) throw new SaveDataError("invalid","The saved money value is invalid.");
  if(!Number.isFinite(d.hours)||d.hours<0||d.hours>48) throw new SaveDataError("invalid","The saved hours value is invalid.");
  if(!Number.isFinite(d.fatigue)||d.fatigue<0||d.fatigue>100) throw new SaveDataError("invalid","The saved fatigue value is invalid.");
  if(!Number.isFinite(d.otHours)||d.otHours<0||d.otHours>OVERTIME_HOURS*OVERTIME_LIMIT)
    throw new SaveDataError("invalid","The saved overtime value is invalid.");
  if(!Number.isInteger(d.otToday)||d.otToday<0||d.otToday>OVERTIME_LIMIT)
    throw new SaveDataError("invalid","The saved overtime counter is invalid.");
  if(d.firm!=null&&(!Number.isFinite(d.firm)||d.firm<0||d.firm>100))
    throw new SaveDataError("invalid","The saved firm value is invalid.");
  if(!nonNegativeInt(d.safeStreak)||d.safeStreak>SAFE_STREAK_CAP)
    throw new SaveDataError("invalid","The saved safe-play streak is invalid.");
  if(!nonNegativeInt(d.firmPlanDay)) throw new SaveDataError("invalid","The saved turnaround cooldown is invalid.");
  if(d.firmGateHintRank!==null&&(!Number.isInteger(d.firmGateHintRank)||d.firmGateHintRank<0||d.firmGateHintRank>3))
    throw new SaveDataError("invalid","The saved FIRM promotion hint is invalid.");
  if(!nonNegativeInt(d.promotionReviewDay)||d.promotionReviewDay>d.day)
    throw new SaveDataError("invalid","The saved promotion review day is invalid.");
  if(d.promotionHintRank!==null&&(!Number.isInteger(d.promotionHintRank)||d.promotionHintRank<0||d.promotionHintRank>3))
    throw new SaveDataError("invalid","The saved promotion readiness hint is invalid.");
  // Keep the upper bound independent from today's tuning threshold so a
  // future balance reduction does not invalidate an older honest slot.
  if(!nonNegativeInt(d.reviewMomentum)||d.reviewMomentum>100||(d.rank<3&&d.reviewMomentum!==0))
    throw new SaveDataError("invalid","The saved exceptional-review momentum is invalid.");
  if(!nonNegativeInt(d.seniorPartnerDay)||d.seniorPartnerDay>d.day||
    (d.rank<3&&d.seniorPartnerDay!==0)||(d.rank>=3&&d.seniorPartnerDay<1))
    throw new SaveDataError("invalid","The saved Senior Partner date is invalid.");
  if(!nonNegativeInt(d.exceptionalReviewDay)||d.exceptionalReviewDay>d.day||
    (d.exceptionalReviewDay>0&&d.rank<4))
    throw new SaveDataError("invalid","The saved exceptional review date is invalid.");
  if(typeof d.exceptionalReviewHinted!=="boolean"||(d.rank<3&&d.exceptionalReviewHinted))
    throw new SaveDataError("invalid","The saved exceptional review hint is invalid.");
  if(typeof d.finalWarningUsed!=="boolean") throw new SaveDataError("invalid","The saved Final Warning state is invalid.");
  if(d.actionChallenge!==null&&!validActionChallenge(d.actionChallenge,d.day,d.progression))
    throw new SaveDataError("invalid","The saved COVERT ACTION is damaged.");
  if(!validJudgeMemory(d.judgeMemory,d.day)) throw new SaveDataError("invalid","The saved court history is damaged.");
  if(!nonNegativeInt(d.caseSeq)||d.caseSeq>=Number.MAX_SAFE_INTEGER||d.caseSeq<highestCaseSequence(d))
    throw new SaveDataError("invalid","The saved filing sequence is invalid.");
  for(const key of ["suitCost","weekMissed","bigDoneDay","fireHeat","coffeeToday","marvBribes","rivalMoveDay","archiveTotal","seed"])
    if(d[key]!=null&&!Number.isFinite(d[key])) throw new SaveDataError("invalid","The saved "+key+" value is invalid.");
  for(const key of ["weekMissed","bigDoneDay","coffeeToday","marvBribes","rivalMoveDay","archiveTotal"])
    if(d[key]!=null&&!nonNegativeInt(d[key])) throw new SaveDataError("invalid","The saved "+key+" counter is invalid.");
  if(d.coffeeToday!=null&&d.coffeeToday>COFFEE_LIMIT) throw new SaveDataError("invalid","The saved coffee counter is invalid.");
  if(d.suitCost!=null&&d.suitCost<0) throw new SaveDataError("invalid","The saved suit price is invalid.");
  if(d.fireHeat!=null&&d.fireHeat<0) throw new SaveDataError("invalid","The saved litigation heat is invalid.");
  if(d.seed!=null&&(!Number.isInteger(d.seed)||d.seed<0||d.seed>0xffffffff)) throw new SaveDataError("invalid","The saved run seed is invalid.");
  if(d.debtDue!=null&&!Number.isFinite(d.debtDue)) throw new SaveDataError("invalid","The saved debt deadline is invalid.");
  if(d.rngState!=null&&(!Number.isInteger(d.rngState)||d.rngState<0||d.rngState>0xffffffff))
    throw new SaveDataError("invalid","The Daily random cursor is invalid.");
  for(const key of ["inbox","pool","usedCrises","npcs","followups","clients","clientPool","npcStories","firedNames","archive","logEntries"])
    if(!Array.isArray(d[key])) throw new SaveDataError("invalid","The saved "+key+" collection is damaged.");
  if(d.inbox.some(c=>!plain(c)||typeof c.title!=="string"||(c.msg?typeof c.body!=="string":
    c.judge===true||!Number.isFinite(c.dueDay)||!validCase(c))))
    throw new SaveDataError("invalid","An inbox file is damaged.");
  const liveInboxIds=d.inbox.filter(c=>!c.msg).map(c=>c.id);
  if(liveInboxIds.some(id=>typeof id!=="string"||!id)||new Set(liveInboxIds).size!==liveInboxIds.length)
    throw new SaveDataError("invalid","The saved inbox contains a duplicate filing.");
  const actionMarked=d.inbox.filter(c=>!c.msg&&c.actionInProgress!=null);
  const timelineMarked=d.inbox.filter(c=>!c.msg&&c.timelineInProgress!=null);
  const openTimeline=d.actionChallenge&&d.actionChallenge.type==="timeline"?d.actionChallenge:null;
  if(timelineMarked.length>1||(timelineMarked.length===1)!==!!openTimeline)
    throw new SaveDataError("invalid","A case is stuck inside a missing EVIDENCE TIMELINE.");
  if(openTimeline){
    const ch=openTimeline;
    const c=d.inbox.find(item=>!item.msg&&item.id===ch.caseId);
    const o=c&&c.opts[ch.optionIndex];
    if(actionMarked.length||!c||c.timelineInProgress!==ch.actionId||c.timelineDone!==true||!o||o.safe||o.action||
      !plain(c.timeline)||c.timeline.id!==ch.actionId)
      throw new SaveDataError("invalid","The saved EVIDENCE TIMELINE no longer matches its case file.");
    // The app is fully modal while a challenge is open, so rank — and therefore
    // the board size — cannot have moved since it was dealt.
    const expectedCount=Math.min(d.rank>=TIMELINE_SENIOR_RANK?TIMELINE_CARDS_SENIOR:TIMELINE_CARDS,c.timeline.events.length);
    const expectedToil=workFatigue(TIMELINE_FATIGUE,snapshotProgression(ch.skillSnapshot),d.scenario);
    const expected=createTimelineChallenge({runSeed:d.seed,caseId:c.id,optionIndex:ch.optionIndex,timelineId:c.timeline.id,
      events:c.timeline.events,count:expectedCount,cost:TIMELINE_HOURS,toil:expectedToil,lateExtra:0});
    if(ch.runSeed!==d.seed||ch.startedDay!==d.day||d.hours!==ch.hoursBefore||ch.cost!==TIMELINE_HOURS||
      ch.toil!==expectedToil||ch.lateExtra!==0||ch.cards.length!==expectedCount||ch.coinFace!==expected.coinFace)
      throw new SaveDataError("invalid","The saved EVIDENCE TIMELINE outcome was altered.");
    if(ch.cards.some((card,index)=>card.id!==expected.cards[index].id||card.text!==expected.cards[index].text)||
      ch.solution.join("|")!==expected.solution.join("|"))
      throw new SaveDataError("invalid","The saved chronology board was altered.");
    if(ch.caseTitle!==c.title||ch.actionTitle!==c.timeline.title||ch.body!==c.timeline.body)
      throw new SaveDataError("invalid","The saved EVIDENCE TIMELINE briefing was altered.");
  }
  if(d.actionChallenge&&!openTimeline){
    const c=d.inbox.find(item=>!item.msg&&item.id===d.actionChallenge.caseId);
    const o=c&&c.opts[d.actionChallenge.optionIndex];
    if(actionMarked.length!==1||!c||c.actionInProgress!==d.actionChallenge.actionId||!o||!o.action||o.action.id!==d.actionChallenge.actionId)
      throw new SaveDataError("invalid","The saved COVERT ACTION no longer matches its case file.");
    const ch=d.actionChallenge, expectedCost=Math.max(.5,Math.round(o.action.hours*4)/4);
    const lateExtra=Math.round(Math.max(0,expectedCost-ch.hoursBefore)*LATE_FATIGUE);
    const rawWorkToil=Math.round(expectedCost*2)+(o.action.fatigue||0);
    const expectedToil=ch.skillSnapshot.rulesVersion===0?rawWorkToil+lateExtra:
      workFatigue(rawWorkToil,snapshotProgression(ch.skillSnapshot),d.scenario)+lateExtra;
    const expected=createActionChallenge(o.action,{runSeed:d.seed,caseId:c.id,actionId:o.action.id,cost:expectedCost,
      toil:expectedToil,lateExtra},ch.skillSnapshot);
    if(ch.runSeed!==d.seed||ch.startedDay!==d.day||d.hours!==ch.hoursBefore||ch.cost!==expectedCost||ch.toil!==expected.toil||ch.lateExtra!==lateExtra||
      ch.type!==expected.type||ch.coinFace!==expected.coinFace)
      throw new SaveDataError("invalid","The saved COVERT ACTION outcome was altered.");
    if(ch.type==="lockpick"&&(ch.target!==expected.target||ch.tolerance!==expected.tolerance||ch.maxAttempts!==expected.maxAttempts))
      throw new SaveDataError("invalid","The saved lock position was altered.");
    if(ch.type==="contradiction"&&(ch.statements.length!==expected.statements.length||ch.documents.length!==expected.documents.length||
      ch.statements.some((s,index)=>s.id!==expected.statements[index].id||s.text!==expected.statements[index].text)||
      ch.documents.some((d,index)=>d.id!==expected.documents[index].id||d.text!==expected.documents[index].text)||
      ch.solution.some((pair,index)=>pair.statement!==expected.solution[index].statement||pair.document!==expected.solution[index].document)))
      throw new SaveDataError("invalid","The saved contradiction board was altered.");
    if(ch.type==="power_cut"&&(ch.sneaky!==expected.sneaky||ch.maxMisses!==expected.maxMisses||ch.rings.length!==expected.rings.length||
      ch.rings.some((ring,index)=>{
        const fixed=expected.rings[index];
        return !fixed||ring.id!==fixed.id||ring.startAngle!==fixed.startAngle||ring.target!==fixed.target||
          ring.tolerance!==fixed.tolerance||ring.speed!==fixed.speed||ring.direction!==fixed.direction;
      }))) throw new SaveDataError("invalid","The saved circuit board was altered.");
    if(ch.caseTitle!==c.title||ch.actionTitle!==o.action.title||ch.body!==o.action.body)
      throw new SaveDataError("invalid","The saved COVERT ACTION briefing was altered.");
  } else if(actionMarked.length){
    throw new SaveDataError("invalid","A case is stuck inside a missing COVERT ACTION.");
  }
  if(d.pool.some(c=>!validCase(c))) throw new SaveDataError("invalid","The case pool is damaged.");
  if(d.followups.some(f=>!plain(f)||!Number.isFinite(f.day)||!validCase(f.case)))
    throw new SaveDataError("invalid","A queued filing is damaged.");
  const queuedIds=d.followups.map(f=>f.case.id), reservedIds=new Set(liveInboxIds);
  if(new Set(queuedIds).size!==queuedIds.length||queuedIds.some(id=>reservedIds.has(id)))
    throw new SaveDataError("invalid","The saved docket contains a duplicate queued filing.");
  if(!validBig(d.bigCase)) throw new SaveDataError("invalid","The Client War mandate is damaged.");
  if(d.inbox.some(c=>c.big&&(c.pending!=null||c.delegated!=null)))
    throw new SaveDataError("invalid","A Client War stage cannot be delayed or delegated.");
  if(d.inbox.some(c=>c.judge&&c.delegated!=null))
    throw new SaveDataError("invalid","A court appearance cannot be delegated.");
  if(d.inbox.some(c=>c.pending!=null&&(!plain(c.pending)||!Number.isFinite(c.pending.day)||typeof c.pending.win!=="boolean"||
    (c.pending.judgeMemorySnapshot!=null&&typeof c.pending.judgeMemorySnapshot!=="string")||
    !validFinalWarningSnapshot(c.pending.finalWarningSnapshot)||!validOption(c.pending.o,0))))
    throw new SaveDataError("invalid","A delayed case result is damaged.");
  if(d.inbox.some(c=>c.delegated!=null&&(!plain(c.delegated)||!Number.isSafeInteger(c.delegated.day)||c.delegated.day<1||
    typeof c.delegated.npc!=="string"||typeof c.delegated.win!=="boolean"||
    (c.delegated.silent!=null&&typeof c.delegated.silent!=="boolean"))))
    throw new SaveDataError("invalid","A delegated case result is damaged.");
  if(d.clients.some(c=>!plain(c)||typeof c.name!=="string"||!Number.isFinite(c.fee)))
    throw new SaveDataError("invalid","The client book is damaged.");
  if(d.clientPool.some(name=>typeof name!=="string")) throw new SaveDataError("invalid","The prospect pool is damaged.");
  if(d.npcs.some(n=>!plain(n)||typeof n.id!=="string"||typeof n.name!=="string"||typeof n.role!=="string"||typeof n.trait!=="string"||!Number.isFinite(n.rel)))
    throw new SaveDataError("invalid","The floor roster is damaged.");
  if(d.logEntries.some(e=>!plain(e)||typeof e.txt!=="string")) throw new SaveDataError("invalid","The activity log is damaged.");
  if(d.archive.some(e=>!plain(e)||typeof e.title!=="string"||(e.judgeMemory!=null&&typeof e.judgeMemory!=="string")))
    throw new SaveDataError("invalid","The case archive is damaged.");
  if(d.event!=null&&(!plain(d.event)||typeof d.event.title!=="string"||typeof d.event.body!=="string"||!Array.isArray(d.event.opts)||!d.event.opts.length||!d.event.opts.every(o=>validOption(o,0))))
    throw new SaveDataError("invalid","The pending event is damaged.");
  const fraudEventError=fraudEventValidationError(d.event,d.fraudRisk,d.scenario);
  if(fraudEventError) throw new SaveDataError("invalid","The pending identity-pressure event is damaged ("+fraudEventError+").");
  const activeFraudEvent=!!(d.event&&d.event.fraudKind);
  if(activeFraudEvent&&(d.fraudRisk.pendingKind!==null||d.fraudRisk.pendingDay!==0))
    throw new SaveDataError("invalid","An identity confrontation cannot also be pending.");
  if(d.fraudRisk&&d.fraudRisk.morningPhase!=="idle"&&(!activeFraudEvent||
    !["slip","inquiry"].includes(d.event.fraudKind)))
    throw new SaveDataError("invalid","The saved morning identity checkpoint is inconsistent.");
  if(activeFraudEvent&&["slip","inquiry"].includes(d.event.fraudKind)&&d.fraudRisk.morningPhase==="idle")
    throw new SaveDataError("invalid","The saved identity confrontation is missing its morning phase.");
  if(d.fraudRisk&&d.fraudRisk.morningPhase==="resume"&&
    (d.summary||d.pendingSummary||d.objective!==null||d.fraudRisk.dailyPeak!==0))
    throw new SaveDataError("invalid","The saved morning identity checkpoint is inconsistent.");
  if(!activeFraudEvent&&d.fraudRisk&&d.fraudRisk.pendingKind&&d.fraudRisk.pendingDay<=d.day&&!d.summary&&!d.pendingSummary)
    throw new SaveDataError("invalid","An overdue identity confrontation is missing.");
  if(d.roster!=null&&(!Array.isArray(d.roster)||d.roster.some(e=>!plain(e)||typeof e.id!=="string"||typeof e.name!=="string"||typeof e.role!=="string"||
    !Number.isFinite(e.impact)||!Number.isFinite(e.won)||!Number.isFinite(e.lost))))
    throw new SaveDataError("invalid","The firm roster is damaged.");
  if(d.nemesis!=null&&(!plain(d.nemesis)||typeof d.nemesis.name!=="string"||!Number.isFinite(d.nemesis.inf)||!Number.isInteger(d.nemesis.rank)||d.nemesis.rank<0||d.nemesis.rank>=RANKS.length))
    throw new SaveDataError("invalid","The rival record is damaged.");
  if(!validCounters(d.runStats,RUN_COUNTER_KEYS)||!plain(d.runStats.deleg)||Object.values(d.runStats.deleg).some(v=>!nonNegativeInt(v)))
    throw new SaveDataError("invalid","The run ledger is damaged.");
  if(!validCounters(d.today,TODAY_COUNTER_KEYS)) throw new SaveDataError("invalid","The daily counters are damaged.");
  if(d.weekStart!=null&&(!plain(d.weekStart)||!Number.isFinite(d.weekStart.inf)||!Number.isFinite(d.weekStart.rep)))
    throw new SaveDataError("invalid","The weekly baseline is damaged.");
  if(d.objective!=null&&(!plain(d.objective)||!Object.prototype.hasOwnProperty.call(OBJ_DEFS,d.objective.tid)||!validFx(d.objective.reward)))
    throw new SaveDataError("invalid","The daily objective is damaged.");
  if(d.summary!=null&&!validSummary(d.summary)) throw new SaveDataError("invalid","The pending summary is damaged.");
  if(d.pendingSummary!=null&&!validSummary(d.pendingSummary)) throw new SaveDataError("invalid","The pending day checkpoint is damaged.");
  d.logEntries=d.logEntries.slice(0,SAVE_LOG_LIMIT);
  d.archive=d.archive.slice(0,SAVE_ARCHIVE_LIMIT);
  d.inbox=boundInboxMessages(d.inbox); // safely repair older endless slots with unbounded notifications
  d.archiveTotal=Math.max(Number(d.archiveTotal)||0,d.archive.length);
  canonicalizeSaveJudges(d);
  return d;
}

function hydrateSaveData(d,slot){
  const base=newState(d.scenario,d.difficulty);
  const defaults={runStats:base.runStats,today:base.today,weekStart:base.weekStart,nemesis:base.nemesis};
  const transient=new Set(["infoOpen","flash","userPaused","leaving","charAnim","openCase","settingsOpen","sceneRank","rosterOpen","archiveOpen","pendingChoice","saveError","shakeSeq"]);
  for(const key of Object.keys(base)){
    if(!transient.has(key)&&Object.prototype.hasOwnProperty.call(d,key)) base[key]=d[key];
  }
  const merge=(fallback,value)=>plain(value)?{...fallback,...value}:{...fallback};
  base.runStats=merge(defaults.runStats,d.runStats);
  base.runStats.deleg=merge({},d.runStats&&d.runStats.deleg);
  base.today=merge(defaults.today,d.today);
  base.weekStart=merge(defaults.weekStart,d.weekStart);
  base.decor=merge({},d.decor);
  base.judgeMemory=merge({},d.judgeMemory);
  base.progression={...d.progression,skills:{...d.progression.skills}};
  base.fraudRisk=d.fraudRisk?{...d.fraudRisk}:null;
  if(d.nemesis===null) base.nemesis=null;
  else base.nemesis=merge(defaults.nemesis,d.nemesis);
  base.hours=Number.isFinite(d.hours)?d.hours:(settings.dayLen||DAY_HOURS);
  base.fatigue=clamp(Number.isFinite(d.fatigue)?d.fatigue:0,0,100);
  base.otHours=Math.max(0,Number.isFinite(d.otHours)?d.otHours:0);
  base.otToday=clamp(Number.isFinite(d.otToday)?d.otToday:Math.floor(base.otHours/OVERTIME_HOURS),0,OVERTIME_LIMIT);
  base.archive=d.archive.slice(0,SAVE_ARCHIVE_LIMIT);
  base.archiveTotal=Math.max(Number(d.archiveTotal)||0,base.archive.length);
  base.logEntries=d.logEntries.slice(0,SAVE_LOG_LIMIT);
  base.summary=persistedSummary(d.summary);
  base.pendingSummary=persistedSummary(d.pendingSummary);
  base.slot=normalizeSlot(slot);
  base.infoOpen=false; base.flash=null; base.userPaused=false; base.leaving=false;
  base.charAnim="working"; base.openCase=null; base.settingsOpen=false; base.sceneRank=null;
  base.rosterOpen=false; base.archiveOpen=false; base.pendingChoice=null; base.saveError=null; base.shakeSeq=0;
  return base;
}

function storageFailure(kind,message){
  if(!S) return false;
  const changed=!S.saveError||S.saveError.kind!==kind;
  S.saveError={kind,message};
  if(changed){ log("AUTO-SAVE FAILED: "+message,"bad"); notify(); }
  return false;
}
function writeFailure(error){
  const quota=error&&(error.name==="QuotaExceededError"||error.name==="NS_ERROR_DOM_QUOTA_REACHED"||error.code===22||error.code===1014);
  const blocked=error&&error.name==="SecurityError";
  return storageFailure(quota?"quota":(blocked?"blocked":"write"),
    quota?"Browser storage is full. Progress after the last successful save is unprotected.":
    blocked?"Browser storage is blocked. Keep this run open or enable site storage.":
    "The browser rejected the save. Progress after the last successful save is unprotected.");
}

// One-time key migration: preserve a resumable legacy save when slot 1 is
// empty or damaged, and never delete the only healthy copy.
export function migrateLegacySave(){
  try{
    const legacy=localStorage.getItem(SAVE_KEY);
    const target=localStorage.getItem(slotKey(1));
    const resumable=raw=>{ try{ const d=migrateSaveData(JSON.parse(raw)); return !d.over; }catch(e){ return false; } };
    if(legacy&&resumable(legacy)&&!resumable(target)){
      localStorage.setItem(slotKey(1),legacy);
      if(localStorage.getItem(slotKey(1))===legacy) localStorage.removeItem(SAVE_KEY);
    } else if(legacy&&resumable(target)) localStorage.removeItem(SAVE_KEY);
  }catch(e){}
}
migrateLegacySave();

export const getSlot=()=>activeSlot;
export function setSlot(n){
  activeSlot=normalizeSlot(n);
  try{ localStorage.setItem("fo_slot",String(activeSlot)); return true; }
  catch(e){ return false; }
}

export function saveGame(){
  if(!S||S.over||S.mode==="ironman") return true; // ironman: no net by design
  const {infoOpen,event,summary,flash,userPaused,leaving,charAnim,openCase,settingsOpen,sceneRank,rosterOpen,archiveOpen,pendingChoice,saveError,shakeSeq,...data}=S;
  const ev=(event&&event.id!=="overtime"&&event.id!=="latework")?event:null;
  const payload={...data,event:ev,summary:persistedSummary(summary),schemaVersion:SAVE_SCHEMA_VERSION,savedAt:Date.now(),rngState:getRngState(),
    logEntries:(data.logEntries||[]).slice(0,SAVE_LOG_LIMIT),archive:(data.archive||[]).slice(0,SAVE_ARCHIVE_LIMIT)};
  let json;
  try{ json=JSON.stringify(payload); }
  catch(e){ return storageFailure("serialize","The run contains data the save system cannot serialize. This session is still playable."); }
  try{
    localStorage.setItem(slotKey(S.slot),json);
    if(S.saveError){ S.saveError=null; log("AUTO-SAVE RESTORED: this run is protected again.","sys"); notify(); }
    return true;
  }catch(e){ return writeFailure(e); }
}

export function inspectSave(n){
  const slot=normalizeSlot(n);
  let raw;
  try{ raw=localStorage.getItem(slotKey(slot)); }
  catch(e){ return {slot,status:"unavailable",save:null,message:"Browser storage is unavailable."}; }
  if(raw===null) return {slot,status:"empty",save:null};
  let parsed;
  try{ parsed=JSON.parse(raw); }
  catch(e){ return {slot,status:"corrupt",save:null,message:"The slot is not valid JSON. It has not been deleted."}; }
  const oldVersion=plain(parsed)&&parsed.schemaVersion!=null?Number(parsed.schemaVersion):0;
  try{
    const save=migrateSaveData(parsed);
    if(save.over) return {slot,status:"empty",save:null};
    return {slot,status:"ready",save,version:save.schemaVersion,needsUpgrade:oldVersion<SAVE_SCHEMA_VERSION};
  }catch(e){
    const status=e&&e.code==="future"?"future":"invalid";
    return {slot,status,save:null,version:Number.isFinite(oldVersion)?oldVersion:null,message:e.message||"The slot is damaged."};
  }
}
export const peekSave=n=>inspectSave(n).save;
export const canStartWithSlot=(status,mode)=>mode==="ironman"||!["corrupt","invalid","future","unavailable"].includes(status);

export function loadGame(n){
  const slot=normalizeSlot(n), inspected=inspectSave(slot), d=inspected.save;
  if(!d) return false;
  setSlot(slot);
  const rngState=d.rngState;
  setS(hydrateSaveData(d,slot));
  terminalClearDone=false;
  if(!S.summary&&S.pendingSummary){ S.summary=S.pendingSummary; S.pendingSummary=null; }
  const repaired=reconcileClientWarState();
  SFX.bell();
  log("Run restored. The firm did not notice you were gone.","sys");
  if(repaired) log("SAVE REPAIR: "+repaired+" stale Client War state(s) were closed safely.","sys");
  // DAILY determinism: resume the exact seeded cursor (or re-seed if an old save lacks it)
  if(S.mode==="daily"){ if(rngState!=null) setRngState(rngState); else if(S.dailyDate) setSeed(hash("fo_daily_"+S.dailyDate)); }
  else clearSeed();
  if(!S.summary) sitDown();
  startAmbience();
  if(!S.summary&&!S.event&&S.hours<=0) checkClock(); // re-derive transient clock prompts
  saveGame(); // persist migrations/repairs immediately; failure becomes a visible banner
  notify();
  return true;
}

export function clearSaveSlot(n){
  try{ localStorage.removeItem(slotKey(n)); return true; }
  catch(e){ if(S) writeFailure(e); return false; }
}
function clearSave(){ return S&&S.mode==="ironman"?true:clearSaveSlot(S&&S.slot); }
/* restart: wipe the current slot only when storage confirms the deletion */
export function restartRun(){ if(clearSave()) location.reload(); }
export function dismissSaveError(){ if(S&&S.saveError){ S.saveError=null; notify(); } }
export function getStats(){
  try{ return JSON.parse(localStorage.getItem(STATS_KEY)); }catch(e){ return null; }
}
function recordRun(won,cause){
  try{
    const st=getStats()||{runs:0,wins:0,bestDay:0,bestRank:0,causes:{}};
    if(S.runRecorded){ // ENDLESS already counted the win; still preserve the true final career length
      st.bestDay=Math.max(st.bestDay,S.day); st.bestRank=Math.max(st.bestRank,S.rank);
      localStorage.setItem(STATS_KEY,JSON.stringify(st)); return;
    }
    S.runRecorded=true; // endless: the win counts once, the eventual fall doesn't double-count
    st.runs++; if(won) st.wins++;
    st.bestDay=Math.max(st.bestDay,S.day); st.bestRank=Math.max(st.bestRank,S.rank);
    if(!won) st.causes[cause]=(st.causes[cause]||0)+1;
    localStorage.setItem(STATS_KEY,JSON.stringify(st));
  }catch(e){}
}

/* ---------- UI actions (overlays, inbox, topbar) ---------- */
function showSummary(title,lines,btnTxt,action="dismiss"){
  S.pendingSummary=null;
  S.summary={title,lines,btnTxt,action};
  saveGame(); // persist the checkpoint before the player advances it
  notify();
}
export function dismissSummary(){
  SFX.click();
  const action=S.summary&&S.summary.action;
  if(action==="reload"){
    if(!terminalClearDone){ terminalClearDone=clearSave(); if(!terminalClearDone){ notify(); return; } }
    S.summary=null; location.reload(); return;
  }
  S.summary=null;
  if(action==="nextDay") advanceDay();
  saveGame(); notify();
}
export function openCaseFile(c){ SFX.open(); S.openCase=c; notify(); }
export function deferCase(){ SFX.click(); S.openCase=null; notify(); }
export function openInfo(){ SFX.click(); S.infoOpen=true; notify(); }
export function closeInfo(){ SFX.click(); S.infoOpen=false; notify(); }
export function openSettings(){ SFX.click(); S.settingsOpen=true; notify(); }
export function closeSettings(){ SFX.click(); S.settingsOpen=false; notify(); }
export function openRoster(){ SFX.open(); S.rosterOpen=true; notify(); }
export function closeRoster(){ SFX.click(); S.rosterOpen=false; notify(); }
export function openArchive(){ SFX.open(); S.archiveOpen=true; notify(); }
export function closeArchive(){ SFX.click(); S.archiveOpen=false; notify(); }
export function updateSetting(k,v){
  setSetting(k,v);
  if(k==="bgm") applyBgmVolume();
  SFX.click(); notify();
}
