// All hand-written game content: cases, judges, crises, scenarios.
// Case/option schema (AI-generated cases must match it too — CLAUDE.md §7):
// { id, tier, title, deadline, judge?, body, opts:[
//   { text, base, boldW?, style?, safe?, delay?, ok:{fx,txt}, fail:{fx,txt} }
//   or a rare { text, style:"covert", action:{...} } interactive action. ] }
import { S } from "./state.js";
import { rnd } from "./utils.js";

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
  P.push({id:"redvale",tier:1,title:"CASE: Redvale document hold",deadline:3,
    body:"Redvale's missing safety reports should have been preserved before the lawsuit. Snidely Fitch swears the originals were destroyed in a server failure. But a courier receipt in exhibit F lists six paper archive boxes delivered to Fitch last Tuesday. Their building memo adds one useful detail: the night cleaners change shifts at 10:15, and the records room still uses an old brass cabinet lock.",
    opts:[
      {text:"Negotiate without the reports. Keep the client out of headlines.",base:100,safe:true,
        ok:{fx:{bold:-4,inf:2,money:350},txt:"Redvale pays for silence. The six boxes remain exactly where Fitch said they weren't."}},
      {text:"Move for sanctions using the courier receipt.",base:72,style:"technical",
        ok:{fx:{rep:8,inf:7,money:1100},txt:"Six boxes beat one confident affidavit. The court orders production and Fitch stops smiling."},
        fail:{fx:{rep:-6},txt:"Fitch calls them unrelated billing archives. Without the index, the judge will not infer the rest."}},
      {text:"Bluff: claim a whistleblower already copied the archive index.",base:36,boldW:3,style:"aggressive",
        ok:{fx:{bold:7,inf:7,money:850},txt:"Fitch produces the reports before your imaginary witness can be deposed."},
        fail:{fx:{rep:-11,bold:-2},txt:"They demand the witness's name. Your silence enters the room before your answer does."}},
      {text:"COVERT ACTION: enter Fitch after hours and photograph the archive index.",style:"covert",
        action:{id:"redvale_archive_lock",type:"lockpick",title:"THE FITCH RECORDS ROOM",
          body:"The cleaning carts turn the far corner. An old cabinet, one bent paperclip, and however many spares your hands have earned. Lean on it until the cylinder gives — lean past that and the pick leaves half itself in the keyway.",
          hours:1.5,fatigue:4,edge:12,
          edgeText:"ARCHIVE INDEX RECOVERED (+12% on this file's risky legal plays)",
          success:{fx:{bold:3},txt:"The cabinet opens. Six box numbers, six dates, one silent photograph. You still need a legal move — now you have the missing index."},
          escape:{fx:{bold:-2},txt:"You leave the way you came in and nobody files anything. The archive stays shut, though, and this route is gone."},
          caught:{fx:{rep:-18,firm:-6,bold:-5},txt:"By morning it is a written complaint with your name in it. Redvale's case is poisoned, the partners get the call before their coffee, and your badge photo becomes an exhibit."}}}]});
  P.push({id:"nda",tier:1,title:"CASE: Kessler NDA breach",deadline:3,
    body:"Client Kessler Corp is being sued for breaching an NDA. Reading the file: the NDA was signed by a Vice President of the counterparty who — per exhibit C — had NO signing authority under their own bylaws. Opposing counsel hasn't noticed.",
    opts:[
      {text:"Settle quietly. Client pays, moves on.",base:100,safe:true,ok:{fx:{bold:-4,inf:2,money:300},txt:"Settled. Cheap-ish. Nobody's impressed, nobody's fired."}},
      {text:"Move to void the NDA — no signing authority.",base:78,style:"technical",delay:2,ok:{fx:{rep:8,inf:7,money:1200},txt:"The NDA is VOID. Opposing counsel visibly ages five years."},fail:{fx:{rep:-5},txt:"They produce a ratification memo. Ouch. Should've dug deeper."}},
      {text:"Bluff: threaten a defamation countersuit.",base:35,boldW:3,style:"aggressive",delay:1,ok:{fx:{bold:6,inf:5,money:800},txt:"They fold. Your bluff had absolutely no legal basis. Beautiful."},fail:{fx:{rep:-10,bold:-2},txt:"They call the bluff and read your empty threat aloud in a meeting."}},
      {text:"CASE PREP: run the privilege review before production.",style:"prep",
        action:{id:"kessler_privilege",type:"redaction",title:"THE KESSLER PRODUCTION",
          body:"Opposing counsel's request sweeps in this whole bundle and it ships tonight. The rule is below; the pages are not marked.",
          hours:1.5,fatigue:6,edge:15,
          edgeText:"PRIVILEGE HELD (+15% on this file's risky plays)",
          pages:[
            {id:"advice",text:"Kessler's GC to you: 'What is our exposure if we terminate early?'",priv:true},
            {id:"memo",text:"Your own memo: three arguments, ranked, with the weak one circled",priv:true},
            {id:"strategy",text:"Your note to the file on which witness not to call",priv:true},
            {id:"invoice",text:"A vendor invoice for the March shipment"},
            {id:"minutes",text:"Board minutes approving the supply contract"},
            {id:"pr",text:"Kessler's CEO to their PR agency, copying you: 'how do we spin this?'"},
            {id:"log",text:"Warehouse log with the delivery dates"},
            {id:"hr",text:"An HR complaint about the loading dock, unrelated to any of this"},
            {id:"draft",text:"The unsigned first draft of the NDA"},
            {id:"retainer",text:"Your engagement letter's fee schedule"}],
          success:{fx:{bold:2},txt:"The bundle goes out with the black bars exactly where they belong. They learn nothing they did not already have."},
          partial:{fx:{},txt:"You get most of it right. The parts you over-black will be argued about, but nothing of yours went out."},
          miss:{fx:{},txt:"Somewhere in that stack, your own assessment of your own case is now in their hands."}}}]});
  P.push({id:"depo",tier:1,title:"CASE: Vance deposition prep",deadline:3,
    body:"Depose the CFO of Vance Industries. His lawyer is a screamer from Snidely Fitch, but the binder's dates don't shout — they just sit there. February 2nd: Vance retains a consulting outfit whose only employee is the CFO's brother-in-law. March 3rd: the Q3 expense report is signed. March 11th: the auditors send formal notice. March 12th: the CFO emails the controller, 'make Q3 read clean'. March 14th: $2M moves from facilities to consulting. March 19th: a second, tidier version of that same Q3 report is signed. April 2nd: the brother-in-law resigns. Two versions, one audit, and only one order that makes sense.",
    objection:{id:"vance_deposition",depo:true,title:"THE VANCE DEPOSITION",
      body:"A conference room, a court reporter, and the CFO's screamer from Snidely Fitch across the table. There is no judge here to rule on anything — your objections are preserved for one to read later. But a lawyer who objects to every clean question is coaching the witness, and the transcript shows that too.",
      lines:[
        {id:"v1",text:"'You are the chief financial officer of Vance Industries?'"},
        {id:"v2",text:"'And you would agree the second Q3 report was the honest one, wouldn't you?'",bad:true,tag:"leading"},
        {id:"v3",text:"'Who signed the original expense report?'"},
        {id:"v4",text:"'Your controller told me you asked her to clean it up. Correct?'",bad:true,tag:"hearsay"},
        {id:"v5",text:"'What is the consulting firm's line of business?'"},
        {id:"v6",text:"'Why did you move the $2M out of facilities before the auditors arrived?'",bad:true,tag:"assumes facts not in evidence"},
        {id:"v7",text:"'When did your brother-in-law join that firm?'"},
        {id:"v8",text:"'What was the audit committee hoping to find?'",bad:true,tag:"calls for speculation"},
        {id:"v9",text:"'Is this your signature on the March 19th version?'"},
        {id:"v10",text:"'Do you sign everything put in front of you, or only the expensive ones?'",bad:true,tag:"argumentative"},
        {id:"v11",text:"'Was the consulting agreement kept in the ordinary course of business?'"},
        {id:"v12",text:"'A moment ago you called it routine. Now it is urgent?'",bad:true,tag:"misstates prior testimony"},
        {id:"v13",text:"'Who else received the March 12th email?'"},
        {id:"v14",text:"'Did you read the agreement, and did you tell the board what it said?'",bad:true,tag:"compound"}]},
    timeline:{id:"vance_expense_chronology",title:"THE VANCE CHRONOLOGY",
      body:"Before you sit down across from him, lay the file's events end to end. Opposing counsel will build this same chronology tonight — you would rather see it first.",
      events:[
        {id:"retainer",at:1,text:"Vance retains the consulting firm run by the CFO's brother-in-law"},
        {id:"report1",at:2,text:"The original Q3 expense report is signed"},
        {id:"notice",at:3,text:"The auditors send formal notice"},
        {id:"email",at:4,text:"The CFO emails the controller: 'make Q3 read clean'"},
        {id:"move",at:5,text:"$2M moves from facilities to consulting"},
        {id:"report2",at:6,text:"A second, tidier version of the Q3 report is signed"},
        {id:"resign",at:7,text:"The brother-in-law resigns from the consulting firm"},
        {id:"engage",at:0,text:"The consulting firm is registered, one employee, no office"},
        {id:"board",at:8,text:"The audit committee is told the matter is closed"},
        {id:"restate",at:9,text:"The quarter is quietly restated in a footnote"},
        {id:"exit",at:10,text:"The controller takes early retirement"}]},
    opts:[
      {text:"Ask soft questions. Preserve the relationship.",base:100,safe:true,ok:{fx:{bold:-3,inf:1},txt:"A polite, useless deposition. The partners yawn."}},
      {text:"Walk him into contradicting the two reports.",base:70,style:"technical",ok:{fx:{rep:7,inf:6,money:900},txt:"'So which signature is yours?' Silence. Checkmate."},fail:{fx:{rep:-6},txt:"He lawyered up mid-sentence. The screamer screamed. You blinked."}},
      {text:"Slam the reports on the table. Theater.",base:40,boldW:3,style:"aggressive",ok:{fx:{bold:7,inf:6,money:700},txt:"He cracks on camera. The clip circulates the firm. You've been promoted in spirit."},fail:{fx:{rep:-9},txt:"He calmly explains the discrepancy. You slammed paper for nothing."}}]});
  P.push({id:"court1",tier:2,title:"COURT: Halcyon v. Kessler (motion day)",deadline:4,
    body:"Argue a motion to dismiss. Halcyon's complaint was filed one day AFTER the statute of limitations expired — but they'll argue 'equitable tolling' because their CEO was hospitalized. Sympathy vs. calendar math. Their counsel has your client's operations manager on the stand first, and his questions have a habit of answering themselves.",
    judge:true,
    trial:{id:"halcyon_trial",strength:-4, // the technicality cuts both ways in front of a jury
      verdict:{
        win:{rep:8,inf:9,money:3000,firm:1},
        lose:{rep:-10,inf:-4,money:-600},
        winTxt:"The jury finds for Kessler. Halcyon's counsel congratulates you in the corridor with his eyes somewhere else.",
        loseTxt:"The jury did not care about the filing window. They cared about the contract, and the contract was not on your side.",
        settleTxt:"Halcyon pays to make the calendar question go away. Everyone calls it commercial."},
      phases:[
        {kind:"opening",prompt:"A jury is not a judge. The deadline argument that would win on paper has to be made to twelve people who have never heard of a filing window.",
          opts:[
            {text:"Explain the deadline plainly, as a rule everyone lives by — including them.",weight:"strong",flavor:"technical",
             txt:"You compare it to a tax return. Three jurors nod before they catch themselves."},
            {text:"Lead with the contract's payment schedule and work forward.",weight:"weak",
             txt:"Nine minutes of dates. You lose the back row somewhere around the second quarter."},
            {text:"Tell them Halcyon sat on this for two years and then blamed a clerk.",weight:"strong",flavor:"bold",
             txt:"You give them a villain who is late rather than a rule that is technical."},
            {text:"Concede the delay was minor but insist the law is the law.",weight:"weak",
             txt:"You call your own argument minor. The jury writes that down."}]},
        {kind:"opposing",lines:[
          {bad:"hearsay",text:"'Your predecessor told me the notice went out on time. That is right, isn't it?' — the witness never met the predecessor."},
          {bad:"speculation",text:"'What do you suppose your client hoped would happen if nobody checked the date?'"},
          {bad:"leading",text:"'And you would accept, wouldn't you, that the delay was purely administrative?'"}]},
        {kind:"argument",prompt:"The docket stamp is the centre of your case. Halcyon says it was a clerical error.",
          opts:[
            {text:"Put the stamped copy on the screen and leave it there while you talk.",weight:"strong",flavor:"technical",
             txt:"Twelve people spend four minutes looking at a date. It stops being technical."},
            {text:"Argue the clerk's error is Halcyon's problem, not your client's.",weight:"strong",
             txt:"Simple, and hard to answer without sounding like an excuse."},
            {text:"Attack the credibility of Halcyon's records custodian.",weight:"weak",
             txt:"She is pleasant, precise, and clearly telling the truth about her own filing habits."}]},
        {kind:"opposing",lines:[
          {bad:null,text:"'What date does the stamp on this exhibit read?' — flat, factual, and not going anywhere good for you."},
          {bad:null,text:"'Who in your office is responsible for docketing deadlines?' — a fair question with an uncomfortable answer."},
          {bad:null,text:"'Is this the complete correspondence file?' — nothing improper. Nothing helpful either."}]},
        {kind:"argument",prompt:"They have their date. You have the two years that followed it.",
          opts:[
            {text:"Two years of silence, then a lawsuit the week the auditors arrived.",weight:"strong",flavor:"bold",
             txt:"You put the timing where the jury cannot unsee it."},
            {text:"Restate the filing rule once more, slowly.",weight:"weak",
             txt:"They heard it. Hearing it again does not make it warmer."}]},
        {kind:"closing",prompt:"Last words.",
          opts:[
            {text:"They knew the date. They waited. Now they want the calendar rewritten.",weight:"strong",flavor:"bold",
             txt:"You end on their conduct, not on your rule."},
            {text:"Ask them to apply the rule without sympathy for either side.",weight:"neutral",
             txt:"Fair-minded. Also forgettable."},
            {text:"Warn them what happens if deadlines stop meaning anything.",weight:"weak",
             txt:"A speech about the system. The system is not on trial and they know it."}]}]},
    objection:{id:"halcyon_examination",title:"HALCYON'S EXAMINATION",
      body:"Opposing counsel is walking your operations manager through the timeline. Some of these questions are not questions. Object before the answer lands — and only when there is something to object to, because the bench is right there.",
      lines:[
        {id:"q1",text:"'You are the operations manager at Kessler, correct?'"},
        {id:"q2",text:"'And you would agree the filing was late only on a technicality, wouldn't you?'",bad:true,tag:"leading"},
        {id:"q3",text:"'What date did you receive the notice?'"},
        {id:"q4",text:"'Your colleague told me the CEO was hospitalised. Is that right?'",bad:true,tag:"hearsay"},
        {id:"q5",text:"'Describe the notice you received.'"},
        {id:"q6",text:"'Why did your company decide to hide the delay from the court?'",bad:true,tag:"assumes facts not in evidence"},
        {id:"q7",text:"'Do you recall the meeting on the fourth?'"},
        {id:"q8",text:"'What do you suppose your CEO was thinking that morning?'",bad:true,tag:"calls for speculation"},
        {id:"q9",text:"'Is this the report you signed?'"},
        {id:"q10",text:"'You are not a very careful man, are you?'",bad:true,tag:"argumentative"},
        {id:"q11",text:"'Walk us through the morning of the fourth.'"},
        {id:"q12",text:"'Counsel told you to say that, didn't they?'",bad:true,tag:"argumentative"},
        {id:"q13",text:"'Who signs off on filings at Kessler?'"},
        {id:"q14",text:"'The auditor wrote that the delay was deliberate, didn't she?'",bad:true,tag:"hearsay"},
        {id:"q15",text:"'Had you seen this exhibit before today?'"},
        {id:"q16",text:"'How much is Kessler paying you to sit there?'",bad:true,tag:"argumentative"}]},
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
    body:"A contested will. The 'final' will leaving everything to a yoga instructor was signed at the Pemberton house on the 14th, witnessed by two people — both of whom, per the cruise manifest, boarded on the 12th and did not disembark until the 19th. Instagram agrees with the manifest. The rest of the binder is just as talkative: a lab report calling the testator's signature a laser-printed image rather than ink; a care-home chart showing him sedated for a procedure all that afternoon; the family solicitor's engagement log, closed two years before the will was supposedly drafted; the studio newsletter naming one witness as co-host of the instructor's retreats; a phone photo taken inside that room, timestamped, with the instructor in it. Also in the bundle: a parking ticket issued to the gardener and an unsigned insurance renewal. Both witnesses swore an affidavit anyway.",
    judge:true,
    trial:{id:"pemberton_trial",strength:9, // two witnesses on a cruise ship: the file walks in ahead
      verdict:{
        win:{rep:9,inf:8,money:2600,firm:1},
        lose:{rep:-9,inf:-3,money:-400},
        winTxt:"The jury needed forty minutes, and thirty of those were lunch. The will is void.",
        loseTxt:"Twelve people decided the cruise manifest was a coincidence. Your client watches the yoga instructor inherit a house.",
        settleTxt:"The instructor takes a number and leaves the house. Nobody says the word 'forgery' out loud, which is what the number was for."},
      phases:[
        {kind:"opening",prompt:"You stand first. The jury has been told nothing yet — whatever frame you give them now is the one they will hang everything else on.",
          opts:[
            {text:"Two witnesses swore they were in a house. A cruise manifest says they were at sea. That is the whole case.",weight:"strong",flavor:"bold",
             txt:"You give them one impossible fact and stop talking."},
            {text:"Walk them through the estate's full history, from the first will onward.",weight:"weak",
             txt:"Twelve minutes of family chronology. Two jurors stop taking notes."},
            {text:"Tell them the deceased was a kind man who deserved better.",weight:"weak",
             txt:"Sympathy without a fact to hang it on. It slides off."},
            {text:"Read the affidavit aloud, then the manifest. Say nothing else.",weight:"strong",flavor:"technical",
             txt:"You let two documents argue with each other in front of twelve people."}]},
        {kind:"opposing",lines:[
          {bad:"speculation",text:"Opposing counsel turns to the witness: 'In your view, what do you imagine the deceased WANTED to happen to his house?'"},
          {bad:"argumentative",text:"'You sign a great many documents about days you were not present, don't you?'"},
          {bad:"hearsay",text:"'The care home manager told me he was lucid all that week. That is right, isn't it?'"}]},
        {kind:"argument",prompt:"Your turn with the lab report — the one calling the signature a laser-printed image rather than ink.",
          opts:[
            {text:"Put the report up and let the examiner explain 'toner does not indent paper'.",weight:"strong",flavor:"technical",
             txt:"The examiner is boring and unshakeable. The best kind of witness."},
            {text:"Argue the family was clearly targeted by an opportunist.",weight:"weak",
             txt:"Motive without proof. The jury has already been promised proof."},
            {text:"Read the care-home chart: sedated all that afternoon.",weight:"strong",
             txt:"A man under sedation did not sign anything at four in the afternoon."}]},
        {kind:"opposing",lines:[
          {bad:"assumes",text:"'When the family decided to destroy the earlier will, were you consulted?' — the witness blinks. Nobody has said anything about a destroyed will."},
          {bad:"compound",text:"'Did you read the will before signing it, and did you discuss its contents with the instructor?'"},
          {bad:"asked",text:"'One more time, since your memory seems selective: where were you on the fourteenth?'"}]},
        {kind:"closing",prompt:"Last words. The jury has heard the manifest, the lab report and the chart.",
          opts:[
            {text:"Three documents. One afternoon. Pick the version of it that can be true.",weight:"strong",flavor:"technical",
             txt:"You hand them the arithmetic and let them do it themselves."},
            {text:"Remind them what the instructor stands to gain.",weight:"weak",
             txt:"You end on greed instead of on evidence. It is a smaller note to finish on."},
            {text:"Thank them for their time and sit down.",weight:"neutral",
             txt:"Brief. Some juries like brief."}]}]},
    objection:{id:"pemberton_examination",title:"THE PEMBERTON EXAMINATION",
      body:"The instructor's counsel has the first witness on the stand — the one who was on a cruise ship. Some of these are not questions. Object before the answer lands; the bench is right there and it is paying attention.",
      lines:[
        {id:"p1",text:"'You witnessed the will at the Pemberton house on the 14th?'"},
        {id:"p2",text:"'And you would agree the family only objected once they saw the money, wouldn't you?'",bad:true,tag:"leading"},
        {id:"p3",text:"'Who else was in the room?'"},
        {id:"p4",text:"'The care-home nurse told me he was perfectly alert. Correct?'",bad:true,tag:"hearsay"},
        {id:"p5",text:"'Describe the pen he used.'"},
        {id:"p6",text:"'Why did the family destroy the earlier will?'",bad:true,tag:"assumes facts not in evidence"},
        {id:"p7",text:"'Had you met the testator before that day?'"},
        {id:"p8",text:"'What do you imagine he wanted his children to have?'",bad:true,tag:"calls for speculation"},
        {id:"p9",text:"'Is this your signature on the affidavit?'"},
        {id:"p10",text:"'Do you sign affidavits about days you cannot remember often?'",bad:true,tag:"argumentative"},
        {id:"p11",text:"'When did you first meet the yoga instructor?'"},
        {id:"p12",text:"'One more time: where were you on the 14th?'",bad:true,tag:"asked and answered"},
        {id:"p13",text:"'Do you recognise the studio newsletter?'"},
        {id:"p14",text:"'You said the room was bright. Now you say the blinds were down?'",bad:true,tag:"misstates prior testimony"}]},
    opts:[
      {text:"CASE PREP: build the contradiction chart before the hearing.",style:"prep",
        action:{id:"pemberton_contradictions",type:"contradiction",title:"THE PEMBERTON AFFIDAVITS",
          body:"Two affidavits, one bundle of exhibits, and a hearing in the morning. Pin each sworn sentence to the document it cannot survive. Not every exhibit contradicts something — pinning the wrong one in open court costs you the room.",
          hours:1.5,fatigue:6,edge:15,
          edgeText:"CONTRADICTION CHART COMPLETE (+15% on this file's risky legal plays)",
          pairs:[
            {id:"signing",statement:"'I watched Mr Pemberton sign at the house on the 14th.'",
              document:"Cruise manifest: both witnesses boarded on the 12th, ashore again on the 19th"},
            {id:"ink",statement:"'He signed in blue ink, with his own fountain pen.'",
              document:"Lab report: the signature is a laser-printed image, never ink on paper"},
            {id:"social",statement:"'I had never met the beneficiary socially.'",
              document:"Studio newsletter naming that witness as co-host of her retreats"},
            {id:"solicitor",statement:"'The family solicitor drew the will up for him.'",
              document:"Solicitor's engagement log, closed two years before that date"},
            {id:"lucid",statement:"'He was lucid and unassisted the whole afternoon.'",
              document:"Care-home chart: sedated for a procedure that entire afternoon"},
            {id:"alone",statement:"'Nobody else was in the room with us.'",
              document:"Timestamped phone photo taken in that room, beneficiary in frame"},
            {id:"glasses",statement:"'He read every page before he signed.'",
              document:"Optometrist's file: no reading correction dispensed for two years"},
            {id:"drive",statement:"'I drove myself to the house that morning.'",
              document:"A licence suspension notice covering that whole month"},
            {id:"years",statement:"'I had witnessed wills for him for years.'",
              document:"The firm's file index listing exactly one prior engagement"}],
          decoys:[
            {id:"parking",text:"A parking ticket issued to the estate's gardener that week"},
            {id:"insurance",text:"The house insurance renewal notice, unsigned"},
            {id:"invoice",text:"An unpaid invoice from the estate's window cleaner"},
            {id:"garden",text:"A garden centre delivery note for the spring planting"},
            {id:"vet",text:"A veterinary bill for the estate's elderly labrador"}],
          success:{fx:{bold:2},txt:"Six sentences, six documents, no room to breathe. The chart does not win the case — it just makes every honest answer worse for them."},
          partial:{fx:{},txt:"Part of the chart holds. The rest you would not put in front of a judge, so it stays in the binder."},
          miss:{fx:{bold:-2},txt:"The affidavits survive the afternoon. You spent the hours and proved nothing you can stand behind."}}},
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
    body:"Client Aldergate leaked 40,000 customer records and the customers noticed. Their cloud vendor, NimbusHost, blames 'shared responsibility'. But NimbusHost's own SLA — exhibit D — promises critical patches within 72 hours, and the breach log shows the hole sat open for nine days. A facilities photo shows their local audit printer behind a three-circuit service bypass: kill the circuits in sequence and the uneditable patch ledger prints before remote admin can purge it. Their lawyers write very confident letters.",
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
              {text:"Accuse THEM of bad faith for filming it.",base:25,boldW:3,style:"aggressive",ok:{fx:{bold:9,rep:5,inf:6},txt:"Astonishingly, it lands — their 'PR monitoring' looks worse than your mouth. Case closed."},fail:{fx:{rep:-13,money:-1200},txt:"The judge sanctions you mid-sentence. Opposing counsel frames the transcript."}}]}}}},
      {text:"COVERT ACTION: cut NimbusHost's service power and recover the patch ledger.",style:"covert",
        action:{id:"breach_service_power",type:"power_cut",title:"THE NIMBUSHOST SERVICE FLOOR",
          body:"Three live bypass contacts feed the audit room. Drop each marker inside its amber isolation window. One bad cut arcs loudly enough to wake the security desk.",
          hours:1.5,fatigue:5,edge:12,
          edgeText:"PATCH LEDGER RECOVERED (+12% on this file's risky legal plays)",
          success:{fx:{bold:4},txt:"The last contact lands. Emergency lights swallow the corridor while the audit printer coughs out nine days of ignored patch alerts. You still need a legal move — now you have their clock in ink."},
          escape:{fx:{bold:-2},txt:"A contact arcs, but your coin call gets you through the stairwell before the guard turns the corner. The ledger stays inside and this route is burned."},
          caught:{fx:{rep:-19,firm:-6,bold:-4},txt:"The service panel flashes your mistake to Security. NimbusHost finds you under the emergency lights with insulated cutters in hand. Aldergate's defense becomes Exhibit A in a criminal conversation."}}}]});
  P.push({id:"poach",tier:1,title:"MEMO: Snidely Fitch is poaching you",deadline:2,
    body:"A Snidely Fitch recruiter 'bumps into you' at lunch. Offer: +40% salary, real cases, an office with a door. All you'd have to do is bring one — just one — client file with you.",
    opts:[
      {text:"Decline. Report it to the partners.",base:100,safe:true,ok:{fx:{rep:6,inf:4,bold:-2},txt:"Loyalty noted in your file. Literally, there's a file."}},
      {text:"String them along, learn their case list.",base:50,boldW:2,ok:{fx:{inf:8,bold:4},txt:"Three lunches later you know their whole litigation calendar."},fail:{fx:{rep:-12},txt:"They were testing you FOR Parson Henderson. You failed the loyalty sting."}},
      {text:"Take the meeting AND bill them for lunch.",base:30,boldW:3,style:"aggressive",ok:{fx:{bold:6,money:600},txt:"They respect the audacity. The lunch was excellent."},fail:{fx:{rep:-8},txt:"Word gets back. 'Flight risk' is now your middle name."}}]});

  /* ---------- SIX MORE COURTROOMS ----------
     The trial feature shipped with two hand-written courtrooms, which meant a
     career saw the same two juries. Each of these carries its own trial text,
     its own strength, and a clue that decides the case if you read for it. */

  P.push({id:"court3",tier:2,title:"COURT: Bellwether Freight v. Orsino",deadline:4,judge:true,
    body:"A driver's logbook says he was in Ohio. The truck's own telematics say the vehicle never left the yard that night, and the fuel card was used four hundred miles away by someone who signed 'M. Orsino' in a hand nothing like his. Bellwether wants damages for a delivery that never happened. Also in the bundle: a maintenance ticket for a broken tachograph, dated three days AFTER the run, and a dispatcher's text reading 'log it as done, sort it Monday'.",
    trial:{id:"bellwether_trial",strength:5,
      verdict:{win:{rep:8,inf:8,money:2400,firm:1},lose:{rep:-8,inf:-3,money:-500},
        winTxt:"The jury believed the truck over the paperwork. Bellwether's counsel asks, quietly, who reads telematics.",
        loseTxt:"Twelve people decided a logbook is a logbook. Your client pays for a delivery that physically did not occur.",
        settleTxt:"Bellwether writes off the run and keeps the dispatcher. Everyone calls it commercial."},
      phases:[
        {kind:"opening",prompt:"The jury has heard nothing yet. There is a truck that did not move and a piece of paper that says it did.",
          opts:[
            {text:"The vehicle never left the yard. Everything else is someone's typing.",weight:"strong",flavor:"bold",txt:"One fact, no adjectives. The box leans in."},
            {text:"Walk them through freight documentation practice from the top.",weight:"weak",flavor:"technical",txt:"Nine minutes on consignment notes. Two jurors visibly leave."},
            {text:"Put the telematics beside the logbook and read both dates aloud.",weight:"strong",flavor:"technical",txt:"Two documents disagree in front of twelve people. You say nothing while they do."}]},
        {kind:"opposing",lines:[
          {bad:"assumes",text:"'When your client decided to falsify the run, was the dispatcher told?' — nobody has established that anything was falsified."},
          {bad:"argumentative",text:"'Do your drivers write down whatever gets them paid?'"},
          {bad:"relevance",text:"'Let us discuss your client's insurance claims history for a moment.'"}]},
        {kind:"argument",prompt:"The dispatcher's text is the ugliest thing in the bundle. It is also not yours.",
          opts:[
            {text:"Read the text aloud: 'log it as done, sort it Monday.'",weight:"strong",flavor:"bold",txt:"You let Bellwether's own dispatcher testify against them by SMS."},
            {text:"Argue the tachograph ticket proves the equipment, not the driver, failed.",weight:"strong",flavor:"technical",txt:"Careful, narrow and hard to answer."},
            {text:"Suggest the driver was covering for a friend.",weight:"weak",flavor:"bold",txt:"Speculation from your own side. The jury notices you guessing."}]},
        {kind:"opposing",lines:[
          {bad:null,text:"'Mr Orsino, is this your signature on the fuel receipt?' — flat, fair, and not going anywhere good for you."},
          {bad:null,text:"'Who had access to the fuel card that week?' — a proper question you would rather answer later."},
          {bad:null,text:"'Was the tachograph working on the night in question?' — fair, and the answer is not simple."}]},
        {kind:"closing",prompt:"Last words.",
          opts:[
            {text:"A truck that did not move cannot have delivered anything.",weight:"strong",flavor:"technical",txt:"You end on the one thing nobody has contradicted."},
            {text:"Ask them to consider who benefits from a paper delivery.",weight:"weak",flavor:"bold",txt:"Motive without proof, at the last moment. It thins the ending."},
            {text:"Thank them and sit down.",weight:"neutral",txt:"Brief. Some juries like brief."}]}]},
    opts:[
      {text:"Settle for the fuel card amount and move on.",base:100,safe:true,
        ok:{fx:{inf:2,bold:-4,money:400},txt:"Small, quiet, over. Bellwether keeps the dispatcher and the habit."}},
      {text:"Move to dismiss on the telematics record.",base:76,style:"technical",
        ok:{fx:{rep:7,inf:6,money:1600},txt:"The judge reads the vehicle data twice and dismisses. Machines make poor liars."},
        fail:{fx:{rep:-5},txt:"'Telematics can be wrong,' says the bench, and lets it go to a jury anyway."}},
      {text:"Counterclaim for the dispatcher's text as evidence of fraud.",base:36,boldW:3,style:"aggressive",
        ok:{fx:{rep:10,inf:9,money:2200},txt:"Bellwether's own SMS becomes the centrepiece of a case against Bellwether."},
        fail:{fx:{rep:-11},txt:"A text message is not a conspiracy. The bench says so, at length, in front of your client."}}]});

  P.push({id:"court4",tier:2,title:"COURT: Ravenscroft Bio patent challenge",deadline:5,judge:true,
    body:"Ravenscroft holds a patent on an assay method and is suing everyone who breathes near it. Their priority date is March of the filing year. Your bundle contains a conference programme from the February before, listing their own chief scientist presenting the method by name, with an abstract published to attendees. Prior disclosure by the inventor kills novelty. The bundle also holds: a rival's angry blog post, a licence offer Ravenscroft made two years ago, and an internal email calling the patent 'thin but frightening'.",
    trial:{id:"ravenscroft_trial",strength:8,
      verdict:{win:{rep:10,inf:11,money:3400,firm:1},lose:{rep:-9,inf:-4,money:-700},
        winTxt:"The patent is invalid on its inventor's own conference slides. Ravenscroft's licensing department has a quiet month.",
        loseTxt:"The jury decided a conference talk is not a publication. Your client starts paying royalties on Monday.",
        settleTxt:"Ravenscroft grants a licence at a nominal figure and stops writing letters. It is not the ruling you wanted."},
      phases:[
        {kind:"opening",prompt:"Patent juries switch off fast. You have one genuinely simple fact.",
          opts:[
            {text:"Their own scientist explained this method in public a month before they claimed it was secret.",weight:"strong",flavor:"bold",txt:"One sentence, no jargon. The whole room understands the case."},
            {text:"Explain the statutory framework for novelty and priority.",weight:"weak",flavor:"technical",txt:"You lose the jury in the first paragraph and never fully get them back."},
            {text:"Read the abstract, then the patent claim, and let them compare.",weight:"strong",flavor:"technical",txt:"Two paragraphs, side by side. They are the same paragraph."}]},
        {kind:"opposing",lines:[
          {bad:"relevance",text:"'Let us talk for a moment about your client's tax structure in Ireland.'"},
          {bad:"argumentative",text:"'Is copying other people's work simply how your client does research?'"},
          {bad:"assumes",text:"'When your client decided to ignore the patent, who signed that off?'"}]},
        {kind:"argument",prompt:"Ravenscroft says the conference talk was 'preliminary and confidential'.",
          opts:[
            {text:"Produce the attendee list. Four hundred people, no NDA.",weight:"strong",flavor:"technical",txt:"Confidential is a word with a meaning, and this is not it."},
            {text:"Call their 'thin but frightening' email what it is.",weight:"strong",flavor:"bold",txt:"You read their own assessment of their own patent back to them."},
            {text:"Argue the rival's blog post shows the field already knew.",weight:"weak",flavor:"bold",txt:"An angry blog is not prior art and the bench says so before you finish."}]},
        {kind:"opposing",lines:[
          {bad:"leading",text:"'And you would accept, wouldn't you, that a conference abstract tells a skilled reader almost nothing?'"},
          {bad:"speculation",text:"'What do you imagine the audience in that room actually understood?'"},
          {bad:"compound",text:"'Did you attend the conference, and did you report back on what was disclosed there?'"}]},
        {kind:"argument",prompt:"They have pivoted to the licence offer as proof you took them seriously.",
          opts:[
            {text:"A licence offer is a business decision, not an admission.",weight:"strong",flavor:"technical",txt:"Simple, correct, and it closes the door."},
            {text:"Point out they offered it two years before they found this claim.",weight:"strong",flavor:"bold",txt:"The timeline embarrasses them without you raising your voice."},
            {text:"Ignore it and return to the framework.",weight:"weak",flavor:"technical",txt:"You leave their best point standing while you talk about statutes."}]},
        {kind:"closing",prompt:"Last words.",
          opts:[
            {text:"February came before March. That is the entire case.",weight:"strong",flavor:"technical",txt:"You end on the calendar. Nobody can argue with the calendar."},
            {text:"Warn them what happens if patents can be filed on old news.",weight:"weak",flavor:"bold",txt:"A speech about the system. The system is not on trial."},
            {text:"Thank them and sit down.",weight:"neutral",txt:"Brief. Some juries like brief."}]}]},
    opts:[
      {text:"Take the licence. It is cheaper than the fight.",base:100,safe:true,
        ok:{fx:{inf:2,bold:-5,money:-900},txt:"You pay to make it go away. Ravenscroft sends the same letter to someone else on Tuesday."}},
      {text:"Invalidate on the February conference disclosure.",base:79,style:"technical",
        ok:{fx:{rep:9,inf:8,money:2600},txt:"The inventor published it himself. The patent dissolves in a single hearing."},
        fail:{fx:{rep:-6},txt:"The bench wants expert evidence on what the abstract actually disclosed. That will be months."}},
      {text:"Countersue for the letters they sent your client's customers.",base:33,boldW:3,style:"aggressive",
        ok:{fx:{rep:11,inf:10,money:3000},txt:"Unjustified threats, in writing, to people who owed them nothing. Expensive for Ravenscroft."},
        fail:{fx:{rep:-12},txt:"The threats were defensible. Yours were not. The costs order is memorable."}}]});

  P.push({id:"court5",tier:2,title:"COURT: Estate of Almeida — the second signature",deadline:3,judge:true,
    body:"A deed of variation redirecting a house, signed by the widow, witnessed by her nephew. The widow had a stroke in January and has not written her own name since; her bank has held a signature waiver on file since February. The deed is dated April. Also in the bundle: a care worker's daily log noting 'no visitors' on the day of signing, a solicitor's file note recording a phone call with 'Mrs Almeida' the same afternoon, and a receipt showing the nephew bought a car eleven days later.",
    trial:{id:"almeida_trial",strength:7,
      verdict:{win:{rep:9,inf:8,money:2100,firm:1},lose:{rep:-8,inf:-3,money:-400},
        winTxt:"The deed is set aside. The nephew keeps the car and nothing else.",
        loseTxt:"The jury believed the phone call. The house goes where the nephew said it should.",
        settleTxt:"The nephew returns most of it rather than be asked, under oath, whose voice was on that call."},
      phases:[
        {kind:"opening",prompt:"A jury will want to like someone here. Decide who.",
          opts:[
            {text:"She could not hold a pen in February. In April she signed a deed.",weight:"strong",flavor:"bold",txt:"They have the whole case in one breath, and they do not like it."},
            {text:"Set out the law of undue influence and its presumptions.",weight:"weak",flavor:"technical",txt:"A lecture. The jury waits politely for the part that matters."},
            {text:"Read the bank waiver, then the deed, and note the dates.",weight:"strong",flavor:"technical",txt:"You let two pieces of paper contradict each other without comment."}]},
        {kind:"opposing",lines:[
          {bad:"hearsay",text:"'The care worker told me the widow was perfectly capable that week. That is right, isn't it?'"},
          {bad:"speculation",text:"'What do you suppose she wanted done with the house?'"},
          {bad:"leading",text:"'She was entirely herself that afternoon, wasn't she?'"}]},
        {kind:"argument",prompt:"The solicitor's file note is their best document.",
          opts:[
            {text:"Ask the solicitor whether he had ever heard her voice before.",weight:"strong",flavor:"bold",txt:"He had not. The room hears him realise it at the same time he does."},
            {text:"Put the care log up: 'no visitors' on the day it was signed.",weight:"strong",flavor:"technical",txt:"Someone was in that room or nobody was. Both answers are bad for them."},
            {text:"Suggest the solicitor was in on it.",weight:"weak",flavor:"bold",txt:"An accusation with nothing behind it. The bench looks up. So does the jury."}]},
        {kind:"closing",prompt:"Last words.",
          opts:[
            {text:"A woman who could not sign her name signed a house away. Ask how.",weight:"strong",flavor:"bold",txt:"You leave them with a question rather than an answer, and it is the right question."},
            {text:"Mention the car.",weight:"weak",flavor:"bold",txt:"Cheap, and they were already there. It makes you smaller, not him."},
            {text:"Thank them and sit down.",weight:"neutral",txt:"Brief. Some juries like brief."}]}]},
    opts:[
      {text:"Negotiate a partial return of the estate.",base:100,safe:true,
        ok:{fx:{inf:2,bold:-4,money:700},txt:"Half a house, no findings, no fuss. The family speaks to you again in a year."}},
      {text:"Challenge the deed on the February signature waiver.",base:81,style:"technical",
        ok:{fx:{rep:8,inf:6,money:1700},txt:"The bank's own file says she could not sign. The deed does not survive it."},
        fail:{fx:{rep:-5},txt:"A waiver is not a medical finding, says the bench. You will need a doctor."}},
      {text:"Allege the nephew forged it and put him on the stand.",base:31,boldW:3,style:"aggressive",
        ok:{fx:{rep:11,inf:9,money:2400},txt:"He explains the car for six minutes. Nobody asked him about the car."},
        fail:{fx:{rep:-13},txt:"He is grieving, plausible, and entirely undisturbed by your questions. The jury takes his side."}}]});

  P.push({id:"court6",tier:2,title:"COURT: Kepler Tower — the missing inspection",deadline:4,judge:true,
    body:"A tenant fell through a stairwell landing. The building's owner produces a full inspection record; every quarter, signed, ten years deep. Two things sit in the bundle unexplained: the inspector's own invoices stop eighteen months before the accident, and the last four inspection sheets are printed in a font the previous ones do not use. There is also a resident's complaint about the landing, filed nine months earlier, and a contractor's quote to repair it that was never accepted.",
    trial:{id:"kepler_trial",strength:3,
      verdict:{win:{rep:9,inf:9,money:2800,firm:1},lose:{rep:-9,inf:-4,money:-600},
        winTxt:"The jury found the inspections were written after the fact. The building changes hands within the year.",
        loseTxt:"Ten years of paperwork beat one font. Your client is told the stairwell was maintained to standard.",
        settleTxt:"The owner pays for the landing, the physiotherapy, and the silence. Mostly the silence."},
      phases:[
        {kind:"opening",prompt:"They will hand the jury ten years of tidy paperwork. Decide what you hand them.",
          opts:[
            {text:"The inspector stopped billing eighteen months before he stopped inspecting.",weight:"strong",flavor:"bold",txt:"The jury does the subtraction themselves, which is always better."},
            {text:"Take them through the statutory duty on common parts.",weight:"weak",flavor:"technical",txt:"Correct and forgettable. They came for a stairwell, not a statute."},
            {text:"Put the last four sheets beside the earlier ones and say nothing.",weight:"strong",flavor:"technical",txt:"You do not need to mention the font. Someone in the box notices it first."}]},
        {kind:"opposing",lines:[
          {bad:"argumentative",text:"'Does your client habitually walk down stairs without looking at them?'"},
          {bad:"assumes",text:"'When your client ignored the warning signage, was anyone with her?'"},
          {bad:"relevance",text:"'How much does your client currently receive in benefits?'"}]},
        {kind:"argument",prompt:"The resident's complaint is nine months older than the accident.",
          opts:[
            {text:"Read the complaint, then the unaccepted repair quote.",weight:"strong",flavor:"technical",txt:"They knew, they priced it, and they did not do it. Three documents, one conclusion."},
            {text:"Ask the owner what happened to the quote.",weight:"strong",flavor:"bold",txt:"He does not know. He is the sort of man who does not know things on purpose."},
            {text:"Suggest the inspector was paid to sign blank sheets.",weight:"weak",flavor:"bold",txt:"You accuse a man who is not in the room and cannot answer. It reads as reaching."}]},
        {kind:"opposing",lines:[
          {bad:"compound",text:"'Did you inspect the landing in March, and did you report what you found to the managing agent?'"},
          {bad:"hearsay",text:"'The managing agent told me the landing was sound. Correct?'"},
          {bad:"asked",text:"'I will ask again, since you seem uncertain: who signed the March sheet?'"}]},
        {kind:"closing",prompt:"Last words.",
          opts:[
            {text:"They had a complaint, a quote, and eighteen months. They chose paperwork.",weight:"strong",flavor:"bold",txt:"You end on the choice rather than the fall, and the jury stays with you."},
            {text:"Describe the injuries once more.",weight:"weak",flavor:"bold",txt:"They have heard it. Repeating it now looks like you have run out of documents."},
            {text:"Thank them and sit down.",weight:"neutral",txt:"Brief. Some juries like brief."}]}]},
    opts:[
      {text:"Accept the insurer's early offer.",base:100,safe:true,
        ok:{fx:{inf:2,bold:-4,money:900},txt:"Enough for the physiotherapy, not enough for the anger. Your client signs anyway."}},
      {text:"Attack the inspection records on the invoice gap.",base:74,style:"technical",
        ok:{fx:{rep:8,inf:7,money:2000},txt:"Nobody was paid to inspect anything for eighteen months. The records stop being records."},
        fail:{fx:{rep:-6},txt:"'Invoices go missing,' says the bench, and lets the record stand."}},
      {text:"Plead a cover-up and demand the original files.",base:34,boldW:3,style:"aggressive",
        ok:{fx:{rep:10,inf:10,money:2600},txt:"The originals do not exist. What arrives instead is an offer with a lot of zeroes."},
        fail:{fx:{rep:-12},txt:"The originals arrive, complete and boring, and you have called someone a liar in open court."}}]});

  P.push({id:"court7",tier:2,title:"COURT: Sable & Roe partnership dissolution",deadline:5,judge:true,
    body:"Two founders, one accounting firm, and a dissolution nobody wanted. Roe says Sable took clients on the way out. Sable says the client list was his before the partnership existed. The deed of partnership is silent on goodwill — but an annexe, initialled by both and stapled to the back, allocates 'originated relationships' to the originating partner. The annexe is dated after the deed, which Roe says makes it a draft. Also in the bundle: eleven client emails, a bar receipt from the night it was initialled, and a text from Roe reading 'fine, your clients, my building'.",
    trial:{id:"sable_trial",strength:-2,
      verdict:{win:{rep:8,inf:9,money:2500,firm:1},lose:{rep:-8,inf:-4,money:-500},
        winTxt:"The annexe held. Roe keeps the building and a lesson about stapling things.",
        loseTxt:"The jury decided a document initialled in a bar is a document initialled in a bar.",
        settleTxt:"They split the list along lines they could both have drawn on day one, two years and one trial late."},
      phases:[
        {kind:"opening",prompt:"Partnership juries are told two men are lying. Decide which story you are telling.",
          opts:[
            {text:"They wrote down who owned what, initialled it, and one of them now regrets it.",weight:"strong",flavor:"bold",txt:"Simple, human, and it makes the annexe the whole case."},
            {text:"Explain the law of partnership goodwill and its default rules.",weight:"weak",flavor:"technical",txt:"Defaults only matter if the annexe fails. You have just told them it might."},
            {text:"Read the text message: 'fine, your clients, my building'.",weight:"strong",flavor:"technical",txt:"Roe's own phone summarises the deal in six words."}]},
        {kind:"opposing",lines:[
          {bad:"speculation",text:"'What do you suppose Mr Roe believed he was initialling that evening?'"},
          {bad:"argumentative",text:"'Do you make a habit of getting partners to sign things in bars?'"},
          {bad:"leading",text:"'The annexe was always understood to be a draft, wasn't it?'"}]},
        {kind:"argument",prompt:"They are making a great deal of the bar receipt.",
          opts:[
            {text:"Point out the receipt shows two drinks across three hours.",weight:"strong",flavor:"technical",txt:"Not a bar story any more. Just two men in a quiet pub agreeing something."},
            {text:"Ask Roe to read his own text aloud.",weight:"strong",flavor:"bold",txt:"He reads it. Then he explains it. The explaining is the part that hurts him."},
            {text:"Argue the venue is irrelevant as a matter of law.",weight:"weak",flavor:"technical",txt:"Legally right and rhetorically deaf. The jury cares where it was signed."}]},
        {kind:"opposing",lines:[
          {bad:null,text:"'Mr Sable, on what date did the annexe come into existence?'"},
          {bad:null,text:"'Which of the eleven clients did you personally introduce?' — fair, and tedious for you."},
          {bad:null,text:"'Was the deed of partnership ever formally amended?' — proper, and pointed."}]},
        {kind:"closing",prompt:"Last words.",
          opts:[
            {text:"He wrote it, he initialled it, he texted it. Three times, one answer.",weight:"strong",flavor:"technical",txt:"You stack his own conduct into a wall he cannot climb."},
            {text:"Say Roe is a man who changes his mind when money appears.",weight:"weak",flavor:"bold",txt:"You attack him instead of the document, at the last possible moment."},
            {text:"Thank them and sit down.",weight:"neutral",txt:"Brief. Some juries like brief."}]}]},
    opts:[
      {text:"Broker a split of the client list.",base:100,safe:true,
        ok:{fx:{inf:3,bold:-4,money:800},txt:"Neither founder is happy, which is roughly what a fair split feels like."}},
      {text:"Enforce the annexe as an executed variation.",base:73,style:"technical",
        ok:{fx:{rep:7,inf:7,money:1900},txt:"Initials are initials. The annexe stands and the client list goes with it."},
        fail:{fx:{rep:-6},txt:"'A stapled afterthought,' says the bench, and reads the deed without it."}},
      {text:"Put Roe's text message in front of a jury and let him explain it.",base:37,boldW:3,style:"aggressive",
        ok:{fx:{rep:9,inf:9,money:2300},txt:"He explains it for eleven minutes. Nobody in the room believes minute four."},
        fail:{fx:{rep:-11},txt:"He explains it in one sentence and it is a good sentence. You have handed him the room."}}]});

  P.push({id:"court8",tier:2,title:"COURT: Corvid Media anti-SLAPP",deadline:3,judge:true,
    body:"Corvid Media is suing a food blogger for eleven million over a review. The review said a restaurant's supplier had been fined for hygiene breaches — which is true, published in the regulator's own register, and linked in the post. Corvid's claim runs to ninety pages and never once alleges the statement is false. Also in the bundle: an internal Corvid email describing the suit as 'a cost exercise', a demand letter sent before any complaint was made, and a second blogger who deleted a similar post last year.",
    trial:{id:"corvid_trial",strength:9,
      verdict:{win:{rep:11,inf:10,money:2900,firm:1},lose:{rep:-9,inf:-4,money:-600},
        winTxt:"Struck out with costs. The 'cost exercise' email is read aloud in the ruling, which is the part that travels.",
        loseTxt:"The jury did not like the blogger's tone. Eleven million becomes a number she will live inside.",
        settleTxt:"Corvid withdraws quietly and pays her fees. She keeps the post up, which was the only thing she wanted."},
      phases:[
        {kind:"opening",prompt:"Ninety pages and no allegation of falsity. Decide whether the jury hears that first.",
          opts:[
            {text:"In ninety pages they never once say she was wrong. That is the case.",weight:"strong",flavor:"bold",txt:"The jury looks at the ninety pages differently for the rest of the trial."},
            {text:"Set out the elements of defamation and take them through each.",weight:"weak",flavor:"technical",txt:"You teach a class. They wanted the point you just buried on slide six."},
            {text:"Read the regulator's register entry, then the sentence she wrote.",weight:"strong",flavor:"technical",txt:"Identical. One is a public record; the other is eleven million pounds."}]},
        {kind:"opposing",lines:[
          {bad:"asked",text:"'One more time, since you seem unsure: did you contact the restaurant before publishing?'"},
          {bad:"argumentative",text:"'You enjoy the attention these posts bring you, don't you?'"},
          {bad:"relevance",text:"'How much advertising revenue does your blog generate annually?'"}]},
        {kind:"argument",prompt:"Their 'cost exercise' email is the ugliest document in the room.",
          opts:[
            {text:"Read it aloud and let it sit.",weight:"strong",flavor:"bold",txt:"You do not editorialise. The email does not need help."},
            {text:"Show the demand letter predates any complaint to the restaurant.",weight:"strong",flavor:"technical",txt:"They wrote the threat before they had a grievance. The order tells the story."},
            {text:"Bring up the other blogger who deleted her post.",weight:"weak",flavor:"bold",txt:"A different person, a different post, and now you are the one reaching."}]},
        {kind:"opposing",lines:[
          {bad:"leading",text:"'And you would accept, wouldn't you, that you wrote it to get attention?'"},
          {bad:"speculation",text:"'What effect do you imagine your post had on their bookings?'"},
          {bad:"hearsay",text:"'A colleague of yours told me you were asked to take it down. Correct?'"}]},
        {kind:"closing",prompt:"Last words.",
          opts:[
            {text:"They never said she lied. They said it would be expensive to be right.",weight:"strong",flavor:"bold",txt:"You end on their own words and stop, which is the hardest part."},
            {text:"Talk about press freedom in general terms.",weight:"weak",flavor:"bold",txt:"A principle where a document would have done. It floats away."},
            {text:"Thank them and sit down.",weight:"neutral",txt:"Brief. Some juries like brief."}]}]},
    opts:[
      {text:"Advise the client to take the post down and apologise.",base:100,safe:true,
        ok:{fx:{inf:1,bold:-6,rep:-2},txt:"She takes it down. Corvid sends the same letter to two more people that month."}},
      {text:"Strike out: the claim never alleges falsity.",base:80,style:"technical",
        ok:{fx:{rep:9,inf:8,money:2200},txt:"Ninety pages die on the one thing they forgot to say. Costs follow."},
        fail:{fx:{rep:-6},txt:"The bench lets them amend. You have bought her four more months of this."}},
      {text:"Counterclaim for abuse of process and publish the 'cost exercise' email.",base:32,boldW:3,style:"aggressive",
        ok:{fx:{rep:12,inf:11,money:2700},txt:"Their strategy becomes the story. Two other bloggers write about it by Friday."},
        fail:{fx:{rep:-13},txt:"Abuse of process is a serious allegation and you could not make it stick. The bench says so twice."}}]});

  return P;
}

