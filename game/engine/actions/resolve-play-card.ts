import {
  type BattleEvent,
  type BattleState,
  type PlayCardAction,
} from "../../shared/models";
import { type BattleRng } from "../core/rng";
import { applyPlayCardCostAndMoveToDiscard, executePlayCardEffects } from "./play-card";
import { validatePlayCardAction } from "./validate-play-card";
import { type ContentRegistry } from "../core/content-registry";

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
  registry: ContentRegistry;
  nextSequence: number;
  battleRng: BattleRng;
}): ResolvePlayCardResult {
  const {
    state,
    action,
    registry,
    nextSequence,
    battleRng,
  } = options;

  const validation = validatePlayCardAction({
    state,
    action,
    registry,
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
  let nextState = applyPlayCardCostAndMoveToDiscard({
    state,
    actorHero,
    handCard,
    card,
  });

  events.push({
    kind: "cardPlayed",
    sequence,
    actorHeroEntityId: actorHero.entityId,
    handCardId: handCard.id,
    cardDefinitionId: handCard.cardDefinitionId,
  });
  sequence += 1;

  const effectsExecution = executePlayCardEffects({
    state: nextState,
    action,
    card,
    actorHeroEntityId: actorHero.entityId,
    nextSequence: sequence,
    battleRng,
    registry,
  });
  if (!effectsExecution.ok) {
    return {
      ok: false,
      state,
      reason: effectsExecution.reason,
    };
  }

  nextState = effectsExecution.state;
  events.push(...effectsExecution.events);
  sequence = effectsExecution.nextSequence;

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
