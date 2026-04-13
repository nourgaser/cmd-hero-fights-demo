import {
  describeLifetime,
  formatLayeredValue,
  formatListenerLabel,
  formatPropertyPathLabel,
  isHeroPassiveListener,
  prettifyEventOrConditionKind,
  summarizeNumericOperation,
  STAT_METADATA,
  type StatKey,
} from '../../../utils/game-client-format'
import {
  numberTraceToDetailLine,
  resolveNumberTrace,
} from '../../helpers'
import { buildAuraPassiveEffects } from './auras'
import type {
  AuraGroup,
  HeroPassiveEffect,
} from './types'
import type { AppBattleApi } from '../../../game-client'
import type { BattleState, CardDefinition, HeroDefinition } from '../../../../../shared/models'

export function buildHeroPassivePackage(options: {
  gameApi: AppBattleApi
  state: BattleState
  cardsById: Readonly<Record<string, CardDefinition>>
  heroEntityId: string
  heroDef: HeroDefinition
  contributionSourceIds: Set<string>
  auraGroups: AuraGroup[]
}): {
  passiveText: string
  activePassiveEffects: HeroPassiveEffect[]
} {
  const { gameApi, state, cardsById, heroEntityId, heroDef, contributionSourceIds, auraGroups } = options

  const heroPassiveEffect: HeroPassiveEffect = {
    effectId: `hero-passive:${heroEntityId}`,
    sourceKind: 'heroPassive',
    label: `${heroDef.name} Passive`,
    iconId: 'game-icons:aura',
    paletteKey: 'hero',
    priority: 1000,
    stackCount: 1,
    statusLabel: 'Always On',
    statusTone: 'info',
    shortText: heroDef.passiveText,
    detailLines: ['Global hero passive effect.'],
  }

  const passiveHealBaseMatch = heroDef.passiveText.match(/restore\s+([0-9]+(?:\.[0-9]+)?)\s+HP/i)
  const passiveAttackHealBase = passiveHealBaseMatch ? Number(passiveHealBaseMatch[1]) : 0
  const passiveAttackHealTrace = passiveAttackHealBase > 0
    ? resolveNumberTrace({
        gameApi,
        state,
        targetEntityId: heroEntityId,
        propertyPath: 'attackHealOnAttack',
        baseValue: passiveAttackHealBase,
        clampMin: 0,
      })
    : null

  if (passiveAttackHealTrace) {
    heroPassiveEffect.shortText = `Your attacks restore ${formatLayeredValue(passiveAttackHealTrace.base, passiveAttackHealTrace.delta)} HP (if not dodged).`
    heroPassiveEffect.detailLines = [
      'Global hero passive effect.',
      numberTraceToDetailLine('Attack heal amount', passiveAttackHealTrace),
    ]
  }

  const auraPassiveEffects = buildAuraPassiveEffects(auraGroups)

  const groupedModifiers = state.activeModifiers
    .filter((modifier) => modifier.targetEntityId === heroEntityId || contributionSourceIds.has(modifier.id))
    .reduce(
      (map, modifier) => {
        const key = `${modifier.label}:${modifier.sourceEntityId ?? 'none'}`
        const sourceEntity = modifier.sourceEntityId ? state.entitiesById[modifier.sourceEntityId] : null
        const sourceCardName =
          sourceEntity && sourceEntity.kind !== 'hero'
            ? cardsById[sourceEntity.definitionCardId]?.name ?? sourceEntity.definitionCardId
            : null
        const sourceLabel = sourceEntity?.kind === 'hero' ? 'Your hero' : sourceCardName ?? sourceEntity?.entityId ?? 'Unknown source'
        const operationText = summarizeNumericOperation(
          modifier.operation,
          modifier.value,
          modifier.propertyPath,
        )

        const existing = map[key]
        if (existing) {
          existing.operations.push(operationText)
          existing.stackCount += 1
          return map
        }

        map[key] = {
          effectId: `modifier:${key}`,
          sourceKind: 'modifier' as const,
          label: modifier.label,
          iconId:
            modifier.propertyPath in STAT_METADATA
              ? STAT_METADATA[modifier.propertyPath as StatKey].iconId
              : 'game-icons:upgrade',
          paletteKey: sourceEntity?.kind === 'totem' ? ('totem' as const) : ('buff' as const),
          priority: 700,
          stackCount: 1,
          statusLabel: describeLifetime(modifier.lifetime),
          statusTone: modifier.lifetime === 'untilEndOfTurn' ? ('pending' as const) : ('active' as const),
          shortText: operationText,
          detailLines: [
            `Target: Your hero`,
            `Source: ${sourceLabel}`,
            `Lifetime: ${describeLifetime(modifier.lifetime)}`,
          ],
          operations: [operationText],
        }
        return map
      },
      {} as Record<
        string,
        HeroPassiveEffect & {
          operations: string[]
        }
      >,
    )

  const modifierPassiveEffects = Object.values(groupedModifiers).map((entry) => ({
    ...entry,
    shortText:
      entry.operations.length > 1
        ? entry.operations.join(', ')
        : entry.operations[0] ?? entry.shortText,
    detailLines: [...entry.detailLines, `Operations: ${entry.operations.join(', ')}`],
  }))

  const passiveRuleEffects = state.activePassiveRules
    .filter((rule) => {
      if (contributionSourceIds.has(rule.id)) {
        return true
      }

      if (rule.source.kind !== 'sourceEntity') {
        return false
      }

      const sourceEntity = state.entitiesById[rule.source.sourceEntityId]
      if (!sourceEntity || sourceEntity.kind === 'hero') {
        return false
      }

      return sourceEntity.ownerHeroEntityId === heroEntityId
    })
    .map((rule) => {
      const sourceEntity = rule.source.kind === 'sourceEntity' ? state.entitiesById[rule.source.sourceEntityId] : null
      const sourceCardName =
        sourceEntity && sourceEntity.kind !== 'hero'
          ? cardsById[sourceEntity.definitionCardId]?.name ?? sourceEntity.definitionCardId
          : null
      const operationSummary = rule.operations
        .map((operation) => {
          if (operation.valueFromSourceStat) {
            const propertyLabel = formatPropertyPathLabel(operation.propertyPath)
            const sourceStatLabel = formatPropertyPathLabel(operation.valueFromSourceStat)
            return `${propertyLabel} = ${sourceStatLabel}`
          }
          return summarizeNumericOperation(operation.operation, operation.value ?? 0, operation.propertyPath)
        })
        .join(', ')

      return {
        effectId: `rule:${rule.id}`,
        sourceKind: 'passiveRule' as const,
        label: rule.label,
        iconId: sourceEntity?.kind === 'totem' ? 'game-icons:obelisk' : 'game-icons:surrounded-shield',
        paletteKey: sourceEntity?.kind === 'totem' ? ('totem' as const) : ('buff' as const),
        priority: sourceEntity?.kind === 'totem' ? 850 : 650,
        stackCount: 1,
        statusLabel: describeLifetime(rule.lifetime),
        statusTone: 'active' as const,
        shortText: operationSummary,
        detailLines: [
          `Source: ${sourceCardName ?? sourceEntity?.entityId ?? 'Unknown source'}`,
          `Target selector: ${rule.targetSelector}`,
          `Lifetime: ${describeLifetime(rule.lifetime)}`,
        ],
      }
    })

  const listenerEffects = state.activeListeners
    .filter((listener) => listener.ownerHeroEntityId === heroEntityId)
    .filter((listener) => !isHeroPassiveListener(listener.listenerId))
    .map((listener) => ({
      effectId: `listener:${listener.listenerId}`,
      sourceKind: 'listener' as const,
      label: formatListenerLabel(listener.listenerId),
      iconId: 'game-icons:sands-of-time',
      paletteKey: 'timed' as const,
      priority: 500,
      stackCount: 1,
      statusLabel: describeLifetime(listener.lifetime),
      statusTone: 'pending' as const,
      shortText: `Triggers on ${prettifyEventOrConditionKind(listener.eventKind)}`,
      detailLines: [
        `Owner: ${listener.ownerHeroEntityId === heroEntityId ? 'Your hero' : listener.ownerHeroEntityId}`,
        `Event: ${prettifyEventOrConditionKind(listener.eventKind)}`,
        `Conditions: ${
          listener.conditions.length > 0
            ? listener.conditions.map((condition) => prettifyEventOrConditionKind(condition.kind)).join(', ')
            : 'None'
        }`,
        `Queued effects: ${listener.effects.length}`,
      ],
    }))

  return {
    passiveText: passiveAttackHealTrace
      ? `Your attacks restore ${formatLayeredValue(passiveAttackHealTrace.base, passiveAttackHealTrace.delta)} HP (if not dodged).`
      : heroDef.passiveText,
    activePassiveEffects: [
      heroPassiveEffect,
      ...auraPassiveEffects,
      ...passiveRuleEffects,
      ...modifierPassiveEffects,
      ...listenerEffects,
    ],
  }
}
