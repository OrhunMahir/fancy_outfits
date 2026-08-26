import { hash } from "./utils.js";

/* The lock is worked with TENSION, not an angle: you lean on the pick until the
   cylinder gives. Lean too far and the pick snaps and that attempt is gone —
   which is the whole tension of the thing, since a beginner only gets one. */
export const LOCK_MIN=0;
export const LOCK_MAX=100;
export const LOCK_STEP=3;
export const POWER_RING_COUNT=3;
export const POWER_FRAME_CAP_MS=80;

/* Narrow enough that a coarse sweep can step straight over it — which is what
   makes "move fast" a gamble rather than a free win. SNEAKY widens it. */
const LOCK_TOLERANCE=3;
const LOCK_ATTEMPTS=1;      // SNEAKY is the only thing that buys more picks
/* The pick is never "broken" by a single move: it WEARS. Any load wears it
   slowly, load past the give point wears it fast, and it shears when the wear
   runs out. Sitting in the give zone turns the cylinder instead — you have to
   hold it there, which is why easing up and down forever is not a strategy. */
export const LOCK_HOLD_MS=700;      // time in the zone before the cylinder turns
export const LOCK_WEAR_MAX=100;
/* Searching is what costs you. A slow sweep from zero up to a high give point
   burns most of the pick, so hunting blind is a losing plan and a confident,
   coarser approach is the skill — which is also what SNEAKY makes safe, since a
   wider zone cannot be stepped over. */
const LOCK_WEAR_LOAD=1.05;          // per second, per unit of tension: the pick is bent
const LOCK_WEAR_OVER=4.2;           // per second, per unit PAST the give zone
/* How badly a lock can lie about being close. Deliberately a CONSTANT: SNEAKY
   widens the zone you are hunting, so the same spread of uncertainty covers a
   bigger share of it — training reduces doubt instead of scaling with it. */
export const LOCK_HINT_SPREAD=22;
const POWER_MISSES=1;

/* `hash` is fine for picking a number, but its output moves by ~1 when the
   input's last character moves by 1. Sorting items by it therefore reproduced
   the AUTHORED order for every identity — every run drew the same subset, which
   is why the boards felt like they never changed. Avalanche the bits first. */
const mixKey=(identity,id)=>{
  let x=hash(`${identity}|${id}`)>>>0;
  x^=x>>>16; x=Math.imul(x,0x7feb352d)>>>0;
  x^=x>>>15; x=Math.imul(x,0x846ca68b)>>>0;
  x^=x>>>16;
  return x>>>0;
};

/* Board difficulty follows the run's difficulty setting. This does NOT touch
   the dice — odds still come from chance() alone — it changes how hard the
   things you play with your hands are. 0 easy, 1 medium, 2 hard AND realistic
   (the user wants those two identical). OBJECTION is deliberately excluded:
   its timing is already the tightest thing in the game. */
export const BOARD_TIERS=3;
export const boardTierOf=difficulty=>difficulty==="easy"?0:difficulty==="medium"?1:2;
const LOCK_WEAR_SCALE=[0.78,1,1.5];      // hard picks give out much sooner
const LOCK_TOL_SHIFT=[1,0,-1];           // and the zone you are hunting is narrower
const POWER_SPEED_SCALE=[0.9,1,1.18];
const POWER_TOL_SHIFT=[2,0,-2];
const TIMELINE_EXTRA=[0,0,1];            // one more card to order
const CONTRA_ATTEMPT_SHIFT=[1,0,-1];
const REDACT_PAGE_SHIFT=[-1,0,1];        // a bigger bundle is more to get wrong
const tier=v=>Math.max(0,Math.min(BOARD_TIERS-1,Math.trunc(Number(v)||0)));

const normalizeAngle=value=>{
  const n=Number(value);
  if(!Number.isFinite(n)) return 0;
  return ((n%360)+360)%360;
};
const roundMs=value=>Math.round(value*1000)/1000;
const roundAngle=value=>Math.round(normalizeAngle(value)*1e6)/1e6;

export function powerAngleDistance(a,b){
  const gap=Math.abs(normalizeAngle(a)-normalizeAngle(b));
  return Math.min(gap,360-gap);
}

