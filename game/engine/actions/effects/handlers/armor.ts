import { roundWhole } from "../../../core/combat";
import type { BattleEvent } from "../../../../shared/models";
import { resolveEffectiveNumber } from "../../../core/number-resolver";
import { destroyAllResistanceFromBaseAndPersistent } from "../../../core/sharpness";
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
    effectSourceEntityId,
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
    state: stateAfterArmorDestroy,
    destroyedModifierIds,
    destroyedAmount: destroyedArmor,
  } = destroyAllResistanceFromBaseAndPersistent({
    state,
    targetEntityId: targetId,
    stat: "armor",
  });

  const enemyHeroId = (state.heroEntityIds as string[]).find((heroEntityId) => {
    const hero = state.entitiesById[heroEntityId as string];
    return hero?.kind === "hero" && hero.battlefieldSide !== actorHero.battlefieldSide;
  });

  if (!enemyHeroId) {
    return { ok: false, reason: "Enemy hero was not found for Warcry damage." };
  }

  const enemyHero = state.entitiesById[enemyHeroId as string];
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

  for (const modifierId of destroyedModifierIds) {
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
    ...stateAfterArmorDestroy,
    entitiesById: {
      ...stateAfterArmorDestroy.entitiesById,
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
    state: stateAfterArmorDestroy,
    destroyedModifierIds,
    destroyedAmount: destroyedArmor,
  } = destroyAllResistanceFromBaseAndPersistent({
    state,
    targetEntityId: actorHero.entityId,
    stat: "armor",
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

  for (const modifierId of destroyedModifierIds) {
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
    ...stateAfterArmorDestroy,
    entitiesById: {
      ...stateAfterArmorDestroy.entitiesById,
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
