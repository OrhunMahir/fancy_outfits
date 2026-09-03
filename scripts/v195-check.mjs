import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createFileStore } from "../electron/store.js";

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
  const minigames = await import("../src/game/minigames.js");
  const progression = await import("../src/game/progression.js");
  const fraud = await import("../src/game/fraud.js");
  const ethics = await import("../src/game/ethics.js");
  const trial = await import("../src/game/trial.js");
  const judges = await import("../src/game/judges.js");
  const state = await import("../src/game/state.js");
  const engine = await import("../src/game/engine.js");
  const constants = await import("../src/game/constants.js");
  const clients = await import("../src/game/clients.js");
  const npcs = await import("../src/game/npcs.js");
  const content = await import("../src/game/content.js");
  const casegen = await import("../src/game/casegen.js");
  const intro = await import("../src/game/intro.js");
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
  // Work fatigue runs through ENDURANCE, and a DAILY run takes its scenario from
  // today's date — so expected fatigue is derived, never written down.
  const toil = raw => progression.applyEnduranceToWorkFatigue(raw, state.S.progression, state.S.scenario);
  const liveRedvale = () => {
    const raw = content.buildPool().find(c => c.id === "redvale");
    const c = engine.instantiateCase(raw);
    const o = c.opts.find(option => option.action?.id === "redvale_archive_lock");
    Object.assign(state.S, { inbox: [c], openCase: c, event: null, summary: null, pendingSummary: null,
      hours: 2, fatigue: 0, clients: [], nemesis: null, objective: null });
    return { c, o };
  };
  const livePowerCut = () => {
    const raw = content.buildPool().find(c => c.id === "breach");
    const c = engine.instantiateCase(raw);
    const o = c.opts.find(option => option.action?.id === "breach_service_power");
    Object.assign(state.S, { inbox: [c], openCase: c, event: null, summary: null, pendingSummary: null,
      hours: 2, fatigue: 0, clients: [], nemesis: null, objective: null });
    return { c, o };
  };
  const oppositeFace = face => face === "heads" ? "tails" : "heads";
  /* The lock is a clock now: nothing happens until frames run. Sitting well
     past the give zone wears a pick out; sitting in it turns the cylinder. */
  const runLock = (limit = 200) => {
    let n = 0;
    while (state.S.actionChallenge?.phase === "lockpick" && n++ < limit) engine.advanceLockpickFrame(80);
  };
  const wearOutLock = () => {
    const ch = state.S.actionChallenge;
    engine.setLockTension(Math.min(100, ch.give + ch.tolerance + 20));
    runLock();
  };
  const openLock = () => { engine.setLockTension(state.S.actionChallenge.give); runLock(); };
  const exhaustLock = () => { // wear every pick out until the coin comes up
    for (let i = 0; i < 10 && state.S.actionChallenge?.phase === "lockpick"; i++) {
      wearOutLock();
    }
  };
  const directedPowerMs = ring => {
    const degrees = ring.direction === 1
      ? (ring.target - ring.angle + 360) % 360
      : (ring.angle - ring.target + 360) % 360;
    return degrees / ring.speed * 1000;
  };
  const alignPower = challenge => {
    let next = challenge;
    let remaining = directedPowerMs(next.rings[next.activeRing]);
    while (remaining > 0.0001) {
      const step = Math.min(minigames.POWER_FRAME_CAP_MS, remaining);
      next = minigames.advancePowerCut(next, step);
      remaining -= step;
    }
    return next;
  };
  const alignLivePower = () => {
    let remaining = directedPowerMs(state.S.actionChallenge.rings[state.S.actionChallenge.activeRing]);
    while (remaining > 0.0001) {
      const step = Math.min(minigames.POWER_FRAME_CAP_MS, remaining);
      engine.advancePowerCutFrame(step);
      remaining -= step;
    }
  };
  let validPowerActionRaw = null;

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

  // Interactive action puzzles derive from stable identities without touching
  // the shared DAILY cursor. Skill lives in the player's input, not a hidden die.
  utils.setSeed(0x12345678);
  const puzzleCursor = utils.getRngState();
  const puzzleArgs = { runSeed: 123, caseId: "covert1", actionId: "breakin", cost: 1.5, toil: 7, lateExtra: 0 };
  const LOCK_BREAK_TEST = ch => ch.breakAt;
  const puzzle1 = minigames.createLockpickChallenge(puzzleArgs);
  const puzzle2 = minigames.createLockpickChallenge(puzzleArgs);
  assert.deepEqual(puzzle1, puzzle2);
  assert.equal(puzzle1.coinFace, "heads");
  assert.equal(utils.getRngState(), puzzleCursor);
  // A beginner gets exactly one pick; SNEAKY is the only thing that buys more.
  assert.equal(puzzle1.maxAttempts, 1, "the first level picks a lock with one shot");
  assert.deepEqual([puzzle1.tension, puzzle1.wear, puzzle1.hold], [0, 0, 0]);

  // Holding in the give zone turns the cylinder; it is a clock, not a button.
  let held = minigames.pressLockTension(puzzle1, puzzle1.give);
  assert.equal(minigames.lockGives(held), true, "the cylinder really does turn here");
  assert.equal(minigames.lockFeel(held), "close", "and the hand feels it");
  let frames = 0;
  while (held.phase === "lockpick" && frames++ < 40) held = minigames.advanceLockpick(held, 80);
  assert.equal(held.phase, "lock_success", "holding the right spot opens it");
  /* Holding costs something now — searching is the expensive part, not the
     turn. Derived from the pick's own budget rather than a literal, so a wear
     retune can tighten the lock without silently making the turn unsurvivable:
     landing straight on the give point must always leave pick to spare. */
  assert.ok(held.wear < minigames.LOCK_WEAR_MAX * 0.6,
    "the turn itself does not use up the pick: " + Math.round(held.wear));
  /* v23: the run's difficulty setting now sizes the boards you play with your
     hands. It still never touches the dice — chance() is untouched — and
     OBJECTION is deliberately exempt, since its window is already the tightest
     thing in the game. hard and realistic are one tier by design. */
  assert.equal(minigames.boardTierOf("easy"), 0);
  assert.equal(minigames.boardTierOf("medium"), 1);
  assert.equal(minigames.boardTierOf("hard"), 2);
  assert.equal(minigames.boardTierOf("realistic"), 2,
    "realistic plays the same boards as hard");
  const byTier = d => minigames.createLockpickChallenge({ ...puzzleArgs, diff: d });
  assert.ok(byTier(0).tolerance > byTier(1).tolerance && byTier(1).tolerance > byTier(2).tolerance,
    "the zone you hunt for narrows as difficulty rises");
  const wearAt = d => {
    let ch = minigames.pressLockTension(byTier(d), 40);
    return minigames.advanceLockpick(ch, 400).wear;
  };
  assert.ok(wearAt(0) < wearAt(1) && wearAt(1) < wearAt(2),
    "and the pick gives out sooner: " + [0, 1, 2].map(d => Math.round(wearAt(d))).join(" / "));
  // Tier 1 must reproduce the pre-v23 numbers exactly, or every save carrying an
  // open board would fail re-derivation the moment this shipped.
  assert.deepEqual(minigames.createLockpickChallenge({ ...puzzleArgs, diff: 1 }),
    { ...minigames.createLockpickChallenge(puzzleArgs) },
    "medium is the old curve, so boards in progress survive the change");
  // The hearing is the exemption, and it has to be visible in the data: an
  // objection board carries no tier at all, so nothing can quietly scale it.
  const heardLines = Array.from({ length: 10 }, (_, i) => ({ id: "q" + i, text: "q" + i, bad: i % 3 === 0 }));
  assert.equal("diff" in minigames.objectionDeal(heardLines, 6, "r|c|o")[0], false,
    "objection questions carry no difficulty tier");

  // Half a turn is no turn: leaving the zone abandons the progress.
  let partial = minigames.advanceLockpick(minigames.pressLockTension(puzzle1, puzzle1.give), 300);
  assert.ok(partial.hold > 0 && partial.phase === "lockpick");
  assert.equal(minigames.pressLockTension(partial, 0).hold, 0, "stepping off the zone restarts the turn");

  // Sitting past the give point wears the steel out and shears it — no button
  // press involved, which is the whole point of the redesign.
  let over = minigames.pressLockTension(puzzle1, Math.min(100, puzzle1.give + puzzle1.tolerance + 15));
  let overFrames = 0;
  while (over.phase === "lockpick" && overFrames++ < 200) over = minigames.advanceLockpick(over, 80);
  assert.equal(over.phase, "coin_call", "one pick, one shear, straight to the coin");
  assert.deepEqual([over.snapped, over.brokeInLock, over.tension, over.wear], [true, true, 0, 0]);
  assert.match(over.feedback, /shears off/i);
  const overSeconds = overFrames * 80 / 1000;
  assert.ok(overSeconds < 4, "pushing well past the zone kills it quickly: " + overSeconds + "s");
  // Loitering below the zone is safer but not free — the pick is still bent.
  let low = minigames.pressLockTension(puzzle1, Math.max(1, puzzle1.give - puzzle1.tolerance - 8));
  let lowFrames = 0;
  while (low.phase === "lockpick" && lowFrames++ < 400) low = minigames.advanceLockpick(low, 80);
  const lowSeconds = lowFrames * 80 / 1000;
  assert.equal(low.phase, "coin_call", "dawdling under load eventually costs the pick too");
  assert.ok(lowSeconds > overSeconds * 2, "but it takes far longer: " + lowSeconds + "s vs " + overSeconds + "s");

  // A snap with spares left is recoverable: you pull the stub and start again.
  const sparePick = minigames.createLockpickChallenge({ ...puzzleArgs, attemptBonus: 1 });
  let spare = minigames.pressLockTension(sparePick, Math.min(100, sparePick.give + sparePick.tolerance + 20));
  let spareFrames = 0;
  while (spare.phase === "lockpick" && !spare.snapped && spareFrames++ < 200) spare = minigames.advanceLockpick(spare, 80);
  assert.deepEqual([spare.phase, spare.snapped, spare.brokeInLock], ["lockpick", true, false],
    "only the final pick leaves evidence behind");
  // The coin narrates the failure you actually had.
  const brokenCaught = minigames.callCoin(over, over.coinFace === "heads" ? "tails" : "heads");
  assert.match(brokenCaught.feedback, /keyway|tape/i, "a fragment left behind is what gets reviewed");
  const brokenAway = minigames.callCoin(over, over.coinFace);
  assert.match(brokenAway.feedback, /tweezers|comes free/i, "calling it right gets the stub back out");
  // The warning band is deliberately wider than the zone and starts a different
  // distance early on every lock, so no fixed nudge can solve every door.
  const leads = new Set();
  for (let i = 0; i < 60; i++) leads.add(minigames.createLockpickChallenge({ ...puzzleArgs, caseId: "lead" + i }).hintLead);
  assert.ok(leads.size > 8, "locks lie about being close by varying amounts");
  // Trained hands get more picks AND a wider zone to find.
  const trained = minigames.createLockpickChallenge({ ...puzzleArgs, toleranceBonus: 5, attemptBonus: 2 });
  assert.equal(trained.maxAttempts, 3, "SNEAKY buys extra picks");
  assert.ok(trained.tolerance > puzzle1.tolerance, "and a wider give zone");

  const powerArgs = { runSeed: 123, caseId: "covert2", actionId: "blackout", cost: 1.5, toil: 8, lateExtra: 0 };
  const power1 = minigames.createPowerCutChallenge(powerArgs);
  const power2 = minigames.createPowerCutChallenge(powerArgs);
  assert.deepEqual(power1, power2);
  assert.equal(power1.rings.length, minigames.POWER_RING_COUNT);
  assert.ok(power1.rings.every(ring => minigames.powerAngleDistance(ring.angle, ring.target) > ring.tolerance));
  assert.equal(minigames.powerAngleDistance(359, 1), 2, "power windows wrap cleanly through zero degrees");
  const cappedPower = minigames.advancePowerCut(power1, 1000);
  assert.equal(cappedPower.rings[0].elapsedMs, minigames.POWER_FRAME_CAP_MS);
  assert.equal(cappedPower.rings[0].angle, minigames.powerAngleAt(cappedPower.rings[0]));
  let solvedPower = power1;
  for (let ring = 0; ring < minigames.POWER_RING_COUNT; ring++) {
    solvedPower = alignPower(solvedPower);
    assert.ok(minigames.powerAngleDistance(
      solvedPower.rings[solvedPower.activeRing].angle,
      solvedPower.rings[solvedPower.activeRing].target
    ) <= solvedPower.rings[solvedPower.activeRing].tolerance);
    solvedPower = minigames.stopPowerCut(solvedPower);
  }
  assert.deepEqual([solvedPower.phase, solvedPower.turn, solvedPower.rings.every(ring => ring.phase === "locked")],
    ["power_success", minigames.POWER_RING_COUNT, true]);
  const failedPower = minigames.stopPowerCut(power1);
  assert.deepEqual([failedPower.phase, failedPower.turn, failedPower.missesLeft], ["coin_call", 1, 0]);
  assert.equal(minigames.callCoin(failedPower, failedPower.coinFace).escaped, true);
  assert.equal(minigames.callCoin(failedPower, oppositeFace(failedPower.coinFace)).escaped, false);
  const sneakyPower = minigames.createPowerCutChallenge({ ...powerArgs, sneaky: 100 });
  assert.ok(sneakyPower.rings.every((ring, index) => ring.speed < power1.rings[index].speed&&ring.tolerance>power1.rings[index].tolerance));
  assert.equal(utils.getRngState(), puzzleCursor, "power timing must not consume the shared DAILY cursor");

  // v1.9.18 character progression is pure, bounded and scenario-aware. Innate
  // ranks never consume earned points, while every level-up grants exactly one.
  const progressionScenarios = ["fraud", "debtor", "legacy", "defector", "boomerang"];
  const innateByScenario = {
    fraud:{sneaky:2,endurance:0}, debtor:{sneaky:0,endurance:2}, legacy:{sneaky:0,endurance:0},
    defector:{sneaky:1,endurance:1}, boomerang:{sneaky:1,endurance:1},
  };
  for (const scenario of progressionScenarios) {
    const career = progression.createProgression(scenario);
    assert.deepEqual(career.skills, innateByScenario[scenario]);
    assert.equal(progression.progressionValidationError(career, scenario), null);
  }
  assert.deepEqual(progression.XP_THRESHOLDS, [0,50,120,210,320,450,600,780]);
  assert.deepEqual(progression.XP_THRESHOLDS.map(progression.levelForXp), [1,2,3,4,5,6,7,8]);
  const twoLevels = progression.addXp(progression.createProgression("fraud"), 120);
  assert.deepEqual([twoLevels.progression.xp,twoLevels.progression.level,twoLevels.progression.skillPoints,
    twoLevels.levelsGained,twoLevels.pointsGained], [120,3,2,2,2]);
  const oneSpent = progression.allocateSkill(twoLevels.progression,"endurance");
  assert.equal(oneSpent.spent,true);
  assert.deepEqual([oneSpent.progression.skillPoints,oneSpent.progression.skills.sneaky,
    oneSpent.progression.skills.endurance],[1,2,1]);
  assert.equal(progression.allocateSkill(oneSpent.progression,"unknown").progression,oneSpent.progression,
    "invalid allocation preserves identity");
  assert.equal(progression.progressionValidationError({...oneSpent.progression,extra:true},"fraud"),"invalid_keys");
  assert.equal(progression.progressionValidationError({...oneSpent.progression,level:4},"fraud"),"xp_level_mismatch");
  assert.equal(progression.progressionValidationError({...oneSpent.progression,skillPoints:0},"fraud"),"skill_point_mismatch");

  const sneakyRanks = [0,2,5].map(rank=>progression.sneakyModifiers({skills:{sneaky:rank,endurance:0}}));
  assert.deepEqual(sneakyRanks.map(m=>[m.powerScore,m.lockToleranceBonus,m.lockAttemptBonus,m.ringSpeedMultiplier]),
    [[0,0,0,1],[40,2,1,.86],[100,5,2,.65]]);
  const expectedPowerSpeeds=[[68,101,148],[58.5,86.9,127.3],[44.2,65.6,96.2]];
  // The three circuits are a climb, not three of the same ring: each one spins
  // faster through a narrower window, at every SNEAKY rank.
  const stopWindowMs=ring=>2*ring.tolerance/ring.speed*1000;
  for (const [modIndex,mod] of sneakyRanks.entries()) {
    const lock=minigames.createLockpickChallenge({...puzzleArgs,toleranceBonus:mod.lockToleranceBonus,attemptBonus:mod.lockAttemptBonus});
    const power=minigames.createPowerCutChallenge({...powerArgs,sneaky:mod.powerScore});
    // One pick at rank 0, one more at each SNEAKY attempt threshold.
    assert.deepEqual([lock.tolerance,lock.maxAttempts],[3+mod.lockToleranceBonus,1+mod.lockAttemptBonus]);
    assert.deepEqual(power.rings.map(ring=>ring.speed),expectedPowerSpeeds[modIndex]);
    const speeds=power.rings.map(ring=>ring.speed), windows=power.rings.map(stopWindowMs);
    assert.ok(speeds[0]<speeds[1]&&speeds[1]<speeds[2],"each circuit spins faster than the last");
    assert.ok(windows[0]>windows[1]&&windows[1]>windows[2],"and gives less room to stop it");
    // ~9 frames at 60fps: tight, but a press you can anticipate. Any SNEAKY
    // rank widens it quickly, which is the point of training the skill.
    assert.ok(windows[2]>=140,"the hard circuit stays humanly stoppable");
    assert.equal(power.rules,minigames.POWER_RULES);
  }
  // A board dealt under the old curve keeps it, so an update cannot rewrite a
  // puzzle someone is halfway through.
  const legacyBoard=minigames.createPowerCutChallenge({...powerArgs,sneaky:0,rules:0});
  assert.deepEqual(legacyBoard.rings.map(ring=>ring.speed),[70,100,105]);
  assert.equal(legacyBoard.rules,0);
  assert.equal(progression.enduranceFatigueMultiplier(progression.createProgression("fraud"),"fraud"),1);
  assert.equal(progression.enduranceFatigueMultiplier(progression.createProgression("debtor"),"debtor"),.792);
  const maxLegacy={...progression.createProgression("legacy"),skills:{sneaky:0,endurance:5}};
  assert.equal(progression.enduranceFatigueMultiplier(maxLegacy,"legacy"),.805);
  assert.equal(progression.applyEnduranceToWorkFatigue(10,maxLegacy,"legacy"),8);
  assert.equal(progression.applyEnduranceToWorkFatigue(-10,maxLegacy,"legacy"),-10,
    "rest and narrative recovery bypass ENDURANCE");
  assert.equal(utils.getRngState(), puzzleCursor, "progression math must not consume the shared DAILY cursor");

  // v1.9.19 Fraud identity pressure is rare, banded, persistent and never an
  // instant random game-over. Event builders are deterministic save authority.
  assert.deepEqual([79,80,89,90,94,95,99,100].map(fraud.fraudSlipChance),
    [0,.005,.005,.015,.015,.03,.03,.05]);
  const cleanSecret=fraud.createFraudRisk("fraud");
  assert.equal(cleanSecret.morningPhase,"idle");
  assert.equal(fraud.createFraudRisk("debtor"),null);
  assert.equal(fraud.fraudRiskValidationError(cleanSecret,"fraud",1),null);
  assert.equal(fraud.fraudRiskV1ValidationError(fraud.createFraudRiskV1("fraud"),"fraud",1),null);
  assert.equal(fraud.fraudRiskValidationError({...cleanSecret,dailyPeak:101},"fraud",1),"daily-peak");
  const firstSlip={...cleanSecret,slipCount:1};
  const slipEvent1=fraud.buildFraudSlipEvent(firstSlip);
  assert.deepEqual(fraud.buildFraudSlipEvent(firstSlip),slipEvent1);
  assert.ok(slipEvent1.opts.every(option=>option.ok.fraud&&!option.ok.expose),
    "the random fatigue slip itself cannot expose the player");
  const finalInquiry=fraud.buildFraudInquiryEvent({...cleanSecret,suspicion:3});
  assert.equal(finalInquiry.opts[0].base,100,"the final inquiry always retains a guaranteed survival route");
  assert.ok(finalInquiry.opts.slice(1).every(option=>option.fail.expose===true),
    "only chosen risky failures at the final inquiry expose the Fraud");

  // A day's highest reached fatigue—not the first threshold crossing or the
  // post-coffee value—drives exactly one end-of-day roll. Force a known hit.
  fresh();
  let forcedSlipSeed=0;
  for(let seed=1;seed<100000&&!forcedSlipSeed;seed++){
    utils.setSeed(seed);
    if(utils.rand()<fraud.fraudSlipChance(100)) forcedSlipSeed=seed;
  }
  assert.ok(forcedSlipSeed,"a deterministic 5% fixture seed exists");
  Object.assign(state.S,{inbox:[],openCase:null,event:null,objective:null,hours:0,fatigue:72,clients:[],nemesis:null});
  state.S.fraudRisk.dailyPeak=100;
  utils.setSeed(forcedSlipSeed);
  engine.endDay();
  assert.deepEqual([state.S.fraudRisk.lastCheckDay,state.S.fraudRisk.slipCount,state.S.fraudRisk.pendingKind,state.S.fraudRisk.pendingDay],
    [1,1,"slip",2]);
  assert.match(state.S.summary.lines.join(" "),/question is waiting tomorrow/i);
  assert.equal(engine.inspectSave(1).status,"ready","the rolled day checkpoint is resumable");
  assert.equal(engine.loadGame(1),true);
  assert.deepEqual([state.S.fraudRisk.lastCheckDay,state.S.fraudRisk.slipCount,state.S.fraudRisk.pendingKind,state.S.fraudRisk.pendingDay],
    [1,1,"slip",2],"reloading the day summary cannot reroll the slip");
  engine.dismissSummary();
  assert.deepEqual([state.S.event.fraudKind,state.S.event.fraudStage,state.S.fraudRisk.pendingDay,state.S.fraudRisk.morningPhase],
    ["slip",0,0,"resume"]);
  assert.equal(engine.inspectSave(1).status,"ready","the pre-morning confrontation checkpoint is resumable");
  assert.equal(engine.loadGame(1),true);
  assert.deepEqual([state.S.event.fraudKind,state.S.fraudRisk.morningPhase],["slip","resume"],
    "reload preserves the exact morning continuation marker");
  const safeSlip=state.S.event.opts.find(option=>option.safe);
  const xpBeforeSecret=state.S.progression.xp;
  engine.resolveCrisis(safeSlip);
  assert.deepEqual([state.S.fraudRisk.suspicion,state.S.fraudRisk.pendingKind,state.S.fraudRisk.pendingDay,
    state.S.fraudRisk.morningPhase,state.S.progression.xp,state.S.rep],
    [1,"inquiry",3,"idle",xpBeforeSecret,49],
    "safe cover story survives, schedules stage one, resumes morning exactly once and cannot farm crisis XP");
  const repAfterMorning=state.S.rep;
  engine.resolveCrisis(safeSlip);
  assert.equal(state.S.rep,repAfterMorning,"a stale Fraud click cannot replay the morning pipeline");
  Object.assign(state.S,{inbox:[],event:null,objective:null,hours:8,fatigue:0});
  engine.endDay(); engine.dismissSummary();
  assert.deepEqual([state.S.event.fraudKind,state.S.event.fraudStage],["inquiry",1]);
  const activeFraudSave=JSON.parse(storage.get(`${constants.SAVE_KEY}_s1`));
  const tamperedFraudEvent=JSON.parse(JSON.stringify(activeFraudSave));
  tamperedFraudEvent.event.body+=" forged";
  storage.set(`${constants.SAVE_KEY}_s2`,JSON.stringify(tamperedFraudEvent));
  assert.equal(engine.inspectSave(2).status,"invalid","active identity events are canonical save authority");
  const safeInquiry=state.S.event.opts.find(option=>option.safe);
  engine.resolveCrisis(safeInquiry);
  assert.deepEqual([state.S.fraudRisk.suspicion,state.S.fraudRisk.contained],[0,1]);

  fresh();
  Object.assign(state.S,{rep:20,firm:15,event:null,summary:null});
  Object.assign(state.S.fraudRisk,{slipCount:1,suspicion:0,pendingKind:null,pendingDay:0});
  state.S.event=fraud.buildFraudSlipEvent(state.S.fraudRisk);
  engine.resolveCrisis(state.S.event.opts.find(option=>option.safe));
  assert.equal(state.S.over,false,"the initial slip's guaranteed cover story must survive at the firing floor");

  // Every guaranteed identity route is nonlethal even at the ordinary firing
  // and ENDLESS collapse floors. Only a deliberately chosen final-stage risky
  // failure may end the career as EXPOSED.
  for(const stage of [1,2,3]){
    fresh();
    Object.assign(state.S,{rep:20,firm:15,event:null,summary:null,rank:4,endlessWon:true,mode:"endless"});
    Object.assign(state.S.fraudRisk,{suspicion:stage,pendingKind:null,pendingDay:0});
    state.S.event=fraud.buildFraudInquiryEvent(state.S.fraudRisk);
    engine.resolveCrisis(state.S.event.opts.find(option=>option.safe));
    assert.equal(state.S.over,false,`stage ${stage} guaranteed route must survive at both terminal floors`);
  }
  fresh();
  Object.assign(state.S,{rep:20,firm:15,event:null,summary:null,rank:4,endlessWon:true,mode:"endless"});
  Object.assign(state.S.fraudRisk,{suspicion:3,pendingKind:null,pendingDay:0});
  state.S.event=fraud.buildFraudInquiryEvent(state.S.fraudRisk);
  const exposedPlay=state.S.event.opts.find(option=>option.style==="technical");
  exposedPlay.base=-1000; // in-memory forced failure; canonical save authority remains untouched
  utils.setSeed(1);
  engine.resolveCrisis(exposedPlay);
  assert.match(state.S.summary.title,/GAME OVER: EXPOSED/);

  // An otherwise lethal deadline closes the career before the rare roll; no
  // unanswered/ghost slip is recorded in a terminal run.
  fresh();
  const fraudDeadlineDoomed=engine.instantiateCase(template());
  fraudDeadlineDoomed.dueDay=state.S.day;
  Object.assign(state.S,{rep:20,inbox:[fraudDeadlineDoomed],openCase:null,event:null,objective:null,hours:0,fatigue:100,clients:[],nemesis:null});
  Object.assign(state.S.fraudRisk,{dailyPeak:100,lastCheckDay:0,slipCount:0,pendingKind:null,pendingDay:0});
  engine.endDay();
  assert.equal(state.S.over,true);
  assert.deepEqual([state.S.fraudRisk.slipCount,state.S.fraudRisk.pendingKind,state.S.fraudRisk.pendingDay],[0,null,0]);

  fresh();
  assert.equal(content.crises().some(event=>event.id==="audit"),false,
    "the old independent credentials audit cannot bypass the staged fatigue gate");

  // A due confrontation preempts every ordinary morning passive—even the
  // promotion review. Resolving it resumes the morning exactly once, after
  // which a Name Partner summary may open normally.
  fresh();
  Object.assign(state.S,{day:5,rank:3,inf:100,firm:60,mode:"endless",endlessWon:false,
    seniorPartnerDay:3,inbox:[],openCase:null,event:null,summary:null,objective:null,hours:0,clients:[],nemesis:null});
  Object.assign(state.S.fraudRisk,{slipCount:1,suspicion:0,pendingKind:"slip",pendingDay:6,lastCheckDay:5,dailyPeak:0});
  engine.endDay();
  engine.dismissSummary();
  assert.equal(state.S.summary,null);
  assert.deepEqual([state.S.event.fraudKind,state.S.event.fraudStage,state.S.fraudRisk.morningPhase],
    ["slip",0,"resume"],"identity pressure is the first playable morning checkpoint");
  assert.equal(engine.inspectSave(1).status,"ready");
  const promotionMorningSafe=state.S.event.opts.find(option=>option.safe);
  engine.resolveCrisis(promotionMorningSafe);
  assert.match(state.S.summary.title,/NAME PARTNER/);
  assert.deepEqual([state.S.fraudRisk.pendingKind,state.S.fraudRisk.pendingDay,state.S.fraudRisk.morningPhase],
    ["inquiry",7,"idle"]);
  assert.equal(engine.inspectSave(1).status,"ready","promotion after the confrontation remains resumable");
  engine.dismissSummary();
  assert.equal(state.S.event,null,"tomorrow's follow-up cannot open a day early");

  // At the firing floor, the queued question is still shown before ordinary
  // overnight REP decay. The random hit never kills unseen; the normal career
  // rule may run only after the player has made the guaranteed cover choice.
  fresh();
  Object.assign(state.S,{rep:20,inbox:[],openCase:null,event:null,summary:null,objective:null,hours:0,clients:[],nemesis:null});
  Object.assign(state.S.fraudRisk,{slipCount:1,suspicion:0,pendingKind:"slip",pendingDay:2,lastCheckDay:1,dailyPeak:0});
  engine.endDay(); engine.dismissSummary();
  assert.deepEqual([state.S.over,state.S.rep,state.S.event.fraudKind,state.S.fraudRisk.morningPhase],
    [false,20,"slip","resume"],"the cover decision must precede lethal morning decay");
  engine.resolveCrisis(state.S.event.opts.find(option=>option.safe));
  assert.equal(state.S.over,true);
  assert.match(state.S.summary.title,/GAME OVER: FIRED/);

  // Schema 13 active events were already playable checkpoints, not interrupted
  // mornings. Migrating one must therefore preserve the scene without replaying
  // morning decay/results after its choice.
  fresh();
  Object.assign(state.S.fraudRisk,{slipCount:1,suspicion:0,pendingKind:null,pendingDay:0,morningPhase:"complete"});
  state.S.event=fraud.buildFraudSlipEvent(state.S.fraudRisk);
  engine.saveGame();
  const schema13Active=JSON.parse(storage.get(`${constants.SAVE_KEY}_s1`));
  schema13Active.schemaVersion=13;
  schema13Active.fraudRisk={...schema13Active.fraudRisk,version:1};
  delete schema13Active.fraudRisk.morningPhase;
  storage.set(`${constants.SAVE_KEY}_s2`,JSON.stringify(schema13Active));
  const schema13ActiveInfo=engine.inspectSave(2);
  assert.equal(schema13ActiveInfo.status,"ready");
  assert.equal(schema13ActiveInfo.save.fraudRisk.morningPhase,"complete");
  assert.equal(engine.loadGame(2),true);
  const schema13Rep=state.S.rep;
  engine.resolveCrisis(state.S.event.opts.find(option=>option.safe));
  assert.equal(state.S.rep,schema13Rep,"a migrated schema 13 active event must not replay morning passives");
  storage.delete(`${constants.SAVE_KEY}_s2`);

  engine.setSlot(1);
  fresh();
  const schema13Fraud=JSON.parse(storage.get(`${constants.SAVE_KEY}_s1`));
  schema13Fraud.schemaVersion=13;
  schema13Fraud.fraudRisk={...schema13Fraud.fraudRisk,version:1};
  delete schema13Fraud.fraudRisk.morningPhase;
  storage.set(`${constants.SAVE_KEY}_s2`,JSON.stringify(schema13Fraud));
  const schema13FraudInfo=engine.inspectSave(2);
  assert.equal(schema13FraudInfo.status,"ready");
  assert.deepEqual(schema13FraudInfo.save.fraudRisk,fraud.createFraudRisk("fraud"),
    "schema 13 identity state upgrades without inventing a morning continuation");
  const schema12Fraud=JSON.parse(storage.get(`${constants.SAVE_KEY}_s1`));
  schema12Fraud.schemaVersion=12;
  schema12Fraud.event=null;
  delete schema12Fraud.fraudRisk;
  storage.set(`${constants.SAVE_KEY}_s2`,JSON.stringify(schema12Fraud));
  const schema12FraudInfo=engine.inspectSave(2);
  assert.equal(schema12FraudInfo.status,"ready");
  assert.deepEqual(schema12FraudInfo.save.fraudRisk,fraud.createFraudRisk("fraud"),
    "schema 12 careers begin identity pressure from a clean, deterministic baseline");
  storage.delete(`${constants.SAVE_KEY}_s2`);

  // Allocation persists, is idempotent, and does not advance DAILY's shared
  // RNG cursor. An active COVERT ACTION freezes both skill ranks until it ends.
  fresh("daily");
  state.S.progression=progression.addXp(progression.createProgression(state.S.scenario),50).progression;
  const allocationCursor=utils.getRngState();
  const allocationBefore=clone=>JSON.parse(JSON.stringify(clone));
  assert.equal(engine.spendSkillPoint("endurance"),true);
  assert.equal(utils.getRngState(),allocationCursor);
  const allocatedCareer=allocationBefore(state.S.progression);
  assert.equal(engine.spendSkillPoint("unknown"),false);
  assert.deepEqual(state.S.progression,allocatedCareer);
  assert.equal(engine.loadGame(1),true);
  assert.deepEqual(state.S.progression,allocatedCareer,"an allocated rank survives reload");
  let guardedAction=liveRedvale();
  const actionSkillCursor=utils.getRngState();
  engine.choose(guardedAction.c,guardedAction.o);
  const frozenProgression=allocationBefore(state.S.progression);
  assert.equal(engine.spendSkillPoint("sneaky"),false);
  assert.deepEqual(state.S.progression,frozenProgression);
  assert.deepEqual(state.S.actionChallenge.skillSnapshot,{rulesVersion:1,
    sneaky:frozenProgression.skills.sneaky,endurance:frozenProgression.skills.endurance});
  assert.equal(utils.getRngState(),actionSkillCursor);

  // XP is written once at terminal/reveal points: immediate matters now,
  // delayed matters at REPLY, and delegated work only on the final handback.
  fresh();
  let xpCase=engine.instantiateCase(template());
  Object.assign(state.S,{inbox:[xpCase],openCase:xpCase,event:null,objective:null,hours:8,clients:[],nemesis:null});
  const xpTech=xpCase.opts.find(option=>option.style==="technical");
  engine.choose(xpCase,xpTech);
  assert.equal(state.S.progression.xp,progression.CASE_XP.win[1]);
  engine.choose(xpCase,xpTech);
  assert.equal(state.S.progression.xp,progression.CASE_XP.win[1],"stale case clicks cannot duplicate XP");

  fresh();
  const progressionDelayedRaw=template();
  progressionDelayedRaw.opts.find(option=>option.style==="technical").delay=1;
  xpCase=engine.instantiateCase(progressionDelayedRaw);
  Object.assign(state.S,{inbox:[xpCase],openCase:xpCase,event:null,objective:null,hours:8,clients:[],nemesis:null});
  engine.choose(xpCase,xpCase.opts.find(option=>option.style==="technical"));
  assert.equal(state.S.progression.xp,0,"a hidden delayed result cannot leak through XP");
  engine.endDay(); engine.dismissSummary();
  assert.equal(state.S.progression.xp,progression.CASE_XP.win[1]);
  engine.saveGame(); engine.loadGame(1);
  assert.equal(state.S.progression.xp,progression.CASE_XP.win[1],"a revealed reply cannot replay XP on reload");

  fresh();
  xpCase=engine.instantiateCase(template());
  xpCase.delegated={npc:state.S.npcs[0].id,day:2,win:true,silent:false};
  Object.assign(state.S,{rank:1,inbox:[xpCase],openCase:null,event:null,objective:null,hours:8,clients:[],nemesis:null});
  engine.endDay(); engine.dismissSummary();
  assert.equal(state.S.progression.xp,progression.DELEGATED_XP.win[1]);

  fresh();
  xpCase=engine.instantiateCase(template());
  xpCase.delegated={npc:state.S.npcs[0].id,day:2,win:false,silent:true};
  Object.assign(state.S,{rank:1,inbox:[xpCase],openCase:null,event:null,objective:null,hours:8,clients:[],nemesis:null});
  engine.endDay(); engine.dismissSummary();
  assert.equal(state.S.progression.xp,0,"a silently returned delegated file grants no XP");

  fresh("daily");
  const crisisOption={text:"Hold the line",base:100,safe:true,ok:{fx:{},txt:"held"},fail:{fx:{},txt:"fell"}};
  state.S.event={id:"test_crisis",title:"TEST CRISIS",body:"test",opts:[crisisOption]};
  const crisisCursor=utils.getRngState();
  engine.resolveCrisis(crisisOption);
  assert.equal(state.S.progression.xp,progression.CRISIS_XP.safe);
  const crisisXp=state.S.progression.xp, cursorAfterCrisis=utils.getRngState();
  engine.resolveCrisis(crisisOption);
  assert.deepEqual([state.S.progression.xp,utils.getRngState()],[crisisXp,cursorAfterCrisis]);
  assert.notEqual(cursorAfterCrisis,crisisCursor,"only the crisis outcome roll—not the XP award—advances DAILY RNG");

  // ENDURANCE applies exactly once to positive work fatigue. It does not
  // discount overtime, recovery or other explicit narrative consequences.
  engine.startGame("debtor","easy","standard");
  xpCase=engine.instantiateCase(template());
  Object.assign(state.S,{inbox:[xpCase],openCase:xpCase,event:null,objective:null,hours:8,fatigue:0,clients:[],nemesis:null});
  engine.choose(xpCase,xpCase.opts.find(option=>option.style==="technical"));
  assert.equal(state.S.fatigue,4,"Debtor's innate ENDURANCE turns 5 work fatigue into 4 once");
  const debtorOvertime={text:"Overtime",base:100,safe:true,ot:true,ok:{fx:{},txt:""}};
  Object.assign(state.S,{hours:0,fatigue:0,event:{id:"overtime",title:"QUITTING TIME",body:"test",opts:[debtorOvertime]}});
  engine.resolveCrisis(debtorOvertime);
  assert.equal(state.S.fatigue,constants.OVERTIME_FATIGUE,"overtime is a narrative penalty, not ENDURANCE work fatigue");

  engine.startGame("debtor","easy","standard");
  xpCase=engine.instantiateCase(template());
  Object.assign(state.S,{inbox:[xpCase],openCase:xpCase,event:null,objective:null,hours:1,fatigue:0,clients:[],nemesis:null});
  engine.choose(xpCase,xpCase.opts.find(option=>option.style==="technical"),true);
  assert.equal(state.S.fatigue,12,
    "ENDURANCE reduces the 5 work fatigue to 4 but leaves all 8 late-work fatigue intact");

  engine.startGame("debtor","easy","standard");
  const lateRedvale=liveRedvale();
  state.S.hours=.5;
  engine.choose(lateRedvale.c,lateRedvale.o,true);
  assert.deepEqual([state.S.actionChallenge.lateExtra,state.S.actionChallenge.toil],[5,11],
    "COVERT ENDURANCE reduces only its 7 work fatigue; the 5 late-work fatigue remains explicit");
  assert.equal(engine.inspectSave(1).status,"ready","late COVERT fatigue re-derives under the current schema");
  const schema11Late=JSON.parse(storage.get(`${constants.SAVE_KEY}_s1`));
  schema11Late.schemaVersion=11;
  schema11Late.actionChallenge.toil=progression.applyEnduranceToWorkFatigue(
    7+schema11Late.actionChallenge.lateExtra,
    {skills:schema11Late.actionChallenge.skillSnapshot},
    "debtor",
  );
  assert.equal(schema11Late.actionChallenge.toil,10,"schema 11 briefly discounted late-work fatigue");
  storage.set(`${constants.SAVE_KEY}_s2`,JSON.stringify(schema11Late));
  const schema11LateInfo=engine.inspectSave(2);
  assert.equal(schema11LateInfo.status,"ready","schema 11 late COVERT checkpoints migrate without loss");
  assert.equal(schema11LateInfo.needsUpgrade,true);
  assert.equal(schema11LateInfo.save.schemaVersion,constants.SAVE_SCHEMA_VERSION);
  // v1.9.24 replaced the lockpick's angle with tension. The two models share no
  // geometry, so an in-progress PICK is handed back whole rather than converted:
  // the challenge is dropped and the covert option returns to the file, unspent.
  assert.equal(schema11LateInfo.save.actionChallenge,null,"a legacy pick in progress is not half-converted");
  const handedBack=schema11LateInfo.save.inbox.find(c=>c.id==="redvale");
  assert.equal(handedBack.actionInProgress,undefined,"and its case is no longer stuck mid-attempt");
  assert.equal(handedBack.opts.some(o=>o.action?.type==="lockpick"),true,"the option is still there to spend");
  storage.delete(`${constants.SAVE_KEY}_s2`);

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

  /* v1.9.34: buying a judge is no longer a gold button that appears on a case
     file and asks to be pressed. It is a considered decision made away from the
     work, at THE BENCH, where you name your own number — so no filing may carry
     a bribe option at all any more. */
  for (let seed = 1; seed <= 100; seed++) {
    utils.setSeed(seed);
    const judged = engine.instantiateCase({ ...template(), judge: true });
    assert.equal(judged.opts.filter(o => o.bribe).length, 0,
      "a case file never offers to buy the bench");
  }
  assert.equal(typeof engine.offerBribe, "function", "bribery lives at the bench instead");

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

  // Exceptional Review accounting is arithmetic only: reaching the cap and
  // inspecting its UI must not consume DAILY RNG, and save/load must resume
  // both momentum and the next generated filing exactly.
  const dailyExceptionalTrace=resume=>{
    fresh("daily");
    Object.assign(state.S,{day:17,rank:3,seniorPartnerDay:17,inf:98,rep:80,firm:80,
      reviewMomentum:0,exceptionalReviewDay:0,exceptionalReviewHinted:false,event:null,summary:null,inbox:[]});
    utils.setSeed(20260809);
    const before=utils.getRngState();
    engine.apply({inf:40},true,"case");
    const info=engine.exceptionalReviewInfo();
    assert.equal(utils.getRngState(),before);
    engine.saveGame();
    if(resume) assert.equal(engine.loadGame(1),true);
    const next=engine.instantiateCase({...template(),tier:2,judge:true});
    return {info,momentum:state.S.reviewMomentum,judge:engine.judgeId(next.judge),order:order(next),cursor:utils.getRngState()};
  };
  assert.deepEqual(dailyExceptionalTrace(false),dailyExceptionalTrace(true));

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

  // Earned SNEAKY points remain useful after the two hand-written early
  // actions: the procedural docket can surface either COVERT board again.
  fresh("daily");
  utils.setSeed(2052);
  const generatedCovertTypes=new Set(), generatedPrepTypes=new Set(), generatedPrepStyles=new Set();
  const COVERT_TYPES=["lockpick","power_cut"], PREP_TYPES=["contradiction","redaction"];
  for(let i=0;i<2000&&(generatedCovertTypes.size<2||generatedPrepTypes.size<2);i++){
    for(const option of casegen.genCase().opts){
      if(!option.action) continue;
      if(PREP_TYPES.includes(option.action.type)){ generatedPrepTypes.add(option.action.type); generatedPrepStyles.add(option.style); }
      else generatedCovertTypes.add(option.action.type);
    }
  }
  assert.deepEqual([...generatedCovertTypes].sort(),COVERT_TYPES);
  // Both voluntary boards must be reachable from the generator, not just from
  // the eleven hand-written files — otherwise a long career never sees them.
  assert.deepEqual([...generatedPrepTypes].sort(),PREP_TYPES,"the procedural docket offers both prep boards");
  // Prep boards ride the same machinery but must never be labelled covert.
  assert.deepEqual([...generatedPrepStyles],["prep"],"prep is never labelled covert");

  // The chronology feature cannot live on one hand-written file: the templates
  // whose bodies already carry dates must offer it too, with the dates in the
  // BODY and never on the cards — otherwise the board solves itself.
  fresh("daily");
  utils.setSeed(2053);
  const generatedTimelines = new Map();
  for (let i = 0; i < 1500 && generatedTimelines.size < 5; i++) {
    const filing = casegen.genCase();
    if (filing.timeline) generatedTimelines.set(filing.timeline.id, filing);
  }
  assert.equal(generatedTimelines.size, 5, "five procedural templates carry an authored chronology");
  const datePattern = /\b(january|february|march|april|may|june|july|august|september|october|november|december|\d{1,2}:\d{2})\b/i;
  for (const [id, filing] of generatedTimelines) {
    const { events, title, body } = filing.timeline;
    assert.ok(events.length >= 6 && events.length <= 12, id + " offers a deep enough pool to vary between runs");
    assert.equal(new Set(events.map(e => e.id)).size, events.length, id + " has unique event ids");
    assert.deepEqual(events.map(e => e.at), events.map((_, index) => index + 1), id + " ranks its events 1..n");
    assert.ok(title.length > 0 && body.length > 0, id + " briefs the player");
    assert.ok(datePattern.test(filing.body), id + " puts its dates in the case file");
    for (const event of events)
      assert.ok(!datePattern.test(event.text), id + "/" + event.id + " must not hand the answer to the card");
    // A risky play on a generated file really does open the prep window.
    const c = engine.instantiateCase(filing);
    const risky = c.opts.find(option => !option.safe && !option.action);
    assert.equal(engine.timelineEligible(c, risky), true, id + " opens prep on a risky play");
    const board = minigames.createTimelineChallenge({ runSeed: 7, caseId: c.id, optionIndex: c.opts.indexOf(risky),
      timelineId: id, events, count: constants.TIMELINE_CARDS, cost: constants.TIMELINE_HOURS, toil: 3, lateExtra: 0 });
    assert.equal(board.cards.length, constants.TIMELINE_CARDS);
    assert.notDeepEqual(board.order, board.solution, id + " never deals a solved board");
  }

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

  // COVERT ACTION success survives reload without rerolling, grants evidence
  // rather than an automatic case win, and consumes its option exactly once.
  fresh("daily");
  let redvale = liveRedvale();
  // A beginner only gets one pick, so train SNEAKY before testing a mid-attempt
  // reload — the extra picks are exactly what the skill buys.
  let trainedProgression = progression.addXp(state.S.progression, 120).progression;
  trainedProgression = progression.allocateSkill(trainedProgression, "sneaky").progression;
  trainedProgression = progression.allocateSkill(trainedProgression, "sneaky").progression;
  state.S.progression = trainedProgression;
  const trainedXpBase = state.S.progression.xp;
  utils.setSeed(0x2468ace0);
  const actionCursor = utils.getRngState();
  const legalOption = redvale.c.opts.find(option => !option.action);
  engine.choose(redvale.c, redvale.o);
  const trainedAttempts = state.S.actionChallenge.maxAttempts;
  assert.ok(trainedAttempts >= 2, "trained hands carry spare picks");
  assert.equal(utils.getRngState(), actionCursor);
  assert.equal(state.S.runStats.covertTry, 1);
  assert.deepEqual(state.S.actionChallenge.skillSnapshot,{rulesVersion:1,
    sneaky:state.S.progression.skills.sneaky,endurance:state.S.progression.skills.endurance});
  assert.deepEqual([state.S.actionChallenge.tolerance,state.S.actionChallenge.maxAttempts],
    [3+state.S.progression.skills.sneaky,1+(state.S.progression.skills.sneaky>=2?1:0)+(state.S.progression.skills.sneaky>=5?1:0)]);
  assert.equal(engine.isPaused(), true);
  const blockedSnapshot = JSON.stringify({ challenge: state.S.actionChallenge, stats: state.S.runStats, hours: state.S.hours });
  engine.choose(redvale.c, legalOption);
  assert.equal(JSON.stringify({ challenge: state.S.actionChallenge, stats: state.S.runStats, hours: state.S.hours }), blockedSnapshot);
  wearOutLock();
  const savedChallenge = JSON.parse(JSON.stringify(state.S.actionChallenge));
  const cursorAfterMiss = utils.getRngState();
  assert.deepEqual([savedChallenge.phase, savedChallenge.attemptsLeft, savedChallenge.turn],
    ["lockpick", trainedAttempts - 1, 1]);
  assert.equal(engine.loadGame(1), true);
  assert.deepEqual(state.S.actionChallenge, savedChallenge);
  assert.equal(utils.getRngState(), cursorAfterMiss);
  assert.equal(state.S.runStats.covertTry, 1);
  const loadedRedvale = state.S.inbox.find(c => c.id === "redvale");
  assert.equal(loadedRedvale.actionInProgress, "redvale_archive_lock");
  assert.equal(loadedRedvale.opts[state.S.actionChallenge.optionIndex].action.id, "redvale_archive_lock");
  openLock();
  assert.equal(state.S.actionChallenge.phase, "lock_success");
  engine.completeActionChallenge();
  assert.equal(utils.getRngState(), cursorAfterMiss);
  assert.equal(state.S.actionChallenge, null);
  assert.equal(loadedRedvale.covertEdge, 12);
  assert.match(loadedRedvale.covertNote, /ARCHIVE INDEX/);
  assert.equal(loadedRedvale.opts.some(option => option.action), false);
  assert.equal(loadedRedvale.actionInProgress, undefined);
  assert.deepEqual([state.S.hours, state.S.fatigue, state.S.bold], [.5, toil(7), 43]);
  assert.deepEqual([state.S.runStats.covertTry, state.S.runStats.covertW,
    state.S.runStats.covertEscape, state.S.runStats.covertCaught], [1, 1, 0, 0]);
  assert.equal(state.S.progression.xp,trainedXpBase+progression.COVERT_XP.success);
  assert.deepEqual([state.S.today.resolved, state.S.archiveTotal], [0, 0]);
  const successOnce = JSON.stringify({ hours: state.S.hours, fatigue: state.S.fatigue, bold: state.S.bold,
    stats: state.S.runStats, opts: loadedRedvale.opts, edge: loadedRedvale.covertEdge });
  engine.completeActionChallenge();
  engine.choose(redvale.c, redvale.o); // stale pre-reload references
  assert.equal(JSON.stringify({ hours: state.S.hours, fatigue: state.S.fatigue, bold: state.S.bold,
    stats: state.S.runStats, opts: loadedRedvale.opts, edge: loadedRedvale.covertEdge }), successOnce);
  engine.saveGame();
  assert.equal(engine.loadGame(1), true);
  assert.equal(state.S.inbox.find(c => c.id === "redvale").opts.some(option => option.action), false);

  // A broken pick gets one deterministic coin call. Calling it correctly
  // escapes but loses the route; a wrong call poisons and archives the case.
  fresh();
  redvale = liveRedvale();
  engine.choose(redvale.c, redvale.o);
  exhaustLock();
  assert.equal(state.S.actionChallenge.phase, "coin_call");
  engine.callActionCoin(state.S.actionChallenge.coinFace);
  assert.deepEqual([state.S.actionChallenge.phase, state.S.actionChallenge.escaped], ["coin_result", true]);
  engine.completeActionChallenge();
  assert.equal(state.S.inbox.includes(redvale.c), true);
  assert.equal(state.S.openCase, redvale.c);
  assert.equal(redvale.c.opts.some(option => option.action), false);
  assert.equal(redvale.c.covertEdge, undefined);
  assert.deepEqual([state.S.hours, state.S.fatigue, state.S.bold], [.5, toil(7), 38]);
  assert.deepEqual([state.S.runStats.covertTry, state.S.runStats.covertW,
    state.S.runStats.covertEscape, state.S.runStats.covertCaught], [1, 0, 1, 0]);
  assert.equal(state.S.progression.xp,progression.COVERT_XP.escape);
  assert.deepEqual([state.S.today.resolved, state.S.archiveTotal], [0, 0]);

  fresh();
  redvale = liveRedvale();
  engine.choose(redvale.c, redvale.o);
  exhaustLock();
  const wrongCall = oppositeFace(state.S.actionChallenge.coinFace);
  engine.callActionCoin(wrongCall);
  assert.deepEqual([state.S.actionChallenge.phase, state.S.actionChallenge.escaped], ["coin_result", false]);
  engine.completeActionChallenge();
  assert.equal(state.S.inbox.includes(redvale.c), false);
  assert.equal(state.S.openCase, null);
  assert.deepEqual([state.S.rep, state.S.bold, state.S.firm, state.S.hours, state.S.fatigue], [32, 35, 56, .5, toil(7)]);
  assert.deepEqual([state.S.runStats.covertTry, state.S.runStats.covertW,
    state.S.runStats.covertEscape, state.S.runStats.covertCaught], [1, 0, 0, 1]);
  assert.equal(state.S.progression.xp,progression.COVERT_XP.caught);
  assert.equal(state.S.today.resolved, 1);
  assert.equal(state.S.archiveTotal, 1);
  assert.deepEqual({ id: state.S.archive[0].id, win: state.S.archive[0].win, via: state.S.archive[0].via },
    { id: "redvale", win: false, via: "covert action — caught" });
  const caughtOnce = JSON.stringify({ rep: state.S.rep, bold: state.S.bold, firm: state.S.firm,
    hours: state.S.hours, fatigue: state.S.fatigue, stats: state.S.runStats, archive: state.S.archive });
  engine.completeActionChallenge();
  engine.callActionCoin(wrongCall);
  engine.advanceLockpickFrame(80);
  assert.equal(JSON.stringify({ rep: state.S.rep, bold: state.S.bold, firm: state.S.firm,
    hours: state.S.hours, fatigue: state.S.fatigue, stats: state.S.runStats, archive: state.S.archive }), caughtOnce);

  // The second COVERT ACTION uses live timing rings but the same one-shot,
  // evidence-not-auto-win and strict-resume engine contract as the lockpick.
  fresh("daily");
  let powerCut = livePowerCut();
  utils.setSeed(0x13579bdf);
  const powerCursor = utils.getRngState();
  engine.choose(powerCut.c, powerCut.o);
  assert.deepEqual([state.S.actionChallenge.type, state.S.actionChallenge.phase, state.S.actionChallenge.activeRing],
    ["power_cut", "power_cut", 0]);
  assert.deepEqual(state.S.actionChallenge.skillSnapshot,{rulesVersion:1,
    sneaky:state.S.progression.skills.sneaky,endurance:state.S.progression.skills.endurance});
  assert.equal(state.S.actionChallenge.sneaky,state.S.progression.skills.sneaky*20);
  assert.equal(utils.getRngState(), powerCursor);
  alignLivePower();
  engine.stopPowerRing();
  assert.deepEqual([state.S.actionChallenge.phase, state.S.actionChallenge.activeRing, state.S.actionChallenge.turn],
    ["power_cut", 1, 1]);
  validPowerActionRaw = JSON.parse(storage.get(`${constants.SAVE_KEY}_s1`));
  const savedPower = JSON.parse(JSON.stringify(state.S.actionChallenge));
  assert.equal(engine.loadGame(1), true);
  assert.deepEqual(state.S.actionChallenge, savedPower, "a locked circuit and the next live marker resume exactly");
  assert.equal(utils.getRngState(), powerCursor);
  while (state.S.actionChallenge.phase === "power_cut") {
    alignLivePower();
    engine.stopPowerRing();
  }
  assert.equal(state.S.actionChallenge.phase, "power_success");
  engine.completeActionChallenge();
  const loadedPowerCase = state.S.inbox.find(c => c.id === "breach");
  assert.equal(state.S.actionChallenge, null);
  assert.equal(loadedPowerCase.covertEdge, 12);
  assert.match(loadedPowerCase.covertNote, /PATCH LEDGER/);
  assert.equal(loadedPowerCase.opts.some(option => option.action), false);
  assert.deepEqual([state.S.hours, state.S.fatigue, state.S.bold], [.5, toil(8), 44]);
  assert.deepEqual([state.S.runStats.covertTry, state.S.runStats.covertW,
    state.S.runStats.covertEscape, state.S.runStats.covertCaught], [1, 1, 0, 0]);
  assert.equal(state.S.progression.xp,progression.COVERT_XP.success);
  assert.deepEqual([state.S.today.resolved, state.S.archiveTotal], [0, 0]);
  assert.equal(utils.getRngState(), powerCursor);

  fresh();
  powerCut = livePowerCut();
  engine.choose(powerCut.c, powerCut.o);
  engine.stopPowerRing(); // every board starts outside its target window
  assert.equal(state.S.actionChallenge.phase, "coin_call");
  engine.callActionCoin(state.S.actionChallenge.coinFace);
  engine.completeActionChallenge();
  assert.equal(state.S.inbox.includes(powerCut.c), true);
  assert.equal(powerCut.c.opts.some(option => option.action), false);
  assert.equal(powerCut.c.covertEdge, undefined);
  assert.deepEqual([state.S.hours, state.S.fatigue, state.S.bold], [.5, toil(8), 38]);
  assert.deepEqual([state.S.runStats.covertTry, state.S.runStats.covertW,
    state.S.runStats.covertEscape, state.S.runStats.covertCaught], [1, 0, 1, 0]);
  assert.equal(state.S.progression.xp,progression.COVERT_XP.escape);

  // v1.9.23 sharpened the circuits. A career that is mid-sabotage when the
  // update lands keeps the board it was dealt instead of losing the slot.
  fresh();
  powerCut = livePowerCut();
  engine.choose(powerCut.c, powerCut.o);
  engine.saveGame();
  const rawSharpened = JSON.parse(localStorage.getItem(constants.SAVE_KEY + "_s1"));
  assert.equal(rawSharpened.actionChallenge.rules, minigames.POWER_RULES);
  const legacyCircuits = JSON.parse(JSON.stringify(rawSharpened));
  legacyCircuits.schemaVersion = 17;
  delete legacyCircuits.actionChallenge.rules;
  const savedPowerScore = progression.sneakyModifiers({ skills: { sneaky: rawSharpened.actionChallenge.skillSnapshot.sneaky, endurance: 0 } }).powerScore;
  legacyCircuits.actionChallenge.rings = minigames
    .createPowerCutChallenge({ runSeed: rawSharpened.seed, caseId: rawSharpened.actionChallenge.caseId,
      actionId: rawSharpened.actionChallenge.actionId, cost: 1.5, toil: 8, lateExtra: 0,
      sneaky: savedPowerScore, rules: 0 }).rings;
  localStorage.setItem(constants.SAVE_KEY + "_s1", JSON.stringify(legacyCircuits));
  assert.equal(engine.loadGame(1), true, "a v17 sabotage in progress migrates instead of being rejected");
  assert.equal(state.S.actionChallenge.rules, 0, "and keeps the curve it was dealt");
  assert.deepEqual(state.S.actionChallenge.rings.map(r => r.speed), legacyCircuits.actionChallenge.rings.map(r => r.speed));
  // A legacy board cannot be re-labelled as a modern one to smuggle easier rings in.
  const forgedRules = JSON.parse(JSON.stringify(legacyCircuits));
  forgedRules.schemaVersion = constants.SAVE_SCHEMA_VERSION;
  forgedRules.actionChallenge.rules = minigames.POWER_RULES;
  localStorage.setItem(constants.SAVE_KEY + "_s1", JSON.stringify(forgedRules));
  assert.equal(engine.loadGame(1), false, "old rings claiming the new curve are rejected");

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
  assert.equal(migratedInfo.save.reviewMomentum, 0);
  assert.equal(migratedInfo.save.seniorPartnerDay, 0);
  assert.equal(migratedInfo.save.exceptionalReviewDay, 0);
  assert.equal(migratedInfo.save.exceptionalReviewHinted, false);
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
  const v7Raw=clone(readyBase);
  v7Raw.schemaVersion=7;
  delete v7Raw.finalWarningUsed;
  storage.set(`${constants.SAVE_KEY}_s2`,JSON.stringify(v7Raw));
  const v7Info=engine.inspectSave(2);
  assert.equal(v7Info.status,"ready");
  assert.equal(v7Info.needsUpgrade,true);
  assert.equal(v7Info.save.finalWarningUsed,false,"older careers receive one unused Final Warning after migration");
  const v8Raw=clone(readyBase);
  v8Raw.schemaVersion=8;
  v8Raw.actionChallenge={fake:true}; // v8 could not legitimately own an interactive action
  for(const key of ["covertTry","covertW","covertEscape","covertCaught"]) delete v8Raw.runStats[key];
  const v8Marked=v8Raw.inbox.find(c=>!c.msg);
  if(v8Marked) v8Marked.actionInProgress="forged_pre_feature_marker";
  storage.set(`${constants.SAVE_KEY}_s2`,JSON.stringify(v8Raw));
  const v8Info=engine.inspectSave(2);
  assert.equal(v8Info.status,"ready");
  assert.equal(v8Info.needsUpgrade,true);
  assert.equal(v8Info.save.actionChallenge,null);
  assert.deepEqual([v8Info.save.runStats.covertTry,v8Info.save.runStats.covertW,
    v8Info.save.runStats.covertEscape,v8Info.save.runStats.covertCaught],[0,0,0,0]);
  assert.equal(v8Info.save.inbox.some(c=>c.actionInProgress!=null),false);
  const v9Raw=clone(readyBase);
  v9Raw.schemaVersion=9;
  storage.set(`${constants.SAVE_KEY}_s2`,JSON.stringify(v9Raw));
  const v9Info=engine.inspectSave(2);
  assert.equal(v9Info.status,"ready");
  assert.equal(v9Info.needsUpgrade,true);
  assert.equal(v9Info.save.schemaVersion,constants.SAVE_SCHEMA_VERSION,"v9 lockpick careers migrate without losing state");
  const v6SeniorRaw=clone(readyBase);
  Object.assign(v6SeniorRaw,{schemaVersion:6,day:17,rank:3,inf:100,reviewMomentum:99,
    seniorPartnerDay:1,exceptionalReviewDay:16,exceptionalReviewHinted:true});
  storage.set(`${constants.SAVE_KEY}_s2`,JSON.stringify(v6SeniorRaw));
  const v6SeniorInfo=engine.inspectSave(2);
  assert.equal(v6SeniorInfo.status,"ready");
  assert.equal(v6SeniorInfo.needsUpgrade,true);
  assert.deepEqual([v6SeniorInfo.save.reviewMomentum,v6SeniorInfo.save.seniorPartnerDay,
    v6SeniorInfo.save.exceptionalReviewDay,v6SeniorInfo.save.exceptionalReviewHinted],[0,17,0,false]);
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
  fresh("daily");
  redvale=liveRedvale();
  engine.choose(redvale.c,redvale.o);
  wearOutLock();
  const validActionRaw=JSON.parse(storage.get(saveKey));
  assert.equal(engine.inspectSave(1).status,"ready");
  const v9ActiveLockRaw=clone(validActionRaw);
  v9ActiveLockRaw.schemaVersion=9;
  delete v9ActiveLockRaw.progression;
  delete v9ActiveLockRaw.actionChallenge.skillSnapshot;
  Object.assign(v9ActiveLockRaw.actionChallenge,{tolerance:10,maxAttempts:3,attemptsLeft:2,toil:7});
  storage.set(`${constants.SAVE_KEY}_s2`,JSON.stringify(v9ActiveLockRaw));
  const v9ActiveLockInfo=engine.inspectSave(2);
  assert.equal(v9ActiveLockInfo.status,"ready");
  assert.equal(v9ActiveLockInfo.needsUpgrade,true);
  // The tension rewrite (v1.9.24) shares no geometry with the old angle dial,
  // so an ancient in-progress pick is handed back rather than converted: the
  // career loads, the challenge is gone and the covert option is spendable.
  assert.equal(v9ActiveLockInfo.save.actionChallenge,null,
    "v9 careers do not resume a lockpick built on rules that no longer exist");
  const v9HandedBack=v9ActiveLockInfo.save.inbox.find(c=>c.id==="redvale");
  assert.equal(v9HandedBack.actionInProgress,undefined);
  assert.equal(engine.loadGame(2),true);
  const v9Case=state.S.inbox.find(c=>c.id==="redvale");
  const v9Action=v9Case.opts.find(o=>o.action?.type==="lockpick");
  assert.ok(v9Action,"the covert option survives the hand-back");
  state.S.hours=2; state.S.event=null;
  engine.choose(v9Case,v9Action);
  assert.equal(state.S.actionChallenge.phase,"lockpick","and can be started fresh under the new rules");
  openLock();
  engine.completeActionChallenge();
  assert.equal(state.S.actionChallenge,null,"the re-picked lock completes normally");
  engine.setSlot(1);

  // Schema 10 predates progression. Every scenario receives only its innate
  // baseline—never retroactive XP—and active puzzles keep their exact old rules.
  for (const scenario of progressionScenarios) {
    const v10Baseline=clone(readyBase);
    Object.assign(v10Baseline,{schemaVersion:10,scenario,actionChallenge:null});
    delete v10Baseline.progression;
    v10Baseline.inbox=v10Baseline.inbox.map(c=>{
      if(!c||c.actionInProgress==null) return c;
      const repaired={...c}; delete repaired.actionInProgress; return repaired;
    });
    storage.set(`${constants.SAVE_KEY}_s2`,JSON.stringify(v10Baseline));
    const baselineInfo=engine.inspectSave(2);
    assert.equal(baselineInfo.status,"ready",`schema 10 ${scenario} career migrates`);
    assert.deepEqual(baselineInfo.save.progression,progression.createProgression(scenario));
  }

  assert.ok(validPowerActionRaw,"the integrated power-cut save fixture was captured");
  const v10PowerRaw=clone(validPowerActionRaw);
  const currentPower=v10PowerRaw.actionChallenge;
  const currentPowerCase=v10PowerRaw.inbox.find(c=>c.id==="breach");
  const currentPowerOption=currentPowerCase.opts[currentPower.optionIndex];
  const legacyPowerToil=Math.round(currentPower.cost*2)+(currentPowerOption.action.fatigue||0)+currentPower.lateExtra;
  let legacyPower=minigames.createPowerCutChallenge({runSeed:currentPower.runSeed,caseId:currentPower.caseId,
    actionId:currentPower.actionId,cost:currentPower.cost,toil:legacyPowerToil,lateExtra:currentPower.lateExtra,sneaky:0});
  legacyPower=minigames.stopPowerCut(alignPower(legacyPower));
  v10PowerRaw.actionChallenge={...legacyPower,optionIndex:currentPower.optionIndex,startedDay:currentPower.startedDay,
    hoursBefore:currentPower.hoursBefore,caseTitle:currentPower.caseTitle,actionTitle:currentPower.actionTitle,body:currentPower.body};
  v10PowerRaw.schemaVersion=10;
  delete v10PowerRaw.progression;
  storage.set(`${constants.SAVE_KEY}_s2`,JSON.stringify(v10PowerRaw));
  const v10PowerInfo=engine.inspectSave(2);
  assert.equal(v10PowerInfo.status,"ready");
  assert.deepEqual(v10PowerInfo.save.actionChallenge.skillSnapshot,{rulesVersion:0,sneaky:0,endurance:0});
  assert.deepEqual(v10PowerInfo.save.actionChallenge.rings,legacyPower.rings,
    "a schema 10 locked circuit resumes at the exact timing checkpoint");
  assert.deepEqual([v10PowerInfo.save.actionChallenge.phase,v10PowerInfo.save.actionChallenge.activeRing,
    v10PowerInfo.save.actionChallenge.turn],["power_cut",1,1]);
  assert.equal(engine.loadGame(2),true);
  while(state.S.actionChallenge?.phase==="power_cut"){
    alignLivePower(); engine.stopPowerRing();
  }
  engine.completeActionChallenge();
  assert.equal(state.S.actionChallenge,null,"the grandfathered Power Cut remains completable");
  engine.setSlot(1);

  const v10ForgedSneaky=clone(v10PowerRaw);
  v10ForgedSneaky.actionChallenge.sneaky=1;
  storage.set(`${constants.SAVE_KEY}_s2`,JSON.stringify(v10ForgedSneaky));
  assert.equal(engine.inspectSave(2).status,"invalid","schema 10 cannot inject pre-progression SNEAKY");
  const v9ForgedPower=clone(v10PowerRaw);
  v9ForgedPower.schemaVersion=9;
  storage.set(`${constants.SAVE_KEY}_s2`,JSON.stringify(v9ForgedPower));
  assert.equal(engine.inspectSave(2).status,"invalid","schema 9 predates Power Cut entirely");

  const alteredAction=mutate=>{
    const raw=clone(validActionRaw); mutate(raw,raw.actionChallenge,raw.inbox.find(c=>c.id==="redvale"));
    return {raw:JSON.stringify(raw),status:"invalid"};
  };
  const alteredPowerAction=mutate=>{
    const raw=clone(validPowerActionRaw); mutate(raw,raw.actionChallenge,raw.inbox.find(c=>c.id==="breach"));
    return {raw:JSON.stringify(raw),status:"invalid"};
  };
  const actionInvalidRaws=[
    alteredAction((raw,ch)=>{ ch.phase="retry"; }),
    alteredAction((raw,ch)=>{ ch.give=ch.give===minigames.LOCK_MAX?ch.give-1:ch.give+1; }),
    alteredAction((raw,ch)=>{ ch.coinFace=oppositeFace(ch.coinFace); }),
    alteredAction((raw,ch)=>{ ch.attemptsLeft=ch.maxAttempts; }),
    alteredAction((raw,ch)=>{ ch.runSeed=(ch.runSeed+1)>>>0; }),
    alteredAction((raw,ch)=>{ ch.optionIndex=(ch.optionIndex+1)%raw.inbox.find(c=>c.id==="redvale").opts.length; }),
    alteredAction((raw,ch)=>{ raw.inbox=raw.inbox.filter(c=>c.id!==ch.caseId); }),
    alteredAction((raw,ch,c)=>{ c.actionInProgress="wrong_action"; }),
    alteredAction((raw,ch,c)=>{ raw.actionChallenge=null; c.actionInProgress=ch.actionId; }),
    alteredAction((raw,ch)=>{ ch.phase="lock_success"; ch.attemptsLeft=ch.maxAttempts;
      ch.turn=1; ch.tension=0; ch.hold=0; }),
    // a turn claimed without the hold behind it
    alteredAction((raw,ch)=>{ ch.phase="lock_success"; ch.turn=ch.turn+1; ch.tension=ch.give; ch.hold=10; }),
    alteredAction((raw,ch)=>{ ch.phase="coin_call"; ch.attemptsLeft=0;
      ch.turn=ch.maxAttempts; ch.tension=ch.give; }),
    alteredAction((raw,ch)=>{ ch.wear=minigames.LOCK_WEAR_MAX; }), // a pick worn past shearing
    alteredAction((raw,ch)=>{ ch.hold=minigames.LOCK_HOLD_MS; }),  // a finished turn still "in progress"
    alteredAction((raw,ch)=>{ ch.hold=200; ch.tension=0; }),       // progress banked outside the zone
    alteredAction((raw,ch)=>{ ch.phase="coin_result"; ch.attemptsLeft=0; ch.turn=ch.maxAttempts;
      ch.coinCall=ch.coinFace; ch.escaped=false; }),
    alteredAction((raw,ch)=>{ ch.actionTitle="A FORGED BRIEFING"; }),
    alteredAction((raw,ch)=>{ delete ch.skillSnapshot; }),
    alteredAction((raw,ch)=>{ ch.skillSnapshot.extra=true; }),
    alteredAction((raw,ch)=>{ ch.skillSnapshot.rulesVersion=2; }),
    alteredAction((raw,ch)=>{ ch.skillSnapshot.sneaky+=.5; }),
    alteredAction((raw,ch)=>{ ch.skillSnapshot.sneaky=(ch.skillSnapshot.sneaky+1)%(progression.MAX_SKILL+1); }),
    alteredAction((raw,ch)=>{ ch.skillSnapshot={rulesVersion:0,sneaky:1,endurance:0}; }),
    alteredAction((raw,ch)=>{ ch.toil++; }),
  ];
  const powerActionInvalidRaws=[
    alteredPowerAction((raw,ch)=>{ ch.sneaky=1; }),
    alteredPowerAction((raw,ch)=>{ ch.rings[0].startAngle=(ch.rings[0].startAngle+1)%360; }),
    alteredPowerAction((raw,ch)=>{ ch.rings[0].target=(ch.rings[0].target+1)%360; }),
    alteredPowerAction((raw,ch)=>{ ch.rings[0].speed+=1; }),
    alteredPowerAction((raw,ch)=>{ ch.rings[1].angle=(ch.rings[1].angle+1)%360; }),
    alteredPowerAction((raw,ch)=>{ ch.rings[1].elapsedMs=-1; }),
    alteredPowerAction((raw,ch)=>{ ch.activeRing=0; }),
    alteredPowerAction((raw,ch)=>{ ch.phase="power_success"; }),
    alteredPowerAction((raw,ch)=>{ ch.rings[1].phase="locked"; }),
    alteredPowerAction((raw,ch,c)=>{ c.opts[ch.optionIndex].action.type="lockpick"; }),
  ];
  const alteredProgression=mutate=>{
    const raw=clone(readyBase); mutate(raw.progression,raw);
    return {raw:JSON.stringify(raw),status:"invalid"};
  };
  const progressionInvalidRaws=[
    alteredProgression(p=>{ p.version++; }),
    alteredProgression(p=>{ p.xp=50; }),
    alteredProgression(p=>{ p.skillPoints=1; }),
    alteredProgression(p=>{ p.skills.sneaky=1; }),
    alteredProgression(p=>{ p.skills.extra=0; }),
    alteredProgression(p=>{ p.extra=true; }),
  ];
  const duplicatePendingRaw=clone(readyBase);
  const duplicatePending=clone(template());
  duplicatePending.id="duplicate_pending"; duplicatePending.dueDay=2;
  duplicatePending.pending={day:2,win:true,o:clone(duplicatePending.opts[0])};
  duplicatePendingRaw.inbox=[duplicatePending,clone(duplicatePending)];
  const duplicateDelegatedRaw=clone(readyBase);
  const duplicateDelegated=clone(template());
  duplicateDelegated.id="duplicate_delegated"; duplicateDelegated.dueDay=2;
  duplicateDelegated.delegated={day:2,npc:"dana",win:true,silent:false};
  duplicateDelegatedRaw.inbox=[duplicateDelegated,clone(duplicateDelegated)];
  const duplicateFollowupRaw=clone(readyBase);
  const duplicateFollowup=clone(template()); duplicateFollowup.id="duplicate_followup";
  duplicateFollowupRaw.followups=[{day:3,case:duplicateFollowup},{day:4,case:clone(duplicateFollowup)}];
  const collidingFollowupRaw=clone(readyBase);
  const collidingLive=clone(template()); collidingLive.id="live_and_queued"; collidingLive.dueDay=3;
  const collidingQueued=clone(template()); collidingQueued.id=collidingLive.id;
  collidingFollowupRaw.inbox=[collidingLive]; collidingFollowupRaw.followups=[{day:4,case:collidingQueued}];
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
    { raw: JSON.stringify({ ...clone(readyBase), reviewMomentum: -1 }), status: "invalid" },
    { raw: JSON.stringify({ ...clone(readyBase), reviewMomentum: 101 }), status: "invalid" },
    { raw: JSON.stringify({ ...clone(readyBase), reviewMomentum: 1 }), status: "invalid" },
    { raw: JSON.stringify({ ...clone(readyBase), seniorPartnerDay: 1 }), status: "invalid" },
    { raw: JSON.stringify({ ...clone(readyBase), exceptionalReviewDay: 1 }), status: "invalid" },
    { raw: JSON.stringify({ ...clone(readyBase), exceptionalReviewHinted: "yes" }), status: "invalid" },
    { raw: JSON.stringify({ ...clone(readyBase), exceptionalReviewHinted: true }), status: "invalid" },
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
    { raw: JSON.stringify(duplicatePendingRaw), status: "invalid" },
    { raw: JSON.stringify(duplicateDelegatedRaw), status: "invalid" },
    { raw: JSON.stringify(duplicateFollowupRaw), status: "invalid" },
    { raw: JSON.stringify(collidingFollowupRaw), status: "invalid" },
    ...progressionInvalidRaws,
    ...actionInvalidRaws,
    ...powerActionInvalidRaws,
  ];
  for (const [idx, { raw, status }] of invalidRaws.entries()) {
    storage.set(`${constants.SAVE_KEY}_s2`, raw);
    assert.equal(engine.inspectSave(2).status, status, "tamper fixture #" + idx + " should be " + status);
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
  assert.deepEqual([state.S.firm, state.S.hours, state.S.fatigue, state.S.firmPlanDay, state.S.rank],
    [45, 6.5, toil(constants.FIRM_PLAN_FATIGUE), 8, 2]);
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
  assert.deepEqual([state.S.firm, state.S.hours, state.S.fatigue], [20, 8, 0]); // fatigue-literal-ok: nothing was spent

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

  // v1.9.14: only Influence genuinely clipped above 100 while Senior Partner
  // becomes Exceptional Review momentum. It cannot promote in the same action
  // and it cannot bypass the two-morning wait, REP floor or ordinary FIRM gate.
  assert.deepEqual([constants.EXCEPTIONAL_REVIEW_THRESHOLD,constants.EXCEPTIONAL_REVIEW_WAIT,
    constants.EXCEPTIONAL_REVIEW_MIN_REP],[36,2,30]);
  fresh();
  Object.assign(state.S,{day:17,rank:3,seniorPartnerDay:17,inf:98,rep:80,firm:80,
    reviewMomentum:0,exceptionalReviewDay:0,exceptionalReviewHinted:false,event:null,summary:null});
  engine.apply({inf:40},true,"case");
  assert.deepEqual([state.S.inf,state.S.reviewMomentum,state.S.exceptionalReviewHinted],[100,36,true]);
  drivePromotion();
  assert.equal(state.S.rank,3,"overflow cannot award Name Partner during the earning action");
  assert.deepEqual(engine.exceptionalReviewInfo(),{momentum:36,threshold:36,minRep:30,earliest:19,ready:false});
  engine.saveGame();
  assert.equal(engine.loadGame(1),true);
  assert.deepEqual([state.S.reviewMomentum,state.S.seniorPartnerDay,state.S.exceptionalReviewDay],[36,17,0]);
  state.S.event=null;
  state.S.summary={title:"TEST NIGHT",lines:[],btnTxt:"NEXT",action:"nextDay"};
  engine.dismissSummary();
  assert.deepEqual([state.S.day,state.S.rank,state.S.exceptionalReviewDay],[18,3,0]);
  state.S.event=null;
  state.S.summary={title:"TEST NIGHT",lines:[],btnTxt:"NEXT",action:"nextDay"};
  engine.dismissSummary();
  assert.deepEqual([state.S.day,state.S.rank,state.S.exceptionalReviewDay],[19,4,19]);
  assert.match(state.S.summary.title,/YOU MADE NAME PARTNER/);

  fresh();
  Object.assign(state.S,{day:17,rank:3,seniorPartnerDay:17,inf:100,rep:30,firm:80,
    reviewMomentum:36,exceptionalReviewDay:0,exceptionalReviewHinted:true,event:null,summary:null});
  for(let i=0;i<2;i++){
    state.S.event=null;
    state.S.summary={title:"TEST NIGHT",lines:[],btnTxt:"NEXT",action:"nextDay"};
    engine.dismissSummary();
  }
  assert.deepEqual([state.S.day,state.S.rank,state.S.exceptionalReviewDay],[19,3,0],"nightly REP decay must keep a disrespected Senior Partner out of the exceptional vote");

  fresh();
  Object.assign(state.S,{day:5,rank:3,seniorPartnerDay:4,inf:100,rep:80,firm:80,
    reviewMomentum:36,exceptionalReviewDay:0,exceptionalReviewHinted:true,event:null,
    summary:{title:"TEST FRIDAY",lines:[],btnTxt:"NEXT",action:"nextDay"}});
  engine.dismissSummary();
  assert.deepEqual([state.S.day,state.S.rank,state.S.promotionReviewDay,state.S.exceptionalReviewDay],[6,4,6,0],
    "the normal Friday decision must take priority over Exceptional Review telemetry");

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

  // FINAL WARNING is an earned, automatic, once-per-run stay of a fatal
  // aggressive loss. The eligibility snapshot is taken before the losing roll.
  const fatalAggressive=(id,delay=0)=>{
    const option={text:"Bet the career",base:0,style:"aggressive",delay:delay||undefined,
      ok:{fx:{rep:2,bold:4,inf:2},txt:"landed"},fail:{fx:{rep:-20},txt:"collapsed"}};
    const filing={id,tier:0,title:"FINAL WARNING TEST",body:"test",dueDay:state.S.day+2,opts:[option]};
    state.S.inbox.push(filing);
    return {filing,option};
  };
  engine.setBalanceExperiment(null);
  fresh();
  Object.assign(state.S,{rep:25,bold:75,finalWarningUsed:false,event:null,summary:null});
  Object.assign(state.S.runStats,{bluffW:3,bluffL:0});
  let fatal=fatalAggressive("final_warning_instant");
  utils.setSeed(1);
  engine.choose(fatal.filing,fatal.option);
  assert.equal(state.S.over,false);
  assert.deepEqual([state.S.rep,state.S.bold,state.S.finalWarningUsed],[28,60,true]);
  assert.match(state.S.logEntries.map(entry=>entry.txt).join(" "),/FINAL WARNING/);
  state.S.event=null; state.S.rep=25; state.S.bold=75;
  fatal=fatalAggressive("final_warning_spent");
  utils.setSeed(1);
  engine.choose(fatal.filing,fatal.option);
  assert.equal(state.S.over,true,"the protection cannot fire twice in one run");

  fresh();
  Object.assign(state.S,{rep:25,bold:75,finalWarningUsed:false,event:null,summary:null});
  Object.assign(state.S.runStats,{bluffW:2,bluffL:0});
  fatal=fatalAggressive("final_warning_unearned");
  utils.setSeed(1);
  engine.choose(fatal.filing,fatal.option);
  assert.equal(state.S.over,true,"fewer than three landed bluffs must not earn protection");

  fresh();
  Object.assign(state.S,{rep:25,bold:75,finalWarningUsed:false,event:null,summary:null});
  Object.assign(state.S.runStats,{bluffW:3,bluffL:0});
  fatal=fatalAggressive("final_warning_delayed",1);
  utils.setSeed(1);
  engine.choose(fatal.filing,fatal.option);
  assert.deepEqual(fatal.filing.pending.finalWarningSnapshot,{bold:75,wins:3,losses:0});
  assert.equal(engine.saveGame(),true);
  engine.endDay();
  engine.dismissSummary();
  assert.deepEqual([state.S.over,state.S.rep,state.S.bold,state.S.finalWarningUsed],[false,28,60,true],
    "a saved delayed failure must use its pre-roll eligibility snapshot on reveal");
  assert.equal(engine.saveGame(),true);
  assert.equal(engine.loadGame(1),true);
  assert.equal(state.S.finalWarningUsed,true,"a consumed Final Warning must survive save/load");
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

  // ---------- EVIDENCE TIMELINE (v1.9.20) ----------
  // The board is dealt from a run/case identity, never from the shared stream.
  const timelineArgs = { runSeed: 0x51a7d, caseId: "depo", optionIndex: 1, timelineId: "vance_expense_chronology",
    events: content.buildPool().find(c => c.id === "depo").timeline.events, count: 4, cost: .5, toil: 6, lateExtra: 0 };
  const boardA = minigames.createTimelineChallenge(timelineArgs);
  const boardB = minigames.createTimelineChallenge(timelineArgs);
  assert.deepEqual(boardA, boardB, "the same identity always deals the same chronology");
  assert.equal(boardA.cards.length, 4);
  assert.notDeepEqual(boardA.order, boardA.solution, "a board never opens already solved");
  assert.deepEqual([...boardA.order].sort(), [...boardA.solution].sort());
  const otherRun = minigames.createTimelineChallenge({ ...timelineArgs, runSeed: 0x51a7e });
  assert.notDeepEqual(otherRun.cards.map(c => c.id).concat(otherRun.order),
    boardA.cards.map(c => c.id).concat(boardA.order), "a different run asks a different chronology");
  // Solving is pure ordering: solution order wins, anything else scores partial.
  const solvedBoard = minigames.submitTimeline({ ...boardA, order: [...boardA.solution] });
  assert.deepEqual([solvedBoard.phase, solvedBoard.correct], ["timeline_success", boardA.solution.length]);
  const wrongBoard = minigames.submitTimeline({ ...boardA, order: [...boardA.solution].reverse() });
  assert.equal(wrongBoard.phase, "timeline_fail");
  assert.ok(wrongBoard.correct < boardA.solution.length);
  const moved = minigames.moveTimelineCard(boardA, boardA.order[1], -1);
  assert.deepEqual(moved.order.slice(0, 2), [boardA.order[1], boardA.order[0]]);
  assert.deepEqual(minigames.moveTimelineCard(boardA, boardA.order[0], -1).order, boardA.order, "the top card cannot rise");

  /* The Vance file now offers a deposition transcript AND a chronology, and
     choose() flips between them. These cases are about the chronology, so the
     fixture removes the hearing rather than fighting the coin; the coin gets
     its own test below. */
  const liveDepo = (optionStyle = "technical") => {
    const raw = content.buildPool().find(c => c.id === "depo");
    const c = engine.instantiateCase(raw);
    delete c.objection;
    const o = c.opts.find(option => option.style === optionStyle);
    Object.assign(state.S, { inbox: [c], openCase: c, event: null, summary: null, pendingSummary: null,
      hours: 4, fatigue: 0, clients: [], nemesis: null, objective: null });
    return { c, o };
  };
  const forceTimeline = () => { utils.setSeed(1); for (let i = 0; i < 400; i++) { const cursor = utils.getRngState();
    if (utils.rand() * 100 < constants.TIMELINE_TRIGGER) { utils.setRngState(cursor); return true; } } return false; };

  // A prep window opens on a risky play, costs its half hour, and — crucially —
  // resolves the SAME play afterwards instead of becoming a separate action.
  fresh("daily");
  let depo = liveDepo();
  assert.equal(engine.timelineEligible(depo.c, depo.o), true);
  assert.equal(engine.timelineEligible(depo.c, depo.c.opts.find(o => o.safe)), false, "safe plays never trigger prep");
  assert.ok(forceTimeline());
  engine.choose(depo.c, depo.o);
  assert.equal(state.S.actionChallenge?.type, "timeline");
  assert.equal(engine.isPaused(), true);
  assert.equal(state.S.hours, 4, "the prep hour is billed at completion, not at deal time");
  assert.equal(depo.c.timelineDone, true, "the offer is spent even if the run reloads mid-puzzle");
  // A stale second click resolves nothing twice.
  const midSnapshot = JSON.stringify({ ch: state.S.actionChallenge, hours: state.S.hours, inbox: state.S.inbox.length });
  engine.choose(depo.c, depo.o);
  engine.choose(depo.c, depo.c.opts.find(o => o.safe));
  assert.equal(JSON.stringify({ ch: state.S.actionChallenge, hours: state.S.hours, inbox: state.S.inbox.length }), midSnapshot);
  // Mid-puzzle reload restores the exact board and cursor.
  const orderedMid = minigames.moveTimelineCard(state.S.actionChallenge, state.S.actionChallenge.order[2], -1);
  engine.moveTimelineEvent(state.S.actionChallenge.order[2], -1);
  assert.deepEqual(state.S.actionChallenge.order, orderedMid.order);
  const savedTimeline = JSON.parse(JSON.stringify(state.S.actionChallenge));
  const timelineCursor = utils.getRngState();
  assert.equal(engine.loadGame(1), true);
  assert.deepEqual(state.S.actionChallenge, savedTimeline, "a mid-puzzle reload keeps the same chronology");
  assert.equal(utils.getRngState(), timelineCursor, "restoring a board consumes no shared randomness");
  const reloadedDepo = state.S.inbox.find(c => c.id === "depo");
  assert.equal(reloadedDepo.timelineInProgress, "vance_expense_chronology");

  // Solving it raises exactly that option's odds, then the play resolves.
  const solvedOrder = [...state.S.actionChallenge.solution];
  for (let i = 0; i < solvedOrder.length; i++) {
    let guard = 0;
    while (state.S.actionChallenge.order[i] !== solvedOrder[i] && guard++ < 12)
      engine.moveTimelineEvent(solvedOrder[i], -1);
  }
  const riskyOption = reloadedDepo.opts[state.S.actionChallenge.optionIndex];
  const baseOdds = engine.chance(riskyOption, reloadedDepo);
  engine.submitTimelineOrder();
  assert.equal(state.S.actionChallenge.phase, "timeline_success");
  assert.equal(engine.chance(riskyOption, reloadedDepo), baseOdds, "odds only move once the prep is banked");
  const hoursBeforeBank = state.S.hours, playCost = engine.optHours(reloadedDepo, riskyOption);
  engine.completeActionChallenge();
  assert.equal(state.S.actionChallenge, null);
  assert.equal(state.S.runStats.timelineW, 1);
  assert.equal(state.S.hours, hoursBeforeBank - constants.TIMELINE_HOURS - playCost, "prep and the play both bill their hours");
  assert.equal(state.S.inbox.some(c => c.id === "depo"), false, "the committed play resolves after the prep");

  // A muddled chronology costs odds plus a light mark — never the case itself.
  fresh("daily");
  depo = liveDepo("aggressive");
  assert.ok(forceTimeline());
  engine.choose(depo.c, depo.o);
  const wrongOrder = [...state.S.actionChallenge.solution].reverse();
  for (let i = 0; i < wrongOrder.length; i++) {
    let guard = 0;
    while (state.S.actionChallenge.order[i] !== wrongOrder[i] && guard++ < 12)
      engine.moveTimelineEvent(wrongOrder[i], -1);
  }
  const repBeforeMiss = state.S.rep;
  engine.submitTimelineOrder();
  assert.equal(state.S.actionChallenge.phase, "timeline_fail");
  const missedCase = state.S.inbox.find(c => c.id === "depo");
  const missedOption = missedCase.opts[state.S.actionChallenge.optionIndex];
  const oddsBeforeMiss = engine.chance(missedOption, missedCase);
  engine.completeActionChallenge();
  assert.equal(state.S.runStats.timelineL, 1);
  // The mark itself is light; the rest of any drop belongs to the play that followed.
  assert.ok(state.S.rep <= repBeforeMiss + constants.TIMELINE_FAIL_REP, "a wobbly chronology leaves a light mark");
  assert.ok(state.S.logEntries.some(e => /MUDDLED CHRONOLOGY/.test(e.txt)), "the miss is reported to the player");
  assert.ok(!state.S.over, "a failed chronology never ends the run");
  assert.equal(oddsBeforeMiss > 0, true);

  // Declining costs no hour and no fatigue, but going in cold is not free: the
  // committed play carries a light penalty, lighter than a muddled chronology.
  fresh("daily");
  depo = liveDepo();
  assert.ok(forceTimeline());
  const hoursBeforeDecline = state.S.hours, fatigueBeforeDecline = state.S.fatigue;
  const declinedCost = engine.optHours(depo.c, depo.o), declinedIndex = depo.c.opts.indexOf(depo.o);
  engine.choose(depo.c, depo.o);
  assert.equal(state.S.actionChallenge?.phase, "timeline");
  engine.declineTimelineChallenge();
  assert.equal(state.S.actionChallenge, null);
  assert.equal(state.S.hours, hoursBeforeDecline - declinedCost, "declining bills the play's own hours, never the prep's");
  /* The claim is that DECLINING costs nothing beyond the play itself — so the
     control is the same play with no chronology attached, not an arithmetic
     guess. A raw cost*2 ceiling silently ignored the technical style's extra
     fatigue and the scenario multiplier, and only passed on days when the DAILY
     scenario happened to carry ENDURANCE. Fourth date-drift bug of this family;
     this version cannot drift because it measures the thing it is comparing. */
  const declinedFatigue = state.S.fatigue - fatigueBeforeDecline;
  fresh("daily");
  const control = liveDepo();
  delete control.c.timeline;
  const controlBefore = state.S.fatigue;
  engine.choose(control.c, control.o);
  assert.equal(state.S.actionChallenge, null, "the control play has no prep window");
  assert.equal(declinedFatigue, state.S.fatigue - controlBefore,
    "declining costs exactly what the play costs, and nothing for the prep");
  fresh("daily");
  depo = liveDepo();
  assert.ok(forceTimeline());
  engine.choose(depo.c, depo.o);
  engine.declineTimelineChallenge();
  assert.deepEqual(depo.c.timelineEdge, { optionIndex: declinedIndex, value: constants.TIMELINE_EDGE_DECLINE },
    "going in cold stamps its own penalty on the committed play");
  const coldOdds = engine.chance(depo.o, depo.c);
  delete depo.c.timelineEdge;
  assert.equal(coldOdds - engine.chance(depo.o, depo.c), constants.TIMELINE_EDGE_DECLINE, "the cold play argues at lower odds");
  depo.c.timelineEdge = { optionIndex: declinedIndex, value: constants.TIMELINE_EDGE_DECLINE };
  assert.ok(constants.TIMELINE_EDGE_DECLINE < 0 && constants.TIMELINE_EDGE_DECLINE > constants.TIMELINE_EDGE_LOSS,
    "skipping the board must sting less than botching it, or nobody would ever play");
  assert.ok(state.S.logEntries.some(e => /go in cold/i.test(e.txt)), "the player is told what going in cold costs");
  assert.equal(state.S.inbox.some(c => c.id === "depo"), false, "declining still resolves the committed play");

  // ---- Pricing the safe route without touching its 100% reliability ----
  // Both levers ship OFF: the soak measures them as paired cohorts first.
  const coastFile = index => {
    const c = engine.instantiateCase({ id: "coast" + index, tier: 1, title: "CASE: quiet settlement " + index, deadline: 3,
      body: "A file that can be settled or argued.",
      opts: [
        { text: "Settle quietly.", base: 100, safe: true, ok: { fx: { inf: 8, bold: -3 }, txt: "Settled." } },
        { text: "Argue the technical read.", base: 100, style: "technical",
          ok: { fx: { inf: 8 }, txt: "Won." }, fail: { fx: { rep: -4 }, txt: "Lost." } }] });
    state.S.inbox = [c]; state.S.openCase = c; state.S.hours = 40; state.S.event = null;
    return c;
  };
  const playFile = (index, wantSafe) => {
    const c = coastFile(index), o = c.opts.find(option => !!option.safe === wantSafe);
    const before = { inf: state.S.inf, bold: state.S.bold };
    engine.choose(c, o);
    return { inf: state.S.inf - before.inf, bold: state.S.bold - before.bold };
  };

  // The pre-v1.9.21 rules are still reachable as a soak control: no coasting.
  engine.setBalanceExperiment({ safeCoasting: false });
  fresh("standard");
  const legacyFirst = playFile(1, true), legacySecond = playFile(2, true);
  assert.deepEqual(legacySecond, legacyFirst, "the legacy control pays every safe play in full");
  assert.equal(state.S.safeStreak, 0, "a disabled lever writes no streak into the save");

  engine.setBalanceExperiment(null);
  assert.equal(constants.SAFE_COASTING, true, "the shipped rules price a coasting career");
  fresh("standard");
  const coastFirst = playFile(1, true);
  assert.equal(state.S.safeStreak, 1, "the first quiet settlement is free and starts the streak");
  const coastSecond = playFile(2, true);
  assert.ok(coastSecond.inf < coastFirst.inf, "the second settlement in a row returns less Influence");
  assert.equal(coastSecond.bold - coastFirst.bold, -constants.SAFE_STREAK_BOLD, "and drains more Boldness");
  assert.ok(state.S.logEntries.some(e => /COASTING/.test(e.txt)), "the player is told why the payoff shrank");
  assert.equal(state.S.safeStreak, 2);
  playFile(3, false);
  assert.equal(state.S.safeStreak, 0, "taking a risk clears the coasting record");
  const coastAfterRisk = playFile(4, true);
  assert.deepEqual(coastAfterRisk, coastFirst, "and the next safe play is paid in full again");
  // Errands and favors are not career choices: they never build the streak.
  const errand = engine.instantiateCase({ id: "coast_errand", tier: 0, title: "MEMO: coffee", deadline: 1, body: "Not billable.",
    opts: [{ text: "Do it.", base: 100, safe: true, ok: { fx: { inf: 2 }, txt: "Done." } }] });
  state.S.inbox = [errand]; state.S.hours = 40;
  engine.choose(errand, errand.opts[0]);
  assert.equal(state.S.safeStreak, 1, "an errand neither builds nor breaks the streak");

  // Lever C is pure clock pressure and never touches the dice.
  const hoursCase = coastFile(9), hoursSafe = hoursCase.opts.find(o => o.safe);
  const shippedHours = engine.optHours(hoursCase, hoursSafe);
  engine.setBalanceExperiment({ safeHoursMult: 2 });
  assert.ok(engine.optHours(hoursCase, hoursSafe) > shippedHours, "the hours lever slows careful play down");
  assert.equal(engine.chance(hoursSafe, hoursCase), 100, "neither lever ever makes a safe play fail");
  engine.setBalanceExperiment(null);
  assert.equal(engine.optHours(hoursCase, hoursSafe), shippedHours, "production keeps the shipped 1.5x");

  // v15 careers migrate forward with a clean streak; an impossible one is refused.
  fresh("standard");
  engine.saveGame();
  const rawStreak = JSON.parse(localStorage.getItem(constants.SAVE_KEY + "_s1"));
  assert.equal(rawStreak.schemaVersion, constants.SAVE_SCHEMA_VERSION);
  const legacyStreak = { ...rawStreak, schemaVersion: 15 };
  delete legacyStreak.safeStreak;
  localStorage.setItem(constants.SAVE_KEY + "_s1", JSON.stringify(legacyStreak));
  assert.equal(engine.loadGame(1), true, "a v15 career migrates to the streak schema");
  assert.equal(state.S.safeStreak, 0);
  localStorage.setItem(constants.SAVE_KEY + "_s1", JSON.stringify({ ...rawStreak, safeStreak: constants.SAFE_STREAK_CAP + 1 }));
  assert.equal(engine.loadGame(1), false, "a streak longer than the cap is rejected");

  // The edge is scoped to the prepped option and cannot leak onto the others.
  fresh("standard");
  depo = liveDepo();
  const scopedIndex = depo.c.opts.indexOf(depo.o);
  depo.c.timelineEdge = { optionIndex: scopedIndex, value: constants.TIMELINE_EDGE_WIN };
  const otherRisky = depo.c.opts.find((o, i) => i !== scopedIndex && !o.safe && !o.action);
  const withEdge = engine.chance(depo.o, depo.c);
  delete depo.c.timelineEdge;
  assert.equal(withEdge - engine.chance(depo.o, depo.c), constants.TIMELINE_EDGE_WIN);
  depo.c.timelineEdge = { optionIndex: scopedIndex, value: constants.TIMELINE_EDGE_WIN };
  const otherWith = engine.chance(otherRisky, depo.c);
  delete depo.c.timelineEdge;
  assert.equal(otherWith, engine.chance(otherRisky, depo.c), "another option on the same file gains nothing");

  // Tampering: a forged win, a shrunken board and an orphan marker are rejected.
  fresh("daily");
  depo = liveDepo();
  assert.ok(forceTimeline());
  engine.choose(depo.c, depo.o);
  engine.saveGame();
  const rawTimelineSave = JSON.parse(localStorage.getItem(constants.SAVE_KEY + "_s1"));
  assert.equal(rawTimelineSave.schemaVersion, constants.SAVE_SCHEMA_VERSION);
  const rejects = (mutate, label) => {
    const copy = JSON.parse(JSON.stringify(rawTimelineSave));
    mutate(copy);
    localStorage.setItem(constants.SAVE_KEY + "_s1", JSON.stringify(copy));
    assert.equal(engine.loadGame(1), false, label);
    localStorage.setItem(constants.SAVE_KEY + "_s1", JSON.stringify(rawTimelineSave));
  };
  rejects(c => { c.actionChallenge.phase = "timeline_success"; c.actionChallenge.correct = c.actionChallenge.cards.length; },
    "a forged solved board is rejected");
  rejects(c => { c.actionChallenge.cards = c.actionChallenge.cards.slice(0, 2);
    c.actionChallenge.order = c.actionChallenge.order.slice(0, 2); c.actionChallenge.solution = c.actionChallenge.solution.slice(0, 2); },
    "a shrunken board is rejected");
  rejects(c => { c.actionChallenge.solution = [...c.actionChallenge.order]; }, "a rewritten solution is rejected");
  rejects(c => { c.actionChallenge = null; }, "an orphan timeline marker is rejected");
  rejects(c => { const depoCase = c.inbox.find(x => x.id === "depo"); delete depoCase.timelineInProgress; },
    "a challenge without its case marker is rejected");
  rejects(c => { c.inbox.find(x => x.id === "depo").timelineEdge = { optionIndex: 1, value: -7 }; },
    "an edge value the game never stamps is rejected");
  rejects(c => { c.inbox.find(x => x.id === "depo").timelineEdge = { optionIndex: 1, value: constants.TIMELINE_EDGE_WIN + 1 }; },
    "an inflated edge is rejected");
  assert.equal(engine.loadGame(1), true, "the untouched save still loads");

  // v14 careers migrate forward and never look mid-puzzle.
  const legacyTimeline = JSON.parse(JSON.stringify(rawTimelineSave));
  legacyTimeline.schemaVersion = 14;
  legacyTimeline.actionChallenge = null;
  delete legacyTimeline.runStats.timelineW;
  delete legacyTimeline.runStats.timelineL;
  const legacyDepo = legacyTimeline.inbox.find(c => c.id === "depo");
  legacyDepo.timelineInProgress = "vance_expense_chronology";
  legacyDepo.timelineDone = true;
  localStorage.setItem(constants.SAVE_KEY + "_s1", JSON.stringify(legacyTimeline));
  assert.equal(engine.loadGame(1), true, "a v14 career migrates to the timeline schema");
  assert.deepEqual([state.S.runStats.timelineW, state.S.runStats.timelineL], [0, 0]);
  assert.equal(state.S.inbox.find(c => c.id === "depo").timelineInProgress, undefined,
    "migration clears any stale mid-puzzle marker");
  assert.equal(state.S.actionChallenge, null);

  // ---- PRIVILEGE REVIEW (v1.9.25) ----
  // The only board where doing nothing is already one of the two failures.
  const liveKessler = () => {
    const raw = content.buildPool().find(c => c.id === "nda");
    const c = engine.instantiateCase(raw);
    const o = c.opts.find(option => option.action?.type === "redaction");
    Object.assign(state.S, { inbox: [c], openCase: c, event: null, summary: null, pendingSummary: null,
      hours: 6, fatigue: 0, clients: [], nemesis: null, objective: null, rep: 60 });
    return { c, o };
  };

  fresh("daily");
  let kessler = liveKessler();
  assert.ok(kessler.o, "the production is a deliberate option, not a random window");
  assert.equal(kessler.o.style, "prep", "and it is prep work, never covert");
  const redactCursor = utils.getRngState();
  engine.choose(kessler.c, kessler.o);
  assert.equal(utils.getRngState(), redactCursor, "dealing the bundle consumes no shared randomness");
  const bundle = state.S.actionChallenge;
  assert.equal(bundle.type, "redaction");
  assert.ok(bundle.pages.some(p => p.priv) && bundle.pages.some(p => !p.priv),
    "a bundle you cannot get wrong in both directions is not this board");
  assert.equal(state.S.hours, 6, "the review bills its hours at the end");

  // A clean production: black out exactly the privileged pages.
  for (const page of bundle.pages) if (page.priv) engine.markRedaction(page.id);
  engine.produceRedaction();
  assert.deepEqual([state.S.actionChallenge.leaked, state.S.actionChallenge.over], [0, 0]);
  const cleanCase = state.S.inbox.find(c => c.id === "nda");
  const cleanRisky = cleanCase.opts.find(o => o.style === "technical");
  const repBeforeClean = state.S.rep;
  engine.completeActionChallenge();
  assert.equal(state.S.runStats.redactW, 1);
  assert.equal(cleanCase.covertEdge, constants.REDACT_EDGE_FULL, "holding privilege arms the file");
  assert.equal(state.S.rep, repBeforeClean, "and costs nothing but the hours");
  assert.equal(state.S.hours, 6 - constants.REDACT_HOURS);
  assert.ok(state.S.inbox.includes(cleanCase), "the case still has to be argued");
  assert.equal(cleanCase.opts.some(o => o.action), false, "one production per file");
  const withPrivilege = engine.chance(cleanRisky, cleanCase);
  delete cleanCase.covertEdge;
  assert.equal(withPrivilege, Math.min(95, engine.chance(cleanRisky, cleanCase) + constants.REDACT_EDGE_FULL));

  // Producing everything hands your own strategy over: the edge goes NEGATIVE.
  fresh("daily");
  kessler = liveKessler();
  engine.choose(kessler.c, kessler.o);
  const leakBoard = state.S.actionChallenge;
  const privCount = leakBoard.pages.filter(p => p.priv).length;
  engine.produceRedaction();
  assert.deepEqual([state.S.actionChallenge.leaked, state.S.actionChallenge.over], [privCount, 0]);
  const leakedCase = state.S.inbox.find(c => c.id === "nda");
  engine.completeActionChallenge();
  assert.equal(state.S.runStats.redactL, 1);
  assert.ok(leakedCase.covertEdge < 0, "your own file in their hands argues against you");
  assert.ok(leakedCase.covertEdge >= constants.REDACT_EDGE_FLOOR, "but never past the floor");
  const leakedRisky = leakedCase.opts.find(o => o.style === "technical");
  const withLeak = engine.chance(leakedRisky, leakedCase);
  const bankedLeak = leakedCase.covertEdge;
  delete leakedCase.covertEdge;
  assert.ok(withLeak < engine.chance(leakedRisky, leakedCase), "and the odds actually drop");
  leakedCase.covertEdge = bankedLeak;

  // Blacking out everything is the OTHER failure: the court sanctions it.
  fresh("daily");
  kessler = liveKessler();
  engine.choose(kessler.c, kessler.o);
  const overBoard = state.S.actionChallenge;
  for (const page of overBoard.pages) engine.markRedaction(page.id);
  engine.produceRedaction();
  const overCount = overBoard.pages.filter(p => !p.priv).length;
  assert.deepEqual([state.S.actionChallenge.leaked, state.S.actionChallenge.over], [0, overCount]);
  const repBeforeSanction = state.S.rep, firmBeforeSanction = state.S.firm;
  engine.completeActionChallenge();
  assert.ok(state.S.rep < repBeforeSanction, "over-redaction is not caution, it is obstruction");
  assert.ok(state.S.firm < firmBeforeSanction, "and the firm eats the sanction");
  assert.ok(state.S.logEntries.some(e => /SANCTIONED/.test(e.txt)));

  // Toggling is free and reversible until you send it.
  fresh("daily");
  kessler = liveKessler();
  engine.choose(kessler.c, kessler.o);
  const toggleId = state.S.actionChallenge.pages[0].id;
  engine.markRedaction(toggleId);
  assert.equal(state.S.actionChallenge.marked.includes(toggleId), true);
  engine.markRedaction(toggleId);
  assert.equal(state.S.actionChallenge.marked.includes(toggleId), false);
  engine.markRedaction("not_a_page");
  assert.deepEqual(state.S.actionChallenge.marked, []);

  // Reload keeps the bundle and the marks; a forged score is refused.
  engine.markRedaction(toggleId);
  engine.saveGame();
  const midBundle = JSON.parse(JSON.stringify(state.S.actionChallenge));
  assert.equal(engine.loadGame(1), true, "a production survives a reload");
  assert.deepEqual(state.S.actionChallenge, midBundle);
  const rawBundle = JSON.parse(localStorage.getItem(constants.SAVE_KEY + "_s1"));
  const rejectsBundle = (mutate, label) => {
    const copy = JSON.parse(JSON.stringify(rawBundle));
    mutate(copy);
    localStorage.setItem(constants.SAVE_KEY + "_s1", JSON.stringify(copy));
    assert.equal(engine.loadGame(1), false, label);
    localStorage.setItem(constants.SAVE_KEY + "_s1", JSON.stringify(rawBundle));
  };
  rejectsBundle(c => { c.actionChallenge.phase = "redaction_done"; c.actionChallenge.leaked = 0; c.actionChallenge.over = 0; },
    "a produced bundle whose score does not match its marks is rejected");
  rejectsBundle(c => { c.actionChallenge.pages[0].priv = !c.actionChallenge.pages[0].priv; },
    "a re-labelled page is rejected");
  rejectsBundle(c => { c.actionChallenge.marked = ["not_a_page"]; }, "a mark on nothing is rejected");
  assert.equal(engine.loadGame(1), true, "the untouched bundle still loads");

  // v20 careers migrate forward with fresh counters.
  const legacyBundle = JSON.parse(JSON.stringify(rawBundle));
  legacyBundle.schemaVersion = 20;
  legacyBundle.actionChallenge = null;
  delete legacyBundle.runStats.redactW;
  delete legacyBundle.runStats.redactL;
  const legacyNda = legacyBundle.inbox.find(c => c.id === "nda");
  delete legacyNda.actionInProgress;
  localStorage.setItem(constants.SAVE_KEY + "_s1", JSON.stringify(legacyBundle));
  assert.equal(engine.loadGame(1), true, "a v20 career migrates to the privilege schema");
  assert.deepEqual([state.S.runStats.redactW, state.S.runStats.redactL], [0, 0]);

  // ---- OBJECTION (v1.9.25) ----
  // A timing board inside a hearing: it moves the play you already committed
  // to, and the judge on the bench prices a frivolous objection.
  const liveHalcyon = () => {
    const raw = content.buildPool().find(c => c.id === "court1");
    const c = engine.instantiateCase(raw);
    const o = c.opts.find(option => option.style === "technical");
    Object.assign(state.S, { inbox: [c], openCase: c, event: null, summary: null, pendingSummary: null,
      hours: 6, fatigue: 0, clients: [], nemesis: null, objective: null });
    return { c, o };
  };
  const forceObjection = () => { utils.setSeed(1); for (let i = 0; i < 400; i++) { const cursor = utils.getRngState();
    if (utils.rand() * 100 < constants.OBJECTION_TRIGGER) { utils.setRngState(cursor); return true; } } return false; };
  const runTranscript = decide => {
    let guard = 0;
    while (state.S.actionChallenge?.phase === "objection" && guard++ < 200) {
      const board = state.S.actionChallenge, line = board.lines[board.index];
      if (decide(line)) { engine.raiseObjectionNow(); continue; }
      const before = board.index;
      let frames = 0;
      while (state.S.actionChallenge?.phase === "objection" && state.S.actionChallenge.index === before && frames++ < 120)
        engine.advanceObjectionFrame(constants.OBJECTION_WINDOW_MS);
    }
  };

  fresh("daily");
  let halcyon = liveHalcyon();
  assert.equal(engine.objectionEligible(halcyon.c, halcyon.o), true, "a risky play in court can open the window");
  assert.equal(engine.objectionEligible(halcyon.c, halcyon.c.opts.find(o => o.safe)), false,
    "conceding the motion never puts you on your feet");
  const objectionCursor = utils.getRngState();
  assert.ok(forceObjection());
  engine.choose(halcyon.c, halcyon.o);
  assert.equal(state.S.actionChallenge?.type, "objection");
  assert.equal(state.S.hours, 6, "the hearing bills its hours at the end, like every board");
  assert.notEqual(utils.getRngState(), objectionCursor, "the trigger roll uses the shared die");
  const dealt = state.S.actionChallenge.lines;
  assert.ok(dealt.length >= 2 && dealt.some(l => l.bad), "a transcript always has something to object to");
  assert.deepEqual(dealt.map(l => l.id), [...dealt].map(l => l.id), "the transcript keeps its authored order");

  // A clean hearing: object to every improper question, stay silent otherwise.
  runTranscript(line => !!line?.bad);
  assert.equal(state.S.actionChallenge.phase, "objection_done");
  const cleanBoard = state.S.actionChallenge;
  assert.deepEqual([cleanBoard.overruled, cleanBoard.missed], [0, 0]);
  const argued = state.S.inbox.find(c => c.id === "court1");
  const arguedOption = argued.opts[cleanBoard.optionIndex];
  engine.completeActionChallenge();
  assert.equal(state.S.runStats.objW, 1);
  assert.deepEqual(argued.hearingEdge, { optionIndex: cleanBoard.optionIndex, value: constants.OBJECTION_EDGE_WIN },
    "a clean record is worth the full edge");
  // Measured at one instant: the hearing also spends hours and fatigue, so
  // comparing across completion would measure those too.
  const withRecord = engine.chance(arguedOption, argued);
  const bankedEdge = argued.hearingEdge;
  delete argued.hearingEdge;
  assert.equal(withRecord, Math.min(95, engine.chance(arguedOption, argued) + constants.OBJECTION_EDGE_WIN));
  argued.hearingEdge = bankedEdge;
  assert.equal(state.S.inbox.some(c => c.id === "court1"), false, "and the argument resolves after it");

  // Saying nothing puts every improper question on the record.
  fresh("daily");
  halcyon = liveHalcyon();
  assert.ok(forceObjection());
  engine.choose(halcyon.c, halcyon.o);
  const silentCase = state.S.inbox.find(c => c.id === "court1");
  runTranscript(() => false);
  const silent = state.S.actionChallenge;
  assert.ok(silent.missed > 0 && silent.sustained === 0);
  const repBeforeSilence = state.S.rep;
  engine.completeActionChallenge();
  assert.ok(silentCase.hearingEdge.value < 0, "an answered record argues worse");
  assert.ok(silentCase.hearingEdge.value >= constants.OBJECTION_EDGE_LOSS, "but never worse than the floor");
  assert.ok(state.S.rep <= repBeforeSilence, "and it leaves a light mark");
  assert.equal(state.S.runStats.objL, 1);

  // Objecting to everything is its own kind of failure, and a strict bench doubles it.
  fresh("daily");
  halcyon = liveHalcyon();
  halcyon.c.judge = { ...halcyon.c.judge, book: constants.OBJECTION_STRICT_BOOK + 10 };
  assert.ok(forceObjection());
  engine.choose(halcyon.c, halcyon.o);
  assert.equal(state.S.actionChallenge.strict, true, "a by-the-book judge is flagged on the board");
  runTranscript(() => true);
  const spam = state.S.actionChallenge;
  const spammed = state.S.inbox.find(c => c.id === "court1"); // the play resolves on completion
  assert.ok(spam.overruled > 0);
  engine.completeActionChallenge();
  assert.ok(spammed.hearingEdge.value < constants.OBJECTION_EDGE_WIN, "shouting at every question is not skill");

  // Mid-hearing reload keeps the exact question and clock.
  fresh("daily");
  halcyon = liveHalcyon();
  assert.ok(forceObjection());
  engine.choose(halcyon.c, halcyon.o);
  engine.raiseObjectionNow();
  engine.advanceObjectionFrame(80);
  const midHearing = JSON.parse(JSON.stringify(state.S.actionChallenge));
  engine.saveGame();
  assert.equal(engine.loadGame(1), true, "a hearing survives a reload");
  assert.deepEqual(state.S.actionChallenge, midHearing);
  const rawHearing = JSON.parse(localStorage.getItem(constants.SAVE_KEY + "_s1"));
  const rejectsHearing = (mutate, label) => {
    const copy = JSON.parse(JSON.stringify(rawHearing));
    mutate(copy);
    localStorage.setItem(constants.SAVE_KEY + "_s1", JSON.stringify(copy));
    assert.equal(engine.loadGame(1), false, label);
    localStorage.setItem(constants.SAVE_KEY + "_s1", JSON.stringify(rawHearing));
  };
  rejectsHearing(c => { c.actionChallenge.sustained += 2; }, "a forged sustained count is rejected");
  rejectsHearing(c => { c.actionChallenge.ruled = c.actionChallenge.lines.map(l => ({ id: l.id, sustained: true })); },
    "rulings on questions that have not been asked are rejected");
  rejectsHearing(c => { c.actionChallenge.missed = 0; c.actionChallenge.index = c.actionChallenge.lines.length; },
    "skipping to the end without a record is rejected");
  rejectsHearing(c => { c.actionChallenge.lines[0].bad = !c.actionChallenge.lines[0].bad; },
    "a rewritten transcript is rejected");
  rejectsHearing(c => { c.actionChallenge = null; }, "an orphan hearing marker is rejected");
  rejectsHearing(c => { c.inbox.find(x => x.id === "court1").hearingEdge = { optionIndex: 1, value: 40 }; },
    "an inflated hearing edge is rejected");
  assert.equal(engine.loadGame(1), true, "the untouched hearing still loads");

  // v19 careers migrate forward with fresh counters and no transcript.
  const legacyHearing = JSON.parse(JSON.stringify(rawHearing));
  legacyHearing.schemaVersion = 19;
  legacyHearing.actionChallenge = null;
  delete legacyHearing.runStats.objW;
  delete legacyHearing.runStats.objL;
  const legacyCourt1 = legacyHearing.inbox.find(c => c.id === "court1");
  delete legacyCourt1.objectionInProgress;
  localStorage.setItem(constants.SAVE_KEY + "_s1", JSON.stringify(legacyHearing));
  assert.equal(engine.loadGame(1), true, "a v19 career migrates to the objection schema");
  assert.deepEqual([state.S.runStats.objW, state.S.runStats.objL], [0, 0]);

  // ---- CONTRADICTION BOARD (v1.9.22) ----
  // Voluntary prep, not a covert job: no coin call, no getting caught, and the
  // chart never resolves the file — it only arms the legal play you still owe.
  const livePemberton = () => {
    const raw = content.buildPool().find(c => c.id === "court2");
    const c = engine.instantiateCase(raw);
    const o = c.opts.find(option => option.action?.type === "contradiction");
    Object.assign(state.S, { inbox: [c], openCase: c, event: null, summary: null, pendingSummary: null,
      hours: 6, fatigue: 0, clients: [], nemesis: null, objective: null });
    return { c, o };
  };
  const solveContradiction = () => {
    for (const pair of [...state.S.actionChallenge.solution]) {
      if (!state.S.actionChallenge || state.S.actionChallenge.phase !== "contradiction") break;
      engine.selectContradictionCard(pair.statement);
      engine.pinContradiction(pair.document);
    }
  };

  // The deal is identity-derived: stable per run/case, different in another run,
  // and it never reads the shared gameplay RNG.
  const contraArgs = { runSeed: 0x9a31c, caseId: "court2", actionId: "pemberton_contradictions",
    cost: 1.5, toil: 9, lateExtra: 0,
    pairs: content.buildPool().find(c => c.id === "court2").opts.find(o => o.action).action.pairs,
    decoys: content.buildPool().find(c => c.id === "court2").opts.find(o => o.action).action.decoys };
  const contraA = minigames.createContradictionChallenge(contraArgs);
  const contraB = minigames.createContradictionChallenge(contraArgs);
  assert.deepEqual(contraA, contraB, "the same run deals the same board");
  const contraOther = minigames.createContradictionChallenge({ ...contraArgs, runSeed: 0x9a31d });
  assert.notDeepEqual(contraOther.statements.map(s => s.id), contraA.statements.map(s => s.id),
    "another career is asked a different set");
  assert.equal(contraA.statements.length, minigames.CONTRA_STATEMENTS);
  assert.equal(contraA.documents.length, minigames.CONTRA_STATEMENTS + minigames.CONTRA_DECOYS,
    "one exhibit on the board contradicts nothing");
  assert.notDeepEqual(contraA.documents.map(d => d.id), contraA.solution.map(pair => pair.document),
    "the exhibit column is not the answer key in order");
  assert.equal(new Set(contraA.documents.map(d => d.id)).size, contraA.documents.length, "no exhibit is listed twice");

  fresh("daily");
  let pemberton = livePemberton();
  assert.ok(pemberton.o, "a court file may carry prep work even though it cannot carry a burglary");
  const contraCursor = utils.getRngState();
  engine.choose(pemberton.c, pemberton.o);
  assert.equal(utils.getRngState(), contraCursor, "dealing the board consumes no shared randomness");
  assert.equal(state.S.actionChallenge?.type, "contradiction");
  assert.equal(state.S.hours, 6, "the prep hours are billed at completion, not at deal time");
  assert.equal(pemberton.c.actionInProgress, "pemberton_contradictions");
  assert.equal(state.S.runStats.contraTry, 1);

  // Mid-board reload restores the exact position.
  engine.selectContradictionCard(state.S.actionChallenge.solution[0].statement);
  const midContra = JSON.parse(JSON.stringify(state.S.actionChallenge));
  assert.equal(engine.loadGame(1), true);
  assert.deepEqual(state.S.actionChallenge, midContra, "a mid-board reload keeps the same exhibits");

  // A wrong pin burns an attempt; the right one banks a contradiction.
  const wrongDoc = state.S.actionChallenge.documents
    .find(d => !state.S.actionChallenge.solution.some(pair => pair.document === d.id));
  const attemptsBefore = state.S.actionChallenge.attemptsLeft;
  engine.pinContradiction(wrongDoc.id);
  assert.equal(state.S.actionChallenge.attemptsLeft, attemptsBefore - 1, "a decoy costs credibility");
  assert.equal(state.S.actionChallenge.matched.length, 0);
  assert.equal(state.S.actionChallenge.selected, null, "a miss clears the selection");
  solveContradiction();
  assert.equal(state.S.actionChallenge.phase, "contradiction_success");

  const pembertonLive = state.S.inbox.find(c => c.id === "court2");
  const risky = pembertonLive.opts.find(o => o.style === "technical");
  const hoursBeforeChart = state.S.hours;
  engine.completeActionChallenge();
  assert.equal(state.S.actionChallenge, null);
  assert.equal(state.S.runStats.contraW, 1);
  assert.equal(pembertonLive.covertEdge, 15, "a finished chart arms this file's risky legal plays");
  // Measure the edge at one instant: the prep also spends hours and adds
  // fatigue, so comparing odds across the completion would measure both.
  const withChart = engine.chance(risky, pembertonLive);
  delete pembertonLive.covertEdge;
  const withoutChart = engine.chance(risky, pembertonLive);
  pembertonLive.covertEdge = 15;
  assert.equal(withChart, Math.min(95, withoutChart + 15), "the edge feeds the same odds ceiling as every other bonus");
  assert.equal(state.S.hours, hoursBeforeChart - 1.5, "prep bills its hours either way");
  assert.ok(state.S.inbox.includes(pembertonLive), "the case still has to be argued");
  assert.equal(state.S.openCase, pembertonLive, "and it comes back to the desk");
  assert.equal(pembertonLive.opts.some(o => o.action), false, "one sitting per file");

  // Closing the binder early banks a proportional edge, never the full one.
  fresh("daily");
  pemberton = livePemberton();
  engine.choose(pemberton.c, pemberton.o);
  const partialTotal = state.S.actionChallenge.solution.length;
  engine.selectContradictionCard(state.S.actionChallenge.solution[0].statement);
  engine.pinContradiction(state.S.actionChallenge.solution[0].document);
  engine.closeContradictionBoard();
  assert.equal(state.S.actionChallenge.phase, "contradiction_fail");
  engine.completeActionChallenge();
  const partialCase = state.S.inbox.find(c => c.id === "court2");
  assert.equal(partialCase.covertEdge, Math.floor(15 * 1 / partialTotal), "a partial chart proves partially");
  assert.ok(partialCase.covertEdge > 0 && partialCase.covertEdge < 15);
  assert.equal(state.S.runStats.contraL, 1);
  assert.ok(!state.S.over, "a failed chart never ends a career");

  // Running out of attempts with nothing proven costs the hours and no edge.
  fresh("daily");
  pemberton = livePemberton();
  engine.choose(pemberton.c, pemberton.o);
  let guard = 0;
  while (state.S.actionChallenge.phase === "contradiction" && guard++ < 20) {
    const ch = state.S.actionChallenge;
    const decoy = ch.documents.find(d => !ch.solution.some(pair => pair.document === d.id));
    engine.selectContradictionCard(ch.statements.find(s => !ch.matched.some(m => m.statement === s.id)).id);
    engine.pinContradiction(decoy.id);
  }
  assert.equal(state.S.actionChallenge.phase, "contradiction_fail");
  assert.equal(state.S.actionChallenge.attemptsLeft, 0);
  const hoursBeforeMiss = state.S.hours;
  engine.completeActionChallenge();
  const missedChart = state.S.inbox.find(c => c.id === "court2");
  assert.equal(missedChart.covertEdge, undefined, "nothing proven, nothing gained");
  assert.equal(state.S.hours, hoursBeforeMiss - 1.5, "the wasted afternoon is still billed");
  assert.ok(state.S.inbox.includes(missedChart), "and the hearing still has to happen");

  // Stale clicks resolve nothing twice.
  fresh("daily");
  pemberton = livePemberton();
  engine.choose(pemberton.c, pemberton.o);
  const staleSnapshot = JSON.stringify(state.S.actionChallenge);
  engine.choose(pemberton.c, pemberton.o);
  engine.pinContradiction(state.S.actionChallenge.documents[0].id); // nothing selected yet
  engine.selectContradictionCard("not_a_statement");
  assert.equal(JSON.stringify(state.S.actionChallenge), staleSnapshot);

  // Tampering: a forged chart, a rewritten board and an orphan marker are refused.
  engine.saveGame();
  const rawContra = JSON.parse(localStorage.getItem(constants.SAVE_KEY + "_s1"));
  const rejectsContra = (mutate, label) => {
    const copy = JSON.parse(JSON.stringify(rawContra));
    mutate(copy);
    localStorage.setItem(constants.SAVE_KEY + "_s1", JSON.stringify(copy));
    assert.equal(engine.loadGame(1), false, label);
    localStorage.setItem(constants.SAVE_KEY + "_s1", JSON.stringify(rawContra));
  };
  rejectsContra(c => { c.actionChallenge.phase = "contradiction_success";
    c.actionChallenge.matched = [...c.actionChallenge.solution]; }, "a forged finished chart is rejected");
  rejectsContra(c => { c.actionChallenge.matched = [{ statement: c.actionChallenge.statements[0].id, document: "doc_invented" }]; },
    "an invented contradiction is rejected");
  // Rotating the key is guaranteed to differ from the real deal, whatever the
  // board happened to shuffle into.
  rejectsContra(c => { const key = c.actionChallenge.solution;
    c.actionChallenge.solution = key.map((pair, i) => ({ statement: pair.statement, document: key[(i + 1) % key.length].document })); },
    "a rewritten answer key is rejected");
  rejectsContra(c => { c.actionChallenge.attemptsLeft = c.actionChallenge.maxAttempts + 3; }, "extra attempts are rejected");
  rejectsContra(c => { c.actionChallenge.documents = c.actionChallenge.documents.slice(0, 2); }, "a shrunken board is rejected");
  rejectsContra(c => { c.actionChallenge = null; }, "an orphan prep marker is rejected");
  assert.equal(engine.loadGame(1), true, "the untouched prep save still loads");

  // v16 careers migrate forward: no board, fresh counters, nothing else moved.
  const legacyContra = JSON.parse(JSON.stringify(rawContra));
  legacyContra.schemaVersion = 16;
  legacyContra.actionChallenge = null;
  delete legacyContra.runStats.contraTry;
  delete legacyContra.runStats.contraW;
  delete legacyContra.runStats.contraL;
  const legacyPemberton = legacyContra.inbox.find(c => c.id === "court2");
  delete legacyPemberton.actionInProgress;
  localStorage.setItem(constants.SAVE_KEY + "_s1", JSON.stringify(legacyContra));
  assert.equal(engine.loadGame(1), true, "a v16 career migrates to the contradiction schema");
  assert.deepEqual([state.S.runStats.contraTry, state.S.runStats.contraW, state.S.runStats.contraL], [0, 0, 0]);

  // A judged file still cannot carry a burglary.
  const burglaryCourt = content.buildPool().find(c => c.id === "court2");
  const covertOnCourt = JSON.parse(JSON.stringify(content.buildPool().find(c => c.id === "redvale").opts.find(o => o.action)));
  fresh("daily");
  state.S.inbox = [engine.instantiateCase({ ...burglaryCourt, opts: [...burglaryCourt.opts, covertOnCourt] })];
  assert.equal(engine.saveGame(), true);
  assert.equal(engine.loadGame(1), false, "a covert action on a court file is still refused");

  // ---- First-run walkthrough (v1.9.23) ----
  // Four cards on the very first career, never again, and never inside a save.
  intro.resetIntro();
  fresh("standard");
  assert.equal(state.S.introStep, 0, "a brand new player gets the walkthrough");
  assert.equal(engine.isPaused(), true, "the desk is gated while it is open");
  for (let i = 1; i < intro.INTRO_STEPS.length; i++) {
    engine.advanceIntro();
    assert.equal(state.S.introStep, i);
  }
  engine.advanceIntro();
  assert.equal(state.S.introStep, null, "the last card closes it");
  assert.equal(engine.isPaused(), false, "and hands the desk back");
  assert.equal(intro.introSeen(), true);
  fresh("standard");
  assert.equal(state.S.introStep, null, "a second career never shows it again");

  // Skipping counts as seen, and the pointer is never written into a slot.
  intro.resetIntro();
  fresh("standard");
  assert.equal(state.S.introStep, 0);
  engine.saveGame();
  assert.equal(JSON.parse(localStorage.getItem(constants.SAVE_KEY + "_s1")).introStep, undefined,
    "the walkthrough pointer is transient");
  engine.closeIntro();
  assert.equal(intro.introSeen(), true, "skipping still counts as seen");
  assert.equal(engine.loadGame(1), true);
  assert.equal(state.S.introStep, null, "reloading a career never reopens it");
  assert.ok(intro.INTRO_STEPS.every(step => step.title && step.body), "every card says something");

  // ---- BOARDS MUST ACTUALLY VARY ----
  // The deal used to sort by a hash whose output moved by ~1 with its input, so
  // every identity reproduced the authored order and every run drew the same
  // subset. The boards looked identical run after run. Lock the fix down.
  const pool = content.buildPool();
  const spread = fn => { const seen = new Set(); for (let i = 0; i < 150; i++) seen.add(fn("run" + i)); return seen.size; };
  const objectionLines = pool.find(c => c.id === "court1").objection.lines;
  const timelineEvents = pool.find(c => c.id === "depo").timeline.events;
  const contraAction = pool.find(c => c.id === "court2").opts.find(o => o.action).action;
  const redactAction = pool.find(c => c.id === "nda").opts.find(o => o.action).action;
  assert.ok(spread(id => minigames.objectionDeal(objectionLines, 6, id).map(l => l.id).join()) > 60,
    "a hearing draws a different transcript in a different career");
  assert.ok(spread(id => minigames.timelineDeal(timelineEvents, 4, id).cards.map(c => c.id).join()) > 15,
    "a chronology draws different events in a different career");
  assert.ok(spread(id => minigames.contradictionDeal(contraAction.pairs, contraAction.decoys, id)
    .statements.map(x => x.id).join()) > 15, "a contradiction chart asks different statements");
  assert.ok(spread(id => minigames.redactionDeal(redactAction.pages, 8, id).map(p => p.id).join()) > 15,
    "a production bundle holds different pages");
  // And the deal stays deterministic for one identity, which is what save/reload rests on.
  assert.deepEqual(minigames.objectionDeal(objectionLines, 6, "fixed").map(l => l.id),
    minigames.objectionDeal(objectionLines, 6, "fixed").map(l => l.id));

  // ---- BOARD GUIDES ARE PICTURES, NOT PLAYERS ----
  /* Each guide plays the REAL board component so the texture matches exactly,
     which means every one of them is one careless prop away from letting a
     worked example mutate the run. Two invariants hold that line:
     `demo` must neutralise every engine handler, and on the three timed boards
     the frame loop must stop while the guide is open — reading the help used to
     cost you the hearing, which is the bug this replaced. */
  const BOARD_FILES = {
    "LockpickMinigame.jsx": true, "PowerCutMinigame.jsx": true, "ObjectionMinigame.jsx": true,
    "TimelineMinigame.jsx": false, "ContradictionMinigame.jsx": false, "RedactionMinigame.jsx": false,
  };
  for (const [file, timed] of Object.entries(BOARD_FILES)) {
    const src = readFileSync("src/components/minigames/" + file, "utf8");
    assert.match(src, /\{challenge,\s*demo=false/, file + " must accept a demo prop");
    // Every onClick that reaches the engine has to be gated on demo.
    for (const [, handler] of src.matchAll(/onClick=\{(?!demo\?)([^}]*)\}/g))
      assert.ok(!/[a-z]\(/.test(handler) || /undefined/.test(handler),
        file + " has an ungated demo handler: " + handler);
    if (!timed) continue;
    assert.match(src, /\{challenge,\s*demo=false,\s*paused=false\}/, file + " must accept a paused prop");
    assert.match(src, /if\(demo\|\|paused\|\|/, file + "'s clock must stop for demo and pause");
  }
  const overlaySource = readFileSync("src/components/ActionMinigameOverlay.jsx", "utf8");
  for (const board of ["ObjectionMinigame", "LockpickMinigame", "PowerCutMinigame"])
    assert.match(overlaySource, new RegExp("<" + board + " challenge=\\{challenge\\} paused=\\{guide\\}"),
      board + " must be paused while its guide is open");
  assert.match(overlaySource, /checkpointActionChallenge\(\);\s*setGuide\(true\)/,
    "the frozen position is written down before the guide opens");
  const guideSource = readFileSync("src/components/minigames/BoardGuide.jsx", "utf8");
  /* A hand that blooms over a button which never moves reads as hovering, not
     pressing. Every press must therefore name the control it lands on, so the
     board can show the same 3px travel a real click gives. */
  const presses = [...guideSource.matchAll(/press:(?!false)[^,}]+/g)].length;
  const hits = [...guideSource.matchAll(/hit:"/g)].length;
  assert.equal(presses, hits, "every demo press must name the control it lands on");
  assert.ok(hits >= 5, "each pressable board demonstrates its press");
  assert.ok(!/from "\.\.\/\.\.\/game\/engine\.js"/.test(guideSource),
    "a guide must never reach the engine");
  for (const board of Object.keys(BOARD_FILES))
    assert.ok(guideSource.includes("<" + board.replace(".jsx", "") + " challenge={challenge} demo />"),
      "the " + board + " guide must render the real board in demo mode");

  // ---- A DEPOSITION IS A ROOM, NOT A COURTROOM ----
  /* Measured, not assumed: 57% of generated court filings carried no transcript
     at all, which is why the hearing was the rarest board in the game. Every
     court filing now assembles one from its own facts, and a deposition needs
     no bench — which is what lifts the court-only ceiling. */
  {
    const pool = content.buildPool();
    const vance = pool.find(c => c.id === "depo");
    assert.equal(vance.objection.depo, true, "a deposition is flagged as one");
    assert.equal(!!vance.judge, false, "and has no judge in the room");
    utils.setSeed(4242);
    let court = 0, transcripts = 0, depos = 0, drawn = 0;
    const shapes = new Set();
    for (let i = 0; i < 400; i++) {
      const filing = casegen.genCaseFrom(i % casegen.TEMPLATE_COUNT);
      if (filing.judge || filing.tier === 2) { court++; if (filing.objection) transcripts++; }
      if (filing.objection) {
        drawn++;
        if (filing.objection.depo) depos++;
        assert.ok(filing.objection.lines.some(l => l.bad), "every transcript has something to object to");
        assert.ok(filing.objection.lines.some(l => !l.bad), "and something to sit still through");
        shapes.add(filing.objection.lines.map(l => l.text).join("|"));
      }
    }
    assert.equal(transcripts, court, "every court filing can hold a hearing");
    assert.ok(depos > 0, "and depositions reach filings with no bench at all");
    // Not 100%: two draws of the same template that roll the same party name
    // legitimately produce the same examination. What must never happen is one
    // stamped transcript reused across the docket.
    assert.ok(shapes.size / drawn > 0.8,
      "transcripts are assembled per filing, not stamped: " + shapes.size + "/" + drawn);
    // A transcript without a room is not a filing you can hold a hearing on.
    // The play has to be a risky LEGAL one: prep and covert options are their
    // own boards and must never open a second one on top.
    const stray = engine.instantiateCase(pool.find(c => c.id === "nda"));
    const legalPlay = stray.opts.find(o => !o.safe && !o.action);
    stray.objection = { ...vance.objection, depo: false };
    assert.equal(engine.objectionEligible(stray, legalPlay), false,
      "a hearing needs either a bench or the deposition flag");
    stray.objection = { ...vance.objection, depo: true };
    assert.equal(engine.objectionEligible(stray, legalPlay), true,
      "the deposition flag is what opens the room");
    assert.equal(engine.objectionEligible(stray, stray.opts.find(o => o.action)), false,
      "a prep or covert option never stacks a hearing on top of its own board");
  }
  /* When a filing offers both boards, neither may starve the other: trying the
     hearing first every time would have cost the Vance chronology 60% of its
     appearances the moment its deposition transcript was written. */
  {
    fresh();
    const both = engine.instantiateCase(content.buildPool().find(c => c.id === "depo"));
    assert.ok(both.objection && both.timeline, "the fixture really does offer both");
    const risky = both.opts.find(o => o.style === "technical");
    let hearings = 0, chronologies = 0;
    for (let seed = 1; seed <= 240; seed++) {
      utils.setSeed(seed);
      const c = engine.instantiateCase(content.buildPool().find(x => x.id === "depo"));
      Object.assign(state.S, { inbox: [c], openCase: c, event: null, summary: null, pendingSummary: null,
        hours: 6, fatigue: 0, clients: [], nemesis: null, objective: null, actionChallenge: null });
      engine.choose(c, c.opts.find(o => o.style === risky.style));
      const type = state.S.actionChallenge?.type;
      if (type === "objection") hearings++;
      if (type === "timeline") chronologies++;
    }
    assert.ok(hearings > 30 && chronologies > 30,
      "both boards reach the player: " + hearings + " hearings / " + chronologies + " chronologies");
  }

  /* The hearing is the only board that costs no hours — you are already in the
     room — but that must not become a hole every board can climb through. */
  {
    assert.equal(constants.OBJECTION_HOURS, 0, "standing up in a hearing costs no billable time");
    assert.ok(constants.TIMELINE_HOURS >= .5 && constants.REDACT_HOURS >= .5,
      "preparation boards still cost real hours");
    fresh();
    const raw = content.buildPool().find(c => c.id === "court1");
    const c = engine.instantiateCase(raw);
    const o = c.opts.find(x => x.style === "technical");
    Object.assign(state.S, { inbox: [c], openCase: c, event: null, summary: null, pendingSummary: null,
      hours: 5, fatigue: 0, clients: [], nemesis: null, objective: null, actionChallenge: null });
    utils.setSeed(1);
    for (let i = 0; i < 400 && state.S.actionChallenge?.type !== "objection"; i++) {
      const cursor = utils.getRngState();
      if (utils.rand() * 100 < constants.OBJECTION_TRIGGER) { utils.setRngState(cursor); engine.choose(c, o); }
    }
    assert.equal(state.S.actionChallenge?.type, "objection", "the fixture opened a hearing");
    assert.equal(state.S.actionChallenge.cost, 0);
    /* A free hearing must not become a hole every board climbs through. The
       floor lives in one place, and exactly one caller is allowed to lower it. */
    const engineSource = readFileSync("src/game/engine.js", "utf8");
    assert.match(engineSource, /function validActionChallengeBase\(ch,day,phases,minCost=\.5\)/,
      "the cost floor defaults to half an hour");
    assert.match(engineSource, /ch\.cost<minCost/, "and the floor is what the check uses");
    const lowered = [...engineSource.matchAll(/validActionChallengeBase\(([^)]*)\)/g)]
      .map(m => m[1].split(",").map(a => a.trim()))
      .filter(args => args.length === 4 && !args[3].startsWith("minCost"))
      .map(args => args[3]);
    assert.deepEqual(lowered, ["OBJECTION_HOURS"], "only the hearing lowers it");
  }

  // ---- EVERY COURTROOM CAN BE TRIED ----
  /* Trials shipped with two hand-written courtrooms, which meant a career saw
     the same two juries. Now every court filing carries one — authored where
     one was written, generated from the file's own facts otherwise. */
  {
    const pool = content.buildPool();
    const courts = pool.filter(c => c.tier === 2 || c.judge);
    assert.ok(courts.length >= 8, "the hand-written pool has real courtroom depth: " + courts.length);
    assert.ok(courts.every(c => c.trial), "every hand-written courtroom can go to a jury");
    const checkTrial = (t, where) => {
      assert.ok(Array.isArray(t.phases) && t.phases.length >= 3 && t.phases.length <= 7,
        where + ": a trial runs three to seven phases, not " + t.phases.length);
      assert.equal(t.phases[0].kind, "opening", where + ": a trial opens with an opening");
      assert.equal(t.phases.at(-1).kind, "closing", where + ": and ends with a closing");
      assert.ok(Number.isFinite(t.strength), where + ": a file walks in somewhere");
      for (const phase of t.phases) {
        if (phase.kind === "opposing") {
          /* A phase either carries one authored line or a pool the engine deals
             from by identity, so the same courtroom is not the same
             cross-examination twice. Both shapes have to be valid. */
          const lines = Array.isArray(phase.lines) ? phase.lines : [phase];
          assert.ok(lines.length >= 1, where + ": opposing counsel has something to say");
          for (const line of lines) {
            assert.ok(typeof line.text === "string" && line.text.length > 20,
              where + ": opposing counsel actually says something");
            assert.ok(line.bad === null || line.bad === undefined || trial.GROUND_IDS.includes(line.bad),
              where + ": an improper line names a ground you can actually pick");
          }
        } else {
          assert.ok(Array.isArray(phase.opts) && phase.opts.length >= 2,
            where + ": every turn is a real choice");
          assert.ok(phase.opts.some(o => o.weight === "strong"),
            where + ": and one of them is the right one");
          assert.ok(phase.opts.every(o => !o.flavor || ["bold", "technical"].includes(o.flavor)),
            where + ": argument flavour is bold or technical");
        }
      }
      // A trial where every line is objectionable teaches nothing about when to
      // stay seated, so both kinds have to be reachable across the pool.
      return t.phases.filter(p => p.kind === "opposing");
    };
    const countLines = (phases, tally) => {
      for (const p of phases) for (const line of (Array.isArray(p.lines) ? p.lines : [p]))
        line.bad ? tally.improper++ : tally.clean++;
      return tally;
    };
    const hand = { clean: 0, improper: 0 };
    for (const c of courts) countLines(checkTrial(c.trial, c.id), hand);
    const { clean, improper } = hand;
    assert.ok(improper > 0 && clean > 0,
      "hand-written trials teach both objecting and sitting still: " + improper + " improper / " + clean + " clean");
    // Generated courtrooms get the same treatment.
    utils.setSeed(31);
    let generatedCourts = 0, generatedClean = 0, generatedImproper = 0;
    for (let i = 0; i < 300; i++) {
      const filing = casegen.genCaseFrom(i % casegen.TEMPLATE_COUNT);
      if (!(filing.tier === 2 || filing.judge)) continue;
      generatedCourts++;
      assert.ok(filing.trial, "a generated courtroom can be tried too");
      const tally = countLines(checkTrial(filing.trial, filing.id), { clean: 0, improper: 0 });
      generatedClean += tally.clean; generatedImproper += tally.improper;
    }
    assert.ok(generatedCourts > 0 && generatedClean > 0 && generatedImproper > 0,
      "generated trials cover both as well");
    assert.ok(casegen.TEMPLATE_COUNT >= 24, "the template pool grew: " + casegen.TEMPLATE_COUNT);
    /* Opposing counsel is dealt, not scripted: the same courtroom in a different
       run must not be the same cross-examination. Every authored pool has to be
       reachable, which needs a properly mixed identity — indexing a short list
       with a raw hash lands on the same entry over and over. */
    for (const id of ["court1", "court2", "court8"]) {
      const source = content.buildPool().find(c => c.id === id);
      const combos = source.trial.phases
        .filter(p => p.kind === "opposing")
        .reduce((total, p) => total * (Array.isArray(p.lines) ? p.lines.length : 1), 1);
      assert.ok(combos >= 4, id + ": opposing counsel has more than one way to open");
      const seen = new Set();
      for (let run = 0; run < 80; run++) {
        fresh();
        engine.startGame("legacy", "medium");
        state.S.seed = (run * 2654435761) >>> 0;
        const c = engine.instantiateCase(content.buildPool().find(x => x.id === id));
        Object.assign(state.S, { inbox: [c], openCase: c, hours: 8, fatigue: 0, event: null,
          summary: null, pendingSummary: null, clients: [], nemesis: null, objective: null });
        engine.choose(c, c.opts.find(o => o.trial));
        seen.add(state.S.trial.phases.filter(p => p.kind === "opposing").map(p => p.text).join("|"));
      }
      assert.equal(seen.size, combos,
        id + ": every cross-examination the file can give is reachable — " + seen.size + "/" + combos);
    }
    // The reference card has to actually explain each ground.
    for (const g of trial.GROUNDS)
      assert.ok(typeof g.tell === "string" && g.tell.length > 25,
        g.id + ": the grounds card explains when to use it");
  }

  // ---- REPETITION ----
  /* Measured, not assumed: a favour fires on about a third of mornings — roughly
     ten a career — which made it the most-repeated screen in the game when every
     colleague asked for the same three things. The pools that a player sees MOST
     need to be the ones with the most in them. */
  {
    fresh();
    engine.startGame("legacy", "medium");
    const bodies = new Set(), options = new Set();
    for (const n of state.S.npcs) {
      for (let day = 1; day <= 9; day++) {
        const favor = npcs.buildFavor(n, day);
        assert.ok(favor, n.id + " has a favour to ask");
        bodies.add(favor.body);
        for (const o of favor.opts) options.add(o.text);
        assert.equal(favor.opts.length, 3, "a favour is still a three-way choice");
        assert.ok(favor.opts.some(o => o.relOk > 0), n.id + ": helping is worth something");
        assert.ok(favor.opts.some(o => o.relOk < 0), n.id + ": and declining costs something");
      }
    }
    assert.ok(bodies.size >= 12, "colleagues do not repeat the same ask: " + bodies.size);
    assert.ok(options.size >= 12,
      "and helping one colleague is not the same act as helping another: " + options.size);
    /* The written scenes were gated at rel 40, which favours alone can never
       reach — three of the four existed and were never seen. */
    /* Roughly ten favours a career spread over four colleagues means about two
       or three land on any one of them, at +10 each. The bar has to sit inside
       that, or the scenes behind it are written for nobody. */
    const favourReward = npcs.buildFavor(state.S.npcs[0], 1).opts
      .reduce((best, o) => Math.max(best, o.relOk || 0), 0);
    /* The bar was 40 — unreachable, so three of four scenes were written for
       nobody. It is not free to lower, either: paired soak cohorts put 25 at
       62.5% and 40 at 66.9%, because every extra scene is another event with a
       risky branch in it. 30 opens the content to a couple of colleagues without
       turning "help everyone" into the difficulty setting. */
    assert.ok(engine.STORY_AT <= favourReward * 3,
      "a colleague's scene is reachable by helping them: " + engine.STORY_AT +
      " needs " + Math.ceil(engine.STORY_AT / favourReward) + " favours");
    assert.ok(engine.STORY_AT > favourReward * 2,
      "and it still asks for a real pattern, not two errands: " + engine.STORY_AT);
    for (const n of state.S.npcs)
      assert.ok(npcs.buildStory(n), n.id + " has a scene behind that door");
    // A weekend comes round every five days; one fixed card meant seeing it every time.
    const weekends = new Set();
    for (let seed = 0; seed < 120; seed++) {
      utils.setSeed(seed);
      const w = content.buildWeekend();
      assert.equal(w.opts.length, 3);
      assert.ok(w.opts[0].fatigue < 0, "a weekend can always be spent resting");
      weekends.add(w.opts.map(o => o.text).join("|"));
    }
    assert.ok(weekends.size >= 6, "Saturdays differ: " + weekends.size);
    /* Errands and Saturdays are not legal plays. Tagging one technical or
       aggressive makes every system that reads style — coasting, judge memory,
       and any policy that picks by it — treat running an errand as trying a
       case, which measurably moved the win rate the first time it happened.
       `boldW` is the right way to mark a gamble here. */
    const LEGAL_STYLES = ["technical", "aggressive"];
    for (const n of state.S.npcs)
      for (const o of npcs.buildFavor(n, 1).opts)
        assert.ok(!LEGAL_STYLES.includes(o.style),
          "a favour is an errand, not a legal play: " + n.id + " / " + o.text.slice(0, 30));
    for (let seed = 0; seed < 60; seed++) {
      utils.setSeed(seed);
      for (const o of content.buildWeekend().opts)
        assert.ok(!LEGAL_STYLES.includes(o.style),
          "a Saturday is not a legal play: " + o.text.slice(0, 30));
    }
  }

  // ---- THE BENCH ----
  /* A relationship tilts a close call and never decides one — the user was
     explicit, and it is also the only way golf stays optional instead of a
     chore. Every effect here is bounded, and the bounds are the test. */
  {
    assert.ok(judges.caseModifier(judges.REL_MAX) <= 4 && judges.caseModifier(judges.REL_MIN) >= -4,
      "a bench can move a play by at most four points");
    assert.ok(judges.juryModifier(judges.REL_MAX) <= 2, "and a jury swing by at most two");
    assert.equal(judges.caseModifier(0), 0, "an indifferent bench changes nothing");
    // A clean bench cannot be bought at any price; a corrupt one is still a bad bet.
    const clean = content.JUDGES.find(j => j.corrupt <= 10);
    const dirty = content.JUDGES.find(j => j.corrupt >= 85);
    assert.equal(judges.bribeChance(clean, judges.BRIBE_MAX), 0, "some benches are not for sale");
    assert.ok(judges.bribeChance(dirty, judges.BRIBE_MAX) <= judges.BRIBE_CEILING,
      "and the rest are never a strategy");
    assert.ok(judges.bribeChance(dirty, 2000) < judges.bribeChance(dirty, 10000),
      "more money buys more chance");
    assert.ok(judges.bribeChance(dirty, 20000) - judges.bribeChance(dirty, 10000) <
      judges.bribeChance(dirty, 10000) - judges.bribeChance(dirty, 2000),
      "with diminishing returns, so there is no number that solves a judge");
    // Traits are readable in both directions.
    assert.equal(judges.frivolousMultiplier(content.JUDGES.find(j => judges.traitOf(j) === "stickler")), 2);
    assert.equal(judges.frivolousMultiplier(content.JUDGES.find(j => judges.traitOf(j) === "patient")), .5);
    assert.ok(content.JUDGES.every(j => judges.traitOf(j)), "every judge has a temperament");

    fresh();
    engine.startGame("legacy", "medium");
    /* A fresh record has lastGolfDay 0, which must read as "never played" rather
       than "played on day zero" — the first version locked the very first
       invitation of a career behind a four-day cooldown. */
    const crane = content.JUDGES.find(j => j.id === "crane");
    state.S.money = 5000;
    assert.equal(engine.canGolf(crane), true, "you can invite a judge on day one");
    assert.equal(engine.inviteToGolf(crane), true);
    assert.equal(state.S.event.id, "golf");
    assert.equal(state.S.benchOpen, false, "the afternoon happens away from the panel");
    engine.resolveCrisis(state.S.event.opts[0]);
    assert.ok(engine.judgeRelation(crane) > 0, "a quiet round is worth something");
    assert.equal(engine.canGolf(crane), false, "and you cannot do it again tomorrow");

    const judge = content.JUDGES.find(j => j.id === "fairway");
    assert.equal(engine.judgeRelation(judge), 0);
    assert.equal(engine.judgeRelationLabel(judge), "CORDIAL");
    engine.adjustJudgeRel(judge, 40);
    assert.equal(engine.judgeRelationLabel(judge), "WARM");
    assert.equal(judges.judgeRelValidationError(state.S.judgeRel, state.S.day,
      new Set(content.JUDGES.map(j => j.id))), null);
    // A refused bribe is the expensive outcome: money gone, bench burned, and
    // the profession hears about it twice.
    state.S.money = 20000;
    const heatBefore = state.S.barHeat.heat;
    utils.setSeed(1);
    let refusedSeed = 0;
    for (let seed = 1; seed < 500 && !refusedSeed; seed++) {
      utils.setSeed(seed);
      if (utils.rand() * 100 >= judges.bribeChance(judge, 5000)) refusedSeed = seed;
    }
    utils.setSeed(refusedSeed);
    assert.equal(engine.offerBribe(judge, 5000), true);
    assert.equal(engine.judgeRelBurned(judge), true, "a refusal burns the bench");
    assert.ok(engine.judgeRelation(judge) < 0, "and the relationship collapses");
    assert.ok(state.S.barHeat.heat > heatBefore + ethics.BAR_WEIGHTS.bribe,
      "the bar hears about a refusal twice over");
    assert.equal(state.S.money, 15000, "the money is gone either way");
    // Bribery is refused outside its own bounds, and while anything is open.
    assert.equal(engine.offerBribe(judge, judges.BRIBE_MIN - 1), false);
    assert.equal(engine.offerBribe(judge, judges.BRIBE_MAX + 1), false);
    assert.equal(engine.offerBribe(judge, 999999), false, "you cannot offer money you do not have");
    // A save carrying an impossible bench record is refused.
    assert.ok(judges.judgeRelValidationError({ [judge.id]: { ...judges.emptyRel(), rel: 500 } },
      5, new Set(content.JUDGES.map(j => j.id))), "an out-of-range relationship is refused");
    assert.ok(judges.judgeRelValidationError({ nobody: judges.emptyRel() },
      5, new Set(content.JUDGES.map(j => j.id))), "an unknown judge is refused");
    assert.ok(judges.judgeRelValidationError({ [judge.id]: { ...judges.emptyRel(), burned: true } },
      5, new Set(content.JUDGES.map(j => j.id))), "a bench cannot be burned without cause");
  }
  /* The one ruling a relationship changes: right about the substance, wrong
     about the label. Being flatly wrong is never rescued. */
  {
    fresh();
    engine.startGame("legacy", "medium");
    utils.setSeed(11);
    const c = engine.instantiateCase(content.buildPool().find(x => x.id === "court2"));
    Object.assign(state.S, { inbox: [c], openCase: c, hours: 8, fatigue: 0, event: null,
      summary: null, pendingSummary: null, clients: [], nemesis: null, objective: null });
    engine.adjustJudgeRel(c.judge, judges.MERCY_AT);
    engine.choose(c, c.opts.find(o => o.trial));
    engine.trialPlay(0);
    const phase = trial.trialPhase(state.S.trial);
    assert.equal(phase.kind, "opposing");
    const before = state.S.trial.jury;
    // Wrong ground on a genuinely improper argument, in front of a bench that
    // knows you: sustained anyway.
    const wrong = trial.GROUND_IDS.find(g => g !== phase.bad);
    engine.trialObject(wrong);
    assert.equal(state.S.trial.sustained, 1, "a warm bench fixes the label for you");
    assert.ok(state.S.trial.jury > before);
  }

  // ---- TRIAL ----
  /* The whole feature rests on one promise: no number reaches the screen. A
     jury standing is built from decisions and rolled once, and every guard here
     exists because breaking that promise silently would still "work". */
  {
    for (const file of ["src/components/TrialOverlay.jsx"]) {
      const src = readFileSync(file, "utf8");
      assert.ok(!/\{\s*(trial\.)?jury\s*\}/.test(src), file + " must never print the jury standing");
      assert.ok(!/verdictChance/.test(src), file + " must not compute odds");
    }
    // The option itself carries no odds, and chance() refuses to invent one.
    fresh();
    engine.startGame("legacy", "medium");
    utils.setSeed(11);
    const c = engine.instantiateCase(content.buildPool().find(x => x.id === "court2"));
    const option = c.opts.find(o => o.trial);
    assert.ok(option, "a file with a trial offers it");
    assert.equal(option.base, undefined, "a trial has no base chance");
    assert.equal(engine.chance(option, c), null, "and chance() refuses to invent one");
    assert.equal(option.style, "trial");
    // Opening a trial costs hours up front and suspends the desk.
    Object.assign(state.S, { inbox: [c], openCase: c, hours: 8, fatigue: 0, event: null,
      summary: null, pendingSummary: null, clients: [], nemesis: null, objective: null });
    engine.choose(c, option);
    assert.ok(state.S.trial, "the trial opened");
    assert.equal(engine.isPaused(), true, "and the desk is suspended while it runs");
    assert.ok(state.S.hours < 8, "the day was billed for it");
    assert.equal(c.trialInProgress, c.trial.id, "the file is marked as being tried");
    assert.equal(trial.trialValidationError(state.S.trial, state.S.day), null);
    const opened = state.S.trial.jury;
    // The standing starts from the FILE, not from a constant.
    assert.ok(opened > trial.JURY_START_MIN && opened < trial.JURY_START_MAX,
      "a strong file walks in ahead: " + opened);
    // Playing a strong line moves it up; a weak one moves it down.
    const phase = trial.trialPhase(state.S.trial);
    const strong = phase.opts.findIndex(o => o.weight === "strong");
    engine.trialPlay(strong);
    assert.ok(state.S.trial.jury > opened, "a strong opening is worth something");
    assert.equal(state.S.trial.strongPlays, 1);
    // Objections: right ground helps, wrong ground hurts, and silence on a
    // proper argument is free. Missing an improper one is the only punished silence.
    const objPhase = trial.trialPhase(state.S.trial);
    assert.equal(objPhase.kind, "opposing");
    const beforeObj = state.S.trial.jury;
    engine.trialObject(objPhase.bad);
    assert.ok(state.S.trial.jury > beforeObj, "the right ground is sustained");
    assert.equal(state.S.trial.sustained, 1);
    // A bogus ground is refused outright rather than silently scored.
    const step = state.S.trial.step;
    engine.trialObject("not-a-ground");
    assert.equal(state.S.trial.step, step, "an unknown ground resolves nothing");
    // Save and reload mid-trial: the standing and the record survive exactly.
    engine.saveGame();
    const mid = JSON.parse(JSON.stringify(state.S.trial));
    assert.equal(engine.loadGame(engine.getSlot()), true, "a trial survives a reload");
    assert.deepEqual(state.S.trial, mid);
    // A trial with no case behind it is refused.
    const raw = JSON.parse(localStorage.getItem(constants.SAVE_KEY + "_s" + engine.getSlot()));
    raw.trial = { ...raw.trial, caseId: "nothing-here" };
    localStorage.setItem(constants.SAVE_KEY + "_s" + engine.getSlot(), JSON.stringify(raw));
    assert.notEqual(engine.inspectSave(engine.getSlot()).status, "ready",
      "a trial without its file is refused");
  }
  /* The verdict is the standing — no second hidden check — and both a well-run
     and a badly-run trial have to be reachable, or the whole thing is theatre. */
  {
    const play = (caseId, good) => {
      fresh();
      engine.startGame("legacy", "medium");
      utils.setSeed(7);
      const c = engine.instantiateCase(content.buildPool().find(x => x.id === caseId));
      Object.assign(state.S, { inbox: [c], openCase: c, hours: 8, fatigue: 0, event: null,
        summary: null, pendingSummary: null, clients: [], nemesis: null, objective: null });
      engine.choose(c, c.opts.find(o => o.trial));
      let guard = 0, offers = 0;
      while (state.S.trial && guard++ < 30) {
        const t = state.S.trial, phase = trial.trialPhase(t);
        if (t.offer != null) { offers++; engine.trialSettle(false); continue; }
        if (phase.kind === "opposing") engine.trialObject(good ? (phase.bad || null) : "leading");
        else {
          const want = good ? "strong" : "weak";
          const index = phase.opts.findIndex(o => o.weight === want);
          engine.trialPlay(index < 0 ? 0 : index);
        }
      }
      return { result: state.S.trialResult, offers };
    };
    const well = play("court1", true), badly = play("court1", false);
    assert.ok(well.result && badly.result, "both trials reached a verdict");
    assert.ok(well.result.jury > badly.result.jury + 20,
      "how you try it decides the case: " + well.result.jury + " vs " + badly.result.jury);
    assert.ok(well.result.jury <= trial.JURY_MAX, "a jury is never a certainty");
    assert.ok(badly.result.jury >= trial.JURY_MIN, "and never a foregone conclusion either");
    /* One offer per trial, and only when the player put them there. A pure
       threshold meant a strong file produced an offer after any decent opening,
       which read as a reward for the file rather than for the advocacy; and a
       refusal that reopened the door let the player poll the hidden standing. */
    assert.ok(well.offers <= 1, "they ask once, and a refusal is final: " + well.offers);
    assert.equal(badly.offers, 0, "and they do not blink at someone who is losing");
    // A strong file is not enough on its own: you have to improve it.
    fresh();
    engine.startGame("legacy", "medium");
    utils.setSeed(5);
    const strongFile = engine.instantiateCase(content.buildPool().find(x => x.id === "court8"));
    Object.assign(state.S, { inbox: [strongFile], openCase: strongFile, hours: 8, fatigue: 0,
      event: null, summary: null, pendingSummary: null, clients: [], nemesis: null, objective: null });
    engine.choose(strongFile, strongFile.opts.find(o => o.trial));
    const opened = state.S.trial.jury;
    assert.equal(state.S.trial.startJury, opened, "the trial remembers what it walked in with");
    assert.ok(opened >= trial.OFFER_AT - 8,
      "the fixture really is a strong file: " + opened);
    // Play the weakest line available and confirm no offer appears.
    const weakPhase = trial.trialPhase(state.S.trial);
    const weakest = weakPhase.opts.findIndex(o => o.weight === "weak");
    engine.trialPlay(weakest < 0 ? 0 : weakest);
    assert.equal(state.S.trial.offer, null, "a strong file alone does not make them blink");
    /* The improvement requirement is what stops a strong file from producing an
       offer the player did not earn, so it has to bite on a file that already
       opens near the threshold — test the rule, not one fixture's arithmetic. */
    assert.ok(trial.OFFER_GAIN > 0, "an offer has to be earned, not inherited");
    const floorFor = start => Math.max(trial.OFFER_AT, start + trial.OFFER_GAIN);
    assert.ok(floorFor(trial.OFFER_AT) > trial.OFFER_AT,
      "a file that opens at the threshold still has to be improved");
    assert.equal(floorFor(20), trial.OFFER_AT, "and a weak file is not held to a higher bar");
  }

  // ---- BAR DISCIPLINE ----
  /* The heat is hidden by design, which puts all the weight on two things: the
     letters must arrive in order (they are the only readout the player gets),
     and the meter must never leak into the UI during a career. */
  {
    const clean = ethics.createBarHeat();
    assert.equal(ethics.barValidationError(clean, 1), null);
    assert.equal(ethics.barRecord(clean), null, "a clean career has no bar file to show");
    for (let i = 1; i < ethics.BAR_STAGE_AT.length; i++)
      assert.ok(ethics.BAR_STAGE_AT[i] > ethics.BAR_STAGE_AT[i - 1], "stages escalate");
    assert.ok(ethics.BAR_WEIGHTS.caught > ethics.BAR_WEIGHTS.obstruction &&
      ethics.BAR_WEIGHTS.obstruction > ethics.BAR_WEIGHTS.bribe,
      "getting caught inside is the worst thing on the list");
    for (const file of ["src/components/StatsPanel.jsx", "src/components/Topbar.jsx",
      "src/components/CasePane.jsx", "src/components/InfoOverlay.jsx", "src/components/Inbox.jsx"])
      assert.ok(!/barHeat/.test(readFileSync(file, "utf8")), file + " must not reveal the hidden heat");
    assert.ok(ethics.barValidationError({ ...clean, heat: 90, stage: 3, violations: 0 }, 5),
      "a full meter with no violations is refused");
    assert.ok(ethics.barValidationError({ ...clean, heat: 10, stage: 3 }, 5),
      "a stage cannot outrun its heat");
    assert.ok(ethics.barValidationError({ ...clean, pendingKind: "discipline", pendingDay: 0 }, 5),
      "a pending letter must have a day");
    assert.ok(ethics.barValidationError({ ...clean, sneaky: 1 }, 5), "unknown fields are refused");
    for (let stage = 1; stage <= ethics.BAR_STAGE_MAX; stage++) {
      const ev = ethics.buildBarEvent({ ...clean, stage });
      assert.equal(ev.barStage, stage);
      assert.equal(ev.opts[0].base, 100, "stage " + stage + " always has a way through");
      assert.ok(ev.opts.every(o => !o.ok.disbar), "no winning branch is fatal");
      const fatal = ev.opts.filter(o => o.fail && o.fail.disbar).length;
      assert.equal(fatal, stage === ethics.BAR_STAGE_MAX ? 1 : 0,
        "only the hearing can take the licence");
      assert.equal(ethics.barEventValidationError(ev, { ...clean, stage }), null);
      assert.ok(ethics.barEventValidationError({ ...ev, body: "tampered" }, { ...clean, stage }),
        "an altered confrontation is refused");
    }
  }
  /* End to end: violations heat the file, the letters arrive one rung at a time,
     and only the last one can end the career. A burst that jumps two thresholds
     must not skip the middle letter — that would silently delete a warning. */
  {
    fresh();
    engine.startGame("legacy", "medium");
    const bar = () => state.S.barHeat;
    engine.recordBarViolation("caught");
    assert.deepEqual([bar().heat, bar().caught, bar().violations],
      [ethics.BAR_WEIGHTS.caught, 1, 1]);
    // Enough recorded violations to justify a full meter — the heat can never
    // exceed what the tally could have produced, so the fixture earns it.
    for (let i = 0; i < 5; i++) engine.recordBarViolation("caught");
    const stages = [];
    for (let i = 0; i < 4; i++) {
      state.S.event = null;
      bar().pendingKind = null; bar().pendingDay = 0;
      bar().heat = ethics.BAR_STAGE_AT[3] + ethics.BAR_DECAY;
      if (engine.runBarTick()) stages.push(state.S.event.barStage);
    }
    assert.deepEqual(stages, [1, 2, 3], "the letters arrive in order, none skipped");
    state.S.event = engine.buildBarConfrontation();
    assert.equal(state.S.event.barStage, 3);
    assert.equal(state.S.event.opts[2].fail.disbar, true, "the reckless branch is the only door out");
    assert.match(ethics.barRecord(bar()), /caught inside/, "the file is readable once it is over");
    // FRAUD routes bar attention into the credentials ladder instead of running
    // a second investigation beside it.
    fresh();
    engine.startGame("fraud", "medium");
    engine.recordBarViolation("caught");
    engine.recordBarViolation("caught");   // earn the heat the same way a player would
    state.S.barHeat.heat = ethics.BAR_STAGE_AT[1] + ethics.BAR_DECAY;
    state.S.barHeat.pendingKind = null;
    const before = state.S.fraudRisk.suspicion;
    assert.equal(engine.runBarTick(), false, "Fraud never opens a bar confrontation");
    assert.equal(state.S.fraudRisk.suspicion, before + 1, "it feeds the credentials ladder instead");
    assert.equal(state.S.event, null);
  }

  // ---- SAVE AND STEP OUT ----
  /* Swapping slots used to mean reloading the page. Quitting has to write the
     save FIRST and only then drop the run, and IRONMAN — which keeps no save by
     design — must not be offered a door that leads nowhere. */
  engine.startGame("debtor", "hard");
  state.S.day = 4;
  assert.equal(engine.canQuitToMenu(), true);
  assert.equal(engine.quitToMenu(), true, "a standard career can step out");
  assert.equal(state.S, null, "and the desk is cleared");
  assert.equal(engine.canQuitToMenu(), false, "with no run there is nothing to quit");
  assert.equal(engine.quitToMenu(), false);
  const parked = engine.peekSave(engine.getSlot());
  assert.equal(parked.scenario, "debtor");
  assert.equal(parked.day, 4, "the save holds the day you left on");
  engine.loadGame(engine.getSlot());
  assert.equal(state.S.day, 4, "and it comes back where it was");
  engine.startGame("legacy", "medium", "ironman");
  assert.equal(engine.canQuitToMenu(), false, "ironman is never offered the door");
  assert.equal(engine.quitToMenu(), false, "and cannot walk through it anyway");
  assert.ok(state.S, "the ironman career survives the attempt");
  const settingsSource = readFileSync("src/components/SettingsOverlay.jsx", "utf8");
  assert.match(settingsSource, /canQuitToMenu\(\)\s*\n?\s*\?/, "the UI asks before offering the button");

  // ---- DEV TOOLS STAY OUT OF THE GAME ----
  // The dev panel is repo-resident but must never ship. Vite only drops it if
  // every reference is behind import.meta.env.DEV and no shipped module imports
  // it, so that discipline is the thing worth testing.
  const devAppSource = readFileSync("src/App.jsx", "utf8");
  assert.match(devAppSource, /import\.meta\.env\.DEV\s*&&\s*devOpen\s*&&\s*<DevPanel/,
    "the dev panel renders only behind the dev flag");
  assert.match(devAppSource, /if\(!import\.meta\.env\.DEV\) return;/,
    "and its hotkey is installed only in dev");
  const shipped = ["src/game/engine.js", "src/game/state.js", "src/game/content.js", "src/game/casegen.js",
    "src/game/minigames.js", "src/components/CasePane.jsx", "src/components/StatsPanel.jsx",
    "src/components/ActionMinigameOverlay.jsx", "src/components/Topbar.jsx"];
  for (const file of shipped)
    assert.ok(!/from ".*devtools\.js"/.test(readFileSync(file, "utf8")),
      file + " must not import the dev tools");
  // devtools drives the real engine instead of reimplementing rules, so the
  // panel can never show behaviour a player would not get.
  const devSource = readFileSync("src/game/devtools.js", "utf8");
  assert.match(devSource, /import \* as engine from "\.\/engine\.js"/, "dev tools drive the real engine");
  assert.ok(!/Math\.random/.test(devSource), "dev tools respect the deterministic RNG rule");

  // ---- CONTENT DEPTH ----
  // Every template must be playable on its own terms: a guaranteed way out, at
  // least one risky read, and a clue long enough to actually be read. Adding
  // content should never be able to smuggle in a broken filing.
  fresh("daily");
  utils.setSeed(31337);
  const skeletons = new Set();
  for (let i = 0; i < 4000; i++) {
    const c = casegen.genCase();
    skeletons.add(c.title.replace(/[A-Z][a-z]+( [A-Z][a-z&.']+)*/g, "X").replace(/[0-9]+/g, "N"));
    assert.ok(c.opts.some(o => o.safe), "every filing keeps a guaranteed way out");
    assert.ok(c.opts.some(o => !o.safe && !o.action), "and at least one risky read");
    // Errands are chores, not puzzles; the reading contract is for real files.
    if ((c.tier || 0) >= 1) assert.ok(c.body.length > 180, "the clue needs room to hide in: " + c.title);
    assert.ok(Number.isFinite(c.deadline) && c.deadline >= 1, "every filing is due sometime");
  }
  // The docket is the reason to read; too few distinct arguments and players
  // stop reading and start pattern-matching.
  assert.ok(skeletons.size >= 40, "the generator offers " + skeletons.size + " distinct filings");

  // ---- DATE INDEPENDENCE ----
  // DAILY takes its scenario from the calendar, so a suite that hardcodes any
  // scenario-scaled number silently rots overnight. This has bitten three
  // times; it is now an invariant with a test behind it.
  const scenarioToil = {};
  for (const scenario of ["fraud", "debtor", "legacy", "defector", "boomerang"]) {
    engine.startGame(scenario, "easy", "standard");
    scenarioToil[scenario] = progression.applyEnduranceToWorkFatigue(7, state.S.progression, scenario);
  }
  assert.ok(new Set(Object.values(scenarioToil)).size > 1,
    "scenarios really do scale work fatigue differently — derived expectations are mandatory");
  const suiteSource = readFileSync("scripts/v195-check.mjs", "utf8");
  const hardcodedFatigue = suiteSource
    .split("\n")
    .filter(line => /state\.S\.fatigue/.test(line) && /\[[^\]]*\b(?:6|7|8|9)\b/.test(line) && !/toil\(/.test(line) && !/fatigue-literal-ok/.test(line));
  assert.deepEqual(hardcodedFatigue, [],
    "work-fatigue expectations must be derived through toil(), never written as a literal");

  // The desktop build must open with no network at all: a Steam player on a plane
  // still needs the pixel font, and an 8px layout falls apart in monospace.
  const stylesSource = readFileSync("src/styles.css", "utf8");
  assert.doesNotMatch(stylesSource, /@import[^;]*https?:/,
    "styles.css must not pull a stylesheet off the network");
  assert.doesNotMatch(stylesSource, /url\(\s*['"]?https?:/,
    "every font and image styles.css references must ship with the game");
  const fontRefs = [...stylesSource.matchAll(/url\(\s*['"]?(\.\/[^'")]+\.woff2)['"]?\s*\)/g)].map(m => m[1]);
  assert.ok(fontRefs.length >= 1, "Press Start 2P has to be declared from a local file");
  for (const ref of fontRefs) {
    assert.ok(existsSync(join("src", ref.replace(/^\.\//, ""))),
      `styles.css points at ${ref}, which is not in the repo — the build would ship a broken font`);
  }
  for (const host of ["fonts.googleapis.com", "fonts.gstatic.com"]) {
    assert.ok(!readFileSync("index.html", "utf8").includes(host),
      `index.html CSP still allows ${host}; the font is local now`);
  }

  // Every module that persists anything goes through store.js, so the desktop
  // build can put it in a file Steam Cloud syncs. A stray localStorage call
  // would silently keep that key out of the cloud.
  for (const file of ["src/game/engine.js", "src/game/achievements.js",
                      "src/game/settings.js", "src/game/intro.js"]) {
    const src = readFileSync(file, "utf8").replace(/^\s*\/\/.*$/gm, "");
    assert.doesNotMatch(src, /\blocalStorage\s*\./,
      `${file} must persist through store.js, not localStorage directly`);
  }

  // The file store behind the desktop build: round trip, atomic replace, a
  // missing folder reading as a fresh install, and unknown keys refused.
  {
    const dir = mkdtempSync(join(tmpdir(), "fo-store-"));
    const target = join(dir, "saves");
    const fileStore = createFileStore(target);
    const fresh = fileStore.readAll();
    assert.deepEqual(fresh, { ok: true, data: {} }, "a first launch is not a failure");
    assert.equal(fileStore.write("fo_save_v1_s1", '{"day":3}'), null);
    assert.deepEqual(fileStore.readAll().data, { fo_save_v1_s1: '{"day":3}' });
    assert.equal(fileStore.write("fo_save_v1_s1", '{"day":4}'), null);
    assert.deepEqual(fileStore.readAll().data, { fo_save_v1_s1: '{"day":4}' },
      "a second write replaces the file rather than appending");
    assert.deepEqual(readdirSync(target).filter(n => n.endsWith(".tmp")), [],
      "the temp file used for the atomic rename must not survive");
    assert.ok(fileStore.write("../escape", "x"), "a key outside the store is refused");
    assert.ok(fileStore.remove("../escape"), "so is removing one");
    assert.equal(fileStore.remove("fo_save_v1_s1"), null);
    assert.deepEqual(fileStore.readAll().data, {});
    rmSync(dir, { recursive: true, force: true });
  }

  // ...and the shell actually wires that store to the renderer. The smoke path
  // (preload -> ipc -> store) is verified by hand; this keeps the three seams
  // from being renamed apart.
  {
    const mainSource = readFileSync("electron/main.js", "utf8");
    const preloadSource = readFileSync("electron/preload.js", "utf8");
    for (const channel of ["fo-store:read-all", "fo-store:write", "fo-store:remove"]) {
      assert.ok(mainSource.includes(`ipcMain.on("${channel}"`), `main.js must serve ${channel}`);
      assert.ok(preloadSource.includes(`"${channel}"`), `preload.js must call ${channel}`);
    }
    assert.match(mainSource, /createFileStore\(path\.join\(app\.getPath\("userData"\)/,
      "the desktop store must live in userData, where Steam Cloud can be pointed at it");
    assert.match(preloadSource, /contextBridge\.exposeInMainWorld\("foStore"/,
      "the renderer reaches the store only through the context bridge");
    assert.doesNotMatch(preloadSource, /\brequire\(\s*['"](?:fs|path)['"]/,
      "the preload is sandboxed: file work belongs in the main process");
  }

  // Production CSP has no loopback WebSocket escape hatch; Vite adds it only in dev.
  const indexHtml = readFileSync("index.html", "utf8");
  const viteConfig = readFileSync("vite.config.mjs", "utf8");
  const appSource = readFileSync("src/App.jsx", "utf8");
  assert.match(indexHtml, /connect-src 'self';/);
  assert.doesNotMatch(indexHtml, /ws:\/\/(?:localhost|127\.0\.0\.1|\[::1\])/);
  assert.match(viteConfig, /ws:\/\/localhost:\*/);
  assert.match(viteConfig, /script-src 'self' 'unsafe-inline'/);
  assert.ok(appSource.indexOf("if(S.actionChallenge) return")>=0&&
    appSource.indexOf("if(S.actionChallenge) return")<appSource.indexOf("if(S.summary)"),
    "the minigame must own keyboard input before case/event shortcuts run");

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

  console.log("v1.9.5–v1.9.25 checks passed: privilege review (two-sided failure/sanction/reload/tamper/v21), objection window (transcript/strict bench/reload/tamper/v20), lockpick tension/snap (one pick at rank 0, SNEAKY buys more, legacy hand-back), first-run walkthrough, sharpened sabotage circuits (curve/legacy boards/v18), Contradiction Board prep (deal/attempts/partial/tamper/v17), Evidence Timeline prep + cold-entry penalty (deal/reload/tamper/migration/scope), safe-route pricing (coasting/hours/v16), Fraud identity pressure/morning continuation, progression/skills, lockpick/Power Cut minigames, balance experiments, Final Warning, Friday/Exceptional Review promotions, delegation cap, strict saves/migrations, procedural IDs, long-run integrity, FIRM payroll, rolling judge memory/DAILY, endings, Client War integrity, CSP, 20 starts");
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
