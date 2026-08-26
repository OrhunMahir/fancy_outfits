import { useEffect, useRef } from "react";
import { markRedaction, produceRedaction } from "../../game/engine.js";

/* Two ways to be wrong, so the board never marks the pages for you. What it CAN
   do is state the test plainly and show, for each page, what pressing it will
   actually do — the earlier version left both to the player's memory. */
export default function RedactionMinigame({challenge,demo=false}){
  const firstRef=useRef(null);
  const pages=Array.isArray(challenge.pages)?challenge.pages:[];
  const marked=new Set(challenge.marked||[]);

  useEffect(()=>{ if(!demo) firstRef.current?.focus(); },[demo]);

  return (
    <div className="action-game redact-game">
      <div className="redact-rule">
        <div className="redact-rule-row redact-rule-black">
          <span className="redact-rule-key">BLACK OUT</span>
          <span>advice between you and the client · notes and memos you wrote yourself</span>
        </div>
        <div className="redact-rule-row redact-rule-send">
          <span className="redact-rule-key">SEND</span>
          <span>ordinary business records · anything an outsider already saw</span>
        </div>
      </div>
      <div className="lock-instructions">
        Tap a page to switch it. Miss a privileged page and they read your case; black out an ordinary
        record and the court calls it obstruction.
      </div>

      <div className="redact-status">
        {marked.size} BLACKED OUT · {pages.length-marked.size} GOING OUT AS-IS
      </div>

      <ul className="redact-list">
        {pages.map((page,index)=>{
          const on=marked.has(page.id);
          return (
            <li key={page.id}>
              <button
                ref={index===0?firstRef:null}
                className={"btn small redact-page"+(on?" redact-on":"")}
                type="button"
                aria-pressed={on}
                aria-label={`${page.text} — currently ${on?"blacked out":"going out"}`}
                onClick={demo?undefined:()=>markRedaction(page.id)}
              >
                <span className="redact-mark" aria-hidden="true">{on?"█":"□"}</span>
                <span className="redact-text">{page.text}</span>
                <span className="redact-flag">{on?"BLACKED OUT":"GOING OUT"}</span>
              </button>
            </li>
          );
        })}
      </ul>

      <button className="btn bold action-primary redact-submit" type="button" onClick={demo?undefined:produceRedaction} disabled={demo}>
        SEND THE PRODUCTION ({pages.length-marked.size} pages legible)
      </button>
    </div>
  );
}
