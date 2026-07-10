import { useState } from "react";
import { SCENARIOS } from "../game/content.js";
import { RANKS } from "../game/constants.js";
import { startGame, loadGame, peekSave, getStats, getSlot, setSlot } from "../game/engine.js";
import { ACHIEVEMENTS, getUnlocked } from "../game/achievements.js";
import { rnd } from "../game/utils.js";

const DIFFS=[
  ["easy","EASY","odds shown as a tight range"],
  ["medium","MEDIUM","the range gets wide"],
  ["hard","HARD","the range is more of a rumor"],
  ["realistic","REALISTIC","no numbers. Read the file. Feel the odds."],
];
const MODES=[
  ["standard","STANDARD","auto-save. One career at a time."],
  ["ironman","IRONMAN","no save. Close the game, lose the career."],
  ["endless","ENDLESS","winning doesn't stop the inbox."],
  ["daily","DAILY","today's seed, same for everyone. Scenario picked by the date."],
];

export default function StartScreen(){
  const st=getStats(), ach=getUnlocked();
  const [diff,setDiff]=useState("easy");
  const [mode,setMode]=useState("standard");
  const [slot,setSlotState]=useState(getSlot());
  const pickSlot=n=>{ setSlot(n); setSlotState(n); };
  const save=peekSave(slot);
  const nAch=Object.keys(ach).length;
  return (
    <div className="overlay" style={{overflowY:"auto"}}>
      <div className="box panel" style={{margin:"auto"}}>
        <h2 style={{fontSize:16}}>FANCY OUTFITS</h2>
        <div className="subtitle">A pixel legal drama. Read the file. Pick your line.<br/>Don't get HENDERED.</div>
        <div className="kv">DIFFICULTY — blurs what you KNOW, never the dice:</div>
        <div className="diffrow">
          {DIFFS.map(([k,label])=>(
            <button key={k} className={"btn small"+(diff===k?" on":"")} onClick={()=>setDiff(k)}>{label}</button>
          ))}
        </div>
        <div className="kv" style={{marginBottom:8}}>{DIFFS.find(d=>d[0]===diff)[2]}</div>
        <div className="kv">MODE:</div>
        <div className="diffrow">
          {MODES.map(([k,label])=>(
            <button key={k} className={"btn small"+(mode===k?" on":"")} onClick={()=>setMode(k)}>{label}</button>
          ))}
        </div>
        <div className="kv" style={{marginBottom:8}}>{MODES.find(m=>m[0]===mode)[2]}</div>
        <div className="kv">SAVE SLOT — new runs write here:</div>
        <div className="diffrow">
          {[1,2,3].map(n=>{
            const sv=peekSave(n);
            return (
              <button key={n} className={"btn small"+(slot===n?" on":"")} onClick={()=>pickSlot(n)}>
                SLOT {n}{sv?" · DAY "+sv.day:" · empty"}
              </button>
            );
          })}
        </div>
        <div className="opts">
          {save && (
            <button className="btn safe" onClick={()=>loadGame(slot)}>
              CONTINUE SLOT {slot}<span className="chance">Day {save.day} · {RANKS[save.rank]} · {SCENARIOS[save.scenario].label} · {(save.difficulty||"easy").toUpperCase()}{save.mode&&save.mode!=="standard"?" · "+save.mode.toUpperCase():""}</span>
            </button>
          )}
          {mode==="daily" ? (
            <button className="btn bold" onClick={()=>startGame(null,diff,"daily")}>
              START TODAY'S DAILY<span className="chance">Scenario and cases are decided by the date. Difficulty locks to MEDIUM.</span>
            </button>
          ) : (<>
            {Object.entries(SCENARIOS).map(([k,v])=>(
              <button key={k} className="btn" onClick={()=>startGame(k,diff,mode)}>
                {v.label}<span className="chance">{v.desc}</span>
              </button>
            ))}
            <button className="btn bold" onClick={()=>startGame(rnd(Object.keys(SCENARIOS)),diff,mode)}>RANDOM SCENARIO</button>
          </>)}
        </div>
        {st && (
          <div className="kv" style={{marginTop:12}}>
            FIRM RECORD: {st.runs} run(s) · {st.wins} made name partner · longest career: day {st.bestDay} · best rank: {RANKS[st.bestRank]}
          </div>
        )}
        <div className="kv" style={{marginTop:10,color:"var(--gold)"}}>ACHIEVEMENTS ({nAch}/{ACHIEVEMENTS.length})</div>
        {ACHIEVEMENTS.map(a=>(
          <div key={a.id} className="kv" style={{opacity:ach[a.id]?1:.45}}>
            {ach[a.id]?"■ ":"□ "}<span style={{color:ach[a.id]?"var(--gold)":"inherit"}}>{a.name}</span> — {a.desc}
          </div>
        ))}
      </div>
    </div>
  );
}
