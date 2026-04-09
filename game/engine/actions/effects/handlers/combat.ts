import { applyLuckToChance, applyLuckToRoll } from "../../../core/luck";
import { rollRange } from "../../../core/rng";
import { roundWhole, toAppliedDamage, toHealAmount } from "../../../core/combat";
import { LUCK_DODGE_CHANCE_PER_POINT } from "../../../../shared/game-constants";
import type { BattleEvent } from "../../../../shared/models";
import {
  getEffectiveAttackDamage,
  getEffectiveArmor,
  getEffectiveDamageRange,
  getEffectiveDodgeChance,
  getEffectiveHealRange,
  getEffectiveMagicResist,
  getEffectiveSharpness,
} from "../../effects/get-effective-number";
import { computeScaledDamageRange } from "../../../core/damage-range";
import { resolveEffectiveNumber } from "../../../core/number-resolver";
import { destroyResistanceFromBaseAndPersistent } from "../../../core/sharpness";
import { markHeroDamageTakenThisTurn } from "../../../core/aura";
import {
  type EffectExecutionContext,
  type ExecuteCardEffectResult,
} from "../context";
import { targetEntityIdFromSelector } from "../targeting";

function getAttackFlatBonusDamage(options: {
  state: EffectExecutionContext["state"];
  targetEntityId: string;
}): number {
  return resolveEffectiveNumber({
    state: options.state,
    targetEntityId: options.targetEntityId,
    propertyPath: "attackFlatBonusDamage",
    baseValue: 0,
    clampMin: 0,
  }).effectiveValue;
}

function destroyBaseAndPermanentArmor(options: {
  state: EffectExecutionContext["state"];
  targetEntityId: string;
}): {
  nextActiveModifiers: EffectExecutionContext["state"]["activeModifiers"];
  removedModifierIds: string[];
  destroyedArmor: number;
} {
  const { state, targetEntityId } = options;
  const target = state.entitiesById[targetEntityId];
  if (!target) {
    return {
      nextActiveModifiers: state.activeModifiers,
      removedModifierIds: [],
      destroyedArmor: 0,
    };
  }

  const removedModifierIds: string[] = [];
  let destroyedArmorFromPersistentModifiers = 0;

  for (const modifier of state.activeModifiers) {
    const affectsTargetArmor = modifier.targetEntityId === targetEntityId && modifier.propertyPath === "armor";
    if (!affectsTargetArmor) {
      continue;
    }

    const isPersistentModifier = modifier.lifetime === "persistent";
    const hasPermanentCondition = !modifier.condition || modifier.condition.kind === "always";
    const addsArmor = modifier.operation === "add" && modifier.value > 0;

    if (isPersistentModifier && hasPermanentCondition && addsArmor) {
      removedModifierIds.push(modifier.id);
      destroyedArmorFromPersistentModifiers += modifier.value;
    }
  }

  const nextActiveModifiers = state.activeModifiers.filter(
    (modifier) => !removedModifierIds.includes(modifier.id),
  );

  const destroyedArmorFromBase = Math.max(0, target.armor);
  const destroyedArmor = Math.max(0, roundWhole(destroyedArmorFromBase + destroyedArmorFromPersistentModifiers));

  return {
    nextActiveModifiers,
    removedModifierIds,
    destroyedArmor,
  };
}

export function handleHealEffect(
  context: EffectExecutionContext,
): ExecuteCardEffectResult {
  const {
    state,
    effect,
    action,
    actorHero,
    sequence,
    battleRng,
    triggerEvent,
    lastDamageWasDodged,
    lastSummonedEntityId,
    effectSourceEntityId,
  } = context;

  if (effect.payload.kind !== "heal") {
    return { ok: false, reason: "handleHealEffect received non-heal payload." };
  }

  const targetId = targetEntityIdFromSelector({
    selector: effect.payload.target,
    action,
    actorHero,
    state,
    triggerEvent,
  });
  if (!targetId) {
    return { ok: false, reason: "heal requires a valid effect target." };
  }

  const target = state.entitiesById[targetId];
  if (!target) {
    return { ok: false, reason: "heal target was not found." };
  }

  const effectiveRange = getEffectiveHealRange({
    state,
    targetEntityId: actorHero.entityId,
    baseMinimum: effect.payload.minimum,
    baseMaximum: effect.payload.maximum,
  });

  const rawRoll = rollRange(
    battleRng,
    effectiveRange.minimum.effectiveValue,
    effectiveRange.maximum.effectiveValue,
  );
  const adjustedRoll = applyLuckToRoll({
    rawRoll,
    minimum: effectiveRange.minimum.effectiveValue,
    maximum: effectiveRange.maximum.effectiveValue,
    luck: state.luck,
    rollingHeroEntityId: actorHero.entityId,
  });

  const amount = toHealAmount(adjustedRoll);
  const baseHealth = roundWhole(target.currentHealth);
  const nextHealth = Math.min(target.maxHealth, baseHealth + amount);
  const applied = nextHealth - baseHealth;

  return {
    ok: true,
    state: {
      ...state,
      entitiesById: {
        ...state.entitiesById,
        [targetId]: {
          ...target,
          currentHealth: nextHealth,
        },
      },
    },
    events: [
      {
        kind: "healApplied",
        sequence,
        sourceEntityId: effectSourceEntityId ?? actorHero.entityId,
        targetEntityId: targetId,
        amount: applied,
      },
    ],
    nextSequence: sequence + 1,
    lastDamageWasDodged,
    lastSummonedEntityId,
  };
}

