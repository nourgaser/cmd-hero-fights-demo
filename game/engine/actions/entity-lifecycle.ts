import {
  clearOccupantFootprint,
  type BattleEvent,
  type BattleState,
} from "../../shared/models";
import { MOVE_POINTS_CAP } from "../../shared/game-constants";
import { resolveEffectiveNumber } from "../core/number-resolver";

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

  const removeSourceLinkedNumberRecords = (entityId: string) => {
    const removedModifierIds = nextState.activeModifiers
      .filter((modifier) => modifier.sourceEntityId === entityId)
      .map((modifier) => modifier.id);
    const removedPassiveRuleIds = nextState.activePassiveRules
      .filter((rule) => rule.source.kind === "sourceEntity" && rule.source.sourceEntityId === entityId)
      .map((rule) => rule.id);
    const hadMoveCapacityModifiers = removedModifierIds.some(
      (id) =>
        nextState.activeModifiers.find((m) => m.id === id)?.propertyPath === "moveCapacity",
    );
    const hadMoveCapacityRules = removedPassiveRuleIds.some(
      (id) =>
        nextState.activePassiveRules.find((r) => r.id === id)?.operations.some(
          (op) => op.propertyPath === "moveCapacity",
        ),
    );

    nextState = {
      ...nextState,
      activeModifiers: nextState.activeModifiers.filter((modifier) => modifier.sourceEntityId !== entityId),
      activePassiveRules: nextState.activePassiveRules.filter(
        (rule) => !(rule.source.kind === "sourceEntity" && rule.source.sourceEntityId === entityId),
      ),
    };

    for (const modifierId of removedModifierIds) {
      events.push({
        kind: "numberModifierExpired",
        sequence,
        modifierId,
        targetEntityId: entityId,
        reason: "source_removed",
      });
      sequence += 1;
    }

    for (const ruleId of removedPassiveRuleIds) {
      events.push({
        kind: "numberModifierExpired",
        sequence,
        modifierId: ruleId,
        targetEntityId: entityId,
        reason: "source_removed",
      });
      sequence += 1;
    }

    if (hadMoveCapacityModifiers || hadMoveCapacityRules) {
      clampMovesAfterCapacityRemoval(entityId);
    }
  };

  const clampMovesAfterCapacityRemoval = (affectedSourceEntityId: string) => {
    for (const [entityId, entity] of Object.entries(nextState.entitiesById)) {
      if (entity.kind === "hero") {
        const effectiveCapacity = resolveEffectiveNumber({
          state: nextState,
          targetEntityId: entityId,
          propertyPath: "moveCapacity",
          baseValue: entity.maxMovePoints,
          clampMin: 0,
        }).effectiveValue;
        const cap = Math.min(effectiveCapacity, MOVE_POINTS_CAP);
        if (entity.movePoints > cap) {
          nextState = {
            ...nextState,
            entitiesById: {
              ...nextState.entitiesById,
              [entityId]: {
                ...entity,
                movePoints: cap,
              },
            },
          };
        }
      } else if (entity.kind === "companion" && entity.ownerHeroEntityId === affectedSourceEntityId) {
        const effectiveCapacity = resolveEffectiveNumber({
          state: nextState,
          targetEntityId: entityId,
          propertyPath: "moveCapacity",
          baseValue: entity.maxMovesPerTurn,
          clampMin: 0,
        }).effectiveValue;
        const cap = Math.min(effectiveCapacity, MOVE_POINTS_CAP);
        if (entity.remainingMoves > cap) {
          nextState = {
            ...nextState,
            entitiesById: {
              ...nextState.entitiesById,
              [entityId]: {
                ...entity,
                remainingMoves: cap,
              },
            },
          };
        }
      }
    }
  };

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

    removeSourceLinkedNumberRecords(entity.entityId);

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
