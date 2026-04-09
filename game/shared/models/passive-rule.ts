import { z } from "zod";

import { EntityIdSchema } from "./action";
import { EffectTargetSelectorSchema } from "./effects/selectors";

/**
 * Passive rule identifier: branded string.
 * Format: "rule.{source_identifier}.{unique_suffix}"
 */
export const PassiveRuleIdSchema = z.string().min(1).regex(/^rule\./);
export type PassiveRuleId = z.infer<typeof PassiveRuleIdSchema>;

/**
 * Binding identifies what entity or effect is the source of a passive rule.
 * - sourceEntity: rule originates from a summoned entity (weapon, totem, companion)
 * - sourceCard: rule originates from a card (less common, but allowed for aura-like effects on play)
 */
export const PassiveRuleSourceBindingSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("sourceEntity"),
    sourceEntityId: EntityIdSchema,
  }),
  z.object({
    kind: z.literal("sourceCard"),
    sourceCardInstanceId: z.string().min(1),
  }),
]);
export type PassiveRuleSourceBinding = z.infer<typeof PassiveRuleSourceBindingSchema>;

/**
 * Numeric operation describes a single numeric change applied by a passive rule.
 * Example: +1 to attackDamage, +3 to health, -2 to magicResist
 *
 * Can specify a fixed value, or dynamically reference a stat from the source entity.
 * For dynamic: armor equals hero's sharpness would use:
 * { propertyPath: "armor", operation: "set", valueFromSourceStat: "attackDamage" }
 */
export const NumericOperationSchema = z.object({
  propertyPath: z.string().min(1),
  operation: z.enum(["add", "subtract", "set"]),
  value: z.number().optional(),
  valueFromSourceStat: z.string().optional(),
  valueFromSourceSelector: z
    .enum(["sourceEntity", "sourceOwnerHero", "selfHero"])
    .optional(),
}).refine(
  (op) => op.value !== undefined || op.valueFromSourceStat !== undefined,
  "Either value or valueFromSourceStat must be specified",
);
export type NumericOperation = z.infer<typeof NumericOperationSchema>;

/**
 * Lifetime for passive rules (similar to modifiers).
 */
export const PassiveRuleLifetimeSchema = z.enum([
  "persistent",
  "untilEndOfTurn",
  "untilSourceRemoved",
]);
export type PassiveRuleLifetime = z.infer<typeof PassiveRuleLifetimeSchema>;

/**
 * Condition for when a passive rule is active.
 */
export const PassiveRuleConditionSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("sourcePresent") }),
  z.object({ kind: z.literal("always") }),
]);
export type PassiveRuleCondition = z.infer<typeof PassiveRuleConditionSchema>;

/**
 * PassiveRule represents a persistent game rule that applies numeric modifiers to targets based on a source.
 * Used for effects like:
 * - "all allies +1 armor" (source: totem, target: all allies on battlefield)
 * - "+1 AD to owner hero" (source: weapon, target: owner hero only)
 * - "adjacents gain +2 resistance" (source: entity, target: adjacent entities)
 *
 * Example: War Standard grants +1 AD to hero owner while present.
 * - id: "rule.war-standard.owner-ad"
 * - source: { kind: "sourceEntity", sourceEntityId: "summon.war-standard" }
 * - targetSelector: "sourceOwnerHero"
 * - operations: [{ propertyPath: "attackDamage", operation: "add", value: 1 }]
 * - lifetime: "untilSourceRemoved"
 * - condition: sourcePresent
 * - label: "War Standard bonus"
 */
export const PassiveRuleSchema = z.object({
  id: PassiveRuleIdSchema,
  source: PassiveRuleSourceBindingSchema,
  targetSelector: EffectTargetSelectorSchema,
  operations: z.array(NumericOperationSchema).min(1),
  lifetime: PassiveRuleLifetimeSchema,
  condition: PassiveRuleConditionSchema.optional(),
  label: z.string().min(1),
});

export type PassiveRule = z.infer<typeof PassiveRuleSchema>;
