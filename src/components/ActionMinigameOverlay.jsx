import { useEffect, useRef, useState } from "react";
import { checkpointActionChallenge, completeActionChallenge } from "../game/engine.js";
import { useGame } from "../game/useGame.js";
import CoinFlipMinigame from "./minigames/CoinFlipMinigame.jsx";
import LockpickMinigame from "./minigames/LockpickMinigame.jsx";
import PowerCutMinigame from "./minigames/PowerCutMinigame.jsx";
import TimelineMinigame from "./minigames/TimelineMinigame.jsx";
import ContradictionMinigame from "./minigames/ContradictionMinigame.jsx";
import ObjectionMinigame from "./minigames/ObjectionMinigame.jsx";
import BoardGuide from "./minigames/BoardGuide.jsx";
import RedactionMinigame from "./minigames/RedactionMinigame.jsx";

/* The production has two opposite failures, and the panel names which one. */
function RedactionResultPanel({challenge}){
  const buttonRef=useRef(null);
  const clean=challenge.leaked===0&&challenge.over===0;

  useEffect(()=>{ buttonRef.current?.focus(); },[]);

  return (
    <div className={`action-game lock-success timeline-result${clean?"":" timeline-result-miss"}`}>
      <div className="lock-success-mark" aria-hidden="true">{challenge.leaked}/{challenge.over}</div>
      <h3 className="lock-success-title">
        {clean?"PRIVILEGE HELD":challenge.leaked?"THEY HAVE YOUR FILE":"OVER-REDACTED"}
      </h3>
      <p className="lock-success-copy">{challenge.feedback}</p>
      <button ref={buttonRef} className="btn safe action-primary lock-continue" type="button" onClick={completeActionChallenge}>
        BACK TO THE FILE
      </button>
    </div>
  );
}

/* A hearing has no getaway either: the record simply reads how it reads. */
function ObjectionResultPanel({challenge}){
  const buttonRef=useRef(null);
  const bad=challenge.lines.filter(l=>l.bad).length;
  const clean=challenge.overruled===0&&challenge.missed===0;

  useEffect(()=>{ buttonRef.current?.focus(); },[]);

  return (
    <div className={`action-game lock-success timeline-result${clean?"":" timeline-result-miss"}`}>
      <div className="lock-success-mark" aria-hidden="true">{challenge.sustained}/{bad}</div>
      <h3 className="lock-success-title">{clean?"THE RECORD IS CLEAN":"THE RECORD STANDS"}</h3>
      <p className="lock-success-copy">
        {challenge.missed} answered · {challenge.overruled} overruled{challenge.strict&&challenge.overruled?" (the bench is strict)":""}
      </p>
      <button ref={buttonRef} className="btn safe action-primary lock-continue" type="button" onClick={completeActionChallenge}>
        BACK TO THE ARGUMENT
      </button>
    </div>
  );
}

/* Prep work has no getaway: the chart either holds, holds partly, or doesn't. */
function ContradictionResultPanel({challenge}){
  const buttonRef=useRef(null);
  const solved=challenge.phase==="contradiction_success";
  const found=challenge.matched.length, total=challenge.solution.length;

  useEffect(()=>{
    buttonRef.current?.focus();
  },[]);

  return (
    <div className={`action-game lock-success timeline-result${solved?"":" timeline-result-miss"}`}>
      <div className="lock-success-mark" aria-hidden="true">{found}/{total}</div>
      <h3 className="lock-success-title">{solved?"THE CHART HOLDS":found?"A PARTIAL CHART":"NOTHING PROVABLE"}</h3>
      <p className="lock-success-copy">{challenge.feedback}</p>
      <button ref={buttonRef} className="btn safe action-primary lock-continue" type="button" onClick={completeActionChallenge}>
        BACK TO THE FILE
      </button>
    </div>
  );
}

/* The chronology result is not a covert win/loss: it hands the play you already
   committed to a better or worse footing, then the case resolves as normal. */
function TimelineResultPanel({challenge}){
  const buttonRef=useRef(null);
  const solved=challenge.phase==="timeline_success";

  useEffect(()=>{
    buttonRef.current?.focus();
  },[]);

  return (
    <div className={`action-game lock-success timeline-result${solved?"":" timeline-result-miss"}`}>
      <div className="lock-success-mark" aria-hidden="true">{solved?"+12%":"−10%"}</div>
      <h3 className="lock-success-title">{solved?"THE CHRONOLOGY HOLDS":"THE STORY WOBBLES"}</h3>
      <p className="lock-success-copy">{challenge.feedback}</p>
      <button ref={buttonRef} className="btn safe action-primary lock-continue" type="button" onClick={completeActionChallenge}>
        GO IN
      </button>
    </div>
  );
}

function SuccessPanel({challenge}){
  const buttonRef=useRef(null);
  const power=challenge.type==="power_cut";

  useEffect(()=>{
    buttonRef.current?.focus();
  },[]);

  return (
    <div className={`action-game lock-success${power?" power-success":" lock-game"}`}>
      <div className="lock-success-mark" aria-hidden="true">{power?"DARK":"OPEN"}</div>
      <h3 className="lock-success-title">{power?"THE GRID GOES QUIET":"THE CYLINDER GIVES"}</h3>
      <p className="lock-success-copy">
        {challenge.feedback||(power?"Every live contact drops in sequence.":"The latch releases without drawing attention.")}
      </p>
      <button
        ref={buttonRef}
        className="btn safe action-primary lock-continue"
        type="button"
        onClick={completeActionChallenge}
      >
        CONTINUE
      </button>
    </div>
  );
}

const GUIDED=new Set(["lockpick","power_cut","timeline","contradiction","objection","redaction"]);

