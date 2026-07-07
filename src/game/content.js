// All hand-written game content: cases, judges, crises, scenarios.
// Case/option schema (AI-generated cases must match it too — CLAUDE.md §7):
// { id, tier, title, deadline, judge?, body, opts:[
//   { text, base, boldW?, style?, safe?, delay?, ok:{fx,txt}, fail:{fx,txt} } ] }
import { S } from "./state.js";

export function buildPool(){
  const P=[];
  P.push({id:"coffee",tier:0,title:"MEMO: Hardwick wants coffee",deadline:2,
    body:"Senior Partner Daniel Hardwick requires a triple espresso, two sugars, NOW. He also 'suggests' you carry his dry cleaning up 14 floors. The elevator is, as always, 'for partners'.",
    opts:[
      {text:"Do it all. Perfectly. Smile.",base:100,safe:true,ok:{fx:{inf:3,bold:-3},txt:"Hardwick grunts approval. You smell like espresso and shame."}},
      {text:"Send the intern, take the credit.",base:60,boldW:1,ok:{fx:{inf:3,bold:2},txt:"The intern delivers. Hardwick thinks you're 'efficient'."},fail:{fx:{rep:-6},txt:"The intern brought decaf. DECAF. Hardwick knows it was you."}},
      {text:"'I'm a lawyer, not a barista.'",base:25,boldW:3,style:"aggressive",ok:{fx:{bold:8,inf:4},txt:"Hardwick smirks: 'Finally, a spine.' He hands the cup to someone else."},fail:{fx:{rep:-10},txt:"'You're whatever I say you are.' The whole floor heard it."}}]});
  P.push({id:"proof",tier:0,title:"Doc review: Meridian merger (300 pages)",deadline:2,
    body:"Proofread the Meridian-Colt merger agreement overnight. Buried on page 212: the indemnification clause caps liability at $10 THOUSAND instead of $10 MILLION. Also the arbitration clause cites Delaware law twice, which is ugly but harmless.",
    opts:[
      {text:"Flag the indemnification cap typo.",base:92,style:"technical",ok:{fx:{rep:6,inf:4,money:500},txt:"You just saved the client $9,990,000. Someone learns your name."},fail:{fx:{rep:-3},txt:"You flagged it... in the wrong draft. Close, but no bonus."}},
      {text:"Flag the double Delaware citation.",base:30,ok:{fx:{inf:1},txt:"Technically a fix. Nobody cares."},fail:{fx:{rep:-8},txt:"The $10k cap ships. The client's GC calls at 6am. Screaming."}},
      {text:"Sign off. It's 3am. It's fine.",base:45,boldW:1,ok:{fx:{bold:2},txt:"Nothing explodes. This time."},fail:{fx:{rep:-10},txt:"The $10k cap ships. It is not fine."}}]});
  P.push({id:"courier",tier:0,title:"Errand: hand-deliver to Snidely Fitch",deadline:1,
    body:"Deliver a sealed settlement offer to rival firm Snidely Fitch. Their associate smirks: 'Leave it with reception, junior.' You notice their conference room whiteboard through the glass — it lists YOUR client's witnesses.",
    opts:[
      {text:"Leave it. See nothing. Go home.",base:100,safe:true,ok:{fx:{bold:-2,inf:1},txt:"Delivered. Whatever was on that whiteboard stays there."}},
      {text:"Memorize the witness list first.",base:55,boldW:2,ok:{fx:{bold:4,inf:5},txt:"You recite it to Hardwick from memory. 'Huh,' he says. High praise."},fail:{fx:{rep:-8},txt:"They catch you staring and file a complaint about 'the lurking associate'."}},
      {text:"'Nice whiteboard. Shame if someone photographed it.'",base:20,boldW:3,style:"aggressive",ok:{fx:{bold:6,inf:6},txt:"Their associate panics and reveals more than the board did."},fail:{fx:{rep:-12},txt:"Their name partner calls YOUR name partner. Bad day."}}]});
  P.push({id:"nda",tier:1,title:"CASE: Kessler NDA breach",deadline:3,
    body:"Client Kessler Corp is being sued for breaching an NDA. Reading the file: the NDA was signed by a Vice President of the counterparty who — per exhibit C — had NO signing authority under their own bylaws. Opposing counsel hasn't noticed.",
    opts:[
      {text:"Settle quietly. Client pays, moves on.",base:100,safe:true,ok:{fx:{bold:-4,inf:2,money:300},txt:"Settled. Cheap-ish. Nobody's impressed, nobody's fired."}},
      {text:"Move to void the NDA — no signing authority.",base:78,style:"technical",delay:2,ok:{fx:{rep:8,inf:7,money:1200},txt:"The NDA is VOID. Opposing counsel visibly ages five years."},fail:{fx:{rep:-5},txt:"They produce a ratification memo. Ouch. Should've dug deeper."}},
      {text:"Bluff: threaten a defamation countersuit.",base:35,boldW:3,style:"aggressive",delay:1,ok:{fx:{bold:6,inf:5,money:800},txt:"They fold. Your bluff had absolutely no legal basis. Beautiful."},fail:{fx:{rep:-10,bold:-2},txt:"They call the bluff and read your empty threat aloud in a meeting."}}]});
  P.push({id:"depo",tier:1,title:"CASE: Vance deposition prep",deadline:3,
    body:"Depose the CFO of Vance Industries. The file shows two versions of the same expense report — one signed BEFORE the audit, one after, with $2M moved to 'consulting'. The CFO's lawyer is a screamer from Snidely Fitch.",
    opts:[
      {text:"Ask soft questions. Preserve the relationship.",base:100,safe:true,ok:{fx:{bold:-3,inf:1},txt:"A polite, useless deposition. The partners yawn."}},
      {text:"Walk him into contradicting the two reports.",base:70,style:"technical",ok:{fx:{rep:7,inf:6,money:900},txt:"'So which signature is yours?' Silence. Checkmate."},fail:{fx:{rep:-6},txt:"He lawyered up mid-sentence. The screamer screamed. You blinked."}},
      {text:"Slam the reports on the table. Theater.",base:40,boldW:3,style:"aggressive",ok:{fx:{bold:7,inf:6,money:700},txt:"He cracks on camera. The clip circulates the firm. You've been promoted in spirit."},fail:{fx:{rep:-9},txt:"He calmly explains the discrepancy. You slammed paper for nothing."}}]});
  P.push({id:"court1",tier:2,title:"COURT: Halcyon v. Kessler (motion day)",deadline:4,
    body:"Argue a motion to dismiss. Halcyon's complaint was filed one day AFTER the statute of limitations expired — but they'll argue 'equitable tolling' because their CEO was hospitalized. Sympathy vs. calendar math.",
    judge:true,
    opts:[
      {text:"Consent to proceed on merits. Play it safe.",base:100,safe:true,ok:{fx:{bold:-3,inf:2},txt:"Motion withdrawn. Trial ahead. The safe road is long."}},
      {text:"Argue the deadline is the deadline. Cold math.",base:65,style:"technical",
        ok:{fx:{rep:9,inf:8,money:1500},txt:"'Sympathy does not toll a statute.' Case dismissed. HENDERED.",
          next:{after:2,note:"Halcyon's counsel filed the appeal before the ink dried.",case:{
            id:"court1b",tier:2,title:"APPEAL: Halcyon v. Kessler",deadline:3,judge:true,
            body:"Halcyon appeals the dismissal, arguing 'excusable neglect'. Their appellate brief leans entirely on Rourke v. Dunmore — a precedent that was overturned two years ago. Nobody on their team checked the citation history. You did. Just now.",
            opts:[
              {text:"Rest on the record. Say as little as possible.",base:100,safe:true,ok:{fx:{inf:3,bold:-2,money:300},txt:"The panel affirms without questions. Boring wins are still wins."}},
              {text:"Point out Rourke was overturned. Watch them sweat.",base:72,style:"technical",ok:{fx:{rep:9,inf:8,money:1500},txt:"Opposing counsel asks for a recess to 'check something'. Affirmed. HENDERED, on appeal."},fail:{fx:{rep:-6},txt:"The panel finds a different route to reverse. Your gotcha impressed no one with a gavel."}},
              {text:"Ask the panel to sanction the sloppy brief.",base:34,boldW:3,style:"aggressive",ok:{fx:{bold:7,inf:8,money:1100},txt:"Sanctioned. Their firm eats the costs. Your name travels."},fail:{fx:{rep:-11},txt:"'Counsel, ambition is not a motion.' The panel's opinion quotes you. Unkindly."}}]}}},
        fail:{fx:{rep:-6},txt:"The judge tolls it anyway and calls your argument 'heartless but tidy'."}},
      {text:"Attack the hospitalization as fabricated.",base:35,boldW:3,style:"aggressive",ok:{fx:{bold:8,inf:8,money:1200},txt:"Their 'hospital records' are from a med spa. Courtroom gasps."},fail:{fx:{rep:-12},txt:"The CEO was genuinely in an ICU. You are now the villain of this story."}}]});
  P.push({id:"court2",tier:2,title:"COURT: In re Pemberton estate",deadline:4,
    body:"A contested will. The 'final' will leaving everything to a yoga instructor was witnessed by two people — both of whom, per the file, were on a cruise ship in international waters that day. Instagram proves it.",
    judge:true,
    opts:[
      {text:"Negotiate a split. Everyone unhappy equally.",base:100,safe:true,ok:{fx:{bold:-2,inf:2,money:400},txt:"Settled. The yoga instructor achieves inner peace and outer money."}},
      {text:"Present the cruise evidence. Void the will.",base:75,style:"technical",ok:{fx:{rep:8,inf:7,money:1400},txt:"Exhibit A: a poolside selfie, timestamped. The will collapses."},fail:{fx:{rep:-5},txt:"Turns out one witness signed remotely — legal in this state. Who knew."}},
      {text:"Accuse the instructor of undue influence. Loudly.",base:38,boldW:3,style:"aggressive",ok:{fx:{bold:7,inf:7,money:1000},txt:"She confesses to 'guided manifestation of the estate'. Case over."},fail:{fx:{rep:-10},txt:"No evidence, just vibes. The judge sanctions your vibes."}}]});
  P.push({id:"pro",tier:1,title:"CASE: Pro bono — the copy-room guy",deadline:2,
    body:"Marv from the copy room is being evicted over 'unpaid fees' his landlord invented after Marv reported a gas leak. Retaliation, obviously. Zero billable hours. Marv, however, knows EVERYTHING about everyone in this firm.",
    opts:[
      {text:"Decline politely. Billables come first.",base:100,safe:true,ok:{fx:{bold:-2},txt:"Marv nods slowly. He forgets nothing."}},
      {text:"Fire off a retaliation counterclaim.",base:72,style:"technical",delay:2,ok:{fx:{rep:5,inf:6,bold:3},txt:"Landlord folds instantly. Marv now tells you things. Useful things."},fail:{fx:{rep:-4},txt:"Paperwork bounced on a technicality. Marv is polite about it. Too polite."}},
      {text:"Call the landlord and improvise menacingly.",base:45,boldW:2,style:"aggressive",ok:{fx:{bold:5,inf:4},txt:"You cite three statutes that don't exist. It works. Marv applauds."},fail:{fx:{rep:-6},txt:"The landlord is also a lawyer. Of course he is."}}]});
  P.push({id:"breach",tier:1,title:"CASE: Aldergate data breach",deadline:3,
    body:"Client Aldergate leaked 40,000 customer records and the customers noticed. Their cloud vendor, NimbusHost, blames 'shared responsibility'. But NimbusHost's own SLA — exhibit D — promises critical patches within 72 hours, and the breach log shows the hole sat open for nine days. Their lawyers write very confident letters.",
    opts:[
      {text:"Settle with the customers quietly.",base:100,safe:true,ok:{fx:{bold:-4,inf:2},txt:"Checks mailed, mouths closed. Aldergate grumbles about the invoice."}},
      {text:"Turn it on NimbusHost — the 72-hour SLA.",base:74,style:"technical",
        ok:{fx:{rep:7,inf:6,money:800},txt:"Nine days is not 72 hours, and exhibit D is their own signature. NimbusHost's confident letters stop.",
          next:{after:2,note:"NimbusHost refuses to pay. Their appeal hits the docket.",case:{
            id:"breach2",tier:2,title:"COURT: Aldergate v. NimbusHost",deadline:3,judge:true,
            body:"NimbusHost appeals the SLA ruling, now claiming the 72-hour clock 'only runs on business days'. The definitions page of their own SLA — the page THEY drafted — says 'hours means consecutive clock hours'. Their brief is hoping nobody reads definitions pages. You read definitions pages.",
            opts:[
              {text:"Accept a reduced payout. End it.",base:100,safe:true,ok:{fx:{inf:3,bold:-3,money:400},txt:"Aldergate takes the smaller check. Everyone stops billing. Almost everyone."}},
              {text:"Read their definitions page to the court.",base:70,style:"technical",ok:{fx:{rep:9,inf:8,money:1600},txt:"'Consecutive clock hours.' Slowly. Twice. The appeal dies on page four of their own contract."},fail:{fx:{rep:-7},txt:"The judge finds 'ambiguity'. In a definitions page. Some days the law is just weather."}},
              {text:"Move for sanctions — the appeal is frivolous.",base:36,boldW:3,style:"aggressive",ok:{fx:{bold:7,inf:8,money:1200},txt:"Granted. NimbusHost pays the ruling AND your fees. Their letters are very quiet now."},fail:{fx:{rep:-11},txt:"'Frivolous is a strong word, counsel.' The judge redirects it at your motion."}}]}}},
        fail:{fx:{rep:-5},txt:"NimbusHost produces a patch ticket. Backdated, probably — but you can't prove it today."}},
      {text:"Announce a countersuit at a press conference.",base:34,boldW:3,style:"aggressive",
        ok:{fx:{bold:6,inf:6,money:700},txt:"The stock steadies, the customers calm down, NimbusHost calls to 'discuss'. Theater works."},
        fail:{fx:{rep:-8},txt:"You quoted a filing that did not, technically, exist yet. Cameras were rolling.",
          next:{after:1,note:"The judge saw the press conference. There will be a hearing about it.",case:{
            id:"breachsanc",tier:2,title:"COURT: sanctions hearing (yours)",deadline:2,judge:true,
            body:"Opposing counsel moved for sanctions before you got back from the press conference. The motion quotes you verbatim, with timestamps. The judge wants to understand why you announced a filing that didn't exist. This file is about saving your own skin.",
            opts:[
              {text:"Apologize. Fully. Painfully.",base:100,safe:true,ok:{fx:{bold:-6,inf:1},txt:"The judge accepts, with a lecture that ages you. Motion denied. Barely."}},
              {text:"Argue the statements were 'aspirational'.",base:55,style:"technical",ok:{fx:{rep:4,bold:3},txt:"'Aspirational.' The judge almost smiles. Motion denied; the word enters firm legend."},fail:{fx:{rep:-8,money:-800},txt:"Sanctioned. The fine has your name on it, not Aldergate's."}},
              {text:"Accuse THEM of bad faith for filming it.",base:25,boldW:3,style:"aggressive",ok:{fx:{bold:9,rep:5,inf:6},txt:"Astonishingly, it lands — their 'PR monitoring' looks worse than your mouth. Case closed."},fail:{fx:{rep:-13,money:-1200},txt:"The judge sanctions you mid-sentence. Opposing counsel frames the transcript."}}]}}}}]});
  P.push({id:"poach",tier:1,title:"MEMO: Snidely Fitch is poaching you",deadline:2,
    body:"A Snidely Fitch recruiter 'bumps into you' at lunch. Offer: +40% salary, real cases, an office with a door. All you'd have to do is bring one — just one — client file with you.",
    opts:[
      {text:"Decline. Report it to the partners.",base:100,safe:true,ok:{fx:{rep:6,inf:4,bold:-2},txt:"Loyalty noted in your file. Literally, there's a file."}},
      {text:"String them along, learn their case list.",base:50,boldW:2,ok:{fx:{inf:8,bold:4},txt:"Three lunches later you know their whole litigation calendar."},fail:{fx:{rep:-12},txt:"They were testing you FOR Parson Henderson. You failed the loyalty sting."}},
      {text:"Take the meeting AND bill them for lunch.",base:30,boldW:3,style:"aggressive",ok:{fx:{bold:6,money:600},txt:"They respect the audacity. The lunch was excellent."},fail:{fx:{rep:-8},txt:"Word gets back. 'Flight risk' is now your middle name."}}]});
  return P;
}

