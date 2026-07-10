import { useGame } from "../game/useGame.js";
import { RANKS, DAY_HOURS, WEEK_LEN } from "../game/constants.js";
import { settings } from "../game/settings.js";
import { endDay, openInfo, openSettings, openRoster, openArchive, updateSetting, wallTime } from "../game/engine.js";
import { SFX } from "../game/sound.js";

export default function Topbar(){
  const S=useGame();
  const dayLen=settings.dayLen||DAY_HOURS;
  const late=S.otHours>0; // past quitting time
  return (
    <div id="topbar">
      <span className="logo">PARSON{" "}HENDERSON{" "}LLP</span>
      <span>{RANKS[S.rank]}</span>
      <div className="clockbox">
        <span>DAY {S.day}{S.day%WEEK_LEN===0?" · FRIDAY":" · FRI IN "+(WEEK_LEN-S.day%WEEK_LEN)}</span>
        <span style={{color:late||S.hours<=1?"var(--red)":(S.hours<=2?"#e8a33d":"var(--gold)")}}>
          {wallTime()}{late?" · OT":""}
        </span>
        <div className="timebar">
          <div className="fill" style={{width:Math.max(0,Math.min(100,S.hours/dayLen*100))+"%",
            background:S.hours<=1?"var(--red)":(S.hours<=2?"#e8a33d":"var(--gold)")}}/>
        </div>
        <span style={{fontSize:8,color:"var(--grey)"}}>{S.hours}h left</span>
        <button className="btn small" onClick={()=>updateSetting("sfx",settings.sfx>0?0:1)}>SFX: {settings.sfx>0?"ON":"OFF"}</button>
        <button className="btn small" onClick={()=>updateSetting("bgm",settings.bgm>0?0:1)}>BGM: {settings.bgm>0?"ON":"OFF"}</button>
        <button className="btn small" onClick={openInfo}>i</button>
        <button className="btn small" onClick={openArchive}>LOG</button>
        {S.roster && <button className="btn small" style={{color:"var(--gold)"}} onClick={openRoster}>FIRM</button>}
        <button className="btn small" onClick={openSettings}>SET</button>
        <button className="btn small" onClick={()=>{SFX.click(); endDay();}}>GO HOME</button>
      </div>
    </div>
  );
}
