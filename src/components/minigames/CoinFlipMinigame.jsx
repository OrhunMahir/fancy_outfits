import { useEffect, useRef } from "react";
import { callActionCoin, completeActionChallenge } from "../../game/engine.js";

const faceLabel=face=>String(face||"").toUpperCase();

/* The rim is faked with a stack of discs at increasing depth: seen edge-on
   during the tumble they read as one milled cylinder, which is what sells the
   thing as a struck coin rather than a flat token. */
const RIM_SLICES=[-4.5,-3.5,-2.5,-1.5,-.5,.5,1.5,2.5,3.5,4.5];

/* Both faces are drawn on a 64-unit grid so the shapes stay on whole pixels at
   the sizes we actually render. HEADS is the house itself — a suit, because
   that is what the firm sells. TAILS is what it sells the suit for. */
function CoinFace({side}){
  const heads=side==="heads";
  return (
    <svg viewBox="0 0 64 64" className="coin-art" role="presentation" focusable="false">
      <defs>
        {/* one arc over the strike, one under it — the way a struck coin reads */}
        <path id={`coin-arc-top-${side}`} d="M9 32a23 23 0 0 1 46 0" />
        <path id={`coin-arc-bottom-${side}`} d="M11 32a21 21 0 0 0 42 0" />
      </defs>
      <circle cx="32" cy="32" r="32" className="coin-blank" />
      <circle cx="32" cy="32" r="29.5" className="coin-bevel" />
      <circle cx="32" cy="32" r="27" className="coin-beads" />
      {heads ? (
        <g className="coin-relief">
          {/* the bust stops short of the lower legend, the way a struck coin does */}
          <path d="M19 47 L22 32 L28 27 L36 27 L42 32 L45 47 Z" />
          {/* lapels, shirt and tie sit a shade deeper so the strike reads */}
          <path className="coin-relief-deep" d="M28 27 L32 37 L26 32 Z" />
          <path className="coin-relief-deep" d="M36 27 L32 37 L38 32 Z" />
          <path className="coin-relief-light" d="M29 27 L32 35 L35 27 Z" />
          <path className="coin-relief-deep" d="M30 29 L34 29 L35 40 L32 42 L29 40 Z" />
        </g>
      ) : (
        <g className="coin-relief">
          {/* scales of justice */}
          <rect x="30" y="16" width="4" height="4" />
          <rect x="31" y="19" width="2" height="27" />
          <rect x="16" y="22" width="32" height="2" />
          <rect x="26" y="45" width="12" height="2" />
          <rect x="22" y="47" width="20" height="3" />
          <path d="M17 24 L23 24 L20 25 Z" />
          <path d="M41 24 L47 24 L44 25 Z" />
          <path className="coin-relief-deep" d="M14 26 L26 26 L23 33 L17 33 Z" />
          <path className="coin-relief-deep" d="M38 26 L50 26 L47 33 L41 33 Z" />
        </g>
      )}
      <text className="coin-legend">
        <textPath href={heads?`#coin-arc-top-${side}`:`#coin-arc-bottom-${side}`} startOffset="50%" textAnchor="middle">
          {heads?"PARSON HENDERSON":"FANCY OUTFITS"}
        </textPath>
      </text>
      <text className="coin-legend coin-legend-small">
        <textPath href={heads?`#coin-arc-bottom-${side}`:`#coin-arc-top-${side}`} startOffset="50%" textAnchor="middle">
          {heads?"ATTORNEYS AT LAW":"ONE VERDICT"}
        </textPath>
      </text>
    </svg>
  );
}

function Coin({state,face}){
  return (
    <div className={`coin3d coin3d-${state}${face?" coin3d-lands-"+face:""}`}>
      <div className="coin-side coin-side-heads"><CoinFace side="heads" /></div>
      <div className="coin-side coin-side-tails"><CoinFace side="tails" /></div>
      {RIM_SLICES.map(depth=>(
        <span key={depth} className="coin-rim" style={{transform:`translateZ(${depth}px)`}} />
      ))}
    </div>
  );
}

export default function CoinFlipMinigame({challenge}){
  const firstChoiceRef=useRef(null);
  const continueRef=useRef(null);
  const isResult=challenge.phase==="coin_result";
  const power=challenge.type==="power_cut";
  const broken=!!challenge.brokeInLock; // a sheared pick is evidence, not just noise
  const face=faceLabel(challenge.coinFace);
  const call=faceLabel(challenge.coinCall);

  useEffect(()=>{
    if(isResult) continueRef.current?.focus();
    else firstChoiceRef.current?.focus();
  },[isResult]);

  if(!isResult){
    return (
      <div className="action-game coin-game coin-call">
        <div className="coin-warning">
          {power?"THE SECURITY PANEL FLASHES":broken?"HALF A PICK IN THE KEYWAY":"FOOTSTEPS IN THE HALL"}
        </div>
        <p className="coin-instructions">
          {power
            ? "The contacts arced and the night guard heard it. Call the coin before it lands—one side gets you out."
            : broken
            ? "The stub is wedged where anyone can see it, and a scored lock gets reported. Call the coin: one side says you work it free before you go."
            : "The cylinder never turned and you have been at it too long. Call the coin before it lands—one side gets you out."}
        </p>
        <div className="coin-stage" aria-hidden="true">
          <div className="coin-shadow coin-shadow-idle" />
          <Coin state="idle" />
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
        <div className="coin-shadow coin-shadow-toss" />
        <Coin state="toss" face={String(challenge.coinFace||"heads").toLowerCase()} />
      </div>
      <div className="coin-result-card">
        <div className="coin-result-face">THE COIN SHOWS {face||"—"}</div>
        <div className="coin-result-call">YOU CALLED {call||"—"}</div>
        <strong className="coin-result-verdict">
          {challenge.escaped
            ? (broken?"STUB RECOVERED":"YOU GOT AWAY")
            : (broken?"THE LOCK KEEPS THE EVIDENCE":"CAUGHT IN THE ACT")}
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
