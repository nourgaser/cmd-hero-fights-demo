import { z } from "zod";

import {
  type EffectDisplayText,
  EffectDisplayTextSchema,
  type EffectTextParamValue,
  EffectTextParamValueSchema,
  renderEffectDisplayText,
} from "./display-text";
import {
  type EffectTargetSelector,
  type SummonPlacementSelector,
  EffectTargetSelectorSchema,
  SummonPlacementSelectorSchema,
} from "./selectors";
import {
  type ListenerCondition,
  type ListenerEventKind,
  type ListenerLifetime,
  type ListenerSourceBinding,
  ListenerConditionSchema,
  ListenerEventKindSchema,
  ListenerLifetimeSchema,
  ListenerSourceBindingSchema,
} from "./listeners";
import {
  DestroyArmorAndDealPerArmorToEnemyHeroEffectPayloadSchema,
  DestroySelfArmorAndDealPerArmorToTargetEffectPayloadSchema,
  DealDamageEffectPayloadSchema,
  DrawCardsEffectPayloadSchema,
  HealEffectPayloadSchema,
  ModifyStatEffectPayloadSchema,
  ResetLuckBalanceEffectPayloadSchema,
  RefundMoveCostEffectPayloadSchema,
  ApplyAuraEffectPayloadSchema,
  SummonEntityEffectPayloadSchema,
} from "./base-payloads";

export const EffectIdSchema = z.string().min(1);
export type EffectId = z.infer<typeof EffectIdSchema>;

type NonRecursivePayload =
  | z.infer<typeof DestroyArmorAndDealPerArmorToEnemyHeroEffectPayloadSchema>
  | z.infer<typeof DestroySelfArmorAndDealPerArmorToTargetEffectPayloadSchema>
  | z.infer<typeof ResetLuckBalanceEffectPayloadSchema>
  | z.infer<typeof DealDamageEffectPayloadSchema>
  | z.infer<typeof HealEffectPayloadSchema>
  | z.infer<typeof ModifyStatEffectPayloadSchema>
  | z.infer<typeof DrawCardsEffectPayloadSchema>
  | z.infer<typeof SummonEntityEffectPayloadSchema>
  | z.infer<typeof RefundMoveCostEffectPayloadSchema>;

export type ApplyAuraEffectPayload = {
  kind: "applyAura";
  target: EffectTargetSelector;
  auraKind: "reactiveBulwarkResistance";
  durationTurns: number;
  baseResistanceBonus: number;
  amplifiedResistanceBonus: number;
};

export type AddListenerEffectPayload = {
  kind: "addListener";
  listenerId: string;
  eventKind: ListenerEventKind;
  sourceBinding?: ListenerSourceBinding;
  conditions: ListenerCondition[];
  lifetime: ListenerLifetime;
  effects: EffectDefinition[];
};

export type RemoveListenerEffectPayload = {
  kind: "removeListener";
  listenerId: string;
};

export type EffectPayload =
  | NonRecursivePayload
  | ApplyAuraEffectPayload
  | AddListenerEffectPayload
  | RemoveListenerEffectPayload;

export type EffectDefinition = {
  id: EffectId;
  payload: EffectPayload;
  displayText: EffectDisplayText;
};

export type ListenerDefinition = {
  listenerId: string;
  eventKind: ListenerEventKind;
  ownerHeroEntityId: string;
  sourceEntityId?: string;
  createdTurnNumber?: number;
  conditions: ListenerCondition[];
  lifetime: ListenerLifetime;
  effects: EffectDefinition[];
};

export const EffectPayloadKindSchema = z.enum([
  "destroyArmorAndDealPerArmorToEnemyHero",
  "destroySelfArmorAndDealPerArmorToTarget",
  "resetLuckBalance",
  "dealDamage",
  "heal",
  "modifyStat",
  "drawCards",
  "summonEntity",
  "refundMoveCost",
  "applyAura",
  "addListener",
  "removeListener",
]);
export type EffectPayloadKind = z.infer<typeof EffectPayloadKindSchema>;

const AddListenerEffectPayloadSchemaRaw = z.object({
  kind: z.literal("addListener"),
  listenerId: z.string().min(1),
  eventKind: ListenerEventKindSchema,
  sourceBinding: ListenerSourceBindingSchema.optional(),
  conditions: z.array(ListenerConditionSchema).default([]),
  lifetime: ListenerLifetimeSchema.default("persistent"),
  effects: z.array(z.unknown()).min(1),
});

const RemoveListenerEffectPayloadSchemaRaw = z.object({
  kind: z.literal("removeListener"),
  listenerId: z.string().min(1),
});

export const AddListenerEffectPayloadSchema =
  AddListenerEffectPayloadSchemaRaw as unknown as z.ZodType<AddListenerEffectPayload>;
export const RemoveListenerEffectPayloadSchema =
  RemoveListenerEffectPayloadSchemaRaw as unknown as z.ZodType<RemoveListenerEffectPayload>;

export const EffectPayloadSchema = z.discriminatedUnion("kind", [
  DestroyArmorAndDealPerArmorToEnemyHeroEffectPayloadSchema,
  DestroySelfArmorAndDealPerArmorToTargetEffectPayloadSchema,
  ResetLuckBalanceEffectPayloadSchema,
  DealDamageEffectPayloadSchema,
  HealEffectPayloadSchema,
  ModifyStatEffectPayloadSchema,
  DrawCardsEffectPayloadSchema,
  SummonEntityEffectPayloadSchema,
  RefundMoveCostEffectPayloadSchema,
  ApplyAuraEffectPayloadSchema,
  AddListenerEffectPayloadSchemaRaw,
  RemoveListenerEffectPayloadSchemaRaw,
]);

export const EffectDefinitionSchema = z.object({
  id: EffectIdSchema,
  payload: EffectPayloadSchema,
  displayText: EffectDisplayTextSchema,
});

export const ListenerDefinitionSchema = z.object({
  listenerId: z.string().min(1),
  eventKind: ListenerEventKindSchema,
  ownerHeroEntityId: z.string().min(1),
  sourceEntityId: z.string().min(1).optional(),
  createdTurnNumber: z.number().int().positive().optional(),
  conditions: z.array(ListenerConditionSchema).default([]),
  lifetime: ListenerLifetimeSchema.default("persistent"),
  effects: z.array(z.unknown()).min(1),
}) as unknown as z.ZodType<ListenerDefinition>;

export {
  type EffectDisplayText,
  type EffectTargetSelector,
  type EffectTextParamValue,
  type ListenerCondition,
  type ListenerEventKind,
  type ListenerLifetime,
  type ListenerSourceBinding,
  type SummonPlacementSelector,
  EffectDisplayTextSchema,
  EffectTargetSelectorSchema,
  EffectTextParamValueSchema,
  ListenerConditionSchema,
  ListenerEventKindSchema,
  ListenerLifetimeSchema,
  ListenerSourceBindingSchema,
  SummonPlacementSelectorSchema,
  renderEffectDisplayText,
};
