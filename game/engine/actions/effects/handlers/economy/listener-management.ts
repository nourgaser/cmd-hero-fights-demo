import {
  type EffectExecutionContext,
  type ExecuteCardEffectResult,
} from "../../context";

function resolveListenerSourceEntityId(context: EffectExecutionContext): string | undefined {
  const { effect, actorHero, lastSummonedEntityId, action } = context;

  if (effect.payload.kind !== "addListener") {
    return undefined;
  }

  switch (effect.payload.sourceBinding) {
    case "actorHero":
      return actorHero.entityId;
    case "lastSummonedEntity":
      return lastSummonedEntityId;
    case "selectedTarget":
      return action.selection.targetEntityId;
    default:
      return undefined;
  }
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

  const sourceEntityId = resolveListenerSourceEntityId(context);

  if ((effect.payload.sourceBinding === "lastSummonedEntity" || effect.payload.sourceBinding === "selectedTarget") && !sourceEntityId) {
    return {
      ok: false,
      reason:
        effect.payload.sourceBinding === "lastSummonedEntity"
          ? "addListener with lastSummonedEntity source binding requires a prior summon."
          : "addListener with selectedTarget source binding requires a selected target.",
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
