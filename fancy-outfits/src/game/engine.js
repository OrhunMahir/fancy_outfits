// Game engine: every state mutation and flow function lives here.
// Rules (CLAUDE.md §5): stats change ONLY through apply(); after mutating S,
// call notify() so React re-renders. Pause is derived — no S.paused flag.
import { S, setS, notify, newState } from "./state.js";
import { RANKS, RANK_REQ, DAY_SECONDS, REP_FIRED, DEADLINE_PENALTY } from "./constants.js";
import { clamp, rnd } from "./utils.js";
import { SFX, toggleMute } from "./sound.js";
import { buildPool, JUDGES, crises, SCENARIOS } from "./content.js";

let timerId=null, flashSeq=0;

/* The clock stops whenever any overlay is up. Replaces the old S.paused flag
   (and with it the "info panel unpauses the summary screen" bug). */
export const isPaused=()=>!!(S.infoOpen||S.event||S.summary);
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
  // respect: a low-rep associate gets no benefit of the doubt
  if(!o.safe){
    if(S.rep<30) p-=12; else if(S.rep>70) p+=5;
    p-=S.rank*2; // higher rank, higher stakes, sharper opponents
  }
  return Math.round(clamp(p,5,95));
}

/* ---------- flow ---------- */
export function startGame(sc){
  setS(newState(sc));
  S.pool=buildPool();
  SFX.bell();
  log("Welcome to Parson Henderson, "+RANKS[0]+".","sys");
  if(sc==="debtor") log("Loan payment: $2000 due day 3.","sys");
  drawCases(2);
  startClock(); notify();
}

function drawCases(n){
  for(let i=0;i<n;i++){
    let avail=S.pool.filter(c=>!c.taken&&c.tier<=Math.max(1,S.rank));
    if(S.rank>=1) avail=S.pool.filter(c=>!c.taken);
    if(!avail.length){S.pool.forEach(c=>c.taken=false); avail=S.pool.slice();}
    const c=rnd(avail); c.taken=true;
    const inst={...c,dueDay:S.day+c.deadline, judge:c.judge?rnd(JUDGES):null};
    S.inbox.push(inst);
  }
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

export function endDay(){
  if(S.over||S.summary) return;
  // deadlines
  let missed=S.inbox.filter(c=>!c.pending&&c.dueDay<=S.day&&!c.msg);
  if(missed.includes(S.openCase)) S.openCase=null; // don't keep showing a removed case
  missed.forEach(c=>{ log("DEADLINE MISSED: "+c.title,"bad"); apply({rep:DEADLINE_PENALTY},true); });
  S.inbox=S.inbox.filter(c=>!missed.includes(c));
  if(S.over) return;
  // day summary then advance
  const lines=[];
  lines.push("Day "+S.day+" closed at "+RANKS[S.rank]+".");
  if(missed.length) lines.push(missed.length+" deadline(s) missed ("+DEADLINE_PENALTY+" REP each).");
  lines.push("The firm forgets fast: -1 REP overnight.");
  // debt
  if(S.debtDue!==null && S.day+1>=S.debtDue){
    if(S.money>=2000){S.money-=2000; S.debtDue+=3; lines.push("Loan payment made: -$2000. Next due day "+S.debtDue+".");}
    else { gameOver("STUDENT DEBT DEFAULT","You missed a loan payment. The collectors know where you bill hours. Career over."); return; }
  }
  SFX.bell();
  showSummary("END OF DAY "+S.day, lines, "START DAY "+(S.day+1), ()=>{
    S.day++; S.secs=DAY_SECONDS;
    apply({rep:-1},true); // the firm forgets fast
    if(S.over) return;
    // resolve delayed cases
    S.inbox.filter(c=>c.pending&&c.pending.day<=S.day).forEach(resolveDelayed);
    drawCases(1+(Math.random()<.6?1:0));
    // low rep = casual disrespect
    if(disrespected()&&Math.random()<.5) pushMsg("FYI",rnd([
      "The partners' meeting you weren't told about went great, apparently.",
      "Someone booked 'your' desk for a client call. You can use the hallway.",
      "IT reset your password to 'temp123'. They didn't tell you either.",
      "Your nameplate now reads 'ASSOCIATE (TEMP)'. Nobody knows who ordered it.",
      "The intern got CC'd on your case. 'For oversight.'"]));
    // crisis?
    const cs=crises();
    if(cs.length&&Math.random()<.6){ const c=rnd(cs); S.usedCrises.push(c.id); SFX.crisis(); S.event=c; }
    notify();
  });
}

function resolveDelayed(c){
  S.inbox=S.inbox.filter(x=>x!==c);
  const r=c.pending;
  if(r.win){ SFX.win(); log("RESPONSE ["+c.title+"]: SUCCESS","good"); pushMsg("REPLY: "+c.title,r.o.ok.txt); apply(r.o.ok.fx); if((r.o.ok.fx.rep||0)+(r.o.ok.fx.inf||0)>=10) flash("HENDERED!"); }
  else { SFX.lose(); log("RESPONSE ["+c.title+"]: FAILED","bad"); pushMsg("REPLY: "+c.title,r.o.fail.txt); apply(r.o.fail.fx); }
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
    S.openCase=null; notify(); return;
  }
  S.inbox=S.inbox.filter(x=>x!==c); S.openCase=null;
  if(Math.random()*100<p){
    SFX.win();
    log("["+c.title+"] "+o.ok.txt,"good"); apply(o.ok.fx);
    if(((o.ok.fx&&o.ok.fx.rep)||0)+((o.ok.fx&&o.ok.fx.inf)||0)>=10) flash("HENDERED!");
  } else {
    SFX.lose();
    log("["+c.title+"] "+o.fail.txt,"bad"); apply(o.fail.fx);
  }
  checkPromotion(); notify();
}

