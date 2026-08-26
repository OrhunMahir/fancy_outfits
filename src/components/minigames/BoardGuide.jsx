import { useEffect, useRef, useState } from "react";

/* Every board teaches itself by being played in front of you. The demos run on
   invented material and loop on their own — you only watch. None of them can
   touch the puzzle you actually have open, which is the point: the guide shows
   the SHAPE of the board, never its answer. */

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

// The hand: keyframes are waypoints, movement between them is interpolated, and
// a click blooms for a moment so it reads as a press rather than a teleport.
const cursorAt=(t,frames)=>{
  let a=frames[0],b=frames[0];
  for(let i=0;i<frames.length;i++) if(frames[i].t<=t){ a=frames[i]; b=frames[i+1]||frames[i]; }
  const span=Math.max(1,b.t-a.t),k=Math.min(1,(t-a.t)/span);
  return {x:a.x+(b.x-a.x)*k,y:a.y+(b.y-a.y)*k,press:!!a.click&&(t-a.t)<260};
};
const Cursor=({x,y,press})=>(
  <span className={"guide-cursor"+(press?" guide-cursor-press":"")} style={{left:x+"%",top:y+"%"}} aria-hidden="true" />
);
const Stage=({children,caption})=>(
  <div className="guide-demo">
    <div className="guide-stage">{children}</div>
    <p className="guide-caption">{caption}</p>
  </div>
);

/* LOCKPICK — the one board where nothing is ever pressed. The pick slides, the
   cylinder starts turning by itself, and the only skill is leaving it alone. */
function LockDemo(){
  const t=useClock(8000);
  const give=62;
  let tension=0,hold=0;
  if(t<700) tension=0;
  else if(t<2900) tension=Math.round(give*(t-700)/2200);
  else if(t<5200){ tension=give; hold=Math.round(100*(t-2900)/2300); }
  else { tension=give; hold=100; }
  const life=Math.max(38,100-Math.round((Math.min(t,5200)/5200)*52));
  const cx=6+tension*0.86;
  const caption=t<700?"the pick goes in":hold>0&&hold<100?"HOLD IT — TURNING "+hold+"%":hold>=100?"OPEN. you never pressed a button":"NOT HERE. KEEP MOVING.";
  return (
    <Stage caption={caption}>
      <div className="guide-lock-plug"><span style={{transform:`rotate(${(hold/100)*80}deg)`}} /></div>
      <div className="guide-track">
        <span className={"guide-handle"+(hold>0?" guide-handle-on":"")} style={{left:cx+"%"}} />
      </div>
      <div className="guide-meter"><span style={{width:life+"%"}} /></div>
      <div className="guide-meter-label">PICK LIFE {life}%</div>
      <Cursor {...cursorAt(t,[{t:0,x:6,y:52},{t:700,x:6,y:52},{t:2900,x:cx,y:52},{t:8000,x:cx,y:52}])} />
    </Stage>
  );
}

/* POWER CUT — timing cannot be written down, so the marker sweeps and the hand
   presses CUT CURRENT the instant it is inside the amber. */
function PowerDemo(){
  const t=useClock(9000);
  const target=250,tolerance=18,speed=0.115;
  const cycle=t%4500;
  const angle=(cycle*speed)%360;
  const gap=Math.min(Math.abs(angle-target),360-Math.abs(angle-target));
  const hitAt=(target/speed);
  const cut=cycle>=hitAt&&cycle<hitAt+1400;
  return (
    <Stage caption={cut?"CUT — the marker was inside the amber":"the marker sweeps… let it come round to the amber"}>
      <div className="guide-ring">
        <span className="guide-window" style={{transform:`rotate(${target-tolerance}deg)`}} />
        <span className={"guide-marker"+(cut?" guide-marker-hit":"")} style={{transform:`rotate(${cut?target:angle}deg)`}} />
        <span className="guide-core" />
      </div>
      <div className={"guide-btn"+(cut?" guide-btn-on":"")}>CUT CURRENT</div>
      <Cursor {...cursorAt(t,[{t:0,x:60,y:78},{t:hitAt-500,x:50,y:80},{t:hitAt,x:50,y:80,click:true},{t:4500,x:50,y:80},
        {t:4500+hitAt-500,x:50,y:80},{t:4500+hitAt,x:50,y:80,click:true},{t:9000,x:50,y:80}])} />
    </Stage>
  );
}

/* TIMELINE — one card is out of place; the hand lifts it and files. */
function TimelineDemo(){
  const t=useClock(9000);
  const moved=t>=1500;
  const cards=moved
    ?["the licence expires (March)","the shipment leaves (May)","the inspector calls (June)"]
    :["the shipment leaves (May)","the licence expires (March)","the inspector calls (June)"];
  const sent=t>=4200;
  return (
    <Stage caption={sent?"EXACT CHRONOLOGY — this play gets +12%":moved?"in order now — file it":"the March event is sitting under the May one"}>
      <ol className="guide-cards">
        {cards.map((c,i)=>(
          <li key={c} className={(moved&&i===0)||(!moved&&i===1)?"guide-card guide-card-live":"guide-card"}>
            <span className="guide-up">▲</span>{c}
          </li>
        ))}
      </ol>
      <div className={"guide-btn"+(sent?" guide-btn-on":"")}>SUBMIT</div>
      <Cursor {...cursorAt(t,[{t:0,x:70,y:20},{t:1500,x:11,y:41,click:true},{t:4200,x:50,y:86,click:true},{t:9000,x:50,y:86}])} />
    </Stage>
  );
}

