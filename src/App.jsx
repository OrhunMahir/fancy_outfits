// Top-level layout: start screen before a run, then topbar + office scene +
// the three panels. Overlays render conditionally from state (no .hidden CSS).
import { useEffect, useRef, useState } from "react";
import { useGame } from "./game/useGame.js";
import { S } from "./game/state.js";
import { choose, deferCase, resolveCrisis, dismissSummary, advanceIntro, closeIntro,
         closeSettings, closeInfo, closeRoster, closeArchive, dismissSaveError,
         refreshRoomTone } from "./game/engine.js";
import StartScreen from "./components/StartScreen.jsx";
import IntroOverlay from "./components/IntroOverlay.jsx";
import TrialOverlay from "./components/TrialOverlay.jsx";
import BenchOverlay from "./components/BenchOverlay.jsx";
import DevPanel from "./components/DevPanel.jsx";
import Topbar from "./components/Topbar.jsx";
import OfficeScene from "./components/OfficeScene.jsx";
import Inbox from "./components/Inbox.jsx";
import CasePane from "./components/CasePane.jsx";
import StatsPanel from "./components/StatsPanel.jsx";
import InfoOverlay from "./components/InfoOverlay.jsx";
import SettingsOverlay from "./components/SettingsOverlay.jsx";
import RosterOverlay from "./components/RosterOverlay.jsx";
import ArchiveOverlay from "./components/ArchiveOverlay.jsx";
import EventOverlay from "./components/EventOverlay.jsx";
import SummaryOverlay from "./components/SummaryOverlay.jsx";
import ActionMinigameOverlay from "./components/ActionMinigameOverlay.jsx";

/* keyboard shortcuts: 1-4 pick an option, Space/Esc defers or closes.
   Reads the live module S (not a stale render snapshot) and only calls
   engine functions — same contract as a click. */
function handleKey(e){
  if(!S||e.repeat) return;
  const k=e.key, i="1234".indexOf(k);
  if(S.introStep!=null){ // the walkthrough owns input until it is done
    if(k===" "||k==="Enter"){ e.preventDefault(); advanceIntro(); }
    else if(k==="Escape") closeIntro();
    return;
  }
  if(S.actionChallenge) return; // the minigame owns focus and keyboard input
  if(S.summary){ if(k===" "||k==="Enter"){ e.preventDefault(); dismissSummary(); } return; }
  if(S.event){ if(i>=0&&S.event.opts[i]) resolveCrisis(S.event.opts[i]); return; }
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
  /* The ambience follows the situation: a hearing hushes the room, an empty
     building after seven gets louder air handling, exhaustion dulls everything.
     Driven from here because it is presentation reacting to state — and it is
     idempotent, so re-running it on every render costs nothing. */
  useEffect(refreshRoomTone);
  const [devOpen,setDevOpen]=useState(false);
  useEffect(()=>{
    if(!import.meta.env.DEV) return;
    // F9 works on every keyboard layout; backtick is a dead key on some.
    const onKey=e=>{ if(e.key==="F9"||e.key==="`"){ e.preventDefault(); setDevOpen(v=>!v); } };
    window.addEventListener("keydown",onKey);
    return ()=>window.removeEventListener("keydown",onKey);
  },[]);
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
      {S.saveError && <div className="save-warning" role="alert">
        <span><strong>AUTO-SAVE FAILED</strong> — {S.saveError.message}</span>
        <button className="btn small" onClick={dismissSaveError}>DISMISS</button>
      </div>}
      <OfficeScene />
      <div id="main">
        <Inbox />
        <CasePane />
        <StatsPanel />
      </div>
      {S.settingsOpen && <SettingsOverlay />}
      {S.rosterOpen && <RosterOverlay />}
      {S.archiveOpen && <ArchiveOverlay />}
      {S.infoOpen && <InfoOverlay />}
      {S.event && <EventOverlay ev={S.event} />}
      {S.actionChallenge && <ActionMinigameOverlay />}
      {(S.trial||S.trialResult) && <TrialOverlay trial={S.trial} result={S.trialResult} />}
      {S.benchOpen && <BenchOverlay />}
      {S.summary && <SummaryOverlay sum={S.summary} />}
      {S.introStep!=null && <IntroOverlay />}
      {import.meta.env.DEV && !devOpen && (
        <button className="dev-open" type="button" onClick={()=>setDevOpen(true)}>DEV</button>
      )}
      {import.meta.env.DEV && devOpen && <DevPanel onClose={()=>setDevOpen(false)} />}
      {S.flash && <div className="flash" key={S.flash.id}>{S.flash.txt}</div>}
    </div>
  );
}
