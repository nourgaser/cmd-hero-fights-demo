import { applyLuckToRoll } from "../../../core/luck";
import { rollRange } from "../../../core/rng";
import { roundWhole, toHealAmount } from "../../../core/combat";
import type { BattleEvent } from "../../../../shared/models";
import { getEffectiveHealRange } from "../../effects/get-effective-number";
import { resolveEffectiveNumber } from "../../../core/number-resolver";
import {
  type EffectExecutionContext,
  type ExecuteCardEffectResult,
} from "../context";
import { targetEntityIdsFromSelector } from "../targeting";

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

  const targetIds = targetEntityIdsFromSelector({
    selector: effect.payload.target,
    action,
    actorHero,
    state,
    triggerEvent,
    effectSourceEntityId,
    battleRng,
  });
  if (targetIds.length === 0) {
    return { ok: false, reason: "heal requires a valid effect target." };
  }

  const effectiveRange = getEffectiveHealRange({
    state,
    targetEntityId: actorHero.entityId,
    baseMinimum: resolveEffectiveNumber({
      state,
      targetEntityId: actorHero.entityId,
      propertyPath: effect.payload.minimumPropertyPath ?? "heal.minimum",
      baseValue: effect.payload.minimum,
      clampMin: 0,
    }).effectiveValue,
    baseMaximum: resolveEffectiveNumber({
      state,
      targetEntityId: actorHero.entityId,
      propertyPath: effect.payload.maximumPropertyPath ?? "heal.maximum",
      baseValue: effect.payload.maximum,
      clampMin: 0,
    }).effectiveValue,
  });

  const rawRoll = rollRange(
    battleRng,
    effectiveRange.minimum.effectiveValue,
    effectiveRange.maximum.effectiveValue,
  );
  const adjustedRoll = applyLuckToRoll({
    rawRoll,
    minimum: effectiveRange.minimum.effectiveValue,
    maximum: effectiveRange.maximum.effectiveValue,
    luck: state.luck,
    rollingHeroEntityId: actorHero.entityId,
  });

  const amount = toHealAmount(adjustedRoll);
  let nextState = state;
  const events: BattleEvent[] = [];

  for (const targetId of targetIds) {
    const target = nextState.entitiesById[targetId];
    if (!target) {
      continue;
    }

    const baseHealth = roundWhole(target.currentHealth);
    const nextHealth = Math.min(target.maxHealth, baseHealth + amount);
    const applied = nextHealth - baseHealth;

    nextState = {
      ...nextState,
      entitiesById: {
        ...nextState.entitiesById,
        [targetId]: {
          ...target,
          currentHealth: nextHealth,
        },
      },
    };

    events.push({
      kind: "healApplied",
      sequence: sequence + events.length,
      sourceEntityId: effectSourceEntityId ?? actorHero.entityId,
      targetEntityId: targetId,
      amount: applied,
    });
  }

  return {
    ok: true,
    state: nextState,
    events,
    nextSequence: sequence + events.length,
    lastDamageWasDodged,
    lastSummonedEntityId,
  };
}

export function handleGrantHealthEffect(
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

  if (effect.payload.kind !== "grantHealth") {
    return { ok: false, reason: "handleGrantHealthEffect received non-grantHealth payload." };
  }

  const targetIds = targetEntityIdsFromSelector({
    selector: effect.payload.target,
    action,
    actorHero,
    state,
    triggerEvent,
    effectSourceEntityId,
    battleRng,
  });
  if (targetIds.length === 0) {
    return { ok: false, reason: "grantHealth requires a valid effect target." };
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

  let nextState = state;
  const events: BattleEvent[] = [];

  for (const targetId of targetIds) {
    const target = nextState.entitiesById[targetId];
    if (!target) {
      continue;
    }

    const nextHealth = target.currentHealth + amount;
    nextState = {
      ...nextState,
      entitiesById: {
        ...nextState.entitiesById,
        [targetId]: {
          ...target,
          maxHealth: target.maxHealth + amount,
          currentHealth: nextHealth,
        },
      },
    };

    events.push({
      kind: "healApplied",
      sequence: sequence + events.length,
      sourceEntityId: effectSourceEntityId ?? actorHero.entityId,
      targetEntityId: targetId,
      amount,
    });
  }

  return {
    ok: true,
    state: nextState,
    events,
    nextSequence: sequence + events.length,
    lastDamageWasDodged,
    lastSummonedEntityId,
  };
}