/* corrupt >= 40 quietly unlocks a bribe option on the case file (GDD §7) */
export const JUDGES=[
  {name:"Hon. R. Ironwood",temper:80,book:70,corrupt:5,desc:"Zero patience for theatrics. Worships procedure."},
  {name:"Hon. C. Marsh",temper:30,book:40,corrupt:45,desc:"Enjoys a good show. Bored by footnotes."},
  {name:"Hon. B. Pelt",temper:55,book:85,corrupt:10,desc:"Reads every exhibit. Twice. Cites page numbers from memory."},
  {name:"Hon. D. Crane Jr.",temper:20,book:20,corrupt:75,desc:"Unpredictable. Once ruled based on a coin flip. Allegedly."},
  {name:"Hon. A. Whitlock",temper:65,book:55,corrupt:20,desc:"Ex-prosecutor. Smells weakness. Bills it as contempt."},
  {name:"Hon. M. Okonkwo",temper:40,book:78,corrupt:5,desc:"Kind, thorough, immune to theater. Quotes you back at yourself."},
  {name:"Hon. T. Fairway",temper:25,book:25,corrupt:85,desc:"Owns four golf memberships. Asks about your 'handicap' unprompted."}];

/* Crisis events — each fires at most once per run (S.usedCrises). */
export function crises(){
  const C=[];
  C.push({id:"coup",title:"CRISIS: The Bitt Maneuver",cond:()=>S.day>=3,
    body:"Junior partner Lou Bitt has been quietly re-assigning Hardwick's clients to himself, building a case to leapfrog him for Senior Partner. He wants your help 'reorganizing some files'. Hardwick suspects nothing. Yet.",
    opts:[
      {text:"Help Lou. Hitch your wagon to the coup.",base:45,boldW:2,ok:{fx:{inf:14,bold:4},txt:"The coup lands. Lou remembers his friends. You are, for now, a friend."},fail:{fx:{rep:-14,inf:-5},txt:"Hardwick crushes the coup and everyone holding a file. Including you."}},
      {text:"Warn Hardwick quietly.",base:85,ok:{fx:{rep:8,inf:7},txt:"Hardwick nods once. A week later Lou's office is a supply closet."},fail:{fx:{rep:-5},txt:"Hardwick assumes YOU'RE the schemer. Great instincts, bad delivery."}},
      {text:"Stay out of it entirely.",base:100,safe:true,ok:{fx:{bold:-4},txt:"You watch the war from the break room. Safe. Forgettable."}}]});
  C.push({id:"mole",title:"CRISIS: The Leak",cond:()=>S.day>=4,
    body:"Confidential Kessler documents appeared in a tabloid. A mole is inside Parson Henderson. Management wants a name by Friday, and the associates' badge logs — including yours — look 'interesting'.",
    opts:[
      {text:"Investigate on your own. Find the mole first.",base:55,boldW:2,ok:{fx:{rep:10,inf:9},txt:"It was Lou Bitt's paralegal. You present the proof with a small bow."},fail:{fx:{rep:-8},txt:"You accuse the wrong paralegal. HR would like several words."}},
      {text:"Cooperate, hand over your logs, stay clean.",base:100,safe:true,ok:{fx:{bold:-2,inf:2},txt:"Cleared. The mole was never found. People still whisper."}},
      {text:"Point suspicion at Snidely Fitch. Deflect everything.",base:40,boldW:2,style:"aggressive",ok:{fx:{inf:8,bold:5},txt:"Fitch denies it so hard everyone believes it's them."},fail:{fx:{rep:-10},txt:"Your deflection looks exactly like guilt."}}]});
  C.push({id:"billing",title:"CRISIS: The billing audit",cond:()=>S.day>=5,
    body:"Accounting flags your hours: 26 billed in one 24-hour day. It was technically a merger closing, but the auditor doesn't bill technicalities. She bills examples. You may be about to become one.",
    opts:[
      {text:"Recode the hours honestly. Eat the loss.",base:100,safe:true,ok:{fx:{money:-400,bold:-2,inf:2},txt:"Clean books, lighter wallet. The auditor nods once. It's almost warm."}},
      {text:"Defend every entry, line by line.",base:60,style:"technical",ok:{fx:{rep:7,inf:6},txt:"Entry 41: 'thinking while commuting'. Upheld. You are now firm legend."},fail:{fx:{rep:-7,money:-600},txt:"Entry 41 dies in review and takes your credibility with it."}},
      {text:"'Audit the partners first. I'll wait.'",base:35,boldW:3,style:"aggressive",ok:{fx:{bold:7,inf:7},txt:"The audit quietly becomes 'random sampling'. You were not sampled."},fail:{fx:{rep:-11},txt:"The partners' hours are immaculate. Yours are now famous."}}]});
  C.push({id:"clientflight",title:"CRISIS: The Meridian defection",cond:()=>S.day>=6,
    body:"Snidely Fitch is wining-and-dining Meridian — the firm's biggest client. Hardwick wants 'ideas' by tonight. The conference room goes quiet. People look at you.",
    opts:[
      {text:"Draft the retention memo everyone expects.",base:100,safe:true,ok:{fx:{inf:2,bold:-3},txt:"Solid, forgettable, filed. Meridian stays. For now."}},
      {text:"Pitch Meridian yourself, off the books.",base:55,boldW:2,ok:{fx:{rep:8,inf:10},txt:"Meridian's GC likes 'the hungry one'. Hardwick pretends it was his idea. Fine."},fail:{fx:{rep:-9},txt:"Snidely Fitch forwards your pitch deck to Hardwick. With comments."}},
      {text:"Suggest poaching THEIR biggest client instead.",base:40,boldW:3,style:"aggressive",ok:{fx:{inf:12,bold:6},txt:"Mutually assured poaching. Both firms stand down. You get the credit."},fail:{fx:{rep:-10},txt:"'We don't start wars we can't bill,' says Hardwick, coldly."}}]});
  C.push({id:"audit",title:"CRISIS: Bar credentials audit",cond:()=>S.scenario==="fraud"&&S.day>=3,
    body:"The firm is running a routine bar-credentials audit. Yours would come back... creative. The auditor, coincidentally, is drowning in her own caseload and mentions she'd kill for help on a filing.",
    opts:[
      {text:"Help with her filing. All night. Every night.",base:80,ok:{fx:{inf:4,bold:2},txt:"Your file mysteriously moves to the bottom of the pile. Forever, hopefully."},fail:{fx:{rep:-8},txt:"She helps you back — by escalating your file 'as a courtesy'. Sweat."}},
      {text:"Pay a 'database consultant'. ($1500)",base:65,ok:{fx:{money:-1500},txt:"Your record now exists. It even has a GPA. A modest one, for realism."},fail:{fx:{money:-1500,rep:-12},txt:"The consultant vanishes with the money and leaves a typo in your fake bar number."}},
      {text:"Do nothing. You've survived worse.",base:35,boldW:3,ok:{fx:{bold:6},txt:"The audit skips associates below Senior. Breathe."},fail:{fx:{rep:-18},txt:"'Quick question about your law school,' says an email you'll never forget."}}]});
  C.push({id:"legacydinner",title:"CRISIS: Family dinner",cond:()=>S.scenario==="legacy"&&S.day>=2,
    body:"Your estranged parent — whose name is on the wall — invites you to dinner. In the main conference room. During work hours. Everyone is watching through the glass to see if you're a real lawyer or a genetic hire.",
    opts:[
      {text:"Attend. Be diplomatic. Say nothing real.",base:100,safe:true,ok:{fx:{inf:4,bold:-3},txt:"Pleasant. Empty. The firm's gossip is merely 'mild'."}},
      {text:"Attend and pitch them your own case strategy.",base:55,boldW:2,ok:{fx:{inf:10,rep:5},txt:"They interrupt you twice, then steal your idea. That's parental respect."},fail:{fx:{rep:-8},txt:"'Interesting.' The word echoes. Everyone saw the wince."}},
      {text:"Decline. You have actual work.",base:60,boldW:2,ok:{fx:{bold:6,rep:4},txt:"The firm respects it. Your parent, weirdly, respects it more."},fail:{fx:{inf:-6},txt:"Declining the name on the wall has a price. It's invoiced in silence."}}]});
  return C.filter(c=>c.cond()&&!S.usedCrises.includes(c.id));
}

export const SCENARIOS={
  fraud:{label:"THE FRAUD — you never went to law school",desc:"Photographic memory, zero diploma. Special exposure crises. Get caught: game over."},
  debtor:{label:"THE DEBTOR — $180k student loans",desc:"Pay $2,000 every 3 days. Miss a payment: game over. Chase the money options."},
  legacy:{label:"THE LEGACY — your parent's name is on the wall",desc:"Influence gains +25%, reputation losses +25%. Everyone assumes nepotism."}
};