/* CONTRADICTION — a sworn line on the left, the paper that kills it on the right. */
function ContraDemo(){
  const t=useClock(9500);
  const picked=t>=1600,pinned=t>=3600;
  return (
    <Stage caption={pinned?"PINNED — those two cannot both be true":picked?"now the exhibit that makes it impossible":"start with what the witness swore"}>
      <div className="guide-columns">
        <div>
          <div className={"guide-slip"+(picked?" guide-slip-on":"")}>“I was never in the building that week.”</div>
          <div className="guide-slip guide-slip-dim">“I signed nothing after April.”</div>
        </div>
        <div>
          <div className={"guide-slip"+(pinned?" guide-slip-hit":"")}>BADGE LOG — their card, Tue 08:41</div>
          <div className="guide-slip guide-slip-dim">CAFETERIA RECEIPT — Thursday</div>
        </div>
      </div>
      <div className="guide-meter-label">{pinned?"1 of 3 proved · 4 tries left":"4 tries left — a wrong pin costs one"}</div>
      <Cursor {...cursorAt(t,[{t:0,x:70,y:15},{t:1600,x:24,y:33,click:true},{t:3600,x:76,y:33,click:true},{t:9500,x:76,y:33}])} />
    </Stage>
  );
}

/* REDACTION — the only board where doing nothing is already a failure. */
function RedactDemo(){
  const t=useClock(10000);
  const pages=[
    {text:"GC asks you what the exposure is",priv:true,at:1400},
    {text:"Delivery log, 14 March",priv:false,at:null},
    {text:"Your memo ranking the arguments",priv:true,at:3600},
  ];
  const sent=t>=5800;
  return (
    <Stage caption={sent?"CLEAN PRODUCTION — advice held back, the delivery log goes out":"black out advice and your own work. nothing else."}>
      <ul className="guide-pages">
        {pages.map((p,i)=>{
          const black=p.at!==null&&t>=p.at;
          return <li key={i} className={"guide-page"+(black?" guide-page-black":"")}>
            <span className="guide-box-mark">{black?"█":"□"}</span>{black?"REDACTED":p.text}
          </li>;
        })}
      </ul>
      <div className={"guide-btn"+(sent?" guide-btn-on":"")}>PRODUCE</div>
      <Cursor {...cursorAt(t,[{t:0,x:70,y:12},{t:1400,x:12,y:24,click:true},{t:3600,x:12,y:56,click:true},{t:5800,x:50,y:86,click:true},{t:10000,x:50,y:86}])} />
    </Stage>
  );
}

/* OBJECTION — two clean questions and one improper one, so the demo shows the
   restraint as clearly as the interruption. */
function ObjectDemo(){
  const t=useClock(10500);
  const LINES=[
    {q:"What date did you receive the notice?",bad:false},
    {q:"You would agree you were careless, wouldn't you?",bad:true},
    {q:"Who else was copied on that letter?",bad:false},
  ];
  const slot=Math.min(2,Math.floor(t/3500)),within=t%3500;
  const line=LINES[slot];
  const objected=line.bad&&within>=1500;
  const bar=Math.max(0,100-Math.round((within/2600)*100));
  const caption=objected?"SUSTAINED — struck from the record"
    :line.bad?"that one is leading. object while it stands."
    :"a fair question. leave it alone.";
  return (
    <Stage caption={caption}>
      <div className="guide-question">{line.q}</div>
      <div className="guide-meter"><span style={{width:(objected?0:bar)+"%"}} /></div>
      <div className={"guide-btn"+(objected?" guide-btn-on":"")}>OBJECTION</div>
      <div className="guide-meter-label">{objected?"1 sustained · 0 overruled":"sustained 0 · overruled 0"}</div>
      <Cursor {...cursorAt(t,[{t:0,x:50,y:80},{t:5000,x:50,y:80,click:true},{t:5400,x:50,y:80},{t:10500,x:50,y:80}])} />
    </Stage>
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
  useEffect(()=>{ closeRef.current?.focus(); },[]);
  return (
    <div className="guide-overlay" role="dialog" aria-modal="true" aria-label="How this board works">
      <section className="guide-box">
        <h3 className="guide-title">{guide?.title||"HOW THIS WORKS"}</h3>
        {Demo && <Demo />}
        <ol className="guide-steps">{(guide?.steps||[]).map((s,i)=><li key={i}>{s}</li>)}</ol>
        <button ref={closeRef} className="btn safe action-primary" type="button" onClick={onClose}>GOT IT</button>
      </section>
    </div>
  );
}
