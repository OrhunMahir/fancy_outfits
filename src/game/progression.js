// Pure, bounded character progression. This module never reads or mutates the
// global game state and never consumes RNG, so DAILY runs and save validation
// can use it without changing the underlying case-outcome sequence.

export const PROGRESSION_VERSION=1;
export const MIN_LEVEL=1;
export const MAX_LEVEL=8;
export const MIN_SKILL=0;
export const MAX_SKILL=5;

// Index = level - 1. XP is capped at the final threshold; reaching the cap
// grants seven allocatable points in total (one for each level gained).
export const XP_THRESHOLDS=Object.freeze([0,50,120,210,320,450,600,780]);
export const XP_CAP=XP_THRESHOLDS[XP_THRESHOLDS.length-1];

export const SKILL_IDS=Object.freeze(["sneaky","endurance"]);
export const SKILLS=Object.freeze({
  sneaky:Object.freeze({
    id:"sneaky",
    name:"SNEAKY",
    desc:"More forgiving covert tools and slower timing challenges.",
  }),
  endurance:Object.freeze({
    id:"endurance",
    name:"ENDURANCE",
    desc:"Reduces positive fatigue gained from work.",
  }),
});

const freezeProfile=(sneaky,endurance)=>Object.freeze({sneaky,endurance});

// These are innate scenario ranks, not spendable points. Earned allocations
// are tracked separately, which keeps the one-point-per-level invariant exact.
export const SCENARIO_STARTING_SKILLS=Object.freeze({
  fraud:freezeProfile(2,0),       // forged credentials, practiced access
  debtor:freezeProfile(0,2),      // years of working through pressure
  legacy:freezeProfile(0,0),      // talented connections, little hard living
  defector:freezeProfile(1,1),    // knows both firms' corridors and routines
  boomerang:freezeProfile(1,1),   // knows the building, but carries old wear
});

// Scenario identity changes only work-generated fatigue. Rest, coffee,
// incidents and explicit narrative penalties remain outside this helper.
export const SCENARIO_FATIGUE_BASE=Object.freeze({
  fraud:1,
  debtor:.90,
  legacy:1.15,
  defector:1,
  boomerang:1.05,
});

export const ENDURANCE_REDUCTION_PER_RANK=.06;
export const FATIGUE_MULTIPLIER_MIN=.65;
export const FATIGUE_MULTIPLIER_MAX=1.25;

export const SNEAKY_LOCK_TOLERANCE_PER_RANK=1;
export const SNEAKY_LOCK_ATTEMPT_RANKS=Object.freeze([2,5]);
export const SNEAKY_RING_SPEED_REDUCTION_PER_RANK=.07;
export const SNEAKY_POWER_SCORE_PER_RANK=100/MAX_SKILL;

// XP is awarded only at terminal/reveal points. Keeping the table here makes
// it deterministic and lets tests/UI inspect the same progression contract.
export const CASE_XP=Object.freeze({
  safe:Object.freeze([3,5,7]),
  win:Object.freeze([5,8,12]),
  loss:Object.freeze([3,5,7]),
});
export const DELEGATED_XP=Object.freeze({
  win:Object.freeze([1,3,4]),
  loss:Object.freeze([0,1,2]),
});
export const COVERT_XP=Object.freeze({success:12,escape:4,caught:4});
export const CRISIS_XP=Object.freeze({safe:6,win:8,loss:4});

const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));

export function isProgressionScenario(scenario){
  return typeof scenario==="string"&&own(SCENARIO_STARTING_SKILLS,scenario);
}

export function startingSkillsFor(scenario){
  if(!isProgressionScenario(scenario)) throw new RangeError("Unknown progression scenario: "+scenario);
  return {...SCENARIO_STARTING_SKILLS[scenario]};
}

export function createProgression(scenario){
  return {
    version:PROGRESSION_VERSION,
    xp:0,
    level:MIN_LEVEL,
    skillPoints:0,
    skills:startingSkillsFor(scenario),
  };
}

export function levelForXp(value){
  const xp=clamp(Number.isFinite(value)?Math.trunc(value):0,0,XP_CAP);
  let level=MIN_LEVEL;
  for(let i=1;i<XP_THRESHOLDS.length;i++){
    if(xp<XP_THRESHOLDS[i]) break;
    level=i+1;
  }
  return level;
}

export function xpForLevel(level){
  const bounded=clamp(Number.isFinite(level)?Math.trunc(level):MIN_LEVEL,MIN_LEVEL,MAX_LEVEL);
  return XP_THRESHOLDS[bounded-1];
}

// Compact UI contract for a progress bar and "N XP TO LEVEL X" copy.
export function progressionInfo(progressionOrXp){
  const raw=typeof progressionOrXp==="number"?progressionOrXp:progressionOrXp?.xp;
  const xp=clamp(Number.isFinite(raw)?Math.trunc(raw):0,0,XP_CAP);
  const level=levelForXp(xp);
  const floor=xpForLevel(level);
  const atCap=level===MAX_LEVEL;
  const nextXp=atCap?null:xpForLevel(level+1);
  const span=atCap?0:nextXp-floor;
  return {
    xp,
    level,
    atCap,
    levelFloorXp:floor,
    nextLevel:atCap?null:level+1,
    nextLevelXp:nextXp,
    xpIntoLevel:atCap?0:xp-floor,
    xpForLevel:span,
    xpToNext:atCap?0:nextXp-xp,
    progress:atCap?1:(xp-floor)/span,
  };
}

