import { useEffect, useRef } from "react";
import { attemptLockpick, setLockpickPosition } from "../../game/engine.js";

function remainingLabel(attemptsLeft){
  if(attemptsLeft===1) return "1 TEST REMAINS";
  return `${Math.max(0,attemptsLeft)} TESTS REMAIN`;
}

export default function LockpickMinigame({challenge}){
  const rangeRef=useRef(null);
  const attemptsLeft=Number.isFinite(challenge.attemptsLeft) ? challenge.attemptsLeft : 0;
  const maxAttempts=Number.isFinite(challenge.maxAttempts) ? challenge.maxAttempts : attemptsLeft;
  const position=Number.isFinite(challenge.position) ? challenge.position : 0;

  useEffect(()=>{
    rangeRef.current?.focus();
  },[]);

  return (
    <div className="action-game lock-game">
      <div className="lock-instructions">
        Feel for the cylinder's weak point. Move the paperclip, then test the lock.
      </div>

      <div className="lock-stage" aria-hidden="true">
        <div className="lock-door-plate">
          <div className="lock-cylinder">
            <div className="lock-keyway" />
            <div className="lock-pick" style={{transform:`rotate(${position}deg)`}}>
              <span className="lock-pick-tip" />
            </div>
          </div>
        </div>
      </div>

      <label className="lock-control-label" htmlFor="action-lock-position">
        PAPERCLIP ANGLE
      </label>
      <input
        ref={rangeRef}
        id="action-lock-position"
        className="lock-range"
        type="range"
        min="-70"
        max="70"
        step="1"
        value={position}
        onChange={event=>setLockpickPosition(Number(event.target.value))}
        aria-label="Paperclip angle"
        aria-valuetext={`${position} degrees`}
      />
      <div className="lock-range-hints" aria-hidden="true">
        <span>LEFT</span><span>CENTER</span><span>RIGHT</span>
      </div>

      <div className="lock-attempts" aria-label={`${attemptsLeft} of ${maxAttempts} lock tests remain`}>
        <span>{remainingLabel(attemptsLeft)}</span>
        <span className="lock-attempt-pips" aria-hidden="true">
          {Array.from({length:Math.max(0,maxAttempts)},(_,index)=>(
            <i key={index} className={index<attemptsLeft?"lock-pip lock-pip-live":"lock-pip lock-pip-spent"} />
          ))}
        </span>
      </div>

      <button
        className="btn bold action-primary lock-test"
        type="button"
        onClick={attemptLockpick}
        disabled={attemptsLeft<=0}
      >
        TEST LOCK
      </button>
    </div>
  );
}
