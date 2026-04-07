import { applyLuckToRoll } from "../../../core/luck";
import { rollRange } from "../../../core/rng";
import { roundWhole, toAppliedDamage, toHealAmount } from "../../../core/combat";
import type { BattleEvent } from "../../../../shared/models";
import {
  getEffectiveAttackDamage,
  getEffectiveArmor,
  getEffectiveDamageRange,
  getEffectiveDodgeChance,
  getEffectiveHealRange,
  getEffectiveMagicResist,
} from "../../effects/get-effective-number";
import { computeScaledDamageRange } from "../../../core/damage-range";
import {
  type EffectExecutionContext,
  type ExecuteCardEffectResult,
} from "../context";
import { targetEntityIdFromSelector } from "../targeting";

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
    const effectiveDodgeChance = Math.min(
      1,
      getEffectiveDodgeChance({
        state,
        targetEntityId: target.entityId,
        baseDodgeChance: target.dodgeChance,
      }).effectiveValue,
    );
    wasDodged = battleRng.nextFloat() < effectiveDodgeChance;
  }

  let appliedDamage = 0;
  if (!wasDodged) {
    const resistance =
      effect.payload.damageType === "physical"
        ? getEffectiveArmor({
            state,
            targetEntityId: target.entityId,
            baseArmor: target.armor,
          }).effectiveValue
        : effect.payload.damageType === "magic"
          ? getEffectiveMagicResist({
              state,
              targetEntityId: target.entityId,
              baseMagicResist: target.magicResist,
            }).effectiveValue
          : 0;
    appliedDamage = toAppliedDamage(adjustedRoll, resistance);
  }

  const targetHealth = roundWhole(target.currentHealth);

  return {
    ok: true,
    state: {
      ...state,
      entitiesById: {
        ...state.entitiesById,
        [targetId]: {
          ...target,
          currentHealth: Math.max(0, targetHealth - appliedDamage),
        },
      },
    },
    events: [
      {
        kind: "damageApplied",
        sequence,
        sourceEntityId: effectSourceEntityId ?? actorHero.entityId,
        targetEntityId: targetId,
        amount: appliedDamage,
        damageType: effect.payload.damageType,
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

  if (damageAmount > 0) {
    events.push({
      kind: "damageApplied",
      sequence: nextSequence,
      sourceEntityId: effectSourceEntityId ?? actorHero.entityId,
      targetEntityId: enemyHero.entityId,
      amount: damageAmount,
      damageType: effect.payload.damageType,
      wasDodged: false,
    });
    nextSequence += 1;
  }

  return {
    ok: true,
    state: {
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
    },
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

  if (damageAmount > 0) {
    events.push({
      kind: "damageApplied",
      sequence: nextSequence,
      sourceEntityId: effectSourceEntityId ?? actorHero.entityId,
      targetEntityId: damageTarget.entityId,
      amount: damageAmount,
      damageType: effect.payload.damageType,
      wasDodged: false,
    });
    nextSequence += 1;
  }

  return {
    ok: true,
    state: {
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
    },
    events,
    nextSequence,
    lastDamageWasDodged: false,
    lastSummonedEntityId,
  };
}
