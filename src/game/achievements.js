// Achievements — persisted in localStorage across all runs (fo_ach_v1).
// Designed to map 1:1 onto Steamworks achievements later. Engine calls
// unlock(id); it returns true only on a FIRST unlock so the caller can log it.
export const ACHIEVEMENTS=[
  {id:"win",          name:"PARTNER MATERIAL",    desc:"Make Name Partner."},
  {id:"win_realistic",name:"NO NUMBERS, NO FEAR", desc:"Win on REALISTIC difficulty."},
  {id:"win_nosafe",   name:"ALLERGIC TO GREEN",   desc:"Win without a single safe play."},
  {id:"win_defector", name:"DOUBLE AGENT",        desc:"Win The Defector scenario."},
  {id:"win_ironman",  name:"NO SAFETY NET",       desc:"Win in IRONMAN mode."},
  {id:"win_bold",     name:"APEX BILLING",        desc:"Win with Boldness 65 or higher."},
  {id:"traitor5",     name:"TRUST EXERCISE",      desc:"Delegate 5 cases to the Traitor and live."},
  {id:"bribe3",       name:"GOLF BUDDY",          desc:"Have 3 bribes taken by judges in one run."},
  {id:"friday",       name:"EMPLOYEE OF THE WEEK",desc:"Earn partner praise on a Friday review."},
  {id:"day15",        name:"OFFICE FURNITURE",    desc:"Survive to day 15. You are part of the building now."},
];

const KEY="fo_ach_v1";
let unlocked=null;
function load(){ if(unlocked) return unlocked;
  try{ unlocked=JSON.parse(localStorage.getItem(KEY))||{}; }catch(e){ unlocked={}; }
  return unlocked; }
export const getUnlocked=()=>load();
export function unlock(id){
  const u=load();
  if(u[id]) return false;
  u[id]=true;
  try{ localStorage.setItem(KEY,JSON.stringify(u)); }catch(e){}
  return true;
}
