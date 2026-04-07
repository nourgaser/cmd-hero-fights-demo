import {
  type EffectExecutionContext,
  type ExecuteCardEffectResult,
} from "../../context";
import { getEffectiveRefundAmount } from "../../get-effective-number";
import { MOVE_POINTS_CAP } from "../../../../../shared/game-constants";

export function handleRefundMoveCostEffect(
  context: EffectExecutionContext,
): ExecuteCardEffectResult {
  const {
    state,
    effect,
    actorHero,
    sequence,
    lastDamageWasDodged,
    lastSummonedEntityId,
  } = context;

  if (effect.payload.kind !== "refundMoveCost") {
    return { ok: false, reason: "handleRefundMoveCostEffect received non-refundMoveCost payload." };
  }

  const payload = effect.payload;

  const shouldRefund =
    payload.condition === "always" ||
    (payload.condition === "ifNotDodged" && lastDamageWasDodged === false);

  if (!shouldRefund) {
    return {
      ok: true,
      state,
      events: [],
      nextSequence: sequence,
      lastDamageWasDodged,
      lastSummonedEntityId,
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
          movePoints: Math.min(
            latestActor.movePoints +
              getEffectiveRefundAmount({
                state,
                targetEntityId: actorHero.entityId,
                baseAmount: payload.amount,
              }).effectiveValue,
            latestActor.maxMovePoints,
            MOVE_POINTS_CAP,
          ),
        },
      },
    },
    events: [],
    nextSequence: sequence,
    lastDamageWasDodged,
    lastSummonedEntityId,
  };
}
