import { z } from "zod";

import { BattleActionSchema, EntityIdSchema, HandCardIdSchema } from "./action";
import { CardIdSchema } from "./card";
import { DamageTypeSchema } from "./hero";
import { PositionSchema } from "./position";

export const EventSequenceSchema = z.number().int().nonnegative();
export type EventSequence = z.infer<typeof EventSequenceSchema>;

export const ActionResolvedEventSchema = z.object({
  kind: z.literal("actionResolved"),
  sequence: EventSequenceSchema,
  action: BattleActionSchema,
});
export type ActionResolvedEvent = z.infer<typeof ActionResolvedEventSchema>;

export const CardPlayedEventSchema = z.object({
  kind: z.literal("cardPlayed"),
  sequence: EventSequenceSchema,
  actorHeroEntityId: EntityIdSchema,
  handCardId: HandCardIdSchema,
  cardDefinitionId: CardIdSchema,
});
export type CardPlayedEvent = z.infer<typeof CardPlayedEventSchema>;

export const CardDrawnEventSchema = z.object({
  kind: z.literal("cardDrawn"),
  sequence: EventSequenceSchema,
  heroEntityId: EntityIdSchema,
  handCardId: HandCardIdSchema,
  cardDefinitionId: CardIdSchema,
});
export type CardDrawnEvent = z.infer<typeof CardDrawnEventSchema>;

export const EntitySummonedEventSchema = z.object({
  kind: z.literal("entitySummoned"),
  sequence: EventSequenceSchema,
  ownerHeroEntityId: EntityIdSchema,
  summonedEntityId: EntityIdSchema,
  position: PositionSchema,
});
export type EntitySummonedEvent = z.infer<typeof EntitySummonedEventSchema>;

export const EntityRemovedEventSchema = z.object({
  kind: z.literal("entityRemoved"),
  sequence: EventSequenceSchema,
  entityId: EntityIdSchema,
  ownerHeroEntityId: EntityIdSchema,
  reason: z.enum(["defeated"]),
});
export type EntityRemovedEvent = z.infer<typeof EntityRemovedEventSchema>;

export const DamageAppliedEventSchema = z.object({
  kind: z.literal("damageApplied"),
  sequence: EventSequenceSchema,
  sourceEntityId: EntityIdSchema.optional(),
  targetEntityId: EntityIdSchema,
  amount: z.number().nonnegative(),
  damageType: DamageTypeSchema,
  wasDodged: z.boolean(),
});
export type DamageAppliedEvent = z.infer<typeof DamageAppliedEventSchema>;

export const HealAppliedEventSchema = z.object({
  kind: z.literal("healApplied"),
  sequence: EventSequenceSchema,
  sourceEntityId: EntityIdSchema.optional(),
  targetEntityId: EntityIdSchema,
  amount: z.number().nonnegative(),
});
export type HealAppliedEvent = z.infer<typeof HealAppliedEventSchema>;

export const ArmorGainedEventSchema = z.object({
  kind: z.literal("armorGained"),
  sequence: EventSequenceSchema,
  targetEntityId: EntityIdSchema,
  amount: z.number().int().positive(),
});
export type ArmorGainedEvent = z.infer<typeof ArmorGainedEventSchema>;

export const ArmorLostEventSchema = z.object({
  kind: z.literal("armorLost"),
  sequence: EventSequenceSchema,
  targetEntityId: EntityIdSchema,
  amount: z.number().int().positive(),
});
export type ArmorLostEvent = z.infer<typeof ArmorLostEventSchema>;

export const MagicResistGainedEventSchema = z.object({
  kind: z.literal("magicResistGained"),
  sequence: EventSequenceSchema,
  targetEntityId: EntityIdSchema,
  amount: z.number().int().positive(),
});
export type MagicResistGainedEvent = z.infer<typeof MagicResistGainedEventSchema>;

export const MagicResistLostEventSchema = z.object({
  kind: z.literal("magicResistLost"),
  sequence: EventSequenceSchema,
  targetEntityId: EntityIdSchema,
  amount: z.number().int().positive(),
});
export type MagicResistLostEvent = z.infer<typeof MagicResistLostEventSchema>;

export const AttackDamageGainedEventSchema = z.object({
  kind: z.literal("attackDamageGained"),
  sequence: EventSequenceSchema,
  targetEntityId: EntityIdSchema,
  amount: z.number().int().positive(),
});
export type AttackDamageGainedEvent = z.infer<typeof AttackDamageGainedEventSchema>;

export const AttackDamageLostEventSchema = z.object({
  kind: z.literal("attackDamageLost"),
  sequence: EventSequenceSchema,
  targetEntityId: EntityIdSchema,
  amount: z.number().int().positive(),
});
export type AttackDamageLostEvent = z.infer<typeof AttackDamageLostEventSchema>;

export const TurnEndedEventSchema = z.object({
  kind: z.literal("turnEnded"),
  sequence: EventSequenceSchema,
  endingHeroEntityId: EntityIdSchema,
  nextActiveHeroEntityId: EntityIdSchema,
});
export type TurnEndedEvent = z.infer<typeof TurnEndedEventSchema>;

export const LuckBalanceChangedEventSchema = z.object({
  kind: z.literal("luckBalanceChanged"),
  sequence: EventSequenceSchema,
  anchorHeroEntityId: EntityIdSchema,
  previousBalance: z.number().int(),
  nextBalance: z.number().int(),
});
export type LuckBalanceChangedEvent = z.infer<typeof LuckBalanceChangedEventSchema>;

export const BattleEventSchema = z.discriminatedUnion("kind", [
  ActionResolvedEventSchema,
  CardPlayedEventSchema,
  CardDrawnEventSchema,
  EntitySummonedEventSchema,
  EntityRemovedEventSchema,
  DamageAppliedEventSchema,
  HealAppliedEventSchema,
  ArmorGainedEventSchema,
  ArmorLostEventSchema,
  MagicResistGainedEventSchema,
  MagicResistLostEventSchema,
  AttackDamageGainedEventSchema,
  AttackDamageLostEventSchema,
  TurnEndedEventSchema,
  LuckBalanceChangedEventSchema,
]);
export type BattleEvent = z.infer<typeof BattleEventSchema>;
