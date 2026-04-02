import {
  clearOccupantFootprint,
  type BattleEvent,
  type BattleState,
} from "../../shared/models";

export function removeDefeatedSummonedEntities(options: {
  state: BattleState;
  nextSequence: number;
}): {
  state: BattleState;
  events: BattleEvent[];
  nextSequence: number;
} {
  const { state, nextSequence } = options;

  let sequence = nextSequence;
  const events: BattleEvent[] = [];
  let nextState = state;

  for (const entity of Object.values(nextState.entitiesById)) {
    if (entity.kind === "hero") {
      continue;
    }

    if (entity.currentHealth > 0) {
      continue;
    }

    const remainingEntities = { ...nextState.entitiesById };
    delete remainingEntities[entity.entityId];

    nextState = {
      ...nextState,
      entitiesById: remainingEntities,
      activeListeners: nextState.activeListeners.filter(
        (listener) => listener.sourceEntityId !== entity.entityId,
      ),
      battlefieldOccupancy: clearOccupantFootprint(
        nextState.battlefieldOccupancy,
        entity.anchorPosition,
        entity.footprint,
      ),
    };

    events.push({
      kind: "entityRemoved",
      sequence,
      entityId: entity.entityId,
      ownerHeroEntityId: entity.ownerHeroEntityId,
      reason: "defeated",
    });
    sequence += 1;
  }

  return {
    state: nextState,
    events,
    nextSequence: sequence,
  };
}
