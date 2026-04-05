import type {
  BattleState,
  NumberModifier,
  PassiveRule,
  NumberExplanation,
  NumberContribution,
} from "../../shared/models";

/**
 * NumberResolver computes effective numeric values for any property on any entity.
 *
 * Resolution follows deterministic order:
 * 1. Base value
 * 2. Temporary modifiers (by application sequence)
 * 3. Passive rules (by source position)
 * 4. Finalization (clamp, round, etc.)
 *
 * All resolution is pure: no state mutation, only computed values.
 */

/**
 * Resolve the effective numeric value for a property on a target entity.
 * Includes full traceability via NumberExplanation.
 */
export function resolveEffectiveNumber(options: {
  state: BattleState;
  targetEntityId: string;
  propertyPath: string;
  baseValue: number;
  clampMin?: number;
  clampMax?: number;
}): NumberExplanation {
  const { state, targetEntityId, propertyPath, baseValue, clampMin, clampMax } = options;

  let accumulated = baseValue;
  const contributions: NumberContribution[] = [];

  // Phase 2: Apply temporary modifiers in sequence order
  const applicableModifiers = state.activeModifiers.filter(
    (m) => m.propertyPath === propertyPath && m.targetEntityId === targetEntityId,
  );

  for (const modifier of applicableModifiers) {
    // Check condition
    if (modifier.condition && !isModifierConditionSatisfied(modifier, state)) {
      continue;
    }

    // Apply operation
    const delta = applyModifierOperation(accumulated, modifier);
    if (delta !== 0) {
      accumulated += delta;
      contributions.push({
        sourceId: modifier.id,
        label: modifier.label,
        delta,
      });
    }
  }

  // Phase 3: Apply passive rules in source position order
  const applicableRules = state.activePassiveRules.filter((rule) => {
    // Check if this rule targets our entity (via target selector)
    // For now, simple implementation: we'll extend this later with full selector logic
    return true; // placeholder
  });

  // Sort by source position (deterministic)
  const sortedRules = applicableRules.sort((a, b) => {
    const aPosA = getSourcePosition(a.source, state);
    const bPosB = getSourcePosition(b.source, state);
    return compareBattlefieldPosition(aPosA, bPosB);
  });

  for (const rule of sortedRules) {
    // Check condition
    if (rule.condition && !isPassiveRuleConditionSatisfied(rule, state)) {
      continue;
    }

    // Apply all numeric operations
    for (const op of rule.operations) {
      if (op.propertyPath === propertyPath) {
        const delta = applyNumericOperation(accumulated, op);
        if (delta !== 0) {
          accumulated += delta;
          contributions.push({
            sourceId: rule.id,
            label: rule.label,
            delta,
          });
        }
      }
    }
  }

  // Phase 4: Finalization
  let effective = accumulated;
  if (clampMin !== undefined) {
    effective = Math.max(clampMin, effective);
  }
  if (clampMax !== undefined) {
    effective = Math.min(clampMax, effective);
  }

  return {
    propertyPath,
    baseValue,
    contributions,
    effectiveValue: effective,
  };
}

/**
 * Check if a modifier condition is currently satisfied.
 */
function isModifierConditionSatisfied(modifier: NumberModifier, state: BattleState): boolean {
  if (!modifier.condition) return true;

  if (modifier.condition.kind === "sourcePresent") {
    if (!modifier.sourceEntityId) return false;
    return modifier.sourceEntityId in state.entitiesById;
  }

  if (modifier.condition.kind === "always") {
    return true;
  }

  return true;
}

/**
 * Check if a passive rule condition is currently satisfied.
 */
function isPassiveRuleConditionSatisfied(rule: PassiveRule, state: BattleState): boolean {
  if (!rule.condition) return true;

  if (rule.condition.kind === "sourcePresent") {
    const sourceEntityId =
      rule.source.kind === "sourceEntity"
        ? rule.source.sourceEntityId
        : undefined;
    if (!sourceEntityId) return false;
    return sourceEntityId in state.entitiesById;
  }

  if (rule.condition.kind === "always") {
    return true;
  }

  return true;
}

/**
 * Apply a modifier operation to a current value, returning the delta.
 */
function applyModifierOperation(currentValue: number, modifier: NumberModifier): number {
  switch (modifier.operation) {
    case "add":
      return modifier.value;
    case "subtract":
      return -modifier.value;
    case "set":
      // set operation returns the amount needed to reach the new value
      return modifier.value - currentValue;
    default:
      return 0;
  }
}

/**
 * Apply a numeric operation, returning the delta.
 */
function applyNumericOperation(
  currentValue: number,
  op: { operation: string; value: number },
): number {
  switch (op.operation) {
    case "add":
      return op.value;
    case "subtract":
      return -op.value;
    case "set":
      return op.value - currentValue;
    default:
      return 0;
  }
}

/**
 * Get the battlefield position of a modifier source.
 * Returns a comparable value for deterministic ordering.
 * (Will be expanded to include entity position data.)
 */
function getSourcePosition(
  source: { kind: "sourceEntity" | "sourceCard"; sourceEntityId?: string },
  state: BattleState,
): number {
  if (source.kind === "sourceEntity" && source.sourceEntityId) {
    // TODO: integrate battlefield position lookup
    // For now, use entity order in entitiesById
    const entityIds = Object.keys(state.entitiesById);
    return entityIds.indexOf(source.sourceEntityId);
  }
  return 0;
}

/**
 * Compare two battlefield positions for deterministic ordering.
 */
function compareBattlefieldPosition(posA: number, posB: number): number {
  return posA - posB;
}
