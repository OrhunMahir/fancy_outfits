// Game engine: every state mutation and flow function lives here.
// Rules (CLAUDE.md §5): stats change ONLY through apply(); after mutating S,
// call notify() so React re-renders. Pause is derived — no S.paused flag.
import { S, setS, notify, newState } from "./state.js";
import { RANKS, RANK_REQ, DAY_SECONDS, REP_FIRED, DEADLINE_PENALTY,
         STAKE_REWARD, STAKE_PENALTY, PRICES, SAVE_KEY, STATS_KEY,
         WEEK_LEN, REVIEW_GOOD, REVIEW_BAD } from "./constants.js";
import { clamp, rnd, hash } from "./utils.js";
import { SFX, toggleMute } from "./sound.js";
import { buildPool, JUDGES, crises, SCENARIOS } from "./content.js";
import { genCase } from "./casegen.js";
import { buildNpcs, delegationChance, relNpc, DELEGATE_WIN_TXT, DELEGATE_FAIL_TXT } from "./npcs.js";

let timerId=null, flashSeq=0;

/* The clock stops whenever any overlay is up, the player hit PAUSE, or the
   character is walking out. Replaces the old S.paused flag. */
export const isPaused=()=>!!(S.infoOpen||S.event||S.summary||S.userPaused||S.leaving);
export const disrespected=()=>S.rep<30;

export function log(txt,cls){ S.logEntries.unshift({txt,cls:cls||""}); S.dailyLog.push(txt); }

export function flash(txt){
  const id=++flashSeq;
  S.flash={txt,id};
  setTimeout(()=>{ if(S&&S.flash&&S.flash.id===id){ S.flash=null; notify(); } },1000);
}

/* effects: {rep,bold,inf,money} */
export function apply(fx,quiet){
  if(!fx) return;
  const map={rep:"REP",bold:"BOLD",inf:"INFL",money:"$"};
  let parts=[];
  for(const k of ["rep","bold","inf","money"]){
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

/* ---------- flow ---------- */
export function startGame(sc,diff){
  setS(newState(sc,diff));
  S.pool=buildPool();
  S.npcs=buildNpcs();
  SFX.bell();
  log("Welcome to Parson Henderson, "+RANKS[0]+".","sys");
  if(sc==="debtor") log("Loan payment: $2000 due day 3.","sys");
  drawCases(2);
  startClock(); sitDown(); saveGame(); notify();
}

/* hand-written pool first; when it runs dry (or for late-run variety) the
   procedural generator takes over — no more repeating the same 9 files */
function drawCases(n){
  for(let i=0;i<n;i++){
    let avail=S.pool.filter(c=>!c.taken&&c.tier<=Math.max(1,S.rank));
    if(S.rank>=1) avail=S.pool.filter(c=>!c.taken);
    const useGen=!avail.length||(S.day>3&&Math.random()<.4);
    const c=useGen?genCase():rnd(avail);
    if(!useGen) c.taken=true;
    if(useGen&&c.tier===2&&S.rank<1){ i--; continue; } // no court cases before Senior Associate
    S.inbox.push(instantiateCase(c));
  }
}

/* turn a case template into a live inbox file (deep-copied, stake-scaled, judge drawn) */
function instantiateCase(c){
  return scaleStakes({...c, opts:JSON.parse(JSON.stringify(c.opts)),
    dueDay:S.day+c.deadline, judge:c.judge?rnd(JUDGES):null});
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
  const mul=fx=>{ if(!fx) return; for(const k of ["rep","bold","inf","money"])
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
  S.weekMissed+=missed.length;
  missed.forEach(c=>{ log("DEADLINE MISSED: "+c.title,"bad"); apply({rep:DEADLINE_PENALTY},true); });
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
      apply({rep:4,inf:4},true);
      lines.push(rnd([
        "Hardwick, without looking up: 'Whoever you are — keep billing like that.' (+4 REP, +4 INFL)",
        "Your name comes up in the partners' meeting. Nobody laughs. Progress. (+4 REP, +4 INFL)",
        "A bottle appears on your desk. No card. Partners don't do cards. (+4 REP, +4 INFL)"]));
    } else if(score<=REVIEW_BAD){
      apply({rep:-4},true);
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
      S.day++; S.secs=DAY_SECONDS;
      apply({rep:-1},true); // the firm forgets fast
      if(S.over) return;
      S.inbox.filter(c=>c.pending&&c.pending.day<=S.day).forEach(resolveDelayed);
      S.inbox.filter(c=>c.delegated&&c.delegated.day<=S.day).forEach(resolveDelegated);
      spawnFollowups();
      drawCases(1+(Math.random()<.6?1:0));
      // low rep = casual disrespect
      if(disrespected()&&Math.random()<.5) pushMsg("FYI",rnd([
        "The partners' meeting you weren't told about went great, apparently.",
        "Someone booked 'your' desk for a client call. You can use the hallway.",
        "IT reset your password to 'temp123'. They didn't tell you either.",
        "Your nameplate now reads 'ASSOCIATE (TEMP)'. Nobody knows who ordered it.",
        "The intern got CC'd on your case. 'For oversight.'"]));
      // crisis? (a Traitor may leak your position; a loyal Brave shields you)
      const cs=crises();
      if(cs.length&&Math.random()<.6){
        const c=rnd(cs); S.usedCrises.push(c.id); SFX.crisis();
        const traitor=S.npcs.find(n=>n.trait==="Traitor"&&n.rel<25);
        const brave=S.npcs.find(n=>n.trait==="Brave"&&n.rel>=40);
        if(traitor&&Math.random()<.4){ traitor.known=true; c.crisisMod={v:-8,txt:traitor.name+" leaked your position before you entered the room. (-8% on every play)"}; }
        else if(brave){ brave.known=true; c.crisisMod={v:8,txt:brave.name+" is standing at your shoulder. (+8% on every play)"}; }
        S.event=c;
      }
      sitDown();
    });
  },1400);
}

