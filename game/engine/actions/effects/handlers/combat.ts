import { applyLuckToRoll } from "../../../core/luck";
import { rollRange } from "../../../core/rng";
import { roundWhole, toAppliedDamage, toHealAmount } from "../../../core/combat";
import { computeScaledDamageRange } from "../../../core/damage-range";
import {
  type EffectExecutionContext,
  type ExecuteCardEffectResult,
} from "../context";
import { targetEntityIdFromSelector } from "../targeting";

export function handleHealEffect(
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

  if (effect.payload.kind !== "heal") {
    return { ok: false, reason: "handleHealEffect received non-heal payload." };
  }

  const targetId = targetEntityIdFromSelector({
    selector: effect.payload.target,
    action,
    actorHero,
    state,
    triggerEvent,
  });
  if (!targetId) {
    return { ok: false, reason: "heal requires a valid effect target." };
  }

  const target = state.entitiesById[targetId];
  if (!target) {
    return { ok: false, reason: "heal target was not found." };
  }

  const rawRoll = rollRange(battleRng, effect.payload.minimum, effect.payload.maximum);
  const adjustedRoll = applyLuckToRoll({
    rawRoll,
    minimum: effect.payload.minimum,
    maximum: effect.payload.maximum,
    luck: state.luck,
    rollingHeroEntityId: actorHero.entityId,
  });

  const amount = toHealAmount(adjustedRoll);
  const baseHealth = roundWhole(target.currentHealth);
  const nextHealth = Math.min(target.maxHealth, baseHealth + amount);
  const applied = nextHealth - baseHealth;

  return {
    ok: true,
    state: {
      ...state,
      entitiesById: {
        ...state.entitiesById,
        [targetId]: {
          ...target,
          currentHealth: nextHealth,
        },
      },
    },
    events: [
      {
        kind: "healApplied",
        sequence,
        sourceEntityId: effectSourceEntityId ?? actorHero.entityId,
        targetEntityId: targetId,
        amount: applied,
      },
    ],
    nextSequence: sequence + 1,
    lastDamageWasDodged,
    lastSummonedEntityId,
  };
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

  const { minimum, maximum } = computeScaledDamageRange({
    minimum: effect.payload.minimum,
    maximum: effect.payload.maximum,
    attackDamage: sourceEntity.attackDamage,
    abilityPower: sourceEntity.abilityPower,
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
    wasDodged = battleRng.nextFloat() < target.dodgeChance;
  }

  let appliedDamage = 0;
  if (!wasDodged) {
    const resistance =
      effect.payload.damageType === "physical"
        ? target.armor
        : effect.payload.damageType === "magic"
          ? target.magicResist
          : 0;
    appliedDamage = toAppliedDamage(adjustedRoll, resistance);
  }

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
        damageType: effect.payload.damageType,
        wasDodged,
      },
    ],
    nextSequence: sequence + 1,
    lastDamageWasDodged: wasDodged,
    lastSummonedEntityId,
  };
}