// Returns a new progression object and a small event payload for the engine.
// Negative/non-finite awards are intentionally treated as zero: XP never falls.
export function addXp(progression,amount){
  const award=Math.max(0,Number.isFinite(amount)?Math.trunc(amount):0);
  const oldXp=clamp(Number.isFinite(progression?.xp)?Math.trunc(progression.xp):0,0,XP_CAP);
  const oldLevel=levelForXp(oldXp);
  const xp=Math.min(XP_CAP,oldXp+award);
  const level=levelForXp(xp);
  const levelsGained=level-oldLevel;
  const skillPoints=Math.max(0,Number.isInteger(progression?.skillPoints)?progression.skillPoints:0)+levelsGained;
  const next={
    ...progression,
    version:PROGRESSION_VERSION,
    xp,
    level,
    skillPoints,
    skills:{...(progression?.skills||{})},
  };
  return {
    progression:next,
    xpGained:xp-oldXp,
    levelsGained,
    pointsGained:levelsGained,
    atCap:level===MAX_LEVEL,
  };
}

export function getSkillRank(progression,skillId){
  if(!SKILL_IDS.includes(skillId)) return 0;
  const value=progression?.skills?.[skillId];
  return clamp(Number.isFinite(value)?Math.trunc(value):0,MIN_SKILL,MAX_SKILL);
}

// Failed allocations preserve object identity, making double-clicks harmless.
export function allocateSkill(progression,skillId){
  if(!SKILL_IDS.includes(skillId)) return {progression,spent:false,reason:"unknown_skill"};
  if(!Number.isInteger(progression?.skillPoints)||progression.skillPoints<1)
    return {progression,spent:false,reason:"no_points"};
  const rank=getSkillRank(progression,skillId);
  if(rank>=MAX_SKILL) return {progression,spent:false,reason:"skill_capped"};
  return {
    progression:{
      ...progression,
      skillPoints:progression.skillPoints-1,
      skills:{...progression.skills,[skillId]:rank+1},
    },
    spent:true,
    reason:null,
  };
}

export function sneakyModifiers(progression){
  const rank=getSkillRank(progression,"sneaky");
  return {
    rank,
    powerScore:Math.round(rank*SNEAKY_POWER_SCORE_PER_RANK),
    lockToleranceBonus:rank*SNEAKY_LOCK_TOLERANCE_PER_RANK,
    lockAttemptBonus:SNEAKY_LOCK_ATTEMPT_RANKS.filter(threshold=>rank>=threshold).length,
    ringSpeedMultiplier:Number(Math.max(.5,1-rank*SNEAKY_RING_SPEED_REDUCTION_PER_RANK).toFixed(2)),
  };
}

function fatigueBase(scenarioOrMultiplier){
  if(Number.isFinite(scenarioOrMultiplier))
    return clamp(scenarioOrMultiplier,FATIGUE_MULTIPLIER_MIN,FATIGUE_MULTIPLIER_MAX);
  return own(SCENARIO_FATIGUE_BASE,scenarioOrMultiplier)
    ?SCENARIO_FATIGUE_BASE[scenarioOrMultiplier]
    :1;
}

export function enduranceFatigueMultiplier(progression,scenarioOrMultiplier){
  const rank=getSkillRank(progression,"endurance");
  const multiplier=fatigueBase(scenarioOrMultiplier)*(1-rank*ENDURANCE_REDUCTION_PER_RANK);
  return Number(clamp(multiplier,FATIGUE_MULTIPLIER_MIN,FATIGUE_MULTIPLIER_MAX).toFixed(3));
}

// Only positive work fatigue is adjusted. Negative recovery and zero-cost UI
// actions pass through unchanged. Integer output keeps the existing stat/log UI clean.
export function applyEnduranceToWorkFatigue(amount,progression,scenarioOrMultiplier){
  if(!Number.isFinite(amount)||amount<=0) return amount;
  return Math.max(1,Math.round(amount*enduranceFatigueMultiplier(progression,scenarioOrMultiplier)));
}

// Returns null when valid, otherwise a stable reason string suitable for save
// rejection diagnostics. Baseline ranks do not consume earned skill points.
export function progressionValidationError(value,scenario){
  if(!isProgressionScenario(scenario)) return "unknown_scenario";
  if(!value||typeof value!=="object"||Array.isArray(value)) return "not_an_object";
  const topKeys=Object.keys(value);
  const expectedTop=["version","xp","level","skillPoints","skills"];
  if(topKeys.length!==expectedTop.length||topKeys.some(key=>!expectedTop.includes(key))) return "invalid_keys";
  if(value.version!==PROGRESSION_VERSION) return "unsupported_version";
  if(!Number.isInteger(value.xp)||value.xp<0||value.xp>XP_CAP) return "invalid_xp";
  if(!Number.isInteger(value.level)||value.level<MIN_LEVEL||value.level>MAX_LEVEL) return "invalid_level";
  if(value.level!==levelForXp(value.xp)) return "xp_level_mismatch";
  if(!Number.isInteger(value.skillPoints)||value.skillPoints<0||value.skillPoints>MAX_LEVEL-MIN_LEVEL)
    return "invalid_skill_points";
  if(!value.skills||typeof value.skills!=="object"||Array.isArray(value.skills)) return "invalid_skills";
  const keys=Object.keys(value.skills);
  if(keys.length!==SKILL_IDS.length||keys.some(id=>!SKILL_IDS.includes(id))) return "invalid_skill_keys";

  const baseline=SCENARIO_STARTING_SKILLS[scenario];
  let allocated=0;
  for(const id of SKILL_IDS){
    const rank=value.skills[id];
    if(!Number.isInteger(rank)||rank<baseline[id]||rank>MAX_SKILL) return "invalid_"+id;
    allocated+=rank-baseline[id];
  }
  if(allocated+value.skillPoints!==value.level-MIN_LEVEL) return "skill_point_mismatch";
  return null;
}

export const isValidProgression=(value,scenario)=>progressionValidationError(value,scenario)===null;
