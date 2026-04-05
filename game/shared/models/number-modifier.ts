import { z } from "zod";

import { EntityIdSchema } from "./action";

/**
 * Numeric modifier identifier: branded string.
 * Format: "mod.{effect_or_source_id}.{unique_suffix}"
 */
export const NumberModifierIdSchema = z.string().min(1).regex(/^mod\./);
export type NumberModifierId = z.infer<typeof NumberModifierIdSchema>;

/**
 * The operation a number modifier performs on a base value.
 * - add: baseValue + amount
 * - subtract: baseValue - amount (same as add with negative amount, but explicit for clarity)
 * - set: ignores baseValue, uses amount directly (used for overrides)
 */
export const NumberModifierOperationSchema = z.enum(["add", "subtract", "set"]);
export type NumberModifierOperation = z.infer<typeof NumberModifierOperationSchema>;

/**
 * Lifetime determines when a modifier expires or stops applying.
 * - persistent: remains until explicitly removed
 * - once: triggers once then removes itself
 * - untilEndOfTurn: expires at end of current turn
 * - untilSourceRemoved: expires when the source entity is removed
 * - conditional: expires when a condition no longer holds (source implemented separately)
 */
export const ModifierLifetimeSchema = z.enum([
  "persistent",
  "once",
  "untilEndOfTurn",
  "untilSourceRemoved",
  "conditional",
]);
export type ModifierLifetime = z.infer<typeof ModifierLifetimeSchema>;

/**
 * Condition for when a modifier is active.
 * - sourcePresent: modifier only applies while source entity exists
 * - always: modifier always applies (unless expired by lifetime)
 */
export const ModifierConditionSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("sourcePresent") }),
  z.object({ kind: z.literal("always") }),
]);
export type ModifierCondition = z.infer<typeof ModifierConditionSchema>;

/**
 * NumberModifier represents a traceable adjustment to any numeric value in the game.
 * Used for entity stats (armor, AD, HP), effect payload numbers (damage range, draw count), and action constants.
 *
 * Example: War Standard totem grants +1 attack damage to owner hero while present.
 * - id: "mod.effect.war-standard.buff.ad"
 * - propertyPath: "attackDamage"
 * - targetEntityId: hero's entityId
 * - operation: "add"
 * - value: 1
 * - lifetime: "untilSourceRemoved"
 * - condition: sourcePresent (the totem must exist)
 * - sourceEntityId: totem's entityId
 * - label: "War Standard bonus"
 */
export const NumberModifierSchema = z.object({
  id: NumberModifierIdSchema,
  /**
   * Dot-separated path to the property being modified.
   * Examples: "attackDamage", "dealDamage.minimum", "drawCards.amount"
   */
  propertyPath: z.string().min(1),
  targetEntityId: EntityIdSchema,
  operation: NumberModifierOperationSchema,
  value: z.number(),
  lifetime: ModifierLifetimeSchema,
  condition: ModifierConditionSchema.optional(),
  sourceEntityId: EntityIdSchema.optional(),
  label: z.string().min(1),
});

export type NumberModifier = z.infer<typeof NumberModifierSchema>;
