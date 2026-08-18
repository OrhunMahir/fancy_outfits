import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

/* Headless, deterministic career simulator. It drives the same public engine
   actions as the React UI; no duplicate balance formulas live here. */
const storage = new Map([
  ["fo_settings_v1", JSON.stringify({ dayLen: 8, sfx: 0, bgm: 0, shake: false })],
]);
globalThis.localStorage = {
  getItem: key => storage.has(key) ? storage.get(key) : null,
  setItem: (key, value) => storage.set(key, String(value)),
  removeItem: key => storage.delete(key),
  clear: () => storage.clear(),
};
globalThis.window = { addEventListener() {}, removeEventListener() {} };
globalThis.location = { reload() {} };

let timerClock = 0;
let timerSeq = 0;
let timers = [];
globalThis.setTimeout = (fn, delay = 0) => {
  const id = ++timerSeq;
  timers.push({ id, at: timerClock + Math.max(0, Number(delay) || 0), fn });
  return id;
};
globalThis.clearTimeout = id => { timers = timers.filter(timer => timer.id !== id); };
globalThis.setInterval = () => ++timerSeq;
globalThis.clearInterval = () => {};

function drainTimers(limit = 250) {
  let count = 0;
  while (timers.length) {
    if (++count > limit) throw new Error("timer queue did not settle");
    timers.sort((a, b) => a.at - b.at || a.id - b.id);
    const timer = timers.shift();
    timerClock = timer.at;
    timer.fn();
  }
}

const engine = await import("../src/game/engine.js");
const state = await import("../src/game/state.js");
const utils = await import("../src/game/utils.js");
const constants = await import("../src/game/constants.js");
const npcs = await import("../src/game/npcs.js");
const content = await import("../src/game/content.js");
const progression = await import("../src/game/progression.js");
const fraud = await import("../src/game/fraud.js");
const { settings } = await import("../src/game/settings.js");

const SCENARIOS = ["fraud", "debtor", "legacy", "defector", "boomerang"];
const MODES = ["standard", "endless"];
const POLICIES = ["max_chance", "technical", "mixed", "bold_mixed", "aggressive", "oracle_ev", "chaos",
  "firm_manager", "firm_bad_manager", "firm_stress", "firm_only_stress"];
const ENDLESS_ONLY_POLICIES = new Set(["firm_manager", "firm_bad_manager", "firm_stress", "firm_only_stress"]);
const POLICY_VERSION = "soak-v8";
const RNG_NAMESPACE = "soak-v3"; // preserve the audited v19.9 seed corpus for paired comparisons
const POLICY_NOTES = Object.freeze({
  max_chance: "Exact-odds safety ceiling; prioritizes success chance and does not delegate.",
  technical: "Human-readable exploit baseline; prioritizes the visible TECHNICAL label and delegates up to the daily cap.",
  mixed: "Visible-information career policy; protects low REP, delegates only under pressure and takes controlled aggressive shots.",
  bold_mixed: "Visible-information risk route; spends a healthy REP/Boldness buffer on credible aggressive shots, then recovers technically.",
  aggressive: "Pure stress baseline; takes AGGRESSIVE plays whenever available.",
  oracle_ev: "Non-human hidden-information heuristic; reads exact chance and hidden outcome effects.",
  chaos: "Seeded random baseline.",
  firm_manager: "ENDLESS management route: preserves REP, keeps delegating and removes visible negative-impact non-seniors.",
  firm_bad_manager: "ENDLESS paired control: same docket discipline, but fires the best visible non-senior every Friday.",
  firm_stress: "ENDLESS-only endgame stress: reaches Name Partner technically, then fires daily while preserving REP.",
  firm_only_stress: "ENDLESS-only isolated management stress: safe personal docket, non-senior firing and no turnaround after Name Partner.",
});
const VARIANTS = Object.freeze({
  baseline: { note: "Shipped rules: Friday promotions, one handoff/day, headcount payroll and asymmetric roster results.", engine: {} },
  legacy_v199: { note: "Pre-v19.10 career: immediate promotions and two handoffs per day.", engine: { weeklyPromotion:false,delegateCap:2 } },
  weekly_promotion: { note: "Friday promotion decisions with the former two-handoff limit.", engine: { weeklyPromotion:true,delegateCap:2 } },
  weekly_delegate_one: { note: "Weekly promotion cadence plus one delegated filing per day.", engine: { weeklyPromotion:true,delegateCap:1 } },
  aggressive_150: {note:"Aggressive case wins use a 1.50 INF approach multiplier instead of 1.25.",engine:{aggressiveInfMult:1.50}},
  aggressive_175: {note:"Aggressive case wins use a 1.75 INF approach multiplier instead of 1.25.",engine:{aggressiveInfMult:1.75}},
  firm_legacy: {note:"Pre-v19.12 FIRM endgame: no payroll cost and symmetric +/-1 roster results.",engine:{firmDailyOverhead:0,rosterLossCost:1}},
  firm_overhead_1: {note:"Name Partner payroll applies a flat -1 FIRM operating cost each morning.",engine:{firmDailyOverhead:1}},
  firm_overhead_2: {note:"Name Partner payroll applies a flat -2 FIRM operating cost each morning.",engine:{firmDailyOverhead:2}},
  firm_loss_2: {note:"Roster failures cost 2 FIRM while roster wins still add 1.",engine:{rosterLossCost:2}},
  firm_overhead_1_loss2: {note:"Flat -1 daily payroll plus two-point roster failures.",engine:{firmDailyOverhead:1,rosterLossCost:2}},
  firm_payroll10_loss2: {note:"Payroll costs ceil(roster/10) FIRM per morning; roster failures cost 2.",engine:{firmPayrollDivisor:10,rosterLossCost:2}},
  judge_legacy: {note:"Pre-v1.9.13 judge memory: full-career aggregate counters.",engine:{judgeMemoryModel:"legacy"}},
  judge_rolling3: {note:"Recent-weighted memory: last three hearings at x1/x.35/x.15.",engine:{judgeMemoryModel:"rolling"}},
  judge_friday: {note:"Friday half-life memory: prior firm-week impressions weigh x0.5.",engine:{judgeMemoryModel:"friday"}},
  exceptional_off: {note:"Control: Senior Partner Influence above 100 is clipped and Name Partner waits for Friday.",engine:{exceptionalReview:false}},
  exceptional_12: {note:"Exceptional Review after 12 clipped INF, two mornings as Senior Partner and REP 30.",engine:{exceptionalReview:{threshold:12,wait:2,minRep:30}}},
  exceptional_18: {note:"Exceptional Review after 18 clipped INF, two mornings as Senior Partner and REP 30.",engine:{exceptionalReview:{threshold:18,wait:2,minRep:30}}},
  exceptional_24: {note:"Exceptional Review after 24 clipped INF, two mornings as Senior Partner and REP 30.",engine:{exceptionalReview:{threshold:24,wait:2,minRep:30}}},
  exceptional_30: {note:"Exceptional Review after 30 clipped INF, two mornings as Senior Partner and REP 30.",engine:{exceptionalReview:{threshold:30,wait:2,minRep:30}}},
  exceptional_36: {note:"Exceptional Review after 36 clipped INF, two mornings as Senior Partner and REP 30.",engine:{exceptionalReview:{threshold:36,wait:2,minRep:30}}},
  final_warning_off: {note:"Control: fatal aggressive failures receive no earned one-time protection.",engine:{finalWarning:false}},
  safe_legacy: {note:"Pre-v1.9.21 safe route: no coasting penalty and 1.5x safe hours.",engine:{safeCoasting:false,safeHoursMult:1.5}},
  safe_coasting: {note:"Consecutive safe resolutions on real files drain more Boldness and return less Influence.",engine:{safeCoasting:true,safeHoursMult:1.5}},
  safe_hours_2: {note:"Safe plays cost 2.0x hours instead of the shipped 1.75x.",engine:{safeHoursMult:2}},
  safe_both: {note:"Both safe-route levers at once: coasting penalty plus 2.0x hours.",engine:{safeCoasting:true,safeHoursMult:2}},
  safe_hours_175: {note:"Safe plays cost 1.75x hours: a milder clock price than 2.0x.",engine:{safeHoursMult:1.75}},
  safe_coasting_hours_175: {note:"Coasting penalty plus the milder 1.75x safe hours.",engine:{safeCoasting:true,safeHoursMult:1.75}},
  delegation_half: { note: "Delegated positive INF is multiplied by 0.5.", engine: { infMultipliers: { delegated: .5 } } },
  distributed_rewards: { note: "Modest positive INF reductions across case and non-case progression sources.", engine: { infMultipliers: {
    case: .9, big_case: .9, delayed: .85, delegated: .65, favor: .9,
    objective: .75, review: .75, crisis: .8, client_event: .8,
    demand: .8, story: .8, weekend: .9, rival: .8,
  } } },
});
const JUDGE_CAP_BUCKETS = ["technical_plus6", "technical_minus6", "aggressive_minus8", "bribe_minus8"];
const FIRM_SOURCES = ["case","big_case","delayed","delegated","review","objective","crisis","client_event",
  "demand","story","weekend","deadline","retainer","roster","payroll","firing","turnaround","other"];
const FIRM_AUDIT_POLICIES = new Set(["firm_manager","firm_bad_manager","firm_stress","firm_only_stress"]);
const TECHNICAL_POLICIES = new Set(["technical","firm_manager","firm_bad_manager","firm_stress","firm_only_stress"]);
const KNOWN_JUDGES = new Set(content.JUDGES.map(judge => judge.id));

function parseList(raw) { return String(raw || "").split(",").map(value => value.trim()).filter(Boolean); }
function parseArgs(argv) {
  const out = { seeds: 64, standardDays: 40, endlessDays: 50, json: null, replay: null,
    scenarios: [...SCENARIOS], modes: [...MODES], policies: [...POLICIES], variants: ["baseline"] };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const take = () => argv[++i];
    if (arg === "--seeds") out.seeds = Number(take());
    else if (arg === "--standard-days") out.standardDays = Number(take());
    else if (arg === "--endless-days") out.endlessDays = Number(take());
    else if (arg === "--json") out.json = take();
    else if (arg === "--replay") out.replay = take();
    else if (arg === "--scenarios") out.scenarios = parseList(take());
    else if (arg === "--modes") out.modes = parseList(take());
    else if (arg === "--policies") out.policies = parseList(take());
    else if (arg === "--variants") out.variants = parseList(take());
    else if (arg === "--help") out.help = true;
    else throw new Error("Unknown argument: " + arg);
  }
  for (const key of ["seeds", "standardDays", "endlessDays"])
    if (!Number.isSafeInteger(out[key]) || out[key] < 1) throw new Error("Invalid --" + key + " value");
  for (const [key, allowed] of [["scenarios",SCENARIOS],["modes",MODES],["policies",POLICIES],["variants",Object.keys(VARIANTS)]])
    if (!out[key].length || out[key].some(value => !allowed.includes(value))) throw new Error("Invalid --" + key + " value");
  return out;
}

function mulberry32(seed) {
  let cursor = seed >>> 0;
  const fn = () => {
    cursor = (cursor + 0x6D2B79F5) >>> 0;
    let r = Math.imul(cursor ^ cursor >>> 15, 1 | cursor);
    r ^= r + Math.imul(r ^ r >>> 7, 61 | r);
    fn.calls++;
    return ((r ^ r >>> 14) >>> 0) / 4294967296;
  };
  fn.calls = 0;
  fn.cursor = () => cursor;
  return fn;
}

const round = (value, digits = 2) => value == null ? null : Number(Number(value).toFixed(digits));
const pct = value => round(value * 100, 1);
const mean = values => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
const quantile = (values, q) => {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos), hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
};
const linearSlope = values => {
  if (values.length < 2) return 0;
  const center = (values.length - 1) / 2;
  const denom = values.reduce((sum, _, i) => sum + (i - center) ** 2, 0);
  return denom ? values.reduce((sum, value, i) => sum + (i - center) * value, 0) / denom : 0;
};
const actionables = S => S.inbox.filter(c => !c.msg && !c.pending && !c.delegated);
const styleOf = option => option.safe ? "safe" : option.style || (option.boldW ? "aggressive" : "neutral");
const caseKey = (c, option) => (c.id || c.title) + "\u0000" + option.text;

