import {
  type BattleEvent,
  type BattleState,
  type DamageType,
  type UseEntityActiveAction,
} from "../../shared/models";
import { renderEffectDisplayText, type EffectDefinition, type EffectDisplayText } from "../../shared/models";
import type { SummonedEntityBlueprint } from "./effects/context";
import { resolveEffectiveNumber } from "../core/number-resolver";
import { getEffectiveArmor, getEffectiveDodgeChance, getEffectiveMagicResist } from "./effects/get-effective-number";
import { roundWhole, toAppliedDamage } from "../core/combat";
import { computeScaledDamageRange } from "../core/damage-range";
import { destroyResistanceFromBaseAndPersistent } from "../core/sharpness";
import { applyLuckToChance, applyLuckToRoll } from "../core/luck";
import { type BattleRng, rollRange } from "../core/rng";
import { resolveActiveActorHeroForAction } from "./shared-validation";
import { markHeroDamageTakenThisTurn } from "../core/aura";
import { isEntityImmuneToDamage } from "../core/immunity";
import { isAttackTargetProtectedByAdjacentTaunt } from "../battlefield/taunt";
import { executeCardEffect } from "./effects/execute-card-effect";
import {
  LUCK_CRIT_CHANCE_PER_POINT,
  LUCK_DODGE_CHANCE_PER_POINT,
} from "../../shared/game-constants";

export type EntityActiveAttackProfile = {
  kind: "attack";
  moveCost: number;
  minimumDamage: number;
  maximumDamage: number;
  damageType: DamageType;
  attackDamageScaling: number;
  abilityPowerScaling: number;
  canBeDodged: boolean;
};

export type EntityActiveEffectProfile = {
  kind: "effect";
  moveCost: number;
  summaryText: EffectDisplayText;
  effects: EffectDefinition[];
};

