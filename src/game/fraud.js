// Fraud-scenario identity pressure. This module is deliberately state-free:
// the engine owns mutations, while builders and validation stay deterministic
// so an active confrontation can be saved and resumed without a reroll.

export const FRAUD_RISK_VERSION=2;
export const FRAUD_SUSPICION_MAX=3;
export const FRAUD_SLIP_FATIGUE=80;

const RISK_V1_KEYS=["version","suspicion","lastCheckDay","dailyPeak","slipCount","contained","pendingKind","pendingDay","inquiryCount"];
const RISK_KEYS=[...RISK_V1_KEYS,"morningPhase"];
const STAGE_LABELS=["QUIET","WHISPER","SCRUTINY","CREDENTIALS HOLD"];

export const createFraudRisk=scenario=>scenario==="fraud"?{
  version:FRAUD_RISK_VERSION,
  suspicion:0,
  lastCheckDay:0,
  dailyPeak:0,
  slipCount:0,
  contained:0,
  pendingKind:null,
  pendingDay:0,
  inquiryCount:0,
  morningPhase:"idle",
}:null;

export function createFraudRiskV1(scenario){
  const current=createFraudRisk(scenario);
  if(!current) return null;
  const {morningPhase,...legacy}=current;
  return {...legacy,version:1};
}

// Nominal once-per-day chance for the highest work-fatigue band reached.
// Returned as a fraction because the deterministic RNG also returns 0..1.
export function fraudSlipChance(fatigue){
  if(!Number.isFinite(fatigue)||fatigue<FRAUD_SLIP_FATIGUE) return 0;
  if(fatigue>=100) return .05;
  if(fatigue>=95) return .03;
  if(fatigue>=90) return .015;
  return .005;
}

function riskValidationError(risk,scenario,day,version,expected,hasMorningResume){
  if(scenario!=="fraud") return risk===null?null:"non-fraud";
  if(!risk||typeof risk!=="object"||Array.isArray(risk)) return "record";
  const keys=Object.keys(risk).sort(), sortedExpected=[...expected].sort();
  if(keys.length!==sortedExpected.length||keys.some((key,index)=>key!==sortedExpected[index])) return "keys";
  if(risk.version!==version) return "version";
  const nonNegative=key=>Number.isSafeInteger(risk[key])&&risk[key]>=0;
  if(!["suspicion","lastCheckDay","dailyPeak","slipCount","contained","pendingDay","inquiryCount"].every(nonNegative)) return "counter";
  if(risk.suspicion>FRAUD_SUSPICION_MAX) return "suspicion";
  if(risk.dailyPeak>100) return "daily-peak";
  if(!Number.isSafeInteger(day)||day<1||risk.lastCheckDay>day||risk.slipCount>day||risk.contained>day||risk.inquiryCount>day) return "timeline";
  if(risk.pendingKind!==null&&!["slip","inquiry"].includes(risk.pendingKind)) return "pending-kind";
  if((risk.pendingKind===null)!==(risk.pendingDay===0)) return "pending-pair";
  if(risk.pendingKind==="slip"&&risk.slipCount<1) return "pending-slip";
  if(risk.pendingKind==="inquiry"&&(risk.suspicion<1||risk.suspicion>FRAUD_SUSPICION_MAX)) return "pending-inquiry";
  if(hasMorningResume&&(!["idle","resume","complete"].includes(risk.morningPhase)||
    (risk.morningPhase!=="idle"&&risk.pendingKind!==null))) return "morning-phase";
  // A confrontation is normally scheduled for tomorrow. It may become
  // overdue when a promotion summary holds priority, but cannot be invented
  // farther in the future.
  if(risk.pendingDay>day+1) return "pending-day";
  return null;
}

// Schema 13 carried the first identity-pressure record. Keep its validator
// explicit so schema 14 can upgrade honest in-progress slots without trusting
// a forged legacy object and without rerolling any queued confrontation.
export const fraudRiskV1ValidationError=(risk,scenario,day)=>
  riskValidationError(risk,scenario,day,1,RISK_V1_KEYS,false);

export const fraudRiskValidationError=(risk,scenario,day)=>
  riskValidationError(risk,scenario,day,FRAUD_RISK_VERSION,RISK_KEYS,true);

export function fraudRiskInfo(risk,fatigue,day){
  if(!risk) return null;
  const peak=Math.max(risk.dailyPeak||0,Number.isFinite(fatigue)?fatigue:0);
  const chance=fraudSlipChance(peak);
  return {
    suspicion:risk.suspicion,
    max:FRAUD_SUSPICION_MAX,
    label:STAGE_LABELS[risk.suspicion],
    checkedToday:risk.lastCheckDay===day,
    dailyPeak:risk.dailyPeak,
    slipChance:chance,
    slipChancePct:chance*100,
    pendingKind:risk.pendingKind,
    pendingDay:risk.pendingDay,
    morningPhase:risk.morningPhase,
    slipCount:risk.slipCount,
    contained:risk.contained,
  };
}

