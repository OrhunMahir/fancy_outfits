import { useGame } from "../game/useGame.js";
import { REP_FIRED, RANK_REQ } from "../game/constants.js";
import { SCENARIOS } from "../game/content.js";

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
      <div className="kv">RUN: {SCENARIOS[S.scenario].label}</div>
      <div id="log">
        {S.logEntries.map((e,i)=>(
          <div key={S.logEntries.length-i} className={e.cls}>{"> "+e.txt}</div>
        ))}
      </div>
    </div>
  );
}
