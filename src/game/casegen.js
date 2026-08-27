// Procedural case generator — NO network, NO API key. Cases are assembled from
// templates + name/number pools at runtime, so every machine can generate fresh
// cases forever. Output matches the hand-written case schema exactly (CLAUDE.md §7);
// the winning clue is always embedded in the body text among decoys.
import { rnd, rand } from "./utils.js";
import { S } from "./state.js";

const CO=["Meridian","Halcyon","Aldergate","Novagene","Brightline","Pemberton","Vantage Corp","Ironclad Ltd","Bluepeak","Rockwell & Sons","Silvergate","Osprey Holdings"];
const LAST=["Whitfield","Okafor","Delgado","Kessler","Yamada","Brandt","O'Leary","Novak","Reyes","Ashford","Lindqvist","Moreau"];
const money=n=>"$"+n.toLocaleString("en-US");
let fallbackSeq=0;
const nextId=prefix=>{
  if(S){
    if(!Number.isSafeInteger(S.caseSeq)||S.caseSeq<0||S.caseSeq>=Number.MAX_SAFE_INTEGER)
      throw new Error("The procedural filing sequence is exhausted or damaged.");
    S.caseSeq++; return prefix+S.caseSeq;
  }
  return prefix+(++fallbackSeq);
};

/* ---------- EXAMINATIONS ----------
   Measurement, not guesswork: 57% of generated court filings carried no
   transcript, so the objection board could never open on them — that gap, not
   the number of cases, was what made it the rarest thing in the game. Rather
   than writing new cases, every examination is assembled from the filing's OWN
   names and facts, the way chronologies already are, so it reads authored
   instead of stock. A deposition needs no judge, which lifts the court-only
   ceiling entirely. */
const CLEAN=[
  f=>`'You are the records custodian at ${f.party}, is that right?'`,
  f=>"'What date did the notice reach your desk?'",
  f=>`'Do you recognise this ${f.thing}?'`,
  f=>"'Is that your signature at the bottom?'",
  f=>`'Describe your reporting line at ${f.party}.'`,
  f=>"'Who else was copied on it?'",
  f=>`'Walk me through what you did after ${f.other} called.'`,
  f=>"'How long have you held that role?'",
  f=>`'Was the ${f.thing} kept in the ordinary course of business?'`,
  f=>`'Where was the ${f.thing} stored?'`,
  f=>"'Did you take notes during that call?'",
  f=>`'Who at ${f.party} approved it?'`,
  f=>"'Is this a complete copy, to your knowledge?'",
  f=>`'When did you first see the ${f.subject}?'`,
  f=>"'Did anyone ask you to change it?'",
  f=>`'What is your title at ${f.party} today?'`,
  f=>"'Have you reviewed anything to prepare for today?'",
  f=>`'Was ${f.other} on the distribution list?'`,
];
const IMPROPER=[
  {tag:"leading",       line:f=>`'And you would agree ${f.party} sat on this for months, wouldn't you?'`},
  {tag:"leading",       line:f=>`'You knew the ${f.thing} was wrong when you signed it, didn't you?'`},
  {tag:"leading",       line:f=>`'It is fair to say nobody at ${f.party} was watching this, isn't it?'`},
  {tag:"hearsay",       line:f=>`'Your predecessor told me ${f.other} was never notified. Correct?'`},
  {tag:"hearsay",       line:f=>`'I'm told the ${f.thing} was backdated. What did you hear?'`},
  {tag:"hearsay",       line:f=>"'What did the auditor say about it afterwards?'"},
  {tag:"assumes facts not in evidence",line:f=>`'Why did ${f.party} decide to bury the ${f.subject}?'`},
  {tag:"assumes facts not in evidence",line:f=>"'When you destroyed the earlier draft, who told you to?'"},
  {tag:"assumes facts not in evidence",line:f=>`'How long had ${f.party} been hiding the second set of figures?'`},
  {tag:"calls for speculation",line:f=>`'What was ${f.other}'s counsel hoping would happen?'`},
  {tag:"calls for speculation",line:f=>"'If you had spoken up, would any of this have happened?'"},
  {tag:"calls for speculation",line:f=>`'What do you suppose ${f.party}'s board would say about that?'`},
  {tag:"argumentative", line:f=>"'You are not much of a record-keeper, are you?'"},
  {tag:"argumentative", line:f=>`'Does anyone at ${f.party} read anything before signing it?'`},
  {tag:"argumentative", line:f=>"'You expect this room to believe that?'"},
  {tag:"compound",      line:f=>`'Did you review the ${f.thing}, and did you tell ${f.other} what it said?'`},
  {tag:"compound",      line:f=>"'Did you see it, keep it, and pass it on?'"},
  {tag:"misstates prior testimony",line:f=>`'You said earlier that you never saw the ${f.subject} — so why is your name on it?'`},
  {tag:"misstates prior testimony",line:f=>"'A moment ago you said it was routine. Now you call it urgent?'"},
  {tag:"asked and answered",line:f=>`'One more time: who told you to file the ${f.thing}?'`},
  {tag:"asked and answered",line:f=>"'I'll ask again, since you seem unsure of the date.'"},
  {tag:"vague",         line:f=>"'And there were problems, generally speaking, weren't there?'"},
];
/* Alternate clean and improper so the rhythm reads like a real examination and
   no run can learn "the bad ones are always third". The board draws 6 of these
   by identity, so a long list is what keeps two runs from matching. */
export function buildExamination(kind,f){
  const clean=[...CLEAN], improper=[...IMPROPER], lines=[];
  const take=pool=>pool.splice(Math.floor(rand()*pool.length),1)[0];
  for(let i=0;i<7&&clean.length&&improper.length;i++){
    lines.push({id:"x"+(lines.length+1),text:take(clean)(f)});
    const pick=take(improper);
    lines.push({id:"x"+(lines.length+1),text:pick.line(f),bad:true,tag:pick.tag});
  }
  const depo=kind==="depo";
  return {
    id:(depo?"depo_":"exam_")+f.slug,
    depo,
    title:depo?`THE ${f.who.toUpperCase()} DEPOSITION`:`THE ${f.who.toUpperCase()} EXAMINATION`,
    body:depo
      ?`No judge, no jury, just a court reporter and ${f.other}'s counsel doing whatever he likes. Objections here are preserved for someone else to rule on later — but a lawyer who objects to every clean question is coaching the witness, and the transcript shows it.`
      :`${f.other}'s counsel has the witness on the stand, walking through the ${f.subject}. Some of these are not questions. Object before the answer lands — the bench is right there.`,
    lines,
  };
}
/* ---------- GENERATED TRIALS ----------
   Hand-written court files carry their own trial text; everything else builds
   one from the facts it already invented — the same method the examinations
   use, so a procedural trial still argues about THIS case's dates and
   documents rather than reciting stock lines. Length varies with the file. */
const OPENINGS=[
  {weight:"strong",flavor:"technical",make:f=>({text:`One document, one date. The ${f.thing} says ${f.party} knew before they say they knew.`,
    txt:"You give them one fact they can hold and stop talking."})},
  {weight:"strong",flavor:"bold",make:f=>({text:`${f.other} waited until it was expensive, then called it a principle.`,
    txt:"You hand them a villain instead of a rule. Three jurors settle in."})},
  {weight:"weak",flavor:"technical",make:f=>({text:`Walk the jury through the full history from the first agreement onward.`,
    txt:"Eleven minutes of chronology. The back row goes somewhere else."})},
  {weight:"weak",flavor:"bold",make:f=>({text:`Tell them ${f.party} has been treated appallingly and deserves better.`,
    txt:"Sympathy with nothing under it. It slides off the box."})},
  {weight:"neutral",make:f=>({text:"Keep it short. Promise them the documents will do the work.",
    txt:"Brief and careful. Some juries prefer that; this one has not decided yet."})},
];
const ARGUMENTS=[
  {weight:"strong",flavor:"technical",make:f=>({text:`Put the ${f.thing} on the screen and leave it there while you talk.`,
    txt:"Twelve people spend four minutes looking at one page. It stops being technical."})},
  {weight:"strong",flavor:"bold",make:f=>({text:`Ask why nobody at ${f.other} noticed until the money moved.`,
    txt:"Nobody has an answer, and the silence does more work than you could."})},
  {weight:"strong",flavor:"technical",make:f=>({text:`Have the custodian explain, slowly, how the ${f.thing} is kept.`,
    txt:"She is boring and unshakeable. The best kind of witness."})},
  {weight:"weak",flavor:"bold",make:f=>({text:`Attack the credibility of ${f.other}'s witness.`,
    txt:"He is pleasant, precise and clearly telling the truth about his own filing habits."})},
  {weight:"weak",flavor:"technical",make:f=>({text:"Restate the rule once more, slowly.",
    txt:"They heard it. Hearing it again does not make it warmer."})},
  {weight:"neutral",make:f=>({text:"Let the exhibit speak and move on.",
    txt:"The record takes it. Nothing gained, nothing lost."})},
];
const CLOSINGS=[
  {weight:"strong",flavor:"technical",make:f=>({text:`Three documents, one afternoon. Pick the version of it that can be true.`,
    txt:"You hand them the arithmetic and let them do it themselves."})},
  {weight:"strong",flavor:"bold",make:f=>({text:`They knew. They waited. Now they want you to call it an accident.`,
    txt:"You end on conduct rather than on rules, and it lands."})},
  {weight:"weak",flavor:"bold",make:f=>({text:`Remind them how much ${f.other} stands to gain.`,
    txt:"You finish on greed instead of on evidence. A smaller note to end on."})},
  {weight:"weak",flavor:"technical",make:f=>({text:"Warn them what happens if rules like this stop meaning anything.",
    txt:"A speech about the system. The system is not on trial and they know it."})},
  {weight:"neutral",make:f=>({text:"Thank them for their time and sit down.",
    txt:"Brief. Some juries like brief."})},
];
/* Opposing counsel's line, plus the ground that actually answers it. The clean
   ones matter as much as the improper ones: a trial where every question is
   objectionable teaches nothing about when to stay seated. */
