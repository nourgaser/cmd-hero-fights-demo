import {
  type BasicAttackAction,
  type BattleEvent,
  type BattleState,
  type HeroDefinition,
} from "../../shared/models";
import {
  getEffectiveAttackDamage,
  getEffectiveArmor,
  getEffectiveBasicAttackRange,
  getEffectiveDodgeChance,
  getEffectiveMagicResist,
  getEffectiveAbilityPower,
} from "./effects/get-effective-number";
import { resolveEffectiveNumber } from "../core/number-resolver";
import { roundWhole, toAppliedDamage } from "../core/combat";
import { computeScaledDamageRange } from "../core/damage-range";
import { applyLuckToChance, applyLuckToRoll } from "../core/luck";
import { type BattleRng, rollRange } from "../core/rng";
import { resolveActiveActorHeroForAction } from "./shared-validation";
import { markHeroDamageTakenThisTurn } from "../core/aura";
import {
  LUCK_CRIT_CHANCE_PER_POINT,
  LUCK_DODGE_CHANCE_PER_POINT,
} from "../../shared/game-constants";

export type ResolveBasicAttackResult =
  | {
      ok: true;
      state: BattleState;
      events: BattleEvent[];
      nextSequence: number;
      resultMessage: string;
    }
  | {
      ok: false;
      state: BattleState;
      reason: string;
    };