/* resolve a crisis option (event overlay button) */
export function resolveCrisis(o){
  SFX.click();
  const p=chance(o,null);
  S.event=null;
  if(Math.random()*100<p){ SFX.win(); log("[CRISIS] "+o.ok.txt,"good"); apply(o.ok.fx); if(((o.ok.fx&&o.ok.fx.inf)||0)>=10) flash("HENDERED!"); }
  else { SFX.lose(); log("[CRISIS] "+o.fail.txt,"bad"); apply(o.fail.fx); }
  checkPromotion(); notify();
}

function checkPromotion(){
  if(S.over) return;
  while(S.rank<4 && S.inf>=RANK_REQ[S.rank]){
    S.rank++;
    if(S.rank===4){ gameWin(); return; }
    SFX.promo(); flash("PROMOTED!");
    log("PROMOTED to "+RANKS[S.rank]+"!","sys");
    apply({rep:5},true);
  }
}

function checkEndings(){
  if(S.over) return;
  if(S.rep<REP_FIRED) gameOver("FIRED","Your reputation fell below what Parson Henderson tolerates (which is very little). Security walks you out. They keep the fancy outfit.");
}

function gameOver(title,txt){
  S.over=true; clearInterval(timerId); SFX.fired();
  showSummary("GAME OVER: "+title,[txt,"","Survived "+S.day+" day(s) as "+RANKS[S.rank]+"."],"NEW GAME",()=>location.reload());
}
function gameWin(){
  S.over=true; clearInterval(timerId); SFX.promo();
  showSummary("YOU MADE NAME PARTNER",[
    "The sign painters are already on the wall: PARSON HENDERSON & YOU.",
    "Day "+S.day+". Reputation "+S.rep+". Boldness "+S.bold+".","",
    "You've been HENDERED. Permanently."],"NEW GAME",()=>location.reload());
}

/* ---------- UI actions (overlays, inbox, topbar) ---------- */
function showSummary(title,lines,btnTxt,cb){ S.summary={title,lines,btnTxt,cb}; notify(); }
export function dismissSummary(){ SFX.click(); const cb=S.summary&&S.summary.cb; S.summary=null; if(cb)cb(); notify(); }
export function openCaseFile(c){ SFX.open(); S.openCase=c; notify(); }
export function deferCase(){ SFX.click(); S.openCase=null; notify(); }
export function openInfo(){ SFX.click(); S.infoOpen=true; notify(); }
export function closeInfo(){ SFX.click(); S.infoOpen=false; notify(); }
export function toggleSfx(){ toggleMute(); notify(); }
