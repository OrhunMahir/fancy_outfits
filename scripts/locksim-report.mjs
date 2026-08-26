import { createLockpickChallenge, pressLockTension, advanceLockpick, lockGives }
  from "/Users/orhun/Desktop/fancy-outfits/src/game/minigames.js";

// A human reads the bar before each nudge: ~200ms per step, not one frame.
const play=(tolBonus,attBonus,step,msPerStep,diff)=>{
  let opened=0;
  for(let i=0;i<400;i++){
    let ch=createLockpickChallenge({runSeed:900+i,caseId:"s"+i,actionId:"l",cost:1.5,toil:7,
      lateExtra:0,toleranceBonus:tolBonus,attemptBonus:attBonus,diff});
    let guard=0;
    while(ch.phase==="lockpick"&&guard++<4000){
      if(lockGives(ch,ch.tension)){ ch=advanceLockpick(ch,80); continue; }
      ch=pressLockTension(ch,ch.tension+step);
      for(let f=0;f<Math.round(msPerStep/80)&&ch.phase==="lockpick";f++) ch=advanceLockpick(ch,80);
    }
    if(ch.phase==="lock_success") opened++;
  }
  return (100*opened/400).toFixed(1)+"%";
};
const rows=[["careful 3u / 250ms",3,250],["steady 5u / 200ms",5,200],["hasty 9u / 150ms",9,150]];
for(const [diff,name] of [[0,"EASY"],[1,"MEDIUM"],[2,"HARD / REALISTIC"]]){
  console.log("\n"+name);
  console.log("  habit".padEnd(24)+"SNEAKY 0".padStart(10)+"SNEAKY 2".padStart(10)+"SNEAKY 5".padStart(10));
  for(const [label,step,ms] of rows)
    console.log("  "+label.padEnd(22)+play(0,0,step,ms,diff).padStart(10)+play(2,1,step,ms,diff).padStart(10)+play(5,2,step,ms,diff).padStart(10));
}
