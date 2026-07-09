// Crisis event overlay — blocks the day until the player picks a side.
import { displayChance, resolveCrisis } from "../game/engine.js";

export default function EventOverlay({ev}){
  return (
    <div className="overlay">
      <div className="box panel">
        <h2>{ev.title}</h2>
        <div style={{fontSize:9,marginBottom:12}}>{ev.body}</div>
        {ev.crisisMod && (
          <div className="kv" style={{color:ev.crisisMod.v<0?"var(--red)":"var(--green)",marginBottom:12}}>
            {ev.crisisMod.txt}
          </div>
        )}
        <div className="opts">
          {ev.opts.map((o,i)=>(
            <button key={i} className={"btn"+(o.safe?" safe":(o.style==="aggressive"?" bold":""))}
                    onClick={()=>resolveCrisis(o)}>
              {(i+1)+". "+o.text}{displayChance(o,ev)&&<span className="chance">{displayChance(o,ev)} success</span>}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
