import { applyLuckToChance, applyLuckToRoll } from "../../../core/luck";
import { rollRange } from "../../../core/rng";
import { roundWhole, toAppliedDamage } from "../../../core/combat";
import { LUCK_DODGE_CHANCE_PER_POINT } from "../../../../shared/game-constants";
import {
  getEffectiveAttackDamage,
  getEffectiveArmor,
  getEffectiveDamageRange,
  getEffectiveDodgeChance,
  getEffectiveMagicResist,
  getEffectiveSharpness,
} from "../../effects/get-effective-number";
import { computeScaledDamageRange } from "../../../core/damage-range";
import { resolveEffectiveNumber } from "../../../core/number-resolver";
import { destroyResistanceFromBaseAndPersistent } from "../../../core/sharpness";
import { isEntityImmuneToDamage } from "../../../core/immunity";
import { markHeroDamageTakenThisTurn } from "../../../core/aura";
import {
  type EffectExecutionContext,
  type ExecuteCardEffectResult,
} from "../context";
import { targetEntityIdFromSelector } from "../targeting";

function getAttackFlatBonusDamage(options: {
  state: EffectExecutionContext["state"];
  targetEntityId: string;
}): number {
  return resolveEffectiveNumber({
    state: options.state,
    targetEntityId: options.targetEntityId,
    propertyPath: "attackFlatBonusDamage",
    baseValue: 0,
    clampMin: 0,
  }).effectiveValue;
}

export function handleDealDamageEffect(
  context: EffectExecutionContext,
): ExecuteCardEffectResult {
  const {
    state,
    effect,
    action,
    actorHero,
    sequence,
    battleRng,
    triggerEvent,
    lastSummonedEntityId,
    effectSourceEntityId,
  } = context;

  if (effect.payload.kind !== "dealDamage") {
    return { ok: false, reason: "handleDealDamageEffect received non-dealDamage payload." };
  }

  const targetId = targetEntityIdFromSelector({
    selector: effect.payload.target,
    action,
    actorHero,
    state,
    triggerEvent,
    effectSourceEntityId,
    battleRng,
  });
  if (!targetId) {
    return { ok: false, reason: "dealDamage requires a valid effect target." };
  }

  const target = state.entitiesById[targetId];
  if (!target) {
    if (effect.payload.target === "triggeringTarget") {
      return {
        ok: true,
        state,
        events: [],
        nextSequence: sequence,
        lastDamageWasDodged: false,
        lastSummonedEntityId,
      };
    }

    return { ok: false, reason: "dealDamage target was not found." };
  }

  const sourceEntity = effectSourceEntityId
    ? state.entitiesById[effectSourceEntityId]
    : actorHero;
  if (!sourceEntity) {
    return { ok: false, reason: "dealDamage source entity was not found." };
  }

  if (isEntityImmuneToDamage({ state, targetEntityId: target.entityId })) {
    return {
      ok: true,
      state,
      events: [],
      nextSequence: sequence,
      lastDamageWasDodged: false,
      lastSummonedEntityId,
    };
  }

  const effectiveAttackDamage = getEffectiveAttackDamage({
    state,
    targetEntityId: sourceEntity.entityId,
    baseAttackDamage: sourceEntity.attackDamage,
  }).effectiveValue;
  const effectiveAbilityPower = sourceEntity.abilityPower;
  const effectiveRange = getEffectiveDamageRange({
    state,
    targetEntityId: sourceEntity.entityId,
    baseMinimum: effect.payload.minimum,
    baseMaximum: effect.payload.maximum,
  });
  const flatBonusDamage = getAttackFlatBonusDamage({
    state,
    targetEntityId: actorHero.entityId,
  });
  const sourceSharpness = getEffectiveSharpness({
    state,
    targetEntityId: sourceEntity.entityId,
    baseSharpness: 0,
  }).effectiveValue;
  const ownerSharpness =
    sourceEntity.entityId === actorHero.entityId
      ? 0
      : getEffectiveSharpness({
          state,
          targetEntityId: actorHero.entityId,
          baseSharpness: 0,
        }).effectiveValue;
  const sharpness = sourceSharpness + ownerSharpness;

  const { minimum, maximum } = computeScaledDamageRange({
    minimum: effectiveRange.minimum.effectiveValue,
    maximum: effectiveRange.maximum.effectiveValue,
    attackDamage: effectiveAttackDamage,
    abilityPower: effectiveAbilityPower,
    armor: sourceEntity.armor,
    attackDamageScaling: effect.payload.attackDamageScaling,
    abilityPowerScaling: effect.payload.abilityPowerScaling,
    armorScaling: effect.payload.armorScaling,
  });

  const rawRoll = rollRange(battleRng, minimum, maximum);
  const adjustedRoll = applyLuckToRoll({
    rawRoll,
    minimum,
    maximum,
    luck: state.luck,
    rollingHeroEntityId: actorHero.entityId,
  });

  let wasDodged = false;
  if (effect.payload.canBeDodged) {
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
    wasDodged = battleRng.nextFloat() < effectiveDodgeChance;
  }

  let appliedDamage = 0;
  let stateAfterSharpness = state;
  if (!wasDodged) {
    if (sharpness > 0 && (effect.payload.damageType === "physical" || effect.payload.damageType === "magic")) {
      stateAfterSharpness = destroyResistanceFromBaseAndPersistent({
        state,
        targetEntityId: target.entityId,
        stat: effect.payload.damageType === "physical" ? "armor" : "magicResist",
        amount: sharpness,
      }).state;
    }

    const targetAfterSharpness = stateAfterSharpness.entitiesById[target.entityId];
    if (!targetAfterSharpness) {
      return { ok: false, reason: "dealDamage target was not found after Sharpness resolution." };
    }

    const resistance =
      effect.payload.damageType === "physical"
        ? getEffectiveArmor({
            state: stateAfterSharpness,
            targetEntityId: targetAfterSharpness.entityId,
            baseArmor: targetAfterSharpness.armor,
          }).effectiveValue
        : effect.payload.damageType === "magic"
          ? getEffectiveMagicResist({
              state: stateAfterSharpness,
              targetEntityId: targetAfterSharpness.entityId,
              baseMagicResist: targetAfterSharpness.magicResist,
            }).effectiveValue
          : 0;
    appliedDamage = toAppliedDamage(adjustedRoll, resistance) + roundWhole(flatBonusDamage);
  }

  const nextTarget = stateAfterSharpness.entitiesById[targetId];
  if (!nextTarget) {
    return { ok: false, reason: "dealDamage target was not found while applying damage." };
  }

  const targetHealth = roundWhole(nextTarget.currentHealth);

  const nextState = {
    ...stateAfterSharpness,
    entitiesById: {
      ...stateAfterSharpness.entitiesById,
      [targetId]: {
        ...nextTarget,
        currentHealth: Math.max(0, targetHealth - appliedDamage),
      },
    },
  };

  const nextStateWithDamageFlag =
    target.kind === "hero" && appliedDamage > 0
      ? markHeroDamageTakenThisTurn(nextState, target.entityId)
      : nextState;

  return {
    ok: true,
    state: nextStateWithDamageFlag,
    events: [
      {
        kind: "damageApplied",
        sequence,
        sourceEntityId: effectSourceEntityId ?? actorHero.entityId,
        targetEntityId: targetId,
        amount: appliedDamage,
        damageType: effect.payload.damageType,
        isAttack: true,
        wasDodged,
      },
    ],
    nextSequence: sequence + 1,
    lastDamageWasDodged: wasDodged,
    lastSummonedEntityId,
  };
}

