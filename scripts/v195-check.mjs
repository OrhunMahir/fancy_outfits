import assert from "node:assert/strict";

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
globalThis.setTimeout = fn => { fn(); return 1; };
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

  console.log("v1.9.5 checks passed: shuffle, Daily cursor, style rewards, coffee/overtime caps, migration, 20 starts");
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
