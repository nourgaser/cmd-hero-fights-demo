import {
  type BattleState,
  type Position,
  footprintCells,
  getOccupantAt,
  positionKey,
} from "../../shared/models";

export function countAdjacentAllyOccupiedCells(options: {
  state: BattleState;
  targetEntityId: string;
}): number {
  const { state, targetEntityId } = options;
  const target = state.entitiesById[targetEntityId];
  if (!target) {
    return 0;
  }

  const targetCells = footprintCells(target.anchorPosition, target.footprint);
  const adjacentOccupiedAllyCellKeys = new Set<string>();

  for (const cell of targetCells) {
    const neighbors: Position[] = [
      { row: cell.row - 1, column: cell.column },
      { row: cell.row + 1, column: cell.column },
      { row: cell.row, column: cell.column - 1 },
      { row: cell.row, column: cell.column + 1 },
    ];

    for (const neighbor of neighbors) {
      const occupant = getOccupantAt(state.battlefieldOccupancy, neighbor);
      if (!occupant) {
        continue;
      }

      if (occupant.entityId === targetEntityId) {
        continue;
      }

      const occupantEntity = state.entitiesById[occupant.entityId];
      if (!occupantEntity) {
        continue;
      }

      if (occupantEntity.battlefieldSide !== target.battlefieldSide) {
        continue;
      }

      adjacentOccupiedAllyCellKeys.add(positionKey(neighbor));
    }
  }

  return adjacentOccupiedAllyCellKeys.size;
}
