import { useState } from "react";
import { SCENARIOS } from "../game/content.js";
import { RANKS } from "../game/constants.js";
import { startGame, loadGame, peekSave, getStats } from "../game/engine.js";
import { rnd } from "../game/utils.js";

const DIFFS=[
  ["easy","EASY","odds shown as a tight range"],
  ["medium","MEDIUM","the range gets wide"],
  ["hard","HARD","the range is more of a rumor"],
  ["realistic","REALISTIC","no numbers. Read the file. Feel the odds."],
];

export default function StartScreen(){
  const save=peekSave(), st=getStats();
  const [diff,setDiff]=useState("easy");
  return (
    <div className="overlay">
      <div className="box panel">
        <h2 style={{fontSize:16}}>FANCY OUTFITS</h2>
        <div className="subtitle">A pixel legal drama. Read the file. Pick your line.<br/>Don't get HENDERED.</div>
        <div className="kv">DIFFICULTY — blurs what you KNOW, never the dice:</div>
        <div className="diffrow">
          {DIFFS.map(([k,label])=>(
            <button key={k} className={"btn small"+(diff===k?" on":"")} onClick={()=>setDiff(k)}>{label}</button>
          ))}
        </div>
        <div className="kv" style={{marginBottom:10}}>{DIFFS.find(d=>d[0]===diff)[2]}</div>
        <div className="opts">
          {save && (
            <button className="btn safe" onClick={loadGame}>
              CONTINUE<span className="chance">Day {save.day} · {RANKS[save.rank]} · {SCENARIOS[save.scenario].label} · {(save.difficulty||"easy").toUpperCase()}</span>
            </button>
          )}
          {Object.entries(SCENARIOS).map(([k,v])=>(
            <button key={k} className="btn" onClick={()=>startGame(k,diff)}>
              {v.label}<span className="chance">{v.desc}</span>
            </button>
          ))}
          <button className="btn bold" onClick={()=>startGame(rnd(Object.keys(SCENARIOS)),diff)}>RANDOM SCENARIO</button>
        </div>
        {st && (
          <div className="kv" style={{marginTop:12}}>
            FIRM RECORD: {st.runs} run(s) · {st.wins} made name partner · longest career: day {st.bestDay} · best rank: {RANKS[st.bestRank]}
          </div>
        )}
      </div>
    </div>
  );
}
