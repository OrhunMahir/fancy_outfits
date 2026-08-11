import { useEffect, useRef } from "react";
import { completeActionChallenge } from "../game/engine.js";
import { useGame } from "../game/useGame.js";
import CoinFlipMinigame from "./minigames/CoinFlipMinigame.jsx";
import LockpickMinigame from "./minigames/LockpickMinigame.jsx";

function SuccessPanel({challenge}){
  const buttonRef=useRef(null);

  useEffect(()=>{
    buttonRef.current?.focus();
  },[]);

  return (
    <div className="action-game lock-game lock-success">
      <div className="lock-success-mark" aria-hidden="true">OPEN</div>
      <h3 className="lock-success-title">THE CYLINDER GIVES</h3>
      <p className="lock-success-copy">
        {challenge.feedback||"The latch releases without drawing attention."}
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

export default function ActionMinigameOverlay(){
  const state=useGame();
  const challenge=state?.actionChallenge;
  const challengeOpen=Boolean(challenge);
  const dialogRef=useRef(null);

  useEffect(()=>{
    if(!challengeOpen) return;
    const previouslyFocused=document.activeElement;
    const background=[...document.querySelectorAll("#approot > :not(.action-overlay):not(.flash)")];
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

  let game=null;
  if(challenge.phase==="lockpick") game=<LockpickMinigame challenge={challenge} />;
  else if(challenge.phase==="lock_success") game=<SuccessPanel challenge={challenge} />;
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
        <div className="action-kicker">COVERT ACTION</div>
        <h2 id="action-challenge-title">{challenge.actionTitle||"AFTER HOURS"}</h2>
        <p id="action-challenge-body" className="action-brief">
          {challenge.body||"Keep quiet. Leave no trace."}
        </p>
        <div className="action-divider" aria-hidden="true" />
        {game}
        <div className="action-live" role="status" aria-live="polite" aria-atomic="true">
          {challenge.feedback||(
            challenge.phase==="coin_result"
              ? `${faceLabel(challenge.coinFace)}. ${challenge.escaped?"You escaped.":"You were caught."}`
              : ""
          )}
        </div>
      </section>
    </div>
  );
}

function faceLabel(face){
  return String(face||"Coin result").toUpperCase();
}