export function handleReflectDamageEffect(
  context: EffectExecutionContext,
): ExecuteCardEffectResult {
  const {
    state,
    effect,
    action,
    actorHero,
    sequence,
    battleRng,
    triggerEvent,
    lastDamageWasDodged,
    lastSummonedEntityId,
    effectSourceEntityId,
  } = context;

  if (effect.payload.kind !== "reflectDamage") {
    return { ok: false, reason: "handleReflectDamageEffect received non-reflectDamage payload." };
  }

  if (!triggerEvent || triggerEvent.kind !== "damageApplied" || !triggerEvent.sourceEntityId) {
    return { ok: false, reason: "reflectDamage requires a damageApplied trigger event with a source." };
  }

  const targetId = targetEntityIdFromSelector({
    selector: effect.payload.target,
    action,
    actorHero,
    state,
    triggerEvent,
    effectSourceEntityId,
    battleRng,
  });
  if (!targetId) {
    return { ok: false, reason: "reflectDamage requires a valid effect target." };
  }

  const target = state.entitiesById[targetId];
  if (!target) {
    return { ok: false, reason: "reflectDamage target was not found." };
  }

  if (isEntityImmuneToDamage({ state, targetEntityId: target.entityId })) {
    return {
      ok: true,
      state,
      events: [],
      nextSequence: sequence,
      lastDamageWasDodged,
      lastSummonedEntityId,
    };
  }

  const amount = Math.max(0, roundWhole(triggerEvent.amount));
  const resistance =
    triggerEvent.damageType === "physical"
      ? getEffectiveArmor({
          state,
          targetEntityId: target.entityId,
          baseArmor: target.armor,
        }).effectiveValue
      : triggerEvent.damageType === "magic"
        ? getEffectiveMagicResist({
            state,
            targetEntityId: target.entityId,
            baseMagicResist: target.magicResist,
          }).effectiveValue
        : 0;
  const appliedDamage = toAppliedDamage(amount, resistance);
  const targetHealth = roundWhole(target.currentHealth);

  return {
    ok: true,
    state: {
      ...state,
      entitiesById: {
        ...state.entitiesById,
        [targetId]: {
          ...target,
          currentHealth: Math.max(0, targetHealth - appliedDamage),
        },
      },
    },
    events: [
      {
        kind: "damageApplied",
        sequence,
        sourceEntityId: effectSourceEntityId ?? actorHero.entityId,
        targetEntityId: targetId,
        amount: appliedDamage,
        damageType: triggerEvent.damageType,
        isAttack: true,
        wasDodged: false,
      },
    ],
    nextSequence: sequence + 1,
    lastDamageWasDodged,
    lastSummonedEntityId,
  };
}
