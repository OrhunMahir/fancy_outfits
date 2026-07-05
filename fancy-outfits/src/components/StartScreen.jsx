import { SCENARIOS } from "../game/content.js";
import { startGame } from "../game/engine.js";
import { rnd } from "../game/utils.js";

export default function StartScreen(){
  return (
    <div className="overlay">
      <div className="box panel">
        <h2 style={{fontSize:16}}>FANCY OUTFITS</h2>
        <div className="subtitle">A pixel legal drama. Read the file. Pick your line.<br/>Don't get HENDERED.</div>
        <div className="opts">
          {Object.entries(SCENARIOS).map(([k,v])=>(
            <button key={k} className="btn" onClick={()=>startGame(k)}>
              {v.label}<span className="chance">{v.desc}</span>
            </button>
          ))}
          <button className="btn bold" onClick={()=>startGame(rnd(Object.keys(SCENARIOS)))}>RANDOM SCENARIO</button>
        </div>
      </div>
    </div>
  );
}
