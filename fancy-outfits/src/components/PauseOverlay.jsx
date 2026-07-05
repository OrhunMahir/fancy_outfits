// Full-screen pause. It deliberately covers the desk — pausing to read case
// files for free would kill the timer tension (CLAUDE.md: core tension rules).
import { resumeGame } from "../game/engine.js";

export default function PauseOverlay(){
  return (
    <div className="overlay">
      <div className="box panel">
        <h2>PAUSED</h2>
        <div className="subtitle">The firm bills by the hour. The hour is frozen.<br/>Your inbox, sadly, is exactly where you left it.</div>
        <div className="opts"><button className="btn" onClick={resumeGame}>BACK TO WORK</button></div>
      </div>
    </div>
  );
}
