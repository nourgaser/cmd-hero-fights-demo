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

const HARD_HAND_SIZE_LIMIT = 7;

export function handleDrawCardsEffect(
  context: EffectExecutionContext,
): ExecuteCardEffectResult {
  const { state, effect, action, actorHero, sequence, lastDamageWasDodged } = context;

  if (effect.payload.kind !== "drawCards") {
    return { ok: false, reason: "handleDrawCardsEffect received non-drawCards payload." };
  }

  const targetId =
    effect.payload.target === "selfHero" || effect.payload.target === "sourceOwnerHero"
      ? actorHero.entityId
      : action.selection.targetEntityId;

  if (!targetId) {
    return { ok: false, reason: "drawCards requires a valid hero target." };
  }

  const target = state.entitiesById[targetId];
  if (!target || target.kind !== "hero") {
    return { ok: false, reason: "drawCards target hero was not found." };
  }

  const availableSlots = Math.max(0, HARD_HAND_SIZE_LIMIT - target.handCards.length);
  const drawCount = Math.min(effect.payload.amount, availableSlots, target.deckCardIds.length);
  const drawnCardIds = target.deckCardIds.slice(0, drawCount);
  const remainingDeck = target.deckCardIds.slice(drawCount);

  const nextHandCards = [
    ...target.handCards,
    ...drawnCardIds.map((cardDefinitionId, index) => ({
      id: `${target.entityId}:hand:draw:${sequence}:${index + 1}`,
      cardDefinitionId,
    })),
  ];

  const nextState = {
    ...state,
    entitiesById: {
      ...state.entitiesById,
      [target.entityId]: {
        ...target,
        deckCardIds: remainingDeck,
        handCards: nextHandCards,
      },
    },
  };

  const events = drawnCardIds.map((cardDefinitionId, index) => ({
    kind: "cardDrawn" as const,
    sequence: sequence + index,
    heroEntityId: target.entityId,
    handCardId: nextHandCards[target.handCards.length + index]!.id,
    cardDefinitionId,
  }));

  return {
    ok: true,
    state: nextState,
    events,
    nextSequence: sequence + events.length,
    lastDamageWasDodged,
  };
}