const TRIAL_LINES=[
  {bad:"speculation",  make:f=>`'In your view, what do you imagine ${f.party} was hoping would happen here?'`},
  {bad:"hearsay",      make:f=>`'Your predecessor told me the ${f.thing} was never sent. That is right, isn't it?'`},
  {bad:"assumes",      make:f=>`'When ${f.party} destroyed the earlier version, were you consulted?'`},
  {bad:"leading",      make:f=>`'And you would agree ${f.party} sat on this for months, wouldn't you?'`},
  {bad:"argumentative",make:f=>`'Does anyone at ${f.party} read anything before signing it?'`},
  {bad:"compound",     make:f=>`'Did you review the ${f.thing}, and did you tell ${f.other} what it said?'`},
  {bad:"relevance",    make:f=>`'Let us talk about your employer's tax filings for a moment.'`},
  {bad:"asked",        make:f=>`'One more time, since you seem unsure: who signed the ${f.thing}?'`},
  {bad:null,           make:f=>`'What date does the stamp on this exhibit read?'`},
  {bad:null,           make:f=>`'Who else was copied on it?'`},
  {bad:null,           make:f=>`'Was the ${f.thing} kept in the ordinary course of business?'`},
];
export function buildTrial(f,strength,verdict){
  const draw=(pool,n)=>{ const copy=[...pool],out=[];
    for(let i=0;i<n&&copy.length;i++) out.push(copy.splice(Math.floor(rand()*copy.length),1)[0]);
    return out; };
  const line=()=>{ const pick=draw(TRIAL_LINES,1)[0];
    return {kind:"opposing",bad:pick.bad,text:pick.make(f)}; };
  /* Always deal one strong line. A phase drawn purely at random can come up with
     nothing but weak options, and a turn you cannot play well is not a choice —
     it is a tax on having reached this phase. */
  const opts=(pool,n)=>{
    const strong=draw(pool.filter(o=>o.weight==="strong"),1);
    const rest=draw(pool.filter(o=>!strong.includes(o)),n-strong.length);
    const dealt=[...strong,...rest];
    for(let i=dealt.length-1;i>0;i--){ const j=Math.floor(rand()*(i+1)); [dealt[i],dealt[j]]=[dealt[j],dealt[i]]; }
    return dealt.map(o=>({...o.make(f),weight:o.weight,...(o.flavor?{flavor:o.flavor}:{})}));
  };
  // Four or six phases. Longer than that and a generated trial outstays the
   // hand-written ones without having more to say.
  const rounds=1+Math.floor(rand()*2);
  const phases=[{kind:"opening",prompt:"You stand first. Whatever frame you give them now is the one they will hang everything else on.",opts:opts(OPENINGS,3)}];
  for(let i=0;i<rounds;i++){
    phases.push(line());
    phases.push({kind:"argument",prompt:"Your turn with the documents.",opts:opts(ARGUMENTS,3)});
  }
  phases.push({kind:"closing",prompt:"Last words.",opts:opts(CLOSINGS,3)});
  return {id:"trial_"+f.slug,strength,verdict,phases};
}

/* Every court filing gets a hearing, including the appeal stages hanging off
   one. Anything that already carries an authored transcript keeps it. */
const facts=c=>{
  const t=String(c.title||"").replace(/^[A-Z ]+:\s*/,"");
  const party=(t.match(/[A-Z][A-Za-z&'’-]+(?: [A-Z][A-Za-z&'’-]+)?/)||[rnd(CO)])[0];
  return {party,other:rnd(CO.filter(x=>x!==party)),who:party.split(" ")[0],
    subject:"filing",thing:rnd(["log","memo","invoice","certificate","docket entry"]),
    slug:String(c.id||"gen").replace(/[^a-z0-9]/gi,"")};
};
function dressExaminations(c){
  if(!c||typeof c!=="object") return c;
  if((c.judge||c.tier===2)&&!c.objection) c.objection=buildExamination("court",facts(c));
  /* A courtroom filing can go to a jury. Reward and penalty are derived from the
     file's own stakes so a generated trial is worth what the case is worth. */
  if((c.judge||c.tier===2)&&!c.trial){
    const f=facts(c);
    const risky=(c.opts||[]).find(o=>!o.safe&&!o.action&&o.ok&&o.ok.fx)||{ok:{fx:{}},fail:{fx:{}}};
    const w=risky.ok.fx||{}, l=(risky.fail&&risky.fail.fx)||{};
    c.trial=buildTrial(f,-6+Math.floor(rand()*16),{
      win:{rep:Math.max(4,w.rep||5),inf:Math.max(4,w.inf||5),money:Math.max(800,w.money||1200),firm:1},
      lose:{rep:Math.min(-5,l.rep||-6),inf:-3,money:Math.min(-200,l.money||-300)},
    });
  }
  /* Real work is not all courtrooms. A live tier-1 dispute can just as easily
     put you in a conference room across from opposing counsel, which is what
     stops this board from being a thing you see twice a career. */
  /* Real work is not all courtrooms: a live tier-1 dispute can just as easily
     put you across a conference table from opposing counsel. Files carrying a
     chronology are allowed one too — choose() flips between them, so neither
     board starves the other. */
  else if(c.tier===1&&!c.judge&&rand()<.35) c.objection=buildExamination("depo",facts(c));
  for(const o of c.opts||[])
    for(const out of [o.ok,o.fail])
      if(out&&out.next&&out.next.case) dressExaminations(out.next.case);
  return c;
}

