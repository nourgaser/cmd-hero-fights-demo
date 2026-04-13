import { z } from "zod";

import { PositionSchema } from "./position";

export const EntityIdSchema = z.string().min(1);
export type EntityId = z.infer<typeof EntityIdSchema>;

// Target selectors: declarative descriptions for deterministic entity resolution at replay time
export const TargetSelectorSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("hero"), heroDefinitionId: z.string() }),
  z.object({
    type: z.literal("summoned"),
    ownerHeroDefinitionId: z.string(),
    kind: z.enum(["weapon", "totem", "companion"]),
    definitionCardId: z.string(),
    anchorPosition: PositionSchema,
  }),
  z.object({ type: z.literal("self") }),
  z.object({ type: z.literal("source") }),
]);
export type TargetSelector = z.infer<typeof TargetSelectorSchema>;

export const HandCardIdSchema = z.string().min(1);
export type HandCardId = z.infer<typeof HandCardIdSchema>;

export const ActionSelectionSchema = z.object({
  targetEntityId: EntityIdSchema.optional(),
  targetPosition: PositionSchema.optional(),
});
export type ActionSelection = z.infer<typeof ActionSelectionSchema>;

export const PlayCardActionSchema = z.object({
  kind: z.literal("playCard"),
  actorHeroEntityId: EntityIdSchema,
  handCardId: HandCardIdSchema,
  selection: ActionSelectionSchema,
});
export type PlayCardAction = z.infer<typeof PlayCardActionSchema>;

export const BasicAttackActionSchema = z.object({
  kind: z.literal("basicAttack"),
  actorHeroEntityId: EntityIdSchema,
  attackerEntityId: EntityIdSchema,
  selection: z.object({
    targetEntityId: EntityIdSchema,
  }),
});
export type BasicAttackAction = z.infer<typeof BasicAttackActionSchema>;

export const UseEntityActiveActionSchema = z.object({
  kind: z.literal("useEntityActive"),
  actorHeroEntityId: EntityIdSchema,
  sourceEntityId: EntityIdSchema,
  selection: ActionSelectionSchema,
});
export type UseEntityActiveAction = z.infer<typeof UseEntityActiveActionSchema>;

export const PressLuckActionSchema = z.object({
  kind: z.literal("pressLuck"),
  actorHeroEntityId: EntityIdSchema,
});
export type PressLuckAction = z.infer<typeof PressLuckActionSchema>;

export const EndTurnActionSchema = z.object({
  kind: z.literal("endTurn"),
  actorHeroEntityId: EntityIdSchema,
});
export type EndTurnAction = z.infer<typeof EndTurnActionSchema>;

export const BattleActionSchema = z.discriminatedUnion("kind", [
  PlayCardActionSchema,
  BasicAttackActionSchema,
  UseEntityActiveActionSchema,
  PressLuckActionSchema,
  EndTurnActionSchema,
]);
export type BattleAction = z.infer<typeof BattleActionSchema>;