export function powerAngleAt(ring,elapsedMs=ring?.elapsedMs){
  const start=Number(ring?.startAngle);
  const speed=Number(ring?.speed);
  const direction=Number(ring?.direction);
  const elapsed=Number(elapsedMs);
  if(![start,speed,direction,elapsed].every(Number.isFinite)) return 0;
  return roundAngle(start+direction*speed*(Math.max(0,elapsed)/1000));
}

// Minigame outcomes derive from stable identities, never the shared gameplay RNG.
export function createLockpickChallenge({runSeed,caseId,actionId,cost,toil,lateExtra,toleranceBonus=0,attemptBonus=0,diff=1}){
  const identity=`${runSeed}|${caseId}|${actionId}`;
  const bonus=Math.max(0,Math.trunc(Number(toleranceBonus)||0));
  const level=tier(diff);
  const tolerance=Math.max(1,Math.min(30,LOCK_TOLERANCE+bonus+LOCK_TOL_SHIFT[level]));
  const maxAttempts=Math.max(1,Math.min(10,LOCK_ATTEMPTS+Math.trunc(Number(attemptBonus)||0)));
  const give=28+(hash(`${identity}|give`)%45); // the cylinder yields somewhere in 28..72
  /* Every lock announces itself early, and by a different amount: hintLead is
     how far BEFORE the real zone it starts to feel close, hintTail how briefly
     it still feels close after. So "it feels close" tells you the zone is
     somewhere near — never where — and guessing the lead is the minigame. */
  const hintLead=hash(`${identity}|lead`)%LOCK_HINT_SPREAD; // wider than any zone: no fixed nudge can cover it
  const hintTail=1+(hash(`${identity}|tail`)%3);
  return {
    type:"lockpick",
    phase:"lockpick",
    runSeed,
    caseId,
    actionId,
    cost,
    toil,
    lateExtra,
    give,
    tolerance,
    diff:level,
    hintLead,
    hintTail,
    maxAttempts,
    attemptsLeft:maxAttempts,
    tension:0,
    wear:0,
    hold:0,
    snapped:false,
    brokeInLock:false,
    turn:0,
    feedback:"Lean on the pick and hold. The cylinder turns where it wants to.",
    coinFace:hash(`${identity}|coin`)%2===0?"heads":"tails",
  };
}

/* What the hand can honestly feel — proximity, never the answer. The "close"
   band is wider than the zone that actually opens the lock and is padded by a
   different amount on every lock, so feeling it is an invitation to gamble
   rather than a solution. Whether the true zone is behind you or still ahead
   is exactly what you are paying a pick to find out. */
export function lockFeel(challenge,tension=challenge?.tension){
  const t=Number(tension)||0, give=Number(challenge?.give)||0, tol=Number(challenge?.tolerance)||0;
  const lead=Number(challenge?.hintLead)||0, tail=Number(challenge?.hintTail)||0;
  const low=give-tol-lead, high=give+tol+tail;
  if(t>high) return "strain";
  if(t>=low) return "close";
  if(t>=low-(tol+lead+4)) return "shift";
  return "dead";
}
// Whether the cylinder actually turns — never shown, only felt in hindsight.
export const lockGives=(challenge,tension=challenge?.tension)=>
  Math.abs((Number(tension)||0)-(Number(challenge?.give)||0))<=(Number(challenge?.tolerance)||0);
const FEEL_TEXT={
  dead:"The pins sit dead. Nothing is moving yet.",
  shift:"Something shifts deep in the cylinder.",
  close:"The cylinder is close to giving. Somewhere right around here.",
  strain:"The pick bows. You have gone past whatever it wanted.",
};

export function clampLockTension(value){
  const n=Number(value);
  if(!Number.isFinite(n)) return 0;
  return Math.max(LOCK_MIN,Math.min(LOCK_MAX,Math.round(n)));
}

/* Moving the pick is free. What costs is holding it there. */
export function pressLockTension(challenge,value){
  if(challenge.phase!=="lockpick") return {...challenge};
  const tension=clampLockTension(value);
  // leaving the zone abandons the turn you had started
  const hold=lockGives(challenge,tension)?challenge.hold:0;
  return {...challenge,tension,hold,snapped:false,feedback:FEEL_TEXT[lockFeel(challenge,tension)]};
}

const wearPerSecond=(challenge,tension)=>{
  const over=Math.max(0,tension-(challenge.give+challenge.tolerance));
  return (tension*LOCK_WEAR_LOAD+over*LOCK_WEAR_OVER)*LOCK_WEAR_SCALE[tier(challenge.diff)];
};