function sha(value) { return createHash("sha256").update(value).digest("hex"); }
function provenance() {
  const files = [
    "scripts/soak-balance.mjs", "src/game/constants.js", "src/game/state.js", "src/game/engine.js",
    "src/game/content.js", "src/game/casegen.js", "src/game/npcs.js", "src/game/clients.js", "src/game/utils.js",
    "src/game/minigames.js", "src/game/progression.js", "src/game/fraud.js",
  ];
  const fileHashes = Object.fromEntries(files.map(file => [file, sha(readFileSync(file))]));
  let commit = "unknown", status = "unknown", diff = "unknown";
  try { commit = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(); } catch {}
  try { status = execFileSync("git", ["status", "--short"], { encoding: "utf8" }).trim(); } catch {}
  try { diff = execFileSync("git", ["diff", "--binary"], { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 }); } catch {}
  return { commit, dirty: !!status, statusHash: sha(status), dirtyDiffHash: sha(diff), node: process.version,
    platform: process.platform + "/" + process.arch,
    simulatorHash: fileHashes["scripts/soak-balance.mjs"], fileHashes };
}

function resetHarness() {
  storage.clear();
  storage.set("fo_settings_v1", JSON.stringify({ dayLen: 8, sfx: 0, bgm: 0, shake: false }));
  settings.dayLen = 8; settings.sfx = 0; settings.bgm = 0; settings.shake = false;
  timers = []; timerClock = 0; timerSeq = 0;
}

function optionUtility(option, c) {
  const S = state.S;
  const p = engine.chance(option, c) / 100;
  const value = outcome => {
    const fx = outcome?.fx || {};
    const repW = S.rep <= 35 ? 4 : S.rep <= 50 ? 2.2 : 1.3;
    const firmW = S.firm <= 25 ? 4 : S.firm < 50 ? 2 : 1;
    const moneyW = S.scenario === "debtor" ? .006 : .0025;
    return (fx.rep || 0) * repW + (fx.inf || 0) * 2.4 + (fx.firm || 0) * firmW +
      (fx.bold || 0) * .45 + (fx.money || 0) * moneyW + (outcome?.client?.boost ? 8 : 0) -
      (outcome?.expose ? 100 : 0);
  };
  const cost = engine.optHours(c, option) * 1.2 + (option.bribe || 0) / 450;
  return p * value(option.ok) + (1 - p) * value(option.fail) - cost;
}

function perceivedChance(option, c) {
  const shown = engine.displayChance(option, c);
  if (shown === "100%") return 100;
  const numbers = String(shown || "").match(/\d+/g)?.map(Number) || [];
  return numbers.length >= 2 ? (numbers[0] + numbers[1]) / 2 : engine.chance(option, c);
}

function availableOptions(c) {
  // Career policies audit the legal decision economy. Interactive boards —
  // COVERT ACTIONS and CASE PREP alike — need player execution and are covered
  // by their own deterministic regression tests, so headless bots leave them on
  // the table. (The involuntary Evidence Timeline is handled in the run loop.)
  return c.opts.filter(option => !option.action&&(!option.bribe || state.S.money >= option.bribe));
}

function registerAggressiveOffer(metrics,context){
  const option=availableOptions(context).find(o=>o.style==="aggressive");
  if(!option) return;
  const shown=perceivedChance(option,context),a=metrics.aggressiveOffers;
  a.count++; a.chanceSum+=shown;
  for(const threshold of [20,25,30,35,40]) if(shown>=threshold) a["p"+threshold]++;
}

function chooseOption(policy, c, policyRng) {
  const options = availableOptions(c);
  if (!options.length) return null;
  const byChance = [...options].sort((a, b) => engine.chance(b, c) - engine.chance(a, c) ||
    engine.optHours(c, a) - engine.optHours(c, b) || c.opts.indexOf(a) - c.opts.indexOf(b));
  const byVisible = [...options].sort((a, b) => perceivedChance(b, c) - perceivedChance(a, c) ||
    engine.optHours(c, a) - engine.optHours(c, b) || c.opts.indexOf(a) - c.opts.indexOf(b));
  if (policy === "max_chance") return byChance[0];
  if (policy === "firm_stress" && state.S.endlessWon && state.S.rep < 50)
    return options.find(option => option.safe) || byChance[0];
  if (policy === "firm_only_stress" && state.S.endlessWon)
    return options.find(option => option.safe) || byVisible[0];
  if ((policy === "firm_manager" || policy === "firm_bad_manager") && state.S.endlessWon && state.S.rep < 42)
    return options.find(option => option.safe) || options.find(option => option.style === "technical") || byVisible[0];
  if (TECHNICAL_POLICIES.has(policy))
    return options.find(option => option.style === "technical") || byChance[0];
  if (policy === "mixed") {
    const safe = options.find(option => option.safe), technical = options.find(option => option.style === "technical");
    const aggressive = options.find(option => option.style === "aggressive");
    if (state.S.rep <= 32 || state.S.fatigue >= 84) return safe || byVisible[0];
    if (aggressive && state.S.rep >= 52 && state.S.fatigue < 75 && perceivedChance(aggressive, c) >= 20 && policyRng() < .25)
      return aggressive;
    if (technical && perceivedChance(technical, c) >= 50) return technical;
    if (aggressive && state.S.bold >= 65 && perceivedChance(aggressive, c) >= 50) return aggressive;
    return safe || byVisible[0];
  }
  if (policy === "bold_mixed") {
    const S=state.S, safe=options.find(option=>option.safe), technical=options.find(option=>option.style==="technical");
    const aggressive=options.find(option=>option.style==="aggressive");
    if(S.rep<=32||S.fatigue>=82) return safe||technical||byVisible[0];
    const aggChance=aggressive?perceivedChance(aggressive,c):0;
    const riskReady=aggressive&&S.rep>=38&&S.bold>=38&&S.fatigue<74&&aggChance>=15;
    const protectedShot=riskReady&&S.rep>=40&&(policyRng()<.55);
    if(protectedShot) return aggressive;
    if(technical&&perceivedChance(technical,c)>=48) return technical;
    if(riskReady&&S.rep>=52) return aggressive;
    return safe||byVisible[0];
  }
  if (policy === "aggressive") return options.find(option => option.style === "aggressive") ||
    [...options].sort((a, b) => (b.boldW || 0) - (a.boldW || 0) || engine.chance(b, c) - engine.chance(a, c))[0];
  if (policy === "chaos") return options[Math.floor(policyRng() * options.length)];
  return [...options].sort((a, b) => {
    const visibleA = optionUtility(a, c) + (perceivedChance(a, c) - engine.chance(a, c)) * .12;
    const visibleB = optionUtility(b, c) + (perceivedChance(b, c) - engine.chance(b, c)) * .12;
    return visibleB - visibleA || perceivedChance(b, c) - perceivedChance(a, c);
  })[0];
}

function chooseEventOption(policy, event, policyRng, skipped) {
  const S = state.S;
  if (event.id === "latework") {
    const pending = S.pendingChoice;
    const urgent = pending && pending.c.dueDay <= S.day;
    const go = event.opts.find(option => option.lateGo);
    const no = event.opts.find(option => option.lateNo);
    const push = policy === "aggressive" ||
      (policy === "oracle_ev" && urgent && S.fatigue < 72) ||
      ((policy === "technical" || policy === "firm_manager" || policy === "firm_bad_manager" || policy === "firm_stress") && urgent && S.fatigue < 62) ||
      ((policy === "mixed" || policy === "firm_only_stress") && urgent && S.fatigue < 56) ||
      (policy === "bold_mixed" && urgent && S.fatigue < 62) ||
      (policy === "chaos" && policyRng() < .5);
    if (!push && pending) skipped.add(pending.c);
    return push ? go : no;
  }
  if (event.id === "overtime") {
    const home = event.opts.find(option => option.home);
    const overtime = event.opts.find(option => option.ot);
    if (!overtime) return home;
    const urgent = actionables(S).some(c => c.dueDay <= S.day);
    const stay = policy === "aggressive" ? urgent && S.fatigue < 88 :
      (policy === "technical" || policy === "firm_manager" || policy === "firm_bad_manager" || policy === "firm_stress") ? urgent && S.otToday < 1 && S.fatigue < 68 :
      (policy === "mixed" || policy === "firm_only_stress") ? urgent && S.otToday < 1 && S.fatigue < 60 :
      policy === "bold_mixed" ? urgent && S.otToday < 1 && S.fatigue < 64 :
      policy === "oracle_ev" ? urgent && S.fatigue < 62 :
      policy === "chaos" ? policyRng() < .45 : false;
    return stay ? overtime : home;
  }
  const options = event.opts.filter(option => !option.bribe || S.money >= option.bribe);
  if (policy === "chaos") return options[Math.floor(policyRng() * options.length)];
  if (policy === "firm_stress" && S.endlessWon && S.rep < 50)
    return options.find(option => option.safe) || options[0];
  if (policy === "firm_only_stress" && S.endlessWon) return options.find(option => option.safe) || options[0];
  if ((policy === "firm_manager" || policy === "firm_bad_manager") && S.endlessWon && S.rep < 42)
    return options.find(option => option.safe) || options.find(option => option.style === "technical") || options[0];
  if (TECHNICAL_POLICIES.has(policy)) return options.find(option => option.style === "technical") ||
    options.find(option => option.safe) || options[0];
  if (policy === "mixed") {
    const safe=options.find(option=>option.safe), technical=options.find(option=>option.style==="technical");
    const aggressive=options.find(option=>option.style==="aggressive");
    if(S.rep<=34||S.fatigue>=80) return safe||options[0];
    if(aggressive&&S.rep>=52&&S.fatigue<72&&perceivedChance(aggressive,event)>=30&&policyRng()<.18) return aggressive;
    if(technical&&perceivedChance(technical,event)>=52) return technical;
    return safe||options[0];
  }
  if(policy==="bold_mixed"){
    const safe=options.find(option=>option.safe),technical=options.find(option=>option.style==="technical");
    const aggressive=options.find(option=>option.style==="aggressive");
    if(S.rep<=34||S.fatigue>=80) return safe||technical||options[0];
    if(aggressive&&S.rep>=40&&S.bold>=38&&S.fatigue<72&&perceivedChance(aggressive,event)>=15&&policyRng()<.50) return aggressive;
    if(technical&&perceivedChance(technical,event)>=50) return technical;
    return safe||options[0];
  }
  if (policy === "aggressive") return options.find(option => option.style === "aggressive") || options.at(-1);
  if (policy === "oracle_ev") return [...options].sort((a, b) => optionUtility(b, event) - optionUtility(a, event))[0];
  return [...options].sort((a, b) => engine.chance(b, event) - engine.chance(a, event))[0];
}

function npcEstimate(npc) {
  const known = npc.known ? { Reliable: 25, Brave: 10, Lazy: -20, Traitor: -5 }[npc.trait] || 0 : 0;
  return Math.max(10, Math.min(95, 60 + Math.round(npc.rel / 5) + known));
}

