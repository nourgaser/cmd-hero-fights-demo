import { z } from "zod";

import { DamageTypeSchema } from "../hero";
import { EffectTargetSelectorSchema, SummonPlacementSelectorSchema } from "./selectors";

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

export const GainArmorEffectPayloadSchema = z.object({
  kind: z.literal("gainArmor"),
  target: EffectTargetSelectorSchema,
  amount: z.number().int().positive(),
});

export const LoseArmorEffectPayloadSchema = z.object({
  kind: z.literal("loseArmor"),
  target: EffectTargetSelectorSchema,
  amount: z.number().int().positive(),
});

export const GainMagicResistEffectPayloadSchema = z.object({
  kind: z.literal("gainMagicResist"),
  target: EffectTargetSelectorSchema,
  amount: z.number().int().positive(),
});

export const LoseMagicResistEffectPayloadSchema = z.object({
  kind: z.literal("loseMagicResist"),
  target: EffectTargetSelectorSchema,
  amount: z.number().int().positive(),
});

export const GainAttackDamageEffectPayloadSchema = z.object({
  kind: z.literal("gainAttackDamage"),
  target: EffectTargetSelectorSchema,
  amount: z.number().int().positive(),
});

export const LoseAttackDamageEffectPayloadSchema = z.object({
  kind: z.literal("loseAttackDamage"),
  target: EffectTargetSelectorSchema,
  amount: z.number().int().positive(),
});

export const DrawCardsEffectPayloadSchema = z.object({
  kind: z.literal("drawCards"),
  target: EffectTargetSelectorSchema,
  amount: z.number().int().positive(),
});

export const ModifyAttackDamageWhileSourcePresentEffectPayloadSchema = z.object({
  kind: z.literal("modifyAttackDamageWhileSourcePresent"),
  target: EffectTargetSelectorSchema,
  amount: z.number(),
  sourceBinding: z.enum(["effectSource", "lastSummonedEntity"]).optional(),
});

export const ModifyArmorWhileSourcePresentEffectPayloadSchema = z.object({
  kind: z.literal("modifyArmorWhileSourcePresent"),
  target: EffectTargetSelectorSchema,
  amount: z.number(),
  sourceBinding: z.enum(["effectSource", "lastSummonedEntity"]).optional(),
});

export const ModifyMagicResistWhileSourcePresentEffectPayloadSchema = z.object({
  kind: z.literal("modifyMagicResistWhileSourcePresent"),
  target: EffectTargetSelectorSchema,
  amount: z.number(),
  sourceBinding: z.enum(["effectSource", "lastSummonedEntity"]).optional(),
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
