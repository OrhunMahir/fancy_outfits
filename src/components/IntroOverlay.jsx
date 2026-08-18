import { useEffect, useRef } from "react";
import { useGame } from "../game/useGame.js";
import { advanceIntro, closeIntro } from "../game/engine.js";
import { INTRO_STEPS } from "../game/intro.js";

/* Four cards on the first career ever, then never again. It gates the desk the
   same way every other overlay does, so nothing can be clicked underneath it. */
export default function IntroOverlay(){
  const S=useGame();
  const nextRef=useRef(null);
  const step=S&&S.introStep;
  const card=step==null?null:INTRO_STEPS[step];

  useEffect(()=>{ nextRef.current?.focus(); },[step]);

  if(!card) return null;
  const last=step===INTRO_STEPS.length-1;

  return (
    <div className="overlay intro-overlay">
      <section className="box panel intro-dialog" role="dialog" aria-modal="true" aria-labelledby="intro-title">
        <div className="action-kicker">YOUR FIRST DAY · {step+1} OF {INTRO_STEPS.length}</div>
        <h2 id="intro-title">{card.title}</h2>
        <p className="intro-body">{card.body}</p>
        <div className="intro-pips" aria-hidden="true">
          {INTRO_STEPS.map((_,i)=><span key={i} className={"intro-pip"+(i<=step?" intro-pip-on":"")} />)}
        </div>
        <div className="intro-actions">
          <button ref={nextRef} className="btn safe action-primary" type="button" onClick={advanceIntro}>
            {last?"GET TO WORK":"NEXT"}
          </button>
          {!last && <button className="btn small intro-skip" type="button" onClick={closeIntro}>SKIP</button>}
        </div>
      </section>
    </div>
  );
}
