// The FIRM tab — Name Partner endgame (endless). Your payroll: who wins, who
// loses, who drags the firm down. Fire anyone except Senior Partners; those
// need a partner vote. Every firing raises the odds an ex-employee sues.
import { useGame } from "../game/useGame.js";
import { closeRoster, fireEmployee, voteChance, displayPct } from "../game/engine.js";

export default function RosterOverlay(){
  const S=useGame();
  const heat=Math.min(30,Math.round(S.fireHeat));
  return (
    <div className="overlay" style={{overflowY:"auto"}}>
      <div className="box panel" style={{maxWidth:640,margin:"auto"}}>
        <h2>PARSON HENDERSON — PAYROLL</h2>
        <div className="kv">
          FIRM HEALTH: {S.firm}/100{S.everFired?" · LITIGATION RISK: ~"+heat+"%/morning (never zero — they remember)":""}
        </div>
        <div className="kv" style={{marginBottom:10}}>
          IMPACT is what they do to the firm every day. Firing hurts morale (−2 FIRM) and invites lawsuits. Senior Partners require a partner vote.
        </div>
        {S.roster&&S.roster.map(e=>(
          <div key={e.id} className="rosterrow">
            <div className="lblrow">
              <span>{e.name.toUpperCase()}</span>
              <span style={{color:e.impact>0?"var(--green)":(e.impact<0?"var(--red)":"var(--grey)")}}>
                IMPACT {e.impact>0?"+":""}{e.impact}/day
              </span>
            </div>
            <div className="tagline">{e.role} · {e.won}W / {e.lost}L</div>
            {e.senior
              ? <button className="btn small bold" onClick={()=>fireEmployee(e.id)}>
                  CALL A VOTE {displayPct(voteChance(),"vote|"+e.id)||""}
                </button>
              : <button className="btn small" onClick={()=>fireEmployee(e.id)}>FIRE</button>}
          </div>
        ))}
        {S.roster&&!S.roster.length && <div className="kv">You fired everyone. The office is very tidy and very doomed.</div>}
        <div className="opts" style={{marginTop:12}}><button className="btn" onClick={closeRoster}>BACK TO BILLING</button></div>
      </div>
    </div>
  );
}
