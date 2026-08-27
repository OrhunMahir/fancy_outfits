import { useEffect, useRef } from "react";
import { trialPlay, trialObject, trialSettle, dismissTrialResult } from "../game/engine.js";
import { GROUNDS, trialPhase } from "../game/trial.js";

/* The trial screen shows no odds. Not a bar, not a percentage, not a hint in a
   tooltip — the jury standing exists only in the model. What the player reads is
   the room, which is why the record below is the whole feedback channel. */

function Record({lines}){
  const endRef=useRef(null);
  useEffect(()=>{ endRef.current?.scrollIntoView({block:"end"}); },[lines.length]);
  if(!lines.length) return null;
  return (
    <ol className="trial-record">
      {lines.map((line,i)=><li key={i}>{line}</li>)}
      <li ref={endRef} aria-hidden="true" />
    </ol>
  );
}

function Verdict({result}){
  const closeRef=useRef(null);
  useEffect(()=>{ closeRef.current?.focus(); },[]);
  return (
    <div className="overlay">
      <section className="box panel" role="dialog" aria-modal="true" aria-label="Verdict">
        <h2>{result.settled?"SETTLED AT TRIAL":result.win?"VERDICT — FOR YOUR CLIENT":"VERDICT — AGAINST YOU"}</h2>
        <p className="trial-verdict-text">{result.txt}</p>
        <div className="kv trial-tally">
          {/* Now that it is over, the player is allowed to know how they did. */}
          THE RECORD — strong plays {result.strongPlays} · weak plays {result.weakPlays} ·
          objections sustained {result.sustained} · overruled {result.overruled} ·
          improper arguments let through {result.missed}
        </div>
        <button ref={closeRef} className="btn safe action-primary" type="button"
                onClick={dismissTrialResult}>LEAVE THE COURTHOUSE</button>
      </section>
    </div>
  );
}

export default function TrialOverlay({trial,result}){
  const firstRef=useRef(null);
  useEffect(()=>{ firstRef.current?.focus(); },[trial&&trial.step]);
  if(result) return <Verdict result={result} />;
  if(!trial) return null;
  const phase=trialPhase(trial);
  const opposing=phase&&phase.kind==="opposing";
  const stage=Math.min(trial.step+1,trial.phases.length);

  return (
    <div className="overlay trial-overlay">
      <section className="box panel trial-box" role="dialog" aria-modal="true" aria-labelledby="trial-title">
        <div className="action-kicker">IN TRIAL · {trial.judgeName} · PHASE {stage}/{trial.phases.length}</div>
        <h2 id="trial-title">{trial.caseTitle}</h2>

        <Record lines={trial.log} />

        {trial.offer!=null ? (
          <div className="trial-offer">
            <p className="trial-prompt">
              Opposing counsel asks for a word. They are offering to settle — and they are not
              offering because they think they are winning.
            </p>
            <div className="opts">
              <button ref={firstRef} className="btn safe" type="button" onClick={()=>trialSettle(true)}>
                Take the settlement. End it here.
              </button>
              <button className="btn" type="button" onClick={()=>trialSettle(false)}>
                Decline. See it through to a verdict.
              </button>
            </div>
          </div>
        ) : opposing ? (
          <>
            <p className="trial-opposing">{phase.text}</p>
            <p className="trial-prompt">
              Object — and name the ground — or stay in your seat. There is no penalty for
              letting a proper argument stand.
            </p>
            <div className="trial-grounds">
              {GROUNDS.map((g,i)=>(
                <button key={g.id} ref={i===0?firstRef:null} className="btn small trial-ground" type="button"
                        onClick={()=>trialObject(g.id)}>{g.label}</button>
              ))}
            </div>
            <div className="opts">
              <button className="btn" type="button" onClick={()=>trialObject(null)}>
                Say nothing. Let it stand.
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="trial-prompt">{phase.prompt}</p>
            <div className="opts">
              {(phase.opts||[]).map((opt,i)=>(
                <button key={i} ref={i===0?firstRef:null} className="btn" type="button"
                        onClick={()=>trialPlay(i)}>{i+1}. {opt.text}</button>
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
