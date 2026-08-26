import { useEffect, useRef } from "react";
import { selectContradictionCard, pinContradiction, closeContradictionBoard } from "../../game/engine.js";

/* Two columns of real buttons: pick a statement, then pick the exhibit that
   makes it impossible. Every control is keyboard reachable and 48px tall, so
   mouse, thumb and keyboard all play the same board. */
export default function ContradictionMinigame({challenge,demo=false}){
  const firstRef=useRef(null);
  const statements=Array.isArray(challenge.statements)?challenge.statements:[];
  const documents=Array.isArray(challenge.documents)?challenge.documents:[];
  const matched=Array.isArray(challenge.matched)?challenge.matched:[];
  const pinnedStatements=new Set(matched.map(m=>m.statement));
  const pinnedDocuments=new Set(matched.map(m=>m.document));
  const selected=challenge.selected;

  useEffect(()=>{
    if(!demo) firstRef.current?.focus();
  },[demo]);

  return (
    <div className="action-game contra-game">
      <div className="lock-instructions">
        Pick a sworn statement, then the exhibit it cannot survive. One exhibit here contradicts nothing.
      </div>

      <div className="contra-status">
        PROVEN {matched.length}/{challenge.solution.length} · ATTEMPTS LEFT {challenge.attemptsLeft}/{challenge.maxAttempts}
      </div>

      <div className="contra-columns">
        <div className="contra-column">
          <h4 className="contra-heading" id="contra-statements">SWORN STATEMENTS</h4>
          <ul className="contra-list" aria-labelledby="contra-statements">
            {statements.map((statement,index)=>{
              const done=pinnedStatements.has(statement.id);
              return (
                <li key={statement.id}>
                  <button
                    ref={index===0?firstRef:null}
                    className={"btn small contra-card"+(done?" contra-done":"")+(selected===statement.id?" contra-selected":"")}
                    type="button"
                    disabled={demo||done}
                    aria-pressed={selected===statement.id}
                    onClick={demo?undefined:()=>selectContradictionCard(statement.id)}
                  >{done?"✓ ":""}{statement.text}</button>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="contra-column">
          <h4 className="contra-heading" id="contra-documents">EXHIBITS</h4>
          <ul className="contra-list" aria-labelledby="contra-documents">
            {documents.map(document=>{
              const done=pinnedDocuments.has(document.id);
              return (
                <li key={document.id}>
                  <button
                    className={"btn small contra-card"+(done?" contra-done":"")}
                    type="button"
                    disabled={done||!selected}
                    onClick={demo?undefined:()=>pinContradiction(document.id)}
                  >{done?"✓ ":""}{document.text}</button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      <button className="btn small timeline-decline" type="button" onClick={demo?undefined:closeContradictionBoard} disabled={demo}>
        CLOSE THE BINDER (keep what you proved)
      </button>
    </div>
  );
}
