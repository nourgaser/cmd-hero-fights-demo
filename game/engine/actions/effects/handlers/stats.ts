import { type EffectExecutionContext, type ExecuteCardEffectResult } from "../context";
import { targetEntityIdFromSelector } from "../targeting";
import type { EffectTargetSelector } from "../../../../shared/models";

function buildModifierId(options: {
  effectId: string;
  sequence: number;
  targetEntityId: string;
}): string {
  return `mod.${options.effectId}.${options.targetEntityId}.${options.sequence}`;
}

type StatKey = "armor" | "magicResist" | "attackDamage" | "abilityPower";

type ModifyStatPayload = {
  kind: "modifyStat";
  target: EffectTargetSelector;
  stat: StatKey;
  amount: number;
  duration?: "persistent" | "untilSourceRemoved";
  sourceBinding?: "effectSource" | "lastSummonedEntity";
};

function statLabel(stat: StatKey): string {
  if (stat === "armor") {
    return "Armor";
  }
  if (stat === "magicResist") {
    return "Magic resist";
  }
  if (stat === "attackDamage") {
    return "Attack damage";
  }
  return "Ability power";
}

export function handleModifyStatEffect(context: EffectExecutionContext): ExecuteCardEffectResult {
  if (context.effect.payload.kind !== "modifyStat") {
    return { ok: false, reason: "handleModifyStatEffect received unsupported payload." };
  }

  const {
    state,
    effect,
    actorHero,
    sequence,
    lastDamageWasDodged,
    lastSummonedEntityId,
    effectSourceEntityId,
  } = context;

  const payload = context.effect.payload as ModifyStatPayload;
  const duration = payload.duration ?? "persistent";

  const resolvedSourceEntityId =
    payload.sourceBinding === "lastSummonedEntity"
      ? lastSummonedEntityId
      : effectSourceEntityId ?? actorHero.entityId;

  if (!resolvedSourceEntityId) {
    return {
      ok: false,
      reason:
        payload.sourceBinding === "lastSummonedEntity"
          ? `${payload.kind} requires an existing lastSummonedEntity source.`
          : `${payload.kind} requires an effect source entity.`,
    };
  }

  const sourceEntityId: string = resolvedSourceEntityId;

  const targetId = targetEntityIdFromSelector({
    selector: payload.target,
    action: context.action,
    actorHero,
    state,
  });
  if (!targetId) {
    return {
      ok: false,
      reason: "modifyStat requires a valid target.",
    };
  }

  if (!state.entitiesById[targetId]) {
    return { ok: false, reason: "modifyStat target was not found." };
  }

  if (payload.amount === 0) {
    return {
      ok: true,
      state,
      events: [],
      nextSequence: sequence,
      lastDamageWasDodged,
      lastSummonedEntityId,
    };
  }

  const propertyPath = payload.stat;
  const label = `${statLabel(payload.stat)} ${duration === "untilSourceRemoved" ? "passive rule" : "modifier"}`;

  if (duration === "untilSourceRemoved") {
    const passiveRule = {
      id: buildModifierId({ effectId: effect.id, sequence, targetEntityId: targetId }),
      source: {
        kind: "sourceEntity" as const,
        sourceEntityId,
      },
      targetSelector: payload.target,
      operations: [
        {
          propertyPath,
          operation: "add" as const,
          value: payload.amount,
        },
      ],
      lifetime: "untilSourceRemoved" as const,
      condition: { kind: "sourcePresent" as const },
      label,
    };

    return {
      ok: true,
      state: {
        ...state,
        activePassiveRules: [...state.activePassiveRules, passiveRule],
      },
      events: [
        {
          kind: "numberModifierApplied",
          sequence,
          modifierId: passiveRule.id,
          targetEntityId: targetId,
          propertyPath,
          label: passiveRule.label,
          sourceEntityId,
        },
      ],
      nextSequence: sequence + 1,
      lastDamageWasDodged,
      lastSummonedEntityId,
    };
  }

  const modifier = {
    id: buildModifierId({ effectId: effect.id, sequence, targetEntityId: targetId }),
    propertyPath,
    targetEntityId: targetId,
    operation: payload.amount >= 0 ? ("add" as const) : ("subtract" as const),
    value: Math.abs(payload.amount),
    lifetime: "persistent" as const,
    sourceEntityId,
    label,
  };

  return {
    ok: true,
    state: {
      ...state,
      activeModifiers: [...state.activeModifiers, modifier],
    },
    events: [
      {
        kind: "numberModifierApplied",
        sequence,
        modifierId: modifier.id,
        targetEntityId: targetId,
        propertyPath,
        label,
        sourceEntityId,
      },
    ],
    nextSequence: sequence + 1,
    lastDamageWasDodged,
    lastSummonedEntityId,
  };
}
