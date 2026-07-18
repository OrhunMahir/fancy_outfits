import { useGame } from "../game/useGame.js";
import { REP_FIRED, RANK_REQ, RANKS, PRICES, DECOR, BUYIN_COST, FIRM_COLLAPSE } from "../game/constants.js";
import { CLIENT_CAP } from "../game/clients.js";
import { SCENARIOS } from "../game/content.js";
import { buySuit, bribeMarv, buyCoffee, buyDecor, coffeeRelief, coffeeCost, payBuyIn, objectiveInfo, hazardPerHour,
         rivalSabotage, rivalTruce, rivalAlly, rivalMoveReady, rivalOdds, displayPct } from "../game/engine.js";

export default function StatsPanel(){
  const S=useGame();
  const bars=[["REPUTATION",S.rep,"#38b764"],["BOLDNESS",S.bold,"#b13e53"],["INFLUENCE",S.inf,"#ffcd75"],["FIRM",S.firm,"#4d73e8"],["FATIGUE",S.fatigue,"#b06ad9"]];
  const obj=objectiveInfo();
  return (
    <div id="stats" className="panel">
      <h2>ASSOCIATE FILE</h2>
      {obj && (
        <div className="kv" style={{color:obj.done?"var(--green)":"var(--gold)",marginBottom:8}}>
          TODAY'S GOAL: {obj.text} ({obj.cur}/{obj.target}) → {obj.reward}{obj.done?" ✓":""}
        </div>
      )}
      <div>
        {bars.map(([n,v,col])=>{
          let extra="";
          if(n==="REPUTATION") extra=" (fired < "+REP_FIRED+")";
          if(n==="INFLUENCE"&&S.rank<4) extra=" (next rank: "+RANK_REQ[S.rank]+(S.rank===2?" + buy-in":"")+")";
          if(n==="FIRM") extra=(S.endlessWon||S.rank===4)?" (collapse < "+FIRM_COLLAPSE+")":" (the partners' problem. for now)";
          if(n==="FATIGUE") extra=hazardPerHour()>0
            ?" (⚠ "+hazardPerHour()+"%/h sent-home risk)"
            :(S.fatigue>0?" (risky plays -"+Math.round(S.fatigue*.25)+"%)":" (fresh)");
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
          <div className="tagline">{RANKS[S.nemesis.rank]} · INF {S.nemesis.inf} vs your {S.inf}{S.nemesis.grudge?" · HOLDS A GRUDGE":""}</div>
          <div className="bar" style={{marginTop:3}}><div className="fill" style={{width:S.nemesis.inf+"%",background:"#b13e53"}}/></div>
          {S.rivalPact
            ? <div className="tagline" style={{color:"var(--gold)",marginTop:4}}>PACT: {S.rivalPact.type.toUpperCase()} until day {S.rivalPact.until}</div>
            : !rivalMoveReady()&&!S.over
              ? <div className="tagline" style={{marginTop:4}}>He's watching you. Next move: day {S.rivalMoveDay}.</div>
              : (
                <div className="diffrow" style={{marginTop:5}}>
                  <button className="btn small bold" disabled={S.hours<1} onClick={rivalSabotage}>
                    SABOTAGE{displayPct(rivalOdds().sab,"rival|sab")?" "+displayPct(rivalOdds().sab,"rival|sab"):""} · 1h
                  </button>
                  <button className="btn small" disabled={S.hours<0.5} onClick={rivalTruce}>TRUCE · 0.5h</button>
                  <button className="btn small safe" disabled={S.hours<1} onClick={rivalAlly}>
                    ALLY{displayPct(rivalOdds().ally,"rival|ally")?" "+displayPct(rivalOdds().ally,"rival|ally"):""} · 1h
                  </button>
                </div>
              )}
        </div>
      )}
      <h2 style={{marginTop:10}}>CLIENTS ({S.clients.length}/{CLIENT_CAP(S.rank)})</h2>
      <div className="kv">
        {S.clients.length
          ? S.clients.map(c=>c.name).join(" · ")+" — $"+S.clients.reduce((a,c)=>a+c.fee,0)+"/wk in retainers (paid Fridays)"
          : "None yet. Clients follow reputation — win loudly and they'll come to you."}
      </div>
      <h2 style={{marginTop:10}}>EXPENSES</h2>
      {S.rank===2&&!S.buyinPaid&&S.inf>=RANK_REQ[2] && (
        <button className="btn small spend safe" disabled={S.money<BUYIN_COST} onClick={payBuyIn}>
          PARTNERSHIP BUY-IN · ${BUYIN_COST}<span className="chance">Wire it and the Senior Partnership is yours.</span>
        </button>
      )}
      <button className="btn small spend" disabled={S.money<S.suitCost} onClick={buySuit}>
        TAILORED SUIT · ${S.suitCost}<span className="chance">+8 REP. Dress for the rank you want.</span>
      </button>
      <button className="btn small spend" disabled={S.money<PRICES.marv} onClick={bribeMarv}>
        BRIBE MARV · ${PRICES.marv}<span className="chance">The copy room knows who everyone really is.</span>
      </button>
      <button className="btn small spend" disabled={S.money<coffeeCost()||S.fatigue<=0} onClick={buyCoffee}>
        DOUBLE ESPRESSO · ${coffeeCost()}<span className="chance">
          −{coffeeRelief()} FATIGUE{S.coffeeToday>0?" (cup #"+(S.coffeeToday+1)+" — diminishing returns)":". The firm's true fuel."}
        </span>
      </button>
      <h2 style={{marginTop:10}}>OFFICE DECOR</h2>
      {Object.entries(DECOR).map(([id,d])=>
        (S.decor&&S.decor[id])
          ? <div key={id} className="kv" style={{color:"var(--green)"}}>■ {d.name} — owned</div>
          : <button key={id} className="btn small spend" disabled={S.money<d.cost} onClick={()=>buyDecor(id)}>
              {d.name} · ${d.cost}<span className="chance">{d.desc}</span>
            </button>
      )}
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