/* One frame of the lock. Either the cylinder is turning or the pick is dying;
   below the zone it is only the slow wear of being bent at all. */
export function advanceLockpick(challenge,deltaMs){
  if(challenge.phase!=="lockpick") return {...challenge};
  const dt=Math.max(0,Math.min(POWER_FRAME_CAP_MS,Number(deltaMs)||0))/1000;
  if(dt<=0) return {...challenge};
  const inZone=lockGives(challenge,challenge.tension);
  const hold=inZone?Math.min(LOCK_HOLD_MS,challenge.hold+dt*1000):0;
  const wear=Math.min(LOCK_WEAR_MAX,challenge.wear+wearPerSecond(challenge,challenge.tension)*dt);

  if(inZone&&hold>=LOCK_HOLD_MS){
    return {...challenge,phase:"lock_success",hold,wear,turn:(challenge.turn||0)+1,
      feedback:"The pins settle in a row. The cylinder turns."};
  }
  if(wear>=LOCK_WEAR_MAX){
    const attemptsLeft=Math.max(0,(challenge.attemptsLeft||0)-1);
    return {
      ...challenge,
      phase:attemptsLeft===0?"coin_call":"lockpick",
      attemptsLeft,
      tension:0,
      wear:0,
      hold:0,
      snapped:true,
      brokeInLock:attemptsLeft===0,
      turn:(challenge.turn||0)+1,
      feedback:attemptsLeft===0
        ?"The pick shears off. Half of it is still in the keyway, and it is not coming out by hand."
        :"The pick shears. You work the stub free and bend another one straight.",
    };
  }
  return {...challenge,hold,wear};
}

/* The last-chance coin after a failed covert action. Its face was fixed when
   the board was dealt, so calling it can never be re-rolled by a reload. */
/* What the coin decides depends on HOW the job went wrong. A sheared pick
   leaves physical evidence: heads you fish the stub out, tails it stays in the
   keyway and someone pulls the tape in the morning. A lock that simply refused
   leaves nothing behind — there the risk is only who walks past. */
const COIN_TEXT={
  power:{
    win:"You called it. The guard checks the wrong stairwell and you slip away.",
    lose:"Wrong call. Security finds you under the emergency lights, hand still on the panel.",
  },
  broken:{
    win:"You called it. Two minutes with the tweezers and the stub comes free — the cabinet keeps its secret.",
    lose:"Wrong call. The stub stays in the keyway. Facilities finds a scored lock at seven, the building manager asks for the corridor tape, and your badge is on it.",
  },
  quiet:{
    win:"You called it. Someone walks the corridor, keys jingling, and turns off one door early.",
    lose:"Wrong call. A paralegal comes down the corridor for the printer and finds you crouched at a cabinet that is not yours.",
  },
};
export function callCoin(challenge,call){
  const coinCall=String(call).toLowerCase()==="heads"?"heads":"tails";
  const escaped=coinCall===challenge.coinFace;
  const mode=challenge.type==="power_cut"?"power":challenge.brokeInLock?"broken":"quiet";
  return {
    ...challenge,
    phase:"coin_result",
    coinCall,
    escaped,
    feedback:COIN_TEXT[mode][escaped?"win":"lose"],
  };
}

/* ---------- EVIDENCE TIMELINE ----------
   Order the events a case file already describes. Like every other board here,
   the puzzle derives from a run/case identity instead of the shared gameplay
   RNG: the same run asks the same chronology, a different run asks another
   subset of the authored pool. `at` is the authored chronological rank and is
   never shown; the player has to take it from the case text. */
