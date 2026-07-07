// Global settings (day length, volumes, screen shake). Persisted outside the run.
import { settings } from "../game/settings.js";
import { closeSettings, updateSetting } from "../game/engine.js";

const DAYS=[60,75,90];
const VOL=[0,0.5,1];
const volLabel=v=>v<=0?"OFF":v<1?"LOW":"FULL";

export default function SettingsOverlay(){
  return (
    <div className="overlay">
      <div className="box panel">
        <h2>SETTINGS</h2>
        <div className="setrow">
          <div className="kv">DAY LENGTH</div>
          <div className="diffrow">
            {DAYS.map(d=>(
              <button key={d} className={"btn small"+(settings.dayLen===d?" on":"")} onClick={()=>updateSetting("dayLen",d)}>{d}s</button>
            ))}
          </div>
          <div className="kv" style={{opacity:.7}}>Applies from the next day / next run.</div>
        </div>
        <div className="setrow">
          <div className="kv">SFX VOLUME</div>
          <div className="diffrow">
            {VOL.map(v=>(
              <button key={v} className={"btn small"+(settings.sfx===v?" on":"")} onClick={()=>updateSetting("sfx",v)}>{volLabel(v)}</button>
            ))}
          </div>
        </div>
        <div className="setrow">
          <div className="kv">MUSIC VOLUME</div>
          <div className="diffrow">
            {VOL.map(v=>(
              <button key={v} className={"btn small"+(settings.bgm===v?" on":"")} onClick={()=>updateSetting("bgm",v)}>{volLabel(v)}</button>
            ))}
          </div>
        </div>
        <div className="setrow">
          <div className="kv">SCREEN SHAKE (on failures)</div>
          <div className="diffrow">
            <button className={"btn small"+(settings.shake?" on":"")} onClick={()=>updateSetting("shake",true)}>ON</button>
            <button className={"btn small"+(!settings.shake?" on":"")} onClick={()=>updateSetting("shake",false)}>OFF</button>
          </div>
        </div>
        <div className="opts" style={{marginTop:12}}><button className="btn" onClick={closeSettings}>BACK TO BILLING</button></div>
      </div>
    </div>
  );
}
