import {
  type EffectExecutionContext,
  type ExecuteCardEffectResult,
} from "../context";
import { targetEntityIdFromSelector } from "../targeting";

export function handleGainArmorEffect(
  context: EffectExecutionContext,
): ExecuteCardEffectResult {
  const {
    state,
    effect,
    action,
    actorHero,
    sequence,
    lastDamageWasDodged,
    lastSummonedEntityId,
  } = context;

  if (effect.payload.kind !== "gainArmor" && effect.payload.kind !== "loseArmor") {
    return { ok: false, reason: "handleGainArmorEffect received unsupported payload." };
  }

  const signedAmount = effect.payload.kind === "gainArmor" ? effect.payload.amount : -effect.payload.amount;

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
          armor: Math.max(0, target.armor + signedAmount),
        },
      },
    },
    events: [
      {
        kind: signedAmount >= 0 ? "armorGained" : "armorLost",
        sequence,
        targetEntityId: targetId,
        amount: Math.abs(signedAmount),
      },
    ],
    nextSequence: sequence + 1,
    lastDamageWasDodged,
    lastSummonedEntityId,
  };
}

export function handleGainMagicResistEffect(
  context: EffectExecutionContext,
): ExecuteCardEffectResult {
  const {
    state,
    effect,
    action,
    actorHero,
    sequence,
    lastDamageWasDodged,
    lastSummonedEntityId,
  } = context;

  if (
    effect.payload.kind !== "gainMagicResist" &&
    effect.payload.kind !== "loseMagicResist"
  ) {
    return { ok: false, reason: "handleGainMagicResistEffect received unsupported payload." };
  }

  const signedAmount =
    effect.payload.kind === "gainMagicResist" ? effect.payload.amount : -effect.payload.amount;

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
          magicResist: Math.max(0, target.magicResist + signedAmount),
        },
      },
    },
    events: [
      {
        kind: signedAmount >= 0 ? "magicResistGained" : "magicResistLost",
        sequence,
        targetEntityId: targetId,
        amount: Math.abs(signedAmount),
      },
    ],
    nextSequence: sequence + 1,
    lastDamageWasDodged,
    lastSummonedEntityId,
  };
}

export function handleGainAttackDamageEffect(
  context: EffectExecutionContext,
): ExecuteCardEffectResult {
  const {
    state,
    effect,
    action,
    actorHero,
    sequence,
    lastDamageWasDodged,
    lastSummonedEntityId,
  } = context;

  if (
    effect.payload.kind !== "gainAttackDamage" &&
    effect.payload.kind !== "loseAttackDamage"
  ) {
    return { ok: false, reason: "handleGainAttackDamageEffect received unsupported payload." };
  }

  const signedAmount =
    effect.payload.kind === "gainAttackDamage" ? effect.payload.amount : -effect.payload.amount;

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
          attackDamage: Math.max(0, target.attackDamage + signedAmount),
        },
      },
    },
    events: [
      {
        kind: signedAmount >= 0 ? "attackDamageGained" : "attackDamageLost",
        sequence,
        targetEntityId: targetId,
        amount: Math.abs(signedAmount),
      },
    ],
    nextSequence: sequence + 1,
    lastDamageWasDodged,
    lastSummonedEntityId,
  };
}
