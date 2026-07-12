// The case archive: every resolved file — what you played, how it went.
// Click a row to unfold the full case details (body, judge, outcome text).
import { useState } from "react";
import { useGame } from "../game/useGame.js";
import { closeArchive } from "../game/engine.js";
import { SFX } from "../game/sound.js";

const SHOW=60;

export default function ArchiveOverlay(){
  const S=useGame();
  const [open,setOpen]=useState(null);
  const rows=S.archive.slice(0,SHOW);
  return (
    <div className="overlay" style={{overflowY:"auto"}}>
      <div className="box panel" style={{maxWidth:640,margin:"auto"}}>
        <h2>CASE ARCHIVE ({S.archive.length})</h2>
        {!S.archive.length && <div className="kv">Nothing resolved yet. The archive, like your career, awaits content.</div>}
        {rows.map((e,i)=>(
          <div key={i} className="rosterrow" style={{cursor:"pointer"}}
               onClick={()=>{ SFX.click(); setOpen(open===i?null:i); }}>
            <div className="lblrow">
              <span>{open===i?"▼":"▶"} DAY {e.day} — {e.title}</span>
              <span style={{color:e.win?"var(--green)":"var(--red)"}}>{e.win?"WON":"LOST"}</span>
            </div>
            <div className="tagline">▸ {e.play}{e.via?" · "+e.via:""}</div>
            {open===i && (
              <div style={{marginTop:6,borderTop:"2px dashed var(--panel2)",paddingTop:6}}>
                {e.body
                  ? <div className="tagline" style={{color:"var(--ink)",opacity:.85,lineHeight:1.9}}>{e.body}</div>
                  : <div className="tagline">No file text on record (resolved before the archive kept full copies).</div>}
                {e.judge && <div className="tagline" style={{marginTop:4}}>JUDGE: {e.judge}</div>}
                {e.note && <div className="tagline" style={{marginTop:4,color:e.win?"var(--green)":"var(--red)"}}>OUTCOME: {e.note}</div>}
              </div>
            )}
          </div>
        ))}
        {S.archive.length>SHOW && <div className="kv">…and {S.archive.length-SHOW} earlier entries.</div>}
        <div className="opts" style={{marginTop:12}}><button className="btn" onClick={closeArchive}>BACK TO BILLING</button></div>
      </div>
    </div>
  );
}
