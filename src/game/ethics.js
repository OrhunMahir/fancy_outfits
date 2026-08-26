// Bar discipline. Like fraud.js this module is deliberately state-free: the
// engine owns every mutation, while the builders and validation stay pure so a
// pending grievance survives a save without rerolling.
//
// The heat is HIDDEN by design (the player asked for it that way). You never
// see a number, so the escalating letters ARE the readout — which means each
// stage has to be unmistakably worse than the last, and each one has to give
// you something to do about it.

export const BAR_VERSION=1;
export const BAR_MAX=100;
export const BAR_STAGE_MAX=3;
/* Weights say what the profession actually cares about. Getting caught inside a
   building you had no right to enter is the one that ends careers; paying a
   judge is corruption but a quiet, deniable kind; hiding documents from a court
   is the one a judge personally reports. */
export const BAR_WEIGHTS={caught:24, bribe:8, obstruction:15};
export const BAR_DECAY=1;              // the bar forgets. slowly.
export const BAR_STAGE_AT=[0,26,54,80]; // heat at which each letter arrives
export const BAR_STAGE_LABELS=["CLEAN","GRIEVANCE","COMPLAINT","HEARING"];

const BAR_KEYS=["version","heat","stage","pendingKind","pendingDay","violations","caught","bribe","obstruction"];

export const createBarHeat=()=>({
  version:BAR_VERSION,
  heat:0,
  stage:0,
  pendingKind:null,
  pendingDay:0,
  violations:0,
  caught:0,
  bribe:0,
  obstruction:0,
});

export const barStageFor=heat=>{
  let stage=0;
  for(let i=1;i<BAR_STAGE_AT.length;i++) if(heat>=BAR_STAGE_AT[i]) stage=i;
  return stage;
};

/* What the summary is allowed to say once the run is over. During a career this
   returns nothing: a hidden meter that leaks through a tooltip is not hidden. */
export function barRecord(bar){
  if(!bar||!bar.violations) return null;
  const parts=[];
  if(bar.caught) parts.push(bar.caught+"× caught inside");
  if(bar.bribe) parts.push(bar.bribe+"× judicial 'green fees'");
  if(bar.obstruction) parts.push(bar.obstruction+"× withheld production");
  return parts.length?"BAR FILE: "+parts.join(" · "):null;
}

const stageEvents={
  1:{
    id:"bar_grievance",
    title:"A LETTER FROM THE BAR",
    body:"A grievance has been filed against you. No name on it, and the language is careful enough to have been written by a lawyer. It asks about a night you would rather not date precisely. Grievances are dismissed all the time. They are also kept forever.",
    opts:[
      {text:"Answer it properly. Cite everything. (1.5h)",base:100,safe:true,hours:1.5,fatigue:4,
        ok:{fx:{bold:-3},bar:{cool:20},txt:"Nineteen pages of nothing anyone can use. The file closes. It does not disappear."}},
      {text:"Have a partner's assistant answer it for you. ($900)",base:78,style:"technical",
        ok:{fx:{money:-900},bar:{cool:24},txt:"Handled at a level where these things are handled. You are not copied on the reply, which is the point."},
        fail:{fx:{money:-900,rep:-5},bar:{heat:6},txt:"The assistant answers a question nobody asked. Now they are curious about that too."}},
      {text:"Ignore it. Grievances die of boredom.",base:52,boldW:2,style:"aggressive",
        ok:{fx:{bold:5},bar:{cool:14},txt:"Ninety days pass. Nothing arrives. You stop checking the post."},
        fail:{fx:{rep:-4},bar:{heat:10},txt:"Silence reads as contempt. Someone senior is assigned to find out why you did not reply."}},
    ],
  },
  2:{
    id:"bar_complaint",
    title:"FORMAL COMPLAINT",
    body:"It is no longer a letter. The disciplinary committee has opened a file with a number on it, and the number is yours. They want documents — the ones you have, and by implication the ones you do not.",
    opts:[
      {text:"Retain real counsel. Do this properly. ($3000, 2h)",base:100,safe:true,hours:2,fatigue:6,
        ok:{fx:{money:-3000,bold:-4},bar:{cool:34},txt:"Your lawyer is bored by your problem, which is the most reassuring thing that has happened all month."}},
      {text:"Produce everything and explain the gaps. (2h)",base:70,style:"technical",hours:2,fatigue:7,
        ok:{fx:{rep:4,inf:3},bar:{cool:28},txt:"Candour is disarming when it is early. The committee notes cooperation and moves on."},
        fail:{fx:{rep:-8},bar:{heat:9},txt:"The gaps explain themselves, badly. The committee reads them the other way."}},
      {text:"Produce a version of everything.",base:38,boldW:3,style:"aggressive",
        ok:{fx:{bold:8,inf:3},bar:{cool:22},txt:"Nothing in the file contradicts anything else in the file. It is beautiful work, and nobody will ever praise it."},
        fail:{fx:{rep:-12},bar:{heat:16},txt:"Two documents disagree about a Tuesday. That is now the whole case."}},
    ],
  },
  3:{
    id:"bar_hearing",
    title:"DISCIPLINARY HEARING",
    body:"A room with three practitioners in it who have all been doing this longer than you. They are not hostile. That is somehow worse. Whatever you say here becomes the record, and the record is what decides whether you are still a lawyer next month.",
    opts:[
      {text:"Admit the conduct. Accept the sanction. (2.5h)",base:100,safe:true,hours:2.5,fatigue:9,
        ok:{fx:{rep:-6,bold:-8,inf:-4},bar:{cool:60},txt:"A suspension you serve quietly, a fine you pay in full, and a career that continues. Smaller, but continuing."}},
      {text:"Argue it was zealous representation. (2h)",base:56,style:"technical",hours:2,fatigue:8,
        ok:{fx:{rep:6,inf:5},bar:{cool:48},txt:"You draw a line between aggressive and improper, and the panel — grudgingly — stands on your side of it."},
        fail:{fx:{rep:-10},bar:{heat:14},txt:"The line you drew has you on the wrong side of it. The panel adjourns to consider something worse."}},
      {text:"Deny everything. Make them prove it.",base:30,boldW:3,style:"aggressive",hours:1.5,fatigue:6,
        ok:{fx:{bold:12,inf:6},bar:{cool:40},txt:"They cannot prove it. Everyone in the room knows what happened. Nobody can write it down."},
        fail:{disbar:true,fx:{},txt:"They could prove it. They had been able to prove it for some time, and were waiting to see what you would say."}},
    ],
  },
};

