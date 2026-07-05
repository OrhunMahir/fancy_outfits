// Crisis event overlay — blocks the day until the player picks a side.
import { chance, resolveCrisis } from "../game/engine.js";

export default function EventOverlay({ev}){
  return (
    <div className="overlay">
      <div className="box panel">
        <h2>{ev.title}</h2>
        <div style={{fontSize:9,marginBottom:12}}>{ev.body}</div>
        <div className="opts">
          {ev.opts.map((o,i)=>(
            <button key={i} className={"btn"+(o.safe?" safe":(o.style==="aggressive"?" bold":""))}
                    onClick={()=>resolveCrisis(o)}>
              {o.text}<span className="chance">{chance(o,null)}% success</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
