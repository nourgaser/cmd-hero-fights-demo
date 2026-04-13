import type { AppNumberTrace } from '../types'
import type { AppBattleApi } from '../../game-client'
import type { BattleState } from '../../../../shared/models'

export function resolveNumberTrace(options: {
  gameApi: AppBattleApi
  state: BattleState
  targetEntityId: string
  propertyPath: string
  baseValue: number
  clampMin?: number
  clampMax?: number
}): AppNumberTrace {
  const { state, targetEntityId, propertyPath, baseValue, clampMin, clampMax } = options

  const contributions: AppNumberTrace['contributions'] = []
  let bonusValue = 0

  for (const modifier of state.activeModifiers) {
    if (modifier.targetEntityId !== targetEntityId || modifier.propertyPath !== propertyPath) {
      continue
    }

    const delta = modifier.operation === 'add' ? modifier.value : -modifier.value
    bonusValue += delta
    contributions.push({
      sourceId: modifier.id,
      label: modifier.label,
      delta,
    })
  }

  for (const rule of state.activePassiveRules) {
    if (rule.targetSelector !== 'sourceEntity' || rule.source.kind !== 'sourceEntity') {
      continue
    }

    const isTarget = rule.source.sourceEntityId === targetEntityId
    if (!isTarget) continue

    for (const op of rule.operations) {
      if (op.propertyPath !== propertyPath) continue
      const delta = op.operation === 'add' ? (op.value ?? 0) : -(op.value ?? 0)
      bonusValue += delta
      contributions.push({
        sourceId: rule.id,
        label: rule.label,
        delta,
      })
    }
  }

  const rawValue = baseValue + bonusValue
  let effectiveValue = rawValue
  if (clampMin !== undefined) effectiveValue = Math.max(clampMin, effectiveValue)
  if (clampMax !== undefined) effectiveValue = Math.min(clampMax, effectiveValue)

  return {
    base: baseValue,
    effective: effectiveValue,
    delta: effectiveValue - baseValue,
    contributions,
  }
}

export function makeStaticNumberTrace(value: number): AppNumberTrace {
  return {
    base: value,
    effective: value,
    delta: 0,
    contributions: [],
  }
}

export function numberTraceToDetailLine(label: string, trace: AppNumberTrace): string {
  if (trace.delta === 0) {
    return `${label}: ${trace.base}`
  }
  return `${label}: ${trace.effective} (${trace.base} ${trace.delta >= 0 ? '+' : '-'}${Math.abs(trace.delta)})`
}

export function resolvePermanentLayerValue(options: {
  state: BattleState
  targetEntityId: string
  propertyPath: string
  baseValue: number
  clampMin?: number
  clampMax?: number
}): number {
  const { state, targetEntityId, propertyPath, baseValue, clampMin, clampMax } = options
  let bonusValue = 0

  for (const modifier of state.activeModifiers) {
    if (modifier.targetEntityId !== targetEntityId || modifier.propertyPath !== propertyPath || modifier.lifetime !== 'persistent') {
      continue
    }

    const delta = modifier.operation === 'add' ? modifier.value : -modifier.value
    bonusValue += delta
  }

  let effectiveValue = baseValue + bonusValue
  if (clampMin !== undefined) effectiveValue = Math.max(clampMin, effectiveValue)
  if (clampMax !== undefined) effectiveValue = Math.min(clampMax, effectiveValue)

  return effectiveValue
}

export function combineNumberTraces(left: AppNumberTrace, right: AppNumberTrace): AppNumberTrace {
  return {
    base: left.base + right.base,
    effective: left.effective + right.effective,
    delta: left.delta + right.delta,
    contributions: [...left.contributions, ...right.contributions],
  }
}
