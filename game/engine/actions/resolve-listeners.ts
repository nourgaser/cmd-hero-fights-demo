import {
  type BattleEvent,
  type BattleState,
  type ListenerCondition,
  type ListenerDefinition,
  type SummonedEntityKind,
} from "../../shared/models";
import { type BattleRng } from "../core/rng";
import {
  executeCardEffect,
  resolveActorHeroForEffect,
  type SummonedEntityBlueprint,
} from "./effects/execute-card-effect";
import { removeDefeatedSummonedEntities } from "./entity-lifecycle";

function listenerMatchesEvent(listener: ListenerDefinition, event: BattleEvent): boolean {
  return listener.eventKind === event.kind;
}

function conditionMatches(options: {
  condition: ListenerCondition;
  listener: ListenerDefinition;
  event: BattleEvent;
}): boolean {
  const { condition, listener, event } = options;

  switch (condition.kind) {
    case "damageNotDodged": {
      return event.kind === "damageApplied" && event.wasDodged === false;
    }
    case "damageSourceIsListenerOwnerHero": {
      return event.kind === "damageApplied" && event.sourceEntityId === listener.ownerHeroEntityId;
    }
    case "removedEntityIsListenerSource": {
      return (
        event.kind === "entityRemoved" &&
        listener.sourceEntityId !== undefined &&
        event.entityId === listener.sourceEntityId
      );
    }
    default:
      return false;
  }
}

function allConditionsMatch(listener: ListenerDefinition, event: BattleEvent): boolean {
  return listener.conditions.every((condition) =>
    conditionMatches({ condition, listener, event }),
  );
}

export function resolveTriggeredListeners(options: {
  state: BattleState;
  seedActionEvents: BattleEvent[];
  nextSequence: number;
  battleRng: BattleRng;
  createSummonedEntityId: (context: {
    ownerHeroEntityId: string;
    entityDefinitionId: string;
    sequence: number;
  }) => string;
  resolveSummonedEntityBlueprint?: (
    entityDefinitionId: string,
    kind: SummonedEntityKind,
  ) => SummonedEntityBlueprint | undefined;
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
    createSummonedEntityId,
    resolveSummonedEntityBlueprint,
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

      if (!allConditionsMatch(listener, event)) {
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
        const execution = executeCardEffect({
          state: listenerLocalState,
          effect,
          action: {
            kind: "playCard",
            actorHeroEntityId: listener.ownerHeroEntityId,
            handCardId: "__listener__",
            selection: {},
          },
          actorHero: actorResolution.actorHero,
          sequence,
          battleRng,
          triggerEvent: event,
          lastDamageWasDodged,
          lastSummonedEntityId,
          effectSourceEntityId: listener.sourceEntityId ?? listener.ownerHeroEntityId,
          createSummonedEntityId,
          resolveSummonedEntityBlueprint,
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