/* corrupt >= 40 quietly unlocks a bribe option on the case file (GDD §7) */
export const JUDGES=[
  {id:"ironwood",name:"Hon. R. Ironwood",temper:80,book:70,corrupt:5,desc:"Zero patience for theatrics. Worships procedure.",memoryGood:"You were effective. Keep it disciplined.",memoryBad:"The transcript remembers. So do I."},
  {id:"marsh",name:"Hon. C. Marsh",temper:30,book:40,corrupt:45,desc:"Enjoys a good show. Bored by footnotes.",memoryGood:"Last time was tolerable. Surprise me twice.",memoryBad:"You again? Make this one shorter."},
  {id:"pelt",name:"Hon. B. Pelt",temper:55,book:85,corrupt:10,desc:"Reads every exhibit. Twice. Cites page numbers from memory.",memoryGood:"Your last appearance survived a second reading.",memoryBad:"Your last appearance remains unfortunate."},
  {id:"crane",name:"Hon. D. Crane Jr.",temper:20,book:20,corrupt:75,desc:"Unpredictable. Once ruled based on a coin flip. Allegedly.",memoryGood:"I remember you winning. Or I dreamed it.",memoryBad:"I remember you. That is all the warning you get."},
  {id:"whitlock",name:"Hon. A. Whitlock",temper:65,book:55,corrupt:20,desc:"Ex-prosecutor. Smells weakness. Bills it as contempt.",memoryGood:"Last time, you gave me no opening.",memoryBad:"I remember the opening you gave me."},
  {id:"okonkwo",name:"Hon. M. Okonkwo",temper:40,book:78,corrupt:5,desc:"Kind, thorough, immune to theater. Quotes you back at yourself.",memoryGood:"You respected both record and court.",memoryBad:"Last time, your own record answered you."},
  {id:"fairway",name:"Hon. T. Fairway",temper:25,book:25,corrupt:85,desc:"Owns four golf memberships. Asks about your 'handicap' unprompted.",memoryGood:"Back under par, counsel. Don't ruin the card.",memoryBad:"Back for another round? Your handicap followed you."}];

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
  C.push({id:"oldfile",title:"CRISIS: The Old File",cond:()=>S.scenario==="boomerang"&&S.day>=3,
    body:"Someone pulled your termination file from archives and left photocopies in the break room. The reason you were fired — the REAL one — is suddenly lunch conversation. Hardwick rehired you anyway; now the floor wants to know what he knows.",
    opts:[
      {text:"Let it burn out. Old news ages fast.",base:100,safe:true,ok:{fx:{rep:-4,bold:-2},txt:"It fades. Mostly. 'Mostly' has a long tail in this building."}},
      {text:"Pin the original firing on bad process — with receipts.",base:60,style:"technical",ok:{fx:{rep:9,inf:6},txt:"Your receipts beat their gossip. The narrative flips: you were RIGHT, and Hardwick knew it."},fail:{fx:{rep:-8},txt:"Read aloud at podium distance, your receipts sound like excuses."}},
      {text:"Own it. Stand on a chair. Tell the WHOLE story.",base:40,boldW:3,style:"aggressive",ok:{fx:{bold:9,inf:8,rep:4},txt:"The floor expected shame; they got a keynote. Legend status: pending."},fail:{fx:{rep:-11},txt:"Halfway up the chair you remember the whole story isn't flattering."}}]});
  C.push({id:"poisonfile",title:"CRISIS: The poison file",cond:()=>S.scenario==="defector"&&S.day>=2,
    body:"A memo surfaces suggesting you left Snidely Fitch with a briefcase full of client files. The memo is doctored — you left with a plant and a grudge — but it carries your (forged) initials, and Hardwick's undivided attention.",
    opts:[
      {text:"Hand your devices to firm IT. Full audit.",base:100,safe:true,ok:{fx:{bold:-3,inf:2},txt:"Clean. Boring, humiliating, effective. The whisper dies to a hum."}},
      {text:"Prove the forgery — you never initial in blue ink.",base:62,style:"technical",ok:{fx:{rep:9,inf:8},txt:"Twelve years of black-ink initials, exhibited side by side. The memo dies in a conference room."},fail:{fx:{rep:-8},txt:"'People change pens,' shrugs the room. The hum gets louder."}},
      {text:"Leak THEIR dirty laundry in response.",base:38,boldW:3,style:"aggressive",ok:{fx:{bold:7,inf:9},txt:"Mutually assured destruction, executed unilaterally. Fitch goes very quiet."},fail:{fx:{rep:-12},txt:"Now everyone believes the memo AND thinks you're vindictive. Efficient."}}]});
  C.push({id:"counteroffer",title:"CRISIS: The counter-offer",cond:()=>S.scenario==="defector"&&S.day>=4,
    body:"Snidely Fitch's name partner makes you a public partnership offer — press release and everything. It isn't generosity; it's a loyalty test aimed at Parson Henderson, with you as the arrow.",
    opts:[
      {text:"Decline politely. Forward it to Hardwick.",base:100,safe:true,ok:{fx:{rep:6,inf:3,bold:-2},txt:"Hardwick reads it twice, grunts. Loyalty logged. Interest rate: unclear."}},
      {text:"Use it — renegotiate your standing HERE.",base:55,boldW:2,ok:{fx:{inf:10,money:800},txt:"Nothing raises your market value like someone else bidding."},fail:{fx:{rep:-9},txt:"'Auctioning yourself, counselor?' A door somewhere closes softly."}},
      {text:"Decline AT their press conference. Theatrically.",base:35,boldW:3,style:"aggressive",ok:{fx:{bold:8,inf:8,rep:5},txt:"You return the arrow mid-flight. The clip is everywhere by lunch."},fail:{fx:{rep:-10},txt:"The microphone was off. The joke died alone. Fitch smiles for the cameras."}}]});
  C.push({id:"legacydinner",title:"CRISIS: Family dinner",cond:()=>S.scenario==="legacy"&&S.day>=2,
    body:"Your estranged parent — whose name is on the wall — invites you to dinner. In the main conference room. During work hours. Everyone is watching through the glass to see if you're a real lawyer or a genetic hire.",
    opts:[
      {text:"Attend. Be diplomatic. Say nothing real.",base:100,safe:true,ok:{fx:{inf:4,bold:-3},txt:"Pleasant. Empty. The firm's gossip is merely 'mild'."}},
      {text:"Attend and pitch them your own case strategy.",base:55,boldW:2,ok:{fx:{inf:10,rep:5},txt:"They interrupt you twice, then steal your idea. That's parental respect."},fail:{fx:{rep:-8},txt:"'Interesting.' The word echoes. Everyone saw the wince."}},
      {text:"Decline. You have actual work.",base:60,boldW:2,ok:{fx:{bold:6,rep:4},txt:"The firm respects it. Your parent, weirdly, respects it more."},fail:{fx:{inf:-6},txt:"Declining the name on the wall has a price. It's invoiced in silence."}}]});
  return C.filter(c=>c.cond()&&!S.usedCrises.includes(c.id));
}

