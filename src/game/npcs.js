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

/* ---------- NPC stories: earn rel 40+ and a colleague opens a door ----------
   One scene per NPC per run (S.npcStories). Options carry relOk/relFail —
   resolveCrisis applies them via the event's npc field. */
const STORIES={
  dana:n=>({id:"story_dana",npc:n.id,story:true,title:"DANA'S LEDGER",
    body:"After hours, Dana Paulsen sets a worn black notebook on your desk. 'Every favor, every sin, every partner. Fifteen years.' She opens it to a single page and slides it toward you. 'You've earned one page. Choose what you do with it.'",
    opts:[
      {text:"Read the page. Knowledge is billable.",base:100,safe:true,relOk:6,
        ok:{fx:{inf:6},txt:"You read it twice and say nothing. Dana approves of people who say nothing."}},
      {text:"Close the book. Some doors stay closed.",base:100,safe:true,relOk:10,
        ok:{fx:{rep:3,bold:-2},txt:"'Interesting,' she says, almost warm. 'You're the first one who didn't look.'"}},
      {text:"Ask for Hardwick's page instead.",base:45,boldW:2,style:"aggressive",relOk:4,relFail:-10,
        ok:{fx:{inf:10,bold:4},txt:"She hesitates. Then turns to H. What you learn reorganizes your entire career plan."},
        fail:{fx:{rep:-5},txt:"The notebook closes with a sound like a verdict. 'Too far. Even for you.'"}}]}),
  raquel:n=>({id:"story_raquel",npc:n.id,story:true,title:"RAQUEL'S SECRET",
    body:"Raquel Lane closes your office door. 'I passed the bar. Eight months ago. Night school.' She's been doing associate work at paralegal pay while the partners look through her. 'You're the only one who treats my research like it has a name on it. Walk me into that meeting.'",
    opts:[
      {text:"Walk her into Hardwick's office yourself.",base:60,style:"technical",relOk:14,relFail:-4,
        ok:{fx:{rep:6,inf:5},txt:"Hardwick reads her memo, looks up: 'Whose desk is free?' You made an ally for life."},
        fail:{fx:{rep:-4},txt:"'We're not hiring inward,' says Hardwick, not reading it. Raquel doesn't blame you. That's worse."}},
      {text:"Advise patience — timing is everything here.",base:100,safe:true,relOk:4,
        ok:{fx:{bold:-2},txt:"She nods slowly. Patience. The word tastes like paralegal pay."}},
      {text:"Keep her secret — and keep 'borrowing' her research.",base:100,safe:true,relOk:-8,
        ok:{fx:{inf:4},txt:"Her memos keep making you look sharp. She starts CC'ing herself. Noted."}}]}),
  harold:n=>({id:"story_harold",npc:n.id,story:true,title:"HAROLD'S MIDNIGHT",
    body:"Harold Gustavson appears at your desk at a terrible hour, holding a redweld like it's radioactive. 'I filed the Vance certificate in the wrong county. It's been eleven days. Discovery closes tomorrow.' His voice is doing something between whisper and prayer. 'You're the only one who won't laugh.'",
    opts:[
      {text:"Fix it with him. All night. (1.5h, +8 FATIGUE)",base:100,safe:true,hours:1.5,fatigue:8,relOk:14,
        ok:{fx:{rep:3},txt:"Refiled, backdated legally (barely), survived. Harold would now walk into traffic for you."}},
      {text:"Tell him to confess to Hardwick first thing.",base:100,safe:true,relOk:-4,
        ok:{fx:{rep:2,bold:-2},txt:"Correct advice, coldly given. Harold survives the meeting. Something between you doesn't."}},
      {text:"File it away as leverage. Every firm runs on debts.",base:100,safe:true,relOk:-14,
        ok:{fx:{inf:7,bold:3},txt:"You say 'don't worry about it' in a way that makes Harold worry about it forever."}}]}),
  katrina:n=>({id:"story_katrina",npc:n.id,story:true,title:"KATRINA'S OFFER",
    body:"Katrina Bergman buys you a coffee without being asked, which is how you know something enormous is coming. 'I'm leaving. Eighteen months, my own shop, three clients already whispering.' She slides a napkin across: a name for the door. The second name is blank. 'I don't like most people. You bill honestly and lie well. Think about it.'",
    opts:[
      {text:"Shake on 'someday'. Mean it a little.",base:100,safe:true,relOk:10,
        ok:{fx:{bold:5,inf:3},txt:"'Someday,' she repeats, filing it like a signed contract. Knowing Katrina, it is one."}},
      {text:"Decline — your name's going on THIS wall.",base:100,safe:true,relOk:2,
        ok:{fx:{bold:3,rep:2},txt:"She almost smiles. 'Good answer. Wrong, but good.'"}},
      {text:"String her along and learn her client list.",base:40,boldW:2,style:"aggressive",relOk:-2,relFail:-16,
        ok:{fx:{inf:8},txt:"Three coffees later you know her whole exit plan. She may know you know. Unclear."},
        fail:{fx:{rep:-6},txt:"Katrina detects the angle mid-sentence. The temperature drops by a season."}}]}),
};
export const buildStory=n=>STORIES[n.id]?STORIES[n.id](n):null;