export function timelineDeal(events,count,identity){
  const pool=(Array.isArray(events)?events:[]).filter(e=>e&&typeof e.id==="string");
  const size=Math.max(2,Math.min(pool.length,Math.trunc(Number(count))||0));
  // Stable, identity-ordered draw: sort the whole pool by a per-event hash and
  // take the first `size`. No shared RNG, no Array#sort comparator randomness.
  const drawn=pool
    .map(event=>({event,key:mixKey(identity,`draw|${event.id}`)}))
    .sort((a,b)=>a.key-b.key||(a.event.id<b.event.id?-1:1))
    .slice(0,size)
    .map(entry=>entry.event);
  const solution=[...drawn].sort((a,b)=>(Number(a.at)||0)-(Number(b.at)||0)||(a.id<b.id?-1:1)).map(e=>e.id);
  // Deterministic Fisher-Yates for the starting order, re-rolled until it is
  // not already solved (a free win would make the read worthless).
  const shuffle=salt=>{
    const order=drawn.map(e=>e.id);
    for(let i=order.length-1;i>0;i--){
      const j=hash(`${identity}|${salt}|swap|${i}`)%(i+1);
      [order[i],order[j]]=[order[j],order[i]];
    }
    return order;
  };
  let order=shuffle("deal");
  for(let attempt=1;attempt<8&&order.every((id,index)=>id===solution[index]);attempt++) order=shuffle(`deal${attempt}`);
  if(order.every((id,index)=>id===solution[index])) order=[...order].reverse();
  return {cards:drawn.map(e=>({id:e.id,text:String(e.text||"")})),order,solution};
}

export function createTimelineChallenge({runSeed,caseId,optionIndex,timelineId,events,count,cost,toil,lateExtra,diff=1}){
  const identity=`${runSeed}|${caseId}|${timelineId}`;
  const level=tier(diff);
  const dealt=Math.min((Number(count)||0)+TIMELINE_EXTRA[level],(events||[]).length);
  const {cards,order,solution}=timelineDeal(events,dealt,identity);
  return {
    type:"timeline",
    phase:"timeline",
    runSeed,
    caseId,
    actionId:timelineId,
    optionIndex,
    cost,
    toil,
    lateExtra,
    cards,
    order,
    solution,
    diff:level,
    correct:0,
    turn:0,
    feedback:"Put the events in the order the file describes, earliest first.",
    coinFace:hash(`${identity}|coin`)%2===0?"heads":"tails", // unused here; keeps one challenge shape
  };
}

export function moveTimelineCard(challenge,id,direction){
  if(challenge.phase!=="timeline") return {...challenge};
  const order=[...(challenge.order||[])];
  const index=order.indexOf(id);
  const target=index+(direction<0?-1:1);
  if(index<0||target<0||target>=order.length) return {...challenge};
  [order[index],order[target]]=[order[target],order[index]];
  return {...challenge,order,turn:(challenge.turn||0)+1,
    feedback:"Order revised. Submit when the chronology reads true."};
}

export function submitTimeline(challenge){
  if(challenge.phase!=="timeline") return {...challenge};
  const order=challenge.order||[], solution=challenge.solution||[];
  const correct=order.reduce((sum,id,index)=>sum+(id===solution[index]?1:0),0);
  const solved=correct===solution.length&&solution.length>0;
  return {
    ...challenge,
    phase:solved?"timeline_success":"timeline_fail",
    correct,
    turn:(challenge.turn||0)+1,
    feedback:solved
      ?"The chronology holds. Every date lines up with the file."
      :`Only ${correct} of ${solution.length} events sat in the right place. The story wobbles.`,
  };
}

/* ---------- REDACTION ----------
   Two ways to be wrong, and they are not the same wrong. A privileged line you
   hand over is read by the other side; an ordinary record you black out is
   obstruction, and the court has opinions about that. Doing nothing fails in
   the first direction, so there is no safe default. */
export function redactionDeal(pages,count,identity){
  const pool=(Array.isArray(pages)?pages:[]).filter(p=>p&&typeof p.id==="string");
  const drawn=pool
    .map((page,index)=>({page,index,key:mixKey(identity,`page|${page.id}`)}))
    .sort((a,b)=>a.key-b.key||a.index-b.index)
    .slice(0,Math.max(2,Math.min(pool.length,Math.trunc(Number(count))||0)))
    .sort((a,b)=>a.index-b.index)
    .map(entry=>({id:entry.page.id,text:String(entry.page.text||""),priv:!!entry.page.priv}));
  // A bundle with nothing privileged (or nothing ordinary) is not a decision.
  return drawn.some(p=>p.priv)&&drawn.some(p=>!p.priv)?drawn:pool.slice(0,Math.max(2,drawn.length));
}

