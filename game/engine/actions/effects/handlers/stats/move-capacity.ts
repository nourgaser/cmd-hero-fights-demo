import { MOVE_POINTS_CAP } from "../../../../../shared/game-constants";
import type { BattleState } from "../../../../../shared/models";
import { resolveEffectiveNumber } from "../../../../core/number-resolver";

export function applyImmediateMoveCapacityDelta(options: {
  state: BattleState;
  targetEntityIds: string[];
  amount: number;
}): BattleState {
  const { state, targetEntityIds, amount } = options;
  if (amount === 0 || targetEntityIds.length === 0) {
    return state;
  }

  const nextEntitiesById = { ...state.entitiesById };

  for (const targetEntityId of targetEntityIds) {
    const entity = nextEntitiesById[targetEntityId];
    if (!entity) {
      continue;
    }

    if (entity.kind === "hero") {
      const effectiveMoveCapacity = resolveEffectiveNumber({
        state,
        targetEntityId,
        propertyPath: "moveCapacity",
        baseValue: entity.maxMovePoints,
        clampMin: 0,
      }).effectiveValue;
      const cap = Math.min(effectiveMoveCapacity, MOVE_POINTS_CAP);

      nextEntitiesById[targetEntityId] = {
        ...entity,
        movePoints: Math.max(0, Math.min(entity.movePoints + amount, cap)),
      };
      continue;
    }

    if (entity.kind === "companion") {
      const effectiveMoveCapacity = resolveEffectiveNumber({
        state,
        targetEntityId,
        propertyPath: "moveCapacity",
        baseValue: entity.maxMovesPerTurn,
        clampMin: 0,
      }).effectiveValue;
      const cap = Math.min(effectiveMoveCapacity, MOVE_POINTS_CAP);

      nextEntitiesById[targetEntityId] = {
        ...entity,
        remainingMoves: Math.max(0, Math.min(entity.remainingMoves + amount, cap)),
      };
    }
  }

  return {
    ...state,
    entitiesById: nextEntitiesById,
  };
}
