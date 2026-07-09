// Game engine: every state mutation and flow function lives here.
// Rules (CLAUDE.md §5): stats change ONLY through apply(); after mutating S,
// call notify() so React re-renders. Pause is derived — no S.paused flag.
import { S, setS, notify, newState } from "./state.js";
import { RANKS, RANK_REQ, DAY_SECONDS, REP_FIRED, DEADLINE_PENALTY,
         STAKE_REWARD, STAKE_PENALTY, PRICES, SAVE_KEY, STATS_KEY,
         WEEK_LEN, REVIEW_GOOD, REVIEW_BAD, BUYIN_COST, FIRM_COLLAPSE,
         FIRE_HEAT, FIRE_HEAT_SENIOR, HEAT_DECAY, HEAT_MIN } from "./constants.js";
import { clamp, rnd, rand, hash, setSeed, clearSeed } from "./utils.js";
import { SFX, startAmbience, stopAmbience, applyBgmVolume } from "./sound.js";
import { settings, setSetting } from "./settings.js";
import { buildPool, JUDGES, crises, SCENARIOS } from "./content.js";
import { genCase } from "./casegen.js";
import { buildNpcs, buildRoster, delegationChance, relNpc, buildFavor, DELEGATE_WIN_TXT, DELEGATE_FAIL_TXT } from "./npcs.js";
import { buildLawsuit } from "./casegen.js";
import { CLIENT_CAP, makeClient, buildGlobalEvent } from "./clients.js";
import { ACHIEVEMENTS, unlock } from "./achievements.js";

let timerId=null, flashSeq=0;

/* The clock stops whenever any overlay is up, the player hit PAUSE, or the
   character is walking out. Replaces the old S.paused flag. */
export const isPaused=()=>!!(S.infoOpen||S.event||S.summary||S.userPaused||S.settingsOpen||S.rosterOpen||S.leaving);
export const disrespected=()=>S.rep<30;

export function log(txt,cls){ S.logEntries.unshift({txt,cls:cls||""}); S.dailyLog.push(txt); }

export function flash(txt){
  const id=++flashSeq;
  S.flash={txt,id};
  setTimeout(()=>{ if(S&&S.flash&&S.flash.id===id){ S.flash=null; notify(); } },1000);
}
function doShake(){ if(settings.shake) S.shakeSeq++; }

/* the rival associate: your failures are his billable hours */
function nemesisGain(v,fromFailure){
  const N=S.nemesis; if(!N||S.over||!v) return;
  N.inf=clamp(N.inf+v,0,100);
  if(fromFailure&&rand()<.25)
    pushMsg("FLOOR NEWS","Your lost file found a new desk. "+N.name+" sends 'sympathies'.");
  while(N.rank<4&&N.inf>=RANK_REQ[N.rank]){
    N.rank++;
    if(N.rank===4){
      if(S.endlessWon){ N.rank=3; N.inf=94; pushMsg("FLOOR NEWS",N.name+" eyes the wall. The wall already has your name on it."); return; }
      gameOver("OUTPACED",N.name+" makes NAME PARTNER while you're still billing hours. The sign painters are on the wall. The name is not yours."); return; }
    pushMsg("FLOOR NEWS",N.name+" promoted to "+RANKS[N.rank]+". The floor compares résumés. Yours is quieter.");
    log(N.name+" outranks the room a little more.","bad");
    apply({rep:-3},true);
  }
}

/* per-run ledger bookkeeping (die is already cast when this is called) */
function trackChoice(c,o,win){
  const r=S.runStats;
  if(o.safe) r.safe++;
  else if(o.style==="aggressive"){ win?r.bluffW++:r.bluffL++; }
  else if(o.style==="technical"){ win?r.techW++:r.techL++; }
  if(o.bribe){ r.bribeTry++; if(win) r.bribeW++; }
  if(c&&c.favor){ if((o.relOk||0)>0) r.favorHelp++; else if((o.relOk||0)<0) r.favorNo++; }
}

/* effects: {rep,bold,inf,money,firm} */
export function apply(fx,quiet){
  if(!fx) return;
  const map={rep:"REP",bold:"BOLD",inf:"INFL",money:"$",firm:"FIRM"};
  let parts=[];
  for(const k of ["rep","bold","inf","money","firm"]){
    if(!fx[k]) continue;
    let v=fx[k];
    if(S.scenario==="legacy"){ // nepotism: influence easier, reputation harsher
      if(k==="inf"&&v>0) v=Math.round(v*1.25);
      if(k==="rep"&&v<0) v=Math.round(v*1.25);
    }
    if(k==="money") S.money+=v; else S[k]=clamp(S[k]+v,0,100);
    parts.push((v>0?"+":"")+v+" "+map[k]);
  }
  if(parts.length&&!quiet) log(parts.join(", "),(fx.rep||0)<0?"bad":"good");
  checkEndings(); notify();
}

