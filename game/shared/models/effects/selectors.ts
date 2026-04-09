import { z } from "zod";

export const EffectTargetSelectorSchema = z.enum([
  "none",
  "selfHero",
  "sourceOwnerHero",
  "sourceEntity",
  "selectedEnemy",
  "selectedAny",
  "selectedAlly",
  "triggeringTarget",
]);
export type EffectTargetSelector = z.infer<typeof EffectTargetSelectorSchema>;

export const SummonPlacementSelectorSchema = z.enum([
  "selectedEmptyPosition",
]);
export type SummonPlacementSelector = z.infer<typeof SummonPlacementSelectorSchema>;
