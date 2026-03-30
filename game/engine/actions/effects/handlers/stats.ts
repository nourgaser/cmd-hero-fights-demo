import {
  type EffectExecutionContext,
  type ExecuteCardEffectResult,
} from "../context";
import { targetEntityIdFromSelector } from "../targeting";

export function handleGainArmorEffect(
  context: EffectExecutionContext,
): ExecuteCardEffectResult {
  const { state, effect, action, actorHero, sequence, lastDamageWasDodged } = context;

  if (effect.payload.kind !== "gainArmor") {
    return { ok: false, reason: "handleGainArmorEffect received non-gainArmor payload." };
  }

  const targetId = targetEntityIdFromSelector({
    selector: effect.payload.target,
    action,
    actorHero,
    state,
  });
  if (!targetId) {
    return { ok: false, reason: "gainArmor requires a valid effect target." };
  }

  const target = state.entitiesById[targetId];
  if (!target) {
    return { ok: false, reason: "gainArmor target was not found." };
  }

  return {
    ok: true,
    state: {
      ...state,
      entitiesById: {
        ...state.entitiesById,
        [targetId]: {
          ...target,
          armor: target.armor + effect.payload.amount,
        },
      },
    },
    events: [
      {
        kind: "armorGained",
        sequence,
        targetEntityId: targetId,
        amount: effect.payload.amount,
      },
    ],
    nextSequence: sequence + 1,
    lastDamageWasDodged,
  };
}

export function handleGainMagicResistEffect(
  context: EffectExecutionContext,
): ExecuteCardEffectResult {
  const { state, effect, action, actorHero, sequence, lastDamageWasDodged } = context;

  if (effect.payload.kind !== "gainMagicResist") {
    return { ok: false, reason: "handleGainMagicResistEffect received non-gainMagicResist payload." };
  }

  const targetId = targetEntityIdFromSelector({
    selector: effect.payload.target,
    action,
    actorHero,
    state,
  });
  if (!targetId) {
    return { ok: false, reason: "gainMagicResist requires a valid effect target." };
  }

  const target = state.entitiesById[targetId];
  if (!target) {
    return { ok: false, reason: "gainMagicResist target was not found." };
  }

  return {
    ok: true,
    state: {
      ...state,
      entitiesById: {
        ...state.entitiesById,
        [targetId]: {
          ...target,
          magicResist: target.magicResist + effect.payload.amount,
        },
      },
    },
    events: [
      {
        kind: "magicResistGained",
        sequence,
        targetEntityId: targetId,
        amount: effect.payload.amount,
      },
    ],
    nextSequence: sequence + 1,
    lastDamageWasDodged,
  };
}

export function handleGainAttackDamageEffect(
  context: EffectExecutionContext,
): ExecuteCardEffectResult {
  const { state, effect, action, actorHero, sequence, lastDamageWasDodged } = context;

  if (effect.payload.kind !== "gainAttackDamage") {
    return { ok: false, reason: "handleGainAttackDamageEffect received non-gainAttackDamage payload." };
  }

  const targetId = targetEntityIdFromSelector({
    selector: effect.payload.target,
    action,
    actorHero,
    state,
  });
  if (!targetId) {
    return { ok: false, reason: "gainAttackDamage requires a valid effect target." };
  }

  const target = state.entitiesById[targetId];
  if (!target) {
    return { ok: false, reason: "gainAttackDamage target was not found." };
  }

  return {
    ok: true,
    state: {
      ...state,
      entitiesById: {
        ...state.entitiesById,
        [targetId]: {
          ...target,
          attackDamage: target.attackDamage + effect.payload.amount,
        },
      },
    },
    events: [
      {
        kind: "attackDamageGained",
        sequence,
        targetEntityId: targetId,
        amount: effect.payload.amount,
      },
    ],
    nextSequence: sequence + 1,
    lastDamageWasDodged,
  };
}
