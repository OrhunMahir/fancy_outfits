import { useEffect, useLayoutEffect, useRef, useState } from "react";
import LockpickMinigame from "./LockpickMinigame.jsx";
import PowerCutMinigame from "./PowerCutMinigame.jsx";
import TimelineMinigame from "./TimelineMinigame.jsx";
import ContradictionMinigame from "./ContradictionMinigame.jsx";
import RedactionMinigame from "./RedactionMinigame.jsx";
import ObjectionMinigame from "./ObjectionMinigame.jsx";
import { LOCK_HOLD_MS, LOCK_MAX } from "../../game/minigames.js";

/* Every guide plays the REAL board — the same components, the same CSS — driven
   by a fabricated challenge this file owns. Nothing here touches game state or
   the engine: `demo` makes the board a read-only picture, and the material is
   always invented, so watching a guide can never solve the puzzle behind it. */

const useClock=total=>{
  const [t,setT]=useState(0);
  useEffect(()=>{
    let raf=0; const start=performance.now();
    const tick=now=>{ setT((now-start)%total); raf=requestAnimationFrame(tick); };
    raf=requestAnimationFrame(tick);
    return ()=>cancelAnimationFrame(raf);
  },[total]);
  return t;
};

/* The hand is placed by MEASURING the control it is pointing at, not by guessing
   percentages: a demo cursor that lands next to the button teaches the wrong
   thing, and the offsets moved with every font and layout change. */
const center=(stage,sel)=>{
  const el=stage.querySelector(sel);
  if(!el) return null;
  const a=el.getBoundingClientRect(),b=stage.getBoundingClientRect();
  return {x:a.left-b.left+a.width/2,y:a.top-b.top+a.height/2};
};
const ease=k=>k<=0?0:k>=1?1:k*k*(3-2*k);
const glide=(from,to,k)=>from&&to?{x:from.x+(to.x-from.x)*ease(k),y:from.y+(to.y-from.y)*ease(k)}:(to||from);
const press=(t,at,span=280)=>t>=at&&t<at+span;

function GuideBoard({caption,cursor,children}){
  const stageRef=useRef(null),handRef=useRef(null);
  // After layout, never during render: the control has to exist before it can
  // be measured, and this way tracking costs no extra React pass.
  useLayoutEffect(()=>{
    const stage=stageRef.current,hand=handRef.current;
    if(!stage||!hand) return;
    const point=cursor(stage);
    if(!point){ hand.style.opacity="0"; return; }
    hand.style.opacity="1";
    hand.style.left=point.x+"px";
    hand.style.top=point.y+"px";
    hand.classList.toggle("guide-cursor-press",!!point.press);
  });
  return (
    <div className="guide-demo">
      <div className="guide-board" ref={stageRef} aria-hidden="true">
        {children}
        <span className="guide-cursor" ref={handRef} />
      </div>
      <p className="guide-caption">{caption}</p>
    </div>
  );
}

/* LOCKPICK — the one board where nothing is ever pressed. The hand rides the
   slider and then simply stops, which is the entire lesson. */
function LockDemo(){
  const t=useClock(9000);
  const give=62;
  let tension=0,hold=0;
  if(t<900) tension=0;
  else if(t<3200) tension=Math.round(give*(t-900)/2300);
  else if(t<5900){ tension=give; hold=Math.min(LOCK_HOLD_MS,LOCK_HOLD_MS*(t-3200)/2400); }
  else { tension=give; hold=LOCK_HOLD_MS; }
  const wear=Math.round(Math.min(52,(Math.min(t,5900)/5900)*52));
  const challenge={phase:"lockpick",tension,wear,hold,give,tolerance:3,hintLead:6,hintTail:2,
    attemptsLeft:1,maxAttempts:1,brokeInLock:false};
  const turning=Math.round((hold/LOCK_HOLD_MS)*100);
  const caption=t<900?"the pick goes in"
    :turning>=100?"OPEN — and no button was ever pressed"
    :turning>0?"it started turning by itself. now LEAVE IT ALONE."
    :"nothing yet — keep sliding";
  // The thumb is not an element, so it is derived from the track it rides on.
  const hand=stage=>{
    const el=stage.querySelector(".lock-range");
    if(!el) return null;
    const a=el.getBoundingClientRect(),b=stage.getBoundingClientRect();
    const inset=9;
    const on={x:a.left-b.left+inset+((a.width-inset*2)*(tension/LOCK_MAX)),y:a.top-b.top+a.height/2};
    return t<900?glide({x:on.x+70,y:on.y+56},on,t/900):on;
  };
  return (
    <GuideBoard caption={caption} cursor={hand}>
      <LockpickMinigame challenge={challenge} demo />
    </GuideBoard>
  );
}

