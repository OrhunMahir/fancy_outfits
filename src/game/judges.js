// Judge relationships and temperament. Pure like fraud.js / ethics.js / trial.js:
// the engine owns every mutation.
//
// This is deliberately SEPARATE from judgeMemory. That store answers "what has
// this judge seen you do in court", and every record in it must have at least
// one appearance behind it. A relationship can move before you ever stand in
// front of someone — you can play golf with a judge you have never drawn — so
// mixing the two would mean weakening a proven invariant to fit a new feature.

export const JUDGE_REL_VERSION=1;
export const REL_MIN=-100, REL_MAX=100;

/* Named temperaments on top of the existing temper/book/corrupt numbers. Each
   one changes something the player can SEE happen in the room, so a trait is
   never just a hidden multiplier. */
export const JUDGE_TRAITS={
  stickler:{label:"STICKLER",  note:"Objections had better be right."},
  patient: {label:"PATIENT",   note:"Forgives a reach. Once."},
  showman: {label:"SHOWMAN",   note:"Rewards a bold line."},
  pedant:  {label:"PEDANT",    note:"Rewards a careful one."},
};
export const TRAIT_BY_JUDGE={
  ironwood:"stickler", marsh:"patient", pelt:"pedant", crane:"showman",
  whitlock:"stickler", okonkwo:"pedant", fairway:"showman",
};
export const traitOf=judge=>TRAIT_BY_JUDGE[judge&&judge.id]||null;
export const traitInfo=judge=>JUDGE_TRAITS[traitOf(judge)]||null;

export const createJudgeRel=()=>({});
const REL_KEYS=["rel","golf","bribesOffered","bribesTaken","lastGolfDay","burned"];
export const emptyRel=()=>({rel:0,golf:0,bribesOffered:0,bribesTaken:0,lastGolfDay:0,burned:false});

export const clampRel=v=>Math.max(REL_MIN,Math.min(REL_MAX,Math.round(Number(v)||0)));
export const relOf=(store,judge)=>{
  const id=judge&&judge.id;
  return id&&store&&store[id]?store[id].rel:0;
};
/* Four bands, because the player is told the band and never the number: an
   investment you are asked to make should be legible without being a readout. */
export const relBand=rel=>rel<=-35?"HOSTILE":rel<-10?"COLD":rel<25?"CORDIAL":rel<60?"WARM":"FRIENDLY";
export const relLabel=(store,judge)=>relBand(relOf(store,judge));

/* Every effect below is deliberately SMALL. A relationship should tilt a close
   call, never decide a case — the user was explicit about that, and it is also
   the only way golf stays a nice-to-have instead of a required chore. */
export const REL_CASE_BONUS=4;    // max +/-4 on a non-trial play before this judge
export const REL_JURY_BONUS=2;    // max +/-2 on a sustained objection's swing
export const REL_OFFER_SHIFT=6;   // a friendly bench nudges the parties together sooner
export const caseModifier=rel=>Math.round((clampRel(rel)/REL_MAX)*REL_CASE_BONUS);
export const juryModifier=rel=>Math.round((clampRel(rel)/REL_MAX)*REL_JURY_BONUS);
export const offerShift=rel=>Math.round((Math.max(0,clampRel(rel))/REL_MAX)*REL_OFFER_SHIFT);
/* The one place a relationship changes a RULING: you named the wrong ground for
   an argument that really was improper. A judge who likes you fixes it for you;
   a cold one lets you sit down. Being flatly wrong is never rescued. */
export const MERCY_AT=30;
export const grantsMercy=rel=>clampRel(rel)>=MERCY_AT;

/* Frivolous objections cost more in front of a stickler and less in front of a
   patient one. Applied to the relationship hit AND the jury swing, so the trait
   is felt twice in the same moment — which is what makes it readable. */
export const frivolousMultiplier=judge=>{
  const t=traitOf(judge);
  return t==="stickler"?2:t==="patient"?0.5:1;
};
/* A judge who likes theatre or precision leans toward that kind of argument.
   Trial options carry an optional flavor so the bench can react to HOW you
   argued, not just whether the line was strong. */
export const flavorBonus=(judge,flavor)=>{
  const t=traitOf(judge);
  if(!flavor||!t) return 0;
  if(t==="showman") return flavor==="bold"?2:flavor==="technical"?-1:0;
  if(t==="pedant") return flavor==="technical"?2:flavor==="bold"?-1:0;
  return 0;
};

/* Bribery. The amount is the player's to choose, and the ceiling is low on
   purpose: this is never a strategy, it is a thing you do when you are out of
   better ideas. A clean judge cannot be bought at any price. */
export const BRIBE_MIN=500, BRIBE_MAX=20000;
export const BRIBE_CEILING=35;
export function bribeChance(judge,amount){
  const corrupt=Math.max(0,Math.min(100,Number(judge&&judge.corrupt)||0));
  const money=Math.max(0,Number(amount)||0);
  if(corrupt<20) return 0;                       // some benches are simply not for sale
  // Diminishing returns: the first few thousand buy most of what money can buy.
  const paid=1-Math.exp(-money/6000);
  const ceiling=BRIBE_CEILING*(corrupt/100);
  return Math.round(ceiling*paid);
}

export function judgeRelValidationError(store,day,knownIds){
  if(store==null) return null;
  if(typeof store!=="object"||Array.isArray(store)) return "The saved bench relationships are malformed.";
  for(const [id,r] of Object.entries(store)){
    if(!knownIds.has(id)) return "The saved bench relationships name an unknown judge.";
    if(!plainRecord(r)) return "A saved bench relationship is malformed.";
    if(Object.keys(r).some(k=>!REL_KEYS.includes(k))) return "A saved bench relationship carries unknown fields.";
    if(!Number.isInteger(r.rel)||r.rel<REL_MIN||r.rel>REL_MAX) return "A saved bench relationship is out of range.";
    for(const k of ["golf","bribesOffered","bribesTaken","lastGolfDay"])
      if(!Number.isInteger(r[k])||r[k]<0) return "A saved bench relationship counter is damaged.";
    if(typeof r.burned!=="boolean") return "A saved bench relationship flag is damaged.";
    if(r.lastGolfDay>day) return "A saved bench relationship is dated beyond the calendar.";
    if(r.bribesTaken>r.bribesOffered) return "A saved bench relationship tally is impossible.";
    // A refused bribe is what burns a bench; the flag cannot exist without one.
    if(r.burned&&r.bribesOffered<=r.bribesTaken) return "A saved bench relationship is burned without cause.";
  }
  return null;
}
const plainRecord=v=>!!v&&typeof v==="object"&&!Array.isArray(v);
