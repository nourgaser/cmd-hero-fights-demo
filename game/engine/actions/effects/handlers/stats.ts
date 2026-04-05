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

type StatPayload =
  | { kind: "gainArmor" | "loseArmor"; target: EffectTargetSelector; amount: number }
  | { kind: "gainMagicResist" | "loseMagicResist"; target: EffectTargetSelector; amount: number }
  | { kind: "gainAttackDamage" | "loseAttackDamage"; target: EffectTargetSelector; amount: number };

function applyStatModifierEffect(options: {
  context: EffectExecutionContext;
  propertyPath: "armor" | "magicResist" | "attackDamage";
  label: string;
}): ExecuteCardEffectResult {
  const { context, propertyPath, label } = options;
  const {
    state,
    effect,
    action,
    actorHero,
    sequence,
    lastDamageWasDodged,
    lastSummonedEntityId,
    effectSourceEntityId,
  } = context;

  const payload = effect.payload as StatPayload;
  const targetId = targetEntityIdFromSelector({
    selector: payload.target,
    action,
    actorHero,
    state,
  });
  if (!targetId) {
    return { ok: false, reason: `${label} requires a valid effect target.` };
  }

  if (!state.entitiesById[targetId]) {
    return { ok: false, reason: `${label} target was not found.` };
  }

  const sourceEntityId = effectSourceEntityId ?? actorHero.entityId;
  const amount = payload.amount;
  const isGain =
    payload.kind === "gainArmor" ||
    payload.kind === "gainMagicResist" ||
    payload.kind === "gainAttackDamage";

  if (isGain) {
    const modifier = {
      id: buildModifierId({ effectId: effect.id, sequence, targetEntityId: targetId }),
      propertyPath,
      targetEntityId: targetId,
      operation: "add" as const,
      value: amount,
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

  const removedIndex = state.activeModifiers.findIndex(
    (modifier) =>
      modifier.sourceEntityId === sourceEntityId &&
      modifier.targetEntityId === targetId &&
      modifier.propertyPath === propertyPath &&
      modifier.value === amount &&
      modifier.operation === "add",
  );

  if (removedIndex >= 0) {
    const nextModifiers = [...state.activeModifiers];
    const removedModifierId = nextModifiers[removedIndex]!.id;
    nextModifiers.splice(removedIndex, 1);

    return {
      ok: true,
      state: {
        ...state,
        activeModifiers: nextModifiers,
      },
      events: [
        {
          kind: "numberModifierExpired",
          sequence,
          modifierId: removedModifierId,
          targetEntityId: targetId,
          reason: "source_removed",
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
    operation: "subtract" as const,
    value: amount,
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

export function handleGainArmorEffect(context: EffectExecutionContext): ExecuteCardEffectResult {
  if (context.effect.payload.kind !== "gainArmor" && context.effect.payload.kind !== "loseArmor") {
    return { ok: false, reason: "handleGainArmorEffect received unsupported payload." };
  }

  return applyStatModifierEffect({
    context,
    propertyPath: "armor",
    label: "Armor modifier",
  });
}

export function handleGainMagicResistEffect(context: EffectExecutionContext): ExecuteCardEffectResult {
  if (
    context.effect.payload.kind !== "gainMagicResist" &&
    context.effect.payload.kind !== "loseMagicResist"
  ) {
    return { ok: false, reason: "handleGainMagicResistEffect received unsupported payload." };
  }

  return applyStatModifierEffect({
    context,
    propertyPath: "magicResist",
    label: "Magic resist modifier",
  });
}

export function handleGainAttackDamageEffect(context: EffectExecutionContext): ExecuteCardEffectResult {
  if (
    context.effect.payload.kind !== "gainAttackDamage" &&
    context.effect.payload.kind !== "loseAttackDamage"
  ) {
    return { ok: false, reason: "handleGainAttackDamageEffect received unsupported payload." };
  }

  return applyStatModifierEffect({
    context,
    propertyPath: "attackDamage",
    label: "Attack damage modifier",
  });
}

export function handleModifyAttackDamageWhileSourcePresentEffect(
  context: EffectExecutionContext,
): ExecuteCardEffectResult {
  if (
    context.effect.payload.kind !== "modifyAttackDamageWhileSourcePresent" &&
    context.effect.payload.kind !== "modifyArmorWhileSourcePresent" &&
    context.effect.payload.kind !== "modifyMagicResistWhileSourcePresent"
  ) {
    return {
      ok: false,
      reason: "handleModifyAttackDamageWhileSourcePresentEffect received unsupported payload.",
    };
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

  const payload = context.effect.payload as {
    kind:
      | "modifyAttackDamageWhileSourcePresent"
      | "modifyArmorWhileSourcePresent"
      | "modifyMagicResistWhileSourcePresent";
    target: EffectTargetSelector;
    amount: number;
    sourceBinding?: "effectSource" | "lastSummonedEntity";
  };

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
      reason: "modifyAttackDamageWhileSourcePresent requires a valid target.",
    };
  }

  if (!state.entitiesById[targetId]) {
    return { ok: false, reason: "modifyAttackDamageWhileSourcePresent target was not found." };
  }

  const propertyPath =
    payload.kind === "modifyArmorWhileSourcePresent"
      ? "armor"
      : payload.kind === "modifyMagicResistWhileSourcePresent"
        ? "magicResist"
        : "attackDamage";

  const label =
    payload.kind === "modifyArmorWhileSourcePresent"
      ? "Armor passive rule"
      : payload.kind === "modifyMagicResistWhileSourcePresent"
        ? "Magic resist passive rule"
        : "Attack damage passive rule";

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