/* POWER CUT — timing cannot be written down, so the hand waits and cuts. */
function PowerDemo(){
  const t=useClock(9000);
  const target=250,tolerance=16,speed=0.115;
  const cycle=t%4500,hitAt=target/speed;
  const cut=cycle>=hitAt;
  const angle=cut?target:(cycle*speed)%360;
  const ring=(i,phase,ang)=>({id:"g"+i,phase,angle:ang,target,tolerance});
  const challenge={phase:"power_cut",activeRing:cut?1:0,feedback:cut?"Contact one is dead.":"Contact one is live.",
    rings:[ring(0,cut?"locked":"active",angle),ring(1,cut?"active":"queued",(cycle*0.16)%360),ring(2,"queued",(cycle*0.2)%360)]};
  const hand=stage=>{
    const btn=center(stage,".power-cut-stop");
    if(!btn) return null;
    return {...glide({x:btn.x+80,y:btn.y+40},btn,cycle/hitAt),press:press(cycle,hitAt)};
  };
  return (
    <GuideBoard cursor={hand}
      caption={cut?"CUT — the marker was inside the amber":"let the marker come round to the amber, then cut"}>
      <PowerCutMinigame challenge={challenge} demo />
    </GuideBoard>
  );
}

/* TIMELINE — one card is out of place; the hand lifts it and files. */
function TimelineDemo(){
  const t=useClock(9500);
  const moved=t>=2200;
  const cards=[{id:"a",text:"the licence expires"},{id:"b",text:"the shipment leaves"},{id:"c",text:"the inspector calls"}];
  const challenge={phase:"timeline",cards,order:moved?["a","b","c"]:["b","a","c"]};
  const hand=stage=>{
    const up=center(stage,".timeline-list li:nth-child(2) .timeline-move");
    const send=center(stage,".timeline-actions .action-primary");
    if(t<2200) return {...glide({x:(up?.x||0)+70,y:(up?.y||0)-46},up,t/2200),press:press(t,2200-160,160)};
    if(t<5200) return {...glide(up,send,(t-2600)/1600),press:false};
    return {...send,press:press(t,5200)};
  };
  const caption=t<2200?"the March event is sitting under the May one — lift it"
    :t<5200?"in order now: licence, shipment, inspector"
    :"filed. exact order helps the play you already committed to.";
  return (
    <GuideBoard caption={caption} cursor={hand}>
      <TimelineMinigame challenge={challenge} demo />
    </GuideBoard>
  );
}

/* CONTRADICTION — a sworn line, then the paper that kills it. The decoy is
   shown and deliberately left alone. */
function ContraDemo(){
  const t=useClock(10500);
  const picked=t>=2200,pinned=t>=4800;
  const statements=[{id:"s1",text:"I was never in the building that week."},{id:"s2",text:"I signed nothing after April."}];
  const documents=[{id:"d1",text:"BADGE LOG — their card, Tuesday 08:41"},{id:"d2",text:"CAFETERIA RECEIPT — Thursday"}];
  const challenge={phase:"contradiction",statements,documents,
    solution:[{statement:"s1",document:"d1"},{statement:"s2",document:"d2"}],
    matched:pinned?[{statement:"s1",document:"d1"}]:[],selected:picked&&!pinned?"s1":null,
    attemptsLeft:4,maxAttempts:4};
  const hand=stage=>{
    const st=center(stage,".contra-column:nth-child(1) .contra-card");
    const doc=center(stage,".contra-column:nth-child(2) .contra-card");
    if(t<2200) return {...glide({x:(st?.x||0)+60,y:(st?.y||0)-50},st,t/2200),press:press(t,2200-160,160)};
    if(t<4800) return {...glide(st,doc,(t-2600)/1500),press:press(t,4800-160,160)};
    return {...doc,press:false};
  };
  const caption=pinned?"pinned — those two cannot both be true"
    :picked?"now the exhibit that makes it impossible (the receipt proves nothing)"
    :"start with what the witness swore";
  return (
    <GuideBoard caption={caption} cursor={hand}>
      <ContradictionMinigame challenge={challenge} demo />
    </GuideBoard>
  );
}

/* REDACTION — the only board where doing nothing is already a failure, so the
   demo shows one page deliberately going out untouched. */
function RedactDemo(){
  const t=useClock(11000);
  const pages=[
    {id:"p1",text:"Their GC asks you what the exposure really is.",priv:true},
    {id:"p2",text:"Delivery log, 14 March, signed at the gate.",priv:false},
    {id:"p3",text:"Your own memo ranking the arguments.",priv:true},
  ];
  const marked=[];
  if(t>=2400) marked.push("p1");
  if(t>=5200) marked.push("p3");
  const challenge={phase:"redaction",pages,marked};
  const hand=stage=>{
    const a=center(stage,".redact-list li:nth-child(1) button");
    const b=center(stage,".redact-list li:nth-child(3) button");
    const go=center(stage,".redact-game .action-primary");
    if(t<2400) return {...glide({x:(a?.x||0)+60,y:(a?.y||0)-50},a,t/2400),press:press(t,2400-160,160)};
    if(t<5200) return {...glide(a,b,(t-2800)/1900),press:press(t,5200-160,160)};
    if(t<7800) return {...glide(b,go,(t-5600)/1700),press:press(t,7800-160,160)};
    return {...go,press:false};
  };
  const caption=t<2400?"advice from the client: black it out"
    :t<5200?"your own memo: black it out too"
    :t<7800?"the delivery log is an ordinary record — it goes out untouched"
    :"clean production: nothing leaked, nothing over-redacted";
  return (
    <GuideBoard caption={caption} cursor={hand}>
      <RedactionMinigame challenge={challenge} demo />
    </GuideBoard>
  );
}

