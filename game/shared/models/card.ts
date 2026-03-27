import { z } from "zod";

import { EffectDefinitionSchema, EffectDisplayTextSchema } from "./effect";
import { HeroIdSchema } from "./hero";

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
  tags: z.array(z.string().min(1)).default([]),
});
export type CardDefinition = z.infer<typeof CardDefinitionSchema>;
