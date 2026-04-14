import { z } from "zod";

import { CardIdSchema } from "./card";
import { BattlefieldOccupancySchema, BattlefieldSideSchema } from "./battlefield-occupancy";
import { EntityIdSchema, HandCardIdSchema } from "./action";
import { AuraInstanceSchema } from "./aura";
import { EntityFootprintSchema } from "./footprint";
import { HeroIdSchema } from "./hero";
import { ListenerDefinitionSchema } from "./effects/index";
import { NumberModifierSchema } from "./number-modifier";
import { PassiveRuleSchema } from "./passive-rule";
import { PositionSchema } from "./position";

export const BattleIdSchema = z.string().min(1);
export type BattleId = z.infer<typeof BattleIdSchema>;

export const HandCardSchema = z.object({
  id: HandCardIdSchema,
  cardDefinitionId: CardIdSchema,
  validTargetEntityIds: z.array(EntityIdSchema).optional(),
  validPlacementPositions: z.array(PositionSchema).optional(),
  isPlayable: z.boolean().optional(),
});
export type HandCard = z.infer<typeof HandCardSchema>;

export const HeroEntityStateSchema = z.object({
  kind: z.literal("hero"),
  entityId: EntityIdSchema,
  heroDefinitionId: HeroIdSchema,
  battlefieldSide: BattlefieldSideSchema,
  anchorPosition: PositionSchema,
  footprint: EntityFootprintSchema,
  maxHealth: z.number().nonnegative(),
  currentHealth: z.number().nonnegative(),
  armor: z.number().int().nonnegative(),
  magicResist: z.number().int().nonnegative(),
  attackDamage: z.number().nonnegative(),
  abilityPower: z.number().nonnegative(),
  criticalChance: z.number().min(0).max(1),
  criticalMultiplier: z.number().min(1),
  dodgeChance: z.number().min(0).max(1),
  maxMovePoints: z.number().int().nonnegative(),
  movePoints: z.number().int().nonnegative(),
  basicAttackMoveCost: z.number().int().nonnegative(),
  deckCardIds: z.array(CardIdSchema),
  handCards: z.array(HandCardSchema),
  basicAttackTargetEntityIds: z.array(EntityIdSchema).optional(),
  entityActiveOptions: z
    .array(
      z.object({
        sourceEntityId: EntityIdSchema,
        validTargetEntityIds: z.array(EntityIdSchema),
      }),
    )
    .optional(),
  discardCardIds: z.array(CardIdSchema),
});
export type HeroEntityState = z.infer<typeof HeroEntityStateSchema>;

export const SummonedEntityKindSchema = z.enum(["weapon", "totem", "companion"]);
export type SummonedEntityKind = z.infer<typeof SummonedEntityKindSchema>;

export const SummonedEntityStateSchema = z.object({
  entityId: EntityIdSchema,
  ownerHeroEntityId: EntityIdSchema,
  kind: SummonedEntityKindSchema,
  battlefieldSide: BattlefieldSideSchema,
  anchorPosition: PositionSchema,
  footprint: EntityFootprintSchema,
  definitionCardId: CardIdSchema,
  keywordIds: z.array(z.string().min(1)).default([]),
  maxHealth: z.number().nonnegative(),
  currentHealth: z.number().nonnegative(),
  armor: z.number().int().nonnegative(),
  magicResist: z.number().int().nonnegative(),
  attackDamage: z.number().nonnegative(),
  abilityPower: z.number().nonnegative(),
  criticalChance: z.number().min(0).max(1),
  criticalMultiplier: z.number().min(1),
  dodgeChance: z.number().min(0).max(1),
  baseSharpness: z.number().int().nonnegative().default(0),
  maxMovesPerTurn: z.number().int().nonnegative(),
  remainingMoves: z.number().int().nonnegative(),
  moveRefreshIntervalTurns: z.number().int().positive().default(1),
  ownerTurnsUntilMoveRefresh: z.number().int().nonnegative().default(0),
});
export type SummonedEntityState = z.infer<typeof SummonedEntityStateSchema>;

export const BattlefieldEntityStateSchema = z.discriminatedUnion("kind", [
  HeroEntityStateSchema,
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
  pressLuckUsedThisTurn: z.boolean().default(false),
  damageTakenThisTurnByHeroEntityId: z.record(EntityIdSchema, z.boolean()).default({}),
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
  activeListeners: z.array(ListenerDefinitionSchema),
  /**
   * Active number modifiers that are currently applying adjustments to numeric values.
   * These are ordered by application sequence for deterministic resolution.
   */
  activeModifiers: z.array(NumberModifierSchema).default([]),
  /**
   * Active passive rules that are applying numeric adjustments to targets based on sources.
   * These are ordered by source entity position for deterministic resolution.
   */
  activePassiveRules: z.array(PassiveRuleSchema).default([]),
  activeAuras: z.array(AuraInstanceSchema).default([]),
  /**
   * Monotonically increasing summon counts per (ownerHeroEntityId:entityDefinitionId) key.
   * Used to generate stable, session-independent entity IDs for summoned entities.
   */
  summonCounters: z.record(z.string(), z.number().int().nonnegative()).default({}),
  /**
   * Monotonically increasing draw counts per heroEntityId for cards drawn via effects.
   * Used to generate stable, session-independent hand card IDs for effect-drawn cards.
   */
  drawCounters: z.record(EntityIdSchema, z.number().int().nonnegative()).default({}),
});
export type BattleState = z.infer<typeof BattleStateSchema>;
