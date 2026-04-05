import { HARD_HAND_SIZE_LIMIT } from "../../../../../shared/game-constants";
import {
  type EffectExecutionContext,
  type ExecuteCardEffectResult,
} from "../../context";
import { getEffectiveDrawCount } from "../../get-effective-number";

export function handleDrawCardsEffect(
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
  const drawCount = Math.min(
    getEffectiveDrawCount({
      state,
      targetEntityId: target.entityId,
      baseAmount: effect.payload.amount,
    }).effectiveValue,
    availableSlots,
    target.deckCardIds.length,
  );
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
    lastSummonedEntityId,
  };
}
