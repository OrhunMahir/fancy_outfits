import { useGame } from "../game/useGame.js";
import { RANKS } from "../game/constants.js";
import { endDay, openInfo, pauseGame, toggleSfx } from "../game/engine.js";
import { SFX, isMuted } from "../game/sound.js";

const fmt=s=>Math.floor(s/60)+":"+String(s%60).padStart(2,"0");

export default function Topbar(){
  const S=useGame();
  return (
    <div id="topbar">
      <span className="logo">PARSON{" "}HENDERSON{" "}LLP</span>
      <span>{RANKS[S.rank]}</span>
      <div className="clockbox">
        <span>DAY {S.day}</span>
        <span style={{color:"var(--gold)"}}>{fmt(S.secs)}</span>
        <button className="btn small" onClick={toggleSfx}>SFX: {isMuted()?"OFF":"ON"}</button>
        <button className="btn small" onClick={openInfo}>i</button>
        <button className="btn small" onClick={pauseGame}>PAUSE</button>
        <button className="btn small" onClick={()=>{SFX.click(); endDay();}}>END DAY</button>
      </div>
    </div>
  );
}
