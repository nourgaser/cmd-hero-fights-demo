import { z } from "zod";

import { EffectDefinitionSchema, EffectDisplayTextSchema } from "./effects/index";
import { HeroIdSchema } from "./hero";
import { KeywordIdSchema, KeywordSchema } from "./keyword";

export const CardIdSchema = z.string().min(1);
export type CardId = z.infer<typeof CardIdSchema>;

export const CardTypeSchema = z.enum(["ability", "weapon", "totem", "companion"]);
export type CardType = z.infer<typeof CardTypeSchema>;

export const CardRaritySchema = z.enum(["common", "rare", "ultimate", "general"]);
export type CardRarity = z.infer<typeof CardRaritySchema>;

export const CardTargetingSchema = z.enum([
  "none",
  "selectedAny",
  "selectedEnemy",
  "selectedAlly",
]);
export type CardTargeting = z.infer<typeof CardTargetingSchema>;

export const CardCastConditionSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("heroHealthBelow"),
    threshold: z.number().int().nonnegative(),
  }),
]);
export type CardCastCondition = z.infer<typeof CardCastConditionSchema>;

export function isCardCastConditionMet(options: {
  condition: CardCastCondition;
  currentHealth: number;
}): boolean {
  const { condition, currentHealth } = options;

  switch (condition.kind) {
    case "heroHealthBelow":
      return currentHealth < condition.threshold;
    default:
      return true;
  }
}

export const CardDefinitionSchema = z.object({
  id: CardIdSchema,
  name: z.string().min(1),
  type: CardTypeSchema,
  rarity: CardRaritySchema,
  heroId: HeroIdSchema.optional(),
  moveCost: z.number().int().nonnegative(),
  targeting: CardTargetingSchema,
  effects: z.array(EffectDefinitionSchema).min(1),
  summaryText: EffectDisplayTextSchema.optional(),
  castCondition: CardCastConditionSchema.optional(),
  /**
   * Keywords are reusable game mechanics that this card references.
   * Can be either full Keyword objects or just keyword IDs.
   * Keywords allow UI to display canonical descriptions and enable effect reuse.
   * Example: A card might have "Chivalry" keyword + unique "follow-up attack" effect.
   */
  keywords: z.union([
    z.array(KeywordSchema),
    z.array(KeywordIdSchema),
  ]).default([]),
  /**
   * Tags are lightweight metadata for filtering/grouping that don't correspond to keywords.
   * Retained for backward compatibility and non-keyword use cases.
   */
  tags: z.array(z.string().min(1)).default([]),
});
export type CardDefinition = z.infer<typeof CardDefinitionSchema>;
