// First-run walkthrough. Pure data + a persisted flag, kept OUT of the run
// save: it is a property of the player, not of a career. Four cards, because a
// fifth is where people start clicking through without reading.
import * as store from "./store.js";
const INTRO_KEY="fo_intro_v1";

export const INTRO_STEPS=[
  {title:"THE DESK",
   body:"Files land in your INBOX. Open one and actually read it — the argument that wins is buried in the text, "+
        "not in the numbers. Everything else in this building is negotiable. The file is not."},
  {title:"THE CLOCK",
   body:"You get one workday, 09:00 to 17:00. Reading is free; WORKING costs hours, and careful work costs the most. "+
        "Run out and you can stay late — the night bills you in FATIGUE, and tired lawyers lose winnable files."},
  {title:"THE CHOICE",
   body:"Every file offers a quiet way out and a risky one. The quiet one never fails — but it drains BOLDNESS, and "+
        "leaning on it week after week reads as coasting. The risky one pays in INFLUENCE and burns REPUTATION when "+
        "it misses. Cowardice is a slow death. Recklessness is a fast one."},
  {title:"THE LADDER",
   body:"Miss a deadline and it costs you. Every fifth day the partners review your week. INFLUENCE is the only "+
        "currency that promotes you, and NAME PARTNER is how this ends well. Press the i button any time for the rest."},
];

export function introSeen(){
  try{ return store.getItem(INTRO_KEY)==="1"; }
  catch(e){ return true; } // storage blocked: never trap the player behind a modal
}

export function markIntroSeen(){
  try{ store.setItem(INTRO_KEY,"1"); }
  catch(e){ /* a walkthrough that cannot be remembered is still worth showing once */ }
}

export function resetIntro(){
  try{ store.removeItem(INTRO_KEY); }
  catch(e){}
}