function resolveDelayed(c){
  S.inbox=S.inbox.filter(x=>x!==c);
  const r=c.pending, out=r.win?r.o.ok:r.o.fail;
  if(r.win){ SFX.win(); log("RESPONSE ["+c.title+"]: SUCCESS","good"); pushMsg("REPLY: "+c.title,out.txt); apply(out.fx); if((out.fx.rep||0)+(out.fx.inf||0)>=10) flash("HENDERED!"); }
  else { SFX.lose(); log("RESPONSE ["+c.title+"]: FAILED","bad"); pushMsg("REPLY: "+c.title,out.txt); apply(out.fx); }
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
    apply({rep:-4-traitorTax});
  }
  checkPromotion();
}
function pushMsg(title,txt){ S.inbox.unshift({msg:true,title,body:txt}); }

/* choose option on open case. NOTE: for delayed options the die is rolled NOW,
   the outcome is only revealed later by resolveDelayed (CLAUDE.md §5). */
export function choose(c,o){
  SFX.click();
  const p=chance(o,c);
  if(o.delay){
    const win=Math.random()*100<p;
    c.pending={day:S.day+o.delay,win,o};
    SFX.send();
    log("Sent: '"+o.text+"' — response in "+o.delay+" day(s).","sys");
    S.openCase=null; saveGame(); notify(); return;
  }
  S.inbox=S.inbox.filter(x=>x!==c); S.openCase=null;
  const win=Math.random()*100<p, out=win?o.ok:o.fail;
  if(win){
    SFX.win();
    log("["+c.title+"] "+out.txt,"good"); apply(out.fx);
    if(((out.fx&&out.fx.rep)||0)+((out.fx&&out.fx.inf)||0)>=10) flash("HENDERED!");
  } else {
    SFX.lose();
    log("["+c.title+"] "+out.txt,"bad"); apply(out.fx);
  }
  if(out.next) queueFollowup(out.next);
  checkPromotion(); saveGame(); notify();
}

/* hand a case to a colleague (unlocks at Senior Associate; court cases excluded —
   you can't send a paralegal to argue a motion). Die is rolled now, revealed tomorrow. */
