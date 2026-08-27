import { useState } from "react";
import { closeBench, inviteToGolf, canGolf, offerBribe, judgeRelation, judgeRelationLabel,
         judgeTrait, judgeBribeOdds, judgeRelBurned, knownJudges,
         GOLF_COST, GOLF_HOURS } from "../game/engine.js";
import { BRIBE_MIN, BRIBE_MAX } from "../game/judges.js";

/* The relationship is shown as a band, never a number: it is an investment the
   player is asked to make, so it has to be legible — but a readout would turn
   golf into a slider to optimise instead of a judgement to make. */
const BAND_CLASS={HOSTILE:"bad",COLD:"bad",CORDIAL:"",WARM:"good",FRIENDLY:"good"};

function JudgeRow({judge}){
  const [amount,setAmount]=useState("");
  const [armed,setArmed]=useState(false);
  const band=judgeRelationLabel(judge);
  const trait=judgeTrait(judge);
  const burned=judgeRelBurned(judge);
  const money=Math.round(Number(amount)||0);
  const legal=money>=BRIBE_MIN&&money<=BRIBE_MAX;
  const odds=legal?judgeBribeOdds(judge,money):0;
  return (
    <div className="rosterrow">
      <div className="lblrow">
        <span>{judge.name}</span>
        <span className={BAND_CLASS[band]||""}>{band}</span>
      </div>
      <div className="tagline">
        {trait?trait.label+" — "+trait.note:"No reputation to speak of."}
        {" · TEMPER "+judge.temper+" · BOOK "+judge.book}
      </div>
      {burned && <div className="tagline bad">You put an envelope in front of this bench once. They have not forgotten.</div>}
      <div className="delg">
        <button className="btn small" type="button" disabled={!canGolf(judge)}
                onClick={()=>inviteToGolf(judge)}>
          INVITE TO GOLF (${GOLF_COST} · {GOLF_HOURS}h)
        </button>
      </div>
      <div className="bench-bribe">
        <label className="kv" htmlFor={"bribe-"+judge.id}>PRIVATE ARRANGEMENT — you name the figure:</label>
        <div className="bench-bribe-row">
          <input id={"bribe-"+judge.id} className="bench-amount" type="number" inputMode="numeric"
                 min={BRIBE_MIN} max={BRIBE_MAX} step={500} value={amount} placeholder={String(BRIBE_MIN)}
                 onChange={e=>{ setAmount(e.target.value); setArmed(false); }} />
          <button className={"btn small"+(armed?" bold":" bribe")} type="button" disabled={!legal}
                  onClick={()=>{ if(armed){ offerBribe(judge,money); setAmount(""); setArmed(false); } else setArmed(true); }}>
            {armed?"SURE? THIS CANNOT BE TAKEN BACK.":"OFFER"}
          </button>
        </div>
        <div className="kv bench-odds">
          {legal
            ? (odds>0
                ? "They might take it. They might not, and a refusal costs far more than the money."
                : "This bench cannot be bought. Not at this number, not at any number.")
            : "Between $"+BRIBE_MIN+" and $"+BRIBE_MAX+"."}
        </div>
      </div>
    </div>
  );
}

export default function BenchOverlay(){
  const judges=knownJudges();
  return (
    <div className="overlay">
      <div className="box panel">
        <h2>THE BENCH</h2>
        <div className="kv">
          Judges you have drawn this run. A good relationship tilts a close call — it never decides one.
        </div>
        {!judges.length && <div className="kv">You have not been in front of anyone yet.</div>}
        {judges.map(j=><JudgeRow key={j.id} judge={j} />)}
        <div className="opts" style={{marginTop:12}}>
          <button className="btn" onClick={closeBench}>BACK TO BILLING</button>
        </div>
      </div>
    </div>
  );
}
