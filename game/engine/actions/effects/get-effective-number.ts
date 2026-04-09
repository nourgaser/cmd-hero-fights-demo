import type { BattleState, NumberExplanation } from "../../../shared/models";
import { resolveEffectiveNumber } from "../../core/number-resolver";

/**
 * Helper APIs for effects and actions to query effective numeric values.
 * These wrappers provide convenient access to resolved numbers for common use cases.
 */

/**
 * Get effective armor for an entity.
 */
export function getEffectiveArmor(options: {
  state: BattleState;
  targetEntityId: string;
  baseArmor: number;
}): NumberExplanation {
  return resolveEffectiveNumber({
    state: options.state,
    targetEntityId: options.targetEntityId,
    propertyPath: "armor",
    baseValue: options.baseArmor,
    clampMin: 0,
  });
}

/**
 * Get effective magic resist for an entity.
 */
export function getEffectiveMagicResist(options: {
  state: BattleState;
  targetEntityId: string;
  baseMagicResist: number;
}): NumberExplanation {
  return resolveEffectiveNumber({
    state: options.state,
    targetEntityId: options.targetEntityId,
    propertyPath: "magicResist",
    baseValue: options.baseMagicResist,
    clampMin: 0,
  });
}

/**
 * Get effective attack damage for an entity.
 */
export function getEffectiveAttackDamage(options: {
  state: BattleState;
  targetEntityId: string;
  baseAttackDamage: number;
}): NumberExplanation {
  return resolveEffectiveNumber({
    state: options.state,
    targetEntityId: options.targetEntityId,
    propertyPath: "attackDamage",
    baseValue: options.baseAttackDamage,
    clampMin: 0,
  });
}

/**
 * Get effective sharpness for an entity.
 */
export function getEffectiveSharpness(options: {
  state: BattleState;
  targetEntityId: string;
  baseSharpness: number;
}): NumberExplanation {
  return resolveEffectiveNumber({
    state: options.state,
    targetEntityId: options.targetEntityId,
    propertyPath: "sharpness",
    baseValue: options.baseSharpness,
    clampMin: 0,
  });
}

/**
 * Get effective ability power for an entity.
 */
export function getEffectiveAbilityPower(options: {
  state: BattleState;
  targetEntityId: string;
  baseAbilityPower: number;
}): NumberExplanation {
  return resolveEffectiveNumber({
    state: options.state,
    targetEntityId: options.targetEntityId,
    propertyPath: "abilityPower",
    baseValue: options.baseAbilityPower,
    clampMin: 0,
  });
}

/**
 * Get effective dodge chance for an entity.
 */
export function getEffectiveDodgeChance(options: {
  state: BattleState;
  targetEntityId: string;
  baseDodgeChance: number;
}): NumberExplanation {
  return resolveEffectiveNumber({
    state: options.state,
    targetEntityId: options.targetEntityId,
    propertyPath: "dodgeChance",
    baseValue: options.baseDodgeChance,
    clampMin: 0,
  });
}

/**
 * Get effective health for an entity.
 */
export function getEffectiveHealth(options: {
  state: BattleState;
  targetEntityId: string;
  baseHealth: number;
}): NumberExplanation {
  return resolveEffectiveNumber({
    state: options.state,
    targetEntityId: options.targetEntityId,
    propertyPath: "health",
    baseValue: options.baseHealth,
    clampMin: 0,
  });
}

/**
 * Get effective damage range for a dealDamage effect.
 * Resolves both minimum and maximum separately.
 */
export function getEffectiveDamageRange(options: {
  state: BattleState;
  targetEntityId: string;
  baseMinimum: number;
  baseMaximum: number;
}): {
  minimum: NumberExplanation;
  maximum: NumberExplanation;
} {
  return {
    minimum: resolveEffectiveNumber({
      state: options.state,
      targetEntityId: options.targetEntityId,
      propertyPath: "dealDamage.minimum",
      baseValue: options.baseMinimum,
      clampMin: 0,
    }),
    maximum: resolveEffectiveNumber({
      state: options.state,
      targetEntityId: options.targetEntityId,
      propertyPath: "dealDamage.maximum",
      baseValue: options.baseMaximum,
      clampMin: 0,
    }),
  };
}

/**
 * Get effective heal range.
 * Resolves minimum and maximum separately.
 */
export function getEffectiveHealRange(options: {
  state: BattleState;
  targetEntityId: string;
  baseMinimum: number;
  baseMaximum: number;
}): {
  minimum: NumberExplanation;
  maximum: NumberExplanation;
} {
  return {
    minimum: resolveEffectiveNumber({
      state: options.state,
      targetEntityId: options.targetEntityId,
      propertyPath: "heal.minimum",
      baseValue: options.baseMinimum,
      clampMin: 0,
    }),
    maximum: resolveEffectiveNumber({
      state: options.state,
      targetEntityId: options.targetEntityId,
      propertyPath: "heal.maximum",
      baseValue: options.baseMaximum,
      clampMin: 0,
    }),
  };
}

/**
 * Get effective draw count for a drawCards effect.
 */
export function getEffectiveDrawCount(options: {
  state: BattleState;
  targetEntityId: string;
  baseAmount: number;
}): NumberExplanation {
  return resolveEffectiveNumber({
    state: options.state,
    targetEntityId: options.targetEntityId,
    propertyPath: "drawCards.amount",
    baseValue: options.baseAmount,
    clampMin: 0,
  });
}

/**
 * Get effective refund amount.
 */
export function getEffectiveRefundAmount(options: {
  state: BattleState;
  targetEntityId: string;
  baseAmount: number;
}): NumberExplanation {
  return resolveEffectiveNumber({
    state: options.state,
    targetEntityId: options.targetEntityId,
    propertyPath: "refundMoveCost.amount",
    baseValue: options.baseAmount,
    clampMin: 0,
  });
}

/**
 * Get effective basic attack damage range (action constant).
 */
export function getEffectiveBasicAttackRange(options: {
  state: BattleState;
  targetEntityId: string;
  baseMinimum: number;
  baseMaximum: number;
}): {
  minimum: NumberExplanation;
  maximum: NumberExplanation;
} {
  return {
    minimum: resolveEffectiveNumber({
      state: options.state,
      targetEntityId: options.targetEntityId,
      propertyPath: "basicAttack.minimum",
      baseValue: options.baseMinimum,
      clampMin: 0,
    }),
    maximum: resolveEffectiveNumber({
      state: options.state,
      targetEntityId: options.targetEntityId,
      propertyPath: "basicAttack.maximum",
      baseValue: options.baseMaximum,
      clampMin: 0,
    }),
  };
}
