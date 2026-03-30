import {
  type EffectExecutionContext,
  type ExecuteCardEffectResult,
} from "../context";

export function handleRefundMoveCostEffect(
  context: EffectExecutionContext,
): ExecuteCardEffectResult {
  const { state, effect, actorHero, sequence, lastDamageWasDodged } = context;

  if (effect.payload.kind !== "refundMoveCost") {
    return { ok: false, reason: "handleRefundMoveCostEffect received non-refundMoveCost payload." };
  }

  const shouldRefund =
    effect.payload.condition === "always" ||
    (effect.payload.condition === "ifNotDodged" && lastDamageWasDodged === false);

  if (!shouldRefund) {
    return {
      ok: true,
      state,
      events: [],
      nextSequence: sequence,
      lastDamageWasDodged,
    };
  }

  const latestActor = state.entitiesById[actorHero.entityId];
  if (!latestActor || latestActor.kind !== "hero") {
    return {
      ok: false,
      reason: "Actor hero disappeared before refundMoveCost execution.",
    };
  }

  return {
    ok: true,
    state: {
      ...state,
      entitiesById: {
        ...state.entitiesById,
        [actorHero.entityId]: {
          ...latestActor,
          movePoints: latestActor.movePoints + effect.payload.amount,
        },
      },
    },
    events: [],
    nextSequence: sequence,
    lastDamageWasDodged,
  };
}

export function handleModifyAttackDamageWhileSourcePresentEffect(
  context: EffectExecutionContext,
): ExecuteCardEffectResult {
  const { state, sequence, lastDamageWasDodged } = context;

  return {
    ok: true,
    state,
    events: [],
    nextSequence: sequence,
    lastDamageWasDodged,
  };
}
