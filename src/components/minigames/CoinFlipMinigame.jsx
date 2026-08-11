import { useEffect, useRef } from "react";
import { callActionCoin, completeActionChallenge } from "../../game/engine.js";

const faceLabel=face=>String(face||"").toUpperCase();

export default function CoinFlipMinigame({challenge}){
  const firstChoiceRef=useRef(null);
  const continueRef=useRef(null);
  const isResult=challenge.phase==="coin_result";
  const face=faceLabel(challenge.coinFace);
  const call=faceLabel(challenge.coinCall);

  useEffect(()=>{
    if(isResult) continueRef.current?.focus();
    else firstChoiceRef.current?.focus();
  },[isResult]);

  if(!isResult){
    return (
      <div className="action-game coin-game coin-call">
        <div className="coin-warning">FOOTSTEPS IN THE HALL</div>
        <p className="coin-instructions">
          The lock made too much noise. Call the coin before it lands—one side gets you out.
        </p>
        <div className="coin-stage" aria-hidden="true">
          <div className="coin-token coin-token-ready"><span>?</span></div>
        </div>
        <fieldset className="coin-choice">
          <legend>CALL IT</legend>
          <button
            ref={firstChoiceRef}
            className="btn action-primary coin-choice-button coin-heads"
            type="button"
            onClick={()=>callActionCoin("heads")}
          >
            HEADS
          </button>
          <button
            className="btn action-primary coin-choice-button coin-tails"
            type="button"
            onClick={()=>callActionCoin("tails")}
          >
            TAILS
          </button>
        </fieldset>
      </div>
    );
  }

  return (
    <div className={`action-game coin-game coin-result ${challenge.escaped?"coin-escaped":"coin-caught"}`}>
      <div className="coin-stage" aria-hidden="true">
        <div className={`coin-token coin-token-result coin-token-${String(challenge.coinFace||"").toLowerCase()}`}>
          <span>{face.slice(0,1)||"?"}</span>
        </div>
      </div>
      <div className="coin-result-card">
        <div className="coin-result-face">THE COIN SHOWS {face||"—"}</div>
        <div className="coin-result-call">YOU CALLED {call||"—"}</div>
        <strong className="coin-result-verdict">
          {challenge.escaped?"YOU GOT AWAY":"CAUGHT IN THE ACT"}
        </strong>
      </div>
      <button
        ref={continueRef}
        className={`btn action-primary coin-continue${challenge.escaped?" safe":" bold"}`}
        type="button"
        onClick={completeActionChallenge}
      >
        CONTINUE
      </button>
    </div>
  );
}
