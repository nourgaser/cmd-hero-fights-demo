import { z } from "zod";

import { EntityIdSchema } from "./action";

export const REACTIVE_BULWARK_AURA_KIND = "reactiveBulwarkResistance" as const;
export const REACTIVE_BULWARK_AURA_DURATION_TURNS = 4;
export const REACTIVE_BULWARK_BASE_RESISTANCE_BONUS = 3;
export const REACTIVE_BULWARK_AMPLIFIED_RESISTANCE_BONUS = 5;

export const AuraKindSchema = z.enum([REACTIVE_BULWARK_AURA_KIND]);
export type AuraKind = z.infer<typeof AuraKindSchema>;

export const AuraInstanceSchema = z.object({
  id: z.string().min(1),
  kind: AuraKindSchema,
  ownerHeroEntityId: EntityIdSchema,
  sourceEffectId: z.string().min(1),
  expiresOnTurnNumber: z.number().int().positive(),
  baseResistanceBonus: z.number().int().nonnegative(),
  amplifiedResistanceBonus: z.number().int().nonnegative(),
});
export type AuraInstance = z.infer<typeof AuraInstanceSchema>;