function delegationTarget(policy, skipped) {
  const S = state.S;
  if (!S.npcs.length || S.today.delegated >= engine.delegationDailyLimit() ||
      (S.rank < 1 && S.scenario !== "boomerang")) return null;
  if (!["technical","mixed","bold_mixed","oracle_ev","firm_manager","firm_bad_manager","firm_stress","firm_only_stress"].includes(policy) ||
      ((policy === "firm_stress" || policy === "firm_only_stress") && S.endlessWon)) return null;
  const eligible = actionables(S).filter(c => !skipped.has(c) && !c.judge && !c.favor && !c.big && (c.tier || 0) <= 1)
    .sort((a, b) => a.dueDay - b.dueDay || (a.tier || 0) - (b.tier || 0));
  if (!eligible.length) return null;
  const backlog = actionables(S).length;
  if (policy === "mixed" && S.today.delegated >= 1 && backlog < 7 && !eligible.some(c => c.dueDay <= S.day)) return null;
  if (policy === "bold_mixed" && backlog < 4 && !eligible.some(c=>c.dueDay<=S.day)) return null;
  if (policy === "oracle_ev" && backlog < 4 && S.hours >= 3) return null;
  if (policy === "mixed" && backlog < 5 && !eligible.some(c => c.dueDay <= S.day)) return null;
  const npc = [...S.npcs].sort((a, b) => npcEstimate(b) - npcEstimate(a) || b.rel - a.rel)[0];
  const pressure=backlog>=7||eligible.some(c=>c.dueDay<=S.day);
  // Boomerang's stated perk is day-one delegation into a hostile floor. A
  // visible-information player can rationally risk the initial ~55% estimate
  // once deadlines burn; refusing every handoff made the old mixed bot fake a
  // scenario balance problem that the actual UI does not impose.
  const threshold=policy==="mixed"?(pressure&&S.scenario==="boomerang"?55:pressure?60:65):
    policy==="bold_mixed"?(backlog>=6||eligible.some(c=>c.dueDay<=S.day)?55:62):policy==="oracle_ev"?62:55;
  return npcEstimate(npc) >= threshold ? { c: eligible[0], npc } : null;
}

function canonicalSnapshot(rngCalls) {
  const S = state.S;
  const filing = c => ({
    id: c.id || null, title: c.title, due: c.dueDay ?? null,
    pending: c.pending ? { day: c.pending.day, win: c.pending.win, play: c.pending.o?.text } : null,
    delegated: c.delegated ? { ...c.delegated } : null,
    judge: engine.judgeId(c.judge), big: c.big || null, opts: c.opts?.map(option => option.text) || [],
  });
  return {
    rngCalls, day: S.day, rank: S.rank, rep: S.rep, bold: S.bold, inf: S.inf, firm: S.firm,
    money: S.money, hours: S.hours, fatigue: S.fatigue, progression:S.progression, fraudRisk:S.fraudRisk, ot: [S.otToday, S.otHours],
    over: S.over, endlessWon: S.endlessWon, runRecorded: S.runRecorded, caseSeq: S.caseSeq,
    event: S.event ? { id: S.event.id, opts: S.event.opts.map(option => option.text) } : null,
    pendingChoice: S.pendingChoice ? { case: S.pendingChoice.c?.id || S.pendingChoice.c?.title,
      option: S.pendingChoice.o?.text } : null,
    summary: S.summary ? { title: S.summary.title, action: S.summary.action } : null,
    pendingSummary: S.pendingSummary ? { title: S.pendingSummary.title, action: S.pendingSummary.action } : null,
    inbox: S.inbox.map(c => c.msg ? { msg: c.title, body: c.body } : filing(c)),
    followups: S.followups.map(f => ({ day: f.day, case: filing(f.case) })),
    archiveTotal: S.archiveTotal,
    latestArchive: S.archive.slice(0, 3).map(entry => ({ id: entry.id || null, day: entry.day, title: entry.title,
      play: entry.play, win: entry.win, via: entry.via, judgeMemory: entry.judgeMemory || "" })),
    clients: S.clients.map(client => ({ ...client })), clientPool: [...S.clientPool],
    npcs: S.npcs.map(npc => ({ id: npc.id, trait: npc.trait, known: npc.known, rel: npc.rel })),
    nemesis: S.nemesis ? { ...S.nemesis } : null, rivalPact: S.rivalPact ? { ...S.rivalPact } : null,
    bigCase: S.bigCase ? { ...S.bigCase } : null, judgeMemory: S.judgeMemory,
    runStats: S.runStats, today: S.today, objective: S.objective,
    usedCrises: [...S.usedCrises], npcStories: [...S.npcStories], firedNames: [...S.firedNames],
    firmOps: [S.fireHeat, S.everFired, S.firmPlanDay, S.firmGateHintRank,S.promotionReviewDay,S.promotionHintRank,
      S.reviewMomentum,S.seniorPartnerDay,S.exceptionalReviewDay,S.exceptionalReviewHinted],
    economy: [S.debtDue, S.suitCost, S.coffeeToday, S.marvBribes, S.bigDoneDay],
    week: [S.weekStart, S.weekMissed], decor: S.decor, golfEdge: S.golfEdge,
    roster: S.roster?.map(e => ({ id: e.id, won: e.won, lost: e.lost, impact: e.impact })) || null,
    pool: S.pool.map(c => [c.id, !!c.taken]),
  };
}

function assertInvariants(run, label) {
  const S = state.S;
  const fail = message => { throw new Error(label + ": " + message); };
  if (!S) fail("missing state");
  if (!Number.isSafeInteger(S.day) || S.day < 1) fail("invalid day");
  if (!Number.isSafeInteger(S.rank) || S.rank < 0 || S.rank > 4) fail("invalid rank");
  for (const [key, min, max] of [["rep", 0, 100], ["bold", 0, 100], ["inf", 0, 100],
    ["firm", 0, 100], ["fatigue", 0, 100]])
    if (!Number.isFinite(S[key]) || S[key] < min || S[key] > max) fail("invalid " + key + "=" + S[key]);
  if (!Number.isFinite(S.money) || !Number.isFinite(S.hours) || S.hours < 0 || S.hours > 48) fail("invalid economy/clock");
  if (!Number.isSafeInteger(S.caseSeq) || S.caseSeq < 0) fail("invalid case sequence");
  const progressionError=progression.progressionValidationError(S.progression,S.scenario);
  if(progressionError) fail("invalid progression: "+progressionError);
  const fraudError=fraud.fraudRiskValidationError(S.fraudRisk,S.scenario,S.day);
  if(fraudError) fail("invalid identity pressure: "+fraudError);
  if (!Number.isSafeInteger(S.reviewMomentum) || S.reviewMomentum < 0 || S.reviewMomentum > 100) fail("invalid review momentum");
  if (!Number.isSafeInteger(S.seniorPartnerDay) || S.seniorPartnerDay < 0 || S.seniorPartnerDay > S.day) fail("invalid Senior Partner day");
  if (!Number.isSafeInteger(S.exceptionalReviewDay) || S.exceptionalReviewDay < 0 || S.exceptionalReviewDay > S.day) fail("invalid exceptional review day");
  const clients = S.clients.map(c => c.name);
  if (new Set(clients).size !== clients.length) fail("duplicate clients");
  if (S.inbox.filter(c => c.msg).length > constants.INBOX_MESSAGE_LIMIT) fail("message history exceeded cap");
  for (const [id, memory] of Object.entries(S.judgeMemory)) {
    if (!KNOWN_JUDGES.has(id)) fail("unknown judge memory " + id);
    const total = memory.aggressiveW + memory.aggressiveL + memory.technicalW + memory.technicalL +
      memory.bribeW + memory.bribeL + memory.safe + memory.neutralW + memory.neutralL;
    if (memory.seen !== total) fail("judge memory total mismatch " + id);
    if (!Array.isArray(memory.recent) || !memory.recent.length || memory.recent.length > constants.JUDGE_MEMORY_EVENT_LIMIT)
      fail("judge recent memory invalid " + id);
    const last=memory.recent.at(-1);
    if(last.style!==memory.lastStyle||last.win!==memory.lastWin||last.day!==memory.lastDay)
      fail("judge recent memory tail mismatch " + id);
  }
  for (const c of S.inbox) {
    if (c.msg) continue;
    if (!Number.isFinite(c.dueDay)) fail("live filing without deadline: " + c.title);
    if (c.judge && c.delegated) fail("delegated court filing: " + c.title);
    if (c.big && (c.pending || c.delegated)) fail("delayed/delegated Client War: " + c.title);
    for (const option of c.opts) {
      const before = run.gameRng.calls;
      const chance = engine.chance(option, c);
      if(option.action){
        if(chance!==null) fail("interactive action exposed a fake chance: " + c.title);
        if(run.gameRng.calls!==before) fail("interactive action chance consumed RNG: "+c.title);
        continue;
      }
      if (!Number.isFinite(chance) || chance < 5 || chance > 100) fail("invalid chance: " + c.title);
      if (run.gameRng.calls !== before) fail("chance consumed RNG: " + c.title);
    }
  }
  if (S.bigCase) {
    const carriers = S.inbox.filter(c => c.big?.client === S.bigCase.client).length +
      S.followups.filter(f => f.case?.big?.client === S.bigCase.client).length;
    if (carriers !== 1) fail("Client War carrier count=" + carriers);
  }
  if (!S.over && S.mode !== "ironman" && S.summary?.action === "nextDay" &&
      engine.inspectSave(S.slot).status !== "ready") fail("daily checkpoint is not resumable");
  if (!S.over && !S.summary && !S.event && !S.leaving && !actionables(S).length && !S.inbox.some(c => c.pending || c.delegated)) {
    // An empty desk is legal because GO HOME remains available.
    if (typeof engine.endDay !== "function") fail("no legal next action");
  }
}

function newMetrics(tuple) {
  const judgeCaps = Object.fromEntries(JUDGE_CAP_BUCKETS.map(key =>
    [key, { selected: 0, capped: 0, post20: 0, post20Capped: 0, firstCapAppearances: [] }]));
  const firmFlowBy = Object.fromEntries(FIRM_SOURCES.map(key =>
    [key,{up:0,down:0,net:0,requestedUp:0,clippedUp:0}]));
  return {
    ...tuple, actions: 0, outcome: "HORIZON", terminal: false, won: false, winDay: null, npDay: null,
    promotions: [], promotionReadyDays:{1:null,2:null,3:null,4:null}, exceptionalReviewDay:null,
    styles: { safe: 0, technical: 0, aggressive: 0, bribe: 0, neutral: 0 },
    styleRolls: { safe: 0, technical: 0, aggressive: 0, bribe: 0, neutral: 0 },
    styleWins: { safe: 0, technical: 0, aggressive: 0, bribe: 0, neutral: 0 }, rolls: 0,
    expectedChance: 0, workHours: 0, overtimeBlocks: 0, lateWork: 0, sentHome: 0,
    objectivesMet: 0, daysClosed: 0, maxBacklog: 0, maxInbox: 0, maxMessages: 0, messageCapReached: false,
    daysAbove15: 0, backlogTailSlope: 0, meanDailyPeak: 0,
    minRep: 100, minFirm: 100, maxFatigue: 0,
    clientsGained: 0, clientsLost: 0, judgeHearings: 0, judgeCap: 0, judgePost20: 0,
    judgePost20Cap: 0, judgeAdjusted: 0, judgeModifierSum: 0, judgeCaps,
    overflowInf:0, infGainBy: { case:0, big_case:0, delayed:0, delegated:0, favor:0, objective:0, review:0,
      crisis:0, client_event:0, demand:0, story:0, weekend:0, rival:0, decor:0, other:0 },
    nemesisGainBy:{passive:0,failure:0}, delegatedResults:{won:0,lost:0}, deadlineResults:0,
    rivalActions:{truce:0,ally:0,sabotage:0}, finalWarnings:0,
    aggressiveOffers:{count:0,chanceSum:0,p20:0,p25:0,p30:0,p35:0,p40:0},
    firmFlowBy,npStartFirm:null,minPostNpFirm:null,firmCapDays:0,
    rosterTicks:0,rosterWins:0,rosterLosses:0,rosterRawDrift:0,rosterCappedDrift:0,
    rosterEmployeeDays:0,rosterImpactDays:0,firings:0,firedImpact:0,lawsuits:0,
    finalXp:0,finalLevel:1,finalSkillPoints:0,
    fraud:{checks:0,hits:0,byBand:{80:{checks:0,hits:0},90:{checks:0,hits:0},95:{checks:0,hits:0},100:{checks:0,hits:0}},
      stages:{},exposed:0},
    integrity: [], flags: [], traceDigest: null,
  };
}

function judgeCapBucket(style, modifier) {
  if (style === "technical" && modifier === 6) return "technical_plus6";
  if (style === "technical" && modifier === -6) return "technical_minus6";
  if (style === "aggressive" && modifier === -8) return "aggressive_minus8";
  if (style === "bribe" && modifier === -8) return "bribe_minus8";
  return null;
}

