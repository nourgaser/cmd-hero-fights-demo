import { type EffectExecutionContext, type ExecuteCardEffectResult } from "../context";
import { targetEntityIdFromSelector } from "../targeting";
import type { BattleState, EffectTargetSelector } from "../../../../shared/models";
import { MOVE_POINTS_CAP } from "../../../../shared/game-constants";
import { resolveEffectiveNumber } from "../../../core/number-resolver";

function buildModifierId(options: {
  effectId: string;
  sequence: number;
  targetEntityId: string;
}): string {
  return `mod.${options.effectId}.${options.targetEntityId}.${options.sequence}`;
}

function buildPassiveRuleId(options: {
  effectId: string;
  sequence: number;
  sourceEntityId: string;
}): string {
  return `rule.${options.effectId}.${options.sourceEntityId}.${options.sequence}`;
}

type StatKey =
  | "armor"
  | "magicResist"
  | "attackDamage"
  | "abilityPower"
  | "dodgeChance"
  | "attackFlatBonusDamage"
  | "basicAttackFlatBonusDamage"
  | "moveCapacity"
  | "attackHealOnAttack"
  | "sharpness"
  | "basicAttackSharpness"
  | "immune";

type ModifyStatPayload = {
  kind: "modifyStat";
  target: EffectTargetSelector;
  stat: StatKey;
  amount: number;
  duration?: "persistent" | "untilSourceRemoved";
  changeKind?: "apply" | "removeMatching";
  sourceBinding?: "effectSource" | "actorHero" | "lastSummonedEntity" | "selectedTarget";
};

function titleCaseFromSlug(slug: string): string {
  return slug
    .split("-")
    .filter((part) => part.length > 0)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function sourceLabelFromEffectId(effectId: string): string {
  const segments = effectId.split(".");
  if (segments[0] === "effect" && segments[1]) {
    return titleCaseFromSlug(segments[1]);
  }
  return effectId;
}

function resolvePassiveRuleTargetEntityIds(options: {
  state: BattleState;
  sourceEntityId: string;
  targetSelector: EffectTargetSelector;
}): string[] {
  const { state, sourceEntityId, targetSelector } = options;
  const sourceEntity = state.entitiesById[sourceEntityId];
  if (!sourceEntity) {
    return [];
  }

  const sourceOwnerHeroEntityId =
    sourceEntity.kind === "hero" ? sourceEntity.entityId : sourceEntity.ownerHeroEntityId;

  switch (targetSelector) {
    case "selfHero":
    case "sourceOwnerHero":
      return [sourceOwnerHeroEntityId];
    case "sourceOwnerAllies":
      return Object.values(state.entitiesById)
        .filter((entity) => {
          if (entity.kind === "hero") {
            return entity.entityId === sourceOwnerHeroEntityId;
          }

          return entity.ownerHeroEntityId === sourceOwnerHeroEntityId;
        })
        .map((entity) => entity.entityId);
    case "sourceOwnerHeroAndCompanions":
      return Object.values(state.entitiesById)
        .filter((entity) =>
          entity.kind === "hero"
            ? entity.entityId === sourceOwnerHeroEntityId
            : entity.kind === "companion" && entity.ownerHeroEntityId === sourceOwnerHeroEntityId,
        )
        .map((entity) => entity.entityId);
    default:
      return [];
  }
}

function applyImmediateMoveCapacityDelta(options: {
  state: BattleState;
  targetEntityIds: string[];
  amount: number;
}): BattleState {
  const { state, targetEntityIds, amount } = options;
  if (amount === 0 || targetEntityIds.length === 0) {
    return state;
  }

  const nextEntitiesById = { ...state.entitiesById };

  for (const targetEntityId of targetEntityIds) {
    const entity = nextEntitiesById[targetEntityId];
    if (!entity) {
      continue;
    }

    if (entity.kind === "hero") {
      const effectiveMoveCapacity = resolveEffectiveNumber({
        state,
        targetEntityId,
        propertyPath: "moveCapacity",
        baseValue: entity.maxMovePoints,
        clampMin: 0,
      }).effectiveValue;
      const cap = Math.min(effectiveMoveCapacity, MOVE_POINTS_CAP);

      nextEntitiesById[targetEntityId] = {
        ...entity,
        movePoints: Math.max(0, Math.min(entity.movePoints + amount, cap)),
      };
      continue;
    }

    if (entity.kind === "companion") {
      const effectiveMoveCapacity = resolveEffectiveNumber({
        state,
        targetEntityId,
        propertyPath: "moveCapacity",
        baseValue: entity.maxMovesPerTurn,
        clampMin: 0,
      }).effectiveValue;
      const cap = Math.min(effectiveMoveCapacity, MOVE_POINTS_CAP);

      nextEntitiesById[targetEntityId] = {
        ...entity,
        remainingMoves: Math.max(0, Math.min(entity.remainingMoves + amount, cap)),
      };
    }
  }

  return {
    ...state,
    entitiesById: nextEntitiesById,
  };
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
    const passiveRule = {
      id: buildPassiveRuleId({ effectId: effect.id, sequence, sourceEntityId }),
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

    const stateWithPassiveRule = {
      ...state,
      activePassiveRules: [...state.activePassiveRules, passiveRule],
    };

    const nextState =
      payload.stat === "moveCapacity"
        ? applyImmediateMoveCapacityDelta({
            state: stateWithPassiveRule,
            targetEntityIds: resolvePassiveRuleTargetEntityIds({
              state: stateWithPassiveRule,
              sourceEntityId,
              targetSelector: payload.target,
            }),
            amount: payload.amount,
          })
        : stateWithPassiveRule;

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