export function createRedactionChallenge({runSeed,caseId,optionIndex,actionId,pages,count,cost,toil,lateExtra,diff=1}){
  const identity=`${runSeed}|${caseId}|${actionId}`;
  const level=tier(diff);
  const dealt=Math.max(3,Math.min((Number(count)||0)+REDACT_PAGE_SHIFT[level],(pages||[]).length));
  return {
    type:"redaction",
    phase:"redaction",
    runSeed,
    caseId,
    actionId,
    optionIndex,
    cost,
    toil,
    lateExtra,
    pages:redactionDeal(pages,dealt,identity),
    diff:level,
    marked:[],
    leaked:0,
    over:0,
    turn:0,
    feedback:"Black out what is privileged. Nothing else.",
    coinFace:hash(`${identity}|coin`)%2===0?"heads":"tails", // unused; keeps one challenge shape
  };
}

export function toggleRedaction(challenge,pageId){
  if(challenge.phase!=="redaction") return {...challenge};
  if(!challenge.pages.some(p=>p.id===pageId)) return {...challenge};
  const marked=challenge.marked.includes(pageId)
    ?challenge.marked.filter(id=>id!==pageId)
    :[...challenge.marked,pageId];
  return {...challenge,marked,turn:(challenge.turn||0)+1,
    feedback:marked.includes(pageId)?"Blacked out.":"Restored."};
}

export function produceDocuments(challenge){
  if(challenge.phase!=="redaction") return {...challenge};
  const marked=new Set(challenge.marked);
  const leaked=challenge.pages.filter(p=>p.priv&&!marked.has(p.id)).length;
  const over=challenge.pages.filter(p=>!p.priv&&marked.has(p.id)).length;
  return {
    ...challenge,
    phase:"redaction_done",
    leaked,
    over,
    turn:(challenge.turn||0)+1,
    feedback:leaked===0&&over===0
      ?"Clean production. Everything privileged is black, everything else is legible."
      :leaked&&over
      ?`${leaked} privileged page(s) went out and ${over} ordinary record(s) came back black.`
      :leaked
      ?`${leaked} privileged page(s) went out with the rest.`
      :`${over} ordinary record(s) came back black. Opposing counsel will file about it.`,
  };
}

/* ---------- OBJECTION ----------
   The transcript moves whether you do or not. Improper questions stand for a
   beat and then they are answered — and an answer on the record cannot be
   unheard. Objecting to a clean question is worse than saying nothing, because
   the judge is sitting right there. Like every board, the deal comes from a
   run/case identity; only the timing is yours. */
export function objectionDeal(lines,count,identity){
  const pool=(Array.isArray(lines)?lines:[]).filter(l=>l&&typeof l.id==="string");
  const size=Math.max(2,Math.min(pool.length,Math.trunc(Number(count))||0));
  const drawn=pool
    .map((line,index)=>({line,index,key:mixKey(identity,`line|${line.id}`)}))
    .sort((a,b)=>a.key-b.key||a.index-b.index)
    .slice(0,size)
    // keep the authored order so the transcript still reads like a transcript
    .sort((a,b)=>a.index-b.index)
    .map(entry=>({id:entry.line.id,text:String(entry.line.text||""),
      bad:!!entry.line.bad,tag:String(entry.line.tag||"")}));
  return drawn;
}

export function createObjectionChallenge({runSeed,caseId,optionIndex,objectionId,lines,count,cost,toil,lateExtra,windowMs,strict}){
  const identity=`${runSeed}|${caseId}|${objectionId}`;
  return {
    type:"objection",
    phase:"objection",
    runSeed,
    caseId,
    actionId:objectionId,
    optionIndex,
    cost,
    toil,
    lateExtra,
    lines:objectionDeal(lines,count,identity),
    index:0,
    elapsedMs:0,
    windowMs,
    strict:!!strict,
    ruled:[],
    sustained:0,
    overruled:0,
    missed:0,
    turn:0,
    feedback:"Opposing counsel is asking. Object before the answer lands.",
    coinFace:hash(`${identity}|coin`)%2===0?"heads":"tails", // unused; keeps one challenge shape
  };
}

const objectionSettled=ch=>ch.index>=ch.lines.length;
const objectionResult=ch=>({
  ...ch,
  phase:objectionSettled(ch)?"objection_done":"objection",
  elapsedMs:objectionSettled(ch)?0:ch.elapsedMs,
});

/* The clock only moves while the board is open; a question left standing past
   its window is answered, and a missed improper question is on the record. */
