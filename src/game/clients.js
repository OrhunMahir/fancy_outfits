// The firm's client book — parody brands only (legally distinct, your honor).
// Pure data + builders: the engine owns all mutations. Client count scales
// with rank (CLIENT_CAP), retainers pay out every Friday, and global events
// target this list — bankruptcies, poaching, scandals, walk-in prospects.
import { rnd, rand } from "./utils.js";

const BRANDS=["Abibas","Mike Sportswear","Pumba Athletics","Starbux Coffee","McRonald's","Panasonique","Dolce & Banana","Rolexx Timepieces","KFG — Kentucky Fried Gravy","Guccy","Microsofa","Goggle","Amazun Logistics","Tesler Motors","Koka-Kola Bottling","Blue Bull Energy","Idea Flatpacks","Samsong Electronics","Adobo Systems","Whatsupp Messaging"];

export const CLIENT_CAP=r=>3+r*2; // the book grows with your rank: 3 → 11
export const buildClientPool=()=>[...BRANDS].sort(()=>rand()-.5);
export const makeClient=name=>({name, fee:100+50*Math.floor(rand()*5)}); // $100-300 weekly retainer

/* Global events: repeatable world drama aimed at the client book. Options may
   carry client:{lose:name}/{gain:true} on ok/fail — resolveCrisis applies it. */
export function buildGlobalEvent(clients){
  const templates=[];
  if(clients.length){
    const t=rnd(clients).name;
    templates.push({id:"g_bankrupt",title:"GLOBAL: "+t+" is going under",
      body:t+" — a firm client — is collapsing. "+rnd([
        "The CFO resigned by yacht and the yacht is also collateral.",
        "Their flagship product was recalled, then the recall was recalled.",
        "A court just ruled their entire business model 'aspirational'."])+
        " The retainer is on fire and everyone on the floor knows whose client it is.",
      opts:[
        {text:"Wind the account down gracefully.",base:100,safe:true,
          ok:{fx:{firm:-2,bold:-2},client:{lose:t},txt:"A dignified funeral. The retainer is buried with them."}},
        {text:"Restructure their debt overnight. All-nighter.",base:62,style:"technical",
          ok:{fx:{rep:6,inf:6,money:600},txt:t+" survives on a technicality you built at 4am. They will never stop owing you."},
          fail:{fx:{firm:-3,rep:-3},client:{lose:t},txt:"The restructuring needed one more signature than the night had hours."}},
        {text:"Bill triple on the way down.",base:40,boldW:2,style:"aggressive",
          ok:{fx:{money:1500,bold:4},client:{lose:t},txt:"The invoice cleared minutes before the accounts froze. Ice cold. Well billed."},
          fail:{fx:{rep:-6,firm:-3},client:{lose:t},txt:"The bankruptcy trustee frames your invoice as 'Exhibit Greed'."}}]});
    const p=rnd(clients).name;
    templates.push({id:"g_poach",title:"GLOBAL: Snidely Fitch is circling "+p,
      body:"Snidely Fitch has been taking "+p+"'s general counsel to lunches that end with cigars and term sheets. Your retainer is the entrée. Hardwick forwards you the rumor with the subject line 'yours, I believe'.",
      opts:[
        {text:"Let them walk. Some clients aren't worth the dinner.",base:100,safe:true,
          ok:{fx:{firm:-2,bold:-3},client:{lose:p},txt:"They walk. Fitch sends a thank-you card to the firm. Unsigned."}},
        {text:"Counter with face time and a loyalty rate.",base:60,style:"technical",
          ok:{fx:{inf:5,rep:3},txt:p+" stays. Their GC admits Fitch's cigars were 'notably dry'."},
          fail:{fx:{rep:-4,firm:-2},client:{lose:p},txt:"Your counter-dinner was at the same restaurant. Same table. They took Fitch's offer between courses."}},
        {text:"Poach Fitch's biggest client right back.",base:38,boldW:3,style:"aggressive",
          ok:{fx:{inf:7,bold:5},client:{gain:true},txt:"Mutually assured poaching, except you shot first. A new logo joins the book."},
          fail:{fx:{rep:-7},client:{lose:p},txt:"Fitch kept their client AND took yours. The trade press does the math publicly."}}]});
    const s=rnd(clients).name;
    templates.push({id:"g_scandal",title:"GLOBAL: "+s+" CEO scandal",
      body:"The CEO of "+s+" — your client — just "+rnd([
        "called their own customers 'beta testers with wallets' on a hot mic",
        "was photographed shredding documents at a shredding-truck ribbon-cutting",
        "live-streamed a board meeting by accident, including the vote about the accident"])+
        ". The press wants comment. The client wants magic.",
      opts:[
        {text:"Issue a nothing-statement. Weather it.",base:100,safe:true,
          ok:{fx:{inf:1,bold:-2},txt:"'We are aware of reports.' The news cycle eats someone else by Friday."}},
        {text:"Run the crisis playbook: counsel, don't comment.",base:58,style:"technical",
          ok:{fx:{money:900,rep:4},txt:"Billable crisis management. The scandal shrinks to a footnote with your invoice stapled to it."},
          fail:{fx:{rep:-5,firm:-2},txt:"Your carefully worded statement is misquoted into a confession."}},
        {text:"Blame a rogue intern. On live TV.",base:35,boldW:3,style:"aggressive",
          ok:{fx:{bold:6,inf:5,money:700},txt:"The intern (fictional) resigns (fictionally). The stock recovers (really)."},
          fail:{fx:{rep:-8,firm:-2},client:{lose:s},txt:"There is no intern. Everyone knows there is no intern. "+s+" fires the firm on air."}}]});
  }
  return templates.length?rnd(templates):null;
}

/* ---------- client ACQUISITION (clients are earned, never given) ---------- */
export const PARTNERS=["Whitcombe","Aldous Pryce","M. Vandermeer","Castellan"];

/* dinner opportunity: impress them and the brand signs (engine gates by REP) */
export function buildDinnerEvent(brand){
  return {id:"g_dinner",title:"OPPORTUNITY: dinner with "+brand,
    body:brand+"'s general counsel "+rnd(["saw your name in the trade press","heard about your last case from a bailiff, of all people","sat next to Hardwick at a gala and asked who the hungry one was"])+
      ", and wants dinner before choosing counsel. No pitch decks — just you, them, and a menu without prices. Impress them and the retainer follows.",
    opts:[
      {text:"Listen more than you talk. Land it quietly.",base:58,style:"technical",
        ok:{fx:{inf:3,rep:2},client:{gain:true},txt:brand+" signs over dessert. You never once said 'synergy'."},
        fail:{fx:{bold:-2},txt:"A pleasant dinner. They'll 'be in touch'. They will not be in touch."}},
      {text:"Big promises, bigger wine order.",base:40,boldW:2,style:"aggressive",
        ok:{fx:{inf:4,bold:3},client:{gain:true},txt:brand+" loves the audacity and signs the napkin. The napkin is binding. You checked."},
        fail:{fx:{rep:-4},txt:"The wine was excellent. The silence after your billing estimate was not."}},
      {text:"Send apologies — you're buried in work.",base:100,safe:true,
        ok:{fx:{bold:-2,inf:1},txt:"You bill the evening instead. The prospect dines with Snidely Fitch."}}]};
}
