// Middle panel: the desk (tip text) or the open case file with its options.
import { useGame } from "../game/useGame.js";
import { chance, choose, deferCase, delegateCase } from "../game/engine.js";
import { delegationChance } from "../game/npcs.js";

export default function CasePane(){
  const S=useGame();
  const c=S.openCase;
  if(!c) return (
    <div id="casepane" className="panel">
      <h2>DESK</h2>
      <div className="kv">Pick a file from your inbox.<br/><br/>
        Tip: the safe option never fails — and never impresses. Boldness feeds your bluffs;
        failed bluffs eat your reputation. Reputation decays daily and low rep makes every
        risky play harder. This firm has no memory and no mercy.</div>
    </div>
  );
  return (
    <div id="casepane" className="panel">
      <h2>CASE FILE</h2>
      <div id="paper">
        <h3>{c.title}</h3>
        <div>{c.body}</div>
        {c.judge && <div className="judge">
          JUDGE: {c.judge.name}<br/>TEMPER {c.judge.temper} / BY-THE-BOOK {c.judge.book}<br/>{c.judge.desc}
        </div>}
        <div style={{marginTop:8,fontSize:8}}>DEADLINE: DAY {c.dueDay}</div>
      </div>
      <div className="opts">
        {c.opts.map((o,i)=>(
          <button key={i} className={"btn"+(o.safe?" safe":(o.style==="aggressive"?" bold":""))}
                  onClick={()=>choose(c,o)}>
            {o.text}
            <span className="chance">
              {chance(o,c)}% success{o.delay?` · reply in ${o.delay}d`:""}{o.style?` · ${o.style}`:""}
            </span>
          </button>
        ))}
        {S.rank>=1 && !c.judge && (
          <div className="delg">
            <div className="kv">DELEGATE — they do the work, you own the fallout. Report tomorrow:</div>
            {S.npcs.map(n=>(
              <button key={n.id} className="btn small" onClick={()=>delegateCase(c,n.id)}>
                {n.name.split(" ")[0].toUpperCase()} · {n.known?n.trait+" · "+delegationChance(n)+"%":"??%"}
              </button>
            ))}
          </div>
        )}
        <button className="btn small" onClick={deferCase}>DEFER (back to inbox)</button>
      </div>
    </div>
  );
}
