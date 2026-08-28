// Trial model. Like fraud.js and ethics.js this module is deliberately
// state-free: the engine owns every mutation, the builders are deterministic,
// and a trial in progress survives a save without rerolling anything.
//
// The whole design rests on one rule: the player never sees a number. There is
// a jury meter, it moves on every decision, and it is never rendered — what the
// player gets instead is the room. That is why every swing carries prose.

export const TRIAL_VERSION=1;
/* The meter starts from the FILE, not from a constant: a case with a signed
   admission in it walks into the room ahead. Reading the file therefore stays
   the primary skill, exactly as it is everywhere else in this game. */
export const JURY_MIN=10, JURY_MAX=85;
export const JURY_START_MIN=30, JURY_START_MAX=55;
/* Never 100%: a jury is people. The ceiling is what stops a perfectly played
   trial from becoming a formality, which is the same reason safe plays cap the
   payoff instead of the odds elsewhere. */
export const PHASES=["opening","argument","closing"];
/* Eight grounds, and a one-line test for each. The list is fixed on purpose:
   after a few trials it stops being a menu and starts being a vocabulary, which
   is the point. The `tell` is what the reference card shows — short enough to
   check mid-question, specific enough to actually decide with. */
export const GROUNDS=[
  {id:"leading",     label:"LEADING",
   tell:"The question contains its own answer. '...isn't it?' '...wouldn't you agree?'"},
  {id:"hearsay",     label:"HEARSAY",
   tell:"Asks what someone NOT in the room said. 'Your predecessor told me...'"},
  {id:"speculation", label:"CALLS FOR SPECULATION",
   tell:"Asks the witness to guess at someone else's mind. 'What do you suppose they wanted?'"},
  {id:"assumes",     label:"ASSUMES FACTS NOT IN EVIDENCE",
   tell:"Smuggles in a fact nobody proved. 'When you destroyed the file...' — nobody said it was destroyed."},
  {id:"argumentative",label:"ARGUMENTATIVE",
   tell:"Not a question, a jab. 'Do you always sign things you haven't read?'"},
  {id:"relevance",   label:"RELEVANCE",
   tell:"True or false, it has nothing to do with this case. Tax affairs, old grudges, salary."},
  {id:"compound",    label:"COMPOUND",
   tell:"Two questions in one, so any answer is ambiguous. 'Did you read it, AND did you tell them?'"},
  {id:"asked",       label:"ASKED AND ANSWERED",
   tell:"They already got their answer and are hoping for a better one. 'One more time...'"},
];
export const GROUND_IDS=GROUNDS.map(g=>g.id);

/* Swing sizes. Small enough that one bad call never decides a trial, big enough
   that a run of them does — the player has to be wrong repeatedly to lose on
   conduct rather than on the merits of the file. */
export const SWING={
  openingStrong:8, openingWeak:-6, openingNeutral:0,
  argumentStrong:7, argumentWeak:-5,
  closingStrong:10, closingWeak:-7,
  objectionSustained:4,   // striking it protects you and impresses the room
  objectionOverruled:-3,  // the jury saw you reach
  improperMissed:-6,      // this is the real cost of not reading
};
export const JUDGE_REL_SUSTAIN=0.15; // relationship nudges rulings, never decides them

const clampJury=v=>Math.max(JURY_MIN,Math.min(JURY_MAX,Math.round(v)));
export const clampJuryValue=clampJury;

/* What the room looks like at a given standing. Prose only — this is the entire
   feedback channel, so it has to read differently at every band without ever
   implying a number. */