/* Each template returns a full case object. Tier decides deadline + reward scale. */
const TEMPLATES=[
  // 1 — the misplaced liability cap
  ()=>{const a=rnd(CO),b=rnd(CO.filter(x=>x!==a)),p=140+Math.floor(rand()*220),m=rnd([5,10,20,50]);
  return {tier:1,title:`CASE: ${a}-${b} agreement review`,deadline:rnd([2,3]),
    body:`Proofread the ${a}-${b} master agreement overnight. The recitals misspell '${b}' twice, which is embarrassing but harmless. Buried on page ${p}: the liability cap reads ${money(m*1000)} where every prior draft said ${money(m*1000000)}. Nobody else has read page ${p}.`,
    opts:[
      {text:"Sign off with a polite note on the typos.",base:100,safe:true,ok:{fx:{inf:2,bold:-3},txt:"Noted, filed, forgotten. Like you."}},
      {text:`Flag the ${money(m*1000)} cap on page ${p}.`,base:84,style:"technical",ok:{fx:{rep:6,inf:5,money:500},txt:`You just saved the client ${money(m*1000000-m*1000)}. A partner mispronounces your name approvingly.`},fail:{fx:{rep:-4},txt:"You flagged it in the redline nobody opened. The clean copy shipped."}},
      {text:"Hold the page hostage for a better assignment.",base:35,boldW:3,style:"aggressive",ok:{fx:{bold:7,inf:6},txt:"Blackmail is such an ugly word. 'Leverage' billed beautifully."},fail:{fx:{rep:-9},txt:"The partner finds page "+p+" himself. At 2am. Your move was noticed."}}]};},
  // 2 — the signer with no authority
  ()=>{const a=rnd(CO),who=rnd(["a Vice President","an 'Interim Director'","a regional manager"]);
  const opts=[
      {text:"Negotiate a quiet exit fee.",base:100,safe:true,ok:{fx:{bold:-3,inf:2,money:300},txt:"Everyone pays a little. Everyone forgets you a little."}},
      {text:"Move to void — no signing authority.",base:76,style:"technical",delay:rnd([1,2]),ok:{fx:{rep:7,inf:7,money:1100},txt:"Void ab initio. Opposing counsel stares at their own Exhibit F in silence."},fail:{fx:{rep:-5},txt:"A ratification memo surfaces. Signed by someone with ACTUAL authority. Ouch."}},
      {text:"Bluff: 'We have three more exhibits like this.'",base:36,boldW:3,style:"aggressive",delay:1,ok:{fx:{bold:6,inf:5,money:700},txt:"They settle overnight. There were no other exhibits. There didn't need to be."},fail:{fx:{rep:-9,bold:-2},txt:"'Show us,' they said. You could not show them."}}];
  const c={tier:1,title:`CASE: ${a} contract dispute`,deadline:rnd([2,3]),
    body:`${a} wants out of a supply contract. Their file is a mess of routing slips and one furious sticky note. Exhibit C is the gem: the contract was signed by ${who} of the counterparty who, under their own bylaws attached as Exhibit F, had no signing authority that quarter. Opposing counsel attached Exhibit F themselves.`,
    opts};
  if(rand()<.7) c.opts.push({text:"CASE PREP: clear the production bundle before it goes out.",style:"prep",
    action:{id:"generated_contract_privilege",type:"redaction",title:`THE ${a.toUpperCase()} PRODUCTION`,
      body:"Opposing counsel's request sweeps in this whole bundle and it ships tonight. The rule is below; the pages are not marked.",
      hours:1.5,fatigue:6,edge:15,
      edgeText:"PRIVILEGE HELD (+15% on this file's risky plays)",
      pages:[
        {id:"gadvice",text:`${a}'s GC to you: 'can they actually enforce this against us?'`,priv:true},
        {id:"gmemo",text:"Your memo weighing the authority argument against settling",priv:true},
        {id:"gnote",text:"Your note on which exhibit you would rather they never read",priv:true},
        {id:"gslip",text:"A routing slip with four initials and a coffee ring"},
        {id:"gbylaw",text:"The counterparty's bylaws, already attached as Exhibit F"},
        {id:"gpr",text:`${a}'s COO to their agency, copying you: 'how loud does this get?'`},
        {id:"gpo",text:"The purchase orders for the disputed quarter"},
        {id:"gsticky",text:"The furious sticky note, photographed for the file"},
        {id:"gfee",text:"Your engagement letter's fee schedule"},
        {id:"gdraft",text:"An unsigned earlier draft of the supply contract"}],
      success:{fx:{bold:2},txt:"The bundle ships with the black bars exactly where they belong."},
      partial:{fx:{},txt:"Most of it is right. The over-black parts will be argued about, but nothing of yours went out."},
      miss:{fx:{},txt:"Your own read on your own case is now in their hands."}}});
  return c;},
  // 3 — filed too late (court; the dismissal may get appealed → multi-stage)
  ()=>{const a=rnd(CO),b=rnd(CO.filter(x=>x!==a)),d=rnd([1,2,3]),ex=rnd(["their CEO was 'at a wellness retreat'","their server 'ate the draft'","their counsel 'misread a calendar'"]);
  const c={tier:2,title:`COURT: ${a} v. ${b}`,deadline:rnd([3,4]),judge:true,
    body:`Motion to dismiss. ${a}'s complaint hit the docket ${d} day(s) AFTER the statute of limitations ran out — their tolling argument is that ${ex}. The filing stamp doesn't care. Sympathy might. The docket sheet spells the year out: March 4, the ${b} contract is terminated. March 18, ${a}'s general counsel opens a claim file. June 2, their outside counsel sends a first demand letter. August 9, ${a} fires that outside counsel. September 1, the limitations period runs out. September ${1+d}, the clerk stamps the complaint. September 20, new counsel files the tolling declaration.`,
    timelineDraft:{id:"late_filing_docket",title:"THE DOCKET, IN ORDER",
      body:`Before you argue the calendar, put the calendar in order. The panel will ask when ${a} knew what it knew, and a lawyer who fumbles that question loses the easy dismissal.`,
      events:[
        {id:"terminate",at:1,text:`The ${b} contract is terminated`},
        {id:"claimfile",at:2,text:`${a}'s general counsel opens a claim file`},
        {id:"demand",at:3,text:"Outside counsel sends the first demand letter"},
        {id:"firing",at:4,text:`${a} fires that outside counsel`},
        {id:"expiry",at:5,text:"The limitations period runs out"},
        {id:"stamp",at:6,text:"The clerk stamps the complaint"},
        {id:"tolling",at:7,text:"New counsel files the tolling declaration"}]},
    opts:[
      {text:"Consent to proceed on the merits.",base:100,safe:true,ok:{fx:{bold:-3,inf:2},txt:"Trial ahead. The safe road is long and unpaid."}},
      {text:"The deadline is the deadline. Cold math.",base:66,style:"technical",ok:{fx:{rep:8,inf:8,money:1400},txt:"'The calendar does not do wellness.' Dismissed. HENDERED."},fail:{fx:{rep:-6},txt:"Tolled anyway. The judge calls your argument 'correct, and unlikable'."}},
      {text:"Mock the excuse in open court.",base:37,boldW:3,style:"aggressive",ok:{fx:{bold:8,inf:7,money:1000},txt:"The gallery laughs. The judge doesn't, but rules your way anyway."},fail:{fx:{rep:-11},txt:"The judge finds the excuse 'sincere' and your tone 'sanctionable'."}}]};
  /* One board per court filing: the hearing window and the chronology would
     otherwise fight over the same risky play, and only one can open. */
  const board3=rand();
  if(board3<.5){
    c.objection={id:"late_filing_examination",title:`${a.toUpperCase()}'S EXAMINATION`,
      body:`${a}'s counsel has your client's records custodian on the stand, walking her through the dates. Some of these are not questions. Object before the answer lands.`,
      lines:[
        {id:"g1",text:"'You are the records custodian, is that right?'"},
        {id:"g2",text:`'And you would agree ${b} sat on this claim for months, wouldn't you?'`,bad:true,tag:"leading"},
        {id:"g3",text:"'When did the file reach your desk?'"},
        {id:"g4",text:"'Your predecessor told me the notice went out late. Correct?'",bad:true,tag:"hearsay"},
        {id:"g5",text:"'Describe the docket entry you made.'"},
        {id:"g6",text:"'Why did your company decide to bury the termination date?'",bad:true,tag:"assumes facts not in evidence"},
        {id:"g7",text:"'Do you recognise this stamp?'"},
        {id:"g8",text:"'What was your general counsel hoping would happen?'",bad:true,tag:"calls for speculation"},
        {id:"g9",text:"'Is this your signature on the log?'"},
        {id:"g10",text:"'You are not much of a record-keeper, are you?'",bad:true,tag:"argumentative"}]};
  } else if(board3<.95){ c.timeline=c.timelineDraft; }
  delete c.timelineDraft;
  if(rand()<.5){ const yrs=rnd([2,3,4]); // half the time the loser appeals — a follow-up stage
    c.opts[1].ok.next={after:2,note:`${a}'s counsel promises an appeal. Loudly, near a camera.`,case:{
      id:nextId("appeal"),tier:2,title:`APPEAL: ${a} v. ${b}`,deadline:3,judge:true,
      body:`${a} appeals the dismissal. The centerpiece citation of their brief was overturned ${yrs} years ago — some associate copied it from an old memo and nobody checked. Appellate panels notice that sort of thing. Usually.`,
      opts:[
        {text:"Rest on the record. Add nothing.",base:100,safe:true,ok:{fx:{inf:3,bold:-2,money:300},txt:"Affirmed without oral argument. The quiet win nobody toasts."}},
        {text:"Flag the dead citation for the panel.",base:70,style:"technical",ok:{fx:{rep:9,inf:8,money:1500},txt:"The panel's opinion opens with your footnote. Affirmed, with a side of humiliation for them."},fail:{fx:{rep:-6},txt:"The panel reverses on other grounds and thanks you for the 'trivia'."}},
        {text:"Demand sanctions for the sloppy brief.",base:35,boldW:3,style:"aggressive",ok:{fx:{bold:7,inf:8,money:1100},txt:"Sanctioned. Their appellate team updates its citation software the same afternoon."},fail:{fx:{rep:-10},txt:"'Everyone miscites, counsel. Even you. Page six.' You do not look at page six."}}]}};
  }
  return c;},
  // 4 — the impossible witnesses (court)
  ()=>{const who=rnd(LAST),place=rnd(["on a cruise in international waters","at a silent retreat with no visitors' log","courtside at a playoff game, on camera"]);
  const heir=rnd(["life coach","reptile sanctuary","'spiritual adviser'","golf instructor"]);
  const c={tier:2,title:`COURT: In re ${who} estate`,deadline:rnd([3,4]),judge:true,
    body:`A contested will leaves everything to a ${heir}. The 'final' will has two witnesses — both of whom, per the attached statements, were ${place} on the signing date. Social media agrees with the geography, not the will. The bundle also holds a pharmacy log, a bank record, a notary's day book, a hospice visitor sheet and a stack of paper nobody has cross-read against the affidavits.`,
    opts:[
      {text:"Broker a settlement split.",base:100,safe:true,ok:{fx:{bold:-2,inf:2,money:400},txt:"Everyone unhappy in equal shares. Textbook."}},
      {text:"Present the location evidence. Void the will.",base:74,style:"technical",ok:{fx:{rep:8,inf:7,money:1300},txt:"Exhibit A: a timestamped photo. The will folds like a beach chair."},fail:{fx:{rep:-5},txt:"One witness signed remotely — legal here since '21. The other one you never checked."}},
      {text:"Accuse the beneficiary of undue influence.",base:38,boldW:3,style:"aggressive",ok:{fx:{bold:7,inf:7,money:900},txt:"They confess to 'manifesting the estate'. On the record."},fail:{fx:{rep:-10},txt:"No evidence, just vibes. The judge bills you for the vibes."}}]};
  const board4=rand();
  if(board4<.5){
    c.objection={id:"estate_examination",title:`THE ${who.toUpperCase()} EXAMINATION`,
      body:`The ${heir}'s counsel is examining the surviving witness about that afternoon. Object while a question is standing; the bench is watching you as closely as the witness.`,
      lines:[
        {id:"e1",text:"'You signed as a witness to the will, correct?'"},
        {id:"e2",text:"'And the deceased was perfectly clear-headed, wasn't he?'",bad:true,tag:"leading"},
        {id:"e3",text:"'Where were you that afternoon?'"},
        {id:"e4",text:"'The housekeeper says he asked for the new will himself. True?'",bad:true,tag:"hearsay"},
        {id:"e5",text:"'Who else was in the room?'"},
        {id:"e6",text:"'Why did the family hide the earlier will from him?'",bad:true,tag:"assumes facts not in evidence"},
        {id:"e7",text:"'Is this the document you signed?'"},
        {id:"e8",text:"'What do you imagine he meant to leave his daughter?'",bad:true,tag:"calls for speculation"},
        {id:"e9",text:"'Did you read it before you signed?'"},
        {id:"e10",text:"'You will sign anything put in front of you, won't you?'",bad:true,tag:"argumentative"}]};
  } else if(board4<.95) c.opts.push({text:"CASE PREP: chart the affidavits against the bundle.",style:"prep",
    action:{id:"generated_estate_contradictions",type:"contradiction",title:`THE ${who.toUpperCase()} AFFIDAVITS`,
      body:"Two witnesses swore to a version of that afternoon. The bundle disagrees with them in five different places. Pin each sentence to the page that ends it — and leave the pages that prove nothing alone.",
      hours:1.5,fatigue:6,edge:15,
      edgeText:"CONTRADICTION CHART COMPLETE (+15% on this file's risky legal plays)",
      pairs:[
        {id:"present",statement:"'I stood beside him while he signed.'",document:`Travel record placing that witness ${place} that day`},
        {id:"hand",statement:"'He wrote it out in his own hand.'",document:"Handwriting report: the body text was typed weeks earlier"},
        {id:"stranger",statement:`'I had never met the ${heir} before the funeral.'`,document:`A joint bank transfer to the ${heir}, dated that spring`},
        {id:"alert",statement:"'He was sharp as ever that week.'",document:"Pharmacy log: sedatives dispensed daily that week"},
        {id:"notary",statement:"'A notary sat with us at the table.'",document:"The notary's day book, blank on the signing date"},
        {id:"alone",statement:"'No one visited him that afternoon.'",document:`Hospice visitor sheet listing the ${heir} at 2pm`}],
      decoys:[
        {id:"gardener",text:"An unpaid invoice from the estate's gardener"},
        {id:"policy",text:"A lapsed home insurance policy nobody renewed"},
        {id:"obituary",text:"The newspaper obituary, published a week later"}],
      success:{fx:{bold:2},txt:"Every sworn sentence now has a document sitting on top of it. The will still has to be attacked — but the witnesses are already finished."},
      partial:{fx:{},txt:"Some of it holds. The rest you would not put in front of a judge, so it stays in the binder."},
      miss:{fx:{bold:-2},txt:"The affidavits survive the afternoon. Hours spent, nothing you can stand behind."}}});
  return c;},
  // 5 — two versions of the same report
  ()=>{const a=rnd(CO),m=rnd([1,2,3]);
  return {tier:1,title:`CASE: ${a} audit prep`,deadline:rnd([2,3]),
    body:`Prep the ${a} CFO for deposition. The binder holds two versions of the same expense report: one signed BEFORE the audit, one after — with ${money(m*1000000)} quietly reclassified to 'consulting'. Their counsel included both copies. By accident, presumably. The dates are duller than the numbers and twice as useful. January 12: the audit committee schedules its review. February 3: the original report is signed. February 20: the auditors ask for supporting invoices. February 21: the CFO's assistant books a vendor 'orientation dinner'. March 2: the ${money(m*1000000)} moves to consulting. March 6: the second report is signed. March 30: the assistant leaves the company.`,
    timeline:rand()<.8?{id:"audit_two_reports",title:`THE ${a.toUpperCase()} BINDER, END TO END`,
      body:"Two signatures, one audit. Lay the binder out in order and the reclassification stops looking like accounting and starts looking like a decision.",
      events:[
        {id:"schedule",at:1,text:"The audit committee schedules its review"},
        {id:"first",at:2,text:"The original expense report is signed"},
        {id:"invoices",at:3,text:"The auditors ask for supporting invoices"},
        {id:"dinner",at:4,text:"The assistant books a vendor 'orientation dinner'"},
        {id:"reclass",at:5,text:`${money(m*1000000)} moves to 'consulting'`},
        {id:"second",at:6,text:"The second, tidier report is signed"},
        {id:"exit",at:7,text:"The assistant leaves the company"}]}:null,
    opts:[
      {text:"Soft questions. Preserve the relationship.",base:100,safe:true,ok:{fx:{bold:-3,inf:1},txt:"Forty minutes of nothing. The partners check their phones."}},
      {text:"Walk him into the two signatures.",base:70,style:"technical",ok:{fx:{rep:7,inf:6,money:800},txt:"'Which signature is yours?' Both, it turns out. Checkmate."},fail:{fx:{rep:-6},txt:"He explains the reclass with a straight face and a footnote. You blinked."}},
      {text:"Slap both copies on the table. Theater.",base:40,boldW:3,style:"aggressive",ok:{fx:{bold:7,inf:6,money:700},txt:"He cracks on camera. The clip makes the group chat."},fail:{fx:{rep:-9},txt:"He calmly staples them together and hands them back. Devastating."}}]};},
  // 6 — the galactic non-compete
  ()=>{const a=rnd(CO),who=rnd(LAST),span=rnd(["ten years, worldwide","'any industry, any hemisphere'","five years including 'adjacent fields of thought'"]);
  return {tier:1,title:`CASE: ${who} non-compete`,deadline:rnd([2,3]),
    body:`${a} is suing ex-employee ${who} over a non-compete. Read the clause: it bans working ${span}. Courts here toss restraints that broad on sight — but ${a} is a firm client, and firm clients like winning, not being told their contract is science fiction.`,
    opts:[
      {text:"Advise settling before a judge reads it.",base:100,safe:true,ok:{fx:{inf:2,bold:-3,money:300},txt:"Settled. The clause survives to intimidate another day."}},
      {text:"Tell the client the clause is unenforceable.",base:72,style:"technical",ok:{fx:{rep:7,inf:6},txt:"They rage, then rewrite it properly, then thank you. In that order."},fail:{fx:{rep:-6},txt:"The client wanted a warrior, not a proofreader. They call Snidely Fitch."}},
      {text:"Enforce it anyway. Terrify the ex-employee.",base:34,boldW:3,style:"aggressive",ok:{fx:{bold:6,inf:5,money:900},txt:`${who} folds before anyone reads anything. The clause remains legend.`},fail:{fx:{rep:-10},txt:`${who}'s new lawyer reads the clause aloud in court. Slowly. Twice.`}}]};},
  // 7 — partner errand (tier 0)
  ()=>{const p=rnd(["Hardwick","Bitt","a Senior Partner you've never met"]),task=rnd(["needs his car 'legally parked' where it is illegally parked","wants a birthday gift for a judge he insulted last week","needs someone to attend a CLE seminar under his name","wants his espresso machine deposed — it 'knows what it did'"]);
  return {tier:0,title:`MEMO: ${p} needs a favor`,deadline:rnd([1,2]),
    body:`${p} ${task}. This is not billable, not legal work, and not optional. The intern has already fled to the archive room.`,
    opts:[
      {text:"Do it. Flawlessly. Say nothing.",base:100,safe:true,ok:{fx:{inf:3,bold:-3},txt:"Done. You receive a nod. The nod is your bonus."}},
      {text:"Delegate it to the intern's hiding spot.",base:58,boldW:1,ok:{fx:{inf:3,bold:2},txt:"The intern delivers. You 'supervised'. Efficiency noted."},fail:{fx:{rep:-6},txt:"The intern failed and named you as the mastermind immediately."}},
      {text:"'I bill 400 an hour. This isn't 400-an-hour work.'",base:26,boldW:3,style:"aggressive",ok:{fx:{bold:8,inf:4},txt:"A pause. Then: 'Fine. Take the Meridian file instead.' Upgrade."},fail:{fx:{rep:-9},txt:"'You bill what I SAY you bill.' The floor heard the decimal point."}}]};},
  // 8 — the backdated email
  ()=>{const a=rnd(CO),who=rnd(LAST),m=rnd([2,3,5]);
  const c8={tier:1,title:`CASE: ${a} termination dispute`,deadline:rnd([2,3]),
    body:`${a} fired ${who} 'for cause' and produced a warning email dated May 6 — three weeks before the firing. But the header ${a} handed over unredacted says otherwise. April 2: ${who}'s last review lands at 'exceeds expectations'. April 15: HR opens a 'restructuring' spreadsheet. May 27, 08:14: the warning email is actually sent. May 27, 09:30: ${who} is fired for cause. May 30: the severance offer is withdrawn. June 1: HR forwards the whole file to outside counsel, headers and all. June 9: ${a} produces the email in discovery. The 'cause' was manufactured after the decision.`,
    timelineDraft8:{id:"backdated_email_header",title:"WHAT THE HEADER SAYS",
      body:`The paper file and the metadata tell two different stories. Build the real one first — ${a} will hand you the other one all day.`,
      events:[
        {id:"review",at:1,text:`${who}'s last performance review lands at 'exceeds expectations'`},
        {id:"restructure",at:2,text:"HR opens the 'restructuring' spreadsheet"},
        {id:"sent",at:3,text:"The warning email is actually sent"},
        {id:"fired",at:4,text:`${who} is fired 'for cause'`},
        {id:"severance",at:5,text:"The severance offer is withdrawn"},
        {id:"forward",at:6,text:"HR forwards the unredacted file to outside counsel"},
        {id:"produced",at:7,text:"The email is produced in discovery"}]},
    opts:[
      {text:"Advise a clean severance. Move on.",base:100,safe:true,ok:{fx:{bold:-3,inf:2,money:300},txt:"Paid, signed, gone. Nobody reads the header ever again."}},
      {text:"Confront them with the metadata timestamp.",base:73,style:"technical",delay:rnd([1,2]),ok:{fx:{rep:8,inf:7,money:1000},txt:`The header doesn't lie even when ${a} does. They settle before discovery.`},fail:{fx:{rep:-5},txt:"They claim a 'server clock error'. It's flimsy — but it's today's problem now."}},
      {text:"Threaten to report the fabrication to the court.",base:33,boldW:3,style:"aggressive",ok:{fx:{bold:6,inf:6,money:1200},txt:"The word 'sanctions' does the negotiating for you."},fail:{fx:{rep:-10},txt:`${a} reminds you whose client they are. Loudly. To Hardwick.`}}]};
  const board8=rand();
  if(board8<.5){
    c8.opts.push({text:"CASE PREP: clear the HR file before it is produced.",style:"prep",
      action:{id:"generated_hr_privilege",type:"redaction",title:`THE ${a.toUpperCase()} HR FILE`,
        body:`${who}'s counsel has asked for the whole personnel file and it ships tonight. The rule is below; the pages are not marked.`,
        hours:1.5,fatigue:6,edge:15,
        edgeText:"PRIVILEGE HELD (+15% on this file's risky plays)",
        pages:[
          {id:"hadvice",text:`${a}'s HR director to you: 'can we defend this termination?'`,priv:true},
          {id:"hmemo",text:"Your memo on the metadata and what it costs them",priv:true},
          {id:"hplan",text:"Your note on which manager should never be deposed",priv:true},
          {id:"hreview",text:`${who}'s last performance review, signed by both sides`},
          {id:"hheader",text:"The warning email with its unredacted header"},
          {id:"hpr",text:`${a}'s CEO to their PR agency, copying you: 'what do we say publicly?'`},
          {id:"hbadge",text:"Badge-swipe records for the week of the firing"},
          {id:"hpayroll",text:"Payroll adjustment forms for the final month"},
          {id:"hfee",text:"Your engagement letter's fee schedule"},
          {id:"hcomplaint",text:"An unrelated complaint about the parking allocation"}],
        success:{fx:{bold:2},txt:"The file goes out clean. They learn nothing they did not already have."},
        partial:{fx:{},txt:"Most of it holds. The over-black pages will draw a letter, but nothing of yours went out."},
        miss:{fx:{},txt:"Your own assessment of your own client's exposure is now in their hands."}}});
  } else if(board8<.95){ c8.timeline=c8.timelineDraft8; }
  delete c8.timelineDraft8;
  return c8;},
  // 9 — the patent that predates itself
  ()=>{const a=rnd(CO),b=rnd(CO.filter(x=>x!==a));
  return {tier:1,title:`CASE: ${a} v. ${b} (patent)`,deadline:rnd([2,3]),
    body:`${b} sues ${a} for infringing a 'revolutionary' patent. The filing date is right there on page one. So is the trade-show brochure in exhibit 9, where ${b} publicly demoed the exact invention — fourteen months BEFORE they filed. Public disclosure that old sinks the patent. The prosecution history runs: year one, March 4, the trade-show demo. Year one, April 20, ${b} posts the demo video publicly. Year two, May 9, the application is filed. Year two, November 2, the patent issues. Year three, January 15, ${a} launches the accused product. Year three, March 1, the cease-and-desist arrives. Year three, April 12, the complaint is filed. They exhibited their own poison.`,
    timeline:rand()<.8?{id:"patent_prior_disclosure",title:"THE PROSECUTION HISTORY",
      body:`Prior disclosure is a date problem, not an argument problem. Put ${b}'s own history in order and the fourteen months speak for themselves.`,
      events:[
        {id:"demo",at:1,text:"The invention is demoed at the trade show"},
        {id:"video",at:2,text:`${b} posts the demo video publicly`},
        {id:"filed",at:3,text:"The patent application is filed"},
        {id:"issued",at:4,text:"The patent issues"},
        {id:"launch",at:5,text:`${a} launches the accused product`},
        {id:"cease",at:6,text:"The cease-and-desist letter arrives"},
        {id:"complaint",at:7,text:"The infringement complaint is filed"}]}:null,
    opts:[
      {text:"License it cheaply. Avoid the fight.",base:100,safe:true,ok:{fx:{inf:2,bold:-3,money:200},txt:"A modest license. The 'revolutionary' patent lives to bully again."}},
      {text:"Invalidate it on the prior public disclosure.",base:74,style:"technical",ok:{fx:{rep:8,inf:7,money:1300},txt:"Exhibit 9 is their own brochure. The patent evaporates. So does their smugness."},fail:{fx:{rep:-5},txt:"The demo was 'a prototype, not the claimed invention'. Arguable. Ugh."}},
      {text:"Countersue for bad-faith litigation.",base:36,boldW:3,style:"aggressive",ok:{fx:{bold:7,inf:7,money:1000},txt:`${b} drops everything to make you drop the countersuit. You don't. They pay.`},fail:{fx:{rep:-10},txt:"Your countersuit reads as retaliation. The judge says so. In writing."}}]};},
  // 10 — the guaranty nobody signed twice
  ()=>{const who=rnd(LAST),a=rnd(CO),k=rnd([200,350,500]);
  return {tier:1,title:`CASE: ${a} loan guaranty`,deadline:rnd([2,3]),
    body:`${a} defaulted on a $${k}k loan and the bank is chasing ${who}, who allegedly 'personally guaranteed' it. The guaranty page bears ${who}'s signature — but it's a photocopy grafted onto a different font than the rest of the document, and it is dated June 14, stamped by a notary whose commission expired April 1. The rest of the file is honest about its dates: February 2, ${a} draws the loan down. February 20, the credit committee demands a personal guarantor. April 1, the notary's commission expires. September 8, ${a} misses its first payment. September 21, the bank scans its own file copy — with no guaranty page in it. October 5, the demand letter goes to ${who}. November 30, the guaranty page appears in the bank's production. Somebody assembled this.`,
    timeline:rand()<.8?{id:"guaranty_assembly",title:"WHEN THE PAGE APPEARED",
      body:`The signature is the wrong fight. The right fight is the order: a page nobody could scan in September cannot have been signed in June.`,
      events:[
        {id:"drawdown",at:1,text:`${a} draws the loan down`},
        {id:"committee",at:2,text:"The credit committee demands a personal guarantor"},
        {id:"commission",at:3,text:"The notary's commission expires"},
        {id:"default",at:4,text:`${a} misses its first payment`},
        {id:"scan",at:5,text:"The bank scans its file copy — no guaranty page in it"},
        {id:"demandletter",at:6,text:`The demand letter goes to ${who}`},
        {id:"appears",at:7,text:"The guaranty page appears in the bank's production"}]}:null,
    opts:[
      {text:"Negotiate a payment plan and stop asking questions.",base:100,safe:true,ok:{fx:{bold:-4,inf:2},txt:"A quiet plan. The Frankenstein guaranty is never mentioned again."}},
      {text:"Challenge the guaranty — expired notary, spliced page.",base:72,style:"technical",delay:rnd([1,2]),ok:{fx:{rep:8,inf:6,money:900},txt:"An expired notary can't notarize the future. The guaranty is void. The bank blinks."},fail:{fx:{rep:-5},txt:"The bank produces a 'corrected' copy overnight. Convenient. Hard to disprove today."}},
      {text:"Accuse the bank of forging the document.",base:32,boldW:3,style:"aggressive",ok:{fx:{bold:7,inf:6,money:1100},txt:"Nobody wants 'bank forgery' in a headline. They walk away fast."},fail:{fx:{rep:-11},txt:"Forgery is a big word to prove. You had a stapler's worth of evidence."}}]};},
  // 11 — the HOA tyrant (tier 0, low stakes, high pettiness)
  ()=>{const who=rnd(LAST),thing=rnd(["a garden gnome deemed 'architecturally nonconforming'","a mailbox painted a shade of beige not on the approved list","a basketball hoop visible from space, allegedly"]);
  return {tier:0,title:`CASE: ${who} v. the HOA`,deadline:rnd([1,2]),
    body:`Pro bono. ${who}'s homeowners' association is fining them $50/day over ${thing}. The HOA's own bylaws — section 12, which the board president clearly never read — require a hearing before any fine. They skipped it. Every fine is procedurally void.`,
    opts:[
      {text:"Write a polite letter citing section 12.",base:100,safe:true,ok:{fx:{inf:2,rep:2},txt:`The fines vanish. ${who} sends a fruit basket. It's a nice basket.`}},
      {text:"Demand every past fine refunded, with interest.",base:66,style:"technical",ok:{fx:{rep:5,inf:5},txt:"Section 12 was a landmine. The board president resigns by email."},fail:{fx:{rep:-4},txt:"The board lawyers up with someone who HAS read section 12. Standoff."}},
      {text:"Threaten to depose the entire board.",base:38,boldW:2,style:"aggressive",ok:{fx:{bold:6,inf:4},txt:"Nobody on a volunteer board wants a deposition. Total surrender."},fail:{fx:{rep:-6},txt:"Turns out the treasurer is also a litigator. Of course she is."}}]};},
  // 12 — repeatable late-career COVERT work keeps earned SNEAKY ranks useful
  ()=>{const a=rnd(CO),host=rnd(CO.filter(x=>x!==a)),type=rand()<.5?"lockpick":"power_cut";
  const action=type==="lockpick"?{
    id:"generated_archive_lock",type,title:"THE OFFSITE EVIDENCE CAGE",
    body:"The night clerk leaves the evidence cage for one cigarette. The backup manifest sits behind a tired brass lock. One paperclip, one steady hand, no heroic speeches — push too hard and it snaps.",
    hours:1.5,fatigue:4,edge:12,
    edgeText:"BACKUP MANIFEST RECOVERED (+12% on this file's risky legal plays)",
    success:{fx:{bold:3},txt:"The lock yields. You photograph a manifest proving the backup survived. The filing still needs a legal answer — now it has teeth."},
    escape:{fx:{bold:-2},txt:"You are back in the corridor before the clerk finishes his cigarette. The manifest stays caged and this route is gone."},
    caught:{fx:{rep:-18,firm:-6,bold:-5},txt:"By sunrise your badge photo has an exhibit sticker on it, and so does what you left behind."}
  }:{
    id:"generated_backup_power",type,title:"THE BACKUP SWITCHROOM",
    body:"Three live bypass contacts feed the cold-storage rack. Land every marker inside its amber window before the transfer alarm reaches the security desk.",
    hours:1.5,fatigue:5,edge:12,
    edgeText:"BACKUP MANIFEST RECOVERED (+12% on this file's risky legal plays)",
    success:{fx:{bold:4},txt:"The rack goes dark without a sound. Its service printer gives you a manifest proving the backup survived. The filing still needs a legal answer."},
    escape:{fx:{bold:-2},txt:"A contact spits blue light, but your coin call buys the stairwell. The manifest stays inside and this route is burned."},
    caught:{fx:{rep:-19,firm:-6,bold:-4},txt:"The transfer alarm names the rack, the door and, moments later, you. Security bags your cutters before you can invent a lawful explanation."}
  };
  return {tier:1,title:`CASE: ${a} backup preservation`,deadline:rnd([2,3]),
    body:`${a} says a failed storage migration erased the only backup relevant to discovery. ${host}, the offsite vendor, says the same thing. But exhibit G is a service invoice generated the next morning — one checksum, one sealed archive slot, and a storage fee both sides somehow forgot to redact. The backup existed after the alleged failure.`,
    opts:[
      {text:"Negotiate around the missing backup.",base:100,safe:true,ok:{fx:{bold:-3,inf:2,money:250},txt:"A narrow stipulation, a quiet invoice and no questions about the sealed archive slot."}},
      {text:"Use exhibit G — the next-day checksum proves survival.",base:72,style:"technical",ok:{fx:{rep:8,inf:7,money:1100},txt:"A checksum cannot forget on command. The court orders the backup produced."},fail:{fx:{rep:-6},txt:"They call the invoice an automated placeholder. Without the manifest, the judge wants more."}},
      {text:"Bluff: claim the vendor already gave you the manifest.",base:35,boldW:3,style:"aggressive",ok:{fx:{bold:7,inf:7,money:850},txt:"Both sides race to produce a document you never had. Now you do."},fail:{fx:{rep:-11,bold:-2},txt:"They ask for the manifest number. Your imaginary source goes very quiet."}},
      {text:"COVERT ACTION: recover the offsite backup manifest.",style:"covert",action}]};},
  // 13 — the exclusion nobody delivered
  ()=>{const a=rnd(CO),ins=rnd(CO.filter(x=>x!==a)),k=rnd([400,750,1200]);
  return {tier:1,title:`CASE: ${a} v. ${ins} (coverage)`,deadline:rnd([2,3]),
    body:`${ins} denied ${a}'s $${k}k claim under an exclusion for 'contractor error'. The exclusion is real — it appears in the renewal endorsement. What the file also shows: that endorsement was never delivered to ${a}. The certified mail receipt in exhibit D is signed by a person who left ${a} eleven months before the renewal. An exclusion nobody received is an exclusion nobody agreed to.`,
    opts:[
      {text:"Negotiate a partial payout and close it.",base:100,safe:true,ok:{fx:{inf:2,bold:-3,money:400},txt:"Half the claim, none of the fight. The exclusion lives on in their next policy."}},
      {text:"Attack delivery — the endorsement never arrived.",base:75,style:"technical",delay:rnd([1,2]),ok:{fx:{rep:8,inf:7,money:1200},txt:`The receipt is signed by a ghost. ${ins} pays the claim and quietly rewrites its mailing procedure.`},fail:{fx:{rep:-5},txt:"They produce a second receipt, signed by someone who did work there. Convenient."}},
      {text:"Threaten a bad-faith claim in the press.",base:34,boldW:3,style:"aggressive",ok:{fx:{bold:7,inf:6,money:1000},txt:"'Bad faith' is a phrase insurers pay to keep out of print. They pay."},fail:{fx:{rep:-10},txt:`${ins}'s counsel forwards your threat to the regulator. As a courtesy. To you.`}}]};},
  // 14 — the arbitration clause that nobody could afford to use
  ()=>{const a=rnd(CO),who=rnd(LAST),city=rnd(["a city two thousand miles away","the company's home state","a forum the employee has never set foot in"]);
  return {tier:1,title:`CASE: ${who} v. ${a} (arbitration)`,deadline:rnd([2,3]),
    body:`${a} wants ${who}'s wage claim thrown into arbitration. The clause exists, buried in the onboarding packet ${who} signed on day one. Read what it actually requires: arbitration in ${city}, filing fees split evenly, each side bearing its own costs — on a claim worth less than the filing fee. A forum that costs more to enter than the claim is worth is not a forum.`,
    opts:[
      {text:"Advise settling before anyone reads the clause aloud.",base:100,safe:true,ok:{fx:{inf:2,bold:-3,money:350},txt:"Quietly settled. The onboarding packet survives to trap the next hire."}},
      {text:"Argue the clause is unconscionable and unenforceable.",base:72,style:"technical",ok:{fx:{rep:8,inf:6,money:900},txt:"'A remedy you cannot afford is not a remedy.' The clause falls; the claim stays in court."},fail:{fx:{rep:-5},txt:"The court severs the fee-splitting and enforces the rest. Half a win is a loss here."}},
      {text:"Demand the whole onboarding packet be voided.",base:33,boldW:3,style:"aggressive",ok:{fx:{bold:7,inf:7,money:800},txt:`${a} settles rather than let a court look at what else is in that packet.`},fail:{fx:{rep:-10},txt:"You overreached. The court enforces the clause and notes your 'ambition'."}}]};},
  // 15 — the laptop that wiped itself on a very specific day
  ()=>{const a=rnd(CO),b=rnd(CO.filter(x=>x!==a)),who=rnd(LAST);
  const c15={tier:1,title:`CASE: ${b} document destruction`,deadline:rnd([2,3]),
    body:`${b} says the laptop was wiped by 'routine auto-deletion'. The IT ticket in exhibit K disagrees with them: the retention policy ran on a 90-day cycle for four years, and then someone disabled it by hand. February 3, ${a} sends ${b} a litigation hold letter. February 4, ${who} at ${b} opens a ticket titled 'storage cleanup'. February 6, auto-deletion is switched off. February 9, the laptop is reimaged. February 20, ${b} tells the court the data was lost 'in the ordinary course'. March 2, the same laptop is issued to a new hire.`,
    opts:[
      {text:"Accept their explanation and work around the gap.",base:100,safe:true,ok:{fx:{inf:2,bold:-4},txt:"You rebuild the timeline from emails. Slower, poorer, unremarkable."}},
      {text:"Move for a spoliation instruction.",base:70,style:"technical",ok:{fx:{rep:8,inf:7,money:1100},txt:"The jury will be told it may assume the worst about what was on that laptop. That is worth more than the laptop."},fail:{fx:{rep:-6},txt:"The court calls it negligent, not intentional, and gives you nothing but sympathy."}},
      {text:"Accuse them of obstruction in open filings.",base:33,boldW:3,style:"aggressive",ok:{fx:{bold:8,inf:7,money:900},txt:`${b} settles within the week. Nobody wants that word in a published opinion.`},fail:{fx:{rep:-11},txt:"Intent is hard to prove and you did not prove it. The word lands on you instead."}}]};
  if(rand()<.8) c15.timeline={id:"spoliation_cleanup",title:"THE CLEANUP, IN ORDER",
    body:`Before you accuse anyone of anything, lay the IT tickets end to end. ${b}'s counsel will argue coincidence, and coincidence is a question of sequence.`,
    events:[
      {id:"hold",at:1,text:`${a} sends the litigation hold letter`},
      {id:"ticket",at:2,text:`${who} opens a ticket titled 'storage cleanup'`},
      {id:"disable",at:3,text:"Auto-deletion is switched off by hand"},
      {id:"reimage",at:4,text:"The laptop is reimaged"},
      {id:"told",at:5,text:"The court is told the data was lost in the ordinary course"},
      {id:"reissue",at:6,text:"The same laptop is issued to a new hire"}]};
  return c15;},
  // 16 — the conflict their own memo admits
  ()=>{const a=rnd(CO),firm=rnd(["Snidely Fitch","Braddock & Vane","Ellory Pike LLP"]);
  const c16={tier:1,title:`CASE: ${a} — disqualify opposing counsel`,deadline:rnd([2,3]),
    body:`${firm} is representing the other side against ${a}. They also represented ${a} on this exact dispute three years ago — and their own internal conflict memo, produced by accident in a batch of exhibits, says so in the second paragraph. It even names the partner who 'does not recall the engagement'. He billed forty hours to it.`,
    opts:[
      {text:"Raise it privately and let them withdraw quietly.",base:100,safe:true,ok:{fx:{inf:3,rep:2,bold:-3},txt:`${firm} withdraws over a weekend. No motion, no headline, no leverage.`}},
      {text:"Move to disqualify, citing their own memo.",base:74,style:"technical",ok:{fx:{rep:8,inf:7,money:1000},txt:"Their memo is exhibit A to their own disqualification. The other side starts over with new counsel and a cold file."},fail:{fx:{rep:-5},txt:"They wall off the partner and the court accepts the screen. You lose a month."}},
      {text:"Report the firm to the bar association.",base:32,boldW:3,style:"aggressive",ok:{fx:{bold:7,inf:7},txt:`${firm} settles the underlying case to make the complaint go away. Everyone notices who did it.`},fail:{fx:{rep:-11},txt:"The bar finds no violation, and the profession is small. Very small."}}]};
  if(rand()<.7) c16.opts.push({text:"CASE PREP: clear our own file before it goes back.",style:"prep",
    action:{id:"generated_conflict_privilege",type:"redaction",title:`THE ${a.toUpperCase()} CONFLICT FILE`,
      body:`${firm} has asked for everything you hold on the old engagement, and it ships tonight. The rule is below; the pages are not marked.`,
      hours:1.5,fatigue:6,edge:15,
      edgeText:"PRIVILEGE HELD (+15% on this file's risky plays)",
      pages:[
        {id:"cadvice",text:`${a}'s GC to you: 'how badly does their old file hurt us?'`,priv:true},
        {id:"cmemo",text:"Your memo on whether to move or let them withdraw",priv:true},
        {id:"cnote",text:"Your note on the partner who 'does not recall' the engagement",priv:true},
        {id:"cbill",text:`${firm}'s own forty-hour billing record from three years ago`},
        {id:"cmemo2",text:"Their internal conflict memo, produced by accident"},
        {id:"cpr",text:`${a}'s CEO to their agency, copying you: 'can we use this publicly?'`},
        {id:"cengage",text:"The original engagement letter from the old matter"},
        {id:"cindex",text:"An index of the exhibit batch as produced"},
        {id:"cfee",text:"Your engagement letter's fee schedule"},
        {id:"cminutes",text:"Board minutes approving outside counsel, three years ago"}],
      success:{fx:{bold:2},txt:"The file goes back clean. They get their paper and nothing else."},
      partial:{fx:{},txt:"Most of it holds. The over-black pages draw a letter, but nothing of yours went out."},
      miss:{fx:{},txt:"Your own read on your own client's exposure is now in the hands of the firm you are trying to disqualify."}}});
  return c16;},
  // 17 — the lead plaintiff who already settled (court)
  ()=>{const a=rnd(CO),who=rnd(LAST),yrs=rnd([2,3]);
  const c17={tier:2,title:`COURT: ${who} v. ${a} (class certification)`,deadline:rnd([3,4]),judge:true,
    body:`${who} wants to represent a class of every customer ${a} overcharged. Certification turns on whether the lead plaintiff is typical of the class. Buried in ${a}'s own records: ${who} signed an individual settlement ${yrs} years ago releasing exactly these claims, for $900 and a coupon. A representative with no live claim cannot represent anyone.`,
    opts:[
      {text:"Consent to a narrow class and limit the damage.",base:100,safe:true,ok:{fx:{inf:2,bold:-3,money:500},txt:"A small class, a small settlement, a small mention in the file."}},
      {text:"Oppose certification — the lead plaintiff released these claims.",base:68,style:"technical",ok:{fx:{rep:9,inf:8,money:1500},txt:"'The representative has nothing to represent.' Certification denied. The class evaporates."},fail:{fx:{rep:-6},txt:"They substitute a new lead plaintiff by Friday. You bought a week."}},
      {text:"Argue the whole action was manufactured by counsel.",base:34,boldW:3,style:"aggressive",ok:{fx:{bold:8,inf:8,money:1200},txt:"The court asks plaintiff's counsel some very slow questions. The action is dismissed."},fail:{fx:{rep:-12},txt:"Accusing a colleague of manufacturing a class action requires proof. You had a theory."}}]};
  if(rand()<.7) c17.objection={id:"class_examination",title:`THE ${who.toUpperCase()} EXAMINATION`,
    body:`Plaintiff's counsel is walking ${who} through why she is typical of the class. Object while a question is standing — the bench decides certification and it is listening to you as much as to her.`,
    lines:[
      {id:"c1",text:"'You bought the product in question, correct?'"},
      {id:"c2",text:"'And you would say the charge felt unfair to you, wouldn't you?'",bad:true,tag:"leading"},
      {id:"c3",text:"'What did the invoice say?'"},
      {id:"c4",text:"'Other customers told you they were charged the same. Is that right?'",bad:true,tag:"hearsay"},
      {id:"c5",text:"'Describe the day you noticed the charge.'"},
      {id:"c6",text:`'Why did ${a} decide to hide the fee from customers like you?'`,bad:true,tag:"assumes facts not in evidence"},
      {id:"c7",text:"'Is this your signature on the account agreement?'"},
      {id:"c8",text:"'What do you think the other class members would want here?'",bad:true,tag:"calls for speculation"},
      {id:"c9",text:"'Did you read the settlement you signed?'"},
      {id:"c10",text:"'You will sign anything with a cheque attached, won't you?'",bad:true,tag:"argumentative"}]};
  return c17;},
  // 18 — the expert whose credential does not exist (court)
  ()=>{const a=rnd(CO),who=rnd(LAST),field=rnd(["forensic accounting","materials failure","valuation"]);
  const c18={tier:2,title:`COURT: ${a} — exclude the ${field} expert`,deadline:rnd([3,4]),judge:true,
    body:`The other side's ${field} expert, Dr. ${who}, has a CV that does not survive a phone call. It lists a board certification the issuing body says it has never awarded to anyone by that name; the same methodology was excluded in two prior cases; and his report cites a dataset he describes as 'proprietary and unavailable for review'. An opinion nobody can check is not evidence.`,
    opts:[
      {text:"Cross-examine him at trial and hope the jury notices.",base:100,safe:true,ok:{fx:{inf:2,bold:-3},txt:"You save it for cross. Juries forgive experts more than judges do."}},
      {text:"Move to exclude — unverifiable method, phantom credential.",base:70,style:"technical",ok:{fx:{rep:9,inf:8,money:1400},txt:"Excluded. Their damages case leaves with him."},fail:{fx:{rep:-6},txt:"The court lets him testify and says the CV goes to weight, not admissibility."}},
      {text:"Accuse him of perjury on his own CV.",base:32,boldW:3,style:"aggressive",ok:{fx:{bold:8,inf:8,money:1100},txt:"He withdraws from the case before the hearing. And from two others."},fail:{fx:{rep:-12},txt:"Calling an expert a liar in open court without the issuing body's letter is a choice. You made it."}}]};
  if(rand()<.7) c18.opts.push({text:"CASE PREP: chart the CV against what the file proves.",style:"prep",
    action:{id:"generated_expert_contradictions",type:"contradiction",title:`DR. ${who.toUpperCase()}'S CV`,
      body:"He swore to his qualifications in a declaration. The bundle disagrees with him in several places. Pin each claim to the page that ends it — and leave the pages that prove nothing alone.",
      hours:1.5,fatigue:6,edge:15,
      edgeText:"CONTRADICTION CHART COMPLETE (+15% on this file's risky legal plays)",
      pairs:[
        {id:"board",statement:"'I hold board certification in this field.'",
          document:"The issuing body's letter: no such certification has ever been awarded"},
        {id:"method",statement:"'My methodology has never been challenged.'",
          document:"Two prior orders excluding the same method by name"},
        {id:"data",statement:"'All underlying data is available for review.'",
          document:"His own report calling the dataset proprietary and unavailable"},
        {id:"neutral",statement:"'I have no financial relationship with the parties.'",
          document:"An invoice showing a contingent bonus on the outcome"},
        {id:"teaching",statement:"'I taught this subject for a decade.'",
          document:"The university's registrar: one guest lecture, one semester"},
        {id:"peer",statement:"'My paper was peer reviewed.'",
          document:"The journal's retraction notice for that paper"}],
      decoys:[
        {id:"parking",text:"His parking receipt from the deposition"},
        {id:"cvcover",text:"The covering email attaching the CV"},
        {id:"hotel",text:"A hotel folio from the conference he cites"}],
      success:{fx:{bold:2},txt:"Every line of that CV now has a document sitting on top of it."},
      partial:{fx:{},txt:"Part of the chart holds. The rest you would not put in front of a judge."},
      miss:{fx:{bold:-2},txt:"The CV survives the afternoon. You spent the hours and proved nothing."}}});
  return c18;},

  // 19 — the guarantee nobody signed twice
  ()=>{const a=rnd(CO),b=rnd(CO.filter(x=>x!==a)),who=rnd(LAST),m=rnd([250,400,650,900]);
  return {tier:1,title:`CASE: ${a} personal guarantee`,deadline:rnd([2,3]),
    body:`${a} wants ${money(m*1000)} from ${who} personally on a guarantee for ${b}'s debts. The guarantee is signed. It is also witnessed by ${who}'s own spouse, which the statute does not allow, and the attestation clause was left blank and filled in later in a different pen. ${a}'s file also contains a properly executed guarantee from a DIFFERENT director, for a smaller sum, which nobody has mentioned.`,
    opts:[
      {text:"Negotiate a payment plan on the full amount.",base:100,safe:true,ok:{fx:{inf:2,bold:-4},txt:"Your client pays for years on a document that would not have survived an afternoon."}},
      {text:`Challenge the attestation: a spouse cannot witness this.`,base:80,style:"technical",ok:{fx:{rep:7,inf:6,money:1500},txt:`Unenforceable on its face. ${a}'s counsel had not read past the signature either.`},fail:{fx:{rep:-5},txt:"The bench wants evidence on the pen. That means a handwriting expert and six weeks."}},
      {text:"Point at the other director's guarantee and let them chase him.",base:38,boldW:3,style:"aggressive",ok:{fx:{rep:8,inf:8,money:1900},txt:"They had a good guarantee from someone else the whole time. Now they know it too."},fail:{fx:{rep:-10},txt:"You have handed them a second defendant and kept the first. Yours."}}]};},

  // 20 — the non-compete that follows a firing
  ()=>{const a=rnd(CO),who=rnd(LAST),mo=rnd([6,12,18,24]),km=rnd([25,50,100]);
  return {tier:1,title:`CASE: ${a} restraint of trade`,deadline:rnd([2,3]),
    body:`${a} is enforcing a ${mo}-month, ${km}km non-compete against ${who}, who they made redundant. The clause is wide, but the interesting page is the redundancy letter: it terminates the contract 'with immediate effect and no further obligation on either party'. There is also an unsigned draft with a ${Math.round(mo/2)}-month restraint, an email calling the wide version 'aspirational', and a colleague who left last year under the same clause and now works across the road.`,
    opts:[
      {text:"Advise the client to sit out the restraint period.",base:100,safe:true,ok:{fx:{inf:2,bold:-4},txt:`${mo} months of not working, to honour a clause nobody was going to enforce properly.`}},
      {text:"Argue the redundancy letter released the obligation.",base:79,style:"technical",ok:{fx:{rep:7,inf:6,money:1300},txt:"'No further obligation on either party' is a sentence with consequences. They wrote it."},fail:{fx:{rep:-5},txt:"'Boilerplate,' says the bench, and reads the restraint on its own terms."}},
      {text:"Take the injunction hearing and dare them to explain the colleague.",base:35,boldW:3,style:"aggressive",judge:true,ok:{fx:{rep:9,inf:9,money:1800},txt:"A restraint you enforce against one person and not another is not a restraint. It is a grudge."},fail:{fx:{rep:-11},txt:"The colleague's contract was different in a way you had not checked. In open court."}}]};},

  // 21 — the shareholder squeeze-out
  ()=>{const a=rnd(CO),who=rnd(LAST),pct=rnd([8,12,15]);
  return {tier:2,title:`COURT: ${a} minority petition`,deadline:rnd([3,4]),judge:true,
    body:`${who} holds ${pct}% of ${a} and has been removed from the board, taken off the payroll, and left out of a dividend the majority voted themselves. The articles permit all of it. The minutes do not: the board resolution removing ${who} is dated a Tuesday, and the notice convening that meeting was posted the Thursday after. Also in the bundle: a valuation commissioned by the majority, a text about 'making it uncomfortable enough', and three years of dividends that were never paid to anyone.`,
    opts:[
      {text:"Take the majority's valuation and exit.",base:100,safe:true,ok:{fx:{inf:2,bold:-5,money:600},txt:"Sold at their number. Their number was always going to be their number."}},
      {text:"Attack the resolution: notice was served after the meeting.",base:77,style:"technical",ok:{fx:{rep:8,inf:7,money:2000},txt:"A meeting nobody was properly called to did not remove anyone. Everything after it unravels."},fail:{fx:{rep:-6},txt:"The majority ratify it at a properly convened meeting the following week. Neatly done."}},
      {text:"Plead unfair prejudice and put the text message in the petition.",base:34,boldW:3,style:"aggressive",ok:{fx:{rep:10,inf:10,money:2600},txt:"'Uncomfortable enough' becomes the most quoted phrase in the judgment."},fail:{fx:{rep:-12},txt:"A blunt text is not a course of conduct. The petition is struck out in part, loudly."}}]};},

  // 22 — the expert who was paid by the outcome
  ()=>{const a=rnd(CO),b=rnd(CO.filter(x=>x!==a)),who=rnd(LAST);
  return {tier:2,title:`COURT: ${a} v. ${b} — expert challenge`,deadline:rnd([3,4]),judge:true,
    body:`${b}'s entire case rests on an engineering report by ${who}. The report is competent. The retainer behind it is not: it provides for a 'success supplement' payable only if ${b} prevails, which makes the expert a party with a chair. ${who}'s CV is also two lines longer than the version he gave a tribunal in March. The bundle holds his invoice, the retainer, and a polite letter from ${b}'s solicitors asking him to 'reconsider paragraph 41'.`,
    opts:[
      {text:"Instruct your own expert and fight it on the engineering.",base:100,safe:true,ok:{fx:{inf:3,bold:-4,money:-800},txt:"Two experts, one judge, and a great deal of money spent agreeing to disagree."}},
      {text:`Move to exclude ${who}: a contingent expert is not an expert.`,base:76,style:"technical",ok:{fx:{rep:8,inf:7,money:2100},txt:"The retainer does the work. Without the report, there is very little case left."},fail:{fx:{rep:-6},txt:"The bench admits it and says weight is a matter for trial. Now you must actually try it."}},
      {text:"Cross-examine him on paragraph 41 and the letter that asked for it.",base:33,boldW:3,style:"aggressive",ok:{fx:{rep:11,inf:9,money:2500},txt:"He reconsidered it in writing, for money. He says so himself, twice."},fail:{fx:{rep:-12},txt:"He reconsidered it because he was wrong, and he explains why for twenty minutes."}}]};},

  // 23 — the insurance notification clause
  ()=>{const a=rnd(CO),days=rnd([14,21,30]),m=rnd([300,500,800]);
  return {tier:1,title:`CASE: ${a} coverage denial`,deadline:rnd([2,3]),
    body:`${a}'s insurer has refused a ${money(m*1000)} claim because notification came ${days+9} days after the incident and the policy says ${days}. The incident report, however, is dated by the loss adjuster the insurer sent — and the adjuster's own visit log shows he attended on day four. There is also a broker's email confirming notification 'as discussed' on day two, an endorsement extending the window that nobody applied, and a previous late claim the same insurer paid without comment.`,
    opts:[
      {text:"Accept the denial and claim on the broker's negligence instead.",base:100,safe:true,ok:{fx:{inf:2,bold:-4},txt:"You sue the broker. It works, slowly, and your client's premium doubles anyway."}},
      {text:"Rely on the adjuster's own visit log: they knew on day four.",base:81,style:"technical",ok:{fx:{rep:7,inf:6,money:1700},txt:"An insurer who sent someone to look cannot say it was never told."},fail:{fx:{rep:-5},txt:"An adjuster's visit is not notification under the policy, says the file handler, and means it."}},
      {text:"Allege waiver on the earlier claim they paid late.",base:36,boldW:3,style:"aggressive",judge:true,ok:{fx:{rep:9,inf:8,money:2200},txt:"They chose to pay the last one. The bench finds it hard to call this one a rule."},fail:{fx:{rep:-11},txt:"One indulgence is not a course of dealing. The judgment says that in bold."}}]};},

  // 24 — the AI-drafted brief nobody checked
  ()=>{const a=rnd(CO),b=rnd(CO.filter(x=>x!==a)),n=rnd([2,3,4]);
  return {tier:2,title:`COURT: ${a} v. ${b} — the citation problem`,deadline:rnd([3,4]),judge:true,
    body:`${b}'s skeleton argument cites ${n} authorities that do not exist. Not misreported — invented, with plausible names, plausible years and plausible page numbers. Their junior filed it; their partner signed it. The bundle also contains the partner's covering email ('looks fine, file it'), a court order requiring verification of authorities that predates the filing, and one real case, correctly cited, that happens to support you.`,
    opts:[
      {text:"Write privately and let them withdraw it.",base:100,safe:true,ok:{fx:{inf:3,bold:-3,rep:2},txt:"They withdraw it quietly and remember you as decent. That is worth something, later."}},
      {text:"File a note listing the fictional authorities.",base:78,style:"technical",ok:{fx:{rep:8,inf:7,money:1400},txt:"You are neutral, precise and devastating. The bench does the rest."},fail:{fx:{rep:-5},txt:"They correct it before the hearing and thank you, warmly, in front of the judge."}},
      {text:"Apply for wasted costs against the partner who signed it.",base:32,boldW:3,style:"aggressive",ok:{fx:{rep:10,inf:10,money:2400},txt:"'Looks fine, file it' is read aloud. The costs order has his name on it."},fail:{fx:{rep:-12},txt:"The bench dislikes the fiction and dislikes your application more. Both firms are spoken to."}}]};},
];

