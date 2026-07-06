// Inbox items come in 3 flavors (same array, distinguished by flags):
// msg=info card, pending=awaiting delayed reply (not clickable), normal=openable case.
import { useGame } from "../game/useGame.js";
import { openCaseFile } from "../game/engine.js";

export default function Inbox(){
  const S=useGame();
  return (
    <div id="inbox" className="panel">
      <h2>INBOX</h2>
      <div>
        {!S.inbox.length && <div className="kv">Empty. Suspiciously empty.</div>}
        {S.inbox.map((c,i)=>{
          if(c.msg) return (
            <div key={i} className="inbox-item msg"><div>{c.title}</div><div className="tag">{c.body}</div></div>);
          if(c.pending) return (
            <div key={i} className="inbox-item"><div>{c.title}</div><div className="tag">Awaiting response (day {c.pending.day})</div></div>);
          if(c.delegated) return (
            <div key={i} className="inbox-item"><div>{c.title}</div><div className="tag">With {S.npcs.find(n=>n.id===c.delegated.npc).name} (report day {c.delegated.day})</div></div>);
          return (
            <div key={i} className="inbox-item" onClick={()=>openCaseFile(c)}>
              <div>{c.title}</div>
              {c.chain && <div className="tag" style={{color:"var(--gold)"}}>FOLLOW-UP FILING</div>}
              <div className="due">DUE DAY {c.dueDay}</div>
            </div>);
        })}
      </div>
    </div>
  );
}
