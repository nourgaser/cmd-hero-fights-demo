import type { AppNumberTrace } from '../types'
import type { AppBattleApi } from '../../game-client'
import type { BattleState, NumberContribution } from '../../../../shared/models'

function toAppNumberTrace(options: {
  baseValue: number
  effectiveValue: number
  contributions: AppNumberTrace['contributions']
}): AppNumberTrace {
  const { baseValue, effectiveValue, contributions } = options

  return {
    base: baseValue,
    effective: effectiveValue,
    delta: effectiveValue - baseValue,
    contributions,
  }
}

export function resolveNumberTrace(options: {
  gameApi: AppBattleApi
  state: BattleState
  targetEntityId: string
  propertyPath: string
  baseValue: number
  clampMin?: number
  clampMax?: number
}): AppNumberTrace {
  const explanation = options.gameApi.resolveEffectiveNumber({
    state: options.state,
    targetEntityId: options.targetEntityId,
    propertyPath: options.propertyPath,
    baseValue: options.baseValue,
    clampMin: options.clampMin,
    clampMax: options.clampMax,
  })

  return toAppNumberTrace({
    baseValue: explanation.baseValue,
    effectiveValue: explanation.effectiveValue,
    contributions: explanation.contributions.map((contribution: NumberContribution) => ({
      sourceId: contribution.sourceId,
      label: contribution.label,
      delta: contribution.delta,
    })),
  })
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
