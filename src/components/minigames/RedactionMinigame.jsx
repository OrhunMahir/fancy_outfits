import { useEffect, useRef } from "react";
import { markRedaction, produceRedaction } from "../../game/engine.js";

/* Two ways to be wrong, so the board never tells you which pages are which —
   the case brief states the rule and the pages have to be read against it. */
export default function RedactionMinigame({challenge}){
  const firstRef=useRef(null);
  const pages=Array.isArray(challenge.pages)?challenge.pages:[];
  const marked=new Set(challenge.marked||[]);

  useEffect(()=>{ firstRef.current?.focus(); },[]);

  return (
    <div className="action-game redact-game">
      <div className="lock-instructions">
        Black out privileged material only: legal advice with the client, and your own work product.
        Leave everything else legible.
      </div>

      <div className="redact-status">BLACKED OUT {marked.size}/{pages.length}</div>

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
                onClick={()=>markRedaction(page.id)}
              >
                <span className="redact-text">{page.text}</span>
                <span className="redact-flag">{on?"REDACTED":"PRODUCE"}</span>
              </button>
            </li>
          );
        })}
      </ul>

      <button className="btn bold action-primary redact-submit" type="button" onClick={produceRedaction}>
        SEND THE PRODUCTION
      </button>
    </div>
  );
}
