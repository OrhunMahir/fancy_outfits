import { SCENARIOS } from "../game/content.js";
import { RANKS } from "../game/constants.js";
import { startGame, loadGame, peekSave, getStats } from "../game/engine.js";
import { rnd } from "../game/utils.js";

export default function StartScreen(){
  const save=peekSave(), st=getStats();
  return (
    <div className="overlay">
      <div className="box panel">
        <h2 style={{fontSize:16}}>FANCY OUTFITS</h2>
        <div className="subtitle">A pixel legal drama. Read the file. Pick your line.<br/>Don't get HENDERED.</div>
        <div className="opts">
          {save && (
            <button className="btn safe" onClick={loadGame}>
              CONTINUE<span className="chance">Day {save.day} · {RANKS[save.rank]} · {SCENARIOS[save.scenario].label}</span>
            </button>
          )}
          {Object.entries(SCENARIOS).map(([k,v])=>(
            <button key={k} className="btn" onClick={()=>startGame(k)}>
              {v.label}<span className="chance">{v.desc}</span>
            </button>
          ))}
          <button className="btn bold" onClick={()=>startGame(rnd(Object.keys(SCENARIOS)))}>RANDOM SCENARIO</button>
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
