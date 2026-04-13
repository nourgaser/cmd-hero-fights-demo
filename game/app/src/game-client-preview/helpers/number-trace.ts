import { createGameApi } from '../../../../index.ts'
import type { NumberExplanation } from '../../../../shared/models'
import {
  formatPreviewNumber,
  formatSignedDelta,
} from '../../utils/game-client-format.ts'
import type {
  AppNumberContributionPreview,
  AppNumberTrace,
} from '../types.ts'

type PreviewBattleState = ReturnType<ReturnType<typeof createGameApi>['createBattle']>['state']

function toAppNumberTrace(explanation: NumberExplanation): AppNumberTrace {
  return {
    base: explanation.baseValue,
    effective: explanation.effectiveValue,
    delta: explanation.effectiveValue - explanation.baseValue,
    contributions: explanation.contributions.map((contribution) => ({
      sourceId: contribution.sourceId,
      label: contribution.label,
      delta: contribution.delta,
    })),
  }
}

export function numberTraceToDetailLine(label: string, trace: AppNumberTrace): string {
  const head = `${label}: ${formatPreviewNumber(trace.base)} -> ${formatPreviewNumber(trace.effective)}`
  if (trace.delta === 0 || trace.contributions.length === 0) {
    return `${head} (no modifiers)`
  }

  const contributionText = trace.contributions
    .map((contribution) => `${contribution.label} ${formatSignedDelta(contribution.delta)}`)
    .join(', ')

  return `${head} (${formatSignedDelta(trace.delta)}: ${contributionText})`
}

export function resolveNumberTrace(options: {
  gameApi: ReturnType<typeof createGameApi>
  state: ReturnType<ReturnType<typeof createGameApi>['createBattle']>['state']
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

  return toAppNumberTrace(explanation)
}

export function makeStaticNumberTrace(value: number): AppNumberTrace {
  return {
    base: value,
    effective: value,
    delta: 0,
    contributions: [],
  }
}

export function combineNumberTraces(...traces: AppNumberTrace[]): AppNumberTrace {
  const contributionsBySource = new Map<string, AppNumberContributionPreview>()

  for (const trace of traces) {
    for (const contribution of trace.contributions) {
      const key = `${contribution.sourceId}:${contribution.label}`
      const existing = contributionsBySource.get(key)
      if (existing) {
        existing.delta += contribution.delta
      } else {
        contributionsBySource.set(key, {
          sourceId: contribution.sourceId,
          label: contribution.label,
          delta: contribution.delta,
        })
      }
    }
  }

  return {
    base: traces.reduce((sum, trace) => sum + trace.base, 0),
    effective: traces.reduce((sum, trace) => sum + trace.effective, 0),
    delta: traces.reduce((sum, trace) => sum + trace.delta, 0),
    contributions: Array.from(contributionsBySource.values()).filter((entry) => entry.delta !== 0),
  }
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value))
}

function applyModifierOperationForPermanentLayer(options: {
  currentValue: number
  operation: 'add' | 'subtract' | 'set'
  value: number
}): number {
  const { currentValue, operation, value } = options
  switch (operation) {
    case 'add':
      return currentValue + value
    case 'subtract':
      return currentValue - value
    case 'set':
      return value
    default:
      return currentValue
  }
}

export function resolvePermanentLayerValue(options: {
  state: PreviewBattleState
  targetEntityId: string
  propertyPath: string
  baseValue: number
  clampMin?: number
  clampMax?: number
}): number {
  const { state, targetEntityId, propertyPath, baseValue, clampMin, clampMax } = options

  const persistentAlwaysModifiers = state.activeModifiers.filter(
    (modifier) =>
      modifier.targetEntityId === targetEntityId &&
      modifier.propertyPath === propertyPath &&
      modifier.lifetime === 'persistent' &&
      (!modifier.condition || modifier.condition.kind === 'always'),
  )

  let value = baseValue
  for (const modifier of persistentAlwaysModifiers) {
    value = applyModifierOperationForPermanentLayer({
      currentValue: value,
      operation: modifier.operation,
      value: modifier.value,
    })
  }

  if (clampMin !== undefined) {
    value = Math.max(clampMin, value)
  }
  if (clampMax !== undefined) {
    value = Math.min(clampMax, value)
  }

  return value
}

export function clampNumber(value: number, minimum: number, maximum: number): number {
  return clamp(value, minimum, maximum)
}
