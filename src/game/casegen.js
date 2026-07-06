// Procedural case generator — NO network, NO API key. Cases are assembled from
// templates + name/number pools at runtime, so every machine can generate fresh
// cases forever. Output matches the hand-written case schema exactly (CLAUDE.md §7);
// the winning clue is always embedded in the body text among decoys.
import { rnd } from "./utils.js";

const CO=["Meridian","Halcyon","Aldergate","Novagene","Brightline","Pemberton","Vantage Corp","Ironclad Ltd","Bluepeak","Rockwell & Sons","Silvergate","Osprey Holdings"];
const LAST=["Whitfield","Okafor","Delgado","Kessler","Yamada","Brandt","O'Leary","Novak","Reyes","Ashford","Lindqvist","Moreau"];
const money=n=>"$"+n.toLocaleString("en-US");
let seq=0;

/* Each template returns a full case object. Tier decides deadline + reward scale. */
const TEMPLATES=[
  // 1 — the misplaced liability cap
  ()=>{const a=rnd(CO),b=rnd(CO.filter(x=>x!==a)),p=140+Math.floor(Math.random()*220),m=rnd([5,10,20,50]);
  return {tier:1,title:`CASE: ${a}-${b} agreement review`,deadline:rnd([2,3]),
    body:`Proofread the ${a}-${b} master agreement overnight. The recitals misspell '${b}' twice, which is embarrassing but harmless. Buried on page ${p}: the liability cap reads ${money(m*1000)} where every prior draft said ${money(m*1000000)}. Nobody else has read page ${p}.`,
    opts:[
      {text:"Sign off with a polite note on the typos.",base:100,safe:true,ok:{fx:{inf:2,bold:-3},txt:"Noted, filed, forgotten. Like you."}},
      {text:`Flag the ${money(m*1000)} cap on page ${p}.`,base:84,style:"technical",ok:{fx:{rep:6,inf:5,money:500},txt:`You just saved the client ${money(m*1000000-m*1000)}. A partner mispronounces your name approvingly.`},fail:{fx:{rep:-4},txt:"You flagged it in the redline nobody opened. The clean copy shipped."}},
      {text:"Hold the page hostage for a better assignment.",base:35,boldW:3,style:"aggressive",ok:{fx:{bold:7,inf:6},txt:"Blackmail is such an ugly word. 'Leverage' billed beautifully."},fail:{fx:{rep:-9},txt:"The partner finds page "+p+" himself. At 2am. Your move was noticed."}}]};},
  // 2 — the signer with no authority
  ()=>{const a=rnd(CO),who=rnd(["a Vice President","an 'Interim Director'","a regional manager"]);
  return {tier:1,title:`CASE: ${a} contract dispute`,deadline:rnd([2,3]),
    body:`${a} wants out of a supply contract. Their file is a mess of routing slips and one furious sticky note. Exhibit C is the gem: the contract was signed by ${who} of the counterparty who, under their own bylaws attached as Exhibit F, had no signing authority that quarter. Opposing counsel attached Exhibit F themselves.`,
    opts:[
      {text:"Negotiate a quiet exit fee.",base:100,safe:true,ok:{fx:{bold:-3,inf:2,money:300},txt:"Everyone pays a little. Everyone forgets you a little."}},
      {text:"Move to void — no signing authority.",base:76,style:"technical",delay:rnd([1,2]),ok:{fx:{rep:7,inf:7,money:1100},txt:"Void ab initio. Opposing counsel stares at their own Exhibit F in silence."},fail:{fx:{rep:-5},txt:"A ratification memo surfaces. Signed by someone with ACTUAL authority. Ouch."}},
      {text:"Bluff: 'We have three more exhibits like this.'",base:36,boldW:3,style:"aggressive",delay:1,ok:{fx:{bold:6,inf:5,money:700},txt:"They settle overnight. There were no other exhibits. There didn't need to be."},fail:{fx:{rep:-9,bold:-2},txt:"'Show us,' they said. You could not show them."}}]};},
  // 3 — filed too late (court; the dismissal may get appealed → multi-stage)
  ()=>{const a=rnd(CO),b=rnd(CO.filter(x=>x!==a)),d=rnd([1,2,3]),ex=rnd(["their CEO was 'at a wellness retreat'","their server 'ate the draft'","their counsel 'misread a calendar'"]);
  const c={tier:2,title:`COURT: ${a} v. ${b}`,deadline:rnd([3,4]),judge:true,
    body:`Motion to dismiss. ${a}'s complaint hit the docket ${d} day(s) AFTER the statute of limitations ran out — their tolling argument is that ${ex}. The filing stamp doesn't care. Sympathy might.`,
    opts:[
      {text:"Consent to proceed on the merits.",base:100,safe:true,ok:{fx:{bold:-3,inf:2},txt:"Trial ahead. The safe road is long and unpaid."}},
      {text:"The deadline is the deadline. Cold math.",base:66,style:"technical",ok:{fx:{rep:8,inf:8,money:1400},txt:"'The calendar does not do wellness.' Dismissed. HENDERED."},fail:{fx:{rep:-6},txt:"Tolled anyway. The judge calls your argument 'correct, and unlikable'."}},
      {text:"Mock the excuse in open court.",base:37,boldW:3,style:"aggressive",ok:{fx:{bold:8,inf:7,money:1000},txt:"The gallery laughs. The judge doesn't, but rules your way anyway."},fail:{fx:{rep:-11},txt:"The judge finds the excuse 'sincere' and your tone 'sanctionable'."}}]};
  if(Math.random()<.5){ const yrs=rnd([2,3,4]); // half the time the loser appeals — a follow-up stage
    c.opts[1].ok.next={after:2,note:`${a}'s counsel promises an appeal. Loudly, near a camera.`,case:{
      tier:2,title:`APPEAL: ${a} v. ${b}`,deadline:3,judge:true,
      body:`${a} appeals the dismissal. The centerpiece citation of their brief was overturned ${yrs} years ago — some associate copied it from an old memo and nobody checked. Appellate panels notice that sort of thing. Usually.`,
      opts:[
        {text:"Rest on the record. Add nothing.",base:100,safe:true,ok:{fx:{inf:3,bold:-2,money:300},txt:"Affirmed without oral argument. The quiet win nobody toasts."}},
        {text:"Flag the dead citation for the panel.",base:70,style:"technical",ok:{fx:{rep:9,inf:8,money:1500},txt:"The panel's opinion opens with your footnote. Affirmed, with a side of humiliation for them."},fail:{fx:{rep:-6},txt:"The panel reverses on other grounds and thanks you for the 'trivia'."}},
        {text:"Demand sanctions for the sloppy brief.",base:35,boldW:3,style:"aggressive",ok:{fx:{bold:7,inf:8,money:1100},txt:"Sanctioned. Their appellate team updates its citation software the same afternoon."},fail:{fx:{rep:-10},txt:"'Everyone miscites, counsel. Even you. Page six.' You do not look at page six."}}]}};
  }
  return c;},
  // 4 — the impossible witnesses (court)
  ()=>{const who=rnd(LAST),place=rnd(["on a cruise in international waters","at a silent retreat with no visitors' log","courtside at a playoff game, on camera"]);
  return {tier:2,title:`COURT: In re ${who} estate`,deadline:rnd([3,4]),judge:true,
    body:`A contested will leaves everything to a ${rnd(["life coach","reptile sanctuary","'spiritual adviser'","golf instructor"])}. The 'final' will has two witnesses — both of whom, per the attached statements, were ${place} on the signing date. Social media agrees with the geography, not the will.`,
    opts:[
      {text:"Broker a settlement split.",base:100,safe:true,ok:{fx:{bold:-2,inf:2,money:400},txt:"Everyone unhappy in equal shares. Textbook."}},
      {text:"Present the location evidence. Void the will.",base:74,style:"technical",ok:{fx:{rep:8,inf:7,money:1300},txt:"Exhibit A: a timestamped photo. The will folds like a beach chair."},fail:{fx:{rep:-5},txt:"One witness signed remotely — legal here since '21. The other one you never checked."}},
      {text:"Accuse the beneficiary of undue influence.",base:38,boldW:3,style:"aggressive",ok:{fx:{bold:7,inf:7,money:900},txt:"They confess to 'manifesting the estate'. On the record."},fail:{fx:{rep:-10},txt:"No evidence, just vibes. The judge bills you for the vibes."}}]};},
  // 5 — two versions of the same report
  ()=>{const a=rnd(CO),m=rnd([1,2,3]);
  return {tier:1,title:`CASE: ${a} audit prep`,deadline:rnd([2,3]),
    body:`Prep the ${a} CFO for deposition. The binder holds two versions of the same expense report: one signed BEFORE the audit, one after — with ${money(m*1000000)} quietly reclassified to 'consulting'. Their counsel included both copies. By accident, presumably.`,
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
];

export function genCase(){
  const c=rnd(TEMPLATES)();
  c.id="gen"+(++seq);
  return c;
}