export function buildBarEvent(bar){
  const stage=Math.max(1,Math.min(BAR_STAGE_MAX,Math.trunc(bar?.stage||1)));
  return {barKind:"discipline",barStage:stage,...stageEvents[stage]};
}

export const barValidationError=(bar,day)=>{
  if(bar==null) return null;
  if(typeof bar!=="object"||Array.isArray(bar)) return "The saved bar file is malformed.";
  if(Object.keys(bar).some(k=>!BAR_KEYS.includes(k))) return "The saved bar file carries unknown fields.";
  if(bar.version!==BAR_VERSION) return "The saved bar file is from another version.";
  for(const k of ["heat","violations","caught","bribe","obstruction","pendingDay","stage"])
    if(!Number.isInteger(bar[k])||bar[k]<0) return "The saved bar file counters are damaged.";
  if(bar.heat>BAR_MAX||bar.stage>BAR_STAGE_MAX) return "The saved bar file exceeds its own limits.";
  if(bar.pendingDay>day+1) return "The saved bar file is scheduled beyond the calendar.";
  if(bar.pendingKind!=null&&bar.pendingKind!=="discipline") return "The saved bar file has an unknown pending action.";
  if((bar.pendingKind==null)!==(bar.pendingDay===0)) return "The saved bar file's pending action is inconsistent.";
  // Counters and stage must agree with each other, so a tampered save cannot
  // walk in with a clean stage and a full meter.
  if(bar.stage>barStageFor(bar.heat)) return "The saved bar file's stage outruns its heat.";
  if(bar.violations<bar.caught+bar.bribe+bar.obstruction) return "The saved bar file's tally is short.";
  /* Heat only ever comes from recorded violations and only ever decays, so it
     can never exceed what the tally could have produced. Without this a tampered
     save could walk in one morning from a disciplinary hearing it never earned. */
  const earned=bar.caught*BAR_WEIGHTS.caught+bar.bribe*BAR_WEIGHTS.bribe+bar.obstruction*BAR_WEIGHTS.obstruction;
  if(bar.heat>Math.min(BAR_MAX,earned)) return "The saved bar file's heat outruns its record.";
  return null;
};

export function barEventValidationError(event,bar){
  if(!event||!event.barKind) return null;
  if(!bar) return "A bar confrontation is open without a bar file.";
  if(event.barKind!=="discipline") return "The saved bar confrontation is of an unknown kind.";
  const expected=buildBarEvent({...bar,stage:event.barStage});
  if(event.id!==expected.id||event.title!==expected.title||event.body!==expected.body)
    return "The saved bar confrontation was altered.";
  if(!Number.isInteger(event.barStage)||event.barStage<1||event.barStage>BAR_STAGE_MAX)
    return "The saved bar confrontation has no valid stage.";
  return null;
}
