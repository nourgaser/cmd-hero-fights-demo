import { z } from "zod";

import { DamageTypeSchema } from "./hero";

export const EffectIdSchema = z.string().min(1);
export type EffectId = z.infer<typeof EffectIdSchema>;

export const EffectTextParamValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
]);
export type EffectTextParamValue = z.infer<typeof EffectTextParamValueSchema>;

export const EffectStaticTextSchema = z.object({
  mode: z.literal("static"),
  text: z.string().min(1),
});
export type EffectStaticText = z.infer<typeof EffectStaticTextSchema>;

export const EffectDynamicTextSchema = z.object({
  mode: z.literal("template"),
  template: z.string().min(1),
  params: z.record(z.string().min(1), EffectTextParamValueSchema),
});
export type EffectDynamicText = z.infer<typeof EffectDynamicTextSchema>;

export const EffectDisplayTextSchema = z.discriminatedUnion("mode", [
  EffectStaticTextSchema,
  EffectDynamicTextSchema,
]);
export type EffectDisplayText = z.infer<typeof EffectDisplayTextSchema>;

export function renderEffectDisplayText(displayText: EffectDisplayText): string {
  if (displayText.mode === "static") {
    return displayText.text;
  }

  return displayText.template.replaceAll(/\{([a-zA-Z0-9_]+)\}/g, (match, key) => {
    const value = displayText.params[key];
    return value === undefined ? match : String(value);
  });
}

export const EffectTargetSelectorSchema = z.enum([
  "none",
  "selfHero",
  "sourceOwnerHero",
  "selectedEnemy",
  "selectedAny",
]);
export type EffectTargetSelector = z.infer<typeof EffectTargetSelectorSchema>;

export const SummonPlacementSelectorSchema = z.enum([
  "selectedEmptyPosition",
]);
export type SummonPlacementSelector = z.infer<typeof SummonPlacementSelectorSchema>;

export const EffectPayloadKindSchema = z.enum([
  "dealDamage",
  "heal",
  "gainArmor",
  "gainMagicResist",
  "modifyAttackDamageWhileSourcePresent",
  "summonEntity",
  "refundMoveCost",
]);
export type EffectPayloadKind = z.infer<typeof EffectPayloadKindSchema>;

export const DealDamageEffectPayloadSchema = z
  .object({
    kind: z.literal("dealDamage"),
    target: EffectTargetSelectorSchema,
    minimum: z.number().nonnegative(),
    maximum: z.number().nonnegative(),
    damageType: DamageTypeSchema,
    attackDamageScaling: z.number().nonnegative().default(0),
    abilityPowerScaling: z.number().nonnegative().default(0),
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

export const GainMagicResistEffectPayloadSchema = z.object({
  kind: z.literal("gainMagicResist"),
  target: EffectTargetSelectorSchema,
  amount: z.number().int().positive(),
});

export const ModifyAttackDamageWhileSourcePresentEffectPayloadSchema = z.object({
  kind: z.literal("modifyAttackDamageWhileSourcePresent"),
  target: EffectTargetSelectorSchema,
  amount: z.number(),
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

export const EffectPayloadSchema = z.discriminatedUnion("kind", [
  DealDamageEffectPayloadSchema,
  HealEffectPayloadSchema,
  GainArmorEffectPayloadSchema,
  GainMagicResistEffectPayloadSchema,
  ModifyAttackDamageWhileSourcePresentEffectPayloadSchema,
  SummonEntityEffectPayloadSchema,
  RefundMoveCostEffectPayloadSchema,
]);
export type EffectPayload = z.infer<typeof EffectPayloadSchema>;

export const EffectDefinitionSchema = z.object({
  id: EffectIdSchema,
  payload: EffectPayloadSchema,
  displayText: EffectDisplayTextSchema,
});
export type EffectDefinition = z.infer<typeof EffectDefinitionSchema>;
