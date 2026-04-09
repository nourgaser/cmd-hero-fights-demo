import type { BattleState } from "../../shared/models";

type ResistanceStat = "armor" | "magicResist";

/**
 * Sharpness destroys base and persistent resistance on hit.
 * It does not affect passive-rule, adjacency, aura, or other dynamic contributions.
 */
export function destroyResistanceFromBaseAndPersistent(options: {
  state: BattleState;
  targetEntityId: string;
  stat: ResistanceStat;
  amount: number;
}): {
  state: BattleState;
  destroyedAmount: number;
} {
  const { state, targetEntityId, stat } = options;
  let remaining = Math.max(0, Math.floor(options.amount));
  if (remaining <= 0) {
    return { state, destroyedAmount: 0 };
  }

  const target = state.entitiesById[targetEntityId];
  if (!target) {
    return { state, destroyedAmount: 0 };
  }

  let destroyedAmount = 0;
  let nextTarget = target;

  const baseValue = target[stat];
  if (baseValue > 0) {
    const destroyedBase = Math.min(baseValue, remaining);
    remaining -= destroyedBase;
    destroyedAmount += destroyedBase;
    nextTarget = {
      ...nextTarget,
      [stat]: Math.max(0, baseValue - destroyedBase),
    };
  }

  const nextModifiers: BattleState["activeModifiers"] = [];
  for (const modifier of state.activeModifiers) {
    const canDestroyModifierResistance =
      modifier.targetEntityId === targetEntityId &&
      modifier.propertyPath === stat &&
      modifier.lifetime === "persistent" &&
      modifier.operation === "add" &&
      modifier.value > 0 &&
      (!modifier.condition || modifier.condition.kind === "always");

    if (!canDestroyModifierResistance || remaining <= 0) {
      nextModifiers.push(modifier);
      continue;
    }

    const destroyedFromModifier = Math.min(modifier.value, remaining);
    remaining -= destroyedFromModifier;
    destroyedAmount += destroyedFromModifier;

    const nextValue = modifier.value - destroyedFromModifier;
    if (nextValue > 0) {
      nextModifiers.push({
        ...modifier,
        value: nextValue,
      });
    }
  }

  if (destroyedAmount === 0) {
    return { state, destroyedAmount: 0 };
  }

  return {
    state: {
      ...state,
      entitiesById: {
        ...state.entitiesById,
        [targetEntityId]: nextTarget,
      },
      activeModifiers: nextModifiers,
    },
    destroyedAmount,
  };
}