export const TEMPLATE_COUNT=TEMPLATES.length;

export function genCase(){
  const c=rnd(TEMPLATES)();
  c.id=nextId("gen");
  return dressExaminations(c);
}

/* Draw one NAMED template instead of a random one. Used by the dev panel so a
   specific filing can be summoned without rolling the docket for it. */
export function genCaseFrom(index){
  const i=Math.max(0,Math.min(TEMPLATES.length-1,Math.trunc(Number(index))||0));
  const c=TEMPLATES[i]();
  c.id=nextId("gen");
  return dressExaminations(c);
}

/* THE {CLIENT} WAR — a retained client's existential, three-stage matter
   spanning weeks (stages chain via next:{after,...}). Each stage offers the
   same dilemma: settle safe and end the war small, or press on. Winning the
   final trial pays big and DOUBLES the client's retainer. */
export function buildBigMatter(client){
  const CU=client.toUpperCase();
  const rival=rnd(["their biggest competitor","a patent troll named Litigious Minds LLC","a former co-founder with a grudge and a war chest"]);
  const s3={id:nextId("big3_"),tier:2,judge:true,deadline:4,big:{client,stage:3,final:true},
    title:"THE "+CU+" WAR — FINAL TRIAL",
    body:"Weeks of billing, condensed: everything "+client+" is rides on this verdict. "+rival.charAt(0).toUpperCase()+rival.slice(1)+" brought their A-team; Snidely Fitch brought extra chairs. Your trial binder has a cracked spine and a page 1 you could recite underwater. The jury looks the way juries look: unknowable.",
    opts:[
      {text:"Read the record into the ground. Method wins wars.",base:64,style:"technical",
        ok:{fx:{rep:8,inf:14,money:2500,firm:4},client:{boost:client},txt:"Verdict: "+client+", on every count. Their GC cries the way billable people rarely cry. RETAINER: DOUBLED."},
        fail:{fx:{rep:-8,money:-800,firm:-4},txt:"The jury preferred their story. Weeks of war, one flat sentence."}},
      {text:"Close with theater. Juries remember feelings.",base:42,boldW:3,style:"aggressive",
        ok:{fx:{bold:9,inf:15,money:2200,firm:4},client:{boost:client},txt:"Your closing gets quoted in a trade magazine. "+client+" signs whatever you slide across the table. RETAINER: DOUBLED."},
        fail:{fx:{rep:-11,money:-800,firm:-5},txt:"The theater flopped on the only stage that matters."}},
      {text:"Take the eleventh-hour settlement.",base:100,safe:true,
        ok:{fx:{inf:5,money:900,bold:-4},txt:"Signed at the courthouse door. "+client+" survives. Nobody toasts."}}]};
  const s2={id:nextId("big2_"),tier:2,judge:true,deadline:3,big:{client,stage:2},
    title:"THE "+CU+" WAR — THE INJUNCTION",
    body:"Stage two: "+rival+" wants a preliminary injunction freezing "+client+"'s operations. Their 'irreparable harm' affidavit is signed by an executive who posted 'WE ARE CRUSHING IT' the same week — the screenshot sits in exhibit 12, timestamped, glorious.",
    opts:[
      {text:"Consent to narrow terms. End the war here.",base:100,safe:true,
        ok:{fx:{inf:4,money:700,bold:-3},txt:"A coexistence agreement. The war fizzles. "+client+" keeps trading; you keep the fee."}},
      {text:"Exhibit 12. Read the post aloud. Slowly.",base:66,style:"technical",
        ok:{fx:{rep:7,inf:8,money:1100},txt:"'Irreparable harm,' you repeat, over the executive's own caps lock. Injunction denied.",
          next:{after:4,note:"Denied their injunction — now "+rival+" wants blood. THE "+CU+" WAR heads to trial.",case:s3}},
        fail:{fx:{rep:-7,firm:-2},txt:"The judge grants a partial freeze. "+client+"'s GC uses the word 'concerning' twice."}},
      {text:"Move for sanctions over the fake affidavit.",base:40,boldW:3,style:"aggressive",
        ok:{fx:{bold:7,inf:9,money:900},txt:"Sanctions granted. Their affidavit is now a cautionary tale taught at CLEs.",
          next:{after:4,note:"Humiliated, "+rival+" goes all-in. THE "+CU+" WAR heads to trial.",case:s3}},
        fail:{fx:{rep:-9,firm:-2},txt:"'Bold theory, counsel.' The sanctions motion boomerangs into the record."}}]};
  return {id:nextId("big1_"),tier:1,deadline:3,big:{client,stage:1},
    title:"THE "+CU+" WAR — OPENING SHOTS",
    body:rival.charAt(0).toUpperCase()+rival.slice(1)+" just hit "+client+" — your client — with a 300-page complaint. Buried at paragraph 214: their core claim quotes a contract clause from a DRAFT that was never executed. The signed version, which you have, reads differently. Snidely Fitch's name is on the cover page, naturally.",
    opts:[
      {text:"Settle quietly before it becomes a war.",base:100,safe:true,
        ok:{fx:{inf:4,money:600,bold:-3},txt:"Paid, sealed, forgotten. "+client+" grumbles about the terms but keeps the retainer flowing."}},
      {text:"Paragraph 214 vs. the EXECUTED version.",base:70,style:"technical",
        ok:{fx:{rep:6,inf:7,money:900},txt:"You table the signed contract. Their 300 pages depend on 12 words that don't exist.",
          next:{after:4,note:rival.charAt(0).toUpperCase()+rival.slice(1)+" regroups and refiles. THE "+CU+" WAR: stage two approaches.",case:s2}},
        fail:{fx:{rep:-6},txt:"They claim the draft 'reflects intent'. The judge wants briefing. The war footing costs "+client+" real money."}},
      {text:"Countersue for tortious interference. Loudly.",base:40,boldW:3,style:"aggressive",
        ok:{fx:{bold:6,inf:8,money:700},txt:"Your countersuit makes two trade publications before lunch.",
          next:{after:4,note:"Blood is in the water on both sides. THE "+CU+" WAR: stage two approaches.",case:s2}},
        fail:{fx:{rep:-9,firm:-2},txt:"The countersuit reads as panic. Fitch's reply brief is one page and devastating."}}]};
}

