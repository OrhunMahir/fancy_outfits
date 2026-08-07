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
  const { settings } = await import("../src/game/settings.js");
  settings.sfx = 0;
  settings.bgm = 0;

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
    event: { id: "overtime" },
    summary: null,
    leaving: false,
  });
  engine.resolveCrisis({ ot: true });
  assert.deepEqual([state.S.hours, state.S.otHours, state.S.otToday, state.S.fatigue], [2, 2, 1, 12]);
  Object.assign(state.S, { hours: 0, event: { id: "overtime" } });
  engine.resolveCrisis({ ot: true });
  assert.deepEqual([state.S.hours, state.S.otHours, state.S.otToday, state.S.fatigue], [2, 4, 2, 30]);
  Object.assign(state.S, { hours: 0, event: { id: "overtime" } });
  engine.resolveCrisis({ ot: true });
  assert.deepEqual([state.S.hours, state.S.otHours, state.S.otToday, state.S.fatigue], [0, 4, 2, 30]);
  assert.equal(state.S.event.id, "overtime");
  assert.equal(state.S.event.opts.some(option => option.ot), false);

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
  assert.equal(migratedInfo.save.logEntries.length, constants.SAVE_LOG_LIMIT);
  assert.equal(migratedInfo.save.archive.length, constants.SAVE_ARCHIVE_LIMIT);
  assert.equal(engine.loadGame(1), true);
  assert.equal(JSON.parse(storage.get(saveKey)).schemaVersion, constants.SAVE_SCHEMA_VERSION);

  // Corrupt, malformed and future-version slots are diagnosed without deletion.
  const readyBase = JSON.parse(storage.get(saveKey));
  const clone = value => JSON.parse(JSON.stringify(value));
  const delayedWar = clone(engine.buildBigMatter("Abibas"));
  delayedWar.opts[0].delay = 1;
  const pendingWar = clone(engine.buildBigMatter("Abibas"));
  pendingWar.pending = { day: pendingWar.deadline, win: true, o: { ...clone(pendingWar.opts[0]), delay: 1 } };
  const delegatedWar = clone(engine.buildBigMatter("Abibas"));
  delegatedWar.delegated = { day: delegatedWar.deadline, npc: "dana", win: true };
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
    { raw: JSON.stringify({ ...clone(readyBase), money: {} }), status: "invalid" },
    { raw: JSON.stringify({ ...clone(readyBase), inbox: {} }), status: "invalid" },
    { raw: JSON.stringify({ ...clone(readyBase), inbox: [{ title: "BAD", body: "bad", opts: [null] }] }), status: "invalid" },
    { raw: JSON.stringify({ ...clone(readyBase), roster: [null] }), status: "invalid" },
    { raw: JSON.stringify({ ...clone(readyBase), bigCase: "damaged" }), status: "invalid" },
    { raw: JSON.stringify({ ...clone(readyBase), runStats: { ...clone(readyBase.runStats), safe: "many" } }), status: "invalid" },
    { raw: JSON.stringify({ ...clone(readyBase), runStats: { ...clone(readyBase.runStats), deleg: { dana: -1 } } }), status: "invalid" },
    { raw: JSON.stringify({ ...clone(readyBase), today: { ...clone(readyBase.today), wins: null } }), status: "invalid" },
    { raw: JSON.stringify({ ...clone(readyBase), inbox: [delayedWar] }), status: "invalid" },
    { raw: JSON.stringify({ ...clone(readyBase), inbox: [pendingWar] }), status: "invalid" },
    { raw: JSON.stringify({ ...clone(readyBase), inbox: [delegatedWar] }), status: "invalid" },
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
  const bStage1 = engine.buildBigMatter("Guccy");
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

  // Production CSP has no loopback WebSocket escape hatch; Vite adds it only in dev.
  const indexHtml = readFileSync("index.html", "utf8");
  const viteConfig = readFileSync("vite.config.mjs", "utf8");
  assert.match(indexHtml, /connect-src 'self';/);
  assert.doesNotMatch(indexHtml, /ws:\/\/(?:localhost|127\.0\.0\.1|\[::1\])/);
  assert.match(viteConfig, /ws:\/\/localhost:\*/);
  assert.match(viteConfig, /script-src 'self' 'unsafe-inline'/);

  // Smoke every supported scenario/mode combination.
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

  console.log("v1.9.5–v1.9.6 checks passed: balance, strict saves, terminal recovery, summary checkpoints, Client War integrity, CSP, 20 starts");
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