/* the Saturday interlude: fires the morning after every Friday review.
   rest = big fatigue wipe; golf = INF gamble + next judge pre-read; office = head start, tired. */
export function buildWeekend(){
  return {id:"weekend",weekend:true,title:"SATURDAY — THE WEEK RELEASES YOU",
    body:"Five days of billing are behind you. The building exhales. Two days belong — theoretically — to you. "+
      rnd(["Your phone is already lit with 'quick questions'.",
           "Somewhere, a partner is drafting a Sunday-night email.",
           "The espresso machine gets the weekend off. You might too."]),
    opts:[
      {text:"Sleep. Curtains closed. Phone in a drawer.",base:100,safe:true,fatigue:-30,
        ok:{fx:{},txt:"By Sunday evening you feel almost human. Almost. (-30 FATIGUE)"}},
      {text:"Networking golf at Pinewood Glen. (-$200, -10 FATIGUE)",base:55,boldW:1,fatigue:-10,
        ok:{fx:{money:-200,inf:5,rep:2},golf:true,txt:"Eighteen holes with people who matter. You now know a judge's handicap, swing, and weaknesses. Fresh air helped, too."},
        fail:{fx:{money:-200,bold:-2},txt:"You lost eleven balls and the thread of every conversation. The club sends a lost-and-found invoice. At least the sun was nice."}},
      {text:"Go to the office. The files miss you.",base:100,safe:true,hours:-2,fatigue:10,
        ok:{fx:{inf:1},txt:"You pre-read Monday's files in a silent building. +2h head start. The plants judge you."}}]};
}

export const SCENARIOS={
  fraud:{label:"THE FRAUD — you never went to law school",desc:"Photographic memory, zero diploma. At 80+ fatigue, rare slips can start a three-stage identity inquiry. A slip never exposes you by itself; failed cover-ups can."},
  debtor:{label:"THE DEBTOR — $180k student loans",desc:"Pay $2,000 every 3 days. Miss a payment: game over. Chase the money options."},
  legacy:{label:"THE LEGACY — your parent's name is on the wall",desc:"Influence gains +25%, reputation losses +25%. Everyone assumes nepotism."},
  defector:{label:"THE DEFECTOR — you jumped ship from Snidely Fitch",desc:"You know their playbook (+8% vs Fitch). They know where you live. Sabotage crises."},
  boomerang:{label:"THE BOOMERANG — fired once, hired back",desc:"Everyone remembers why. Relationships start hostile, REP stained — but you know the building: delegate from DAY ONE, INF starts at 18."}
};
