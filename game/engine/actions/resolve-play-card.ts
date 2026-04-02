import {
  type BattleEvent,
  type BattleState,
  type CardDefinition,
  type EntityFootprint,
  type EffectDefinition,
  type PlayCardAction,
  type SummonedEntityKind,
} from "../../shared/models";
import { type BattleRng } from "../core/rng";
import {
  executeCardEffect,
  resolveActorHeroForEffect,
  type SummonedEntityBlueprint,
} from "./effects/execute-card-effect.ts";
import { validatePlayCardAction } from "./validate-play-card";

export type ResolvePlayCardResult =
  | {
      ok: true;
      state: BattleState;
      events: BattleEvent[];
      nextSequence: number;
      resultMessage: string;
    }
  | {
      ok: false;
      state: BattleState;
      reason: string;
    };

export function resolvePlayCardAction(options: {
  state: BattleState;
  action: PlayCardAction;
  cardDefinitionsById: Record<string, CardDefinition>;
  nextSequence: number;
  battleRng: BattleRng;
  createSummonedEntityId: (context: {
    ownerHeroEntityId: string;
    entityDefinitionId: string;
    sequence: number;
  }) => string;
  resolveSummonFootprint?: (entityDefinitionId: string) => EntityFootprint | undefined;
  resolveSummonedEntityBlueprint?: (
    entityDefinitionId: string,
    kind: SummonedEntityKind,
  ) => SummonedEntityBlueprint | undefined;
}): ResolvePlayCardResult {
  const {
    state,
    action,
    cardDefinitionsById,
    nextSequence,
    battleRng,
    createSummonedEntityId,
    resolveSummonFootprint,
    resolveSummonedEntityBlueprint,
  } = options;

  const validation = validatePlayCardAction({
    state,
    action,
    cardDefinitionsById,
    resolveSummonFootprint,
  });
  if (!validation.ok) {
    return {
      ok: false,
      state,
      reason: validation.reason,
    };
  }

  const actor = state.entitiesById[action.actorHeroEntityId];
  if (!actor || actor.kind !== "hero") {
    return {
      ok: false,
      state,
      reason: "Acting hero was not found during play-card resolution.",
    };
  }
  const actorHero = actor;

  const handCard = actor.handCards.find((entry) => entry.id === action.handCardId);
  if (!handCard) {
    return {
      ok: false,
      state,
      reason: "Hand card disappeared before play-card resolution.",
    };
  }

  const card = validation.card;

  let sequence = nextSequence;
  const events: BattleEvent[] = [];
  let lastDamageWasDodged: boolean | undefined;
  let lastSummonedEntityId: string | undefined;

  // Stage 2: apply card cost and move card from hand to discard.
  const actorAfterCost = {
    ...actorHero,
    movePoints: actorHero.movePoints - card.moveCost,
    handCards: actorHero.handCards.filter((entry) => entry.id !== action.handCardId),
    discardCardIds: [...actorHero.discardCardIds, handCard.cardDefinitionId],
  };

  let nextState: BattleState = {
    ...state,
    entitiesById: {
      ...state.entitiesById,
      [actorHero.entityId]: actorAfterCost,
    },
  };

  events.push({
    kind: "cardPlayed",
    sequence,
    actorHeroEntityId: actorHero.entityId,
    handCardId: handCard.id,
    cardDefinitionId: handCard.cardDefinitionId,
  });
  sequence += 1;

  // Stage 3: execute card effects through dedicated handler module.
  for (const effect of card.effects as EffectDefinition[]) {
    const actorResolution = resolveActorHeroForEffect({
      state: nextState,
      actorHeroEntityId: actorHero.entityId,
    });
    if (!actorResolution.ok) {
      return {
        ok: false,
        state,
        reason: actorResolution.reason,
      };
    }

    const execution = executeCardEffect({
      state: nextState,
      effect,
      action,
      actorHero: actorResolution.actorHero,
      sequence,
      battleRng,
      triggerEvent: undefined,
      lastDamageWasDodged,
      lastSummonedEntityId,
      effectSourceEntityId: actorHero.entityId,
      createSummonedEntityId,
      resolveSummonedEntityBlueprint,
    });

    if (!execution.ok) {
      return {
        ok: false,
        state,
        reason: execution.reason,
      };
    }

    nextState = execution.state;
    events.push(...execution.events);
    sequence = execution.nextSequence;
    lastDamageWasDodged = execution.lastDamageWasDodged;
    lastSummonedEntityId = execution.lastSummonedEntityId;
  }

  // Stage 4: emit action resolved event.
  events.push({
    kind: "actionResolved",
    sequence,
    action,
  });
  sequence += 1;

  return {
    ok: true,
    state: nextState,
    events,
    nextSequence: sequence,
    resultMessage: `Played ${card.name}.`,
  };
}
