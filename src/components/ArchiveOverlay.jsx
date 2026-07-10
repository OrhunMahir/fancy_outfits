// The case archive: every resolved file — what you played, how it went.
// Also answers "which case was that REPLY about?" for delayed outcomes.
import { useGame } from "../game/useGame.js";
import { closeArchive } from "../game/engine.js";

const SHOW=60;

export default function ArchiveOverlay(){
  const S=useGame();
  const rows=S.archive.slice(0,SHOW);
  return (
    <div className="overlay" style={{overflowY:"auto"}}>
      <div className="box panel" style={{maxWidth:640,margin:"auto"}}>
        <h2>CASE ARCHIVE ({S.archive.length})</h2>
        {!S.archive.length && <div className="kv">Nothing resolved yet. The archive, like your career, awaits content.</div>}
        {rows.map((e,i)=>(
          <div key={i} className="rosterrow">
            <div className="lblrow">
              <span>DAY {e.day} — {e.title}</span>
              <span style={{color:e.win?"var(--green)":"var(--red)"}}>{e.win?"WON":"LOST"}</span>
            </div>
            <div className="tagline">
              ▸ {e.play}{e.via?" · "+e.via:""}
            </div>
            {e.note && <div className="tagline" style={{opacity:.8}}>{e.note}</div>}
          </div>
        ))}
        {S.archive.length>SHOW && <div className="kv">…and {S.archive.length-SHOW} earlier entries.</div>}
        <div className="opts" style={{marginTop:12}}><button className="btn" onClick={closeArchive}>BACK TO BILLING</button></div>
      </div>
    </div>
  );
}
