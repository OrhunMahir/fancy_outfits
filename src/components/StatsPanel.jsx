import { useGame } from "../game/useGame.js";
import { REP_FIRED, RANK_REQ, RANKS, PRICES, DECOR, BUYIN_COST, FIRM_COLLAPSE, FIRM_STABLE,
         FIRM_PLAN_GAIN, FIRM_PLAN_HOURS, FIRM_PLAN_FATIGUE, FIRM_PLAN_COOLDOWN, COFFEE_LIMIT } from "../game/constants.js";
import { CLIENT_CAP } from "../game/clients.js";
import { SCENARIOS } from "../game/content.js";
import { buySuit, bribeMarv, buyCoffee, buyDecor, coffeeRelief, coffeeCost, canBuyCoffee, payBuyIn, objectiveInfo, hazardPerHour,
         rivalSabotage, rivalTruce, rivalAlly, rivalMoveReady, rivalOdds, displayPct,
         firmCondition, promotionFirmRequirement, exceptionalReviewInfo, finalWarningInfo, canPitchTurnaround, pitchTurnaround,
         playerProgressionInfo, playerFraudRiskInfo, spendSkillPoint } from "../game/engine.js";

const pp=v=>(v>0?"+":"")+Math.round(v*100)+"pp";

export default function StatsPanel(){
  const S=useGame();
  const bars=[["REPUTATION",S.rep,"#38b764"],["BOLDNESS",S.bold,"#b13e53"],["INFLUENCE",S.inf,"#ffcd75"],["FIRM",S.firm,"#4d73e8"],["FATIGUE",S.fatigue,"#b06ad9"]];
  const obj=objectiveInfo();
  const firm=firmCondition(), nextFirm=promotionFirmRequirement(), exceptional=exceptionalReviewInfo(), warning=finalWarningInfo();
  const training=playerProgressionInfo();
  const fraud=playerFraudRiskInfo();
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
          if(n==="INFLUENCE"&&S.rank<4) extra=" (next rank: "+RANK_REQ[S.rank]+" INF"+(nextFirm?", "+nextFirm+" FIRM":"")+(S.rank===2?" + buy-in":"")+
            (S.rank===3?" · Friday or Exceptional Review":" · decided after Friday review")+")";
          if(n==="FIRM") extra=(S.endlessWon||S.rank===4)?" (collapse < "+FIRM_COLLAPSE+")":S.mode==="standard"?" ("+firm.label+")":" (tracked; STANDARD rules off)";
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
      {fraud && (
        <section className="fraud-risk" aria-labelledby="fraud-risk-heading">
          <h2 id="fraud-risk-heading" style={{marginTop:10}}>THE SECRET</h2>
          <div className="statrow">
            <div className="lbl">
              <span>SUSPICION · {S.event?.fraudKind==="slip"?"SLIP LIVE":fraud.label}</span>
              <span>{fraud.suspicion}/{fraud.max}</span>
            </div>
            <div
              className="bar"
              role="progressbar"
              aria-label="Identity suspicion"
              aria-valuemin={0}
              aria-valuemax={fraud.max}
              aria-valuenow={fraud.suspicion}
              aria-valuetext={`${fraud.label}, ${fraud.suspicion} of ${fraud.max}`}
            >
              <div className="fill" style={{width:(fraud.suspicion/fraud.max*100)+"%",background:"var(--red)"}}/>
            </div>
          </div>
          <div className="kv" style={{color:fraud.pendingDay?"var(--red)":"var(--grey)"}}>
            {fraud.pendingDay
              ? (fraud.pendingKind==="slip"?"FATIGUE SLIP":"FOLLOW-UP")+" DUE DAY "+fraud.pendingDay
              : S.event?.fraudKind
                ? (S.event.fraudKind==="slip"?"FATIGUE SLIP":"IDENTITY INQUIRY")+
                  (fraud.morningPhase==="resume"?" — MORNING PAUSED UNTIL YOUR ANSWER":" — CHOOSE YOUR ANSWER")
                : fraud.checkedToday
                  ? "TODAY'S SLIP CHECK SPENT"
                  : fraud.slipChance>0
                    ? fraud.slipChancePct+"% END-OF-DAY SLIP CHECK · PEAK "+Math.max(fraud.dailyPeak,S.fatigue)+" FATIGUE"
                    : "DORMANT · SLIP CHECK BEGINS AT 80 FATIGUE"}
          </div>
          <div className="tagline">One end-of-day check uses the highest fatigue reached while working. A random slip cannot expose you; failed cover-ups raise suspicion and schedule an identity inquiry. Slips: {fraud.slipCount} · contained: {fraud.contained}.</div>
        </section>
      )}
      {training && (
        <section className="training" aria-labelledby="training-heading">
          <h2 id="training-heading" style={{marginTop:10}}>TRAINING</h2>
          <div className="statrow">
            <div className="lbl">
              <span>LEVEL {training.level}</span>
              <span>{training.atCap?training.xp+" XP · MAX":training.xp+" / "+training.nextLevelXp+" XP"}</span>
            </div>
            <div
              className="bar"
              role="progressbar"
              aria-label="Character experience"
              aria-valuemin={training.atCap?0:training.levelFloorXp}
              aria-valuemax={training.atCap?training.xp:training.nextLevelXp}
              aria-valuenow={training.xp}
              aria-valuetext={training.atCap?"Maximum level":training.xpToNext+" XP to level "+training.nextLevel}
            >
              <div className="fill" style={{width:(training.progress*100)+"%",background:"var(--gold)"}}/>
            </div>
          </div>
          <div className="kv">
            {training.atCap?"MAX LEVEL":training.xpToNext+" XP TO LEVEL "+training.nextLevel}
            {" · SKILL POINTS: "+training.skillPoints}
          </div>
          {training.skillPoints>0 && (
            <div className="skill-ready" role="status" aria-live="polite" aria-atomic="true">
              {training.skillPoints} SKILL POINT{training.skillPoints===1?"":"S"} READY — CHOOSE AN UPGRADE.
            </div>
          )}
          {training.skills.map(skill=>(
            <div className="npcrow skill-row" key={skill.id}>
              <div className="lblrow">
                <span>{skill.name}</span>
                <span>{skill.rank>=5?"MAX 5/5":"RANK "+skill.rank+"/5"}{skill.innate?" · "+skill.innate+" INNATE":""}</span>
              </div>
              <div className="tagline">{skill.currentText}</div>
              {skill.canUpgrade && (
                <button
                  className="btn small spend skill-upgrade"
                  type="button"
                  aria-label={`Spend one skill point on ${skill.name}, rank ${skill.rank} to ${skill.rank+1}`}
                  onClick={()=>spendSkillPoint(skill.id)}
                >
                  SPEND 1 POINT · {skill.name} {skill.rank} → {skill.rank+1}
                  <span className="chance">{skill.nextText}</span>
                </button>
              )}
            </div>
          ))}
        </section>
      )}
      {warning && (
        <div className="npcrow" style={{marginTop:8}}>
          <div className="lblrow">
            <span style={{color:warning.used?"var(--grey)":"var(--gold)"}}>FINAL WARNING</span>
            <span>{warning.used?"SPENT":"UNUSED"}</span>
          </div>
          <div className="tagline">Once per run: a fatal aggressive loss is stayed when the play began at BOLD {warning.bold}+ with {warning.wins}+ landed bluffs and a winning bluff record. Restores REP to {warning.rep}; costs {warning.boldCost} BOLD.</div>
        </div>
      )}
      {exceptional && (
        <div className="npcrow" style={{marginTop:8}}>
          <div className="lblrow"><span style={{color:exceptional.ready?"var(--green)":"var(--gold)"}}>EXCEPTIONAL REVIEW</span><span>{exceptional.momentum}/{exceptional.threshold}</span></div>
          <div className="tagline">Influence earned above 100 becomes partner momentum. Decision: next eligible morning{S.day<exceptional.earliest?" from day "+exceptional.earliest:""}; requires REP {exceptional.minRep} and the normal FIRM gate.</div>
        </div>
      )}
      {S.mode==="standard" && (
        <div className="npcrow" style={{marginTop:8}}>
          <div className="lblrow"><span style={{color:firm.id==="critical"?"var(--red)":firm.id==="thriving"?"var(--green)":"var(--gold)"}}>FIRM CONTROL · {firm.label}</span><span>{S.firm}/100</span></div>
          <div className="tagline">Prospect chance {pp(firm.prospect)} · walk risk after a case loss {pp(firm.walk)}{nextFirm?" · promotion needs "+nextFirm:""}</div>
          {S.firm<FIRM_STABLE && (
            <button className="btn small spend" disabled={!canPitchTurnaround()} onClick={pitchTurnaround}>
              PITCH TURNAROUND PLAN · {FIRM_PLAN_HOURS}h
              <span className="chance">
                {S.day<(S.firmPlanDay||0)
                  ? "COOLDOWN · ready day "+S.firmPlanDay
                  : S.hours<FIRM_PLAN_HOURS
                    ? "NEEDS "+FIRM_PLAN_HOURS+"h REMAINING"
                    : "+"+FIRM_PLAN_GAIN+" FIRM · +"+FIRM_PLAN_FATIGUE+" FATIGUE · once per "+FIRM_PLAN_COOLDOWN+" days"}
              </span>
            </button>
          )}
        </div>
      )}
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
        <button className="btn small spend safe" disabled={S.money<BUYIN_COST||S.firm<promotionFirmRequirement(2)} onClick={payBuyIn}>
          PARTNERSHIP BUY-IN · ${BUYIN_COST}<span className="chance">
            {S.firm<promotionFirmRequirement(2)?"BLOCKED · FIRM "+S.firm+"/"+promotionFirmRequirement(2):"Wire it and the Senior Partnership is yours."}
          </span>
        </button>
      )}
      <button className="btn small spend" disabled={S.money<S.suitCost} onClick={buySuit}>
        TAILORED SUIT · ${S.suitCost}<span className="chance">+8 REP. Dress for the rank you want.</span>
      </button>
      <button className="btn small spend" disabled={S.money<PRICES.marv} onClick={bribeMarv}>
        BRIBE MARV · ${PRICES.marv}<span className="chance">The copy room knows who everyone really is.</span>
      </button>
      <button className="btn small spend" disabled={!canBuyCoffee()} onClick={buyCoffee}>
        DOUBLE ESPRESSO · ${coffeeCost()}<span className="chance">
          {coffeeRelief()>0
            ? "−"+coffeeRelief()+" FATIGUE"+(S.coffeeToday>0?" (cup "+(S.coffeeToday+1)+"/"+COFFEE_LIMIT+" — last one today)":" (cup 1/"+COFFEE_LIMIT+")")
            : "DAILY LIMIT REACHED · the machine has stopped enabling you"}
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
        {S.logEntries.slice(0,80).map((e,i)=>( /* cap: endless runs were re-rendering thousands of rows */
          <div key={S.logEntries.length-i} className={e.cls}>{"> "+e.txt}</div>
        ))}
      </div>
    </div>
  );
}
