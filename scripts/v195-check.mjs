import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const storage = new Map([
  ["fo_settings_v1", JSON.stringify({ dayLen: 8, sfx: 0, bgm: 0, shake: false })],
]);
let storageReadError = null;
let storageWriteError = null;
let storageRemoveError = null;
globalThis.localStorage = {
  getItem: key => {
    if (storageReadError) throw storageReadError;
    return storage.has(key) ? storage.get(key) : null;
  },
  setItem: (key, value) => {
    if (storageWriteError) throw storageWriteError;
    storage.set(key, String(value));
  },
  removeItem: key => {
    if (storageRemoveError) throw storageRemoveError;
    storage.delete(key);
  },
  clear: () => storage.clear(),
};
globalThis.window = { addEventListener() {}, removeEventListener() {} };
let reloadCount = 0;
globalThis.location = { reload() { reloadCount++; } };
let timeoutQueue = null;
globalThis.setTimeout = fn => {
  if (timeoutQueue) timeoutQueue.push(fn);
  else fn();
  return 1;
};
globalThis.clearTimeout = () => {};
globalThis.setInterval = () => 1;
globalThis.clearInterval = () => {};

(async () => {
  const utils = await import("../src/game/utils.js");
  const state = await import("../src/game/state.js");
  const engine = await import("../src/game/engine.js");
  const constants = await import("../src/game/constants.js");
  const clients = await import("../src/game/clients.js");
  const npcs = await import("../src/game/npcs.js");
  const content = await import("../src/game/content.js");
  const casegen = await import("../src/game/casegen.js");
  const { settings } = await import("../src/game/settings.js");
  settings.sfx = 0;
  settings.bgm = 0;
  // Most historical regressions below assert their original immediate-promotion
  // setup. Focused v1.9.10 checks switch back to shipped rules near the end.
  engine.setBalanceExperiment({ weeklyPromotion: false, delegateCap: 2 });

  const template = () => ({
    id: "v195",
    tier: 1,
    title: "TEST",
    deadline: 2,
    body: "test",
    opts: [
      { text: "SAFE", base: 100, safe: true, ok: { fx: { inf: 10, rep: 4, money: 500 }, txt: "safe" } },
      { text: "TECH", base: 100, style: "technical", ok: { fx: { inf: 10, rep: 4, money: 500 }, txt: "tech" } },
      { text: "AGG", base: 100, style: "aggressive", ok: { fx: { inf: 10, rep: 4, money: 500 }, txt: "agg" } },
    ],
  });
  const order = c => c.opts.filter(o => !o.bribe).map(o => o.text);
  const fresh = (mode = "standard") => {
    engine.startGame(mode === "daily" ? null : "fraud", "easy", mode);
    return state.S;
  };

  // Fisher-Yates stays immutable and deterministic under a seeded run.
  const source = ["A", "B", "C", "D"];
  utils.setSeed(123);
  const permutation1 = utils.shuffle(source);
  utils.setSeed(123);
  const permutation2 = utils.shuffle(source);
  assert.deepEqual(source, ["A", "B", "C", "D"]);
  assert.deepEqual([...permutation1].sort(), [...source].sort());
  assert.deepEqual(permutation1, permutation2);
  const shuffleOrders = new Set();
  for (let seed = 1; seed <= 20; seed++) {
    utils.setSeed(seed);
    shuffleOrders.add(utils.shuffle(source).join(""));
  }
  assert.ok(shuffleOrders.size > 1);

  // Client and NPC shuffles consume the same portable deterministic RNG.
  utils.setSeed(77);
  const clients1 = clients.buildClientPool();
  const traits1 = npcs.buildNpcs().map(npc => npc.trait);
  utils.setSeed(77);
  const clients2 = clients.buildClientPool();
  const traits2 = npcs.buildNpcs().map(npc => npc.trait);
  assert.deepEqual(clients1, clients2);
  assert.deepEqual(traits1, traits2);

  // Base options shuffle without mutating source content; INF scales once by style.
  fresh();
  const raw = template();
  utils.setSeed(9);
  const live = engine.instantiateCase(raw);
  assert.deepEqual(raw.opts.map(o => o.text), ["SAFE", "TECH", "AGG"]);
  const safe = live.opts.find(o => o.safe);
  const technical = live.opts.find(o => o.style === "technical");
  const aggressive = live.opts.find(o => o.style === "aggressive");
  assert.equal(safe.ok.fx.inf, 6);
  assert.equal(technical.ok.fx.inf, 4);
  assert.equal(aggressive.ok.fx.inf, 8);
  for (const option of [safe, technical, aggressive]) {
    assert.equal(option.ok.fx.rep, 4);
    assert.equal(option.ok.fx.money, 500);
  }
  assert.equal(raw.opts[1].ok.fx.inf, 10);

  // Soak-only reward variants use the real draw-time scaler. Prove the hook
  // changes aggressive INF without leaking into the shipped 1.25 baseline.
  engine.setBalanceExperiment({ weeklyPromotion: false, delegateCap: 2, aggressiveInfMult: 1.75 });
  const aggressiveExperiment = engine.instantiateCase(template()).opts.find(o => o.style === "aggressive");
  assert.equal(aggressiveExperiment.ok.fx.inf, 11);
  engine.setBalanceExperiment({ weeklyPromotion: false, delegateCap: 2 });

  utils.setSeed(901);
  const case1 = engine.instantiateCase(template());
  utils.setSeed(901);
  const case2 = engine.instantiateCase(template());
  assert.deepEqual(order(case1), order(case2));
  const caseOrders = new Set();
  for (let seed = 1; seed <= 20; seed++) {
    utils.setSeed(seed);
    caseOrders.add(order(engine.instantiateCase(template())).join("|"));
  }
  assert.ok(caseOrders.size > 1);

  // A corrupt judge's dynamic bribe remains after every shuffled base option.
  let bribes = 0;
  for (let seed = 1; seed <= 100; seed++) {
    utils.setSeed(seed);
    const judged = engine.instantiateCase({ ...template(), judge: true });
    const found = judged.opts.filter(o => o.bribe);
    if (found.length) {
      bribes++;
      assert.equal(found.length, 1);
      assert.equal(judged.opts.at(-1), found[0]);
    }
  }
  assert.ok(bribes > 0);

  // v1.9.8/v1.9.13: stable identity plus bounded, recent-weighted recall.
  assert.equal(content.JUDGES.length, 7);
  assert.equal(new Set(content.JUDGES.map(judge => judge.id)).size, content.JUDGES.length);
  assert.ok(content.JUDGES.every(judge => judge.id && judge.memoryGood && judge.memoryBad));
  fresh();
  assert.deepEqual(state.S.judgeMemory, {});
  const judgeCase = judge => ({ ...template(), tier: 2, judge });
  const judgeOption = style => ({
    text: style.toUpperCase(), base: 50, style,
    ok: { fx: {}, txt: "won" }, fail: { fx: {}, txt: "lost" },
  });
  const ironwoodCase = judgeCase(content.JUDGES[0]);
  const marshCase = judgeCase(content.JUDGES[1]);
  const aggMemoryOption = judgeOption("aggressive");
  const techMemoryOption = judgeOption("technical");
  const bribeMemoryOption = judgeOption("bribe");
  const safeMemoryOption = { text: "SAFE", base: 100, safe: true, ok: { fx: {}, txt: "safe" } };
  assert.equal(engine.judgeMemoryInfo(ironwoodCase).first, true);
  assert.equal(engine.judgeMemoryModifier(aggMemoryOption, ironwoodCase), 0);
  assert.equal(engine.chance(safeMemoryOption, ironwoodCase), 100);
  const firstBluffChance = engine.chance(aggMemoryOption, ironwoodCase);
  engine.rememberJudgeOutcome(ironwoodCase, aggMemoryOption, true);
  assert.equal(engine.judgeMemoryModifier(aggMemoryOption, ironwoodCase), -5);
  assert.equal(engine.chance(aggMemoryOption, ironwoodCase), firstBluffChance - 5);
  assert.equal(engine.judgeMemoryModifier(aggMemoryOption, marshCase), 0);
  assert.match(engine.judgeMemoryInfo(ironwoodCase).quote, /last bluff landed/i);
  engine.rememberJudgeOutcome(ironwoodCase, safeMemoryOption, true);
  assert.equal(engine.judgeMemoryModifier(aggMemoryOption, ironwoodCase), -2, "a safe hearing cools, but does not instantly erase, the bluff");
  assert.match(engine.judgeMemoryInfo(ironwoodCase).quote, /kept it conventional/i);
  engine.rememberJudgeOutcome(ironwoodCase, aggMemoryOption, false);
  assert.equal(engine.judgeMemoryModifier(aggMemoryOption, ironwoodCase), -7);
  engine.rememberJudgeOutcome(ironwoodCase, aggMemoryOption, false);
  assert.equal(engine.judgeMemoryModifier(aggMemoryOption, ironwoodCase), -8, "bluff memory is capped");

  fresh();
  const rollingTechnicalCase = judgeCase(content.JUDGES[2]);
  engine.rememberJudgeOutcome(rollingTechnicalCase, techMemoryOption, true);
  engine.rememberJudgeOutcome(rollingTechnicalCase, techMemoryOption, true);
  assert.equal(engine.judgeMemoryModifier(techMemoryOption, rollingTechnicalCase), 5);
  engine.rememberJudgeOutcome(rollingTechnicalCase, techMemoryOption, true);
  assert.equal(engine.judgeMemoryModifier(techMemoryOption, rollingTechnicalCase), 6, "three recent technical wins earn the credibility cap");
  engine.rememberJudgeOutcome(rollingTechnicalCase, safeMemoryOption, true);
  assert.equal(engine.judgeMemoryModifier(techMemoryOption, rollingTechnicalCase), 2, "a different recent style decays old technical credibility");
  engine.rememberJudgeOutcome(rollingTechnicalCase, safeMemoryOption, true);
  engine.rememberJudgeOutcome(rollingTechnicalCase, safeMemoryOption, true);
  assert.equal(engine.judgeMemoryModifier(techMemoryOption, rollingTechnicalCase), 0, "three newer hearings fully retire the old style effect");

  fresh();
  const rollingBribeCase = judgeCase(content.JUDGES[3]);
  engine.rememberJudgeOutcome(rollingBribeCase, bribeMemoryOption, false);
  engine.rememberJudgeOutcome(rollingBribeCase, bribeMemoryOption, true);
  assert.equal(engine.judgeMemoryModifier(bribeMemoryOption, rollingBribeCase), -8, "repeat impropriety is capped");
  assert.equal(engine.chance(safeMemoryOption, ironwoodCase), 100, "memory never breaks a safe option");

  fresh();
  const technicalLossCase = judgeCase(content.JUDGES[2]);
  engine.rememberJudgeOutcome(technicalLossCase, techMemoryOption, false);
  engine.rememberJudgeOutcome(technicalLossCase, techMemoryOption, false);
  engine.rememberJudgeOutcome(technicalLossCase, techMemoryOption, false);
  assert.equal(engine.judgeMemoryModifier(techMemoryOption, technicalLossCase), -5);
  assert.equal(state.S.judgeMemory.pelt.recent.length, constants.JUDGE_MEMORY_WINDOW);
  for(let i=0;i<20;i++) engine.rememberJudgeOutcome(technicalLossCase, safeMemoryOption, true);
  assert.equal(state.S.judgeMemory.pelt.seen,23,"lifetime transcript remains complete");
  assert.equal(state.S.judgeMemory.pelt.recent.length,constants.JUDGE_MEMORY_EVENT_LIMIT,"persisted recall is bounded");

  // The rejected Friday A/B model really does halve last week's impression;
  // shipped rolling recall is hearing-based and has no arbitrary Friday cliff.
  fresh();
  const weeklyCase=judgeCase(content.JUDGES[4]);
  engine.rememberJudgeOutcome(weeklyCase,techMemoryOption,true);
  state.S.day=6;
  engine.setBalanceExperiment({weeklyPromotion:false,delegateCap:2,judgeMemoryModel:"friday"});
  assert.equal(engine.judgeMemoryModifier(techMemoryOption,weeklyCase),2);
  engine.setBalanceExperiment({weeklyPromotion:false,delegateCap:2,judgeMemoryModel:"rolling"});
  assert.equal(engine.judgeMemoryModifier(techMemoryOption,weeklyCase),4);
  engine.setBalanceExperiment({weeklyPromotion:false,delegateCap:2});

  // Instant court results record exactly once. The archive freezes the memory
  // that applied at the hearing; a stale second click cannot duplicate either.
  fresh();
  state.S.inbox = [];
  state.S.hours = 8;
  const instantCourt = engine.instantiateCase({ ...template(), tier: 2, judge: true });
  state.S.inbox = [instantCourt];
  const instantAgg = instantCourt.opts.find(option => option.style === "aggressive");
  engine.choose(instantCourt, instantAgg);
  const instantJudgeId = engine.judgeId(instantCourt.judge);
  assert.equal(state.S.judgeMemory[instantJudgeId].seen, 1);
  assert.equal(state.S.archive[0].id, instantCourt.id, "archive rows preserve filing identity for replay telemetry");
  assert.match(state.S.archive[0].judgeMemory, /FIRST APPEARANCE/);
  const instantStats = JSON.stringify(state.S.judgeMemory[instantJudgeId]);
  const archiveSnapshot = state.S.archive[0].judgeMemory;
  engine.choose(instantCourt, instantAgg);
  assert.equal(JSON.stringify(state.S.judgeMemory[instantJudgeId]), instantStats);
  engine.rememberJudgeOutcome(instantCourt, techMemoryOption, true);
  assert.equal(state.S.archive[0].judgeMemory, archiveSnapshot, "archive memory snapshots are immutable");

  // Judge memory helpers and recording consume no RNG; equal DAILY seeds keep
  // judge draws, option order, memory and the next cursor identical.
  const dailyMemoryTrace = () => {
    fresh("daily");
    state.S.inbox = [];
    state.S.event = null;
    utils.setSeed(1988);
    const first = engine.instantiateCase({ ...template(), tier: 2, judge: true });
    const beforeHelpers = utils.getRngState();
    engine.judgeMemoryInfo(first);
    engine.judgeMemoryModifier(aggMemoryOption, first);
    engine.chance(aggMemoryOption, first);
    engine.rememberJudgeOutcome(first, aggMemoryOption, false);
    assert.equal(utils.getRngState(), beforeHelpers);
    const second = engine.instantiateCase({ ...template(), tier: 2, judge: true });
    return {
      first: engine.judgeId(first.judge), second: engine.judgeId(second.judge),
      order: order(second), memory: JSON.parse(JSON.stringify(state.S.judgeMemory)),
      cursor: utils.getRngState(),
    };
  };
  assert.deepEqual(dailyMemoryTrace(), dailyMemoryTrace());

  // A non-empty memory map survives a DAILY save/load without shifting the
  // next judge, option permutation, or seeded cursor.
  const dailyMemoryResumeTrace = resume => {
    fresh("daily");
    state.S.inbox = [];
    state.S.event = null;
    utils.setSeed(2018);
    const heard = engine.instantiateCase({ ...template(), tier: 2, judge: true });
    engine.rememberJudgeOutcome(heard, techMemoryOption, true);
    engine.saveGame();
    if (resume) assert.equal(engine.loadGame(1), true);
    const next = engine.instantiateCase({ ...template(), tier: 2, judge: true });
    return {
      judge: engine.judgeId(next.judge), order: order(next),
      memory: JSON.parse(JSON.stringify(state.S.judgeMemory)), cursor: utils.getRngState(),
    };
  };
  assert.deepEqual(dailyMemoryResumeTrace(false), dailyMemoryResumeTrace(true));

  // Procedural IDs are part of the player's blurred-information key. Their
  // persisted cursor must resume exactly like the DAILY RNG cursor.
  fresh("daily");
  state.S.inbox = [];
  state.S.event = null;
  utils.setSeed(2048);
  casegen.genCase();
  engine.saveGame();
  const filingCursor = utils.getRngState();
  const uninterruptedFiling = casegen.genCase();
  const uninterruptedRange = engine.displayPct(63, uninterruptedFiling.id + "|TECH");
  const uninterruptedCursor = utils.getRngState();
  assert.equal(engine.loadGame(1), true);
  assert.equal(utils.getRngState(), filingCursor);
  const resumedFiling = casegen.genCase();
  assert.deepEqual(
    { id: resumedFiling.id, title: resumedFiling.title, body: resumedFiling.body, opts: resumedFiling.opts.map(o => o.text) },
    { id: uninterruptedFiling.id, title: uninterruptedFiling.title, body: uninterruptedFiling.body, opts: uninterruptedFiling.opts.map(o => o.text) },
  );
  assert.equal(engine.displayPct(63, resumedFiling.id + "|TECH"), uninterruptedRange);
  assert.equal(utils.getRngState(), uninterruptedCursor);

  // Generated follow-up appeals need their own stable display key too; no
  // procedural live filing may fall back to the shared "ev" odds key.
  fresh("daily");
  utils.setSeed(2051);
  let generatedAppeal = null;
  for (let i = 0; i < 500 && !generatedAppeal; i++) {
    const filing = casegen.genCase();
    generatedAppeal = filing.opts
      .flatMap(option => [option.ok?.next?.case, option.fail?.next?.case])
      .find(Boolean) || null;
  }
  assert.ok(generatedAppeal, "the seeded generator should expose at least one follow-up appeal");
  assert.match(generatedAppeal.id, /^appeal\d+$/);

  // Delayed court outcomes remain secret until REPLY. A save/reload preserves
  // the rolled result and RNG cursor; reveal records memory exactly once.
  fresh("daily");
  state.S.inbox = [];
  state.S.event = null;
  state.S.hours = 8;
  utils.setSeed(2088);
  const delayedCourtRaw = { ...template(), tier: 2, judge: true };
  delayedCourtRaw.opts.forEach(option => { option.delay = 1; });
  const delayedCourt = engine.instantiateCase(delayedCourtRaw);
  state.S.inbox = [delayedCourt];
  const delayedTech = delayedCourt.opts.find(option => option.style === "technical");
  const delayedJudgeId = engine.judgeId(delayedCourt.judge);
  engine.choose(delayedCourt, delayedTech);
  assert.equal(state.S.judgeMemory[delayedJudgeId], undefined);
  assert.equal(engine.judgeMemoryModifier(delayedTech, delayedCourt), 0);
  const hiddenResult = delayedCourt.pending.win;
  const delayedCursor = utils.getRngState();
  assert.equal(engine.loadGame(1), true);
  assert.equal(state.S.inbox.find(c => c.pending).pending.win, hiddenResult);
  assert.match(state.S.inbox.find(c => c.pending).pending.judgeMemorySnapshot, /FIRST APPEARANCE/);
  assert.equal(state.S.judgeMemory[delayedJudgeId], undefined);
  assert.equal(utils.getRngState(), delayedCursor);
  // A later hearing before the REPLY must not rewrite the first hearing's
  // frozen archive context.
  const resumedDelayed = state.S.inbox.find(c => c.pending);
  const interveningCourt = engine.instantiateCase({ ...template(), tier: 2, judge: true });
  interveningCourt.judge = resumedDelayed.judge;
  state.S.inbox.push(interveningCourt);
  engine.choose(interveningCourt, interveningCourt.opts.find(option => option.style === "technical"));
  assert.equal(state.S.judgeMemory[delayedJudgeId].seen, 1);
  engine.endDay();
  engine.dismissSummary();
  assert.equal(state.S.judgeMemory[delayedJudgeId].seen, 2);
  assert.ok(state.S.judgeMemory[delayedJudgeId][hiddenResult ? "technicalW" : "technicalL"] >= 1);
  const delayedArchive = state.S.archive.find(entry => entry.via === "delayed reply");
  assert.equal(delayedArchive.id, resumedDelayed.id);
  assert.match(delayedArchive.judgeMemory, /FIRST APPEARANCE/);
  engine.saveGame();
  engine.loadGame(1);
  assert.equal(state.S.judgeMemory[delayedJudgeId].seen, 2, "revealed memory must not replay on reload");

  fresh();
  const missedCourt = engine.instantiateCase({ ...template(), tier: 2, judge: true });
  missedCourt.dueDay = state.S.day;
  state.S.inbox = [missedCourt];
  state.S.objective = null;
  state.S.debtDue = null;
  engine.endDay();
  assert.deepEqual(state.S.judgeMemory, {}, "missing a deadline is not a court appearance");

  // Existing saves preserve visible order; DAILY restores the next RNG cursor too.
  fresh();
  utils.setSeed(444);
  const savedCase = engine.instantiateCase(template());
  state.S.inbox = [savedCase];
  state.S.hours = 8;
  state.S.event = null;
  const savedOrder = order(savedCase);
  engine.saveGame();
  engine.loadGame(1);
  assert.deepEqual(order(state.S.inbox[0]), savedOrder);

  fresh("daily");
  state.S.inbox = [];
  state.S.event = null;
  state.S.hours = 8;
  engine.saveGame();
  const expectedNextOrder = order(engine.instantiateCase(template()));
  engine.loadGame(1);
  assert.deepEqual(order(engine.instantiateCase(template())), expectedNextOrder);

  // Instant and delayed resolution both use the pre-scaled style reward.
  fresh();
  state.S.inbox = [];
  state.S.inf = 10;
  state.S.hours = 8;
  const instantTechnical = engine.instantiateCase(template());
  state.S.inbox = [instantTechnical];
  engine.choose(instantTechnical, instantTechnical.opts.find(o => o.style === "technical"));
  assert.equal(state.S.inf, 14);

  fresh();
  state.S.inbox = [];
  state.S.inf = 10;
  state.S.hours = 8;
  const instantAggressive = engine.instantiateCase(template());
  state.S.inbox = [instantAggressive];
  engine.choose(instantAggressive, instantAggressive.opts.find(o => o.style === "aggressive"));
  assert.equal(state.S.inf, 18);

  fresh();
  state.S.inbox = [];
  state.S.inf = 10;
  state.S.hours = 8;
  const delayedRaw = template();
  delayedRaw.opts.forEach(option => { option.delay = 1; });
  const delayed = engine.instantiateCase(delayedRaw);
  state.S.inbox = [delayed];
  engine.choose(delayed, delayed.opts.find(o => o.style === "technical"));
  engine.endDay();
  engine.dismissSummary();
  assert.equal(state.S.inf, 13); // +4 reward, then -1 overnight decay.

  // Coffee gives 14 then 8 relief; cup three is a strict no-op.
  fresh();
  Object.assign(state.S, { money: 1000, fatigue: 50, coffeeToday: 0, decor: {} });
  engine.buyCoffee();
  assert.deepEqual([state.S.money, state.S.fatigue, state.S.coffeeToday], [880, 36, 1]);
  engine.buyCoffee();
  assert.deepEqual([state.S.money, state.S.fatigue, state.S.coffeeToday], [760, 28, 2]);
  const logCount = state.S.logEntries.length;
  engine.buyCoffee();
  assert.deepEqual(
    [state.S.money, state.S.fatigue, state.S.coffeeToday, state.S.logEntries.length],
    [760, 28, 2, logCount],
  );
  assert.equal(engine.coffeeRelief(), 0);
  assert.equal(engine.canBuyCoffee(), false);

  Object.assign(state.S, { money: 1000, fatigue: 50, coffeeToday: 0, decor: { espresso: true } });
  engine.buyCoffee();
  engine.buyCoffee();
  engine.buyCoffee();
  assert.deepEqual([state.S.money, state.S.fatigue, state.S.coffeeToday], [920, 28, 2]);

  // Overtime gives +12 then +18; stale/forged block three is rejected.
  fresh();
  Object.assign(state.S, {
    hours: 0,
    otHours: 0,
    otToday: 0,
    fatigue: 0,
    event: null,
    summary: null,
    leaving: false,
  });
  const overtimePrompt = () => {
    const option = { text: "Overtime", base: 100, safe: true, ot: true, ok: { fx: {}, txt: "" } };
    state.S.event = { id: "overtime", title: "QUITTING TIME", body: "test", opts: [option] };
    return option;
  };
  const firstOvertime = overtimePrompt();
  engine.resolveCrisis(firstOvertime);
  assert.deepEqual([state.S.hours, state.S.otHours, state.S.otToday, state.S.fatigue], [2, 2, 1, 12]);
  const afterFirstOvertime = [state.S.hours, state.S.otHours, state.S.otToday, state.S.fatigue, state.S.logEntries.length];
  engine.resolveCrisis(firstOvertime);
  assert.deepEqual([state.S.hours, state.S.otHours, state.S.otToday, state.S.fatigue, state.S.logEntries.length], afterFirstOvertime,
    "a stale overtime double-click must do nothing");
  state.S.hours = 0;
  engine.resolveCrisis(overtimePrompt());
  assert.deepEqual([state.S.hours, state.S.otHours, state.S.otToday, state.S.fatigue], [2, 4, 2, 30]);
  state.S.hours = 0;
  engine.resolveCrisis(overtimePrompt());
  assert.deepEqual([state.S.hours, state.S.otHours, state.S.otToday, state.S.fatigue], [0, 4, 2, 30]);
  assert.equal(state.S.event.id, "overtime");
  assert.equal(state.S.event.opts.some(option => option.ot), false);

  // Generic event choices are idempotent too: a stale second click cannot
  // award the outcome or consume another deterministic roll.
  fresh("daily");
  const oneShot = { text: "One shot", base: 100, safe: true, ok: { fx: { money: 100 }, txt: "paid" } };
  state.S.event = { id: "one_shot", title: "ONE SHOT", body: "test", opts: [oneShot] };
  utils.setSeed(4141);
  engine.resolveCrisis(oneShot);
  const afterOneShot = {
    money: state.S.money, cursor: utils.getRngState(), logs: state.S.logEntries.length,
    resolved: state.S.today.resolved,
  };
  engine.resolveCrisis(oneShot);
  assert.deepEqual({
    money: state.S.money, cursor: utils.getRngState(), logs: state.S.logEntries.length,
    resolved: state.S.today.resolved,
  }, afterOneShot);

  // At 80 FATIGUE the per-hour hazard is 30%: a two-hour overtime block must
  // use the compounded 51% risk, not a single-hour 30% roll.
  let compoundedSeed = null;
  for (let seed = 1; seed < 1000 && compoundedSeed == null; seed++) {
    utils.setSeed(seed);
    const roll = utils.rand();
    if (roll >= .30 && roll < .51) compoundedSeed = seed;
  }
  assert.notEqual(compoundedSeed, null);
  fresh("daily");
  Object.assign(state.S, { hours: 0, fatigue: 68, rep: 80, inbox: [], objective: null, debtDue: null, event: null });
  const riskyOvertime = overtimePrompt();
  utils.setSeed(compoundedSeed);
  engine.resolveCrisis(riskyOvertime);
  assert.equal(state.S.summary?.action, "nextDay", "two-hour compounded risk should send this seeded run home");

  // Reload derives the correct prompt from persisted clock state, including old saves.
  const promptFor = (today, hours) => {
    Object.assign(state.S, {
      hours: 0,
      otToday: today,
      otHours: hours,
      event: null,
      summary: null,
      leaving: false,
    });
    engine.saveGame();
    engine.loadGame(1);
    return state.S.event;
  };
  assert.match(promptFor(0, 0).opts.find(option => option.ot).text, /\+12 FATIGUE/);
  assert.match(promptFor(1, 2).opts.find(option => option.ot).text, /\+18 FATIGUE/);
  assert.equal(promptFor(2, 4).opts.some(option => option.ot), false);

  const saveKey = `${constants.SAVE_KEY}_s1`;
  const oldSave = JSON.parse(localStorage.getItem(saveKey));
  delete oldSave.otToday;
  oldSave.otHours = 4;
  oldSave.hours = 0;
  oldSave.event = null;
  localStorage.setItem(saveKey, JSON.stringify(oldSave));
  engine.loadGame(1);
  assert.equal(state.S.otToday, 2);
  assert.equal(state.S.event.opts.some(option => option.ot), false);

  // v1.9.6 save payloads are versioned, bounded and free of transient UI state.
  engine.setSlot(1);
  fresh();
  Object.assign(state.S, {
    infoOpen: true, flash: { text: "TRANSIENT" }, userPaused: true,
    leaving: true, charAnim: "leaving", openCase: state.S.inbox[0],
    settingsOpen: true, sceneRank: 2, rosterOpen: true, archiveOpen: true,
    pendingChoice: { c: state.S.inbox[0], o: state.S.inbox[0].opts[0] },
    saveError: { kind: "write", message: "test" }, shakeSeq: 99,
  });
  assert.equal(engine.saveGame(), true);
  let persisted = JSON.parse(storage.get(saveKey));
  assert.equal(persisted.schemaVersion, constants.SAVE_SCHEMA_VERSION);
  assert.equal(typeof persisted.savedAt, "number");
  assert.ok(Object.prototype.hasOwnProperty.call(persisted, "rngState"));
  for (const key of ["infoOpen", "flash", "userPaused", "leaving", "charAnim", "openCase",
    "settingsOpen", "sceneRank", "rosterOpen", "archiveOpen", "pendingChoice", "saveError", "shakeSeq"])
    assert.equal(Object.prototype.hasOwnProperty.call(persisted, key), false, `${key} must stay transient`);

  state.S.logEntries = Array.from({ length: 5000 }, (_, i) => ({ txt: `log ${i}`, cls: "" }));
  state.S.archive = Array.from({ length: 5000 }, (_, i) => ({ day: 1, title: `case ${i}` }));
  state.S.archiveTotal = 5000;
  assert.equal(engine.saveGame(), true);
  persisted = JSON.parse(storage.get(saveKey));
  assert.equal(persisted.logEntries.length, constants.SAVE_LOG_LIMIT);
  assert.equal(persisted.archive.length, constants.SAVE_ARCHIVE_LIMIT);
  assert.equal(persisted.archiveTotal, 5000);

  // Endless notifications stay bounded without ever deleting a live filing;
  // older oversized slots are repaired on inspection/load.
  const liveBeforeMessageCap = state.S.inbox.filter(item => !item.msg);
  const liveIdsBeforeMessageCap = liveBeforeMessageCap.map(item => item.id);
  state.S.inbox = [
    ...Array.from({ length: constants.INBOX_MESSAGE_LIMIT + 25 }, (_, i) => ({ msg: true, title: `notice ${i}`, body: "old news" })),
    ...liveBeforeMessageCap,
  ];
  assert.equal(engine.saveGame(), true);
  assert.equal(engine.loadGame(1), true);
  assert.equal(state.S.inbox.filter(item => item.msg).length, constants.INBOX_MESSAGE_LIMIT);
  assert.equal(state.S.inbox.filter(item => !item.msg).length, liveBeforeMessageCap.length);
  assert.deepEqual(state.S.inbox.filter(item => !item.msg).map(item => item.id), liveIdsBeforeMessageCap);

  // A schema-less pre-Client-Book save migrates without losing future prospects.
  fresh();
  persisted = JSON.parse(storage.get(saveKey));
  delete persisted.schemaVersion;
  delete persisted.savedAt;
  delete persisted.clientPool;
  delete persisted.hours;
  delete persisted.fatigue;
  delete persisted.otToday;
  delete persisted.decor;
  delete persisted.judgeMemory;
  delete persisted.runStats.fired;
  delete persisted.today.moneyGained;
  persisted.otHours = 4;
  persisted.coffeeToday = 99;
  persisted.clients = [];
  persisted.logEntries = Array.from({ length: 300 }, (_, i) => ({ txt: `old log ${i}`, cls: "" }));
  persisted.archive = Array.from({ length: 300 }, (_, i) => ({ day: 1, title: `old case ${i}` }));
  storage.set(saveKey, JSON.stringify(persisted));
  const migratedInfo = engine.inspectSave(1);
  assert.equal(migratedInfo.status, "ready");
  assert.equal(migratedInfo.needsUpgrade, true);
  assert.equal(migratedInfo.save.clientPool.length, 20);
  assert.equal(migratedInfo.save.otToday, 2);
  assert.equal(migratedInfo.save.coffeeToday, constants.COFFEE_LIMIT);
  assert.equal(migratedInfo.save.runStats.fired, 0);
  assert.equal(migratedInfo.save.today.moneyGained, 0);
  assert.equal(migratedInfo.save.firmPlanDay, 0);
  assert.equal(migratedInfo.save.firmGateHintRank, null);
  assert.deepEqual(migratedInfo.save.judgeMemory, {});
  assert.equal(migratedInfo.save.logEntries.length, constants.SAVE_LOG_LIMIT);
  assert.equal(migratedInfo.save.archive.length, constants.SAVE_ARCHIVE_LIMIT);
  assert.equal(engine.loadGame(1), true);
  assert.equal(JSON.parse(storage.get(saveKey)).schemaVersion, constants.SAVE_SCHEMA_VERSION);

  // Corrupt, malformed and future-version slots are diagnosed without deletion.
  const readyBase = JSON.parse(storage.get(saveKey));
  const clone = value => JSON.parse(JSON.stringify(value));
  const validMemoryRecord = {
    seen: 1, aggressiveW: 1, aggressiveL: 0, technicalW: 0, technicalL: 0,
    bribeW: 0, bribeL: 0, safe: 0, neutralW: 0, neutralL: 0,
    lastStyle: "aggressive", lastWin: true, lastDay: 1,
    recent: [{style:"aggressive",win:true,day:1}],
  };
  const v5Raw=clone(readyBase);
  v5Raw.schemaVersion=5;
  v5Raw.day=8;
  v5Raw.judgeMemory={ironwood:{...clone(validMemoryRecord),seen:2,aggressiveW:2,lastDay:4}};
  delete v5Raw.judgeMemory.ironwood.recent;
  storage.set(`${constants.SAVE_KEY}_s2`,JSON.stringify(v5Raw));
  const v5Info=engine.inspectSave(2);
  assert.equal(v5Info.status,"ready");
  assert.equal(v5Info.needsUpgrade,true);
  assert.equal(v5Info.save.judgeMemory.ironwood.seen,2,"v5 lifetime totals survive migration");
  assert.deepEqual(v5Info.save.judgeMemory.ironwood.recent,[{style:"aggressive",win:true,day:4}],"v5 active recall starts from the last known hearing");
  const v1Raw = clone(readyBase);
  v1Raw.schemaVersion = 1;
  delete v1Raw.firmPlanDay;
  delete v1Raw.firmGateHintRank;
  delete v1Raw.judgeMemory;
  storage.set(`${constants.SAVE_KEY}_s2`, JSON.stringify(v1Raw));
  const v1Info = engine.inspectSave(2);
  assert.equal(v1Info.status, "ready");
  assert.equal(v1Info.needsUpgrade, true);
  assert.equal(v1Info.save.schemaVersion, constants.SAVE_SCHEMA_VERSION);
  assert.equal(v1Info.save.firmPlanDay, 0);
  assert.equal(v1Info.save.firmGateHintRank, null);
  assert.equal(v1Info.save.promotionReviewDay, 0);
  assert.equal(v1Info.save.promotionHintRank, null);
  assert.deepEqual(v1Info.save.judgeMemory, {});
  const v4Raw = clone(readyBase);
  v4Raw.schemaVersion = 4;
  delete v4Raw.promotionReviewDay;
  delete v4Raw.promotionHintRank;
  storage.set(`${constants.SAVE_KEY}_s2`, JSON.stringify(v4Raw));
  const v4Info = engine.inspectSave(2);
  assert.equal(v4Info.status, "ready");
  assert.equal(v4Info.needsUpgrade, true);
  assert.equal(v4Info.save.schemaVersion, constants.SAVE_SCHEMA_VERSION);
  assert.equal(v4Info.save.promotionReviewDay, 0);
  assert.equal(v4Info.save.promotionHintRank, null);
  const v3Raw = clone(readyBase);
  v3Raw.schemaVersion = 3;
  delete v3Raw.caseSeq;
  v3Raw.archive = [{ id: "appeal47", day: 1, title: "old appeal", play: "filed", win: true }];
  v3Raw.archiveTotal = 1;
  v3Raw.inbox = [{ ...template(), id: "gen42", dueDay: 3 }];
  const idlessLegacyAppeal = template();
  delete idlessLegacyAppeal.id;
  idlessLegacyAppeal.title = "APPEAL: legacy generated filing";
  v3Raw.inbox[0].opts[0].ok.next = { after: 2, case: idlessLegacyAppeal };
  storage.set(`${constants.SAVE_KEY}_s2`, JSON.stringify(v3Raw));
  const v3Info = engine.inspectSave(2);
  assert.equal(v3Info.status, "ready");
  assert.equal(v3Info.needsUpgrade, true);
  assert.equal(v3Info.save.caseSeq, 48);
  assert.equal(v3Info.save.inbox[0].opts[0].ok.next.case.id, "appeal48");
  assert.equal(engine.loadGame(2), true);
  assert.equal(state.S.caseSeq, 48);
  const filingAfterMigration = casegen.genCase();
  assert.match(filingAfterMigration.id, /^gen\d+$/);
  assert.ok(Number(filingAfterMigration.id.slice(3)) > 48, "nested follow-ups may reserve IDs before the root filing");
  assert.equal(Number(filingAfterMigration.id.slice(3)), state.S.caseSeq);
  const legacyJudge = clone(content.JUDGES[0]);
  delete legacyJudge.id;
  delete legacyJudge.memoryGood;
  delete legacyJudge.memoryBad;
  const legacyCourt = { ...template(), tier: 2, judge: legacyJudge, dueDay: 3 };
  const v2Raw = clone(readyBase);
  v2Raw.schemaVersion = 2;
  delete v2Raw.judgeMemory;
  v2Raw.inbox = [legacyCourt];
  v2Raw.inbox[0].judge.book = -999; // old balance snapshots are not gameplay authority
  storage.set(`${constants.SAVE_KEY}_s2`, JSON.stringify(v2Raw));
  const v2Info = engine.inspectSave(2);
  assert.equal(v2Info.status, "ready");
  assert.equal(v2Info.needsUpgrade, true);
  assert.equal(v2Info.save.schemaVersion, constants.SAVE_SCHEMA_VERSION);
  assert.deepEqual(v2Info.save.judgeMemory, {});
  assert.equal(engine.judgeId(v2Info.save.inbox[0].judge), "ironwood", "legacy judge names resolve to stable ids");
  assert.equal(v2Info.save.inbox[0].judge.book, content.JUDGES[0].book);
  assert.equal(engine.loadGame(2), true);
  const loadedLegacyCourt = state.S.inbox[0];
  engine.choose(loadedLegacyCourt, loadedLegacyCourt.opts.find(option => option.style === "technical"));
  assert.equal(state.S.judgeMemory.ironwood.seen, 1, "legacy id-less judges write to the canonical memory key");
  engine.setSlot(1);
  const delayedWar = clone(engine.buildBigMatter("Abibas"));
  delayedWar.opts[0].delay = 1;
  const pendingWar = clone(engine.buildBigMatter("Abibas"));
  pendingWar.pending = { day: pendingWar.deadline, win: true, o: { ...clone(pendingWar.opts[0]), delay: 1 } };
  const delegatedWar = clone(engine.buildBigMatter("Abibas"));
  delegatedWar.delegated = { day: delegatedWar.deadline, npc: "dana", win: true };
  // Stable ids are the only persisted authority in v3: stale/tampered balance
  // fields are replaced by the current catalog before they can affect play.
  const forgedIdCourt = { ...template(), tier: 2,
    judge: { ...clone(content.JUDGES[6]), name: content.JUDGES[0].name, book: 999 }, dueDay: 3 };
  storage.set(`${constants.SAVE_KEY}_s2`, JSON.stringify({ ...clone(readyBase), inbox: [forgedIdCourt] }));
  const canonicalJudgeInfo = engine.inspectSave(2);
  assert.equal(canonicalJudgeInfo.status, "ready");
  assert.equal(canonicalJudgeInfo.save.inbox[0].judge.id, "fairway", "stable id wins over a conflicting valid name");
  assert.equal(canonicalJudgeInfo.save.inbox[0].judge.name, content.JUDGES[6].name);
  assert.equal(canonicalJudgeInfo.save.inbox[0].judge.book, content.JUDGES[6].book);
  const forgedCourt = clone(legacyCourt);
  forgedCourt.judge.book = 999;
  const badStyleCourt = clone(legacyCourt);
  badStyleCourt.opts[0].style = "showboat";
  const delegatedCourt = clone(legacyCourt);
  delegatedCourt.delegated = { day: 2, npc: "dana", win: true };
  const sentinelCourt = clone(legacyCourt);
  sentinelCourt.judge = true;
  const badPendingSnapshot = { ...template(), tier: 2, judge: clone(content.JUDGES[0]), dueDay: 3 };
  badPendingSnapshot.pending = { day: 2, win: true, o: clone(badPendingSnapshot.opts[0]), judgeMemorySnapshot: 7 };
  const missingDueDay = template();
  const invalidRaws = [
    { raw: "{", status: "corrupt" },
    { raw: "", status: "corrupt" },
    { raw: JSON.stringify([]), status: "invalid" },
    { raw: JSON.stringify({}), status: "invalid" },
    { raw: JSON.stringify({ ...clone(readyBase), scenario: "unknown" }), status: "invalid" },
    { raw: JSON.stringify({ ...clone(readyBase), rank: 99 }), status: "invalid" },
    { raw: JSON.stringify({ ...clone(readyBase), rep: -1 }), status: "invalid" },
    { raw: JSON.stringify({ ...clone(readyBase), fatigue: 101 }), status: "invalid" },
    { raw: JSON.stringify({ ...clone(readyBase), hours: -0.25 }), status: "invalid" },
    { raw: JSON.stringify({ ...clone(readyBase), otToday: 1.5 }), status: "invalid" },
    { raw: JSON.stringify({ ...clone(readyBase), archiveTotal: -1 }), status: "invalid" },
    { raw: JSON.stringify({ ...clone(readyBase), firmPlanDay: -1 }), status: "invalid" },
    { raw: JSON.stringify({ ...clone(readyBase), firmGateHintRank: 4 }), status: "invalid" },
    { raw: JSON.stringify({ ...clone(readyBase), promotionReviewDay: -1 }), status: "invalid" },
    { raw: JSON.stringify({ ...clone(readyBase), promotionReviewDay: readyBase.day + 1 }), status: "invalid" },
    { raw: JSON.stringify({ ...clone(readyBase), promotionHintRank: 4 }), status: "invalid" },
    { raw: JSON.stringify({ ...clone(readyBase), caseSeq: -1 }), status: "invalid" },
    { raw: JSON.stringify({ ...clone(readyBase), caseSeq: Number.MAX_SAFE_INTEGER }), status: "invalid" },
    { raw: JSON.stringify({ ...clone(readyBase), caseSeq: Number.MAX_SAFE_INTEGER + 1 }), status: "invalid" },
    { raw: JSON.stringify({ ...clone(readyBase), caseSeq: 4,
      inbox: [{ ...template(), id: "gen5", dueDay: 3 }] }), status: "invalid" },
    { raw: JSON.stringify({ ...clone(readyBase), caseSeq: 4,
      archive: [{ id: "gen5", day: 1, title: "old", play: "filed", win: true }] }), status: "invalid" },
    { raw: JSON.stringify({ ...clone(readyBase), inbox: [{ ...template(), dueDay: 3,
      delegated: { npc: "dana", day: 2, win: false, silent: "yes" } }] }), status: "invalid" },
    { raw: JSON.stringify({ ...clone(readyBase), judgeMemory: { stranger: validMemoryRecord } }), status: "invalid" },
    { raw: JSON.stringify({ ...clone(readyBase), judgeMemory: { ironwood: { ...validMemoryRecord, aggressiveW: -1 } } }), status: "invalid" },
    { raw: JSON.stringify({ ...clone(readyBase), judgeMemory: { ironwood: { ...validMemoryRecord, seen: 1.5 } } }), status: "invalid" },
    { raw: JSON.stringify({ ...clone(readyBase), judgeMemory: { ironwood: { ...validMemoryRecord, seen: 2 } } }), status: "invalid" },
    { raw: JSON.stringify({ ...clone(readyBase), judgeMemory: { ironwood: { ...validMemoryRecord, lastStyle: "showboat" } } }), status: "invalid" },
    { raw: JSON.stringify({ ...clone(readyBase), judgeMemory: { ironwood: { ...validMemoryRecord, lastStyle: "bribe", lastWin: false } } }), status: "invalid" },
    { raw: JSON.stringify({ ...clone(readyBase), judgeMemory: { ironwood: { ...validMemoryRecord, aggressiveW: 0, safe: 1, lastStyle: "safe", lastWin: false } } }), status: "invalid" },
    { raw: JSON.stringify({ ...clone(readyBase), judgeMemory: { ironwood: { ...validMemoryRecord, lastDay: readyBase.day + 1 } } }), status: "invalid" },
    { raw: JSON.stringify({ ...clone(readyBase), judgeMemory: { ironwood: { ...validMemoryRecord, recent: [] } } }), status: "invalid" },
    { raw: JSON.stringify({ ...clone(readyBase), judgeMemory: { ironwood: { ...validMemoryRecord, recent: [{style:"showboat",win:true,day:1}] } } }), status: "invalid" },
    { raw: JSON.stringify({ ...clone(readyBase), judgeMemory: { ironwood: { ...validMemoryRecord, recent: [{style:"aggressive",win:true,day:readyBase.day+1}] } } }), status: "invalid" },
    { raw: JSON.stringify({ ...clone(readyBase), judgeMemory: { ironwood: { ...validMemoryRecord, recent: [{style:"technical",win:true,day:1}] } } }), status: "invalid" },
    { raw: JSON.stringify({ ...clone(readyBase), money: {} }), status: "invalid" },
    { raw: JSON.stringify({ ...clone(readyBase), inbox: {} }), status: "invalid" },
    { raw: JSON.stringify({ ...clone(readyBase), inbox: [{ title: "BAD", body: "bad", opts: [null] }] }), status: "invalid" },
    { raw: JSON.stringify({ ...clone(readyBase), inbox: [{ ...template(), id: "", dueDay: 3 }] }), status: "invalid" },
    { raw: JSON.stringify({ ...clone(readyBase), inbox: [missingDueDay] }), status: "invalid" },
    { raw: JSON.stringify({ ...clone(readyBase), roster: [null] }), status: "invalid" },
    { raw: JSON.stringify({ ...clone(readyBase), bigCase: "damaged" }), status: "invalid" },
    { raw: JSON.stringify({ ...clone(readyBase), runStats: { ...clone(readyBase.runStats), safe: "many" } }), status: "invalid" },
    { raw: JSON.stringify({ ...clone(readyBase), runStats: { ...clone(readyBase.runStats), deleg: { dana: -1 } } }), status: "invalid" },
    { raw: JSON.stringify({ ...clone(readyBase), today: { ...clone(readyBase.today), wins: null } }), status: "invalid" },
    { raw: JSON.stringify({ ...clone(readyBase), inbox: [delayedWar] }), status: "invalid" },
    { raw: JSON.stringify({ ...clone(readyBase), inbox: [pendingWar] }), status: "invalid" },
    { raw: JSON.stringify({ ...clone(readyBase), inbox: [delegatedWar] }), status: "invalid" },
    { raw: JSON.stringify({ ...clone(readyBase), inbox: [forgedCourt] }), status: "invalid" },
    { raw: JSON.stringify({ ...clone(readyBase), inbox: [badStyleCourt] }), status: "invalid" },
    { raw: JSON.stringify({ ...clone(readyBase), inbox: [delegatedCourt] }), status: "invalid" },
    { raw: JSON.stringify({ ...clone(readyBase), inbox: [sentinelCourt] }), status: "invalid" },
    { raw: JSON.stringify({ ...clone(readyBase), inbox: [badPendingSnapshot] }), status: "invalid" },
    { raw: JSON.stringify({ ...clone(readyBase), archive: [{ day: 1, title: "BAD MEMORY", judgeMemory: 7 }] }), status: "invalid" },
  ];
  for (const { raw, status } of invalidRaws) {
    storage.set(`${constants.SAVE_KEY}_s2`, raw);
    assert.equal(engine.inspectSave(2).status, status);
    assert.equal(storage.get(`${constants.SAVE_KEY}_s2`), raw, "inspection must preserve raw data");
  }
  const futureRaw = JSON.stringify({ ...clone(readyBase), schemaVersion: constants.SAVE_SCHEMA_VERSION + 1 });
  storage.set(`${constants.SAVE_KEY}_s3`, futureRaw);
  assert.equal(engine.inspectSave(3).status, "future");
  assert.equal(storage.get(`${constants.SAVE_KEY}_s3`), futureRaw);
  for (const status of ["corrupt", "invalid", "future", "unavailable"]) {
    assert.equal(engine.canStartWithSlot(status, "standard"), false);
    assert.equal(engine.canStartWithSlot(status, "ironman"), true);
  }
  assert.equal(engine.canStartWithSlot("ready", "standard"), true);
  assert.equal(engine.canStartWithSlot("empty", "daily"), true);
  assert.equal(engine.clearSaveSlot(2), true);
  assert.equal(engine.inspectSave(2).status, "empty");

  // The old single-save key replaces a damaged slot only after a verified copy.
  const legacyRaw = JSON.stringify({ ...clone(readyBase), schemaVersion: undefined });
  storage.set(constants.SAVE_KEY, legacyRaw);
  storage.set(saveKey, "{");
  engine.migrateLegacySave();
  assert.equal(storage.get(saveKey), legacyRaw);
  assert.equal(storage.has(constants.SAVE_KEY), false);

  storage.set(constants.SAVE_KEY, legacyRaw);
  storage.set(saveKey, "{");
  storageWriteError = Object.assign(new Error("quota"), { name: "QuotaExceededError" });
  engine.migrateLegacySave();
  storageWriteError = null;
  assert.equal(storage.get(saveKey), "{");
  assert.equal(storage.get(constants.SAVE_KEY), legacyRaw);
  storage.delete(constants.SAVE_KEY);
  storage.set(saveKey, JSON.stringify(readyBase));

  // Storage failures keep the last good raw save and surface a recoverable warning.
  fresh();
  const beforeFailedWrite = storage.get(saveKey);
  state.S.money += 123;
  storageWriteError = Object.assign(new Error("quota"), { name: "QuotaExceededError" });
  assert.equal(engine.saveGame(), false);
  assert.equal(storage.get(saveKey), beforeFailedWrite);
  assert.equal(state.S.saveError.kind, "quota");
  storageWriteError = null;
  assert.equal(engine.saveGame(), true);
  assert.equal(state.S.saveError, null);
  assert.notEqual(storage.get(saveKey), beforeFailedWrite);

  storageReadError = Object.assign(new Error("blocked"), { name: "SecurityError" });
  assert.equal(engine.inspectSave(1).status, "unavailable");
  storageReadError = null;

  const beforeCycle = storage.get(saveKey);
  state.S.decor = {};
  state.S.decor.self = state.S.decor;
  assert.equal(engine.saveGame(), false);
  assert.equal(state.S.saveError.kind, "serialize");
  assert.equal(storage.get(saveKey), beforeCycle);
  state.S.decor = {};
  assert.equal(engine.saveGame(), true);

  const reloadsBeforeRemoveFailure = reloadCount;
  storageRemoveError = Object.assign(new Error("blocked"), { name: "SecurityError" });
  engine.restartRun();
  assert.equal(reloadCount, reloadsBeforeRemoveFailure);
  assert.equal(state.S.saveError.kind, "blocked");
  storageRemoveError = null;
  engine.dismissSaveError();

  // A terminal screen never reloads into an uncleared, still-resumable run.
  fresh();
  const preLossRaw = storage.get(saveKey);
  const reloadsBeforeLoss = reloadCount;
  storageRemoveError = Object.assign(new Error("blocked"), { name: "SecurityError" });
  engine.apply({ rep: -100 });
  assert.equal(state.S.over, true);
  assert.equal(state.S.summary.action, "reload");
  assert.equal(storage.get(saveKey), preLossRaw);
  engine.dismissSummary();
  assert.equal(reloadCount, reloadsBeforeLoss);
  assert.equal(state.S.summary.action, "reload", "failed retry must keep the terminal screen open");
  storageRemoveError = null;
  engine.dismissSummary();
  assert.equal(reloadCount, reloadsBeforeLoss + 1);
  assert.equal(storage.has(saveKey), false);

  fresh();
  Object.assign(state.S, { rank: 3, inf: 95 });
  const winOption = { text: "Close the final file", base: 100, safe: true, ok: { fx: {}, txt: "won" } };
  state.S.event = { id: "test_win", title: "FINAL", body: "test", opts: [winOption] };
  const preWinRaw = storage.get(saveKey);
  const reloadsBeforeWin = reloadCount;
  storageRemoveError = Object.assign(new Error("blocked"), { name: "SecurityError" });
  engine.resolveCrisis(winOption);
  assert.equal(state.S.over, true);
  assert.equal(state.S.summary.action, "reload");
  assert.equal(storage.get(saveKey), preWinRaw);
  engine.dismissSummary();
  assert.equal(reloadCount, reloadsBeforeWin);
  assert.equal(state.S.summary.action, "reload");
  storageRemoveError = null;
  engine.dismissSummary();
  assert.equal(reloadCount, reloadsBeforeWin + 1);
  assert.equal(storage.has(saveKey), false);

  assert.equal(engine.setSlot(99), true);
  assert.equal(engine.getSlot(), 3);
  assert.equal(engine.setSlot(0), true);
  assert.equal(engine.getSlot(), 1);

  // End-of-day mutations survive a reload during the walk animation and advance once.
  fresh();
  Object.assign(state.S, { day: 2, rep: 60, hours: 8, fatigue: 0, objective: null, debtDue: null });
  const doomed = engine.instantiateCase(template());
  doomed.dueDay = state.S.day;
  state.S.inbox = [doomed];
  engine.saveGame();
  timeoutQueue = [];
  engine.endDay();
  const repAfterNight = state.S.rep;
  const missesAfterNight = state.S.runStats.miss;
  const checkpoint = JSON.parse(storage.get(saveKey));
  assert.equal(checkpoint.pendingSummary.action, "nextDay");
  assert.equal(checkpoint.day, 2);
  assert.equal(checkpoint.rep, repAfterNight);
  assert.equal(engine.loadGame(1), true);
  assert.equal(state.S.summary.action, "nextDay");
  assert.equal(state.S.pendingSummary, null);
  assert.equal(state.S.rep, repAfterNight);
  assert.equal(state.S.runStats.miss, missesAfterNight);
  engine.dismissSummary();
  assert.equal(state.S.day, 3);
  while (timeoutQueue.length) timeoutQueue.shift()();
  timeoutQueue = null;
  assert.equal(state.S.day, 3, "stale animation callbacks must not advance twice");

  // Client War cleanup is idempotent and removes every carrier for the lost client only.
  fresh();
  const war1 = engine.buildBigMatter("Abibas");
  const war2 = war1.opts.find(option => option.ok.next).ok.next.case;
  const otherWar = engine.buildBigMatter("Guccy");
  Object.assign(state.S, {
    day: 7,
    clients: [{ name: "Abibas", fee: 200 }, { name: "Guccy", fee: 250 }],
    bigCase: { client: "Abibas", stage: 2 },
    inbox: [war2, otherWar],
    followups: [{ day: 9, case: war2 }, { day: 9, case: otherWar }],
    openCase: war2,
    pendingChoice: { c: war2, o: war2.opts[0] },
    event: { id: "latework" },
  });
  assert.equal(engine.endClientWar("Abibas"), true);
  assert.equal(state.S.bigCase, null);
  assert.equal(state.S.inbox.some(c => c.big?.client === "Abibas"), false);
  assert.equal(state.S.followups.some(f => f.case.big?.client === "Abibas"), false);
  assert.equal(state.S.openCase, null);
  assert.equal(state.S.pendingChoice, null);
  assert.equal(state.S.event, null);
  assert.equal(state.S.inbox.some(c => c.big?.client === "Guccy"), true);
  assert.equal(state.S.followups.some(f => f.case.big?.client === "Guccy"), true);
  assert.equal(engine.endClientWar("Abibas"), false);

  // Losing a client through a crisis also cancels a queued stage.
  fresh();
  state.S.clients = [{ name: "Abibas", fee: 200 }];
  state.S.bigCase = { client: "Abibas", stage: 2 };
  state.S.followups = [{ day: state.S.day + 4, case: war2 }];
  const lossOption = { text: "Lose client", base: 100, safe: true,
    ok: { fx: {}, client: { lose: "Abibas" }, txt: "gone" } };
  state.S.event = { id: "test_loss", title: "CLIENT LOSS", body: "test", opts: [lossOption] };
  engine.resolveCrisis(lossOption);
  assert.equal(state.S.clients.length, 0);
  assert.equal(state.S.bigCase, null);
  assert.equal(state.S.followups.some(f => f.case.big?.client === "Abibas"), false);

  // Load reconciliation removes orphan A while preserving the valid active B carrier.
  fresh();
  const bStage1 = engine.instantiateCase(engine.buildBigMatter("Guccy"));
  Object.assign(state.S, {
    clients: [{ name: "Guccy", fee: 250 }],
    bigCase: { client: "Guccy", stage: 1 },
    inbox: [bStage1],
    followups: [{ day: state.S.day + 2, case: war2 }],
  });
  engine.saveGame();
  assert.equal(engine.loadGame(1), true);
  assert.deepEqual(state.S.bigCase, { client: "Guccy", stage: 1 });
  assert.equal(state.S.inbox.filter(c => c.big?.client === "Guccy").length, 1);
  assert.equal(state.S.followups.some(f => f.case.big?.client === "Abibas"), false);

  // Delayed outcomes are forbidden until their resolver gains Client War bookkeeping.
  const visitWar = c => {
    for (const option of c.opts) {
      assert.equal(option.delay, undefined, `${c.title} must resolve instantly`);
      if (option.ok.next) visitWar(option.ok.next.case);
      if (option.fail?.next) visitWar(option.fail.next.case);
    }
  };
  visitWar(engine.buildBigMatter("Abibas"));

  // v1.9.7: STANDARD FIRM confidence has exact, stable boundaries and no RNG.
  assert.equal(engine.firmCondition(24).id, "critical");
  assert.equal(engine.firmCondition(25).id, "strained");
  assert.equal(engine.firmCondition(49).id, "strained");
  assert.equal(engine.firmCondition(50).id, "stable");
  assert.equal(engine.firmCondition(74).id, "stable");
  assert.equal(engine.firmCondition(75).id, "thriving");
  const approx = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-10, `${actual} != ${expected}`);
  let odds = engine.clientConfidenceOdds(70, "standard", 24);
  approx(odds.impress, .06); approx(odds.acquisition, .026); approx(odds.walk, .22);
  odds = engine.clientConfidenceOdds(70, "standard", 25);
  approx(odds.impress, .08); approx(odds.acquisition, .046); approx(odds.walk, .17);
  odds = engine.clientConfidenceOdds(70, "standard", 50);
  approx(odds.impress, .10); approx(odds.acquisition, .066); approx(odds.walk, .12);
  odds = engine.clientConfidenceOdds(70, "standard", 75);
  approx(odds.impress, .12); approx(odds.acquisition, .086); approx(odds.walk, .08);
  assert.deepEqual(engine.clientConfidenceOdds(70, "daily", 24), engine.clientConfidenceOdds(70, "daily", 75));
  odds = engine.clientConfidenceOdds(100, "standard", 24);
  approx(odds.impress, .10); approx(odds.acquisition, .08);
  odds = engine.clientConfidenceOdds(100, "standard", 25);
  approx(odds.impress, .12); approx(odds.acquisition, .10);
  odds = engine.clientConfidenceOdds(100, "standard", 50);
  approx(odds.impress, .14); approx(odds.acquisition, .12);
  odds = engine.clientConfidenceOdds(100, "standard", 75);
  approx(odds.impress, .16); approx(odds.acquisition, .14);
  for (const mode of ["daily", "ironman", "endless"]) {
    odds = engine.clientConfidenceOdds(100, mode, 24);
    approx(odds.impress, .14); approx(odds.acquisition, .12); approx(odds.walk, .12);
  }
  assert.equal(engine.promotionFirmRequirement(1, "standard"), 40);
  assert.equal(engine.promotionFirmRequirement(2, "standard"), 45);
  assert.equal(engine.promotionFirmRequirement(3, "standard"), 50);
  assert.equal(engine.promotionFirmRequirement(3, "ironman"), 0);

  // Partner-track promotions stop at the FIRM gate; other modes retain their old curve.
  const promotionOption = { text: "Review promotion", base: 100, safe: true, ok: { fx: {}, txt: "reviewed" } };
  const drivePromotion = () => {
    state.S.event = { id: "test_promotion", title: "PROMOTION", body: "test", opts: [promotionOption] };
    engine.resolveCrisis(promotionOption);
  };
  fresh();
  Object.assign(state.S, { rank: 1, inf: 60, firm: 39 });
  drivePromotion();
  assert.equal(state.S.rank, 1);
  assert.equal(state.S.firmGateHintRank, 1);
  state.S.firm = 40;
  drivePromotion();
  assert.equal(state.S.rank, 2);
  assert.equal(state.S.firmGateHintRank, null);

  fresh();
  Object.assign(state.S, { rank: 2, inf: 85, firm: 44, money: 6000, buyinPaid: false });
  engine.payBuyIn();
  assert.deepEqual([state.S.rank, state.S.buyinPaid, state.S.money], [2, false, 6000]);
  state.S.firm = 45;
  engine.payBuyIn();
  assert.deepEqual([state.S.rank, state.S.buyinPaid, state.S.money], [3, true, 1000]);

  fresh("ironman");
  Object.assign(state.S, { rank: 1, inf: 60, firm: 0 });
  drivePromotion();
  assert.equal(state.S.rank, 2, "non-STANDARD modes must keep their established promotion curve");

  fresh();
  Object.assign(state.S, { rank: 3, inf: 95, firm: 49 });
  drivePromotion();
  assert.deepEqual([state.S.rank, state.S.over, state.S.firmGateHintRank], [3, false, 3]);
  state.S.firm = 50;
  drivePromotion();
  assert.equal(state.S.over, true);
  assert.match(state.S.summary.title, /YOU MADE NAME PARTNER/);

  // Turnaround is deterministic, costly, cooldown-safe, persisted and can clear a promotion gate.
  fresh();
  Object.assign(state.S, { day: 3, rank: 1, inf: 60, firm: 35, hours: 8, fatigue: 0, firmPlanDay: 0, event: null, summary: null });
  engine.pitchTurnaround();
  assert.deepEqual([state.S.firm, state.S.hours, state.S.fatigue, state.S.firmPlanDay, state.S.rank], [45, 6.5, 6, 8, 2]);
  const afterPlan = [state.S.firm, state.S.hours, state.S.fatigue, state.S.firmPlanDay];
  engine.pitchTurnaround();
  assert.deepEqual([state.S.firm, state.S.hours, state.S.fatigue, state.S.firmPlanDay], afterPlan);
  engine.saveGame();
  engine.loadGame(1);
  assert.equal(state.S.firmPlanDay, 8);
  Object.assign(state.S, { day: 8, firm: 35, hours: 1, event: null, summary: null });
  engine.pitchTurnaround();
  assert.deepEqual([state.S.firm, state.S.hours], [35, 1]);
  fresh("daily");
  Object.assign(state.S, { firm: 20, hours: 8, fatigue: 0 });
  engine.pitchTurnaround();
  assert.deepEqual([state.S.firm, state.S.hours, state.S.fatigue], [20, 8, 0]);

  // The full 90-minute plan lands before the exhaustion incident, like a resolved
  // case: its FIRM gain/cooldown persist, then the day ends exactly once with no
  // stale overtime prompt and no promotion-animation bypass.
  const certainTurnaroundIncident = ({ rank, inf }) => {
    fresh();
    Object.assign(state.S, {
      day: 3, rank, inf, firm: 35, hours: 1.5, fatigue: 94, firmPlanDay: 0,
      inbox: [], objective: null, debtDue: null, event: null, summary: null,
    });
    timeoutQueue = [];
    engine.pitchTurnaround();
    assert.equal(state.S.pendingSummary?.action, "nextDay");
    assert.equal(state.S.event, null, "sent-home flow must not leave a stale overtime event");
    assert.equal(state.S.leaving, true);
    assert.equal(state.S.rank, rank, "an exhaustion incident must not be bypassed by promotion animation");
    assert.deepEqual([state.S.firm, state.S.firmPlanDay], [45, 8]);
    while (timeoutQueue.length) timeoutQueue.shift()();
    timeoutQueue = null;
    assert.equal(state.S.summary?.action, "nextDay");
    assert.equal(state.S.event, null);
  };
  certainTurnaroundIncident({ rank: 0, inf: 0 });
  certainTurnaroundIncident({ rank: 1, inf: 60 });

  // A confirmed late filing can overshoot the remaining clock. If exhaustion
  // sends the player home before checkClock(), the persisted checkpoint still
  // clamps to 0h instead of storing an unloadable negative clock.
  fresh();
  Object.assign(state.S, {
    hours: 1, fatigue: 94, rep: 80, inbox: [], objective: null,
    debtDue: null, event: null, summary: null,
  });
  const lateExhaustion = engine.instantiateCase(template());
  const lateSafe = lateExhaustion.opts.find(option => option.safe);
  state.S.inbox = [lateExhaustion];
  timeoutQueue = [];
  engine.choose(lateExhaustion, lateSafe);
  assert.equal(state.S.event?.id, "latework");
  assert.equal(state.S.pendingChoice?.c, lateExhaustion);
  engine.resolveCrisis(state.S.event.opts.find(option => option.lateGo));
  assert.equal(state.S.hours, 0);
  assert.equal(state.S.pendingChoice, null);
  assert.equal(state.S.pendingSummary?.action, "nextDay");
  assert.equal(engine.inspectSave(1).status, "ready");
  while (timeoutQueue.length) timeoutQueue.shift()();
  timeoutQueue = null;

  fresh();
  Object.assign(state.S, { hours: 1, fatigue: 99, money: 0, inbox: [], objective: null, debtDue: null });
  const exhaustingChore = {
    text: "Finish the impossible chore", base: 100, safe: true, hours: 1, fatigue: 1,
    ok: { fx: { money: 999 }, txt: "The reward should never land." },
  };
  state.S.event = { id: "test_exhaustion", title: "CHORE", body: "test", opts: [exhaustingChore] };
  timeoutQueue = [];
  engine.resolveCrisis(exhaustingChore);
  assert.equal(state.S.money, 0, "crisis outcome must stop when exhaustion sends the player home");
  assert.equal(state.S.event, null);
  assert.equal(state.S.pendingSummary?.action, "nextDay");
  while (timeoutQueue.length) timeoutQueue.shift()();
  timeoutQueue = null;

  // Delegated real matters now move FIRM exactly like instant and delayed matters.
  const delegatedFirmResult = (win, silent = false) => {
    fresh();
    Object.assign(state.S, { firm: 60, inbox: [], objective: null, debtDue: null, event: null, hours: 8 });
    const delegatedCase = engine.instantiateCase(template());
    delegatedCase.delegated = { npc: state.S.npcs[0].id, day: 2, win, silent };
    state.S.inbox = [delegatedCase];
    engine.endDay();
    engine.dismissSummary();
    return state.S.firm;
  };
  assert.equal(delegatedFirmResult(true), 61);
  assert.equal(delegatedFirmResult(false), 59);
  assert.equal(delegatedFirmResult(false, true), 60);

  // Delegated outcomes close a file on the morning they are revealed. A real
  // win/fail advances the daily close objective exactly once; a Lazy silent
  // return remains unresolved when its original deadline is still alive.
  const delegatedResolvedCount = (win, silent = false, dueDay = 3) => {
    fresh();
    Object.assign(state.S, { inbox: [], objective: null, debtDue: null, event: null, hours: 8, nemesis: null });
    const delegatedCase = engine.instantiateCase(template());
    delegatedCase.dueDay = dueDay;
    delegatedCase.delegated = { npc: state.S.npcs[0].id, day: 2, win, silent };
    state.S.inbox = [delegatedCase];
    engine.endDay();
    engine.dismissSummary();
    return {
      resolved: state.S.today.resolved,
      returned: state.S.inbox.includes(delegatedCase),
      inbox: state.S.inbox,
      archive: state.S.archive,
    };
  };
  assert.equal(delegatedResolvedCount(true).resolved, 1);
  assert.equal(delegatedResolvedCount(false).resolved, 1);
  const returnedDelegation = delegatedResolvedCount(false, true);
  assert.equal(returnedDelegation.resolved, 0);
  assert.equal(returnedDelegation.returned, true, JSON.stringify(returnedDelegation.inbox.map(c => ({ title: c.title, due: c.dueDay, delegated: c.delegated }))));

  fresh();
  Object.assign(state.S, { rank: 1, inbox: [], hours: 8 });
  const staleDelegateTarget = engine.instantiateCase(template());
  state.S.inbox = [staleDelegateTarget];
  const beforeStaleDelegate = JSON.stringify({
    hours: state.S.hours, delegated: staleDelegateTarget.delegated,
    today: state.S.today, logs: state.S.logEntries,
  });
  engine.delegateCase(staleDelegateTarget, "already-fired");
  assert.equal(JSON.stringify({
    hours: state.S.hours, delegated: staleDelegateTarget.delegated,
    today: state.S.today, logs: state.S.logEntries,
  }), beforeStaleDelegate, "a stale colleague id must be a strict no-op");

  // Handing a file away on its due date cannot manufacture a free extra day:
  // a Lazy silent failure burns it during the next-morning reveal.
  fresh();
  Object.assign(state.S, { inbox: [], objective: null, debtDue: null, event: null, hours: 8, rep: 60 });
  const deadlineDelegation = engine.instantiateCase(template());
  deadlineDelegation.dueDay = state.S.day;
  deadlineDelegation.delegated = { npc: state.S.npcs[0].id, day: 2, win: false, silent: true };
  state.S.inbox = [deadlineDelegation];
  engine.endDay();
  engine.dismissSummary();
  assert.equal(state.S.inbox.includes(deadlineDelegation), false);
  assert.equal(state.S.runStats.miss, 1);
  assert.equal(state.S.weekMissed, 1);
  assert.equal(state.S.archive[0].via, "deadline missed");

  // Older repaired saves may still point at a colleague who no longer exists.
  // That fallback follows the same deadline rule instead of reviving the file.
  fresh();
  Object.assign(state.S, { inbox: [], objective: null, debtDue: null, event: null, hours: 8, rep: 60 });
  const orphanedDelegation = engine.instantiateCase(template());
  orphanedDelegation.dueDay = state.S.day;
  orphanedDelegation.delegated = { npc: "already-fired", day: 2, win: false, silent: true };
  state.S.inbox = [orphanedDelegation];
  engine.endDay();
  engine.dismissSummary();
  assert.equal(state.S.inbox.includes(orphanedDelegation), false);
  assert.equal(state.S.runStats.miss, 1);
  assert.equal(state.S.archive[0].via, "deadline missed");

  // Two morning replies may jointly cross the ENDLESS finish line. Both must
  // resolve before the one promotion check, while payroll/crises stay paused
  // behind the Name Partner modal.
  fresh("endless");
  Object.assign(state.S, {
    day: 5, rank: 3, inf: 88, firm: 50, inbox: [], objective: null, debtDue: null,
    event: null, hours: 8, clients: [], weekStart: { inf: 88, rep: state.S.rep }, weekMissed: 0,
  });
  const morningReply = engine.instantiateCase(template());
  const morningOption = {
    text: "Morning reply", base: 100, safe: true,
    ok: { fx: { inf: 6 }, txt: "landed" }, fail: { fx: {}, txt: "failed" },
  };
  morningReply.pending = { day: 6, win: true, o: morningOption, judgeMemorySnapshot: "" };
  const morningDelegation = engine.instantiateCase(template());
  morningDelegation.delegated = { npc: state.S.npcs[0].id, day: 6, win: true, silent: false };
  state.S.inbox = [morningReply, morningDelegation];
  engine.endDay();
  engine.dismissSummary();
  assert.equal(state.S.rank, 4);
  assert.equal(state.S.endlessWon, true);
  assert.match(state.S.summary.title, /YOU MADE NAME PARTNER/);
  assert.equal(state.S.day, 6);
  assert.equal(state.S.archive.filter(a => a.via === "delayed reply" || a.via === "delegated").length, 2);
  assert.ok(Array.isArray(state.S.roster), "the Name Partner roster must exist before the modal opens");
  assert.equal(state.S.event, null);

  // A partnership already below the collapse floor cannot be recorded as an
  // ENDLESS win one instruction before it fails.
  const statsBeforeCollapsedPromotion = engine.getStats() || { runs: 0, wins: 0, causes: {} };
  fresh("endless");
  Object.assign(state.S, {
    rank: 3, inf: 97, firm: constants.FIRM_COLLAPSE - 1, inbox: [],
    objective: null, debtDue: null, event: null, hours: 8,
  });
  engine.endDay();
  engine.dismissSummary();
  const statsAfterCollapsedPromotion = engine.getStats();
  assert.equal(state.S.over, true);
  assert.equal(state.S.endlessWon, false);
  assert.match(state.S.summary.title, /FIRM COLLAPSE/);
  assert.equal(statsAfterCollapsedPromotion.wins, statsBeforeCollapsedPromotion.wins);
  assert.equal(statsAfterCollapsedPromotion.runs, statsBeforeCollapsedPromotion.runs + 1);

  // ENDLESS records the win once, then keeps extending longest-career stats
  // when the eventual collapse happens days later.
  fresh("endless");
  Object.assign(state.S, { rank: 3, inf: 95, firm: 50, day: 7 });
  drivePromotion();
  const statsAtEndlessWin = engine.getStats();
  assert.equal(state.S.endlessWon, true);
  state.S.summary = null;
  const finalEndlessDay = statsAtEndlessWin.bestDay + 7;
  state.S.day = finalEndlessDay;
  const causesAtEndlessWin = clone(statsAtEndlessWin.causes);
  engine.apply({ firm: -100 });
  const statsAtEndlessFall = engine.getStats();
  assert.equal(state.S.over, true);
  assert.equal(statsAtEndlessFall.runs, statsAtEndlessWin.runs);
  assert.equal(statsAtEndlessFall.wins, statsAtEndlessWin.wins);
  assert.equal(statsAtEndlessFall.bestDay, finalEndlessDay);
  assert.deepEqual(statsAtEndlessFall.causes, causesAtEndlessWin);

  // A morning resolver that ends an ENDLESS run must short-circuit the rest of
  // advanceDay: no fresh files, favors, events or later resolver side effects.
  fresh("endless");
  Object.assign(state.S, {
    rank: 4, endlessWon: true, firm: 15, inbox: [], objective: null,
    debtDue: null, event: null, hours: 8,
  });
  const collapseCase = engine.instantiateCase(template());
  collapseCase.delegated = { npc: state.S.npcs[0].id, day: 2, win: false, silent: false };
  state.S.inbox = [collapseCase];
  engine.endDay();
  engine.dismissSummary();
  assert.equal(state.S.over, true);
  assert.match(state.S.summary.title, /FIRM COLLAPSE/);
  assert.equal(state.S.inbox.length, 1, "only the delegated-result message may survive terminal resolution");
  assert.equal(state.S.inbox[0].msg, true);
  assert.equal(state.S.event, null);

  // v1.9.12: Name Partner payroll is headcount-scaled and failed employee
  // work costs twice what a routine win restores. The public helpers power
  // the FIRM overlay, so UI copy and engine arithmetic cannot silently drift.
  assert.deepEqual([engine.firmPayrollCost(0),engine.firmPayrollCost(1),engine.firmPayrollCost(10),engine.firmPayrollCost(11)], [0,1,1,2]);
  assert.deepEqual([engine.rosterWinChance(-3),engine.rosterWinChance(0),engine.rosterWinChance(4)], [26,50,82]);
  fresh("endless");
  Object.assign(state.S, {
    day: 5, rank: 4, inf: 50, endlessWon: true, firm: 90, inbox: [], objective: null,
    debtDue: null, event: null, hours: 8, clients: [{ name: "Abibas", fee: 100 }],
    weekStart: { inf: 45, rep: state.S.rep }, weekMissed: 0,
    roster: Array.from({ length: 100 }, (_, i) => ({
      id: "audit-" + i, name: "Audit " + i, impact: -100, won: 0, lost: 0,
      senior: false, src: "generated",
    })),
  });
  const firmProbe=[];
  engine.setBalanceProbe(event=>firmProbe.push(event));
  utils.setSeed(197);
  engine.endDay();
  engine.dismissSummary();
  engine.setBalanceProbe(null);
  const rosterProbe=firmProbe.find(event=>event.kind==="roster");
  const payrollProbe=firmProbe.find(event=>event.kind==="firm"&&event.source==="payroll");
  assert.ok(rosterProbe.losses>0);
  assert.equal(rosterProbe.rawDrift,-2*rosterProbe.losses);
  assert.equal(rosterProbe.overhead,10);
  assert.deepEqual([payrollProbe.requested,payrollProbe.amount],[-10,-10]);

  // Payroll is the natural ENDLESS collapse path. Once roster drift ends the
  // run on Saturday morning, advanceDay must not install the weekend card,
  // sit the character down or generate any later event.
  fresh("endless");
  Object.assign(state.S, {
    day: 5, rank: 4, inf: 50, endlessWon: true, firm: 15, inbox: [], objective: null,
    debtDue: null, event: null, hours: 8, clients: [{ name: "Abibas", fee: 100 }],
    weekStart: { inf: 45, rep: state.S.rep }, weekMissed: 0,
    roster: Array.from({ length: 100 }, (_, i) => ({
      id: "collapse-" + i, name: "Loss " + i, impact: -100, won: 0, lost: 0,
      senior: false, src: "generated",
    })),
  });
  utils.setSeed(197);
  engine.endDay();
  engine.dismissSummary();
  assert.equal(state.S.over, true);
  assert.match(state.S.summary.title, /FIRM COLLAPSE/);
  assert.equal(state.S.charAnim, "leaving", "terminal payroll drift must stop before sitDown");
  assert.equal(state.S.event, null);

  // v1.9.10: promotions are decisions of the completed Friday review, never an
  // instant reward cascade. The consumed review and readiness hint survive a
  // reload; a single review grants at most one rung. Delegation is one filing/day.
  engine.setBalanceExperiment(null);
  fresh();
  Object.assign(state.S, { day: 2, rank: 0, inf: 35, firm: 62, event: null, summary: null });
  drivePromotion();
  assert.deepEqual([state.S.rank, state.S.promotionReviewDay, state.S.promotionHintRank], [0, 0, 0]);
  engine.saveGame();
  engine.loadGame(1);
  assert.deepEqual([state.S.rank, state.S.promotionReviewDay, state.S.promotionHintRank], [0, 0, 0]);
  Object.assign(state.S, { day: 6, event: null, summary: null });
  drivePromotion();
  assert.deepEqual([state.S.rank, state.S.promotionReviewDay, state.S.promotionHintRank], [1, 6, null]);
  Object.assign(state.S, { inf: 100, firm: 100, event: null, summary: null });
  drivePromotion();
  assert.equal(state.S.rank, 1, "one completed review cannot award two ranks");
  engine.saveGame();
  engine.loadGame(1);
  drivePromotion();
  assert.equal(state.S.rank, 1, "reloading cannot replay a consumed promotion review");
  Object.assign(state.S, { day: 11, event: null, summary: null });
  drivePromotion();
  assert.deepEqual([state.S.rank, state.S.promotionReviewDay], [2, 11]);

  fresh();
  Object.assign(state.S, { rank: 1, hours: 8, event: null, summary: null });
  const delegateA = engine.instantiateCase(template());
  const delegateB = engine.instantiateCase(template());
  engine.delegateCase(delegateA, state.S.npcs[0].id);
  const afterFirstHandoff = state.S.hours;
  engine.delegateCase(delegateB, state.S.npcs[0].id);
  assert.equal(constants.DELEGATE_CAP, 1);
  assert.equal(state.S.today.delegated, 1);
  assert.equal(state.S.hours, afterFirstHandoff);
  assert.equal(delegateB.delegated, undefined);
  engine.setBalanceExperiment({ weeklyPromotion: false, delegateCap: 2 });

  // All scenarios produce defined terminal prose; Defector/Boomerang close both arcs.
  const endingMarkers = {
    fraud: /law school/,
    debtor: /loans are PAID/,
    legacy: /parent signs/,
    defector: /Snidely Fitch/,
    boomerang: /deactivated/,
  };
  const endingOption = { text: "Close the final file", base: 100, safe: true, ok: { fx: { inf: 1 }, txt: "won" } };
  for (const [scenario, marker] of Object.entries(endingMarkers)) {
    engine.startGame(scenario, "easy", "standard");
    Object.assign(state.S, { rank: 3, inf: 94, firm: 50 });
    state.S.event = { id: "test_ending", title: "FINAL", body: "test", opts: [endingOption] };
    engine.resolveCrisis(endingOption);
    assert.equal(state.S.over, true, `${scenario} should reach a terminal win`);
    assert.ok(state.S.summary.lines.every(line => typeof line === "string"), `${scenario} ending has an undefined row`);
    assert.match(state.S.summary.lines.join(" "), marker);
  }
  assert.equal(JSON.parse(storage.get("fo_ach_v1")).win_boomerang, true);

  for (const [scenario, marker] of [["defector", /old office open/], ["boomerang", /Marv keeps the mug/]]) {
    engine.startGame(scenario, "easy", "standard");
    state.S.rep = 20;
    engine.apply({ rep: -1 });
    assert.match(state.S.summary.title, /GAME OVER: FIRED/);
    assert.match(state.S.summary.lines.join(" "), marker);
    assert.ok(state.S.summary.lines.every(line => typeof line === "string"));
  }

  // Production CSP has no loopback WebSocket escape hatch; Vite adds it only in dev.
  const indexHtml = readFileSync("index.html", "utf8");
  const viteConfig = readFileSync("vite.config.mjs", "utf8");
  assert.match(indexHtml, /connect-src 'self';/);
  assert.doesNotMatch(indexHtml, /ws:\/\/(?:localhost|127\.0\.0\.1|\[::1\])/);
  assert.match(viteConfig, /ws:\/\/localhost:\*/);
  assert.match(viteConfig, /script-src 'self' 'unsafe-inline'/);

  // Smoke every supported scenario/mode combination.
  engine.setBalanceExperiment(null);
  const scenarios = ["fraud", "debtor", "legacy", "defector", "boomerang"];
  const modes = ["standard", "ironman", "endless", "daily"];
  for (const scenario of scenarios) {
    for (const mode of modes) {
      engine.startGame(mode === "daily" ? null : scenario, "medium", mode);
      const cases = state.S.inbox.filter(c => !c.msg);
      assert.ok(cases.length >= 3, `${scenario}/${mode} inbox`);
      assert.ok(cases.every(c => Array.isArray(c.opts) && c.opts.length >= 3), `${scenario}/${mode} options`);
    }
  }

  console.log("v1.9.5–v1.9.13 checks passed: balance experiments, Friday promotions, delegation cap, strict saves, procedural IDs, long-run integrity, FIRM payroll, rolling judge memory/DAILY, endings, Client War integrity, CSP, 20 starts");
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