export function delegateCase(c,npcId){
  if(S.rank<1||c.judge||c.msg||c.pending||c.delegated) return;
  const n=S.npcs.find(x=>x.id===npcId);
  SFX.send();
  const win=Math.random()*100<delegationChance(n);
  c.delegated={npc:n.id, day:S.day+1, win, silent:n.trait==="Lazy"&&!win&&Math.random()<.65};
  S.openCase=null;
  log("Handed '"+c.title+"' to "+n.name+". Report tomorrow.","sys");
  saveGame(); notify();
}

/* resolve a crisis option (event overlay button) */
export function resolveCrisis(o){
  SFX.click();
  const ev=S.event, p=chance(o,ev);
  S.event=null;
  const win=Math.random()*100<p, out=win?o.ok:o.fail;
  if(win){ SFX.win(); log("[CRISIS] "+out.txt,"good"); apply(out.fx); if(((out.fx&&out.fx.inf)||0)>=10) flash("HENDERED!"); }
  else { SFX.lose(); log("[CRISIS] "+out.txt,"bad"); apply(out.fx); }
  if(out.next) queueFollowup(out.next); // crises may chain into case files too
  checkPromotion(); saveGame(); notify();
}

function checkPromotion(){
  if(S.over) return;
  while(S.rank<4 && S.inf>=RANK_REQ[S.rank]){
    S.rank++;
    if(S.rank===4){ gameWin(); return; }
    SFX.promo(); flash("PROMOTED!");
    log("PROMOTED to "+RANKS[S.rank]+"!","sys");
    if(S.rank===1) log("Senior Associate perk unlocked: DELEGATE cases from the file view.","sys");
    apply({rep:5},true);
  }
}

function checkEndings(){
  if(S.over) return;
  if(S.rep<REP_FIRED) gameOver("FIRED","Your reputation fell below what Parson Henderson tolerates (which is very little). Security walks you out. They keep the fancy outfit.");
}

function gameOver(title,txt){
  S.over=true; clearInterval(timerId); SFX.fired();
  clearSave(); recordRun(false,title);
  showSummary("GAME OVER: "+title,[txt,"","Survived "+S.day+" day(s) as "+RANKS[S.rank]+"."],"NEW GAME",()=>location.reload());
}
function gameWin(){
  S.over=true; clearInterval(timerId); SFX.promo();
  clearSave(); recordRun(true,"NAME PARTNER");
  showSummary("YOU MADE NAME PARTNER",[
    "The sign painters are already on the wall: PARSON HENDERSON & YOU.",
    "Day "+S.day+". Reputation "+S.rep+". Boldness "+S.bold+".","",
    "You've been HENDERED. Permanently."],"NEW GAME",()=>location.reload());
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
  const unknown=S.npcs.filter(n=>!n.known);
  if(unknown.length){
    const n=rnd(unknown); n.known=true; relNpc(n,5);
    log("Marv (copy room): '"+n.name+"? "+n.trait+". You didn't hear it from me.'","sys");
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
  if(!S||S.over) return;
  try{
    // strip transient UI fields; everything else is plain JSON data
    const {infoOpen,event,summary,flash,userPaused,leaving,charAnim,openCase,...data}=S;
    localStorage.setItem(SAVE_KEY,JSON.stringify(data));
  }catch(e){}
}
export function peekSave(){
  try{ const d=JSON.parse(localStorage.getItem(SAVE_KEY)); return d&&!d.over?d:null; }catch(e){ return null; }
}
export function loadGame(){
  const d=peekSave(); if(!d) return;
  setS(Object.assign(newState(d.scenario),d,
    {infoOpen:false,event:null,summary:null,flash:null,userPaused:false,leaving:false,charAnim:"arriving",openCase:null}));
  SFX.bell();
  log("Run restored. The firm did not notice you were gone.","sys");
  startClock(); sitDown(); notify();
}
function clearSave(){ try{ localStorage.removeItem(SAVE_KEY); }catch(e){} }
export function getStats(){
  try{ return JSON.parse(localStorage.getItem(STATS_KEY)); }catch(e){ return null; }
}
function recordRun(won,cause){
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
export function toggleSfx(){ toggleMute(); notify(); }