/* success chance for an option — the game's balance lives here, edit with care */
export function chance(o,c){
  if(o.base>=100) return 100;
  let p=o.base+(o.boldW||0)*(S.bold-40)/10*5; // each 10 bold over 40 adds boldW*5
  const j=c&&c.judge;
  if(j){
    if(o.style==="aggressive") p-=j.temper/4;
    if(o.style==="technical")  p+=j.book/5;
  }
  if(c&&c.crisisMod&&!o.safe) p+=c.crisisMod.v; // a Traitor leaked / a Brave ally shields (GDD §5-6)
  if(c&&c.dossier&&!o.safe) p+=12;              // detective's dossier on this file
  // the Defector knows Snidely Fitch's playbook
  if(S.scenario==="defector"&&!o.safe&&c&&/Snidely Fitch/.test((c.body||"")+(c.title||""))) p+=8;
  // respect: a low-rep associate gets no benefit of the doubt
  if(!o.safe){
    if(S.rep<30) p-=12; else if(S.rep>70) p+=5;
    p-=S.rank*2; // higher rank, higher stakes, sharper opponents
  }
  return Math.round(clamp(p,5,95));
}

/* What the PLAYER sees. The dice always use the exact chance(); difficulty
   only blurs the display: easy = tight range, medium/hard = wider, realistic =
   no numbers at all. The range is shifted off-center by a per-run hash so the
   midpoint doesn't leak the true value, and it's stable (no flicker). */
const FUZZ={easy:5, medium:9, hard:14};
export function displayPct(p,key){
  if(S.difficulty==="realistic") return null;
  if(p>=100) return "100%";
  const half=FUZZ[S.difficulty]||FUZZ.easy;
  const off=hash(S.seed+"|"+key)%(half+1)-(half>>1);
  const r5=v=>Math.round(v/5)*5;
  let lo=clamp(r5(p+off-half),0,90), hi=clamp(r5(p+off+half),10,99);
  if(hi<=lo) hi=lo+5;
  return "~"+lo+"–"+hi+"%";
}
export const displayChance=(o,c)=>displayPct(chance(o,c),((c&&c.id)||"ev")+"|"+o.text);

/* achievement helper: engine-side so every unlock gets the same fanfare */
function ach(id){
  if(!unlock(id)) return;
  const a=ACHIEVEMENTS.find(x=>x.id===id);
  SFX.bell();
  log("ACHIEVEMENT UNLOCKED: "+a.name+" — "+a.desc,"sys");
}

/* ---------- flow ----------
   modes: standard (default) · ironman (no save — close the game, lose the run)
   · endless (winning doesn't end the run) · daily (date-seeded, same for everyone) */
export function startGame(sc,diff,mode){
  mode=mode||"standard";
  if(mode==="daily"){
    const today=new Date().toISOString().slice(0,10);
    const h=hash("fo_daily_"+today);
    setSeed(h);
    sc=["fraud","debtor","legacy","defector"][h%4]; diff="medium";
    setS(newState(sc,diff)); S.dailyDate=today;
  } else { clearSeed(); setS(newState(sc,diff)); }
  S.mode=mode;
  S.pool=buildPool();
  S.npcs=buildNpcs();
  SFX.bell();
  log("Welcome to Parson Henderson, "+RANKS[0]+".","sys");
  if(sc==="debtor") log("Loan payment: $2000 due day 3.","sys");
  if(sc==="defector") log("You know where Snidely Fitch buries the bodies. They know you know.","sys");
  if(mode==="ironman") log("IRONMAN: no save. Close the game, lose the career.","sys");
  if(mode==="daily") log("DAILY CHALLENGE "+S.dailyDate+": same seed for everyone. No excuses.","sys");
  while(S.clients.length<CLIENT_CAP(0)&&S.clientPool.length) signClient();
  log("On your desk: the "+S.clients.map(c=>c.name).join(", ")+" accounts. Don't lose them.","sys");
  drawCases(2);
  startClock(); sitDown(); startAmbience(); saveGame(); notify();
}

/* hand-written pool first; when it runs dry (or for late-run variety) the
   procedural generator takes over — no more repeating the same 9 files */
function drawCases(n){
  for(let i=0;i<n;i++){
    let avail=S.pool.filter(c=>!c.taken&&c.tier<=Math.max(1,S.rank));
    if(S.rank>=1) avail=S.pool.filter(c=>!c.taken);
    const useGen=!avail.length||(S.day>3&&rand()<.4);
    const c=useGen?genCase():rnd(avail);
    if(!useGen) c.taken=true;
    if(useGen&&c.tier===2&&S.rank<1){ i--; continue; } // no court cases before Senior Associate
    S.inbox.push(instantiateCase(c));
  }
}

/* turn a case template into a live inbox file (deep-copied, stake-scaled, judge drawn).
   A corruptible judge (GDD §7) quietly adds one very risky, very expensive option. */
export function instantiateCase(c){
  const inst={...c, opts:JSON.parse(JSON.stringify(c.opts)),
    dueDay:S.day+c.deadline, judge:c.judge?rnd(JUDGES):null};
  if(inst.judge&&inst.judge.corrupt>=40){
    const cost=900+300*S.rank;
    inst.opts.push({text:"Invite the judge to 'discuss golf'. (-$"+cost+")",
      base:inst.judge.corrupt-15, boldW:1, style:"bribe", bribe:cost,
      ok:{fx:{inf:8,money:1400},txt:"The ruling lands your way. The golf never happens. Neither did this conversation."},
      fail:{fx:{rep:-13},txt:"The judge repeats your offer aloud. For the record. The stenographer types slowly, savoring it."}});
  }
  return scaleStakes(inst);
}