export function resolveBasicAttackAction(options: {
  state: BattleState;
  action: BasicAttackAction;
  nextSequence: number;
  battleRng: BattleRng;
  heroDefinitionsById: Record<string, HeroDefinition>;
}): ResolveBasicAttackResult {
  const { state, action, nextSequence, battleRng, heroDefinitionsById } = options;

  const actorResolution = resolveActiveActorHeroForAction({
    state,
    actorHeroEntityId: action.actorHeroEntityId,
    notFoundReason: "Acting hero was not found.",
    inactiveReason: "Only the active hero can perform a basic attack.",
  });
  if (!actorResolution.ok) {
    return {
      ok: false,
      state,
      reason: actorResolution.reason,
    };
  }
  const actorHero = actorResolution.actorHero;

  const attacker = state.entitiesById[action.attackerEntityId];
  if (!attacker || attacker.kind !== "hero") {
    return {
      ok: false,
      state,
      reason: "Basic attack currently supports hero attackers only.",
    };
  }

  if (attacker.entityId !== actorHero.entityId) {
    return {
      ok: false,
      state,
      reason: "Basic attack attacker must be the acting hero.",
    };
  }

  const target = state.entitiesById[action.selection.targetEntityId];
  if (!target) {
    return {
      ok: false,
      state,
      reason: "Basic attack target was not found.",
    };
  }

  if (target.battlefieldSide === attacker.battlefieldSide) {
    return {
      ok: false,
      state,
      reason: "Basic attack target must be on the opposing side.",
    };
  }

  const heroDefinition = heroDefinitionsById[attacker.heroDefinitionId];
  if (!heroDefinition) {
    return {
      ok: false,
      state,
      reason: "Hero definition was not found for basic attack attacker.",
    };
  }

  const attack = heroDefinition.basicAttack;
  if (attacker.movePoints < attacker.basicAttackMoveCost) {
    return {
      ok: false,
      state,
      reason: "Not enough move points to perform a basic attack.",
    };
  }

  const effectiveAttackDamage = getEffectiveAttackDamage({
    state,
    targetEntityId: attacker.entityId,
    baseAttackDamage: attacker.attackDamage,
  }).effectiveValue;
  const effectiveAbilityPower = getEffectiveAbilityPower({
    state,
    targetEntityId: attacker.entityId,
    baseAbilityPower: attacker.abilityPower,
  }).effectiveValue;
  const effectiveBasicAttackRange = getEffectiveBasicAttackRange({
    state,
    targetEntityId: attacker.entityId,
    baseMinimum: attack.minimumDamage,
    baseMaximum: attack.maximumDamage,
  });
  const { minimum, maximum } = computeScaledDamageRange({
    minimum: effectiveBasicAttackRange.minimum.effectiveValue,
    maximum: effectiveBasicAttackRange.maximum.effectiveValue,
    attackDamage: effectiveAttackDamage,
    abilityPower: effectiveAbilityPower,
    attackDamageScaling: attack.attackDamageScaling,
    abilityPowerScaling: attack.abilityPowerScaling,
  });

  const rawRoll = rollRange(battleRng, minimum, maximum);
  const adjustedRoll = applyLuckToRoll({
    rawRoll,
    minimum,
    maximum,
    luck: state.luck,
    rollingHeroEntityId: attacker.entityId,
  });

  const effectiveCriticalChance = applyLuckToChance({
    baseChance: attacker.criticalChance,
    luck: state.luck,
    affectedHeroEntityId: attacker.entityId,
    chancePerPoint: LUCK_CRIT_CHANCE_PER_POINT,
  });
  const wasCritical = battleRng.nextFloat() < effectiveCriticalChance;
  const criticalMultiplier = wasCritical ? attacker.criticalMultiplier : 1;
  const finalRoll = adjustedRoll * criticalMultiplier;
  const flatBonusDamage = resolveEffectiveNumber({
    state,
    targetEntityId: attacker.entityId,
    propertyPath: "attackFlatBonusDamage",
    baseValue: 0,
  }).effectiveValue;

  const dodgeRoll = battleRng.nextFloat();
  const targetBaseDodgeChance = Math.min(
    1,
    getEffectiveDodgeChance({
      state,
      targetEntityId: target.entityId,
      baseDodgeChance: target.dodgeChance,
    }).effectiveValue,
  );
  const effectiveDodgeChance = applyLuckToChance({
    baseChance: targetBaseDodgeChance,
    luck: state.luck,
    affectedHeroEntityId: target.entityId,
    chancePerPoint: LUCK_DODGE_CHANCE_PER_POINT,
  });
  const wasDodged = dodgeRoll < effectiveDodgeChance;

  let appliedDamage = 0;
  if (!wasDodged) {
    const resistance =
      attack.damageType === "physical"
        ? getEffectiveArmor({
            state,
            targetEntityId: target.entityId,
            baseArmor: target.armor,
          }).effectiveValue
        : attack.damageType === "magic"
          ? getEffectiveMagicResist({
              state,
              targetEntityId: target.entityId,
              baseMagicResist: target.magicResist,
            }).effectiveValue
          : 0;
            appliedDamage = toAppliedDamage(finalRoll, resistance) + roundWhole(flatBonusDamage);
  }

  const targetHealth = roundWhole(target.currentHealth);

  let sequence = nextSequence;
  const events: BattleEvent[] = [];

  const nextState: BattleState = {
    ...state,
    entitiesById: {
      ...state.entitiesById,
      [attacker.entityId]: {
        ...attacker,
        movePoints: attacker.movePoints - attacker.basicAttackMoveCost,
      },
      [target.entityId]: {
        ...target,
        currentHealth: Math.max(0, targetHealth - appliedDamage),
      },
    },
  };

  const nextStateWithDamageFlag =
    target.kind === "hero" && appliedDamage > 0
      ? markHeroDamageTakenThisTurn(nextState, target.entityId)
      : nextState;

  events.push({
    kind: "damageApplied",
    sequence,
    sourceEntityId: attacker.entityId,
    targetEntityId: target.entityId,
    amount: appliedDamage,
    damageType: attack.damageType,
    isAttack: true,
    wasDodged,
    wasCritical,
    rngRawRoll: rawRoll,
    rngAdjustedRoll: adjustedRoll,
    rngFinalRoll: finalRoll,
    rngDodgeRoll: dodgeRoll,
  });
  sequence += 1;

  events.push({
    kind: "actionResolved",
    sequence,
    action,
  });
  sequence += 1;

  return {
    ok: true,
    state: nextStateWithDamageFlag,
    events,
    nextSequence: sequence,
    resultMessage: wasDodged
      ? `Basic attack missed (dodge). RNG ${rawRoll.toFixed(2)} -> ${adjustedRoll.toFixed(2)}${wasCritical ? ` -> ${finalRoll.toFixed(2)} (crit)` : ""}; dodge roll ${dodgeRoll.toFixed(2)}.`
      : `Basic attack dealt ${appliedDamage} ${attack.damageType} damage${wasCritical ? " (crit!)" : ""}. RNG ${rawRoll.toFixed(2)} -> ${adjustedRoll.toFixed(2)}${wasCritical ? ` -> ${finalRoll.toFixed(2)}` : ""}.`,
  };
}
