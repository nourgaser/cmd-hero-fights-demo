import {
  type BattleEvent,
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
    case "turnStartedIsListenerOwnerHero": {
      return event.kind === "turnStarted" && event.activeHeroEntityId === listener.ownerHeroEntityId;
    }
    default:
      return false;
  }
}

export function allConditionsMatch(listener: ListenerDefinition, event: BattleEvent): boolean {
  return listener.conditions.every((condition) =>
    conditionMatches({ condition, listener, event }),
  );
}