/* multi-stage cases: an outcome with `next` queues a follow-up filing that
   lands in the inbox `after` days later (stake-scaled at ITS spawn, not now) */
function queueFollowup(nx){
  S.followups.push({day:S.day+(nx.after||1), case:nx.case});
  log(nx.note||"Word around the floor: a follow-up filing is coming.","sys");
}
function spawnFollowups(){
  const due=S.followups.filter(f=>f.day<=S.day);
  S.followups=S.followups.filter(f=>!due.includes(f));
  due.forEach(f=>{
    const inst=instantiateCase({...f.case, chain:true});
    S.inbox.unshift(inst);
    log("NEW FILING: "+inst.title,"sys");
  });
}

/* higher rank = higher stakes: rewards scale up, failures scale up FASTER.
   Applied to a deep copy at draw time (promotion doesn't retro-scale open files). */
function scaleStakes(inst){
  const r=S.rank; inst.stakes=r;
  if(!r) return inst;
  const mul=fx=>{ if(!fx) return; for(const k of ["rep","bold","inf","money","firm"])
    if(fx[k]) fx[k]=Math.round(fx[k]*(fx[k]>0?STAKE_REWARD[r]:STAKE_PENALTY[r])); };
  inst.opts.forEach(o=>{ mul(o.ok&&o.ok.fx); mul(o.fail&&o.fail.fx); });
  return inst;
}

function startClock(){
  clearInterval(timerId);
  timerId=setInterval(()=>{
    if(!S||S.over||isPaused()) return;
    S.secs--;
    if(S.secs<=5&&S.secs>0) SFX.tick();
    if(S.secs<=0) endDay(); else notify();
  },1000);
}

/* character walk cycle: leaving takes ~1.4s before the summary shows;
   arriving plays over the first seconds of the new day */
function sitDown(){
  S.charAnim="arriving"; notify();
  setTimeout(()=>{ if(S&&!S.over&&S.charAnim==="arriving"){ S.charAnim="working"; notify(); } },1500);
}

export function endDay(){
  if(S.over||S.summary||S.leaving) return;
  // deadlines
  let missed=S.inbox.filter(c=>!c.pending&&!c.delegated&&c.dueDay<=S.day&&!c.msg);
  if(missed.includes(S.openCase)) S.openCase=null; // don't keep showing a removed case
  S.weekMissed+=missed.filter(c=>!c.favor).length;
  missed.forEach(c=>{
    if(c.favor){ const n=S.npcs.find(x=>x.id===c.npc); if(n) relNpc(n,-10);
      log("FAVOR IGNORED: "+c.title+" (-10 rel)","bad"); return; }
    log("DEADLINE MISSED: "+c.title,"bad"); S.runStats.miss++;
    apply({rep:DEADLINE_PENALTY,firm:-2},true); nemesisGain(4,true);
  });
  S.inbox=S.inbox.filter(c=>!missed.includes(c));
  if(S.over) return;
  // day summary then advance
  const lines=[];
  lines.push("Day "+S.day+" closed at "+RANKS[S.rank]+".");
  if(missed.length) lines.push(missed.length+" deadline(s) missed ("+DEADLINE_PENALTY+" REP each).");
  lines.push("The firm forgets fast: -1 REP overnight.");
  // Friday: the partners review your week (influence gained, reputation kept, deadlines missed)
  const friday=S.day%WEEK_LEN===0;
  if(friday){
    const score=(S.inf-S.weekStart.inf)+Math.round((S.rep-S.weekStart.rep)/2)-S.weekMissed*3;
    lines.push("— PARTNER REVIEW, WEEK "+(S.day/WEEK_LEN)+" —");
    if(score>=REVIEW_GOOD){
      apply({rep:4,inf:4,firm:3},true); ach("friday");
      lines.push(rnd([
        "Hardwick, without looking up: 'Whoever you are — keep billing like that.' (+4 REP, +4 INFL)",
        "Your name comes up in the partners' meeting. Nobody laughs. Progress. (+4 REP, +4 INFL)",
        "A bottle appears on your desk. No card. Partners don't do cards. (+4 REP, +4 INFL)"]));
    } else if(score<=REVIEW_BAD){
      apply({rep:-4,firm:-3},true);
      lines.push(rnd([
        "Hardwick's door was open. It closed as you walked past. (-4 REP)",
        "'We measure weeks here,' says the memo. Yours, apparently, was measured. (-4 REP)",
        "The partners' meeting mentions 'dead weight'. Several people glance at your desk. (-4 REP)"]));
    } else {
      lines.push(rnd([
        "The review is a shrug. Survival is a kind of praise here.",
        "'Adequate.' In this firm, that's almost a compliment. Almost.",
        "No praise, no warning. The most Parson Henderson sentence possible."]));
    }
    // retainers: the client book pays out on Fridays
    const ret=S.clients.reduce((a,c)=>a+c.fee,0);
    if(ret){ apply({money:ret},true); lines.push("Retainers collected: +$"+ret+" ("+S.clients.length+" client(s))."); }
    else { apply({firm:-4},true); lines.push("Zero clients on the books. The firm bills the air. (-4 FIRM)"); }
    lines.push("The weekend happens to other people. You reread depositions.");
    S.weekStart={inf:S.inf, rep:S.rep}; S.weekMissed=0;
  }
  if(S.over) return; // the review itself can end you (REP floor)
  // debt
  if(S.debtDue!==null && S.day+1>=S.debtDue){
    if(S.money>=2000){S.money-=2000; S.debtDue+=3; lines.push("Loan payment made: -$2000. Next due day "+S.debtDue+".");}
    else { gameOver("STUDENT DEBT DEFAULT","You missed a loan payment. The collectors know where you bill hours. Career over."); return; }
  }
  // walk out first, then the summary
  S.leaving=true; S.charAnim="leaving"; notify();
  setTimeout(()=>{
    if(!S||S.over) return;
    S.leaving=false;
    SFX.bell();
    showSummary("END OF DAY "+S.day+(friday?" — FRIDAY":""), lines, "START DAY "+(S.day+1), ()=>{
      S.day++; S.secs=settings.dayLen||DAY_SECONDS;
      if(S.day>=15) ach("day15");
      nemesisGain(rnd([0,1,1,2,2,3])); // he grinds nights too
      if(S.over) return;
      apply({rep:-1},true); // the firm forgets fast
      if(S.over) return;
      S.inbox.filter(c=>c.pending&&c.pending.day<=S.day).forEach(resolveDelayed);
      S.inbox.filter(c=>c.delegated&&c.delegated.day<=S.day).forEach(resolveDelegated);
      spawnFollowups();
      drawCases(1+(rand()<.6?1:0));
      if(rand()<.3&&!S.inbox.some(c=>c.favor)) spawnFavor();
      if(rand()<.18) marvMoment();
      rosterTick(); litigationTick();
      // low rep = casual disrespect
      if(disrespected()&&rand()<.5) pushMsg("FYI",rnd([
        "The partners' meeting you weren't told about went great, apparently.",
        "Someone booked 'your' desk for a client call. You can use the hallway.",
        "IT reset your password to 'temp123'. They didn't tell you either.",
        "Your nameplate now reads 'ASSOCIATE (TEMP)'. Nobody knows who ordered it.",
        "The intern got CC'd on your case. 'For oversight.'"]));
      // crisis? (a Traitor may leak your position; a loyal Brave shields you)
      const cs=crises();
      if(cs.length&&rand()<.6){
        const c=rnd(cs); S.usedCrises.push(c.id); SFX.crisis();
        const traitor=S.npcs.find(n=>n.trait==="Traitor"&&n.rel<25);
        const brave=S.npcs.find(n=>n.trait==="Brave"&&n.rel>=40);
        if(traitor&&rand()<.4){ traitor.known=true; c.crisisMod={v:-8,txt:traitor.name+" leaked your position before you entered the room. (-8% on every play)"}; }
        else if(brave){ brave.known=true; c.crisisMod={v:8,txt:brave.name+" is standing at your shoulder. (+8% on every play)"}; }
        S.event=c; S.runStats.crises++;
      }
      // no firm crisis today? the outside world may still bite (repeatable)
      if(!S.event&&rand()<.15){
        const ge=buildGlobalEvent(S.clients, S.clients.length<CLIENT_CAP(S.rank)&&S.clientPool.length>0);
        if(ge){ SFX.crisis(); S.event=ge; S.runStats.crises++; }
      }
      sitDown();
    });
  },1400);
}

