import { z } from "zod";

// Serializable battlefield coordinate used across engine actions and state.
export const PositionSchema = z.object({
  row: z.number().int().nonnegative(),
  column: z.number().int().nonnegative(),
});

export type Position = z.infer<typeof PositionSchema>;

export function positionKey(position: Position): string {
  return `${position.row}:${position.column}`;
}

export function isSamePosition(a: Position, b: Position): boolean {
  return a.row === b.row && a.column === b.column;
}