const slipBodies=[
  "At the copier, someone asks which professor taught your first-year contracts class. Exhaustion answers before judgment does: 'I never—' You turn the last word into a cough. The room heard enough to look up.",
  "You sign a draft email 'JD pending.' You do not have a pending JD. Raquel catches the line before SEND, but the version history does not forget as quickly as people do.",
  "Hardwick jokes about graduation photos. Running on fumes, you name a year when your supposed law school held no ceremony. His smile pauses for half a second.",
  "A clerk asks for your bar number. You recite the fake one, then automatically correct two digits. Both versions are now written on the same yellow note.",
  "You call a deposition 'my first day inside a law school.' The sentence lands, impossible and complete. Opposing counsel circles something on a pad.",
];

export function buildFraudSlipEvent(risk){
  const index=Math.max(0,(risk?.slipCount||1)-1)%slipBodies.length;
  return {
    id:"fraud_slip",
    fraudKind:"slip",
    fraudStage:risk?.suspicion||0,
    title:"THE SECRET — A FATIGUE SLIP",
    body:slipBodies[index]+" This is not exposure yet. It is the moment before a story becomes a question.",
    opts:[
      {text:"Play it small. Blame exhaustion and give them nothing else.",base:100,safe:true,
        ok:{fx:{inf:-2,bold:-3},fraud:{set:1,schedule:true},txt:"You make the mistake look ordinary. It mostly works. Mostly earns a follow-up question tomorrow."}},
      {text:"Build a clean explanation from the file trail.",base:72,style:"technical",
        ok:{fx:{inf:2},fraud:{set:0,contained:true},txt:"Dates, emails, and one boring explanation interlock. The question dies under paperwork."},
        fail:{fx:{rep:-5},fraud:{set:1,schedule:true},txt:"The explanation has one date too many. Someone writes down the contradiction."}},
      {text:"Turn the room around: question THEIR memory.",base:40,boldW:3,style:"aggressive",
        ok:{fx:{bold:5},fraud:{set:0,contained:true},txt:"Confidence becomes evidence because nobody wants to admit they are unsure. The moment passes."},
        fail:{fx:{rep:-8},fraud:{set:2,schedule:true},txt:"You push too hard. Curiosity becomes suspicion, and suspicion now has an appointment."}},
    ],
  };
}

const inquiryEvents={
  1:{
    id:"fraud_inquiry_1", title:"IDENTITY PRESSURE I — THE ALUMNI QUESTION",
    body:"An alum from your supposed law school visits the floor and remembers everyone. She does not remember you. Over coffee, she asks which Contracts professor you had and waits with the pleasant patience of someone comparing notes.",
    opts:[
      {text:"Keep it dull: say you transferred sections and change the subject.",base:100,safe:true,
        ok:{fx:{bold:-3},fraud:{set:0,contained:true},txt:"The answer is too boring to chase. The whisper loses oxygen."}},
      {text:"Use the school's archived faculty schedule to name the right professor.",base:72,style:"technical",
        ok:{fx:{rep:3,inf:2},fraud:{set:0,contained:true},txt:"One real name, one real sabbatical, one perfectly uninteresting memory. She nods."},
        fail:{fx:{rep:-6},fraud:{set:2,schedule:true},txt:"The professor was abroad that term. Her smile stays; the question goes to HR."}},
      {text:"Tell a legendary classroom story before she can test you.",base:40,boldW:3,style:"aggressive",
        ok:{fx:{bold:5,inf:3},fraud:{set:0,contained:true},txt:"By lunch, she is repeating YOUR story. Nobody asks whether it happened."},
        fail:{fx:{rep:-9},fraud:{set:2,schedule:true},txt:"She was in that class. The story is impossible. HR receives a very polite email."}},
    ],
  },
  2:{
    id:"fraud_inquiry_2", title:"IDENTITY PRESSURE II — TWO BAR NUMBERS",
    body:"A court clerk flags the two bar numbers you gave on different filings. One digit can be a typo. Two complete identities are not. The discrepancy has reached Parson Henderson's conflicts desk.",
    opts:[
      {text:"Accept the humiliation: call it a copied vendor number and amend both filings.",base:100,safe:true,
        ok:{fx:{inf:-4,bold:-3},fraud:{set:1,contained:true},txt:"The amendments are ugly and public, but the conflicts desk closes its ticket. A whisper remains."}},
      {text:"Trace the metadata and manufacture one defensible clerical chain.",base:62,style:"technical",
        ok:{fx:{rep:4,inf:3},fraud:{set:0,contained:true},txt:"Every bad digit now has a timestamp and an innocent author. The ticket closes."},
        fail:{fx:{rep:-9},fraud:{set:3,schedule:true},txt:"The metadata points back to you twice. The insurer asks for the underlying credential file."}},
      {text:"Threaten a sanctions motion over the clerk's 'data breach.'",
        base:34,boldW:3,style:"aggressive",
        ok:{fx:{bold:6,inf:4},fraud:{set:1,contained:true},txt:"The courthouse retreats from the fight. The firm calls it resolved and quietly keeps a note."},
        fail:{fx:{rep:-12,firm:-3},fraud:{set:3,schedule:true},txt:"The clerk attaches your threat to the referral. The malpractice insurer opens a file with your name on it."}},
    ],
  },
  3:{
    id:"fraud_inquiry_3", title:"IDENTITY PRESSURE III — PROOF OF DEGREE",
    body:"The malpractice carrier requests primary-source proof of your degree before renewing the firm's policy. Hardwick closes the conference-room blinds. This is the last layer between suspicion and an empty credential record.",
    opts:[
      {text:"Give Hardwick the whole truth and let him bury it — at your expense.",base:100,safe:true,
        ok:{fx:{inf:-10,bold:-6},fraud:{set:1,contained:true},txt:"Hardwick contains the file, not the damage. You survive. He now owns the ugliest truth in the building."}},
      {text:"Exploit the insurer's archive migration and substitute a verified legacy image.",base:55,style:"technical",
        ok:{fx:{rep:3,inf:4},fraud:{set:1,contained:true},txt:"The checksum passes. The carrier renews. One whisper remains in Hardwick's locked drawer."},
        fail:{expose:true,fx:{},fraud:{set:3},txt:"The checksum points to a file created this morning. The carrier calls the bar. The bar calls the firm."}},
      {text:"Force renewal by threatening to move the firm's entire policy.",base:30,boldW:3,style:"aggressive",
        ok:{fx:{bold:8,inf:5},fraud:{set:1,contained:true},txt:"The carrier blinks at the size of the account. Proof is deferred. The secret survives inside a much larger threat."},
        fail:{expose:true,fx:{},fraud:{set:3},txt:"They accept the threat and terminate coverage. Their exit memo lists the missing degree as cause."}},
    ],
  },
};