function resolveDelayed(c){
  S.inbox=S.inbox.filter(x=>x!==c);
  const r=c.pending, out=r.win?r.o.ok:r.o.fail;
  if(r.win){ SFX.win(); log("RESPONSE ["+c.title+"]: SUCCESS","good"); pushMsg("REPLY: "+c.title,out.txt); apply(out.fx); if((out.fx.rep||0)+(out.fx.inf||0)>=10) flash("HENDERED!"); }
  else { SFX.lose(); log("RESPONSE ["+c.title+"]: FAILED","bad"); pushMsg("REPLY: "+c.title,out.txt); apply(out.fx); doShake(); nemesisGain(3,true); }
  if(out.next) queueFollowup(out.next);
  checkPromotion();
}

/* a delegated case comes back the next morning — their traits + your
   relationship decided the outcome the moment you handed it over */
function resolveDelegated(c){
  S.inbox=S.inbox.filter(x=>x!==c);
  const d=c.delegated, n=S.npcs.find(x=>x.id===d.npc);
  n.known=true;
  if(d.win){
    SFX.win(); relNpc(n,6);
    pushMsg("DELEGATED: "+c.title, n.name+" "+rnd(DELEGATE_WIN_TXT));
    log("DELEGATION ["+c.title+"]: "+n.name+" delivered.","good");
    apply({rep:2,inf:3+(c.tier||0)*2,money:(c.tier||0)*300});
  } else if(d.silent){
    relNpc(n,-3); c.delegated=null; S.inbox.push(c); // the file just... reappears
    pushMsg("RETURNED: "+c.title, n.name+" 'never got around to it'. The file is back on YOUR desk, deadline intact.");
    log("DELEGATION ["+c.title+"]: silently dropped by "+n.name+".","bad");
  } else {
    SFX.lose(); relNpc(n,-5);
    const traitorTax=n.trait==="Traitor"?4:0;
    pushMsg("DELEGATED: "+c.title, n.name+" "+rnd(DELEGATE_FAIL_TXT)+(traitorTax?" Somehow the whole floor knows it was YOUR case.":""));
    log("DELEGATION ["+c.title+"]: "+n.name+" failed it.","bad");
    apply({rep:-4-traitorTax}); nemesisGain(3,true);
  }
  checkPromotion();
}