export function advanceObjection(challenge,deltaMs){
  if(challenge.phase!=="objection") return {...challenge};
  const step=Math.max(0,Math.min(POWER_FRAME_CAP_MS,Number(deltaMs)||0));
  let elapsed=(challenge.elapsedMs||0)+step;
  if(elapsed<challenge.windowMs) return {...challenge,elapsedMs:elapsed};
  const line=challenge.lines[challenge.index];
  const missed=challenge.missed+(line&&line.bad?1:0);
  return objectionResult({
    ...challenge,
    index:challenge.index+1,
    elapsedMs:0,
    missed,
    feedback:line&&line.bad
      ?"Answered. That one is on the record now."
      :"Answered. Nothing objectionable in it.",
  });
}

export function raiseObjection(challenge){
  if(challenge.phase!=="objection") return {...challenge};
  const line=challenge.lines[challenge.index];
  if(!line) return {...challenge};
  const good=!!line.bad;
  return objectionResult({
    ...challenge,
    index:challenge.index+1,
    elapsedMs:0,
    turn:(challenge.turn||0)+1,
    ruled:[...challenge.ruled,{id:line.id,sustained:good}],
    sustained:challenge.sustained+(good?1:0),
    overruled:challenge.overruled+(good?0:1),
    feedback:good
      ?`Sustained — ${line.tag||"improper"}. The question is struck.`
      :"Overruled. There was nothing wrong with that question, counsel.",
  });
}

/* Frivolous objections cost double in front of a by-the-book judge: the score
   is the hearing's, not the puzzle's. */
export function objectionScore(challenge){
  const bad=challenge.lines.filter(l=>l.bad).length;
  const penalty=challenge.overruled*(challenge.strict?2:1);
  const net=challenge.sustained-penalty-challenge.missed;
  return {bad,net,sustained:challenge.sustained,overruled:challenge.overruled,missed:challenge.missed};
}

/* ---------- CONTRADICTION BOARD ----------
   Honest legal prep, not a covert job: pin each sworn statement to the exhibit
   that makes it impossible. Attempts are limited, one exhibit on the board
   contradicts nothing, and — like every board here — the deal comes from a
   run/case/action identity instead of the shared gameplay RNG. */
export const CONTRA_STATEMENTS=3;
export const CONTRA_DECOYS=1;
export const CONTRA_ATTEMPTS=4;

const drawByIdentity=(pool,size,identity,salt)=>pool
  .map(entry=>({entry,key:mixKey(identity,`${salt}|${entry.id}`)}))
  .sort((a,b)=>a.key-b.key||(a.entry.id<b.entry.id?-1:1))
  .slice(0,size)
  .map(item=>item.entry);

export function contradictionDeal(pairs,decoys,identity,count=CONTRA_STATEMENTS,decoyCount=CONTRA_DECOYS){
  const pairPool=(Array.isArray(pairs)?pairs:[]).filter(p=>p&&typeof p.id==="string");
  const decoyPool=(Array.isArray(decoys)?decoys:[]).filter(d=>d&&typeof d.id==="string");
  const size=Math.max(2,Math.min(pairPool.length,Math.trunc(Number(count))||0));
  const drawn=drawByIdentity(pairPool,size,identity,"pair");
  const spare=drawByIdentity(decoyPool,Math.max(0,Math.min(decoyPool.length,Math.trunc(Number(decoyCount))||0)),identity,"decoy");

  const statements=drawn.map(p=>({id:p.id,text:String(p.statement||"")}));
  const documents=[
    ...drawn.map(p=>({id:"doc_"+p.id,text:String(p.document||"")})),
    ...spare.map(d=>({id:"doc_"+d.id,text:String(d.text||"")})),
  ];
  // Deterministic Fisher-Yates so the exhibit column never lines up with the
  // statement column — the answer has to come from the file, not the layout.
  for(let i=documents.length-1;i>0;i--){
    const j=hash(`${identity}|shuffle|${i}`)%(i+1);
    [documents[i],documents[j]]=[documents[j],documents[i]];
  }
  return {statements,documents,solution:drawn.map(p=>({statement:p.id,document:"doc_"+p.id}))};
}