export function handleDealDamageEffect(
  context: EffectExecutionContext,
): ExecuteCardEffectResult {
  const {
    state,
    effect,
    action,
    actorHero,
    sequence,
    battleRng,
    triggerEvent,
    lastSummonedEntityId,
    effectSourceEntityId,
  } = context;

  if (effect.payload.kind !== "dealDamage") {
    return { ok: false, reason: "handleDealDamageEffect received non-dealDamage payload." };
  }

  const targetId = targetEntityIdFromSelector({
    selector: effect.payload.target,
    action,
    actorHero,
    state,
    triggerEvent,
  });
  if (!targetId) {
    return { ok: false, reason: "dealDamage requires a valid effect target." };
  }

  const target = state.entitiesById[targetId];
  if (!target) {
    if (effect.payload.target === "triggeringTarget") {
      return {
        ok: true,
        state,
        events: [],
        nextSequence: sequence,
        lastDamageWasDodged: false,
        lastSummonedEntityId,
      };
    }

    return { ok: false, reason: "dealDamage target was not found." };
  }

  const sourceEntity = effectSourceEntityId
    ? state.entitiesById[effectSourceEntityId]
    : actorHero;
  if (!sourceEntity) {
    return { ok: false, reason: "dealDamage source entity was not found." };
  }

  const effectiveAttackDamage = getEffectiveAttackDamage({
    state,
    targetEntityId: sourceEntity.entityId,
    baseAttackDamage: sourceEntity.attackDamage,
  }).effectiveValue;
  const effectiveAbilityPower = sourceEntity.abilityPower;
  const effectiveRange = getEffectiveDamageRange({
    state,
    targetEntityId: sourceEntity.entityId,
    baseMinimum: effect.payload.minimum,
    baseMaximum: effect.payload.maximum,
  });
  const flatBonusDamage = getAttackFlatBonusDamage({
    state,
    targetEntityId: actorHero.entityId,
  });
  const sourceSharpness = getEffectiveSharpness({
    state,
    targetEntityId: sourceEntity.entityId,
    baseSharpness: 0,
  }).effectiveValue;
  const ownerSharpness =
    sourceEntity.entityId === actorHero.entityId
      ? 0
      : getEffectiveSharpness({
          state,
          targetEntityId: actorHero.entityId,
          baseSharpness: 0,
        }).effectiveValue;
  const sharpness = sourceSharpness + ownerSharpness;

  const { minimum, maximum } = computeScaledDamageRange({
    minimum: effectiveRange.minimum.effectiveValue,
    maximum: effectiveRange.maximum.effectiveValue,
    attackDamage: effectiveAttackDamage,
    abilityPower: effectiveAbilityPower,
    armor: sourceEntity.armor,
    attackDamageScaling: effect.payload.attackDamageScaling,
    abilityPowerScaling: effect.payload.abilityPowerScaling,
    armorScaling: effect.payload.armorScaling,
  });

  const rawRoll = rollRange(battleRng, minimum, maximum);
  const adjustedRoll = applyLuckToRoll({
    rawRoll,
    minimum,
    maximum,
    luck: state.luck,
    rollingHeroEntityId: actorHero.entityId,
  });

  let wasDodged = false;
  if (effect.payload.canBeDodged) {
    const targetBaseDodgeChance = Math.min(
      1,
      getEffectiveDodgeChance({
        state,
        targetEntityId: target.entityId,
        baseDodgeChance: target.dodgeChance,
      }).effectiveValue,
    );
    const effectiveDodgeChance = applyLuckToChance({
      baseChance: targetBaseDodgeChance,
      luck: state.luck,
      affectedHeroEntityId: target.entityId,
      chancePerPoint: LUCK_DODGE_CHANCE_PER_POINT,
    });
    wasDodged = battleRng.nextFloat() < effectiveDodgeChance;
  }

  let appliedDamage = 0;
  let stateAfterSharpness = state;
  if (!wasDodged) {
    if (sharpness > 0 && (effect.payload.damageType === "physical" || effect.payload.damageType === "magic")) {
      stateAfterSharpness = destroyResistanceFromBaseAndPersistent({
        state,
        targetEntityId: target.entityId,
        stat: effect.payload.damageType === "physical" ? "armor" : "magicResist",
        amount: sharpness,
      }).state;
    }

    const targetAfterSharpness = stateAfterSharpness.entitiesById[target.entityId];
    if (!targetAfterSharpness) {
      return { ok: false, reason: "dealDamage target was not found after Sharpness resolution." };
    }

    const resistance =
      effect.payload.damageType === "physical"
        ? getEffectiveArmor({
            state: stateAfterSharpness,
            targetEntityId: targetAfterSharpness.entityId,
            baseArmor: targetAfterSharpness.armor,
          }).effectiveValue
        : effect.payload.damageType === "magic"
          ? getEffectiveMagicResist({
              state: stateAfterSharpness,
              targetEntityId: targetAfterSharpness.entityId,
              baseMagicResist: targetAfterSharpness.magicResist,
            }).effectiveValue
          : 0;
    appliedDamage = toAppliedDamage(adjustedRoll, resistance) + roundWhole(flatBonusDamage);
  }

  const nextTarget = stateAfterSharpness.entitiesById[targetId];
  if (!nextTarget) {
    return { ok: false, reason: "dealDamage target was not found while applying damage." };
  }

  const targetHealth = roundWhole(nextTarget.currentHealth);

  const nextState = {
    ...stateAfterSharpness,
    entitiesById: {
      ...stateAfterSharpness.entitiesById,
      [targetId]: {
        ...nextTarget,
        currentHealth: Math.max(0, targetHealth - appliedDamage),
      },
    },
  };

  const nextStateWithDamageFlag =
    target.kind === "hero" && appliedDamage > 0
      ? markHeroDamageTakenThisTurn(nextState, target.entityId)
      : nextState;

  return {
    ok: true,
    state: nextStateWithDamageFlag,
    events: [
      {
        kind: "damageApplied",
        sequence,
        sourceEntityId: effectSourceEntityId ?? actorHero.entityId,
        targetEntityId: targetId,
        amount: appliedDamage,
        damageType: effect.payload.damageType,
        isAttack: true,
        wasDodged,
      },
    ],
    nextSequence: sequence + 1,
    lastDamageWasDodged: wasDodged,
    lastSummonedEntityId,
  };
}