/* Marv, the copy-room oracle. His generosity tracks your bribe history. */
function marvMoment(){
  if(S.marvBribes>0&&rand()<.5){
    const t=S.inbox.find(c=>!c.msg&&!c.pending&&!c.delegated&&!c.dossier&&!c.favor);
    if(t){ t.dossier=true;
      pushMsg("MARV (copy room)","A folder 'accidentally' lands in your tray. It concerns the "+t.title.replace(/^(CASE|COURT|MEMO|FAVOR|APPEAL|Errand|Doc review): ?/,"")+" file. (+12% on that file)");
      return; }
  }
  pushMsg("MARV (copy room)", rnd(S.marvBribes===0?[
    "Marv nods at you by the copier. He knows something. He always knows something.",
    "Marv: 'Big folders moving to the 14th floor today. Just saying.'",
    "Marv fixes the paper jam without looking. 'Partners are grumpy this week. Bill accordingly.'"
  ]:[
    "Marv slides you a coffee. The good kind. From the partners' machine.",
    "Marv: 'Heard your name upstairs. Good tone this time.'",
    "Marv 'loses' the copy-log page with your name on it. Officially, you owe him nothing."
  ]));
}
function pushMsg(title,txt){ S.inbox.unshift({msg:true,title,body:txt}); }

/* choose option on open case. NOTE: for delayed options the die is rolled NOW,
   the outcome is only revealed later by resolveDelayed (CLAUDE.md §5). */
export function choose(c,o){
  SFX.click();
  if(o.bribe){ // the golf money leaves your account win or lose
    if(S.money<o.bribe){ log("You can't afford the judge's 'green fees'.","bad"); notify(); return; }
    apply({money:-o.bribe},true);
  }
  const p=chance(o,c);
  if(o.delay){
    const win=rand()*100<p;
    c.pending={day:S.day+o.delay,win,o};
    trackChoice(c,o,win); SFX.send();
    log("Sent: '"+o.text+"' — response in "+o.delay+" day(s).","sys");
    S.openCase=null; saveGame(); notify(); return;
  }
  S.inbox=S.inbox.filter(x=>x!==c); S.openCase=null;
  const win=rand()*100<p, out=win?o.ok:o.fail;
  trackChoice(c,o,win);
  if(o.bribe&&win&&S.runStats.bribeW>=3) ach("bribe3");
  if(win){
    SFX.win();
    log("["+c.title+"] "+out.txt,"good"); apply(out.fx);
    if((c.tier||0)>=1&&!c.favor) apply({firm:1},true); // wins keep the lights on
    if(((out.fx&&out.fx.rep)||0)+((out.fx&&out.fx.inf)||0)>=10) flash("HENDERED!");
  } else {
    SFX.lose();
    log("["+c.title+"] "+out.txt,"bad"); apply(out.fx);
    if((c.tier||0)>=1&&!c.favor) apply({firm:-1},true);
    doShake(); if(!c.favor) nemesisGain(3,true);
  }
  if(c.favor){ // reverse favors: the relationship is the real payout
    const n=S.npcs.find(x=>x.id===c.npc), d=win?(o.relOk||0):(o.relFail||0);
    if(n&&d){ relNpc(n,d); log(n.name+(d>0?" will remember this. (+":" files this away. (")+d+" rel)",d>0?"good":"bad"); }
  }
  if(out.next) queueFollowup(out.next);
  checkPromotion(); saveGame(); notify();
}

/* ---------- the client book (parody brands, weekly retainers) ---------- */
function signClient(){
  if(S.clients.length>=CLIENT_CAP(S.rank)||!S.clientPool.length) return null;
  const c=makeClient(S.clientPool.pop());
  S.clients.push(c);
  return c;
}
function loseClient(name){
  S.clients=S.clients.filter(c=>c.name!==name);
  log("CLIENT LOST: "+name+". Their logo comes off the lobby wall.","bad");
}

/* ---------- Name Partner endgame: the roster is yours, so are the lawsuits ---------- */

/* every morning some employees act; their quality moves FIRM health */
function rosterTick(){
  if(!S.roster) return;
  let drift=0;
  S.roster.forEach(e=>{
    if(rand()<.3){ const win=rand()*100<50+e.impact*8; win?(e.won++,drift++):(e.lost++,drift--); }
  });
  if(drift) apply({firm:clamp(drift,-3,3)},true);
}

/* litigation heat: decays nightly but never reaches zero once you've fired
   anyone. High heat = an ex-employee lawsuit lands on YOUR desk. */
function litigationTick(){
  if(!S.everFired) return;
  S.fireHeat=Math.max(S.fireHeat*HEAT_DECAY,HEAT_MIN);
  if(rand()*100<Math.min(30,S.fireHeat)){
    S.inbox.unshift(instantiateCase(buildLawsuit(rnd(S.firedNames))));
    S.fireHeat=Math.max(S.fireHeat*.5,HEAT_MIN);
    log("A process server is at reception. It's for the firm. It's about you.","bad");
  }
}

