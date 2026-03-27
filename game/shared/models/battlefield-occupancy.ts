import { z } from "zod";

import { EntityIdSchema } from "./action";
import { PositionSchema, type Position, positionKey } from "./position";

// Encoded position key format for occupancy maps: "row:column".
export const PositionKeySchema = z
  .string()
  .regex(/^\d+:\d+$/, "Position key must be in row:column format.");
export type PositionKey = z.infer<typeof PositionKeySchema>;

export const OccupantKindSchema = z.enum(["hero", "companion", "totem", "weapon"]);
export type OccupantKind = z.infer<typeof OccupantKindSchema>;

export const OccupantSchema = z.object({
  entityId: EntityIdSchema,
  ownerHeroEntityId: EntityIdSchema,
  kind: OccupantKindSchema,
});
export type Occupant = z.infer<typeof OccupantSchema>;

export const BattlefieldDimensionsSchema = z.object({
  rows: z.number().int().positive(),
  columns: z.number().int().positive(),
});
export type BattlefieldDimensions = z.infer<typeof BattlefieldDimensionsSchema>;

export const BattlefieldOccupancySchema = z.object({
  dimensions: BattlefieldDimensionsSchema,
  occupiedByPosition: z.record(PositionKeySchema, OccupantSchema),
});
export type BattlefieldOccupancy = z.infer<typeof BattlefieldOccupancySchema>;

function asPositionKey(position: Position): PositionKey {
  return positionKey(position);
}

export function createEmptyBattlefieldOccupancy(
  dimensions: BattlefieldDimensions,
): BattlefieldOccupancy {
  return {
    dimensions,
    occupiedByPosition: {},
  };
}

export function isInsideBattlefield(
  position: Position,
  dimensions: BattlefieldDimensions,
): boolean {
  return (
    position.row >= 0 &&
    position.column >= 0 &&
    position.row < dimensions.rows &&
    position.column < dimensions.columns
  );
}

export function getOccupantAt(
  occupancy: BattlefieldOccupancy,
  position: Position,
): Occupant | undefined {
  return occupancy.occupiedByPosition[asPositionKey(position)];
}

export function setOccupantAt(
  occupancy: BattlefieldOccupancy,
  position: Position,
  occupant: Occupant,
): BattlefieldOccupancy {
  const key = asPositionKey(position);
  return {
    dimensions: occupancy.dimensions,
    occupiedByPosition: {
      ...occupancy.occupiedByPosition,
      [key]: occupant,
    },
  };
}

export function clearOccupantAt(
  occupancy: BattlefieldOccupancy,
  position: Position,
): BattlefieldOccupancy {
  const key = asPositionKey(position);
  if (!(key in occupancy.occupiedByPosition)) {
    return occupancy;
  }

  const next = { ...occupancy.occupiedByPosition };
  delete next[key];

  return {
    dimensions: occupancy.dimensions,
    occupiedByPosition: next,
  };
}

export function canOccupyPosition(
  occupancy: BattlefieldOccupancy,
  position: Position,
): boolean {
  return (
    isInsideBattlefield(position, occupancy.dimensions) &&
    getOccupantAt(occupancy, position) === undefined
  );
}

export function allOccupiedPositions(occupancy: BattlefieldOccupancy): Position[] {
  const positions: Position[] = [];

  for (const key of Object.keys(occupancy.occupiedByPosition)) {
    const [rowText, columnText] = key.split(":");
    const row = Number(rowText);
    const column = Number(columnText);

    if (Number.isInteger(row) && Number.isInteger(column)) {
      positions.push({ row, column });
    }
  }

  return positions;
}

export const OccupancyCellSchema = z.object({
  position: PositionSchema,
  occupant: OccupantSchema.optional(),
});
export type OccupancyCell = z.infer<typeof OccupancyCellSchema>;
