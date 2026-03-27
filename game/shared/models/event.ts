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

export const EntitySummonedEventSchema = z.object({
  kind: z.literal("entitySummoned"),
  sequence: EventSequenceSchema,
  ownerHeroEntityId: EntityIdSchema,
  summonedEntityId: EntityIdSchema,
  position: PositionSchema,
});
export type EntitySummonedEvent = z.infer<typeof EntitySummonedEventSchema>;

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
  EntitySummonedEventSchema,
  DamageAppliedEventSchema,
  HealAppliedEventSchema,
  ArmorGainedEventSchema,
  TurnEndedEventSchema,
  LuckBalanceChangedEventSchema,
]);
export type BattleEvent = z.infer<typeof BattleEventSchema>;