function dismissEmployee(e,heat){
  S.roster=S.roster.filter(x=>x!==e);
  if(e.src==="npc") S.npcs=S.npcs.filter(n=>n.id!==e.npcId); // they leave THE FLOOR too — one less delegate
  if(e.src==="nemesis"){ S.nemesis=null; log(e.name+" — your rival — is escorted out. The floor is very quiet.","sys"); }
  S.fireHeat+=heat; S.everFired=true; S.firedNames.push(e.name);
  S.runStats.fired=(S.runStats.fired||0)+1;
  apply({firm:-2},true); // morale: everyone updates their résumé a little
  log("FIRED: "+e.name+". Security walks them out. They walk slowly, memorizing faces.","sys");
}
export function fireEmployee(id){
  if(!S.roster) return;
  const e=S.roster.find(x=>x.id===id); if(!e) return;
  SFX.send();
  if(e.senior){ // senior partners need a partner vote
    const p=clamp(30+S.rep/2+S.inf/4,20,90);
    if(rand()*100<p){ log("The vote carries. "+e.name+" is out.","sys"); dismissEmployee(e,FIRE_HEAT_SENIOR); }
    else { apply({rep:-6,firm:-3}); log("The vote FAILS. "+e.name+" stays — and remembers who called it.","bad"); doShake(); }
  } else dismissEmployee(e,FIRE_HEAT);
  saveGame(); notify();
}
export const voteChance=()=>clamp(30+S.rep/2+S.inf/4,20,90);

/* the partnership buy-in: rank 2 -> 3 costs real money */
export function payBuyIn(){
  if(S.rank!==2||S.buyinPaid||S.inf<RANK_REQ[2]||S.money<BUYIN_COST) return;
  SFX.send();
  S.buyinPaid=true;
  log("Buy-in wired. The partnership agreement has your name in actual ink.","sys");
  apply({money:-BUYIN_COST},true);
  checkPromotion(); saveGame(); notify();
}

/* an NPC asks YOU for help — a one-day file where rel is the real stake */
export function spawnFavor(){
  const n=rnd(S.npcs);
  S.inbox.unshift(instantiateCase(buildFavor(n)));
  log(n.name.split(" ")[0]+" left a favor on your desk. Due today.","sys");
  notify();
}

/* hand a case to a colleague (unlocks at Senior Associate; court cases excluded —
   you can't send a paralegal to argue a motion). Die is rolled now, revealed tomorrow. */
export function delegateCase(c,npcId){
  if(S.rank<1||c.judge||c.msg||c.pending||c.delegated||c.favor) return; // you can't delegate THEIR favor back at them
  const n=S.npcs.find(x=>x.id===npcId);
  SFX.send();
  const win=rand()*100<delegationChance(n);
  c.delegated={npc:n.id, day:S.day+1, win, silent:n.trait==="Lazy"&&!win&&rand()<.65};
  S.runStats.deleg[n.id]=(S.runStats.deleg[n.id]||0)+1;
  if(n.trait==="Traitor"&&S.runStats.deleg[n.id]>=5) ach("traitor5");
  S.openCase=null;
  log("Handed '"+c.title+"' to "+n.name+". Report tomorrow.","sys");
  saveGame(); notify();
}

/* resolve a crisis option (event overlay button) */
export function resolveCrisis(o){
  SFX.click();
  const ev=S.event, p=chance(o,ev);
  S.event=null;
  const win=rand()*100<p, out=win?o.ok:o.fail;
  trackChoice(null,o,win);
  if(win){ SFX.win(); log("[CRISIS] "+out.txt,"good"); apply(out.fx); if(((out.fx&&out.fx.inf)||0)>=10) flash("HENDERED!"); }
  else { SFX.lose(); log("[CRISIS] "+out.txt,"bad"); apply(out.fx); apply({firm:-2},true); doShake(); nemesisGain(3,true); }
  if(out.client){ // global events move the client book
    if(out.client.lose) loseClient(out.client.lose);
    if(out.client.gain){
      const nc=signClient();
      if(nc){ if(out.client.double) nc.fee*=2; log("NEW CLIENT: "+nc.name+" ($"+nc.fee+"/wk retainer).","good"); }
      else log("The prospect signs... with someone who has desk space. The book is full.","sys");
    }
  }
  if(out.next) queueFollowup(out.next); // crises may chain into case files too
  checkPromotion(); saveGame(); notify();
}

function checkPromotion(){
  if(S.over) return;
  const oldRank=S.rank;
  while(S.rank<4 && S.inf>=RANK_REQ[S.rank]){
    // Junior Partner -> Senior Partner: influence isn't enough, you buy in
    if(S.rank===2&&!S.buyinPaid){
      if(!S.buyinHinted){ S.buyinHinted=true; SFX.bell();
        log("The Senior Partnership is yours — once you buy in. ($"+BUYIN_COST+", see EXPENSES.)","sys"); }
      break;
    }
    S.rank++;
    if(S.rank===4){ gameWin(); return; }
    SFX.promo(); flash("PROMOTED!");
    log("PROMOTED to "+RANKS[S.rank]+"!","sys");
    if(S.rank===1) log("Senior Associate perk unlocked: DELEGATE cases from the file view.","sys");
    apply({rep:5},true);
    // a bigger title brings a bigger book
    const signed=[signClient(),signClient()].filter(Boolean);
    if(signed.length) log("Bigger office, bigger book: "+signed.map(c=>c.name).join(" and ")+" sign with the firm.","good");
  }
  if(S.rank>oldRank&&!S.over) promoWalk(oldRank);
}

