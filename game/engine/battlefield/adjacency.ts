import {
  type BattleState,
  type Position,
  footprintCells,
  getOccupantAt,
  positionKey,
} from "../../shared/models";

const CHIVALRY_KEYWORD_ID = "keyword.chivalry";

export function countAdjacentAllyOccupiedCells(options: {
  state: BattleState;
  targetEntityId: string;
}): number {
  return resolveAdjacentAllyDefenseContribution(options).baseCount;
}

export function resolveAdjacentAllyDefenseContribution(options: {
  state: BattleState;
  targetEntityId: string;
}): { baseCount: number; chivalryBonus: number } {
  const { state, targetEntityId } = options;
  const target = state.entitiesById[targetEntityId];
  if (!target) {
    return { baseCount: 0, chivalryBonus: 0 };
  }

  const targetCells = footprintCells(target.anchorPosition, target.footprint);
  const adjacentOccupiedAllyCellKeys = new Set<string>();
  let chivalryBonus = 0;

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

      const neighborKey = positionKey(neighbor);
      if (adjacentOccupiedAllyCellKeys.has(neighborKey)) {
        continue;
      }

      adjacentOccupiedAllyCellKeys.add(neighborKey);

      if (
        occupantEntity.kind !== "hero" &&
        occupantEntity.keywordIds.includes(CHIVALRY_KEYWORD_ID)
      ) {
        // Chivalry doubles adjacency-based defense buffs from adjacent allied chivalry units.
        chivalryBonus += 1;
      }
    }
  }

  return {
    baseCount: adjacentOccupiedAllyCellKeys.size,
    chivalryBonus,
  };
}

export function resolveAdjacentAllyEntityIds(options: {
  state: BattleState;
  targetEntityId: string;
}): string[] {
  const { state, targetEntityId } = options;
  const target = state.entitiesById[targetEntityId];
  if (!target) {
    return [];
  }

  const targetCells = footprintCells(target.anchorPosition, target.footprint);
  const adjacentEntityIds = new Set<string>();

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

      const occupantEntity = state.entitiesById[occupant.entityId];
      if (!occupantEntity) {
        continue;
      }

      if (occupantEntity.battlefieldSide !== target.battlefieldSide) {
        continue;
      }

      adjacentEntityIds.add(occupant.entityId);
    }
  }

  return [...adjacentEntityIds].sort((a, b) => a.localeCompare(b));
}
