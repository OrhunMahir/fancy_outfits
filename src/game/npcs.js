// NPCs & relationships (GDD §5). Four floor colleagues; each run shuffles one
// of each trait onto them, and traits stay HIDDEN until a delegation or a
// crisis reveals them. Relationship: -100..100, moved by delegation outcomes.
import { clamp, rnd, rand } from "./utils.js";

const ROSTER=[
  {id:"dana",    name:"Dana Paulsen",     role:"Executive Assistant"},
  {id:"raquel",  name:"Raquel Lane",      role:"Paralegal"},
  {id:"harold",  name:"Harold Gustavson", role:"Associate"},
  {id:"katrina", name:"Katrina Bergman",  role:"Associate"},
];
const TRAITS=["Reliable","Brave","Lazy","Traitor"];
const TRAIT_MOD={Reliable:25, Brave:10, Lazy:-20, Traitor:-5};

export function buildNpcs(){
  const t=[...TRAITS].sort(()=>rand()-.5);
  return ROSTER.map((n,i)=>({...n, trait:t[i], rel:rnd([-10,-5,0,5,10]), known:false}));
}

/* Delegation success odds: goodwill + who they really are. */
export const delegationChance=n=>clamp(60+Math.round(n.rel/5)+TRAIT_MOD[n.trait],10,95);

export const relNpc=(n,d)=>{ n.rel=clamp(n.rel+d,-100,100); };

/* Reverse favors: sometimes THEY need YOU. Helping builds rel; declining costs it.
   relOk/relFail on options are handled by choose() (fx stays stats-only). */
const FAVOR_BODIES={
  dana:"Dana needs the partners' phones covered for two hours while she attends 'a funeral' (a sample sale). One of the phones is Hardwick's private line. It rings. It always rings.",
  raquel:"Raquel's night-school appellate brief is due at 9am and she's been assigned to three depositions at once. She slides it onto your desk without making eye contact. It's good. It needs to be perfect.",
  harold:"Harold double-booked two depositions and is currently hyperventilating into a redweld folder. One of the deponents is a screamer from Snidely Fitch. Harold would not survive the screamer.",
  katrina:"Katrina needs a witness prepped by lunch and refuses to say the word 'help'. She has instead said 'you will prep this witness', which is different, technically.",
};
export function buildFavor(n){
  return {id:"favor_"+n.id, favor:true, npc:n.id, tier:0, deadline:1,
    title:"FAVOR: "+n.name.split(" ")[0]+" needs a hand",
    body:FAVOR_BODIES[n.id],
    opts:[
      {text:"Do it properly. No credit needed.",base:100,safe:true,relOk:10,
        ok:{fx:{bold:-2,inf:1},txt:"Done quietly. They notice. Their kind always notices."}},
      {text:"Do it — and make sure the partners hear about it.",base:55,boldW:1,relOk:4,relFail:-6,
        ok:{fx:{inf:5},txt:"Helpful AND visible. A dangerous combination."},
        fail:{fx:{rep:-4},txt:"It reads like you hijacked their crisis for applause. Because you did."}},
      {text:"Decline. Billables come first.",base:100,safe:true,relOk:-8,
        ok:{fx:{inf:1},txt:"They smile politely. People here smile like invoices."}}]};
}

/* ---------- the Name Partner's roster (endless endgame) ----------
   Built once you own the wall. Floor NPCs and the rival join real employees;
   each has a win/loss history and a daily impact on FIRM health. Seniors
   (rank 3) can only be removed by partner vote. */
const ROSTER_FIRST=["Gordon","Petra","Ellis","Marisol","Chad","Ingrid","Tobias","Priya","Werner","Fallon"];
const ROSTER_LAST=["Mercer","Stubbs","Vane","Okonkwo","Billingsley","Krupp","Ostrander","Naidoo","Fitch-Adjacent","Plimpton"];
const ROLE_LABELS=["Junior Associate","Senior Associate","Junior Partner","Senior Partner"];

function history(rank){
  const won=5+Math.floor(rand()*20)+rank*6, lost=2+Math.floor(rand()*14);
  const impact=clamp(Math.round((won-lost)/6)+rnd([-2,-1,0,1]),-3,4);
  return {won,lost,impact};
}
export function buildRoster(npcs,nemesis){
  const R=[];
  npcs.forEach(n=>R.push({id:"npc_"+n.id,npcId:n.id,src:"npc",name:n.name,role:n.role,rank:1,senior:false,...history(1)}));
  if(nemesis) R.push({id:"nem",src:"nemesis",name:nemesis.name,role:ROLE_LABELS[nemesis.rank]+" · your rival",rank:nemesis.rank,senior:nemesis.rank>=3,...history(nemesis.rank)});
  R.push({id:"hardwick",src:"gen",name:"Daniel Hardwick",role:"Senior Partner",rank:3,senior:true,won:41,lost:9,impact:4});
  R.push({id:"bitt",src:"gen",name:"Lou Bitt",role:"Junior Partner",rank:2,senior:false,won:22,lost:17,impact:-1});
  const used=new Set();
  for(let i=0;i<6;i++){
    let name; do{ name=rnd(ROSTER_FIRST)+" "+rnd(ROSTER_LAST); }while(used.has(name)); used.add(name);
    const rank=rnd([0,0,0,1,1,2,3]);
    R.push({id:"gen"+i,src:"gen",name,role:ROLE_LABELS[rank],rank,senior:rank>=3,...history(rank)});
  }
  return R;
}

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
