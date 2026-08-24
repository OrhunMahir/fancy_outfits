import { useState } from "react";
import { useGame } from "../game/useGame.js";
import * as dev from "../game/devtools.js";
import { endDay, dismissSummary } from "../game/engine.js";

/* DEV ONLY. App renders this behind import.meta.env.DEV, so the production
   build never contains it. Backtick toggles it. */
const BOARDS=[
  ["lockpick","Lockpick · SNEAKY 0",{sneaky:0}],
  ["lockpick","Lockpick · SNEAKY 2",{sneaky:2}],
  ["lockpick","Lockpick · SNEAKY 5",{sneaky:5}],
  ["power_cut","Power Cut",{}],
  ["timeline","Evidence Timeline",{}],
  ["contradiction","Contradiction Board",{}],
  ["objection","Objection",{}],
  ["redaction","Privilege Review",{}],
];
const STATS=["rep","bold","inf","firm","money","fatigue","hours","rank","day"];

export default function DevPanel({onClose}){
  const S=useGame();
  const [reveal,setReveal]=useState(null);
  const cases=dev.devCaseIds();

  const show=()=>setReveal(dev.devRevealChallenge());

  return (
    <div className="devpanel" role="dialog" aria-label="Developer tools">
      <div className="dev-head">
        <strong>DEV</strong>
        <span className="dev-hint">F9 or ` closes · dev build only</span>
        <button className="btn small dev-x" type="button" onClick={onClose}>✕</button>
      </div>

      <div className="dev-section">
        <h4>Boards</h4>
        <div className="dev-grid">
          {BOARDS.map(([kind,label,opts])=>(
            <button key={label} className="btn small" type="button"
                    onClick={()=>{ dev.devOpenBoard(kind,opts); setReveal(null); }}>{label}</button>
          ))}
          <button className="btn small" type="button"
                  onClick={()=>{ dev.devOpenCoin("heads"); setReveal(null); }}>Coin · heads</button>
          <button className="btn small" type="button"
                  onClick={()=>{ dev.devOpenCoin("tails"); setReveal(null); }}>Coin · tails</button>
        </div>
      </div>

      <div className="dev-section">
        <h4>Hand-written filings</h4>
        <div className="dev-grid">
          {cases.map(c=>(
            <button key={c.id} className="btn small" type="button" title={c.title}
                    onClick={()=>dev.devSpawnCase(c.id)}>[{c.tier}] {c.id}</button>
          ))}
        </div>
      </div>

      <div className="dev-section">
        <h4>Procedural templates</h4>
        <div className="dev-grid dev-grid-tight">
          {Array.from({length:dev.DEV_TEMPLATE_COUNT},(_,i)=>(
            <button key={i} className="btn small" type="button"
                    onClick={()=>dev.devSpawnTemplate(i)}>{i+1}</button>
          ))}
        </div>
      </div>

      <div className="dev-section">
        <h4>Stats</h4>
        <div className="dev-stats">
          {STATS.map(key=>(
            <label key={key} className="dev-stat">
              <span>{key}</span>
              <input type="number" value={S&&S[key]!=null?S[key]:0}
                     onChange={e=>dev.devSetStats({[key]:e.target.value})} />
            </label>
          ))}
          <label className="dev-stat">
            <span>sneaky</span>
            <input type="number" min="0" max="5" value={S?.progression?.skills?.sneaky??0}
                   onChange={e=>dev.devSetSneaky(Number(e.target.value))} />
          </label>
        </div>
        <div className="dev-grid">
          <button className="btn small" type="button" onClick={()=>{ endDay(); }}>End day</button>
          <button className="btn small" type="button" onClick={()=>{ if(S?.summary) dismissSummary(); }}>Dismiss summary</button>
        </div>
      </div>

      <div className="dev-section">
        <h4>Reveal</h4>
        <button className="btn small" type="button" onClick={show}>What is this board hiding?</button>
        {reveal && <pre className="dev-reveal">{Object.entries(reveal).map(([k,v])=>`${k}: ${v}`).join("\n")}</pre>}
        {reveal===null && S?.actionChallenge && <div className="dev-hint">a board is open — press the button</div>}
      </div>
    </div>
  );
}
