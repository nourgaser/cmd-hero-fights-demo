import { z } from "zod";

import { CardIdSchema } from "./card";
import { BattlefieldOccupancySchema } from "./battlefield-occupancy";
import { EntityIdSchema, HandCardIdSchema } from "./action";
import { HeroIdSchema } from "./hero";

export const BattleIdSchema = z.string().min(1);
export type BattleId = z.infer<typeof BattleIdSchema>;

export const HandCardSchema = z.object({
  id: HandCardIdSchema,
  cardDefinitionId: CardIdSchema,
});
export type HandCard = z.infer<typeof HandCardSchema>;

export const HeroEntityStateSchema = z.object({
  entityId: EntityIdSchema,
  heroDefinitionId: HeroIdSchema,
  currentHealth: z.number().nonnegative(),
  armor: z.number().int().nonnegative(),
  magicResist: z.number().int().nonnegative(),
  attackDamage: z.number().nonnegative(),
  abilityPower: z.number().nonnegative(),
  criticalChance: z.number().min(0).max(1),
  criticalMultiplier: z.number().min(1),
  dodgeChance: z.number().min(0).max(1),
  movePoints: z.number().int().nonnegative(),
  deckCardIds: z.array(CardIdSchema),
  handCards: z.array(HandCardSchema),
  discardCardIds: z.array(CardIdSchema),
});
export type HeroEntityState = z.infer<typeof HeroEntityStateSchema>;

export const SummonedEntityKindSchema = z.enum(["weapon", "totem", "companion"]);
export type SummonedEntityKind = z.infer<typeof SummonedEntityKindSchema>;

export const SummonedEntityStateSchema = z.object({
  entityId: EntityIdSchema,
  ownerHeroEntityId: EntityIdSchema,
  kind: SummonedEntityKindSchema,
  definitionCardId: CardIdSchema,
  currentHealth: z.number().nonnegative(),
  armor: z.number().int().nonnegative(),
  magicResist: z.number().int().nonnegative(),
  attackDamage: z.number().nonnegative(),
  abilityPower: z.number().nonnegative(),
  criticalChance: z.number().min(0).max(1),
  criticalMultiplier: z.number().min(1),
  dodgeChance: z.number().min(0).max(1),
  remainingMoves: z.number().int().nonnegative(),
});
export type SummonedEntityState = z.infer<typeof SummonedEntityStateSchema>;

export const BattlefieldEntityStateSchema = z.discriminatedUnion("kind", [
  HeroEntityStateSchema.extend({ kind: z.literal("hero") }),
  SummonedEntityStateSchema,
]);
export type BattlefieldEntityState = z.infer<typeof BattlefieldEntityStateSchema>;

// Positive balance favors the anchor hero, negative favors the opposite hero, zero is neutral.
export const BattleLuckStateSchema = z.object({
  anchorHeroEntityId: EntityIdSchema,
  balance: z.number().int(),
});
export type BattleLuckState = z.infer<typeof BattleLuckStateSchema>;

export const TurnStateSchema = z.object({
  turnNumber: z.number().int().positive(),
  activeHeroEntityId: EntityIdSchema,
});
export type TurnState = z.infer<typeof TurnStateSchema>;

export const BattleStateSchema = z.object({
  battleId: BattleIdSchema,
  seed: z.string().min(1),
  heroEntityIds: z.tuple([EntityIdSchema, EntityIdSchema]),
  luck: BattleLuckStateSchema,
  turn: TurnStateSchema,
  entitiesById: z.record(EntityIdSchema, BattlefieldEntityStateSchema),
  battlefieldOccupancy: BattlefieldOccupancySchema,
});
export type BattleState = z.infer<typeof BattleStateSchema>;