export function buildFraudInquiryEvent(risk){
  const stage=Math.max(1,Math.min(FRAUD_SUSPICION_MAX,Math.trunc(risk?.suspicion||1)));
  return {fraudKind:"inquiry",fraudStage:stage,...inquiryEvents[stage]};
}

export function buildFraudAuditEvent(risk){
  return {
    id:"audit",
    fraudKind:"audit",
    fraudStage:risk?.suspicion||0,
    title:"CRISIS: Bar credentials audit",
    body:"The firm is running a routine bar-credentials audit. Yours would come back... creative. The auditor, coincidentally, is drowning in her own caseload and mentions she'd kill for help on a filing.",
    opts:[
      {text:"Help with her filing. All night. Every night.",base:80,
        ok:{fx:{inf:4,bold:2},fraud:{set:0,contained:true},txt:"Your file mysteriously moves to the bottom of the pile. Forever, hopefully."},
        fail:{fx:{rep:-8},fraud:{set:2,schedule:true},txt:"She helps you back — by escalating your file 'as a courtesy'. Sweat."}},
      {text:"Pay a 'database consultant'. ($1500)",base:65,
        ok:{fx:{money:-1500},fraud:{set:0,contained:true},txt:"Your record now exists. It even has a GPA. A modest one, for realism."},
        fail:{fx:{money:-1500,rep:-12},fraud:{set:2,schedule:true},txt:"The consultant vanishes with the money and leaves a typo in your fake bar number."}},
      {text:"Do nothing. You've survived worse.",base:35,boldW:3,style:"aggressive",
        ok:{fx:{bold:6},fraud:{set:0,contained:true},txt:"The audit skips associates below Senior. Breathe."},
        fail:{expose:true,fx:{},fraud:{set:3},txt:"'Quick question about your law school,' says the email. Then HR. Then a man with a clipboard and your fake transcript."}},
    ],
  };
}

export function fraudEventValidationError(event,risk,scenario){
  if(!event) return null;
  const reservedId=event.id==="fraud_slip"||event.id==="audit"||/^fraud_inquiry_[123]$/.test(event.id||"");
  const hasFraudOutcome=Array.isArray(event.opts)&&event.opts.some(option=>
    option&&((option.ok&&option.ok.fraud)||(option.fail&&option.fail.fraud)));
  if(event.fraudKind==null&&!reservedId&&!hasFraudOutcome) return null;
  if(event.fraudKind==null) return "marker";
  if(scenario!=="fraud"||!risk) return "scenario";
  const expected=event.fraudKind==="slip"?buildFraudSlipEvent(risk):
    event.fraudKind==="inquiry"?buildFraudInquiryEvent(risk):
      event.fraudKind==="audit"?buildFraudAuditEvent(risk):null;
  if(!expected) return "kind";
  return JSON.stringify(event)===JSON.stringify(expected)?null:"event";
}
