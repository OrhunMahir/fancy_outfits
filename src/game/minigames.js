import { hash } from "./utils.js";

/* The lock is worked with TENSION, not an angle: you lean on the pick until the
   cylinder gives. Lean too far and the pick snaps and that attempt is gone —
   which is the whole tension of the thing, since a beginner only gets one. */
export const LOCK_MIN=0;
export const LOCK_MAX=100;
export const LOCK_STEP=3;
export const POWER_RING_COUNT=3;
export const POWER_FRAME_CAP_MS=80;

const LOCK_TOLERANCE=4;     // half-width of the give zone before SNEAKY widens it
const LOCK_ATTEMPTS=1;      // SNEAKY is the only thing that buys more picks
const LOCK_BREAK_MARGIN=2;  // minimum slack between the give zone and the snap
/* How badly a lock can lie about being close. Deliberately a CONSTANT: SNEAKY
   widens the zone you are hunting, so the same spread of uncertainty covers a
   bigger share of it — training reduces doubt instead of scaling with it. */
export const LOCK_HINT_SPREAD=22;
const POWER_MISSES=1;

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
export function createLockpickChallenge({runSeed,caseId,actionId,cost,toil,lateExtra,toleranceBonus=0,attemptBonus=0}){
  const identity=`${runSeed}|${caseId}|${actionId}`;
  const bonus=Math.max(0,Math.trunc(Number(toleranceBonus)||0));
  const tolerance=Math.max(1,Math.min(30,LOCK_TOLERANCE+bonus));
  const maxAttempts=Math.max(1,Math.min(10,LOCK_ATTEMPTS+Math.trunc(Number(attemptBonus)||0)));
  const give=28+(hash(`${identity}|give`)%45); // the cylinder yields somewhere in 28..72
  // A steadier hand also breaks fewer picks, so SNEAKY widens the slack too.
  const breakAt=Math.min(LOCK_MAX,give+tolerance+LOCK_BREAK_MARGIN+(hash(`${identity}|break`)%4)+bonus);
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
    breakAt,
    hintLead,
    hintTail,
    maxAttempts,
    attemptsLeft:maxAttempts,
    tension:0,
    snapped:false,
    brokeInLock:false,
    turn:0,
    feedback:"Lean on the pick. Stop when the cylinder wants to turn.",
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

/* Leaning on the pick is itself a move: past breakAt it snaps and costs the
   attempt, without the player ever pressing "turn". */
export function pressLockTension(challenge,value){
  if(challenge.phase!=="lockpick") return {...challenge};
  const tension=clampLockTension(value);
  if(tension<challenge.breakAt)
    return {...challenge,tension,snapped:false,feedback:FEEL_TEXT[lockFeel(challenge,tension)]};

  const attemptsLeft=Math.max(0,(challenge.attemptsLeft||0)-1);
  return {
    ...challenge,
    phase:attemptsLeft===0?"coin_call":"lockpick",
    attemptsLeft,
    tension:0,
    snapped:true,
    // Only the LAST pick leaves evidence: with spares you can pull the stub out
    // and start again. Break the final one and half of it stays in the keyway.
    brokeInLock:attemptsLeft===0,
    turn:(challenge.turn||0)+1,
    feedback:attemptsLeft===0
      ?"The pick shears off. Half of it is still in the keyway, and it is not coming out by hand."
      :"The pick snaps. You work the stub free and bend another one straight.",
  };
}

export function tryLockpick(challenge){
  if(challenge.phase!=="lockpick") return {...challenge};
  const turn=(challenge.turn||0)+1;
  const tension=clampLockTension(challenge.tension);

  if(lockGives(challenge,tension)){
    return {...challenge,phase:"lock_success",tension,turn,snapped:false,
      feedback:"The pins settle in a row. The lock opens."};
  }

  const attemptsLeft=Math.max(0,(challenge.attemptsLeft||0)-1);
  return {
    ...challenge,
    phase:attemptsLeft===0?"coin_call":"lockpick",
    attemptsLeft,
    tension:0,
    snapped:false,
    brokeInLock:false,
    turn,
    feedback:attemptsLeft===0
      ?"The cylinder will not go. You pocket the pick — the noise, though, has been going on a while."
      :"Not enough. The cylinder rolls back and you start the pressure again.",
  };
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
    .map(event=>({event,key:hash(`${identity}|draw|${event.id}`)}))
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

export function createTimelineChallenge({runSeed,caseId,optionIndex,timelineId,events,count,cost,toil,lateExtra}){
  const identity=`${runSeed}|${caseId}|${timelineId}`;
  const {cards,order,solution}=timelineDeal(events,count,identity);
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
    .map((line,index)=>({line,index,key:hash(`${identity}|line|${line.id}`)}))
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
  .map(entry=>({entry,key:hash(`${identity}|${salt}|${entry.id}`)}))
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

export function createContradictionChallenge({runSeed,caseId,actionId,cost,toil,lateExtra,pairs,decoys}){
  const identity=`${runSeed}|${caseId}|${actionId}`;
  const {statements,documents,solution}=contradictionDeal(pairs,decoys,identity);
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
    maxAttempts:CONTRA_ATTEMPTS,
    attemptsLeft:CONTRA_ATTEMPTS,
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
  1:{speed:index=>[56,88,120][index]??120, speedJitter:index=>[12,16,20][index]??20,
     tolerance:index=>[20,13,9][index]??9, toleranceJitter:()=>4, minTolerance:6},
};
export function createPowerCutChallenge({runSeed,caseId,actionId,cost,toil,lateExtra,sneaky=0,rules=POWER_RULES}){
  const identity=`${runSeed}|${caseId}|${actionId}`;
  const sneakySnapshot=Math.max(0,Math.min(100,Math.round(Number(sneaky)||0)));
  const speedFactor=1-sneakySnapshot*.0035; // 100 SNEAKY is 35% slower
  const windowBonus=Math.round(sneakySnapshot*.08); // and up to 8deg wider
  const curve=POWER_CURVES[rules]||POWER_CURVES[POWER_RULES];

  const rings=Array.from({length:POWER_RING_COUNT},(_,index)=>{
    const ringIdentity=`${identity}|ring|${index}`;
    const target=hash(`${ringIdentity}|target`)%360;
    const tolerance=Math.max(curve.minTolerance,
      curve.tolerance(index)+(hash(`${ringIdentity}|window`)%curve.toleranceJitter(index))+windowBonus);
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
      speed:Math.round((curve.speed(index)+(hash(`${ringIdentity}|speed`)%curve.speedJitter(index)))*speedFactor*10)/10,
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
