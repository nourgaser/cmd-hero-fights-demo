import {
  type EffectExecutionContext,
  type ExecuteCardEffectResult,
} from "../context";
import { HARD_HAND_SIZE_LIMIT } from "../../../../shared/game-constants";

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
          movePoints: latestActor.movePoints + payload.amount,
        },
      },
    },
    events: [],
    nextSequence: sequence,
    lastDamageWasDodged,
    lastSummonedEntityId,
  };
}

export function handleModifyAttackDamageWhileSourcePresentEffect(
  context: EffectExecutionContext,
): ExecuteCardEffectResult {
  if (context.effect.payload.kind !== "modifyAttackDamageWhileSourcePresent") {
    return {
      ok: false,
      reason: "handleModifyAttackDamageWhileSourcePresentEffect received unsupported payload.",
    };
  }

  return {
    ok: false,
    reason: "modifyAttackDamageWhileSourcePresent is not implemented yet.",
  };
}

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
    lastSummonedEntityId,
  };
}

export function handleAddListenerEffect(
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

  if (effect.payload.kind !== "addListener") {
    return { ok: false, reason: "handleAddListenerEffect received non-addListener payload." };
  }

  const sourceEntityId =
    effect.payload.sourceBinding === "actorHero"
      ? actorHero.entityId
      : effect.payload.sourceBinding === "lastSummonedEntity"
        ? lastSummonedEntityId
        : undefined;

  if (effect.payload.sourceBinding === "lastSummonedEntity" && !sourceEntityId) {
    return {
      ok: false,
      reason: "addListener with lastSummonedEntity source binding requires a prior summon.",
    };
  }

  const resolvedListenerId = `${effect.payload.listenerId}:${sequence}`;

  return {
    ok: true,
    state: {
      ...state,
      activeListeners: [
        ...state.activeListeners,
        {
          listenerId: resolvedListenerId,
          eventKind: effect.payload.eventKind,
          ownerHeroEntityId: actorHero.entityId,
          sourceEntityId,
          conditions: effect.payload.conditions,
          lifetime: effect.payload.lifetime,
          effects: effect.payload.effects,
        },
      ],
    },
    events: [],
    nextSequence: sequence,
    lastDamageWasDodged,
    lastSummonedEntityId,
  };
}

export function handleRemoveListenerEffect(
  context: EffectExecutionContext,
): ExecuteCardEffectResult {
  const {
    state,
    effect,
    sequence,
    lastDamageWasDodged,
    lastSummonedEntityId,
  } = context;

  const payload = effect.payload;

  if (payload.kind !== "removeListener") {
    return { ok: false, reason: "handleRemoveListenerEffect received non-removeListener payload." };
  }

  return {
    ok: true,
    state: {
      ...state,
      activeListeners: state.activeListeners.filter(
        (listener) => listener.listenerId !== payload.listenerId,
      ),
    },
    events: [],
    nextSequence: sequence,
    lastDamageWasDodged,
    lastSummonedEntityId,
  };
}
