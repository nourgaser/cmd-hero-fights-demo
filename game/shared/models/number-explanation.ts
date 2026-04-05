import { z } from "zod";

/**
 * NumberContribution describes a single source's contribution to a modified number.
 * Used in number explanations for UI display and debugging.
 */
export const NumberContributionSchema = z.object({
  sourceId: z.string().min(1),
  label: z.string().min(1),
  delta: z.number(),
});

export type NumberContribution = z.infer<typeof NumberContributionSchema>;

/**
 * NumberExplanation provides full traceability for any numeric value:
 * base value + all contributions = effective value.
 *
 * Example: Hero's attack damage is 5
 * - propertyPath: "attackDamage"
 * - baseValue: 5
 * - contributions: [
 *     { sourceId: "mod.battle-focus", label: "Battle Focus", delta: +2 },
 *     { sourceId: "rule.war-standard", label: "War Standard", delta: +1 },
 *   ]
 * - effectiveValue: 8
 */
export const NumberExplanationSchema = z.object({
  propertyPath: z.string().min(1),
  baseValue: z.number(),
  contributions: z.array(NumberContributionSchema).default([]),
  effectiveValue: z.number(),
});

export type NumberExplanation = z.infer<typeof NumberExplanationSchema>;