function judgeStyleAppearances(memory, style) {
  if (!memory) return 0;
  if (style === "technical") return memory.technicalW + memory.technicalL;
  if (style === "aggressive") return memory.aggressiveW + memory.aggressiveL;
  if (style === "bribe") return memory.bribeW + memory.bribeL;
  return 0;
}

function registerChoice(run, c, option) {
  const style = styleOf(option);
  const chance = engine.chance(option, c);
  run.metrics.styles[style] = (run.metrics.styles[style] || 0) + 1;
  run.metrics.workHours += engine.optHours(c, option);
  const key = caseKey(c, option);
  if (!run.pendingRolls.has(key)) run.pendingRolls.set(key, []);
  run.pendingRolls.get(key).push({ style, chance });
  if (c.judge) {
    const modifier = engine.judgeMemoryModifier(option, c);
    run.metrics.judgeHearings++;
    if (modifier) run.metrics.judgeAdjusted++;
    run.metrics.judgeModifierSum += modifier;
    const capped = (style === "technical" && Math.abs(modifier) === 6) ||
      ((style === "aggressive" || style === "bribe") && modifier === -8);
    if (capped) run.metrics.judgeCap++;
    if (state.S.day > 20) { run.metrics.judgePost20++; if (capped) run.metrics.judgePost20Cap++; }
    const selectedBuckets = style === "technical" ? ["technical_plus6", "technical_minus6"] :
      style === "aggressive" ? ["aggressive_minus8"] : style === "bribe" ? ["bribe_minus8"] : [];
    for (const name of selectedBuckets) {
      run.metrics.judgeCaps[name].selected++;
      if (state.S.day > 20) run.metrics.judgeCaps[name].post20++;
    }
    const cappedBucket = judgeCapBucket(style, modifier);
    if (cappedBucket) {
      const bucket = run.metrics.judgeCaps[cappedBucket];
      bucket.capped++;
      if (state.S.day > 20) bucket.post20Capped++;
      const id = engine.judgeId(c.judge), firstKey = id + "|" + cappedBucket;
      if (!run.seenJudgeCaps.has(firstKey)) {
        run.seenJudgeCaps.add(firstKey);
        bucket.firstCapAppearances.push(judgeStyleAppearances(state.S.judgeMemory[id], style) + 1);
      }
    }
  }
}

