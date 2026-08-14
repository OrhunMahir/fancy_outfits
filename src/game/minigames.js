import { hash } from "./utils.js";

export const LOCK_MIN=-70;
export const LOCK_MAX=70;
export const POWER_RING_COUNT=3;
export const POWER_FRAME_CAP_MS=80;

const LOCK_TOLERANCE=10;
const LOCK_ATTEMPTS=3;
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
  const span=LOCK_MAX-LOCK_MIN+1;
  const tolerance=Math.max(1,Math.min(30,LOCK_TOLERANCE+Math.trunc(Number(toleranceBonus)||0)));
  const maxAttempts=Math.max(1,Math.min(10,LOCK_ATTEMPTS+Math.trunc(Number(attemptBonus)||0)));
  return {
    type:"lockpick",
    phase:"lockpick",
    runSeed,
    caseId,
    actionId,
    cost,
    toil,
    lateExtra,
    target:LOCK_MIN+(hash(`${identity}|target`)%span),
    tolerance,
    maxAttempts,
    attemptsLeft:maxAttempts,
    position:0,
    turn:0,
    feedback:"Find the lock's sweet spot before the pick snaps.",
    coinFace:hash(`${identity}|coin`)%2===0?"heads":"tails",
  };
}

export function clampLockPosition(value){
  const n=Number(value);
  if(!Number.isFinite(n)) return 0;
  return Math.max(LOCK_MIN,Math.min(LOCK_MAX,n));
}

export function tryLockpick(challenge,position){
  if(challenge.phase!=="lockpick") return {...challenge};

  const nextPosition=clampLockPosition(position);
  const distance=Math.abs(nextPosition-challenge.target);
  const turn=(challenge.turn||0)+1;

  if(distance<=challenge.tolerance){
    return {
      ...challenge,
      phase:"lock_success",
      position:nextPosition,
      turn,
      feedback:"The pins settle. The lock opens.",
    };
  }

  const attemptsLeft=Math.max(0,(challenge.attemptsLeft||0)-1);
  let feedback;
  if(attemptsLeft===0) feedback="The pick snaps. Call the coin and try to get away.";
  else if(distance<=challenge.tolerance*2) feedback="Almost. The cylinder gives, then catches.";
  else if(distance<=challenge.tolerance*4) feedback="The pins shift. You're getting warmer.";
  else feedback="Wrong angle. The pick strains.";

  return {
    ...challenge,
    phase:attemptsLeft===0?"coin_call":"lockpick",
    attemptsLeft,
    position:nextPosition,
    turn,
    feedback,
  };
}

export function callCoin(challenge,call){
  const coinCall=String(call).toLowerCase()==="heads"?"heads":"tails";
  const escaped=coinCall===challenge.coinFace;
  const power=challenge.type==="power_cut";
  return {
    ...challenge,
    phase:"coin_result",
    coinCall,
    escaped,
    feedback:escaped
      ?(power?"You called it. The guard checks the wrong stairwell and you slip away.":"You called it. Footsteps pass and you slip away.")
      :(power?"Wrong call. Security catches you under the emergency lights.":"Wrong call. Security catches you at the door."),
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

// Three timing rings for the electrical sabotage action. The shared gameplay
// RNG is deliberately never read here: a run/case/action identity fixes the
// board, while the snapshotted SNEAKY score changes only its difficulty.
export function createPowerCutChallenge({runSeed,caseId,actionId,cost,toil,lateExtra,sneaky=0}){
  const identity=`${runSeed}|${caseId}|${actionId}`;
  const sneakySnapshot=Math.max(0,Math.min(100,Math.round(Number(sneaky)||0)));
  const speedFactor=1-sneakySnapshot*.0035; // 100 SNEAKY is 35% slower
  const windowBonus=Math.round(sneakySnapshot*.08); // and up to 8deg wider

  const rings=Array.from({length:POWER_RING_COUNT},(_,index)=>{
    const ringIdentity=`${identity}|ring|${index}`;
    const target=hash(`${ringIdentity}|target`)%360;
    const tolerance=Math.max(8,16-index*2+(hash(`${ringIdentity}|window`)%5)+windowBonus);
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
      speed:Math.round((66+index*11+(hash(`${ringIdentity}|speed`)%25))*speedFactor*10)/10,
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