export function handleDestroyArmorAndDealPerArmorToEnemyHeroEffect(
  context: EffectExecutionContext,
): ExecuteCardEffectResult {
  const {
    state,
    effect,
    action,
    actorHero,
    sequence,
    lastSummonedEntityId,
    effectSourceEntityId,
  } = context;

  if (effect.payload.kind !== "destroyArmorAndDealPerArmorToEnemyHero") {
    return { ok: false, reason: "handleDestroyArmorAndDealPerArmorToEnemyHeroEffect received unsupported payload." };
  }

  const targetId = targetEntityIdFromSelector({
    selector: effect.payload.target,
    action,
    actorHero,
    state,
  });
  if (!targetId) {
    return { ok: false, reason: "Warcry requires a valid selected target." };
  }

  const target = state.entitiesById[targetId];
  if (!target) {
    return { ok: false, reason: "Warcry target was not found." };
  }

  const targetIsEnemyHero = target.kind === "hero" && target.battlefieldSide !== actorHero.battlefieldSide;
  if (targetIsEnemyHero) {
    return { ok: false, reason: "Warcry cannot target the enemy hero." };
  }

  const {
    nextActiveModifiers,
    removedModifierIds,
    destroyedArmor,
  } = destroyBaseAndPermanentArmor({
    state,
    targetEntityId: targetId,
  });

  const enemyHeroId = state.heroEntityIds.find((heroEntityId) => {
    const hero = state.entitiesById[heroEntityId];
    return hero?.kind === "hero" && hero.battlefieldSide !== actorHero.battlefieldSide;
  });

  if (!enemyHeroId) {
    return { ok: false, reason: "Enemy hero was not found for Warcry damage." };
  }

  const enemyHero = state.entitiesById[enemyHeroId];
  if (!enemyHero || enemyHero.kind !== "hero") {
    return { ok: false, reason: "Enemy hero was invalid for Warcry damage." };
  }

  const damageAmount = destroyedArmor * effect.payload.damagePerArmor;
  const flatBonusDamage = getAttackFlatBonusDamage({
    state,
    targetEntityId: actorHero.entityId,
  });
  const appliedDamage = damageAmount + roundWhole(flatBonusDamage);
  const nextEnemyHealth = Math.max(0, roundWhole(enemyHero.currentHealth) - damageAmount);

  let nextSequence = sequence;
  const events: BattleEvent[] = [];

  for (const modifierId of removedModifierIds) {
    events.push({
      kind: "numberModifierExpired",
      sequence: nextSequence,
      modifierId,
      targetEntityId: targetId,
      reason: "source_removed",
    });
    nextSequence += 1;
  }

  if (destroyedArmor > 0) {
    events.push({
      kind: "armorLost",
      sequence: nextSequence,
      targetEntityId: targetId,
      amount: destroyedArmor,
    });
    nextSequence += 1;
  }

  if (appliedDamage > 0) {
    events.push({
      kind: "damageApplied",
      sequence: nextSequence,
      sourceEntityId: effectSourceEntityId ?? actorHero.entityId,
      targetEntityId: enemyHero.entityId,
      amount: appliedDamage,
      damageType: effect.payload.damageType,
      isAttack: true,
      wasDodged: false,
    });
    nextSequence += 1;
  }

  const nextState = {
    ...state,
    activeModifiers: nextActiveModifiers,
    entitiesById: {
      ...state.entitiesById,
      [targetId]: {
        ...target,
        armor: 0,
      },
      [enemyHero.entityId]: {
        ...enemyHero,
        currentHealth: nextEnemyHealth,
      },
    },
  };

  const nextStateWithDamageFlag =
    enemyHero.kind === "hero" && appliedDamage > 0
      ? markHeroDamageTakenThisTurn(nextState, enemyHero.entityId)
      : nextState;

  return {
    ok: true,
    state: nextStateWithDamageFlag,
    events,
    nextSequence,
    lastDamageWasDodged: false,
    lastSummonedEntityId,
  };
}

