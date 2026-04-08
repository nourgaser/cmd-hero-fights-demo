import { z } from "zod";

export const ListenerEventKindSchema = z.enum([
  "actionResolved",
  "cardPlayed",
  "cardDrawn",
  "entitySummoned",
  "entityRemoved",
  "damageApplied",
  "healApplied",
  "armorGained",
  "armorLost",
  "magicResistGained",
  "magicResistLost",
  "attackDamageGained",
  "attackDamageLost",
  "turnEnded",
  "turnStarted",
  "luckBalanceChanged",
]);
export type ListenerEventKind = z.infer<typeof ListenerEventKindSchema>;

export const ListenerConditionSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("damageIsAttack") }),
  z.object({ kind: z.literal("damageNotDodged") }),
  z.object({ kind: z.literal("damageSourceIsListenerOwnerHero") }),
  z.object({ kind: z.literal("removedEntityIsListenerSource") }),
  z.object({ kind: z.literal("turnStartedIsListenerOwnerHero") }),
]);
export type ListenerCondition = z.infer<typeof ListenerConditionSchema>;

export const ListenerSourceBindingSchema = z.enum(["actorHero", "lastSummonedEntity"]);
export type ListenerSourceBinding = z.infer<typeof ListenerSourceBindingSchema>;

export const ListenerLifetimeSchema = z.enum(["persistent", "once"]);
export type ListenerLifetime = z.infer<typeof ListenerLifetimeSchema>;

export function createListenerSchemas(effectDefinitionSchema: z.ZodTypeAny) {
  const ListenerDefinitionSchema = z.object({
    listenerId: z.string().min(1),
    eventKind: ListenerEventKindSchema,
    ownerHeroEntityId: z.string().min(1),
    sourceEntityId: z.string().min(1).optional(),
    conditions: z.array(ListenerConditionSchema).default([]),
    lifetime: ListenerLifetimeSchema.default("persistent"),
    effects: z.array(effectDefinitionSchema).min(1),
  });

  const AddListenerEffectPayloadSchema = z.object({
    kind: z.literal("addListener"),
    listenerId: z.string().min(1),
    eventKind: ListenerEventKindSchema,
    sourceBinding: ListenerSourceBindingSchema.optional(),
    conditions: z.array(ListenerConditionSchema).default([]),
    lifetime: ListenerLifetimeSchema.default("persistent"),
    effects: z.array(effectDefinitionSchema).min(1),
  });

  const RemoveListenerEffectPayloadSchema = z.object({
    kind: z.literal("removeListener"),
    listenerId: z.string().min(1),
  });

  return {
    ListenerDefinitionSchema,
    AddListenerEffectPayloadSchema,
    RemoveListenerEffectPayloadSchema,
  };
}
