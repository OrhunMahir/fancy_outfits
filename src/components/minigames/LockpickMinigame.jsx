import { useEffect, useRef, useState } from "react";
import { advanceLockpickFrame, checkpointActionChallenge, setLockTension } from "../../game/engine.js";
import { LOCK_MAX, LOCK_STEP, LOCK_HOLD_MS, LOCK_WEAR_MAX, POWER_FRAME_CAP_MS, lockFeel } from "../../game/minigames.js";

const remainingLabel=attemptsLeft=>attemptsLeft===1?"1 PICK LEFT":`${Math.max(0,attemptsLeft)} PICKS LEFT`;
/* Strain is what the hand feels through the pick: it tracks pressure, never the
   hidden give point, so neither the readout nor the shake can be read as a
   solution. The lock gets angrier the harder you lean on it — that is all. */
const strainOf=wear=>wear>=75?"critical":wear>=45?"high":wear>=15?"working":"slack";
const STRAIN_LABEL={slack:"FRESH",working:"BENDING",high:"STRAINING",critical:"ABOUT TO GO"};

export default function LockpickMinigame({challenge,demo=false,paused=false}){
  const rangeRef=useRef(null);
  const [own,setLive]=useState(challenge);
  const live=demo?challenge:own;

  useEffect(()=>{ if(!demo) setLive(challenge); },[challenge,demo]);
  useEffect(()=>{ if(!demo) rangeRef.current?.focus(); },[demo]);

  /* The lock runs on its own clock now: hold the pick in the right place and
     the cylinder turns; hold it anywhere under load and the steel wears out. */
  useEffect(()=>{
    if(demo||paused||live.phase!=="lockpick") return;
    let raf=0,last=performance.now();
    const tick=now=>{
      const delta=Math.min(POWER_FRAME_CAP_MS,now-last);
      last=now;
      const next=advanceLockpickFrame(delta);
      if(next) setLive(next);
      if(!next||next.phase!=="lockpick"){ checkpointActionChallenge(); return; }
      raf=requestAnimationFrame(tick);
    };
    raf=requestAnimationFrame(tick);
    return ()=>cancelAnimationFrame(raf);
  },[live.phase,live.attemptsLeft,demo,paused]);

  const attemptsLeft=Number.isFinite(live.attemptsLeft)?live.attemptsLeft:0;
  const maxAttempts=Number.isFinite(live.maxAttempts)?live.maxAttempts:attemptsLeft;
  const tension=Number.isFinite(live.tension)?live.tension:0;
  const wear=Math.round(live.wear||0);
  const hold=Math.round(((live.hold||0)/LOCK_HOLD_MS)*100);
  const feel=lockFeel(live,tension);
  const strain=strainOf(wear);
  /* The plug turns ONLY while the cylinder is actually turning. Tying it to
     tension made it look like progress everywhere, which is what made the board
     unreadable: two signals saying different things in the same picture. */
  const plug=Math.round((hold/100)*80);
  const pins=[0,1,2,3,4];

  return (
    <div className={`action-game lock-game lock-feel-${feel} lock-strain-${strain}`}>
      <div className="lock-instructions">
        Slide the pick and leave it there. In the right place the cylinder turns by itself; everywhere else
        the steel is just wearing out.
      </div>
      <div className={"lock-headline"+(hold>0?" lock-headline-on":"")}>
        {hold>0
          ? `HOLD IT — TURNING ${hold}%`
          : feel==="strain"
          ? "TOO FAR. EASE OFF."
          : "NOT HERE. KEEP MOVING."}
      </div>

      <div className="lock-stage" aria-hidden="true">
        <div className="lock-door-plate">
          <div className="lock-cylinder">
            <div className="lock-pins">
              {pins.map(i=>(
                <span key={i} className="lock-pin"
                      style={{transform:`translateY(${-Math.min(18,Math.max(0,tension*0.22-i*1.6))}px)`}} />
              ))}
            </div>
            <div className="lock-plug" style={{transform:`rotate(${plug}deg)`}}>
              <div className="lock-keyway" />
              {live.brokeInLock && <span className="lock-stub" />}
            </div>
            <div className={"lock-pick"+(live.brokeInLock?" lock-pick-broken":"")}
                 style={{transform:`rotate(${plug*0.8}deg) translateY(${tension*0.05}px)`}}>
              <span className="lock-pick-tip" />
            </div>
          </div>
          <div className="lock-readout">{live.brokeInLock?"PICK SHEARED":STRAIN_LABEL[strain]}</div>
        </div>
      </div>

      <label className="lock-control-label" htmlFor="action-lock-tension">TENSION</label>
      <input
        ref={rangeRef}
        id="action-lock-tension"
        className="lock-range"
        type="range"
        min="0"
        max={LOCK_MAX}
        step={LOCK_STEP}
        value={tension}
        onChange={demo?undefined:event=>setLockTension(Number(event.target.value))}
        readOnly={demo}
        disabled={demo||paused}
        aria-label="Pick tension"
        aria-valuetext={`${tension} of ${LOCK_MAX}, ${STRAIN_LABEL[strain]}`}
      />
      <div className="lock-gauge" aria-hidden="true">
        <span className="lock-gauge-fill" style={{width:`${(tension/LOCK_MAX)*100}%`}} />
      </div>
      <div className="lock-meters">
        <div className="lock-meter">
          <span className="lock-meter-label">PICK LIFE {100-wear}%</span>
          <div className="lock-meter-track"><span className="lock-wear-fill" style={{width:`${100-wear}%`}} /></div>
        </div>
      </div>
      <div className="lock-range-hints" aria-hidden="true">
        <span>EASY</span><span>FIRM</span><span>SNAP</span>
      </div>
      <div className="lock-nudge">
        <button className="btn small lock-nudge-btn" type="button"
                onClick={demo?undefined:()=>setLockTension(tension-LOCK_STEP)} disabled={demo||paused||tension<=0}>EASE OFF</button>
        <button className="btn small lock-nudge-btn" type="button"
                onClick={demo?undefined:()=>setLockTension(tension+LOCK_STEP)} disabled={demo||paused||tension>=LOCK_MAX}>PUSH</button>
      </div>

      <div className="lock-attempts" aria-label={`${attemptsLeft} of ${maxAttempts} picks left`}>
        <span>{remainingLabel(attemptsLeft)}</span>
        <span className="lock-attempt-pips" aria-hidden="true">
          {Array.from({length:Math.max(0,maxAttempts)},(_,index)=>(
            <i key={index} className={index<attemptsLeft?"lock-pip lock-pip-live":"lock-pip lock-pip-spent"} />
          ))}
        </span>
      </div>

    </div>
  );
}