export function handleDestroySelfArmorAndDealPerArmorToTargetEffect(
  context: EffectExecutionContext,
): ExecuteCardEffectResult {
  const {
    state,
    effect,
    action,
    actorHero,
    sequence,
    lastSummonedEntityId,
    effectSourceEntityId,
  } = context;

  if (effect.payload.kind !== "destroySelfArmorAndDealPerArmorToTarget") {
    return { ok: false, reason: "handleDestroySelfArmorAndDealPerArmorToTargetEffect received unsupported payload." };
  }

  const targetId = targetEntityIdFromSelector({
    selector: effect.payload.target,
    action,
    actorHero,
    state,
  });
  if (!targetId) {
    return { ok: false, reason: "Shatter Plating requires a valid selected target." };
  }

  const damageTarget = state.entitiesById[targetId];
  if (!damageTarget) {
    return { ok: false, reason: "Shatter Plating target was not found." };
  }

  const {
    nextActiveModifiers,
    removedModifierIds,
    destroyedArmor,
  } = destroyBaseAndPermanentArmor({
    state,
    targetEntityId: actorHero.entityId,
  });

  const damageAmount = destroyedArmor * effect.payload.damagePerArmor;
  const flatBonusDamage = getAttackFlatBonusDamage({
    state,
    targetEntityId: actorHero.entityId,
  });
  const appliedDamage = damageAmount + roundWhole(flatBonusDamage);
  const nextTargetHealth = Math.max(0, roundWhole(damageTarget.currentHealth) - damageAmount);

  let nextSequence = sequence;
  const events: BattleEvent[] = [];

  for (const modifierId of removedModifierIds) {
    events.push({
      kind: "numberModifierExpired",
      sequence: nextSequence,
      modifierId,
      targetEntityId: actorHero.entityId,
      reason: "source_removed",
    });
    nextSequence += 1;
  }

  if (destroyedArmor > 0) {
    events.push({
      kind: "armorLost",
      sequence: nextSequence,
      targetEntityId: actorHero.entityId,
      amount: destroyedArmor,
    });
    nextSequence += 1;
  }

  if (appliedDamage > 0) {
    events.push({
      kind: "damageApplied",
      sequence: nextSequence,
      sourceEntityId: effectSourceEntityId ?? actorHero.entityId,
      targetEntityId: damageTarget.entityId,
      amount: appliedDamage,
      damageType: effect.payload.damageType,
      isAttack: true,
      wasDodged: false,
    });
    nextSequence += 1;
  }

  const nextState = {
    ...state,
    activeModifiers: nextActiveModifiers,
    entitiesById: {
      ...state.entitiesById,
      [actorHero.entityId]: {
        ...actorHero,
        armor: 0,
      },
      [damageTarget.entityId]: {
        ...damageTarget,
        currentHealth: nextTargetHealth,
      },
    },
  };

  const nextStateWithDamageFlag =
    damageTarget.kind === "hero" && appliedDamage > 0
      ? markHeroDamageTakenThisTurn(nextState, damageTarget.entityId)
      : nextState;

  return {
    ok: true,
    state: nextStateWithDamageFlag,
    events,
    nextSequence,
    lastDamageWasDodged: false,
    lastSummonedEntityId,
  };
}