export type EntityActiveProfile = EntityActiveAttackProfile | EntityActiveEffectProfile;

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
  createSummonedEntityId: (context: {
    ownerHeroEntityId: string;
    entityDefinitionId: string;
    sequence: number;
  }) => string;
  resolveSummonedEntityBlueprint: (
    entityDefinitionId: string,
    kind: "weapon" | "totem" | "companion",
  ) => SummonedEntityBlueprint | undefined;
  resolveEntityActiveProfile?: (context: {
    sourceDefinitionCardId: string;
    sourceKind: "weapon" | "companion";
  }) => EntityActiveProfile | undefined;
}): ResolveUseEntityActiveResult {
  const {
    state,
    action,
    nextSequence,
    battleRng,
    createSummonedEntityId,
    resolveSummonedEntityBlueprint,
    resolveEntityActiveProfile,
  } = options;

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

  if (profile.kind === "effect") {
    const syntheticAction = {
      kind: "playCard" as const,
      actorHeroEntityId: actorHero.entityId,
      handCardId: `__entity_active__:${source.entityId}`,
      selection: action.selection,
    };

    let nextState = state;
    let sequence = nextSequence;
    let lastDamageWasDodged = undefined as boolean | undefined;
    let lastSummonedEntityId: string | undefined = source.entityId;
    const events: BattleEvent[] = [];

    for (const effect of profile.effects) {
      const execution = executeCardEffect({
        state: nextState,
        effect,
        action: syntheticAction,
        actorHero,
        sequence,
        battleRng,
        triggerEvent: undefined,
        lastDamageWasDodged,
        lastSummonedEntityId,
        effectSourceEntityId: source.entityId,
        createSummonedEntityId,
        resolveSummonedEntityBlueprint,
      });

      if (!execution.ok) {
        return {
          ok: false,
          state,
          reason: execution.reason,
        };
      }

      nextState = execution.state;
      sequence = execution.nextSequence;
      lastDamageWasDodged = execution.lastDamageWasDodged;
      lastSummonedEntityId = execution.lastSummonedEntityId;
      events.push(...execution.events);
    }

    const finalState: BattleState = {
      ...nextState,
      entitiesById: {
        ...nextState.entitiesById,
        [source.entityId]: {
          ...source,
          remainingMoves: source.remainingMoves - profile.moveCost,
        },
      },
    };

    events.push({
      kind: "actionResolved",
      sequence,
      action,
    });

    return {
      ok: true,
      state: finalState,
      events,
      nextSequence: sequence + 1,
      resultMessage: renderEffectDisplayText(profile.summaryText),
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

  if (
    isAttackTargetProtectedByAdjacentTaunt({
      state,
      attackerEntityId: source.entityId,
      targetEntityId: target.entityId,
    })
  ) {
    return {
      ok: false,
      state,
      reason: "useEntityActive target is protected by an adjacent Taunt ally.",
    };
  }

  if (isEntityImmuneToDamage({ state, targetEntityId: target.entityId })) {
    const nextState: BattleState = {
      ...state,
      entitiesById: {
        ...state.entitiesById,
        [source.entityId]: {
          ...source,
          remainingMoves: source.remainingMoves - profile.moveCost,
        },
      },
    };

    return {
      ok: true,
      state: nextState,
      events: [
        {
          kind: "actionResolved",
          sequence: nextSequence,
          action,
        },
      ],
      nextSequence: nextSequence + 1,
      resultMessage: "Entity active had no effect. Target is immune.",
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
  const sourceSharpness = resolveEffectiveNumber({
    state,
    targetEntityId: source.entityId,
    propertyPath: "sharpness",
    baseValue: source.baseSharpness ?? 0,
    clampMin: 0,
  }).effectiveValue;
  const ownerSharpness =
    source.entityId === actorHero.entityId
      ? 0
      : resolveEffectiveNumber({
          state,
          targetEntityId: actorHero.entityId,
          propertyPath: "sharpness",
          baseValue: 0,
          clampMin: 0,
        }).effectiveValue;
  const sharpness = sourceSharpness + ownerSharpness;

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
  let stateAfterSharpness = state;
  if (!wasDodged) {
    if (sharpness > 0 && (profile.damageType === "physical" || profile.damageType === "magic")) {
      stateAfterSharpness = destroyResistanceFromBaseAndPersistent({
        state,
        targetEntityId: target.entityId,
        stat: profile.damageType === "physical" ? "armor" : "magicResist",
        amount: sharpness,
      }).state;
    }

    const targetAfterSharpness = stateAfterSharpness.entitiesById[target.entityId];
    if (!targetAfterSharpness) {
      return {
        ok: false,
        state,
        reason: "useEntityActive target was not found after Sharpness resolution.",
      };
    }

    const resistance =
      profile.damageType === "physical"
        ? getEffectiveArmor({
            state: stateAfterSharpness,
            targetEntityId: targetAfterSharpness.entityId,
            baseArmor: targetAfterSharpness.armor,
          }).effectiveValue
        : profile.damageType === "magic"
          ? getEffectiveMagicResist({
              state: stateAfterSharpness,
              targetEntityId: targetAfterSharpness.entityId,
              baseMagicResist: targetAfterSharpness.magicResist,
            }).effectiveValue
          : 0;
    appliedDamage = toAppliedDamage(finalRoll, resistance) + roundWhole(flatBonusDamage);
  }

  const nextTarget = stateAfterSharpness.entitiesById[target.entityId];
  if (!nextTarget) {
    return {
      ok: false,
      state,
      reason: "useEntityActive target was not found while applying damage.",
    };
  }

  const targetHealth = roundWhole(nextTarget.currentHealth);

  let sequence = nextSequence;
  const events: BattleEvent[] = [];

  const nextState: BattleState = {
    ...stateAfterSharpness,
    entitiesById: {
      ...stateAfterSharpness.entitiesById,
      [source.entityId]: {
        ...source,
        remainingMoves: source.remainingMoves - profile.moveCost,
      },
      [target.entityId]: {
        ...nextTarget,
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
    state: nextStateWithDamageFlag,
    events,
    nextSequence: sequence,
    resultMessage: wasDodged
      ? `Entity active missed (dodge). RNG ${rawRoll.toFixed(2)} -> ${adjustedRoll.toFixed(2)}${wasCritical ? ` -> ${finalRoll.toFixed(2)} (crit)` : ""}; dodge roll ${dodgeRoll.toFixed(2)}.`
      : `Entity active dealt ${appliedDamage} ${profile.damageType} damage${wasCritical ? " (crit!)" : ""}. RNG ${rawRoll.toFixed(2)} -> ${adjustedRoll.toFixed(2)}${wasCritical ? ` -> ${finalRoll.toFixed(2)}` : ""}.`,
  };
}
