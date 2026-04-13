import {
  type BattleEvent,
  type PlayCardAction,
  type BattleState,
} from "../../../shared/models";
import { type BattleRng } from "../../core/rng";
import {
  executeCardEffect,
  resolveActorHeroForEffect,
} from "../effects/execute-card-effect";
import { renderEffectDisplayText } from "../../../shared/models";
import { removeDefeatedSummonedEntities } from "../entity-lifecycle";
import { allConditionsMatch, listenerMatchesEvent } from "./matching";
import { type ContentRegistry } from "../../core/content-registry";

const SYNTHETIC_LISTENER_HAND_CARD_ID = "__listener__";

function createListenerTriggeredSyntheticAction(ownerHeroEntityId: string): PlayCardAction {
  return {
    kind: "playCard",
    actorHeroEntityId: ownerHeroEntityId,
    handCardId: SYNTHETIC_LISTENER_HAND_CARD_ID,
    selection: {},
  };
}

export function resolveTriggeredListeners(options: {
  state: BattleState;
  seedActionEvents: BattleEvent[];
  nextSequence: number;
  battleRng: BattleRng;
  registry: ContentRegistry;
  createSummonedEntityId: (context: {
    ownerHeroEntityId: string;
    entityDefinitionId: string;
    sequence: number;
  }) => string;
}): {
  ok: true;
  state: BattleState;
  events: BattleEvent[];
  nextSequence: number;
} | {
  ok: false;
  reason: string;
} {
  const {
    state,
    seedActionEvents,
    nextSequence,
    battleRng,
    registry,
    createSummonedEntityId,
  } = options;

  let nextState = state;
  let sequence = nextSequence;
  const producedEvents: BattleEvent[] = [];
  const queue: BattleEvent[] = [...seedActionEvents];

  while (queue.length > 0) {
    const event = queue.shift()!;

    const listeners = [...nextState.activeListeners];
    for (const listener of listeners) {
      if (!listenerMatchesEvent(listener, event)) {
        continue;
      }

      if (!allConditionsMatch(listener, event, nextState)) {
        continue;
      }

      const actorResolution = resolveActorHeroForEffect({
        state: nextState,
        actorHeroEntityId: listener.ownerHeroEntityId,
      });
      if (!actorResolution.ok) {
        continue;
      }

      let listenerLocalState = nextState;
      let listenerLocalEvents: BattleEvent[] = [];
      let lastDamageWasDodged = event.kind === "damageApplied" ? event.wasDodged : undefined;
      let lastSummonedEntityId: string | undefined;

      for (const effect of listener.effects) {
        listenerLocalEvents.push({
          kind: "listenerTriggered",
          sequence,
          listenerId: listener.listenerId,
          ownerHeroEntityId: listener.ownerHeroEntityId,
          sourceEntityId: listener.sourceEntityId,
          triggerEventKind: event.kind,
          message: renderEffectDisplayText(effect.displayText),
        });
        sequence += 1;

        const execution = executeCardEffect({
          state: listenerLocalState,
          effect,
          action: createListenerTriggeredSyntheticAction(listener.ownerHeroEntityId),
          actorHero: actorResolution.actorHero,
          sequence,
          battleRng,
          triggerEvent: event,
          lastDamageWasDodged,
          lastSummonedEntityId,
          effectSourceEntityId: listener.sourceEntityId ?? listener.ownerHeroEntityId,
          registry,
          createSummonedEntityId,
        });

        if (!execution.ok) {
          return {
            ok: false,
            reason: `Listener ${listener.listenerId} failed: ${execution.reason}`,
          };
        }

        listenerLocalState = execution.state;
        listenerLocalEvents = [...listenerLocalEvents, ...execution.events];
        sequence = execution.nextSequence;
        lastDamageWasDodged = execution.lastDamageWasDodged;
        lastSummonedEntityId = execution.lastSummonedEntityId;
      }

      const cleanup = removeDefeatedSummonedEntities({
        state: listenerLocalState,
        nextSequence: sequence,
      });

      listenerLocalState = cleanup.state;
      sequence = cleanup.nextSequence;
      listenerLocalEvents = [...listenerLocalEvents, ...cleanup.events];

      if (listener.lifetime === "once") {
        listenerLocalState = {
          ...listenerLocalState,
          activeListeners: listenerLocalState.activeListeners.filter(
            (existing) => existing.listenerId !== listener.listenerId,
          ),
        };
      }

      nextState = listenerLocalState;
      producedEvents.push(...listenerLocalEvents);
      queue.push(...listenerLocalEvents);
    }
  }

  return {
    ok: true,
    state: nextState,
    events: producedEvents,
    nextSequence: sequence,
  };
}
