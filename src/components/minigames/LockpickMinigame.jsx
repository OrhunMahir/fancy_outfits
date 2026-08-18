import { useEffect, useRef } from "react";
import { attemptLockpick, setLockTension } from "../../game/engine.js";
import { LOCK_MAX, LOCK_STEP, lockFeel } from "../../game/minigames.js";

const remainingLabel=attemptsLeft=>attemptsLeft===1?"1 PICK LEFT":`${Math.max(0,attemptsLeft)} PICKS LEFT`;
// Strain is what the hand feels through the pick — it tracks pressure, not the
// hidden give point, so the gauge never leaks where the cylinder yields.
const strainOf=tension=>tension>=78?"critical":tension>=55?"high":tension>=30?"working":"slack";
const STRAIN_LABEL={slack:"SLACK",working:"UNDER LOAD",high:"STRAINING",critical:"ABOUT TO GO"};

export default function LockpickMinigame({challenge}){
  const rangeRef=useRef(null);
  const attemptsLeft=Number.isFinite(challenge.attemptsLeft)?challenge.attemptsLeft:0;
  const maxAttempts=Number.isFinite(challenge.maxAttempts)?challenge.maxAttempts:attemptsLeft;
  const tension=Number.isFinite(challenge.tension)?challenge.tension:0;
  const feel=lockFeel(challenge,tension);
  const strain=strainOf(tension);
  const pins=[0,1,2,3,4];

  useEffect(()=>{ rangeRef.current?.focus(); },[]);

  return (
    <div className={`action-game lock-game lock-feel-${feel} lock-strain-${strain}`}>
      <div className="lock-instructions">
        Lean on the pick until the cylinder gives — then turn it. Push past what the pick will take and it snaps.
      </div>

      <div className="lock-stage" aria-hidden="true">
        <div className="lock-door-plate">
          <div className="lock-cylinder">
            <div className="lock-pins">
              {pins.map(i=>(
                <span key={i} className="lock-pin" style={{transform:`translateY(${-Math.min(18,tension*0.22-i*1.6)}px)`}} />
              ))}
            </div>
            <div className="lock-keyway" />
            <div className={"lock-pick"+(challenge.snapped?" lock-pick-snapped":"")}
                 style={{transform:`rotate(${tension*0.22}deg) translateY(${tension*0.06}px)`}}>
              <span className="lock-pick-tip" />
            </div>
          </div>
          <div className="lock-readout">{STRAIN_LABEL[strain]}</div>
        </div>
      </div>

      <label className="lock-control-label" htmlFor="action-lock-tension">
        TENSION
      </label>
      <input
        ref={rangeRef}
        id="action-lock-tension"
        className="lock-range"
        type="range"
        min="0"
        max={LOCK_MAX}
        step={LOCK_STEP}
        value={tension}
        onChange={event=>setLockTension(Number(event.target.value))}
        aria-label="Pick tension"
        aria-valuetext={`${tension} of ${LOCK_MAX}, ${STRAIN_LABEL[strain]}`}
      />
      <div className="lock-gauge" aria-hidden="true">
        <span className="lock-gauge-fill" style={{width:`${(tension/LOCK_MAX)*100}%`}} />
      </div>
      <div className="lock-range-hints" aria-hidden="true">
        <span>EASY</span><span>FIRM</span><span>SNAP</span>
      </div>
      <div className="lock-nudge">
        <button className="btn small lock-nudge-btn" type="button"
                onClick={()=>setLockTension(tension-LOCK_STEP)} disabled={tension<=0}>EASE OFF</button>
        <button className="btn small lock-nudge-btn" type="button"
                onClick={()=>setLockTension(tension+LOCK_STEP)} disabled={tension>=LOCK_MAX}>PUSH</button>
      </div>

      <div className="lock-attempts" aria-label={`${attemptsLeft} of ${maxAttempts} picks left`}>
        <span>{remainingLabel(attemptsLeft)}</span>
        <span className="lock-attempt-pips" aria-hidden="true">
          {Array.from({length:Math.max(0,maxAttempts)},(_,index)=>(
            <i key={index} className={index<attemptsLeft?"lock-pip lock-pip-live":"lock-pip lock-pip-spent"} />
          ))}
        </span>
      </div>

      <button className="btn bold action-primary lock-test" type="button"
              onClick={attemptLockpick} disabled={attemptsLeft<=0}>
        TURN THE CYLINDER
      </button>
    </div>
  );
}
