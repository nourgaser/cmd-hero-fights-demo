import { z } from "zod";

import { EntityFootprintSchema } from "./footprint";

export const HeroIdSchema = z.string().min(1);
export type HeroId = z.infer<typeof HeroIdSchema>;

export const DamageTypeSchema = z.enum(["physical", "magic", "true"]);
export type DamageType = z.infer<typeof DamageTypeSchema>;

export const HeroCombatStatsSchema = z.object({
  maxHealth: z.number().int().positive(),
  armor: z.number().int().nonnegative(),
  magicResist: z.number().int().nonnegative(),
  attackDamage: z.number().nonnegative(),
  abilityPower: z.number().nonnegative(),
  criticalChance: z.number().min(0).max(1),
  criticalMultiplier: z.number().min(1),
  dodgeChance: z.number().min(0).max(1),
});
export type HeroCombatStats = z.infer<typeof HeroCombatStatsSchema>;

export const HeroBasicAttackSchema = z
  .object({
    moveCost: z.number().int().nonnegative(),
    minimumDamage: z.number().nonnegative(),
    maximumDamage: z.number().nonnegative(),
    attackDamageScaling: z.number().nonnegative(),
    abilityPowerScaling: z.number().nonnegative(),
    damageType: DamageTypeSchema,
    effectText: z.string().optional(),
  })
  .refine(
    (basicAttack) => basicAttack.maximumDamage >= basicAttack.minimumDamage,
    {
      message: "maximumDamage must be greater than or equal to minimumDamage.",
      path: ["maximumDamage"],
    },
  );
export type HeroBasicAttack = z.infer<typeof HeroBasicAttackSchema>;

export const HeroDefinitionSchema = z.object({
  id: HeroIdSchema,
  name: z.string().min(1),
  footprint: EntityFootprintSchema,
  combat: HeroCombatStatsSchema,
  basicAttack: HeroBasicAttackSchema,
  passiveText: z.string().min(1),
});
export type HeroDefinition = z.infer<typeof HeroDefinitionSchema>;
