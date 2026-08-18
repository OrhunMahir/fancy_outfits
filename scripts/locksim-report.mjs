import { createLockpickChallenge, lockFeel, pressLockTension, tryLockpick, LOCK_STEP }
  from "/Users/orhun/Desktop/fancy-outfits/src/game/minigames.js";

const push=(ch,by)=>pressLockTension(ch,ch.tension+by);
// One attempt: walk up to the first "close", add `extra` notches, then turn.
const attempt=(ch,extra)=>{
  while(ch.phase==="lockpick"&&lockFeel(ch)!=="close") ch=push(ch,LOCK_STEP);
  if(ch.phase!=="lockpick") return ch;
  for(let i=0;i<extra&&ch.phase==="lockpick";i++) ch=push(ch,LOCK_STEP);
  return ch.phase==="lockpick"?tryLockpick(ch):ch;
};

const BOTS={
  "timid (turn at first hint)":     n=>0,
  "fixed nudge (+2 notches)":       n=>2,
  "deep gamble (+4 notches)":       n=>4,
  "learns (0, +2, +4, ...)":        n=>n*2,   // a human: last try was short, go deeper
};

const RANKS=[[0,0,"SNEAKY 0 · 1 pick"],[2,1,"SNEAKY 2 · 2 picks"],[5,2,"SNEAKY 5 · 3 picks"]];
const N=600;
console.log(`${N} locks per cell — the same module the game imports\n`);
console.log("player habit".padEnd(30)+RANKS.map(r=>r[2].padStart(20)).join(""));
const snapRates={};
for(const [name,plan] of Object.entries(BOTS)){
  let row=name.padEnd(30);
  for(const [tolBonus,attBonus,label] of RANKS){
    let opened=0,snapped=0;
    for(let i=0;i<N;i++){
      let ch=createLockpickChallenge({runSeed:1000+i,caseId:"sim"+i,actionId:"lock",
        cost:1.5,toil:7,lateExtra:0,toleranceBonus:tolBonus,attemptBonus:attBonus});
      let tries=0;
      while(ch.phase==="lockpick"&&tries<6){ ch=attempt(ch,plan(tries)); tries++; }
      if(ch.phase==="lock_success") opened++; else if(ch.snapped) snapped++;
    }
    row+=`${(100*opened/N).toFixed(1)}%`.padStart(20);
    snapRates[name+label]=100*snapped/N;
  }
  console.log(row);
}
console.log("\nhow the failures happened (SNEAKY 0):");
for(const name of Object.keys(BOTS))
  console.log("  "+name.padEnd(30)+`${snapRates[name+"SNEAKY 0 · 1 pick"].toFixed(1)}% ended with a snapped pick`);