/* OBJECTION — two fair questions and one improper one, so the restraint is as
   visible as the interruption. */
function ObjectDemo(){
  const t=useClock(10500);
  const LINES=[
    {id:"o1",text:"What date did you receive the notice?",bad:false},
    {id:"o2",text:"You would agree you were careless, wouldn't you?",bad:true},
    {id:"o3",text:"Who else was copied on that letter?",bad:false},
  ];
  const SLOT=3500,WINDOW=2600;
  const slot=Math.min(2,Math.floor(t/SLOT)),within=t%SLOT;
  const objected=slot===1&&within>=1600;
  const ruled=slot>=1&&(slot>1||objected)?[{id:"o2",sustained:true}]:[];
  const challenge={phase:"objection",lines:LINES,index:slot,windowMs:WINDOW,strict:false,
    elapsedMs:objected?WINDOW:Math.min(WINDOW,within),ruled,
    sustained:ruled.length,overruled:0,missed:0};
  const hand=stage=>{
    const btn=center(stage,".obj-button");
    if(!btn) return null;
    return {...btn,press:slot===1&&press(within,1600)};
  };
  const caption=objected?"SUSTAINED — struck before it was answered"
    :slot===1?"that one is leading. object while it is still standing."
    :"a fair question — sit on your hands";
  return (
    <GuideBoard caption={caption} cursor={hand}>
      <ObjectionMinigame challenge={challenge} demo />
    </GuideBoard>
  );
}

const GUIDES={
  lockpick:{title:"HOW A LOCK OPENS",demo:LockDemo,steps:[
    "Slide the pick. Somewhere in the middle the cylinder starts turning on its own.",
    "Leave it exactly there and the turn fills. There is no button to press.",
    "Every moment under load wears the pick, and past the give point it wears fast.",
    "Hunting slowly is what kills picks. A confident move beats a careful crawl.",
  ]},
  power_cut:{title:"HOW THE PANEL IS CUT",demo:PowerDemo,steps:[
    "Each circuit spins on its own. Only the live one can be cut.",
    "Press CUT CURRENT while the white marker is inside the amber window.",
    "Three circuits, faster each time. One miss wakes the security desk.",
  ]},
  timeline:{title:"HOW A CHRONOLOGY WORKS",demo:TimelineDemo,steps:[
    "The events come shuffled. The dates are in the case text, never on the cards.",
    "Move them with ▲ and ▼ until they read earliest first, then submit.",
    "Exact order helps the play you already committed to. Muddled order hurts it.",
  ]},
  contradiction:{title:"HOW A CHART IS BUILT",demo:ContraDemo,steps:[
    "Left: what a witness swore to. Right: documents out of the bundle.",
    "Pick the statement, then the exhibit that cannot be true alongside it.",
    "Some exhibits prove nothing at all, and pinning one costs you a try.",
  ]},
  redaction:{title:"WHAT GETS BLACKED OUT",demo:RedactDemo,steps:[
    "BLACK OUT advice between you and the client, and your own work product.",
    "SEND ordinary business records — and anything an outsider already saw.",
    "Miss a privileged page and they read your case. Black out a plain record and the court calls it obstruction.",
  ]},
  objection:{title:"WHEN TO OBJECT",demo:ObjectDemo,steps:[
    "Questions arrive one at a time and each stands for a couple of seconds.",
    "Object while an improper one stands and it is struck from the record.",
    "Object to a fair one and the bench remembers — a strict judge charges double.",
  ]},
};

export default function BoardGuide({kind,onClose}){
  const closeRef=useRef(null);
  const guide=GUIDES[kind];
  const Demo=guide?.demo;
  useEffect(()=>{ closeRef.current?.focus({preventScroll:true}); },[]);
  return (
    <div className="guide-overlay" role="dialog" aria-modal="true" aria-label="How this board works">
      <section className="guide-box">
        <h3 className="guide-title">{guide?.title||"HOW THIS WORKS"}</h3>
        <p className="guide-note">Your own board is paused. This is an invented example.</p>
        {Demo && <Demo />}
        <ol className="guide-steps">{(guide?.steps||[]).map((s,i)=><li key={i}>{s}</li>)}</ol>
        <button ref={closeRef} className="btn safe action-primary" type="button" onClick={onClose}>GOT IT</button>
      </section>
    </div>
  );
}
