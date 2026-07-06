// NPCs & relationships (GDD §5). Four floor colleagues; each run shuffles one
// of each trait onto them, and traits stay HIDDEN until a delegation or a
// crisis reveals them. Relationship: -100..100, moved by delegation outcomes.
import { clamp, rnd } from "./utils.js";

const ROSTER=[
  {id:"dana",    name:"Dana Paulsen",     role:"Executive Assistant"},
  {id:"raquel",  name:"Raquel Lane",      role:"Paralegal"},
  {id:"harold",  name:"Harold Gustavson", role:"Associate"},
  {id:"katrina", name:"Katrina Bergman",  role:"Associate"},
];
const TRAITS=["Reliable","Brave","Lazy","Traitor"];
const TRAIT_MOD={Reliable:25, Brave:10, Lazy:-20, Traitor:-5};

export function buildNpcs(){
  const t=[...TRAITS].sort(()=>Math.random()-.5);
  return ROSTER.map((n,i)=>({...n, trait:t[i], rel:rnd([-10,-5,0,5,10]), known:false}));
}

/* Delegation success odds: goodwill + who they really are. */
export const delegationChance=n=>clamp(60+Math.round(n.rel/5)+TRAIT_MOD[n.trait],10,95);

export const relNpc=(n,d)=>{ n.rel=clamp(n.rel+d,-100,100); };

export const DELEGATE_WIN_TXT=[
  "closed it before lunch. Didn't even want credit.",
  "handled it. Quietly, competently, terrifyingly.",
  "sorted it out and left the summary on your chair.",
];
export const DELEGATE_FAIL_TXT=[
  "botched the filing. Your name was on the cover page.",
  "missed the counterparty's trick entirely. It cost you.",
  "sent the wrong draft. The client noticed. Loudly.",
];
