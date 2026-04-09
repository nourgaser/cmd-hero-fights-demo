import {
  type BattleState,
  footprintCells,
  getOccupantAt,
  type Position,
} from "../../shared/models";

const TAUNT_KEYWORD_ID = "keyword.taunt";

function hasTaunt(state: BattleState, entityId: string): boolean {
  const entity = state.entitiesById[entityId];
  return !!entity && entity.kind !== "hero" && entity.keywordIds.includes(TAUNT_KEYWORD_ID);
}

function isAdjacentToAlliedTaunt(options: {
  state: BattleState;
  targetEntityId: string;
}): boolean {
  const { state, targetEntityId } = options;
  const target = state.entitiesById[targetEntityId];
  if (!target) {
    return false;
  }

  const targetCells = footprintCells(target.anchorPosition, target.footprint);
  for (const cell of targetCells) {
    const neighbors: Position[] = [
      { row: cell.row - 1, column: cell.column },
      { row: cell.row + 1, column: cell.column },
      { row: cell.row, column: cell.column - 1 },
      { row: cell.row, column: cell.column + 1 },
    ];

    for (const neighbor of neighbors) {
      const occupant = getOccupantAt(state.battlefieldOccupancy, neighbor);
      if (!occupant || occupant.entityId === targetEntityId) {
        continue;
      }

      const adjacentEntity = state.entitiesById[occupant.entityId];
      if (!adjacentEntity) {
        continue;
      }

      if (adjacentEntity.battlefieldSide !== target.battlefieldSide) {
        continue;
      }

      if (hasTaunt(state, adjacentEntity.entityId)) {
        return true;
      }
    }
  }

  return false;
}

export function isAttackTargetProtectedByAdjacentTaunt(options: {
  state: BattleState;
  attackerEntityId: string;
  targetEntityId: string;
}): boolean {
  const { state, attackerEntityId, targetEntityId } = options;
  const attacker = state.entitiesById[attackerEntityId];
  const target = state.entitiesById[targetEntityId];
  if (!attacker || !target) {
    return false;
  }

  if (attacker.battlefieldSide === target.battlefieldSide) {
    return false;
  }

  // Taunt units are always valid attack targets.
  if (hasTaunt(state, targetEntityId)) {
    return false;
  }

  return isAdjacentToAlliedTaunt({ state, targetEntityId });
}

export function resolveAttackTargetEntityIdsWithTaunt(options: {
  state: BattleState;
  attackerEntityId: string;
}): string[] {
  const { state, attackerEntityId } = options;
  const attacker = state.entitiesById[attackerEntityId];
  if (!attacker) {
    return [];
  }

  return Object.values(state.entitiesById)
    .filter((entry) => entry.battlefieldSide !== attacker.battlefieldSide)
    .filter(
      (entry) =>
        !isAttackTargetProtectedByAdjacentTaunt({
          state,
          attackerEntityId,
          targetEntityId: entry.entityId,
        }),
    )
    .map((entry) => entry.entityId);
}
