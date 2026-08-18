import { useEffect, useRef, useState } from "react";
import { advanceObjectionFrame, checkpointActionChallenge, raiseObjectionNow } from "../../game/engine.js";
import { POWER_FRAME_CAP_MS } from "../../game/minigames.js";

/* The transcript runs on its own clock, so this component paints the frames
   locally — a store notification per frame would rebuild the whole desk. */
export default function ObjectionMinigame({challenge}){
  const buttonRef=useRef(null);
  const [live,setLive]=useState(challenge);

  useEffect(()=>{ setLive(challenge); },[challenge]);
  useEffect(()=>{ buttonRef.current?.focus(); },[]);

  useEffect(()=>{
    if(live.phase!=="objection") return;
    let raf=0, last=performance.now();
    const tick=now=>{
      const delta=Math.min(POWER_FRAME_CAP_MS,now-last);
      last=now;
      const next=advanceObjectionFrame(delta);
      if(next) setLive(next);
      if(!next||next.phase!=="objection"){ checkpointActionChallenge(); return; }
      raf=requestAnimationFrame(tick);
    };
    raf=requestAnimationFrame(tick);
    return ()=>cancelAnimationFrame(raf);
  },[live.phase]);

  const lines=Array.isArray(live.lines)?live.lines:[];
  const current=lines[live.index];
  const left=Math.max(0,1-(live.elapsedMs||0)/live.windowMs);
  const spoken=lines.slice(0,live.index);
  const ruledById=new Map((live.ruled||[]).map(r=>[r.id,r]));

  return (
    <div className="action-game obj-game">
      <div className="power-cut-warning">{live.strict?"THE BENCH IS STRICT":"COURT IS IN SESSION"}</div>
      <div className="lock-instructions">
        Object while the question is standing. Let it stand too long and it is answered; object to a clean
        question and the bench remembers.
      </div>

      <ol className="obj-record">
        {spoken.map(line=>{
          const r=ruledById.get(line.id);
          const state=r?(r.sustained?"obj-sustained":"obj-overruled"):(line.bad?"obj-missed":"obj-plain");
          return (
            <li key={line.id} className={"obj-line "+state}>
              <span className="obj-line-text">{line.text}</span>
              <span className="obj-line-tag">
                {r?(r.sustained?"SUSTAINED":"OVERRULED"):line.bad?"ANSWERED":"—"}
              </span>
            </li>
          );
        })}
      </ol>

      {current && (
        <div className="obj-current">
          <div className="obj-current-text">{current.text}</div>
          <div className="obj-timer" aria-hidden="true"><span style={{width:`${left*100}%`}} /></div>
        </div>
      )}

      <div className="obj-score" role="status" aria-live="polite">
        SUSTAINED {live.sustained} · OVERRULED {live.overruled} · ANSWERED {live.missed}
      </div>

      <button ref={buttonRef} className="btn bold action-primary obj-button" type="button"
              onClick={raiseObjectionNow} disabled={live.phase!=="objection"}>
        OBJECTION
      </button>
    </div>
  );
}