function processArchives(run) {
  const S = state.S;
  const delta = S.archiveTotal - run.lastArchiveTotal;
  if (delta <= 0) return;
  const entries = S.archive.slice(0, Math.min(delta, S.archive.length)).reverse();
  for (const entry of entries) {
    if(entry.via==="delegated") run.metrics.delegatedResults[entry.win?"won":"lost"]++;
    if(entry.via==="deadline missed") run.metrics.deadlineResults++;
    const queue = run.pendingRolls.get((entry.id || entry.title) + "\u0000" + entry.play);
    const meta = queue?.shift();
    if (!meta) {
      const automatic = entry.via === "delegated" || entry.via === "deadline missed" || /^\(/.test(entry.play || "");
      if (!automatic) throw new Error("resolved player filing was not matched to its choice: " + (entry.id || entry.title));
      continue;
    }
    run.metrics.rolls++;
    run.metrics.styleRolls[meta.style] = (run.metrics.styleRolls[meta.style] || 0) + 1;
    run.metrics.expectedChance += meta.chance;
    if (entry.win) run.metrics.styleWins[meta.style] = (run.metrics.styleWins[meta.style] || 0) + 1;
  }
  run.lastArchiveTotal = S.archiveTotal;
}

function observe(run) {
  const S = state.S, m = run.metrics;
  processArchives(run);
  if (S.rank > run.lastRank) for (let rank = run.lastRank + 1; rank <= S.rank; rank++) m.promotions.push({ rank, day: S.day });
  run.lastRank = S.rank;
  if(S.rank<4&&S.inf>=constants.RANK_REQ[S.rank]&&m.promotionReadyDays[S.rank+1]==null)
    m.promotionReadyDays[S.rank+1]=S.day;
  if (S.endlessWon && m.npDay == null) m.npDay = S.day;
  if (S.rank === 4 && m.winDay == null) m.winDay = S.day;
  if(S.exceptionalReviewDay&&m.exceptionalReviewDay==null) m.exceptionalReviewDay=S.exceptionalReviewDay;
  if(S.endlessWon||S.rank===4){
    if(m.npStartFirm==null) m.npStartFirm=S.firm;
    m.minPostNpFirm=m.minPostNpFirm==null?S.firm:Math.min(m.minPostNpFirm,S.firm);
    if(S.firm===100) run.firmCapDays.add(S.day);
  }
  m.minRep = Math.min(m.minRep, S.rep); m.minFirm = Math.min(m.minFirm, S.firm);
  m.maxFatigue = Math.max(m.maxFatigue, S.fatigue);
  const backlog = actionables(S).length;
  const messages = S.inbox.filter(c => c.msg).length;
  if (!S.summary && !S.over) {
    const sample = run.backlogDays.get(S.day) || { day: S.day, peak: 0, last: 0, observations: 0 };
    sample.peak = Math.max(sample.peak, backlog); sample.last = backlog; sample.observations++;
    run.backlogDays.set(S.day, sample);
    m.maxBacklog = Math.max(m.maxBacklog, backlog);
  }
  m.maxInbox = Math.max(m.maxInbox, S.inbox.length);
  m.maxMessages = Math.max(m.maxMessages, messages);
  if (messages === constants.INBOX_MESSAGE_LIMIT) m.messageCapReached = true;
  const clientNames = new Set(S.clients.map(c => c.name));
  for (const name of clientNames) if (!run.lastClients.has(name)) m.clientsGained++;
  for (const name of run.lastClients) if (!clientNames.has(name)) m.clientsLost++;
  run.lastClients = clientNames;
  if (S.summary && run.lastSummary !== S.summary) {
    const lines = S.summary.lines || [];
    if (lines.some(line => /DAILY GOAL MET/.test(line))) m.objectivesMet++;
    if (lines.some(line => /SENT HOME|COLLAPSE at/.test(line))) m.sentHome++;
    if (S.summary.action === "nextDay") m.daysClosed++;
    run.lastSummary = S.summary;
  }
  const snap = canonicalSnapshot(run.gameRng.calls);
  run.hash.update(JSON.stringify(snap) + "\n");
}

function runAction(run, label, fn) {
  const beforeDay = state.S.day;
  const beforeInf = state.S.inf;
  const beforeState = JSON.stringify(canonicalSnapshot(run.gameRng.calls));
  const actionRecord = {
    day: state.S.day, label, policyCalls: run.policyRng.calls, policyCursor: run.policyRng.cursor(),
    skipped: [...run.skipped].map(c => c.id || c.title).sort(), firedDay: run.firedDay,
  };
  run.hash.update("ACTION " + JSON.stringify(actionRecord) + "\n");
  if(label==="rival truce") run.metrics.rivalActions.truce++;
  else if(label==="rival ally") run.metrics.rivalActions.ally++;
  else if(label==="rival sabotage") run.metrics.rivalActions.sabotage++;
  fn();
  drainTimers();
  const afterState = JSON.stringify(canonicalSnapshot(run.gameRng.calls));
  if (afterState === beforeState) run.noProgressStreak++;
  else run.noProgressStreak = 0;
  if (run.noProgressStreak >= 3) throw new Error("three consecutive no-progress actions: " + label);
  const infGain = Math.max(0, state.S.inf - beforeInf);
  if (run.actionTrace) run.actionTrace.push({ ...actionRecord, stateHash: sha(afterState), infGain,
    rank:state.S.rank,inf:state.S.inf,rep:state.S.rep,firm:state.S.firm,
    reviewMomentum:state.S.reviewMomentum,seniorPartnerDay:state.S.seniorPartnerDay,
    exceptionalReviewDay:state.S.exceptionalReviewDay });
  run.metrics.actions++;
  assertInvariants(run, label);
  observe(run);
  if (state.S.day === beforeDay) run.actionsThisDay++;
  else { run.actionsThisDay = 0; run.skipped = new Set(); run.firedDay = null; }
  if (run.actionsThisDay > 250) throw new Error("day " + state.S.day + " exceeded 250 actions");
}

function tryCareerAction(run) {
  const S = state.S, policy = run.policy;
  if (engine.canPitchTurnaround() && (S.inf >= constants.RANK_REQ[S.rank] || S.firm < 30) &&
      (policy !== "aggressive" || S.firm < 25) && policy !== "chaos" &&
      !(policy === "firm_only_stress" && S.endlessWon)) {
    runAction(run, "turnaround", () => engine.pitchTurnaround()); return true;
  }
  if (S.rank === 2 && !S.buyinPaid && S.inf >= constants.RANK_REQ[2] && S.firm >= engine.promotionFirmRequirement(2) &&
      S.money >= constants.BUYIN_COST &&
      (S.scenario !== "debtor" || S.money >= constants.BUYIN_COST + 2000)) {
    runAction(run, "buy-in", () => engine.payBuyIn()); return true;
  }
  if (policy === "firm_stress" && S.endlessWon && S.rep < 50 && S.money >= S.suitCost) {
    runAction(run, "tailored suit", () => engine.buySuit()); return true;
  }
  if (policy === "firm_only_stress" && S.endlessWon && S.rep < 55 && S.money >= S.suitCost) {
    runAction(run, "tailored suit", () => engine.buySuit()); return true;
  }
  if ((policy === "firm_manager" || policy === "firm_bad_manager") && S.endlessWon && S.rep < 60 && S.money >= S.suitCost) {
    runAction(run, "tailored suit", () => engine.buySuit()); return true;
  }
  const coffeeAt = policy === "aggressive" ? 48 :
    policy === "oracle_ev" ? 55 : policy === "bold_mixed" ? 55 : policy === "mixed" ? 60 :
    TECHNICAL_POLICIES.has(policy) ? 65 : 75;
  if (policy !== "max_chance" && engine.canBuyCoffee() && S.fatigue >= coffeeAt) {
    runAction(run, "coffee", () => engine.buyCoffee()); return true;
  }
  if (engine.rivalMoveReady() && actionables(S).length < 5) {
    if (policy === "aggressive" && S.hours >= 1) {
      runAction(run, "rival sabotage", () => engine.rivalSabotage()); return true;
    }
    if ((policy === "technical" || policy === "mixed" || policy === "bold_mixed" || policy === "firm_manager" ||
        policy === "firm_bad_manager" || policy === "firm_only_stress" ||
        (policy === "firm_stress" && !S.endlessWon)) && S.hours >= .5) {
      runAction(run, "rival truce", () => engine.rivalTruce()); return true;
    }
    if (policy === "oracle_ev" && S.hours >= .5) {
      const ally = engine.rivalOdds().ally >= 58 && S.hours >= 1;
      runAction(run, ally ? "rival ally" : "rival truce", () => ally ? engine.rivalAlly() : engine.rivalTruce()); return true;
    }
    if (policy === "chaos" && run.policyRng() < .15 && S.hours >= .5) {
      const move = Math.floor(run.policyRng() * 3);
      if (move === 0 && S.hours >= 1) runAction(run, "rival chaos sabotage", () => engine.rivalSabotage());
      else if (move === 1) runAction(run, "rival chaos truce", () => engine.rivalTruce());
      else if (S.hours >= 1) runAction(run, "rival chaos ally", () => engine.rivalAlly());
      else return false;
      return true;
    }
  }
  if (S.roster && run.firedDay !== S.day) {
    let candidate = null;
    if (policy === "firm_manager") candidate = [...S.roster].filter(e => !e.senior && e.impact < 0)
      .sort((a, b) => a.impact - b.impact || Number(a.src==="npc")-Number(b.src==="npc") || a.id.localeCompare(b.id))[0];
    else if (policy === "firm_bad_manager" && S.day % 5 === 0) candidate = [...S.roster].filter(e => !e.senior)
      .sort((a, b) => b.impact - a.impact || a.id.localeCompare(b.id))[0];
    else if (policy === "firm_stress") candidate = [...S.roster].sort((a, b) => Number(a.senior) - Number(b.senior) || b.impact - a.impact)[0];
    else if (policy === "firm_only_stress") candidate = [...S.roster].filter(e => !e.senior)
      .sort((a, b) => b.impact - a.impact || a.id.localeCompare(b.id))[0];
    else if (policy === "aggressive") candidate = S.roster.find(e => !e.senior && e.impact <= 0);
    else if (policy === "oracle_ev" && S.day % 5 === 0) candidate = S.roster.find(e => !e.senior && e.impact <= -2);
    else if (policy === "chaos" && run.policyRng() < .08) candidate = S.roster.find(e => !e.senior);
    if (candidate) {
      run.firedDay = S.day;
      runAction(run, "fire employee", () => engine.fireEmployee(candidate.id)); return true;
    }
  }
  const delegation = delegationTarget(policy, run.skipped);
  if (delegation) {
    run.metrics.workHours += constants.DELEGATE_HOURS;
    runAction(run, "delegate [" + (delegation.c.id || "no-id") + "] " + delegation.c.title,
      () => engine.delegateCase(delegation.c, delegation.npc.id));
    return true;
  }
  return false;
}

function driveRun(tuple, horizon, { captureTrace = false } = {}) {
  resetHarness();
  const originalRandom = Math.random;
  const gameRng = mulberry32(tuple.seed);
  const policyRng = mulberry32(utils.hash(RNG_NAMESPACE + "|policy|" + tuple.seed + "|" + tuple.scenario + "|" + tuple.mode + "|" + tuple.policy));
  Math.random = gameRng;
  const variant=tuple.variant||"baseline", metrics = newMetrics({ ...tuple, variant, horizon });
  engine.setBalanceExperiment(VARIANTS[variant].engine);
  engine.setBalanceProbe(event=>{
    const {kind="inf",source,amount}=event;
    if(kind==="nemesis"){
      const key=Object.prototype.hasOwnProperty.call(metrics.nemesisGainBy,source)?source:"passive";
      metrics.nemesisGainBy[key]+=amount;
    } else if(kind==="inf_overflow") metrics.overflowInf+=amount;
    else if(kind==="exceptional_review") metrics.exceptionalReviewDay=event.day;
    else if(kind==="final_warning") metrics.finalWarnings++;
    else if(kind==="fraud_slip_check"){
      const band=event.peak>=100?100:event.peak>=95?95:event.peak>=90?90:80;
      metrics.fraud.checks++; metrics.fraud.byBand[band].checks++;
      if(event.hit){ metrics.fraud.hits++; metrics.fraud.byBand[band].hits++; }
    } else if(kind==="fraud_stage"){
      const key=event.eventKind+(event.stage??"");
      const stage=metrics.fraud.stages[key]||(metrics.fraud.stages[key]={seen:0,won:0,scheduled:0,contained:0,exposed:0});
      stage.seen++; if(event.win) stage.won++; if(event.scheduled) stage.scheduled++;
      if(event.contained) stage.contained++; if(event.exposed){ stage.exposed++; metrics.fraud.exposed++; }
    }
    else if(kind==="firm"&&event.postNamePartner){
      const key=Object.prototype.hasOwnProperty.call(metrics.firmFlowBy,source)?source:"other", flow=metrics.firmFlowBy[key];
      flow.up+=Math.max(0,amount); flow.down+=Math.max(0,-amount); flow.net+=amount;
      flow.requestedUp+=Math.max(0,event.requested||0);
      flow.clippedUp+=Math.max(0,(event.requested||0)-Math.max(0,amount));
    } else if(kind==="roster"){
      metrics.rosterTicks++; metrics.rosterWins+=event.wins; metrics.rosterLosses+=event.losses;
      metrics.rosterRawDrift+=event.rawDrift; metrics.rosterCappedDrift+=event.cappedDrift;
      metrics.rosterEmployeeDays+=event.employees; metrics.rosterImpactDays+=event.meanImpact;
    } else if(kind==="firing"){
      metrics.firings++; metrics.firedImpact+=event.impact;
    } else if(kind==="lawsuit") metrics.lawsuits++;
    else if(kind==="inf"){
      const key=Object.prototype.hasOwnProperty.call(metrics.infGainBy,source)?source:"other";
      metrics.infGainBy[key]+=amount;
    } else {
      return;
    }
  });
  const run = {
    ...tuple, policy: tuple.policy, gameRng, policyRng, metrics, hash: createHash("sha256"),
    pendingRolls: new Map(), lastArchiveTotal: 0, lastRank: 0, lastClients: new Set(),
    lastSummary: null, actionsThisDay: 0, skipped: new Set(), firedDay: null, noProgressStreak: 0,
    firmCapDays:new Set(),
    backlogDays: new Map(), seenJudgeCaps: new Set(), actionTrace: captureTrace ? [] : null,
  };
  try {
    engine.startGame(tuple.scenario, "medium", tuple.mode);
    drainTimers();
    run.lastClients = new Set(state.S.clients.map(client => client.name)); // scenario-provided clients are not acquisitions
    assertInvariants(run, "start"); observe(run);
    while (true) {
      const S = state.S;
      if (S.over || (S.summary && S.summary.action === "reload")) break;
      if (S.summary) {
        if (S.summary.action === "nextDay" && S.day >= horizon) break;
        runAction(run, "dismiss " + S.summary.title, () => engine.dismissSummary());
        continue;
      }
      if (S.event) {
        const event = S.event;
        if(event.id!=="latework"&&event.id!=="overtime") registerAggressiveOffer(metrics,event);
        const option = chooseEventOption(run.policy, event, run.policyRng, run.skipped);
        if (!option) throw new Error("event has no legal option: " + event.id);
        if (option.ot) metrics.overtimeBlocks++;
        if (option.lateGo && S.pendingChoice) { metrics.lateWork++; registerChoice(run, S.pendingChoice.c, S.pendingChoice.o); }
        if (option.hours) metrics.workHours += option.hours;
        runAction(run, "event " + event.id + ": " + option.text, () => engine.resolveCrisis(option));
        continue;
      }
      // EVIDENCE TIMELINE prep is modal like an event. Bots model player skill
      // with the POLICY rng only: the game stream must stay untouched, and both
      // the solved and muddled branches need long-run coverage.
      if (S.actionChallenge) {
        const ch = S.actionChallenge;
        if (ch.type === "objection") {
          // The transcript runs on a clock the bot has to burn through frame by
          // frame, exactly like a player watching a question stand.
          metrics.objectionPlayed = (metrics.objectionPlayed || 0) + 1;
          runAction(run, "objection window", () => {
            let guard = 0;
            while (state.S.actionChallenge && state.S.actionChallenge.phase === "objection" && guard++ < 400) {
              const board = state.S.actionChallenge, line = board.lines[board.index];
              const objects = line && line.bad ? run.policyRng() < .75 : run.policyRng() < .08;
              if (objects) { engine.raiseObjectionNow(); continue; }
              const before = board.index;
              let frames = 0;
              while (state.S.actionChallenge && state.S.actionChallenge.phase === "objection" &&
                state.S.actionChallenge.index === before && frames++ < 200) engine.advanceObjectionFrame(80);
            }
          });
          if (state.S.actionChallenge && state.S.actionChallenge.phase === "objection_done")
            runAction(run, "objection complete", () => engine.completeActionChallenge());
          continue;
        }
        if (ch.type !== "timeline") throw new Error("unhandled action challenge: " + ch.type);
        if (ch.phase === "timeline") {
          if (run.policyRng() < .5) { runAction(run, "timeline decline", () => engine.declineTimelineChallenge()); continue; }
          metrics.timelinePlayed = (metrics.timelinePlayed || 0) + 1;
          if (run.policyRng() < .5) { // "read the file": walk the board into the authored order
            const target = [...ch.solution];
            for (let i = 0; i < target.length; i++) {
              let guard = 0;
              while (state.S.actionChallenge && state.S.actionChallenge.order[i] !== target[i] && guard++ < 12)
                engine.moveTimelineEvent(target[i], -1);
            }
          }
          runAction(run, "timeline submit", () => engine.submitTimelineOrder());
          continue;
        }
        if (state.S.actionChallenge.phase === "timeline_success") metrics.timelineSolved = (metrics.timelineSolved || 0) + 1;
        runAction(run, "timeline complete", () => engine.completeActionChallenge());
        continue;
      }
      if (S.leaving) { drainTimers(); observe(run); continue; }
      if (tryCareerAction(run)) continue;
      const cases = actionables(S).filter(c => !run.skipped.has(c))
        .sort((a, b) => a.dueDay - b.dueDay || Number(!!b.big) - Number(!!a.big) || (b.tier || 0) - (a.tier || 0));
      if (cases.length) {
        const c = cases[0], option = chooseOption(run.policy, c, run.policyRng);
        registerAggressiveOffer(metrics,c);
        if (!option) { run.skipped.add(c); continue; }
        const needsConfirm = engine.optHours(c, option) > S.hours && S.hours > 0;
        if (!needsConfirm) registerChoice(run, c, option);
        runAction(run, "case [" + (c.id || "no-id") + "] " + c.title + ": " + option.text,
          () => engine.choose(c, option));
        continue;
      }
      runAction(run, "end day " + S.day, () => engine.endDay());
    }
    processArchives(run);
    const S = state.S;
    metrics.terminal = !!S.over;
    metrics.won = metrics.winDay != null || !!S.endlessWon || /^YOU MADE NAME PARTNER/.test(S.summary?.title || "");
    if (metrics.winDay == null && metrics.won) metrics.winDay = S.day;
    metrics.outcome = S.over ? (S.summary?.title || "TERMINAL").replace(/^GAME OVER: /, "") : "HORIZON";
    metrics.finalDay = S.day; metrics.finalRank = S.rank; metrics.finalRep = S.rep; metrics.finalBold = S.bold;
    metrics.finalInf = S.inf; metrics.finalFirm = S.firm; metrics.finalFatigue = S.fatigue; metrics.finalMoney = S.money;
    metrics.finalXp=S.progression.xp; metrics.finalLevel=S.progression.level; metrics.finalSkillPoints=S.progression.skillPoints;
    metrics.finalNemesisInf=S.nemesis?.inf??null; metrics.finalNemesisRank=S.nemesis?.rank??null;
    metrics.finalNpcRel=round(mean(S.npcs.map(n=>n.rel)));
    metrics.finalWarningUsed=!!S.finalWarningUsed;
    metrics.finalFired=S.runStats.fired||0; metrics.finalLawsuits=metrics.lawsuits;
    metrics.finalRosterSize=S.roster?.length??null;
    metrics.finalRosterImpact=S.roster?.length?round(mean(S.roster.map(e=>e.impact))):null;
    metrics.misses = S.runStats.miss; metrics.delegations = Object.values(S.runStats.deleg).reduce((a, b) => a + b, 0);
    metrics.archiveTotal = S.archiveTotal; metrics.finalBacklog = actionables(S).length;
    metrics.finalMessages = S.inbox.filter(c => c.msg).length; metrics.finalClients = S.clients.length;
    metrics.npExposureDays = metrics.npDay == null ? 0 : Math.max(0, S.day - metrics.npDay);
    metrics.firmCapDays=run.firmCapDays.size;
    metrics.archiveDigest = sha(JSON.stringify(S.archive));
    const backlogDays = [...run.backlogDays.values()].sort((a, b) => a.day - b.day);
    metrics.daysAbove15 = backlogDays.filter(sample => sample.peak > 15).length;
    metrics.meanDailyPeak = round(mean(backlogDays.map(sample => sample.peak)));
    metrics.backlogTailSlope = round(linearSlope(backlogDays.slice(-10).map(sample => sample.last)), 3);
    metrics.calibration = metrics.rolls ? round(metrics.styleWins.safe + metrics.styleWins.technical +
      metrics.styleWins.aggressive + metrics.styleWins.bribe + metrics.styleWins.neutral - metrics.expectedChance / 100, 2) : 0;
    if (metrics.maxBacklog > 30) metrics.flags.push({ severity: 8, code: "BACKLOG_RUNAWAY", value: metrics.maxBacklog });
    else if (metrics.daysAbove15 >= 3 && metrics.backlogTailSlope > .4)
      metrics.flags.push({ severity: 6, code: "BACKLOG_SUSTAINED", value: metrics.maxBacklog });
    if (metrics.maxMessages > constants.INBOX_MESSAGE_LIMIT)
      metrics.flags.push({ severity: 10, code: "MESSAGE_CAP_BROKEN", value: metrics.maxMessages });
    if (metrics.won && metrics.winDay <= 12) metrics.flags.push({ severity: 7, code: "EARLY_WIN", value: metrics.winDay });
    if (metrics.actions > horizon * 250) metrics.flags.push({ severity: 10, code: "ACTION_RUNAWAY", value: metrics.actions });
  } catch (error) {
    metrics.integrity.push(error.stack || String(error));
    metrics.outcome = "INTEGRITY FAILURE";
    metrics.terminal = true;
  } finally {
    try { drainTimers(); } catch (error) { metrics.integrity.push(error.stack || String(error)); }
    engine.setBalanceProbe(null);
    engine.setBalanceExperiment(null);
    Math.random = originalRandom;
  }
  metrics.traceDigest = run.hash.digest("hex");
  metrics.rngCalls = gameRng.calls;
  if (run.actionTrace) metrics.actionTrace = run.actionTrace;
  return metrics;
}

const cellKey = run => [run.variant||"baseline",run.scenario,run.mode,run.policy].join("/");
function summarizeJudgeCaps(runs) {
  return Object.fromEntries(JUDGE_CAP_BUCKETS.map(name => {
    const buckets = runs.map(run => run.judgeCaps[name]);
    const selected = buckets.reduce((sum, bucket) => sum + bucket.selected, 0);
    const capped = buckets.reduce((sum, bucket) => sum + bucket.capped, 0);
    const post20 = buckets.reduce((sum, bucket) => sum + bucket.post20, 0);
    const post20Capped = buckets.reduce((sum, bucket) => sum + bucket.post20Capped, 0);
    const first = buckets.flatMap(bucket => bucket.firstCapAppearances);
    return [name, { selected, capped, capRate: pct(capped / Math.max(1, selected)),
      post20, post20Capped, post20CapRate: pct(post20Capped / Math.max(1, post20)),
      medianFirstCapAppearance: round(quantile(first, .5), 1), firstCapJudges: first.length }];
  }));
}

function summarizeAggressiveOffers(runs){
  const count=runs.reduce((sum,run)=>sum+run.aggressiveOffers.count,0);
  return {count,meanShown:round(runs.reduce((sum,run)=>sum+run.aggressiveOffers.chanceSum,0)/Math.max(1,count),1),
    p20:pct(runs.reduce((sum,run)=>sum+run.aggressiveOffers.p20,0)/Math.max(1,count)),
    p25:pct(runs.reduce((sum,run)=>sum+run.aggressiveOffers.p25,0)/Math.max(1,count)),
    p30:pct(runs.reduce((sum,run)=>sum+run.aggressiveOffers.p30,0)/Math.max(1,count)),
    p35:pct(runs.reduce((sum,run)=>sum+run.aggressiveOffers.p35,0)/Math.max(1,count)),
    p40:pct(runs.reduce((sum,run)=>sum+run.aggressiveOffers.p40,0)/Math.max(1,count))};
}

function summarizeFraud(runs){
  const checks=runs.reduce((sum,run)=>sum+run.fraud.checks,0);
  const hits=runs.reduce((sum,run)=>sum+run.fraud.hits,0);
  const byBand=Object.fromEntries([80,90,95,100].map(band=>{
    const bandChecks=runs.reduce((sum,run)=>sum+run.fraud.byBand[band].checks,0);
    const bandHits=runs.reduce((sum,run)=>sum+run.fraud.byBand[band].hits,0);
    return [band,{checks:bandChecks,hits:bandHits,hitRate:pct(bandHits/Math.max(1,bandChecks))}];
  }));
  const stageKeys=new Set(runs.flatMap(run=>Object.keys(run.fraud.stages)));
  const stages=Object.fromEntries([...stageKeys].sort().map(key=>[key,runs.reduce((total,run)=>{
    const stage=run.fraud.stages[key];
    if(stage) for(const field of ["seen","won","scheduled","contained","exposed"]) total[field]+=stage[field];
    return total;
  },{seen:0,won:0,scheduled:0,contained:0,exposed:0})]));
  return {checks,hits,hitRate:pct(hits/Math.max(1,checks)),byBand,stages,
    exposed:runs.reduce((sum,run)=>sum+run.fraud.exposed,0)};
}

function summarizeFirmEndgame(runs){
  const np=runs.filter(run=>run.npDay!=null);
  const collapses=np.filter(run=>run.outcome==="FIRM COLLAPSE");
  const meanFlow=Object.fromEntries(FIRM_SOURCES.map(source=>[source,
    round(mean(np.map(run=>run.firmFlowBy[source].net))) ]));
  const total=run=>Object.values(run.firmFlowBy).reduce((sum,flow)=>({
    up:sum.up+flow.up,down:sum.down+flow.down,clipped:sum.clipped+flow.clippedUp}),{up:0,down:0,clipped:0});
  const totals=np.map(total);
  return {np:np.length,collapseRate:pct(collapses.length/Math.max(1,np.length)),
    medianCollapseAfterNp:round(quantile(collapses.map(run=>run.finalDay-run.npDay),.5),1),
    meanExposure:round(mean(np.map(run=>run.npExposureDays))),
    meanStartFirm:round(mean(np.map(run=>run.npStartFirm))),meanFinalFirm:round(mean(np.map(run=>run.finalFirm))),
    meanMinFirm:round(mean(np.map(run=>run.minPostNpFirm))),
    meanFirmDelta:round(mean(np.map(run=>run.finalFirm-run.npStartFirm))),
    meanFirmDeltaPerDay:round(mean(np.map(run=>(run.finalFirm-run.npStartFirm)/Math.max(1,run.npExposureDays))),3),
    capDayRate:pct(np.reduce((sum,run)=>sum+run.firmCapDays,0)/Math.max(1,np.reduce((sum,run)=>sum+run.npExposureDays,0))),
    meanUp:round(mean(totals.map(item=>item.up))),meanDown:round(mean(totals.map(item=>item.down))),
    meanClippedUp:round(mean(totals.map(item=>item.clipped))),meanFlow,
    meanFirings:round(mean(np.map(run=>run.firings))),meanFiredImpact:round(mean(np.map(run=>run.firedImpact))),
    meanLawsuits:round(mean(np.map(run=>run.lawsuits))),
    meanRosterImpact:round(mean(np.map(run=>run.rosterTicks?run.rosterImpactDays/run.rosterTicks:0))),
    meanRosterDrift:round(mean(np.map(run=>run.rosterCappedDrift))),
  };
}

function summarizeCell(runs) {
  const wins = runs.filter(run => run.won);
  const terminals = {};
  for (const run of runs) terminals[run.outcome] = (terminals[run.outcome] || 0) + 1;
  const rolls = runs.reduce((sum, run) => sum + run.rolls, 0);
  const expected = runs.reduce((sum, run) => sum + run.expectedChance, 0) / 100;
  const actual = runs.reduce((sum, run) => sum + Object.values(run.styleWins).reduce((a, b) => a + b, 0), 0);
  const post20 = runs.reduce((sum, run) => sum + run.judgePost20, 0);
  const totalChoices = runs.reduce((sum, run) => sum + Object.values(run.styles).reduce((a, b) => a + b, 0), 0);
  const styleShares = Object.fromEntries(Object.keys(runs[0].styles).map(style => [style,
    pct(runs.reduce((sum, run) => sum + run.styles[style], 0) / Math.max(1, totalChoices))]));
  const styleWinRates = Object.fromEntries(Object.keys(runs[0].styles).map(style => {
    const styleRolls = runs.reduce((sum, run) => sum + run.styleRolls[style], 0);
    return [style, styleRolls ? pct(runs.reduce((sum, run) => sum + run.styleWins[style], 0) / styleRolls) : null];
  }));
  const promotionMedian = Object.fromEntries([1, 2, 3, 4].map(rank => [rank,
    round(quantile(runs.flatMap(run => run.promotions.filter(p => p.rank === rank).map(p => p.day)), .5), 1)]));
  const promotionReadyMedian=Object.fromEntries([1,2,3,4].map(rank=>[rank,
    round(quantile(runs.map(run=>run.promotionReadyDays[rank]).filter(day=>day!=null),.5),1)]));
  const meanInfGainBy = Object.fromEntries(Object.keys(runs[0].infGainBy).map(source =>
    [source, round(mean(runs.map(run => run.infGainBy[source]))) ]));
  return {
    variant:runs[0].variant||"baseline", scenario: runs[0].scenario, mode: runs[0].mode, policy: runs[0].policy,
    n: runs.length, horizon: runs[0].horizon,
    winRate: pct(wins.length / runs.length), medianWinDay: round(quantile(wins.map(run => run.winDay), .5), 1),
    earlyWinRate: pct(runs.filter(run => run.won && run.winDay <= 12).length / runs.length),
    npRate: pct(runs.filter(run => run.npDay != null || run.won).length / runs.length),
    terminalRate: pct(runs.filter(run => run.terminal).length / runs.length),
    meanMisses: round(mean(runs.map(run => run.misses))), meanArchive: round(mean(runs.map(run => run.archiveTotal))),
    meanDelegations: round(mean(runs.map(run => run.delegations))), meanObjectivesMet: round(mean(runs.map(run => run.objectivesMet))),
    delegatedWinRate:pct(runs.reduce((sum,run)=>sum+run.delegatedResults.won,0)/Math.max(1,runs.reduce((sum,run)=>sum+run.delegatedResults.won+run.delegatedResults.lost,0))),
    meanDeadlineResults:round(mean(runs.map(run=>run.deadlineResults))),
    meanNemesisPassive:round(mean(runs.map(run=>run.nemesisGainBy.passive))),
    meanNemesisFailure:round(mean(runs.map(run=>run.nemesisGainBy.failure))),
    meanFinalNemesisInf:round(mean(runs.map(run=>run.finalNemesisInf??0))),
    meanFinalNpcRel:round(mean(runs.map(run=>run.finalNpcRel))),
    meanRivalTruces:round(mean(runs.map(run=>run.rivalActions.truce))),
    sentHomeRate: pct(runs.filter(run => run.sentHome > 0).length / runs.length),
    meanFinalRank: round(mean(runs.map(run => run.finalRank))), meanFinalFirm: round(mean(runs.map(run => run.finalFirm))),
    meanFinalXp:round(mean(runs.map(run=>run.finalXp))),medianFinalLevel:round(quantile(runs.map(run=>run.finalLevel),.5),1),
    medianWinnerLevel:round(quantile(wins.map(run=>run.finalLevel),.5),1),maxWinnerLevel:wins.length?Math.max(...wins.map(run=>run.finalLevel)):null,
    meanMinFirm: round(mean(runs.map(run => run.minFirm))), meanMinRep: round(mean(runs.map(run => run.minRep))),
    maxBacklog: Math.max(...runs.map(run => run.maxBacklog)), p95Backlog: round(quantile(runs.map(run => run.maxBacklog), .95), 1),
    meanFinalBacklog: round(mean(runs.map(run => run.finalBacklog))),
    meanDaysAbove15: round(mean(runs.map(run => run.daysAbove15))), meanBacklogTailSlope: round(mean(runs.map(run => run.backlogTailSlope)), 3),
    sustainedBacklogRate: pct(runs.filter(run => run.daysAbove15 >= 3 && run.backlogTailSlope > .4).length / runs.length),
    runawayBacklogRate: pct(runs.filter(run => run.maxBacklog > 30 && run.backlogTailSlope > .4).length / runs.length),
    maxMessages: Math.max(...runs.map(run => run.maxMessages)), messageCapRate: pct(runs.filter(run => run.messageCapReached).length / runs.length),
    totalNpExposureDays: runs.reduce((sum, run) => sum + run.npExposureDays, 0),
    judgeCapRate: pct(runs.reduce((sum, run) => sum + run.judgeCap, 0) / Math.max(1, runs.reduce((sum, run) => sum + run.judgeHearings, 0))),
    judgePost20CapRate: pct(runs.reduce((sum, run) => sum + run.judgePost20Cap, 0) / Math.max(1, post20)),
    judgeAdjustedRate: pct(runs.reduce((sum, run) => sum + run.judgeAdjusted, 0) /
      Math.max(1, runs.reduce((sum, run) => sum + run.judgeHearings, 0))),
    meanJudgeModifier: round(runs.reduce((sum, run) => sum + run.judgeModifierSum, 0) /
      Math.max(1, runs.reduce((sum, run) => sum + run.judgeHearings, 0)), 2),
    exceptionalReviewRate:pct(runs.filter(run=>run.exceptionalReviewDay!=null).length/runs.length),
    finalWarningRate:pct(runs.filter(run=>run.finalWarningUsed).length/runs.length),
    medianExceptionalReviewDay:round(quantile(runs.map(run=>run.exceptionalReviewDay).filter(day=>day!=null),.5),1),
    meanOverflowInf:round(mean(runs.map(run=>run.overflowInf))),
    judgeCaps: summarizeJudgeCaps(runs), aggressiveOffers:summarizeAggressiveOffers(runs),fraud:summarizeFraud(runs),firmEndgame:summarizeFirmEndgame(runs),promotionMedian,promotionReadyMedian,
    styleShares, styleWinRates, meanInfGainBy,
    calibrationGap: rolls ? round((actual - expected) / rolls * 100, 2) : null,
    integrityFailures: runs.filter(run => run.integrity.length).length, outcomes: terminals,
  };
}

function summarizeCohort(runs){
  const wins=runs.filter(run=>run.won),outcomes={};
  for(const run of runs) outcomes[run.outcome]=(outcomes[run.outcome]||0)+1;
  const sources=Object.keys(runs[0].infGainBy);
  const meanInfGainBy=Object.fromEntries(sources.map(source=>[source,round(mean(runs.map(run=>run.infGainBy[source]))) ]));
  const totalChoices=runs.reduce((sum,run)=>sum+Object.values(run.styles).reduce((a,b)=>a+b,0),0);
  const styleShares=Object.fromEntries(Object.keys(runs[0].styles).map(style=>[style,
    pct(runs.reduce((sum,run)=>sum+run.styles[style],0)/Math.max(1,totalChoices))]));
  const promotionReadyMedian=Object.fromEntries([1,2,3,4].map(rank=>[rank,
    round(quantile(runs.map(run=>run.promotionReadyDays[rank]).filter(day=>day!=null),.5),1)]));
  const delegatedWon=runs.reduce((sum,run)=>sum+run.delegatedResults.won,0);
  const delegatedLost=runs.reduce((sum,run)=>sum+run.delegatedResults.lost,0);
  return {variant:runs[0].variant,mode:runs[0].mode,policy:runs[0].policy,n:runs.length,
    winRate:pct(wins.length/runs.length),medianWinDay:round(quantile(wins.map(run=>run.winDay),.5),1),
    earlyWinRate:pct(runs.filter(run=>run.won&&run.winDay<=12).length/runs.length),
    firedRate:pct((outcomes.FIRED||0)/runs.length),meanMisses:round(mean(runs.map(run=>run.misses))),
    meanDelegations:round(mean(runs.map(run=>run.delegations))),
    delegatedWinRate:pct(delegatedWon/Math.max(1,delegatedWon+delegatedLost)),
    meanDeadlineResults:round(mean(runs.map(run=>run.deadlineResults))),
    meanNemesisPassive:round(mean(runs.map(run=>run.nemesisGainBy.passive))),
    meanNemesisFailure:round(mean(runs.map(run=>run.nemesisGainBy.failure))),
    meanFinalNemesisInf:round(mean(runs.map(run=>run.finalNemesisInf??0))),
    meanFinalNpcRel:round(mean(runs.map(run=>run.finalNpcRel))),
    meanRivalTruces:round(mean(runs.map(run=>run.rivalActions.truce))),
    sentHomeRate:pct(runs.filter(run=>run.sentHome>0).length/runs.length),
    meanFinalFirm:round(mean(runs.map(run=>run.finalFirm))),maxBacklog:Math.max(...runs.map(run=>run.maxBacklog)),
    meanFinalXp:round(mean(runs.map(run=>run.finalXp))),medianFinalLevel:round(quantile(runs.map(run=>run.finalLevel),.5),1),
    medianWinnerLevel:round(quantile(wins.map(run=>run.finalLevel),.5),1),maxWinnerLevel:wins.length?Math.max(...wins.map(run=>run.finalLevel)):null,
    meanGrossInf:round(mean(runs.map(run=>Object.values(run.infGainBy).reduce((a,b)=>a+b,0)))),
    exceptionalReviewRate:pct(runs.filter(run=>run.exceptionalReviewDay!=null).length/runs.length),
    finalWarningRate:pct(runs.filter(run=>run.finalWarningUsed).length/runs.length),
    medianExceptionalReviewDay:round(quantile(runs.map(run=>run.exceptionalReviewDay).filter(day=>day!=null),.5),1),
    meanOverflowInf:round(mean(runs.map(run=>run.overflowInf))),
    aggressiveOffers:summarizeAggressiveOffers(runs),fraud:summarizeFraud(runs),firmEndgame:summarizeFirmEndgame(runs),promotionReadyMedian,meanInfGainBy,styleShares,outcomes,
    integrityFailures:runs.filter(run=>run.integrity.length).length};
}

function buildWarnings(cells, runs) {
  const warnings = [];
  const add = (severity, code, message, evidence, recommendation) => warnings.push({ severity, code, message, evidence, recommendation });
  for (const cell of cells) {
    if (cell.integrityFailures) add(10, "INTEGRITY", cellKey(cell) + " produced integrity failures", cell.integrityFailures + "/" + cell.n, "Treat results as invalid and fix before tuning.");
    if(cell.earlyWinRate>0&&cell.exceptionalReviewRate>0)
      add(8,"EXCEPTIONAL_REVIEW_TOO_EARLY",cellKey(cell)+" restores a pre-rebalance early finish",
        `${cell.earlyWinRate}% of careers won by day 12`,"Raise the momentum threshold or the Senior Partner wait.");
    else if(cell.n>=8&&cell.exceptionalReviewRate>=60)
      add(6,"EXCEPTIONAL_REVIEW_TOO_COMMON",cellKey(cell)+" turns the special vote into the default final promotion",
        `${cell.exceptionalReviewRate}% of careers used it; median day ${cell.medianExceptionalReviewDay}`,
        "Raise the momentum threshold until the Friday route remains the norm.");
    if (cell.n >= 8 && cell.runawayBacklogRate >= 10)
      add(8, "BACKLOG_RUNAWAY", cellKey(cell) + " shows joint high-and-growing backlog careers",
        `${cell.runawayBacklogRate}% of careers; max=${cell.maxBacklog}`, "Inspect arrivals, deadlines and delegation before tuning.");
    else if (cell.n >= 8 && cell.sustainedBacklogRate >= 20)
      add(5, "BACKLOG_PRESSURE", cellKey(cell) + " repeatedly shows sustained file pressure",
        `${cell.sustainedBacklogRate}% of careers; p95 peak=${cell.p95Backlog}`, "Treat as pressure, not runaway; inspect misses and final backlog together.");
    if (cell.maxMessages > constants.INBOX_MESSAGE_LIMIT)
      add(10, "MESSAGE_CAP_BROKEN", cellKey(cell) + " exceeded the bounded inbox history", `max=${cell.maxMessages}`, "Fix before release.");
    else if (cell.messageCapRate >= 20)
      add(3, "MESSAGE_CAP_PRESSURE", cellKey(cell) + " frequently reaches the bounded history", `${cell.messageCapRate}% of careers`, "The leak is fixed; consider a separate history view only if UX testing needs older notices.");
    for (const [bucket, data] of Object.entries(cell.judgeCaps)) {
      if (data.post20 < 20) continue;
      const label = bucket.replace("technical_plus6", "technical +6 credibility")
        .replace("technical_minus6", "technical -6 distrust")
        .replace("aggressive_minus8", "aggressive -8 distrust")
        .replace("bribe_minus8", "bribe -8 distrust");
      if (data.post20CapRate > 75)
        add(8, "JUDGE_MEMORY_SATURATION", cellKey(cell) + " usually sits at " + label + " after day 20",
          `${data.post20CapRate}% of ${data.post20} selected hearings`, "Use recency/decay or a rolling last-three-hearings window.");
      else if (data.post20CapRate > 50)
        add(6, "JUDGE_MEMORY_SATURATION", cellKey(cell) + " often reaches " + label + " after day 20",
          `${data.post20CapRate}% of ${data.post20} selected hearings`, "Measure a decay/rolling-window variant before changing live values.");
    }
  }
  const oracleStandard = cells.filter(cell => cell.mode === "standard" && cell.policy === "oracle_ev");
  for (const cell of oracleStandard.filter(cell => cell.horizon >= 30)) {
    const low = cell.scenario === "debtor" ? 15 : 25, high = cell.scenario === "debtor" ? 70 : 80;
    if (cell.winRate < low) add(7, "ORACLE_HEURISTIC_LOW", cellKey(cell) + " hidden-information heuristic wins rarely", `${cell.winRate}% by day ${runs.find(r => cellKey(r) === cellKey(cell))?.horizon}`, "Do not call this a ceiling; inspect failure causes and compare visible baselines.");
    if (cell.winRate > high) add(7, "ORACLE_HEURISTIC_HIGH", cellKey(cell) + " hidden-information heuristic wins very often", `${cell.winRate}%`, "Do not tune from this alone; compare the visible technical baseline.");
    if (cell.earlyWinRate >= 10) add(8, "EARLY_WINS", cellKey(cell) + " oracle can finish by day 12 too often", `${cell.earlyWinRate}%`, "Replay fastest seeds and inspect INF sources.");
  }
  for (const cell of cells.filter(cell => cell.mode === "standard" && cell.policy === "technical" && cell.horizon >= 30 && cell.n >= 8)) {
    if (cell.winRate >= 80 && cell.earlyWinRate >= 50)
      add(9, "TECHNICAL_PROGRESSION", cellKey(cell) + " visible technical route reaches Name Partner too reliably and early",
        `${cell.winRate}% wins; ${cell.earlyWinRate}% by day 12; median ${cell.medianWinDay}`, "A/B progression sources and technical rewards; keep safe reliability intact.");
  }
  for (const cell of cells.filter(cell => cell.mode === "standard" && cell.policy === "aggressive" && cell.horizon >= 30 && cell.n >= 8)) {
    const fired = (cell.outcomes.FIRED || 0) / cell.n * 100;
    if (cell.winRate < 5 && fired > 80)
      add(8, "AGGRESSION_DEATH_SPIRAL", cellKey(cell) + " pure aggression is almost never career-viable",
        `${cell.winRate}% wins; ${round(fired, 1)}% fired`, "A/B a controlled aggression payoff or recovery valve without making reckless spam optimal.");
  }
  for(const cell of cells.filter(cell=>cell.mode==="standard"&&cell.policy==="bold_mixed"&&cell.horizon>=30&&cell.n>=8)){
    const share=cell.styleShares.aggressive||0;
    if(share<3) add(6,"CONTROLLED_AGGRESSION_TOO_LOW",cellKey(cell)+" barely exercises the aggressive route",
      `${share}% aggressive choices`,"Tune the visible-information policy before drawing gameplay conclusions.");
    if(share>40) add(6,"CONTROLLED_AGGRESSION_TOO_HIGH",cellKey(cell)+" behaves more like reckless spam than controlled risk",
      `${share}% aggressive choices`,"Raise the REP/chance buffer before using this as a player model.");
  }
  for (const cell of cells.filter(cell => cell.mode === "standard" && cell.policy === "chaos" && cell.winRate > 25))
    add(7, "CHAOS_TOO_STRONG", cellKey(cell) + " rewards random play too often", `${cell.winRate}% wins`, "Inspect safe/event rewards and failure penalties.");
  for (const variant of new Set(cells.map(cell=>cell.variant))) for (const scenario of SCENARIOS) {
    const safe = cells.find(cell => cell.variant===variant&&cell.scenario === scenario && cell.mode === "standard" && cell.policy === "max_chance");
    const oracle = cells.find(cell => cell.variant===variant&&cell.scenario === scenario && cell.mode === "standard" && cell.policy === "oracle_ev");
    if (safe && oracle && (safe.winRate >= 35 || (safe.medianWinDay && oracle.medianWinDay && safe.medianWinDay <= oracle.medianWinDay)))
      add(8, "MAX_CHANCE_DOMINANCE", variant+"/"+scenario+" still rewards always taking the highest exact chance", `max=${safe.winRate}% @${safe.medianWinDay}d, oracle=${oracle.winRate}% @${oracle.medianWinDay}d`, "Reduce safe-path progression, not its 100% reliability.");
  }
  for(const variant of new Set(cells.map(cell=>cell.variant))) for(const policy of ENDLESS_ONLY_POLICIES){
    const stress=cells.filter(cell=>cell.variant===variant&&cell.mode==="endless"&&cell.policy===policy);
    const stressNp=stress.reduce((sum,cell)=>sum+Math.round(cell.n*cell.npRate/100),0);
    const stressCollapse=stress.reduce((sum,cell)=>sum+(cell.outcomes["FIRM COLLAPSE"]||0),0);
    const stressExposure=stress.reduce((sum,cell)=>sum+cell.totalNpExposureDays,0);
    if(stressNp>=50&&stressExposure>=500&&!stressCollapse)
      add(7,"FIRM_COLLAPSE_UNREACHABLE",variant+"/"+policy+" never triggers FIRM COLLAPSE",
        `0/${stressNp} Name Partner careers across ${stressExposure} post-NP days`,
        "A/B post-partnership operating costs or FIRM drift before changing the threshold.");
  }
  for(const cell of cells.filter(cell=>cell.mode==="endless"&&cell.firmEndgame.np>=8)){
    const f=cell.firmEndgame;
    if(cell.policy==="firm_manager"&&f.collapseRate>25)
      add(8,"FIRM_MANAGER_PUNISHED",cellKey(cell)+" collapses too often despite visible competent management",
        `${f.collapseRate}% collapse; ${f.meanFirmDelta} mean FIRM delta`,"Reduce passive cost before changing player-facing recovery tools.");
    if(cell.policy==="firm_bad_manager"&&f.meanExposure>=20&&f.collapseRate<10)
      add(7,"FIRM_BAD_MANAGEMENT_FREE",cellKey(cell)+" rarely punishes repeated visible management mistakes",
        `${f.collapseRate}% collapse; ${f.meanFirings} firings; ${f.meanFirmDelta} mean FIRM delta`,"Increase operating pressure or roster downside, then replay extrema.");
    if(f.meanExposure>=20&&f.capDayRate>30)
      add(6,"FIRM_CAP_SATURATION",cellKey(cell)+" spends too much of the Name Partner endgame at 100 FIRM",
        `${f.capDayRate}% of post-NP days at cap; ${f.meanClippedUp} mean positive FIRM clipped`,"Use measured operating pressure; do not merely raise the collapse threshold.");
  }
  return warnings.sort((a, b) => b.severity - a.severity || a.code.localeCompare(b.code));
}

function replayCandidates(runs) {
  const groups = new Map();
  for (const run of runs) {
    const key = cellKey(run);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(run);
  }
  const picked = new Map();
  const take = run => { if (run) picked.set([run.variant,run.seed,run.scenario,run.mode,run.policy].join("/"), run); };
  for (const group of groups.values()) {
    take(group[0]);
    take([...group].filter(run => run.won).sort((a, b) => a.winDay - b.winDay)[0]);
    take([...group].sort((a, b) => b.maxBacklog - a.maxBacklog)[0]);
    take([...group].sort((a, b) => b.misses - a.misses)[0]);
    take([...group].sort((a, b) => a.minRep - b.minRep)[0]);
    take([...group].sort((a, b) => a.minFirm - b.minFirm)[0]);
    take([...group].filter(run=>run.npDay!=null).sort((a,b)=>(a.minPostNpFirm??101)-(b.minPostNpFirm??101))[0]);
    take([...group].filter(run=>run.exceptionalReviewDay!=null).sort((a,b)=>a.exceptionalReviewDay-b.exceptionalReviewDay)[0]);
    take([...group].sort((a,b)=>b.lawsuits-a.lawsuits)[0]);
    take([...group].sort((a,b)=>b.firings-a.firings)[0]);
    take(group.find(run=>run.outcome==="FIRM COLLAPSE"));
    for (const run of group.filter(item => item.integrity.length)) take(run);
  }
  return [...picked.values()];
}

function runMatrix(config) {
  const provenanceStart = provenance(); // snapshot the exact sources before the bundled simulation moves
  const runs = [];
  const seeds = Array.from({ length: config.seeds }, (_, index) => utils.hash(RNG_NAMESPACE + ":" + index));
  const policiesForMode = mode => config.policies.filter(policy => mode==="endless"||!ENDLESS_ONLY_POLICIES.has(policy));
  const total = config.variants.length*config.scenarios.length*seeds.length*
    config.modes.reduce((sum, mode) => sum + policiesForMode(mode).length, 0);
  let completed = 0;
  for (const variant of config.variants) for (const scenario of config.scenarios) for (const mode of config.modes)
    for (const policy of policiesForMode(mode)) for (const seed of seeds) {
    const horizon = mode === "standard" ? config.standardDays : config.endlessDays;
    runs.push(driveRun({ variant,scenario,mode,policy,seed },horizon));
    completed++;
    if (completed % Math.max(50, Math.floor(total / 20)) === 0) process.stderr.write(`soak ${completed}/${total}\n`);
  }
  const groups = new Map();
  for (const run of runs) {
    const key = cellKey(run);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(run);
  }
  const cells = [...groups.values()].map(summarizeCell);
  const cohortGroups=new Map();
  for(const run of runs){
    const key=[run.variant,run.mode,run.policy].join("/");
    if(!cohortGroups.has(key)) cohortGroups.set(key,[]);
    cohortGroups.get(key).push(run);
  }
  const cohorts=[...cohortGroups.values()].map(summarizeCohort);
  const replay = [];
  for (const original of replayCandidates(runs)) {
    const again = driveRun({ variant:original.variant,scenario:original.scenario,mode:original.mode,
      policy:original.policy,seed:original.seed },original.horizon);
    const same = again.traceDigest === original.traceDigest && again.outcome === original.outcome &&
      again.finalDay === original.finalDay && again.archiveTotal === original.archiveTotal &&
      again.archiveDigest === original.archiveDigest;
    replay.push({ variant:original.variant,scenario:original.scenario,mode:original.mode,policy:original.policy,seed:original.seed,
      same, first: original.traceDigest, second: again.traceDigest });
  }
  const warnings = buildWarnings(cells, runs);
  const provenanceEnd = provenance();
  const sourceUnchanged = provenanceStart.commit === provenanceEnd.commit &&
    JSON.stringify(provenanceStart.fileHashes) === JSON.stringify(provenanceEnd.fileHashes);
  let integrityFailures = runs.reduce((sum, run) => sum + run.integrity.length, 0) + replay.filter(item => !item.same).length;
  if (!sourceUnchanged) {
    integrityFailures++;
    warnings.unshift({ severity: 10, code: "SOURCE_CHANGED_DURING_RUN",
      message: "The measured game/simulator sources changed while the matrix was running.",
      evidence: provenanceStart.simulatorHash + " -> " + provenanceEnd.simulatorHash,
      recommendation: "Discard this artifact and rerun from a stable tree." });
  }
  return { config: { ...config,policyVersion:POLICY_VERSION,policyNotes:POLICY_NOTES,
      variantNotes:Object.fromEntries(Object.entries(VARIANTS).map(([key,value])=>[key,value.note])),totalRuns:runs.length },
    provenance: { ...provenanceStart, sourceUnchanged, endStatusHash: provenanceEnd.statusHash,
      endDirtyDiffHash: provenanceEnd.dirtyDiffHash }, cells,cohorts,warnings,replay,
    replayConfirmed: replay.filter(item => item.same).length, integrityFailures, runs };
}

function printResult(result) {
  console.log(`\nFANCY OUTFITS deterministic soak: ${result.config.totalRuns} careers, ${result.replay.length} replay checks`);
  console.log("Cohort summary:");
  console.table(result.cohorts.map(cohort=>({variant:cohort.variant,mode:cohort.mode,bot:cohort.policy,
    n:cohort.n,wins:cohort.winRate+"%",medWin:cohort.medianWinDay??"-",early12:cohort.earlyWinRate+"%",
    fired:cohort.firedRate+"%",misses:cohort.meanMisses,agg:cohort.styleShares.aggressive+"%",
    nemFail:cohort.meanNemesisFailure,firmCollapse:cohort.firmEndgame.collapseRate+"%",
    firmDelta:cohort.firmEndgame.meanFirmDelta,firmCap:cohort.firmEndgame.capDayRate+"%",
    grossInf:cohort.meanGrossInf,xp:cohort.meanFinalXp,level:cohort.medianWinnerLevel??cohort.medianFinalLevel,
    exReview:cohort.exceptionalReviewRate+"%",integrity:cohort.integrityFailures})));
  console.log("Scenario cells:");
  console.table(result.cells.map(cell => ({
    variant:cell.variant,scenario: cell.scenario, mode: cell.mode, bot: cell.policy, wins: cell.winRate + "%",
    medWin: cell.medianWinDay ?? "-", misses: cell.meanMisses, p95Backlog: cell.p95Backlog,
    sentHome: cell.sentHomeRate + "%", fraud:cell.fraud.hits+"/"+cell.fraud.checks,
    judgeCap20: cell.judgePost20CapRate + "%", integrity: cell.integrityFailures,
  })));
  if (result.warnings.length) {
    console.log("Suspicious findings (replayed extrema are recorded in JSON):");
    result.warnings.forEach(item => console.log(`[${item.severity}/10] ${item.code}: ${item.message} — ${item.evidence}`));
  } else console.log("No configured balance thresholds fired.");
  console.log(`Replay: ${result.replayConfirmed}/${result.replay.length} identical; integrity failures: ${result.integrityFailures}`);
}

const config = parseArgs(process.argv.slice(2));
if (config.help) {
  console.log("Usage: npm run soak -- [--seeds N] [--standard-days N] [--endless-days N] [--scenarios csv] [--modes csv] [--policies csv] [--variants csv] [--json path] [--replay scenario,mode,policy,seed,days,variant]");
  process.exit(0);
}
if (config.replay) {
  const [scenario,mode,policy,rawSeed,rawDays,rawVariant="baseline"] = config.replay.split(",");
  if (!SCENARIOS.includes(scenario) || !MODES.includes(mode) || !POLICIES.includes(policy)) throw new Error("Invalid replay tuple");
  if(!Object.prototype.hasOwnProperty.call(VARIANTS,rawVariant)) throw new Error("Invalid replay variant");
  const tuple = { scenario,mode,policy,seed:Number(rawSeed)>>>0,variant:rawVariant };
  const horizon = Number(rawDays) || (mode === "standard" ? config.standardDays : config.endlessDays);
  const first = driveRun(tuple, horizon, { captureTrace: true }), second = driveRun(tuple, horizon);
  console.log(JSON.stringify({ tuple, horizon, same: first.traceDigest === second.traceDigest, first, second }, null, 2));
  process.exitCode = first.integrity.length || second.integrity.length || first.traceDigest !== second.traceDigest ? 1 : 0;
} else {
  const result = runMatrix(config);
  printResult(result);
  if (config.json) writeFileSync(config.json, JSON.stringify(result, null, 2) + "\n");
  process.exitCode = result.integrityFailures ? 1 : 0;
}