export default function ActionMinigameOverlay(){
  const state=useGame();
  const challenge=state?.actionChallenge;
  const challengeOpen=Boolean(challenge);
  const dialogRef=useRef(null);
  const [guide,setGuide]=useState(false);

  useEffect(()=>{
    if(!challengeOpen) return;
    const previouslyFocused=document.activeElement;
    // .devpanel is excluded on purpose: it only exists in dev builds, and
    // inspecting a board while it is open is the entire point of it.
    const background=[...document.querySelectorAll("#approot > :not(.action-overlay):not(.flash):not(.devpanel)")];
    const previousState=background.map(element=>({
      element,
      inert:element.inert,
      inertAttr:element.hasAttribute("inert"),
      ariaHidden:element.getAttribute("aria-hidden"),
    }));
    background.forEach(element=>{
      element.inert=true;
      element.setAttribute("inert","");
      element.setAttribute("aria-hidden","true");
    });
    return ()=>{
      previousState.forEach(({element,inert,inertAttr,ariaHidden})=>{
        element.inert=inert;
        if(!inertAttr) element.removeAttribute("inert");
        if(ariaHidden==null) element.removeAttribute("aria-hidden");
        else element.setAttribute("aria-hidden",ariaHidden);
      });
      // A completion can create a boss-demand or summary overlay in the same
      // render. Wait through the next paint so focus lands on that new modal,
      // not on a now-detached case option or an unrelated topbar control.
      requestAnimationFrame(()=>requestAnimationFrame(()=>{
        if(previouslyFocused?.isConnected&&previouslyFocused!==document.body&&previouslyFocused!==document.documentElement)
          previouslyFocused.focus();
        else document.querySelector(
          ".overlay:not(.action-overlay) button:not([disabled]), #casepane button:not([disabled]), #topbar button:not([disabled]), button:not([disabled])"
        )?.focus();
      }));
    };
  },[challengeOpen]);

  const trapFocus=event=>{
    if(event.key!=="Tab") return;
    const focusable=[...dialogRef.current.querySelectorAll(
      'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
    )].filter(element=>element.getClientRects().length>0);
    if(!focusable.length){ event.preventDefault(); dialogRef.current.focus(); return; }
    const first=focusable[0], last=focusable.at(-1), active=document.activeElement;
    if(event.shiftKey&&(active===first||!dialogRef.current.contains(active))){ event.preventDefault(); last.focus(); }
    else if(!event.shiftKey&&(active===last||!dialogRef.current.contains(active))){ event.preventDefault(); first.focus(); }
  };

  if(!challenge) return null;

  const timeline=challenge.type==="timeline";
  const contradiction=challenge.type==="contradiction";
  const objection=challenge.type==="objection";
  const redaction=challenge.type==="redaction";
  let game=null;
  if(challenge.phase==="redaction") game=<RedactionMinigame challenge={challenge} />;
  else if(challenge.phase==="redaction_done") game=<RedactionResultPanel challenge={challenge} />;
  else if(challenge.phase==="objection") game=<ObjectionMinigame challenge={challenge} paused={guide} />;
  else if(challenge.phase==="objection_done") game=<ObjectionResultPanel challenge={challenge} />;
  else if(challenge.phase==="contradiction") game=<ContradictionMinigame challenge={challenge} />;
  else if(challenge.phase==="contradiction_success"||challenge.phase==="contradiction_fail")
    game=<ContradictionResultPanel challenge={challenge} />;
  else if(challenge.phase==="timeline") game=<TimelineMinigame challenge={challenge} />;
  else if(challenge.phase==="timeline_success"||challenge.phase==="timeline_fail") game=<TimelineResultPanel challenge={challenge} />;
  else if(challenge.phase==="lockpick") game=<LockpickMinigame challenge={challenge} paused={guide} />;
  else if(challenge.phase==="power_cut") game=<PowerCutMinigame challenge={challenge} paused={guide} />;
  else if(challenge.phase==="lock_success"||challenge.phase==="power_success") game=<SuccessPanel challenge={challenge} />;
  else if(challenge.phase==="coin_call"||challenge.phase==="coin_result") game=<CoinFlipMinigame challenge={challenge} />;

  return (
    <div className="overlay action-overlay">
      <section
        ref={dialogRef}
        className="box panel action-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="action-challenge-title"
        aria-describedby="action-challenge-body"
        tabIndex="-1"
        onKeyDown={trapFocus}
      >
        {GUIDED.has(challenge.type) && (
          <button className="btn small guide-open" type="button" title="How does this work?"
                  aria-label="How this board works"
                  onClick={()=>{ checkpointActionChallenge(); setGuide(true); }}>i</button>
        )}
        <div className="action-kicker">
          {timeline?"CASE PREP · EVIDENCE TIMELINE":contradiction?"CASE PREP · CONTRADICTION BOARD":objection?"IN SESSION · THE RECORD":redaction?"CASE PREP · PRIVILEGE REVIEW":"COVERT ACTION"}
        </div>
        <h2 id="action-challenge-title">{challenge.actionTitle||"AFTER HOURS"}</h2>
        <p id="action-challenge-body" className="action-brief">
          {challenge.body||"Keep quiet. Leave no trace."}
        </p>
        <div className="action-divider" aria-hidden="true" />
        {game}
        {guide && <BoardGuide kind={challenge.type} onClose={()=>setGuide(false)} />}
        {challenge.phase!=="power_cut" && <div className="action-live" role="status" aria-live="polite" aria-atomic="true">
          {challenge.feedback||(
            challenge.phase==="coin_result"
              ? `${faceLabel(challenge.coinFace)}. ${challenge.escaped?"You escaped.":"You were caught."}`
              : ""
          )}
        </div>}
      </section>
    </div>
  );
}

function faceLabel(face){
  return String(face||"Coin result").toUpperCase();
}
