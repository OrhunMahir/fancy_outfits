// Middle panel: the desk (tip text) or the open case file with its options.
import { useGame } from "../game/useGame.js";
import { displayChance, displayPct, choose, deferCase, delegateCase, hireDetective, hoursFor, optHours, judgeMemoryInfo, coastingPreview } from "../game/engine.js";
import { delegationChance } from "../game/npcs.js";
import { PRICES, STAKE_REWARD, STAKE_PENALTY, DELEGATE_CAP } from "../game/constants.js";

export default function CasePane(){
  const S=useGame();
  const c=S.openCase;
  if(!c) return (
    <div id="casepane" className="panel">
      <h2>DESK</h2>
      <div className="kv">Pick a file from your inbox.<br/><br/>
        Tip: the safe option never fails — and never impresses. Settle real files back to back
        and the floor calls it coasting: each quiet settlement in a row pays less. Boldness feeds your bluffs;
        failed bluffs eat your reputation. Reputation decays daily and low rep makes every
        risky play harder. The firm forgets fast. Judges don't.</div>
    </div>
  );
  const memory=c.judge?judgeMemoryInfo(c):null;
  return (
    <div id="casepane" className="panel">
      <h2>CASE FILE</h2>
      <div id="paper">
        <h3>{c.title}</h3>
        <div>{c.body}</div>
        {c.judge && <div className="judge">
          JUDGE: {c.judge.name}<br/>
          TEMPER: {c.judge.temper} · BY-THE-BOOK: {c.judge.book} · ETHICS: {c.judge.corrupt>=60?"'SOCIABLE'":c.judge.corrupt>=40?"FLEXIBLE":"GRANITE"}<br/>
          {c.judge.desc}<br/>
          <span style={{color:memory&&!memory.first?"#8a3f2b":"#6b6254"}}>COURT HISTORY: {memory&&memory.history}</span><br/>
          {memory&&!memory.first && <>
            <span>THE COURT REMEMBERS: “{memory.quote}”</span><br/>
            <span>{memory.record}</span><br/>
            <span>{memory.recall} · EFFECT TODAY: {memory.effects}</span>
          </>}
          {memory&&memory.first && <span>{memory.effects}</span>}
        </div>}
        <div style={{marginTop:8,fontSize:8}}>
          DEADLINE: DAY {c.dueDay} · BASE TIME: {hoursFor(c)}h (careful plays take longer)
          {c.stakes>0 && <> · STAKES ×{STAKE_REWARD[c.stakes]} fees / ×{STAKE_PENALTY[c.stakes]} fallout</>}
          {c.big && <span style={{color:"#8a6a1f"}}> · RETAINER MATTER — STAGE {c.big.stage}/3 ({c.big.client})</span>}
          {c.dossier && <> · DOSSIER ATTACHED (+12%)</>}
          {c.covertEdge>0 && <span style={{color:"#8a3f2b"}}> · {c.covertNote||`COVERT EVIDENCE (+${c.covertEdge}%)`}</span>}
          {c.tampered && <span style={{color:"var(--red)"}}> · PAGES REORDERED — someone touched this file (−6%)</span>}
        </div>
      </div>
      <div className="opts">
        {c.opts.map((o,i)=>{
          const pct=displayChance(o,c);
          const coast=coastingPreview(c,o); // settling again pays less; the odds never change
          const label=[o.action&&"INTERACTIVE",pct&&pct+" success", optHours(c,o)+"h", o.delay&&`reply in ${o.delay}d`, o.style,
            coast&&`COASTING: ${coast.inf} INF, ${coast.bold} BOLD`].filter(Boolean).join(" · ");
          return (
            <button key={i}
                    className={"btn"+(o.safe?" safe":o.style==="aggressive"?" bold":o.style==="bribe"?" bribe":o.style==="covert"?" covert":o.style==="prep"?" prep":"")}
                    disabled={!!(o.bribe&&S.money<o.bribe)}
                    onClick={()=>choose(c,o)}>
              {(i+1)+". "+o.text}
              {label && <span className="chance">{label}</span>}
            </button>
          );
        })}
        {!c.dossier && !c.favor && (
          <button className="btn small" disabled={S.money<PRICES.detective} onClick={()=>hireDetective(c)}>
            HIRE DETECTIVE · ${PRICES.detective} (+12% on this file's risky plays)
          </button>
        )}
        {(S.rank>=1||S.scenario==="boomerang") && !c.judge && !c.favor && (
          <div className="delg">
            <div className="kv">DELEGATE (0.5h · {S.today.delegated}/{DELEGATE_CAP} TODAY) — they do the work, you own the fallout. Report tomorrow:</div>
            {S.npcs.map(n=>{
              const pct=n.known?displayPct(delegationChance(n),"delg|"+n.id):null;
              return (
                <button key={n.id} className="btn small" disabled={S.today.delegated>=DELEGATE_CAP} onClick={()=>delegateCase(c,n.id)}>
                  {n.name.split(" ")[0].toUpperCase()} · {n.known?n.trait+(pct?" · "+pct:""):"??"}
                </button>
              );
            })}
          </div>
        )}
        <button className="btn small" onClick={deferCase}>DEFER (back to inbox) [Space]</button>
      </div>
    </div>
  );
}
