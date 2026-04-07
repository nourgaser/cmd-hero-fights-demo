import {
  type BattleEvent,
  type BattleState,
  type ListenerCondition,
  type ListenerDefinition,
} from "../../../shared/models";

export function listenerMatchesEvent(listener: ListenerDefinition, event: BattleEvent): boolean {
  return listener.eventKind === event.kind;
}

function conditionMatches(options: {
  condition: ListenerCondition;
  listener: ListenerDefinition;
  event: BattleEvent;
  state: BattleState;
}): boolean {
  const { condition, listener, event, state } = options;

  switch (condition.kind) {
    case "damageNotDodged": {
      return event.kind === "damageApplied" && event.wasDodged === false;
    }
    case "damageSourceIsListenerOwnerHero": {
      if (event.kind !== "damageApplied") {
        return false;
      }

      if (event.sourceEntityId === listener.ownerHeroEntityId) {
        return true;
      }

      if (!event.sourceEntityId) {
        return false;
      }

      const sourceEntity = state.entitiesById[event.sourceEntityId];
      return (
        !!sourceEntity &&
        sourceEntity.kind === "weapon" &&
        sourceEntity.ownerHeroEntityId === listener.ownerHeroEntityId
      );
    }
    case "removedEntityIsListenerSource": {
      return (
        event.kind === "entityRemoved" &&
        listener.sourceEntityId !== undefined &&
        event.entityId === listener.sourceEntityId
      );
    }
    case "turnStartedIsListenerOwnerHero": {
      return event.kind === "turnStarted" && event.activeHeroEntityId === listener.ownerHeroEntityId;
    }
    default:
      return false;
  }
}

export function allConditionsMatch(
  listener: ListenerDefinition,
  event: BattleEvent,
  state: BattleState,
): boolean {
  return listener.conditions.every((condition) =>
    conditionMatches({ condition, listener, event, state }),
  );
}