/* Fired employees sue the firm (Name Partner endgame). fx.firm hits your
   firm-health stat; the plaintiff's counsel is, of course, Snidely Fitch. */
export function buildLawsuit(exName){
  return {id:nextId("suit"), tier:2, judge:true, deadline:3, suit:true,
    title:`LAWSUIT: ${exName} v. Parson Henderson`,
    body:`${exName} — whom you personally fired — is suing the firm for wrongful termination. Their counsel is Snidely Fitch, working "at a compassionate discount". The complaint quotes your own security-escort policy back at you, and asks for damages with a number of zeroes that suggests a grudge.`,
    opts:[
      {text:"Settle quietly. Ex-employees talk.",base:100,safe:true,ok:{fx:{money:-1200,firm:-2},txt:"Paid, sealed, forgotten by everyone except accounting."}},
      {text:"Fight it — the termination file is clean.",base:62,style:"technical",ok:{fx:{rep:4,firm:3},txt:"Documented, dated, dismissed. The firm looks bulletproof. For now."},fail:{fx:{money:-2000,firm:-6,rep:-5},txt:"HR's paperwork had a gap the size of a verdict."}},
      {text:"Countersue for breach of exit NDA.",base:34,boldW:2,style:"aggressive",ok:{fx:{firm:5,inf:5},txt:"The countersuit lands. Word spreads: leaving loudly is expensive."},fail:{fx:{rep:-9,firm:-8,money:-1500},txt:"The jury liked them better. Juries usually like the fired ones better."}}]};
}
