import { z } from "zod";

import { DamageTypeSchema } from "../hero";
import { EffectTargetSelectorSchema, SummonPlacementSelectorSchema } from "./selectors";

export const ModifiableStatSchema = z.enum([
  "armor",
  "magicResist",
  "attackDamage",
  "abilityPower",
]);

export const DealDamageEffectPayloadSchema = z
  .object({
    kind: z.literal("dealDamage"),
    target: EffectTargetSelectorSchema,
    minimum: z.number().nonnegative(),
    maximum: z.number().nonnegative(),
    damageType: DamageTypeSchema,
    attackDamageScaling: z.number().nonnegative().default(0),
    abilityPowerScaling: z.number().nonnegative().default(0),
    armorScaling: z.number().nonnegative().default(0),
    canBeDodged: z.boolean().default(true),
  })
  .refine((payload) => payload.maximum >= payload.minimum, {
    message: "maximum must be greater than or equal to minimum.",
    path: ["maximum"],
  });

export const HealEffectPayloadSchema = z
  .object({
    kind: z.literal("heal"),
    target: EffectTargetSelectorSchema,
    minimum: z.number().nonnegative(),
    maximum: z.number().nonnegative(),
  })
  .refine((payload) => payload.maximum >= payload.minimum, {
    message: "maximum must be greater than or equal to minimum.",
    path: ["maximum"],
  });

export const ModifyStatEffectPayloadSchema = z.object({
  kind: z.literal("modifyStat"),
  target: EffectTargetSelectorSchema,
  stat: ModifiableStatSchema,
  amount: z.number(),
  duration: z.enum(["persistent", "untilSourceRemoved"]).default("persistent"),
  changeKind: z.enum(["apply", "removeMatching"]).default("apply"),
  sourceBinding: z.enum(["effectSource", "lastSummonedEntity"]).optional(),
});

export const DrawCardsEffectPayloadSchema = z.object({
  kind: z.literal("drawCards"),
  target: EffectTargetSelectorSchema,
  amount: z.number().int().positive(),
});

export const SummonEntityEffectPayloadSchema = z.object({
  kind: z.literal("summonEntity"),
  entityKind: z.enum(["weapon", "totem", "companion"]),
  entityDefinitionId: z.string().min(1),
  placement: SummonPlacementSelectorSchema,
});

export const RefundMoveCostEffectPayloadSchema = z.object({
  kind: z.literal("refundMoveCost"),
  amount: z.number().int().positive(),
  condition: z.enum(["always", "ifNotDodged"]),
});

export const DestroyArmorAndDealPerArmorToEnemyHeroEffectPayloadSchema = z.object({
  kind: z.literal("destroyArmorAndDealPerArmorToEnemyHero"),
  target: EffectTargetSelectorSchema,
  damagePerArmor: z.number().int().nonnegative(),
  damageType: DamageTypeSchema,
});

export const DestroySelfArmorAndDealPerArmorToTargetEffectPayloadSchema = z.object({
  kind: z.literal("destroySelfArmorAndDealPerArmorToTarget"),
  target: EffectTargetSelectorSchema,
  damagePerArmor: z.number().int().nonnegative(),
  damageType: DamageTypeSchema,
});