export function createContradictionChallenge({runSeed,caseId,actionId,cost,toil,lateExtra,pairs,decoys,diff=1}){
  const identity=`${runSeed}|${caseId}|${actionId}`;
  const level=tier(diff);
  const {statements,documents,solution}=contradictionDeal(pairs,decoys,identity);
  const attempts=Math.max(2,CONTRA_ATTEMPTS+CONTRA_ATTEMPT_SHIFT[level]);
  return {
    type:"contradiction",
    phase:"contradiction",
    runSeed,
    caseId,
    actionId,
    cost,
    toil,
    lateExtra,
    statements,
    documents,
    solution,
    matched:[],
    selected:null,
    diff:level,
    maxAttempts:attempts,
    attemptsLeft:attempts,
    turn:0,
    feedback:"Pin each sworn statement to the exhibit that makes it impossible.",
    coinFace:hash(`${identity}|coin`)%2===0?"heads":"tails", // unused here; keeps one challenge shape
  };
}

export function selectContradictionStatement(challenge,statementId){
  if(challenge.phase!=="contradiction") return {...challenge};
  const known=(challenge.statements||[]).some(s=>s.id===statementId);
  const settled=(challenge.matched||[]).some(m=>m.statement===statementId);
  if(!known||settled) return {...challenge};
  const selected=challenge.selected===statementId?null:statementId;
  return {...challenge,selected,
    feedback:selected?"Now pick the exhibit that cannot be true alongside it.":"Selection cleared."};
}

export function pairContradiction(challenge,statementId,documentId){
  if(challenge.phase!=="contradiction") return {...challenge};
  const statements=challenge.statements||[], documents=challenge.documents||[], solution=challenge.solution||[];
  const matched=challenge.matched||[];
  if(!statements.some(s=>s.id===statementId)||!documents.some(d=>d.id===documentId)) return {...challenge};
  if(matched.some(m=>m.statement===statementId||m.document===documentId)) return {...challenge};

  const turn=(challenge.turn||0)+1;
  const correct=solution.some(pair=>pair.statement===statementId&&pair.document===documentId);
  if(correct){
    const nextMatched=[...matched,{statement:statementId,document:documentId}];
    const done=nextMatched.length===solution.length;
    return {...challenge,
      phase:done?"contradiction_success":"contradiction",
      matched:nextMatched,selected:null,turn,
      feedback:done
        ?"Every statement is nailed to a document it cannot survive."
        :`Contradiction locked. ${solution.length-nextMatched.length} left.`};
  }

  const attemptsLeft=Math.max(0,(challenge.attemptsLeft||0)-1);
  return {...challenge,
    phase:attemptsLeft===0?"contradiction_fail":"contradiction",
    attemptsLeft,selected:null,turn,
    feedback:attemptsLeft===0
      ?"Out of credibility. Opposing counsel would eat that chart alive."
      :`That exhibit does not touch this statement. ${attemptsLeft} attempt(s) left.`};
}

export function concedeContradiction(challenge){
  if(challenge.phase!=="contradiction") return {...challenge};
  return {...challenge,phase:"contradiction_fail",selected:null,
    feedback:(challenge.matched||[]).length
      ?"You stop while the chart still holds together."
      :"You close the binder. Nothing on the board is provable today."};
}

/* Three timing rings for the electrical sabotage action. The shared gameplay
   RNG is deliberately never read here: a run/case/action identity fixes the
   board, while the snapshotted SNEAKY score changes only its difficulty.

   RULES 1 (v1.9.23) makes the three circuits a real climb instead of three
   near-identical rings: the first one is a warm-up, the second asks for timing
   and the third is genuinely fast. RULES 0 is the shipped-before curve and is
   kept so a board someone is already mid-way through survives the update. */
