import { type EffectExecutionContext, type ExecuteCardEffectResult } from "../context";
import { targetEntityIdFromSelector } from "../targeting";
import { resolveEffectiveNumber } from "../../../core/number-resolver";
import { 
  buildModifierId, 
  buildPassiveRuleId, 
  sourceLabelFromEffectId 
} from "./stats/utils";
import { resolvePassiveRuleTargetEntityIds } from "./stats/passive-rules";
import { applyImmediateMoveCapacityDelta } from "./stats/move-capacity";
import type { ModifyStatPayload } from "./stats/types";

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
  const changeKind = payload.changeKind ?? "apply";

  const sourceLabel = sourceLabelFromEffectId(effect.id);
  const propertyPath = payload.stat;
  const label = sourceLabel;

  const selectedTargetSourceEntityId =
    payload.sourceBinding === "selectedTarget"
      ? targetEntityIdFromSelector({
          selector: "selectedAny",
          action: context.action,
          actorHero,
          state,
          effectSourceEntityId: context.effectSourceEntityId,
        })
      : undefined;

  const resolvedSourceEntityId =
    payload.sourceBinding === "lastSummonedEntity"
      ? lastSummonedEntityId
      : payload.sourceBinding === "selectedTarget"
        ? selectedTargetSourceEntityId
        : payload.sourceBinding === "actorHero"
          ? actorHero.entityId
        : effectSourceEntityId ?? actorHero.entityId;

  if (!resolvedSourceEntityId) {
    return {
      ok: false,
      reason:
        payload.sourceBinding === "lastSummonedEntity"
          ? `${payload.kind} requires an existing lastSummonedEntity source.`
          : payload.sourceBinding === "selectedTarget"
            ? `${payload.kind} requires a valid selected target source.`
            : payload.sourceBinding === "actorHero"
              ? `${payload.kind} requires a valid actor hero source.`
            : `${payload.kind} requires an effect source entity.`,
    };
  }

  const sourceEntityId: string = resolvedSourceEntityId;

  if (duration === "untilSourceRemoved") {
    const operation: {
      propertyPath: string;
      operation: "add";
      value?: number;
      valueFromSourceStat?: string;
      valueFromSourceSelector?: "sourceEntity" | "sourceOwnerHero" | "selfHero";
    } = {
      propertyPath,
      operation: "add" as const,
    };

    if (payload.amountFromSourceStat) {
      operation.valueFromSourceStat = payload.amountFromSourceStat;
      operation.valueFromSourceSelector = payload.amountFromSourceSelector;
    } else if (payload.amount !== undefined) {
      operation.value = payload.amount;
    }

    const passiveRule = {
      id: buildPassiveRuleId({ effectId: effect.id, sequence, sourceEntityId }),
      source: {
        kind: "sourceEntity" as const,
        sourceEntityId,
      },
      targetSelector: payload.target,
      operations: [operation],
      lifetime: "untilSourceRemoved" as const,
      condition: { kind: "sourcePresent" as const },
      label,
    };

    const stateWithPassiveRule = {
      ...state,
      activePassiveRules: [...state.activePassiveRules, passiveRule],
    };

    let nextState = stateWithPassiveRule;

    if (payload.stat === "moveCapacity" && payload.amountFromSourceStat) {
      const sourceEntity = state.entitiesById[sourceEntityId];
      if (sourceEntity) {
        const sourceStatValue = resolveEffectiveNumber({
          state,
          targetEntityId: sourceEntityId,
          propertyPath: payload.amountFromSourceStat,
          baseValue: typeof (sourceEntity as Record<string, unknown>)[payload.amountFromSourceStat] === 'number'
            ? (sourceEntity as Record<string, unknown>)[payload.amountFromSourceStat] as number
            : 0,
          clampMin: 0,
        }).effectiveValue;

        nextState = applyImmediateMoveCapacityDelta({
          state: stateWithPassiveRule,
          targetEntityIds: resolvePassiveRuleTargetEntityIds({
            state: stateWithPassiveRule,
            sourceEntityId,
            targetSelector: payload.target,
          }),
          amount: sourceStatValue,
        });
      }
    } else if (payload.stat === "moveCapacity" && payload.amount) {
      nextState = applyImmediateMoveCapacityDelta({
        state: stateWithPassiveRule,
        targetEntityIds: resolvePassiveRuleTargetEntityIds({
          state: stateWithPassiveRule,
          sourceEntityId,
          targetSelector: payload.target,
        }),
        amount: payload.amount,
      });
    }

    return {
      ok: true,
      state: nextState,
      events: [
        {
          kind: "numberModifierApplied",
          sequence,
          modifierId: passiveRule.id,
          targetEntityId: actorHero.entityId,
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

  const targetId = targetEntityIdFromSelector({
    selector: payload.target,
    action: context.action,
    actorHero,
    state,
    effectSourceEntityId: context.effectSourceEntityId,
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

  if (duration === "persistent" && payload.amountFromSourceStat !== undefined) {
    return {
      ok: false,
      reason: "modifyStat with amountFromSourceStat only supports untilSourceRemoved duration.",
    };
  }

  if (payload.amount === undefined) {
    return {
      ok: false,
      reason: "modifyStat requires amount for persistent modifiers.",
    };
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

  if (changeKind === "removeMatching") {
    if (duration !== "persistent") {
      return {
        ok: false,
        reason: "modifyStat removeMatching supports only persistent duration.",
      };
    }

    const expectedOperation = payload.amount >= 0 ? "add" : "subtract";
    const expectedValue = Math.abs(payload.amount);
    const removeIndex = state.activeModifiers.findIndex(
      (modifier) =>
        modifier.sourceEntityId === sourceEntityId &&
        modifier.targetEntityId === targetId &&
        modifier.propertyPath === propertyPath &&
        modifier.operation === expectedOperation &&
        modifier.value === expectedValue,
    );

    if (removeIndex < 0) {
      return {
        ok: true,
        state,
        events: [],
        nextSequence: sequence,
        lastDamageWasDodged,
        lastSummonedEntityId,
      };
    }

    const nextModifiers = [...state.activeModifiers];
    const removedModifierId = nextModifiers[removeIndex]!.id;
    nextModifiers.splice(removeIndex, 1);

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
