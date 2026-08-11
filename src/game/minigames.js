import { hash } from "./utils.js";

export const LOCK_MIN=-70;
export const LOCK_MAX=70;

const LOCK_TOLERANCE=10;
const LOCK_ATTEMPTS=3;

// Minigame outcomes derive from stable identities, never the shared gameplay RNG.
export function createLockpickChallenge({runSeed,caseId,actionId,cost,toil,lateExtra}){
  const identity=`${runSeed}|${caseId}|${actionId}`;
  const span=LOCK_MAX-LOCK_MIN+1;
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
    tolerance:LOCK_TOLERANCE,
    maxAttempts:LOCK_ATTEMPTS,
    attemptsLeft:LOCK_ATTEMPTS,
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
  return {
    ...challenge,
    phase:"coin_result",
    coinCall,
    escaped,
    feedback:escaped
      ?"You called it. Footsteps pass and you slip away."
      :"Wrong call. Security catches you at the door.",
  };
}
