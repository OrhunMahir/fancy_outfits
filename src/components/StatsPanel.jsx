import { useGame } from "../game/useGame.js";
import { REP_FIRED, RANK_REQ, RANKS, PRICES } from "../game/constants.js";
import { SCENARIOS } from "../game/content.js";
import { buySuit, bribeMarv } from "../game/engine.js";

export default function StatsPanel(){
  const S=useGame();
  const bars=[["REPUTATION",S.rep,"#38b764"],["BOLDNESS",S.bold,"#b13e53"],["INFLUENCE",S.inf,"#ffcd75"]];
  return (
    <div id="stats" className="panel">
      <h2>ASSOCIATE FILE</h2>
      <div>
        {bars.map(([n,v,col])=>{
          let extra="";
          if(n==="REPUTATION") extra=" (fired < "+REP_FIRED+")";
          if(n==="INFLUENCE"&&S.rank<4) extra=" (next rank: "+RANK_REQ[S.rank]+")";
          return (
            <div key={n} className="statrow">
              <div className="lbl"><span>{n+extra}</span><span>{v}</span></div>
              <div className="bar"><div className="fill" style={{width:v+"%",background:col}}/></div>
            </div>);
        })}
      </div>
      <div className="kv">MONEY: ${S.money}{S.debtDue!==null?"  ·  loan due day "+S.debtDue:""}</div>
      <div className="kv">RUN: {SCENARIOS[S.scenario].label} · {(S.difficulty||"easy").toUpperCase()}
        {S.mode&&S.mode!=="standard"?" · "+S.mode.toUpperCase()+(S.mode==="daily"&&S.dailyDate?" "+S.dailyDate:""):""}
        {S.endlessWon?" · NAME PARTNER":""}</div>
      {S.nemesis && (
        <div className="npcrow" style={{marginTop:8}}>
          <div className="lblrow">
            <span style={{color:"var(--red)"}}>RIVAL: {S.nemesis.name.toUpperCase()}</span>
            <span style={{color:S.nemesis.inf>=S.inf?"var(--red)":"var(--grey)"}}>{S.nemesis.inf>=S.inf?"AHEAD":"behind"}</span>
          </div>
          <div className="tagline">{RANKS[S.nemesis.rank]} · INF {S.nemesis.inf} vs your {S.inf}</div>
          <div className="bar" style={{marginTop:3}}><div className="fill" style={{width:S.nemesis.inf+"%",background:"#b13e53"}}/></div>
        </div>
      )}
      <h2 style={{marginTop:10}}>EXPENSES</h2>
      <button className="btn small spend" disabled={S.money<S.suitCost} onClick={buySuit}>
        TAILORED SUIT · ${S.suitCost}<span className="chance">+8 REP. Dress for the rank you want.</span>
      </button>
      <button className="btn small spend" disabled={S.money<PRICES.marv} onClick={bribeMarv}>
        BRIBE MARV · ${PRICES.marv}<span className="chance">The copy room knows who everyone really is.</span>
      </button>
      <h2 style={{marginTop:10}}>THE FLOOR</h2>
      {S.npcs.map(n=>(
        <div key={n.id} className="npcrow">
          <div className="lblrow">
            <span>{n.name.toUpperCase()}</span>
            <span style={{color:n.rel>0?"var(--green)":(n.rel<0?"var(--red)":"var(--grey)")}}>{n.rel>0?"+":""}{n.rel}</span>
          </div>
          <div className="tagline">{n.role} · {n.known?n.trait:"trait: ?"}</div>
        </div>
      ))}
      <div id="log">
        {S.logEntries.map((e,i)=>(
          <div key={S.logEntries.length-i} className={e.cls}>{"> "+e.txt}</div>
        ))}
      </div>
    </div>
  );
}
