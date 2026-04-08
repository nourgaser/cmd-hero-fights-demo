import {
  type BattleEvent,
  type BattleState,
  type DamageType,
  type UseEntityActiveAction,
} from "../../shared/models";
import { resolveEffectiveNumber } from "../core/number-resolver";
import { getEffectiveDodgeChance } from "./effects/get-effective-number";
import { roundWhole, toAppliedDamage } from "../core/combat";
import { computeScaledDamageRange } from "../core/damage-range";
import { applyLuckToChance, applyLuckToRoll } from "../core/luck";
import { type BattleRng, rollRange } from "../core/rng";
import { resolveActiveActorHeroForAction } from "./shared-validation";
import {
  LUCK_CRIT_CHANCE_PER_POINT,
  LUCK_DODGE_CHANCE_PER_POINT,
} from "../../shared/game-constants";

export type EntityActiveProfile = {
  moveCost: number;
  minimumDamage: number;
  maximumDamage: number;
  damageType: DamageType;
  attackDamageScaling: number;
  abilityPowerScaling: number;
  canBeDodged: boolean;
};

export type ResolveUseEntityActiveResult =
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

export function resolveUseEntityActiveAction(options: {
  state: BattleState;
  action: UseEntityActiveAction;
  nextSequence: number;
  battleRng: BattleRng;
  resolveEntityActiveProfile?: (context: {
    sourceDefinitionCardId: string;
    sourceKind: "weapon" | "companion";
  }) => EntityActiveProfile | undefined;
}): ResolveUseEntityActiveResult {
  const { state, action, nextSequence, battleRng, resolveEntityActiveProfile } = options;

  const actorResolution = resolveActiveActorHeroForAction({
    state,
    actorHeroEntityId: action.actorHeroEntityId,
    notFoundReason: "Acting hero was not found.",
    inactiveReason: "Only the active hero can use an entity active.",
  });
  if (!actorResolution.ok) {
    return {
      ok: false,
      state,
      reason: actorResolution.reason,
    };
  }
  const actorHero = actorResolution.actorHero;

  const source = state.entitiesById[action.sourceEntityId];
  if (!source || source.kind === "hero") {
    return {
      ok: false,
      state,
      reason: "useEntityActive currently supports summoned entity sources only.",
    };
  }

  if (source.kind === "totem") {
    return {
      ok: false,
      state,
      reason: "Totems cannot trigger active actions.",
    };
  }

  if (source.ownerHeroEntityId !== actorHero.entityId) {
    return {
      ok: false,
      state,
      reason: "The source entity does not belong to the acting hero.",
    };
  }

  const targetId = action.selection.targetEntityId;
  if (!targetId) {
    return {
      ok: false,
      state,
      reason: "useEntityActive requires a selected target entity.",
    };
  }

  const target = state.entitiesById[targetId];
  if (!target) {
    return {
      ok: false,
      state,
      reason: "useEntityActive target was not found.",
    };
  }

  if (target.battlefieldSide === source.battlefieldSide) {
    return {
      ok: false,
      state,
      reason: "useEntityActive target must be on the opposing side.",
    };
  }

  const profile = resolveEntityActiveProfile?.({
    sourceDefinitionCardId: source.definitionCardId,
    sourceKind: source.kind,
  });

  if (!profile) {
    return {
      ok: false,
      state,
      reason: "Entity active profile was not found for source entity.",
    };
  }

  if (source.remainingMoves < profile.moveCost) {
    return {
      ok: false,
      state,
      reason: "Source entity does not have enough moves to use active ability.",
    };
  }

  const minimum = resolveEffectiveNumber({
    state,
    targetEntityId: source.entityId,
    propertyPath: "useEntityActive.minimum",
    baseValue: profile.minimumDamage,
    clampMin: 0,
  }).effectiveValue;
  const maximum = resolveEffectiveNumber({
    state,
    targetEntityId: source.entityId,
    propertyPath: "useEntityActive.maximum",
    baseValue: profile.maximumDamage,
    clampMin: 0,
  }).effectiveValue;
  const effectiveAttackDamage = resolveEffectiveNumber({
    state,
    targetEntityId: source.entityId,
    propertyPath: "attackDamage",
    baseValue: source.attackDamage,
    clampMin: 0,
  }).effectiveValue;
  const ownerHeroAttackDamage =
    source.kind === "weapon"
      ? resolveEffectiveNumber({
          state,
          targetEntityId: actorHero.entityId,
          propertyPath: "attackDamage",
          baseValue: actorHero.attackDamage,
          clampMin: 0,
        }).effectiveValue
      : 0;
  const combinedAttackDamage = effectiveAttackDamage + ownerHeroAttackDamage;
  const effectiveAbilityPower = resolveEffectiveNumber({
    state,
    targetEntityId: source.entityId,
    propertyPath: "abilityPower",
    baseValue: source.abilityPower,
    clampMin: 0,
  }).effectiveValue;
  const flatBonusDamage =
    source.kind === "weapon"
      ? resolveEffectiveNumber({
          state,
          targetEntityId: actorHero.entityId,
          propertyPath: "attackFlatBonusDamage",
          baseValue: 0,
          clampMin: 0,
        }).effectiveValue
      : 0;

  const scaledRange = computeScaledDamageRange({
    minimum,
    maximum,
    attackDamage: combinedAttackDamage,
    abilityPower: effectiveAbilityPower,
    attackDamageScaling: profile.attackDamageScaling,
    abilityPowerScaling: profile.abilityPowerScaling,
  });
  const scaledMinimum = scaledRange.minimum;
  const scaledMaximum = scaledRange.maximum;

  const rawRoll = rollRange(battleRng, scaledMinimum, scaledMaximum);
  const adjustedRoll = applyLuckToRoll({
    rawRoll,
    minimum: scaledMinimum,
    maximum: scaledMaximum,
    luck: state.luck,
    rollingHeroEntityId: actorHero.entityId,
  });

  const effectiveCriticalChance = applyLuckToChance({
    baseChance: source.criticalChance,
    luck: state.luck,
    affectedHeroEntityId: source.ownerHeroEntityId,
    chancePerPoint: LUCK_CRIT_CHANCE_PER_POINT,
  });
  const wasCritical = battleRng.nextFloat() < effectiveCriticalChance;
  const criticalMultiplier = wasCritical ? source.criticalMultiplier : 1;
  const finalRoll = adjustedRoll * criticalMultiplier;

  let wasDodged = false;
  let dodgeRoll = 0;
  if (profile.canBeDodged) {
    dodgeRoll = battleRng.nextFloat();
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
    wasDodged = dodgeRoll < effectiveDodgeChance;
  }

  let appliedDamage = 0;
  if (!wasDodged) {
    const resistance =
      profile.damageType === "physical"
        ? target.armor
        : profile.damageType === "magic"
          ? target.magicResist
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
      [source.entityId]: {
        ...source,
        remainingMoves: source.remainingMoves - profile.moveCost,
      },
      [target.entityId]: {
        ...target,
        currentHealth: Math.max(0, targetHealth - appliedDamage),
      },
    },
  };

  events.push({
    kind: "damageApplied",
    sequence,
    sourceEntityId: source.entityId,
    targetEntityId: target.entityId,
    amount: appliedDamage,
    damageType: profile.damageType,
    isAttack: true,
    wasDodged,
    wasCritical,
    rngRawRoll: rawRoll,
    rngAdjustedRoll: adjustedRoll,
    rngFinalRoll: finalRoll,
    rngDodgeRoll: profile.canBeDodged ? dodgeRoll : undefined,
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
    state: nextState,
    events,
    nextSequence: sequence,
    resultMessage: wasDodged
      ? `Entity active missed (dodge). RNG ${rawRoll.toFixed(2)} -> ${adjustedRoll.toFixed(2)}${wasCritical ? ` -> ${finalRoll.toFixed(2)} (crit)` : ""}; dodge roll ${dodgeRoll.toFixed(2)}.`
      : `Entity active dealt ${appliedDamage} ${profile.damageType} damage${wasCritical ? " (crit!)" : ""}. RNG ${rawRoll.toFixed(2)} -> ${adjustedRoll.toFixed(2)}${wasCritical ? ` -> ${finalRoll.toFixed(2)}` : ""}.`,
  };
}
