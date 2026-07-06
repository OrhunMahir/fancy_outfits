// End-of-day / game-over / win screen. `sum.cb` runs when the button is
// pressed (advances the day, or reloads for a new game).
import { dismissSummary } from "../game/engine.js";

export default function SummaryOverlay({sum}){
  return (
    <div className="overlay">
      <div className="box panel">
        <h2>{sum.title}</h2>
        <div style={{fontSize:9,marginBottom:12}}>
          {sum.lines.map((l,i)=><div key={i}>{l||" "}</div>)}
        </div>
        <div className="opts"><button className="btn" onClick={dismissSummary}>{sum.btnTxt}</button></div>
      </div>
    </div>
  );
}
