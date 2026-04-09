import { z } from "zod";

export const EffectTargetSelectorSchema = z.enum([
  "none",
  "selfHero",
  "sourceOwnerHero",
  "randomSourceOwnerAlly",
  "sourceOwnerAllies",
  "sourceOwnerHeroAndCompanions",
  "sourceEntity",
  "sourceEntityAdjacentAllies",
  "selectedEnemy",
  "selectedAny",
  "selectedAlly",
  "triggeringTarget",
  "triggeringSourceEntity",
]);
export type EffectTargetSelector = z.infer<typeof EffectTargetSelectorSchema>;

export const SummonPlacementSelectorSchema = z.enum([
  "selectedEmptyPosition",
]);
export type SummonPlacementSelector = z.infer<typeof SummonPlacementSelectorSchema>;