export const POWER_RULES=1;
const POWER_CURVES={
  0:{speed:index=>66+index*11, speedJitter:()=>25, tolerance:index=>16-index*2, toleranceJitter:()=>5, minTolerance:8},
  // v1.9.29: a notch harder across the board — the first ring still teaches,
  // the last one now genuinely demands timing.
  1:{speed:index=>[62,98,136][index]??136, speedJitter:index=>[12,16,20][index]??20,
     tolerance:index=>[18,12,8][index]??8, toleranceJitter:()=>4, minTolerance:6},
};
export function createPowerCutChallenge({runSeed,caseId,actionId,cost,toil,lateExtra,sneaky=0,rules=POWER_RULES,diff=1}){
  const identity=`${runSeed}|${caseId}|${actionId}`;
  const sneakySnapshot=Math.max(0,Math.min(100,Math.round(Number(sneaky)||0)));
  const speedFactor=1-sneakySnapshot*.0035; // 100 SNEAKY is 35% slower
  const windowBonus=Math.round(sneakySnapshot*.08); // and up to 8deg wider
  const curve=POWER_CURVES[rules]||POWER_CURVES[POWER_RULES];
  const level=tier(diff);

  const rings=Array.from({length:POWER_RING_COUNT},(_,index)=>{
    const ringIdentity=`${identity}|ring|${index}`;
    const target=hash(`${ringIdentity}|target`)%360;
    const tolerance=Math.max(curve.minTolerance,
      curve.tolerance(index)+(hash(`${ringIdentity}|window`)%curve.toleranceJitter(index))+windowBonus+POWER_TOL_SHIFT[level]);
    let startAngle=hash(`${ringIdentity}|angle`)%360;

    // Never begin with the marker already sitting in the success window.
    if(powerAngleDistance(startAngle,target)<=tolerance+10){
      startAngle=normalizeAngle(target+90+(hash(`${ringIdentity}|offset`)%91));
    }

    return {
      id:`power_ring_${index+1}`,
      phase:index===0?"active":"queued",
      startAngle,
      angle:startAngle,
      elapsedMs:0,
      speed:Math.round((curve.speed(index)+(hash(`${ringIdentity}|speed`)%curve.speedJitter(index)))*speedFactor*POWER_SPEED_SCALE[level]*10)/10,
      direction:hash(`${ringIdentity}|direction`)%2===0?1:-1,
      target,
      tolerance,
    };
  });

  return {
    type:"power_cut",
    phase:"power_cut",
    runSeed,
    caseId,
    actionId,
    cost,
    toil,
    lateExtra,
    sneaky:sneakySnapshot,
    rules,
    diff:level,
    rings,
    activeRing:0,
    maxMisses:POWER_MISSES,
    missesLeft:POWER_MISSES,
    elapsedMs:0,
    turn:0,
    feedback:"Stop each live circuit inside its amber window.",
    coinFace:hash(`${identity}|coin`)%2===0?"heads":"tails",
  };
}

export function advancePowerCut(challenge,deltaMs){
  if(challenge.phase!=="power_cut") return {...challenge};
  const active=challenge.rings?.[challenge.activeRing];
  if(!active||active.phase!=="active") return {...challenge};

  const rawDelta=Number(deltaMs);
  const elapsed=Number.isFinite(rawDelta)
    ? Math.max(0,Math.min(POWER_FRAME_CAP_MS,rawDelta))
    : 0;
  if(elapsed===0) return {...challenge};

  const ringElapsed=roundMs((Number(active.elapsedMs)||0)+elapsed);
  const rings=challenge.rings.map((ring,index)=>index===challenge.activeRing?{
    ...ring,
    elapsedMs:ringElapsed,
    angle:powerAngleAt(ring,ringElapsed),
  }:ring);

  return {
    ...challenge,
    rings,
    elapsedMs:roundMs(rings.reduce((sum,ring)=>sum+(Number(ring.elapsedMs)||0),0)),
  };
}

export function stopPowerCut(challenge){
  if(challenge.phase!=="power_cut") return {...challenge};
  const activeIndex=challenge.activeRing;
  const active=challenge.rings?.[activeIndex];
  if(!active||active.phase!=="active") return {...challenge};

  const aligned=powerAngleDistance(active.angle,active.target)<=active.tolerance;
  const turn=(challenge.turn||0)+1;

  if(!aligned){
    const rings=challenge.rings.map((ring,index)=>index===activeIndex?{
      ...ring,
      phase:"missed",
    }:ring);
    return {
      ...challenge,
      phase:"coin_call",
      rings,
      missesLeft:0,
      turn,
      feedback:"The contacts arc. Security heard it—call the coin and run.",
    };
  }

  const isLast=activeIndex===challenge.rings.length-1;
  const rings=challenge.rings.map((ring,index)=>{
    if(index===activeIndex) return {...ring,phase:"locked"};
    if(!isLast&&index===activeIndex+1) return {...ring,phase:"active"};
    return ring;
  });

  return {
    ...challenge,
    phase:isLast?"power_success":"power_cut",
    rings,
    activeRing:isLast?activeIndex:activeIndex+1,
    turn,
    feedback:isLast
      ?"All three circuits align. The building goes dark."
      :`Circuit ${activeIndex+1} aligned. Hold the next ring.`,
  };
}