/* ---------- boss chores: the hierarchy asks, gravity only pulls DOWN ----------
   Requesters always OUTRANK the player (a Senior Partner can send an associate
   for coffee; the reverse universe does not exist). Accept: time + fatigue,
   a little influence. Decline: reputation. The intern option is a gamble. */
const BOSSES=[
  {name:"Lou Bitt",rank:2,style:"He does not say please. He says 'obviously'."},
  {name:"Daniel Hardwick",rank:3,style:"He doesn't look up while asking."},
  {name:"a Junior Partner from the 12th floor",rank:2,style:"You've never met. They know your name anyway."},
  {name:"a Senior Partner you've only seen in oil paint",rank:3,style:"Their assistant delivers the request like a subpoena."},
];
const CHORES=[
  {txt:"needs a triple espresso from the place across the street. The GOOD place. Now.",h:.5,f:4},
  {txt:"wants their dry cleaning picked up before the 3 o'clock with Meridian.",h:1,f:6},
  {txt:"needs someone to sit at their desk and 'look busy' during a client walkthrough.",h:1,f:4},
  {txt:"wants a CLE binder assembled, tabbed, and alphabetized. Twice, in case the first one is 'off'.",h:1.5,f:8},
  {txt:"needs their car moved before it's towed. It is parked across two handicap spots and a hydrant.",h:.5,f:4},
  {txt:"wants 'a quick summary' of a 220-page deposition. By lunch. 'Bullet points are fine.'",h:1.5,f:9},
];
export function buildDemand(playerRank){
  const eligible=BOSSES.filter(b=>b.rank>playerRank);
  if(!eligible.length) return null; // nobody outranks a Name Partner
  const b=rnd(eligible), ch=rnd(CHORES);
  return {id:"demand",demand:true,title:"SUMMONS: "+b.name,
    body:b.name+" "+ch.txt+" "+b.style+" Hierarchy is this firm's love language.",
    opts:[
      {text:"Do it. ("+ch.h+"h, +"+ch.f+" FATIGUE)",base:100,safe:true,hours:ch.h,fatigue:ch.f,
        ok:{fx:{inf:2},txt:"Done, flawlessly, invisibly. Someone who matters files your name under 'useful'."}},
      {text:"Politely decline — you're buried in casework.",base:100,safe:true,
        ok:{fx:{rep:-3},txt:"'Of course. Busy.' The word 'busy' does a lot of quiet damage in that sentence."}},
      {text:"Volunteer the intern with total confidence.",base:45,boldW:1,style:"aggressive",
        ok:{fx:{inf:1},txt:"The intern is dispatched. You are now 'resourceful'."},
        fail:{fx:{rep:-5},txt:"The intern is at lunch. You are now 'slippery'."}}]};
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