const ROOM_UP=[
  "Two jurors glance at each other. One of them nods.",
  "The foreman writes something down and underlines it.",
  "A juror in the back row has stopped looking at the clock.",
  "Opposing counsel's second chair leans in and whispers something urgent.",
  "The judge's pen pauses. That is not nothing.",
];
const ROOM_DOWN=[
  "Someone in the box exhales through their nose.",
  "A juror rereads their notes, frowning at the page rather than at you.",
  "The foreman's pen has not moved for a while.",
  "Opposing counsel does not object. They do not need to.",
  "The judge looks at the clock, then at you.",
];
const ROOM_FLAT=[
  "The room absorbs it without comment.",
  "Nobody writes anything down. Nobody stops listening either.",
  "The record takes it. The room does not react.",
];
export function roomLine(delta,pick){
  const pool=delta>0?ROOM_UP:delta<0?ROOM_DOWN:ROOM_FLAT;
  return pool[Math.abs(Math.trunc(pick))%pool.length];
}

/* A settlement offer is the ONE indirect readout of the hidden meter: opposing
   counsel offers more when they are losing. It is deliberately coarse — you
   learn "they are worried", never "you are at 62". */
export const OFFER_AT=58;          // they only blink once you are genuinely ahead
export const OFFER_GAIN=8;         // ...and only if YOU put them there
export const offerValue=jury=>Math.max(.25,Math.min(.8,(jury-20)/100));

export function createTrial({caseId,jury,phases,strength}){
  return {
    version:TRIAL_VERSION,
    caseId,
    jury:clampJury(jury),
    step:0,
    phases,                      // authored or generated, fixed at open time
    strength:strength||0,
    log:[],                      // prose the player has already seen
    startJury:clampJury(jury), // what the file was worth before anyone spoke
    offer:null,
    offerUsed:false,       // one offer per trial; a refusal is final
    settled:false,
    done:false,
    sustained:0, overruled:0, missed:0,
    strongPlays:0, weakPlays:0,
  };
}

export const trialPhase=trial=>trial&&trial.phases?trial.phases[trial.step]:null;
export const trialFinished=trial=>!!trial&&trial.step>=(trial.phases||[]).length;

export function applySwing(trial,delta){
  return {...trial,jury:clampJury(trial.jury+delta)};
}

/* Verdict: the meter IS the odds. No separate roll table, no hidden second
   check — whatever the player built is exactly what they are rolling against. */
export const verdictChance=trial=>clampJury(trial?trial.jury:JURY_MIN);

export function trialValidationError(trial,day){
  if(trial==null) return null;
  if(typeof trial!=="object"||Array.isArray(trial)) return "The saved trial is malformed.";
  if(trial.version!==TRIAL_VERSION) return "The saved trial is from another version.";
  if(typeof trial.caseId!=="string"||!trial.caseId) return "The saved trial has no case.";
  if(!Number.isInteger(trial.jury)||trial.jury<JURY_MIN||trial.jury>JURY_MAX)
    return "The saved jury standing is out of range.";
  if(!Array.isArray(trial.phases)||!trial.phases.length) return "The saved trial has no phases.";
  if(!Number.isInteger(trial.step)||trial.step<0||trial.step>trial.phases.length)
    return "The saved trial step is out of range.";
  for(const k of ["sustained","overruled","missed","strongPlays","weakPlays"])
    if(!Number.isInteger(trial[k])||trial[k]<0) return "The saved trial counters are damaged.";
  if(typeof trial.settled!=="boolean"||typeof trial.done!=="boolean")
    return "The saved trial flags are damaged.";
  if(trial.settled&&!trial.done) return "A settled trial must be finished.";
  if(!Array.isArray(trial.log)) return "The saved trial record is damaged.";
  if(!Number.isInteger(trial.startJury)||trial.startJury<JURY_MIN||trial.startJury>JURY_MAX)
    return "The saved opening standing is out of range.";
  if(typeof trial.offerUsed!=="boolean") return "The saved settlement flag is damaged.";
  if(trial.offer!=null&&!trial.offerUsed) return "The saved settlement offer has no record.";
  if(trial.offer!=null&&!(trial.offer>0&&trial.offer<=1))
    return "The saved settlement offer is out of range.";
  return null;
}
