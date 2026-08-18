import { useEffect, useRef, useState } from "react";
import { advancePowerCutFrame, checkpointActionChallenge, stopPowerRing } from "../../game/engine.js";
import { POWER_FRAME_CAP_MS } from "../../game/minigames.js";

const ringStateLabel=phase=>({
  active:"ROTATING",
  queued:"STANDBY",
  locked:"ALIGNED",
  missed:"MISSED",
}[phase]||"UNKNOWN");

// The three circuits are a deliberate climb; saying so out loud stops the last
// one from reading as a bug when it snaps past the window.
const RING_GRADE=["WARM-UP","STEADY","FAST"];

export default function PowerCutMinigame({challenge}){
  const stopRef=useRef(null);
  const [liveChallenge,setLiveChallenge]=useState(challenge);
  const activeRing=Number.isInteger(liveChallenge.activeRing)?liveChallenge.activeRing:0;
  const rings=Array.isArray(liveChallenge.rings)?liveChallenge.rings:[];

  useEffect(()=>{
    setLiveChallenge(challenge);
  },[challenge]);

  useEffect(()=>{
    stopRef.current?.focus();
  },[activeRing]);

  useEffect(()=>{
    if(challenge.phase!=="power_cut") return undefined;

    let frameId=0;
    let lastTime=null;

    const resetClock=()=>{
      lastTime=null;
      if(document.hidden) checkpointActionChallenge();
    };
    const checkpoint=()=>{ checkpointActionChallenge(); };
    const animate=now=>{
      if(document.hidden){
        lastTime=null;
      }else if(lastTime===null){
        lastTime=now;
      }else{
        const delta=Math.max(0,Math.min(POWER_FRAME_CAP_MS,now-lastTime));
        lastTime=now;
        if(delta>0){
          const next=advancePowerCutFrame(delta);
          if(next) setLiveChallenge(next);
        }
      }
      frameId=requestAnimationFrame(animate);
    };

    document.addEventListener("visibilitychange",resetClock);
    window.addEventListener("pagehide",checkpoint);
    frameId=requestAnimationFrame(animate);
    return ()=>{
      cancelAnimationFrame(frameId);
      document.removeEventListener("visibilitychange",resetClock);
      window.removeEventListener("pagehide",checkpoint);
    };
  },[challenge.phase,challenge.activeRing]);

  const ringCount=rings.length;
  const activeNumber=Math.min(ringCount,activeRing+1);

  return (
    <div className="action-game power-cut-game">
      <div className="power-cut-warning">LIVE ELECTRICAL PANEL</div>
      <p className="power-cut-instructions">
        Stop all three contacts while their white marker is inside the amber window. One miss alerts security.
      </p>

      <div
        className="power-ring-stage"
        role="img"
        aria-label={`${ringCount} circuit rings. Circuit ${activeNumber} is active.`}
      >
        {rings.map((ring,index)=>(
          <div
            className={`power-ring power-ring-${ring.phase}`}
            key={ring.id||index}
            style={{
              "--power-ring-index":index,
              "--power-ring-angle":`${ring.angle}deg`,
              "--power-target-angle":`${ring.target}deg`,
              "--power-target-width":`${ring.tolerance*2}deg`,
            }}
          >
            <div className="power-ring-track" aria-hidden="true">
              <span className="power-ring-target" />
              <span className="power-ring-marker" />
              <span className="power-ring-core" />
            </div>
            <div className="power-ring-caption">
              <span>CIRCUIT {index+1} · {RING_GRADE[index]||"FAST"}</span>
              <strong>{ringStateLabel(ring.phase)}</strong>
            </div>
          </div>
        ))}
      </div>

      <div className="power-cut-progress" aria-label={`${activeRing} of ${ringCount} circuits aligned`}>
        {rings.map((ring,index)=>(
          <i
            aria-hidden="true"
            className={`power-cut-pip power-cut-pip-${ring.phase}`}
            key={ring.id||index}
          />
        ))}
      </div>

      <div className="power-cut-status" role="status" aria-live="polite" aria-atomic="true">
        CIRCUIT {activeNumber}/{ringCount} · {liveChallenge.feedback}
      </div>

      <button
        ref={stopRef}
        className="btn bold action-primary power-cut-stop"
        type="button"
        onClick={stopPowerRing}
        disabled={liveChallenge.phase!=="power_cut"||!rings[activeRing]}
        aria-label={`Stop circuit ${activeNumber} of ${ringCount}`}
      >
        CUT CURRENT
      </button>
      <div className="power-cut-key-hint" aria-hidden="true">SPACE / ENTER / TAP</div>
    </div>
  );
}
