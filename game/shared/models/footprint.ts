import { z } from "zod";

import { PositionSchema, type Position } from "./position";

// All offsets are relative to an entity's top-left anchor cell.
export const FootprintOffsetSchema = z.object({
  row: z.number().int().nonnegative(),
  column: z.number().int().nonnegative(),
});
export type FootprintOffset = z.infer<typeof FootprintOffsetSchema>;

export const EntityFootprintSchema = z
  .array(FootprintOffsetSchema)
  .min(1)
  .refine(
    (offsets) => offsets.some((offset) => offset.row === 0 && offset.column === 0),
    {
      message: "Footprint must include top-left anchor offset 0,0.",
    },
  )
  .refine(
    (offsets) => {
      const seen = new Set(offsets.map((offset) => `${offset.row}:${offset.column}`));
      return seen.size === offsets.length;
    },
    {
      message: "Footprint offsets must be unique.",
    },
  );
export type EntityFootprint = z.infer<typeof EntityFootprintSchema>;

export const SingleCellFootprint: EntityFootprint = [{ row: 0, column: 0 }];

export function footprintCells(
  anchor: Position,
  footprint: EntityFootprint,
): Position[] {
  return footprint.map((offset) => ({
    row: anchor.row + offset.row,
    column: anchor.column + offset.column,
  }));
}

export const AnchoredFootprintSchema = z.object({
  anchor: PositionSchema,
  footprint: EntityFootprintSchema,
});
export type AnchoredFootprint = z.infer<typeof AnchoredFootprintSchema>;
