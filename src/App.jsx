// Top-level layout: start screen before a run, then topbar + office scene +
// the three panels. Overlays render conditionally from state (no .hidden CSS).
import { useEffect, useRef } from "react";
import { useGame } from "./game/useGame.js";
import StartScreen from "./components/StartScreen.jsx";
import Topbar from "./components/Topbar.jsx";
import OfficeScene from "./components/OfficeScene.jsx";
import Inbox from "./components/Inbox.jsx";
import CasePane from "./components/CasePane.jsx";
import StatsPanel from "./components/StatsPanel.jsx";
import InfoOverlay from "./components/InfoOverlay.jsx";
import PauseOverlay from "./components/PauseOverlay.jsx";
import SettingsOverlay from "./components/SettingsOverlay.jsx";
import EventOverlay from "./components/EventOverlay.jsx";
import SummaryOverlay from "./components/SummaryOverlay.jsx";

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
  if(!S) return <StartScreen />;
  return (
    <div ref={rootRef}>
      <Topbar />
      <OfficeScene />
      <div id="main">
        <Inbox />
        <CasePane />
        <StatsPanel />
      </div>
      {S.userPaused && <PauseOverlay />}
      {S.settingsOpen && <SettingsOverlay />}
      {S.infoOpen && <InfoOverlay />}
      {S.event && <EventOverlay ev={S.event} />}
      {S.summary && <SummaryOverlay sum={S.summary} />}
      {S.flash && <div className="flash" key={S.flash.id}>{S.flash.txt}</div>}
    </div>
  );
}