/* promotion moment: walk out of the OLD office, walk into the new one */
function promoWalk(oldRank){
  if(S.leaving) return; // already mid-transition (e.g. end of day) — skip the ceremony
  S.sceneRank=oldRank; S.leaving=true; S.charAnim="leaving";
  log("You pack one box. It's mostly coffee mugs.","sys"); notify();
  setTimeout(()=>{
    if(!S||S.over){ if(S) S.sceneRank=null; return; }
    S.sceneRank=null; S.leaving=false; S.charAnim="arriving"; notify();
    setTimeout(()=>{ if(S&&S.charAnim==="arriving"){ S.charAnim="working"; notify(); } },1500);
  },1500);
}

function checkEndings(){
  if(S.over) return;
  if(S.rep<REP_FIRED){ gameOver("FIRED","Your reputation fell below what Parson Henderson tolerates (which is very little). Security walks you out. They keep the fancy outfit."); return; }
  // once the name is yours, so is the sinking
  if((S.endlessWon||S.rank===4)&&S.firm<FIRM_COLLAPSE)
    gameOver("FIRM COLLAPSE","Clients gone, partners fled, the lease unpaid. The sign painters return — this time with solvent. Your name comes off the wall faster than it went up.");
}

/* end-of-run breakdown for the final screen */
function ledger(){
  const r=S.runStats, top=Object.entries(r.deleg).sort((a,b)=>b[1]-a[1])[0];
  const topName=top&&S.npcs.find(n=>n.id===top[0]);
  return ["— RUN LEDGER —",
    "Bluffs: "+r.bluffW+" landed / "+r.bluffL+" blew up · Technical: "+r.techW+"W/"+r.techL+"L · Safe plays: "+r.safe,
    "Bribes offered: "+r.bribeTry+(r.bribeTry?" ("+r.bribeW+" taken)":""),
    "Favors: "+r.favorHelp+" helped · "+r.favorNo+" declined"+
      (topName?" · Most delegated: "+topName.name+" ("+top[1]+"×)":""),
    "Deadlines missed: "+r.miss+" · Crises faced: "+r.crises+
      (r.fired?" · Employees fired: "+r.fired:"")+
      (S.nemesis?" · "+S.nemesis.name+" peaked at "+RANKS[S.nemesis.rank]+".":" · Your rival didn't outlast you.")];
}
function gameOver(title,txt){
  S.over=true; clearInterval(timerId); SFX.fired(); stopAmbience(); doShake();
  clearSave(); recordRun(false,title);
  showSummary("GAME OVER: "+title,[txt,"","Survived "+S.day+" day(s) as "+RANKS[S.rank]+".","",...ledger()],"NEW GAME",()=>location.reload());
}
function winAchievements(){
  ach("win");
  if(S.difficulty==="realistic") ach("win_realistic");
  if(S.runStats.safe===0) ach("win_nosafe");
  if(S.scenario==="defector") ach("win_defector");
  if(S.mode==="ironman") ach("win_ironman");
  if(S.bold>=65) ach("win_bold");
}
function gameWin(){
  winAchievements();
  if(S.mode==="endless"&&!S.endlessWon){
    // endless: take the title, keep the inbox — and inherit the payroll
    S.endlessWon=true; SFX.promo(); flash("NAME PARTNER!");
    recordRun(true,"NAME PARTNER");
    S.roster=buildRoster(S.npcs,S.nemesis);
    showSummary("YOU MADE NAME PARTNER — AND KEPT GOING",[
      "The sign painters add your name to the wall. The inbox does not attend the ceremony.",
      "ENDLESS: the firm is yours now — payroll included. Open the FIRM tab to meet it.",
      "Keep FIRM health above "+FIRM_COLLAPSE+" or the name comes off the wall.",
      "Day "+S.day+". Reputation "+S.rep+". Boldness "+S.bold+"."],
      "KEEP BILLING",()=>{});
    return;
  }
  S.over=true; clearInterval(timerId); SFX.promo(); stopAmbience();
  clearSave(); recordRun(true,"NAME PARTNER");
  // the ending remembers HOW you climbed
  const epithet=
    S.bold>=65?"THE SHARK. You bluffed judges, partners and probability itself. The wall flinched first.":
    S.rep>=70?"THE BELOVED. Associates fetch your coffee out of genuine affection. Nobody remembers why they feared Fridays.":
    S.bold<=32?"THE SURVIVOR. You never once gambled. It turns out the building respects fear.":
    "THE OPERATOR. Nobody can quite explain how you did it. That is precisely the skill.";
  const seal={
    fraud:"P.S. You still never went to law school. The diploma on your wall is a photocopy of a rumor.",
    debtor:"The loans are PAID. The collectors send a fruit basket and, out of habit, an invoice for it.",
    legacy:"Your parent signs the wall change-order personally. They spell your name right. First try.",
  }[S.scenario];
  showSummary("YOU MADE NAME PARTNER",[
    "The sign painters are already on the wall: PARSON HENDERSON & YOU.",
    epithet,
    "Day "+S.day+". Reputation "+S.rep+". Boldness "+S.bold+".",
    seal,
    S.nemesis?"Down the hall, "+S.nemesis.name+" quietly clears out his desk.":"Your rival's desk has been empty for a while now.","",
    "You've been HENDERED. Permanently.","",...ledger()],"NEW GAME",()=>location.reload());
}

