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
