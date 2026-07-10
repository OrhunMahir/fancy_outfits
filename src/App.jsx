// Top-level layout: start screen before a run, then topbar + office scene +
// the three panels. Overlays render conditionally from state (no .hidden CSS).
import { useEffect, useRef } from "react";
import { useGame } from "./game/useGame.js";
import { S } from "./game/state.js";
import { choose, deferCase, resolveCrisis, dismissSummary, resumeGame,
         closeSettings, closeInfo, closeRoster, closeArchive } from "./game/engine.js";
import StartScreen from "./components/StartScreen.jsx";
import Topbar from "./components/Topbar.jsx";
import OfficeScene from "./components/OfficeScene.jsx";
import Inbox from "./components/Inbox.jsx";
import CasePane from "./components/CasePane.jsx";
import StatsPanel from "./components/StatsPanel.jsx";
import InfoOverlay from "./components/InfoOverlay.jsx";
import PauseOverlay from "./components/PauseOverlay.jsx";
import SettingsOverlay from "./components/SettingsOverlay.jsx";
import RosterOverlay from "./components/RosterOverlay.jsx";
import ArchiveOverlay from "./components/ArchiveOverlay.jsx";
import EventOverlay from "./components/EventOverlay.jsx";
import SummaryOverlay from "./components/SummaryOverlay.jsx";

/* keyboard shortcuts: 1-4 pick an option, Space/Esc defers or closes.
   Reads the live module S (not a stale render snapshot) and only calls
   engine functions — same contract as a click. */
function handleKey(e){
  if(!S||e.repeat) return;
  const k=e.key, i="1234".indexOf(k);
  if(S.summary){ if(k===" "||k==="Enter"){ e.preventDefault(); dismissSummary(); } return; }
  if(S.event){ if(i>=0&&S.event.opts[i]) resolveCrisis(S.event.opts[i]); return; }
  if(S.userPaused){ if(k===" "||k==="Escape"){ e.preventDefault(); resumeGame(); } return; }
  if(S.settingsOpen){ if(k==="Escape") closeSettings(); return; }
  if(S.rosterOpen){ if(k==="Escape") closeRoster(); return; }
  if(S.archiveOpen){ if(k==="Escape") closeArchive(); return; }
  if(S.infoOpen){ if(k==="Escape") closeInfo(); return; }
  if(S.openCase){
    const c=S.openCase;
    if(i>=0&&c.opts[i]){ const o=c.opts[i]; if(!(o.bribe&&S.money<o.bribe)) choose(c,o); }
    else if(k===" "||k==="Escape"){ e.preventDefault(); deferCase(); }
  }
}

export default function App(){
  const S=useGame();
  // screen shake: replay the CSS animation whenever shakeSeq bumps
  const rootRef=useRef(null);
  const shake=S&&S.shakeSeq;
  useEffect(()=>{
    if(!shake||!rootRef.current) return;
    const el=rootRef.current;
    el.classList.remove("shaking"); void el.offsetWidth; el.classList.add("shaking");
  },[shake]);
  useEffect(()=>{
    window.addEventListener("keydown",handleKey);
    return ()=>window.removeEventListener("keydown",handleKey);
  },[]);
  if(!S) return <StartScreen />;
  return (
    <div ref={rootRef} id="approot">
      <Topbar />
      <OfficeScene />
      <div id="main">
        <Inbox />
        <CasePane />
        <StatsPanel />
      </div>
      {S.userPaused && <PauseOverlay />}
      {S.settingsOpen && <SettingsOverlay />}
      {S.rosterOpen && <RosterOverlay />}
      {S.archiveOpen && <ArchiveOverlay />}
      {S.infoOpen && <InfoOverlay />}
      {S.event && <EventOverlay ev={S.event} />}
      {S.summary && <SummaryOverlay sum={S.summary} />}
      {S.flash && <div className="flash" key={S.flash.id}>{S.flash.txt}</div>}
    </div>
  );
}