/* ---------- money sinks ---------- */
export function buySuit(){
  if(S.money<S.suitCost) return;
  SFX.send();
  const cost=S.suitCost;
  S.suitCost=Math.round(S.suitCost*1.5/100)*100; // the next one is fancier
  log("New tailored suit. The floor pretends not to stare. It stares.","sys");
  apply({money:-cost,rep:8});
  saveGame();
}
export function bribeMarv(){
  if(S.money<PRICES.marv) return;
  SFX.send();
  S.marvBribes++;
  const opener=S.marvBribes===1?"Marv pockets it smoothly — first time's awkward for everyone else. '":
    S.marvBribes>=3?"Marv: 'The usual arrangement.' He's already talking. '":"Marv (copy room): '";
  const unknown=S.npcs.filter(n=>!n.known);
  if(unknown.length){
    const n=rnd(unknown); n.known=true; relNpc(n,5);
    log(opener+n.name+"? "+n.trait+". You didn't hear it from me.'","sys");
  } else {
    S.npcs.forEach(n=>relNpc(n,4));
    log("Marv has nothing new — so he says nice things about you on every floor instead.","sys");
  }
  apply({money:-PRICES.marv});
  saveGame();
}
export function hireDetective(c){
  if(!c||c.dossier||c.msg||S.money<PRICES.detective) return;
  SFX.send();
  c.dossier=true;
  log("Detective's dossier attached to '"+c.title+"': +12% on every risky play.","sys");
  apply({money:-PRICES.detective});
  saveGame();
}

/* ---------- save/load (localStorage) + lifetime firm record ---------- */
export function saveGame(){
  if(!S||S.over||S.mode==="ironman") return; // ironman: no net
  try{
    // strip transient UI fields; everything else is plain JSON data
    const {infoOpen,event,summary,flash,userPaused,leaving,charAnim,openCase,settingsOpen,sceneRank,rosterOpen,...data}=S;
    localStorage.setItem(SAVE_KEY,JSON.stringify(data));
  }catch(e){}
}
export function peekSave(){
  try{ const d=JSON.parse(localStorage.getItem(SAVE_KEY)); return d&&!d.over?d:null; }catch(e){ return null; }
}
export function loadGame(){
  const d=peekSave(); if(!d) return;
  setS(Object.assign(newState(d.scenario),d,
    {infoOpen:false,event:null,summary:null,flash:null,userPaused:false,leaving:false,
     charAnim:"arriving",openCase:null,settingsOpen:false,sceneRank:null,rosterOpen:false}));
  SFX.bell();
  log("Run restored. The firm did not notice you were gone.","sys");
  while(S.clients.length<Math.min(3,CLIENT_CAP(S.rank))&&S.clientPool.length) signClient(); // pre-client saves get a starter book
  startClock(); sitDown(); startAmbience(); notify();
}
function clearSave(){ try{ localStorage.removeItem(SAVE_KEY); }catch(e){} }
export function getStats(){
  try{ return JSON.parse(localStorage.getItem(STATS_KEY)); }catch(e){ return null; }
}
function recordRun(won,cause){
  if(S.runRecorded) return; S.runRecorded=true; // endless: the win counts once, the eventual fall doesn't double-count
  try{
    const st=getStats()||{runs:0,wins:0,bestDay:0,bestRank:0,causes:{}};
    st.runs++; if(won) st.wins++;
    st.bestDay=Math.max(st.bestDay,S.day); st.bestRank=Math.max(st.bestRank,S.rank);
    if(!won) st.causes[cause]=(st.causes[cause]||0)+1;
    localStorage.setItem(STATS_KEY,JSON.stringify(st));
  }catch(e){}
}

/* ---------- UI actions (overlays, inbox, topbar) ---------- */
function showSummary(title,lines,btnTxt,cb){ S.summary={title,lines,btnTxt,cb}; notify(); }
export function dismissSummary(){ SFX.click(); const cb=S.summary&&S.summary.cb; S.summary=null; if(cb)cb(); saveGame(); notify(); }
export function openCaseFile(c){ SFX.open(); S.openCase=c; notify(); }
export function deferCase(){ SFX.click(); S.openCase=null; notify(); }
export function openInfo(){ SFX.click(); S.infoOpen=true; notify(); }
export function closeInfo(){ SFX.click(); S.infoOpen=false; notify(); }
export function pauseGame(){ SFX.click(); S.userPaused=true; notify(); }
export function resumeGame(){ SFX.click(); S.userPaused=false; notify(); }
export function openSettings(){ SFX.click(); S.settingsOpen=true; notify(); }
export function closeSettings(){ SFX.click(); S.settingsOpen=false; notify(); }
export function openRoster(){ SFX.open(); S.rosterOpen=true; notify(); }
export function closeRoster(){ SFX.click(); S.rosterOpen=false; notify(); }
export function updateSetting(k,v){
  setSetting(k,v);
  if(k==="bgm") applyBgmVolume();
  SFX.click(); notify();
}
