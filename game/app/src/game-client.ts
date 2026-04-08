import { createGameApi } from '../../index.ts'
import {
  LUCK_CRIT_CHANCE_PER_POINT,
  LUCK_DODGE_CHANCE_PER_POINT,
  LUCK_STEP_RATIO,
} from '../../shared/game-constants.ts'
import type { BattleEvent, NumberExplanation } from '../../shared/models'
import { luckBiasForHero } from '../../engine/core/luck.ts'
import {
  DEFAULT_GAME_BOOTSTRAP_CONFIG,
  type GameBootstrapConfig,
  type HeroBootstrapConfig,
} from './data/game-bootstrap.ts'

export type AppNumberContributionPreview = {
  sourceId: string
  label: string
  delta: number
}

export type AppNumberTrace = {
  base: number
  effective: number
  delta: number
  contributions: AppNumberContributionPreview[]
}

const STAT_METADATA = {
  attackDamage: { label: 'attack damage', shortLabel: 'AD', iconId: 'game-icons:broadsword' },
  attackFlatBonusDamage: { label: 'flat attack bonus', shortLabel: 'ATK+', iconId: 'game-icons:crossed-swords' },
  abilityPower: { label: 'ability power', shortLabel: 'AP', iconId: 'game-icons:magic-swirl' },
  armor: { label: 'armor', shortLabel: 'AR', iconId: 'game-icons:checked-shield' },
  magicResist: { label: 'magic resist', shortLabel: 'MR', iconId: 'game-icons:shield-reflect' },
} as const

type StatKey = keyof typeof STAT_METADATA

export type AppBattlePreview = {
  battleId: string
  seed: string
  heroEntityIds: [string, string]
  activeHeroEntityId: string
  turn: {
    turnNumber: number
    pressLuckUsedThisTurn: boolean
  }
  luck: {
    anchorHeroEntityId: string
    balance: number
  }
  heroHandCounts: Array<{
    heroEntityId: string
    handSize: number
    deckSize: number
    battlefieldSide: 'north' | 'south'
    movePoints: number
    maxMovePoints: number
  }>
  heroDetailsByEntityId: Record<
    string,
    {
      heroEntityId: string
      heroDefinitionId: string
      heroName: string
      passiveText: string
      activePassiveEffects: Array<{
        effectId: string
        sourceKind: 'heroPassive' | 'aura' | 'modifier' | 'passiveRule' | 'listener'
        label: string
        iconId: string
        paletteKey: 'hero' | 'aura' | 'totem' | 'buff' | 'timed' | 'system'
        priority: number
        stackCount: number
        statusLabel: string
        statusTone: 'active' | 'pending' | 'info'
        shortText: string
        detailLines: string[]
      }>
      basicAttack: {
        moveCost: number
        damageType: 'physical' | 'magic' | 'true'
        minimumDamage: number
        maximumDamage: number
        attackDamageScaling: number
        abilityPowerScaling: number
        minimumTrace: AppNumberTrace
        maximumTrace: AppNumberTrace
        attackDamageTrace: AppNumberTrace
        attackFlatBonusDamageTrace: AppNumberTrace
        abilityPowerTrace: AppNumberTrace
        summaryText: string
        summaryDetailText: string | null
        summaryTone: 'neutral' | 'positive' | 'negative'
        currentRangeText: string
      }
    }
  >
  heroHands: Array<{
    heroEntityId: string
    cards: Array<{
      handCardId: string
      cardDefinitionId: string
      cardName: string
      moveCost: number
      cardType: 'ability' | 'weapon' | 'totem' | 'companion'
      rarity: 'common' | 'rare' | 'ultimate' | 'general'
      keywords: Array<{
        keywordId: string
        keywordName: string
        keywordSummaryText: string
      }>
      summaryText: string
      summaryDetailText: string | null
      summaryTone: 'neutral' | 'positive' | 'negative'
      castConditionText: string | null
      isPlayable: boolean
      targeting: 'none' | 'selectedAny' | 'selectedAnyExceptEnemyHero' | 'selectedEnemy' | 'selectedAlly'
      validTargetEntityIds: string[]
      validPlacementPositions: Array<{ row: number; column: number }>
      summonPreview: {
        entityDefinitionId: string
        entityKind: 'weapon' | 'totem' | 'companion'
        displayName: string
        cardType: 'weapon' | 'totem' | 'companion'
        rarity: 'common' | 'rare' | 'ultimate' | 'general'
        maxHealth: number
        armor: number
        magicResist: number
        attackDamage: number
        abilityPower: number
        maxMovesPerTurn: number
        passiveSummaryText: string | null
        passiveSummaryDetailText: string | null
        activeAbilitySummaryText: string | null
        activeAbilitySummaryDetailText: string | null
      } | null
    }>
  }>
  heroActionTargets: Array<{
    heroEntityId: string
    basicAttack: {
      attackerEntityId: string
      moveCost: number
      validTargetEntityIds: string[]
    }
    pressLuck: {
      moveCost: number
    }
    entityActive: Array<{
      sourceEntityId: string
      validTargetEntityIds: string[]
    }>
  }>
  battlefield: {
    rows: number
    columns: number
    cells: Array<{
      row: number
      column: number
      occupantKind: 'hero' | 'weapon' | 'totem' | 'companion' | null
      ownerHeroEntityId: string | null
      entityId: string | null
    }>
    entitiesById: Record<
      string,
      {
        entityId: string
        kind: 'hero' | 'weapon' | 'totem' | 'companion'
        ownerHeroEntityId: string
        displayName: string
        sourceCardName: string | null
        sourceCardSummary: string | null
        sourceCardSummaryDetailText: string | null
        sourceCardSummaryTone: 'neutral' | 'positive' | 'negative'
        currentHealth: number
        maxHealth: number
        armor: number
        magicResist: number
        attackDamage: number
        abilityPower: number
        combatNumbers: {
          armor: AppNumberTrace
          magicResist: AppNumberTrace
          attackDamage: AppNumberTrace
          attackFlatBonusDamage: AppNumberTrace
          abilityPower: AppNumberTrace
          dodgeChance: AppNumberTrace
        }
        criticalChance: number
        effectiveCriticalChance: number
        criticalChanceLuckDelta: number
        criticalMultiplier: number
        dodgeChance: number
        effectiveDodgeChance: number
        dodgeChanceLuckDelta: number
        movePoints: number
        maxMovePoints: number
        activeAbility?: {
          moveCost: number
          damageType: 'physical' | 'magic' | 'true'
          canBeDodged: boolean
          summaryText: string
          summaryDetailText: string | null
          summaryTone: 'neutral' | 'positive' | 'negative'
          currentRangeText: string
        }
      }
    >
  }
}

function formatPreviewNumber(value: number): string {
  const rounded = Math.round(value * 100) / 100
  return Number.isInteger(rounded) ? `${rounded}` : `${rounded}`
}

function formatSignedDelta(value: number): string {
  const formatted = formatPreviewNumber(Math.abs(value))
  return `${value >= 0 ? '+' : '-'}${formatted}`
}

function renderTemplatedText(displayText?: {
  template?: string
  params?: Record<string, string | number | boolean | undefined>
}): string | null {
  if (!displayText?.template) {
    return null
  }

  return displayText.template.replaceAll(/\{([a-zA-Z0-9_]+)\}/g, (match, key) => {
    const value = displayText.params?.[key]
    return value === undefined ? match : String(value)
  })
}

function formatKeywordLabel(name: string, params?: Record<string, string | number | boolean | undefined>): string {
  const values = params
    ? Object.values(params).filter((value) => value !== undefined).map((value) => String(value))
    : []

  if (values.length === 0) {
    return name
  }

  return `${name} (${values.join(', ')})`
}

function labelForAuraKind(auraKind: string): string {
  switch (auraKind) {
    case 'reactiveBulwarkResistance':
      return 'Reactive Bulwark'
    default:
      return auraKind
  }
}

function iconForAuraKind(auraKind: string): string {
  switch (auraKind) {
    case 'reactiveBulwarkResistance':
      return 'game-icons:shield-echoes'
    default:
      return 'game-icons:checked-shield'
  }
}

function formatPropertyPathLabel(propertyPath: string): string {
  if (propertyPath in STAT_METADATA) {
    const stat = STAT_METADATA[propertyPath as keyof typeof STAT_METADATA]
    return stat.shortLabel
  }

  return propertyPath
}

function summarizeNumericOperation(operation: 'add' | 'subtract' | 'set', value: number, propertyPath: string): string {
  const propertyLabel = formatPropertyPathLabel(propertyPath)
  if (operation === 'set') {
    return `${propertyLabel} = ${formatPreviewNumber(value)}`
  }

  const signed = operation === 'add' ? value : -value
  return `${signed >= 0 ? '+' : '-'}${formatPreviewNumber(Math.abs(signed))} ${propertyLabel}`
}

function describeLifetime(lifetime: string): string {
  switch (lifetime) {
    case 'untilEndOfTurn':
      return 'Until end of turn'
    case 'untilSourceRemoved':
      return 'While source remains'
    case 'once':
      return 'One-time trigger'
    case 'persistent':
      return 'Persistent'
    default:
      return lifetime
  }
}

function titleCaseWords(input: string): string {
  return input
    .split(' ')
    .filter((part) => part.length > 0)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function prettifyEventOrConditionKind(value: string): string {
  return titleCaseWords(value.replace(/([a-z0-9])([A-Z])/g, '$1 $2'))
}

function formatListenerLabel(listenerId: string): string {
  const normalized = listenerId
    .replace(/^listener\./, '')
    .replace(/^[a-z0-9-]+:passive:/i, 'passive:')
    .replace(/[._:-]+/g, ' ')
    .trim()

  if (!normalized) {
    return 'Timed Passive'
  }

  return titleCaseWords(normalized)
}

function isHeroPassiveListener(listenerId: string): boolean {
  return listenerId.includes(':passive:') || listenerId.includes('.passive.')
}

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

function numberTraceToDetailLine(label: string, trace: AppNumberTrace): string {
  const head = `${label}: ${formatPreviewNumber(trace.base)} -> ${formatPreviewNumber(trace.effective)}`
  if (trace.delta === 0 || trace.contributions.length === 0) {
    return `${head} (no modifiers)`
  }

  const contributionText = trace.contributions
    .map((contribution) => `${contribution.label} ${formatSignedDelta(contribution.delta)}`)
    .join(', ')

  return `${head} (${formatSignedDelta(trace.delta)}: ${contributionText})`
}

function resolveNumberTrace(options: {
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

function makeStaticNumberTrace(value: number): AppNumberTrace {
  return {
    base: value,
    effective: value,
    delta: 0,
    contributions: [],
  }
}

function combineNumberTraces(...traces: AppNumberTrace[]): AppNumberTrace {
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

function summarizeLuckAdjustedRange(options: {
  minimum: number
  maximum: number
  luckBalance: number
  rollingHeroEntityId: string
  anchorHeroEntityId: string
}): { minimum: number; maximum: number; shift: number; bias: number } {
  const { minimum, maximum, luckBalance, rollingHeroEntityId, anchorHeroEntityId } = options
  if (maximum <= minimum) {
    return { minimum, maximum, shift: 0, bias: 0 }
  }

  const bias = luckBiasForHero({ anchorHeroEntityId, balance: luckBalance }, rollingHeroEntityId)
  const luckPercent = clamp(bias * LUCK_STEP_RATIO, -1, 1)
  if (luckPercent === 0) {
    return { minimum, maximum, shift: 0, bias }
  }

  const adjustedMinimum =
    luckPercent > 0 ? minimum + (maximum - minimum) * luckPercent : minimum
  const adjustedMaximum =
    luckPercent > 0 ? maximum : maximum - (maximum - minimum) * Math.abs(luckPercent)
  const shift = luckPercent > 0 ? adjustedMinimum - minimum : adjustedMaximum - maximum

  return {
    minimum: clamp(adjustedMinimum, minimum, maximum),
    maximum: clamp(adjustedMaximum, minimum, maximum),
    shift,
    bias,
  }
}

function describeNumericCardText(options: {
  card: {
    name: string
    summaryText?: {
      template?: string
      params?: Record<string, string | number | boolean | undefined>
    }
    effects: Array<{
      payload: { kind: string } & Record<string, unknown>
      displayText: {
        template?: string
        params?: Record<string, string | number | boolean | undefined>
      }
    }>
  }
  actorHero: {
    entityId: string
    attackDamage: number
    abilityPower: number
    armor: number
  }
  actorNumberTraces?: {
    attackDamage: AppNumberTrace
    abilityPower: AppNumberTrace
    armor: AppNumberTrace
  }
  state?: BattleState
  gameApi?: ReturnType<typeof createGameApi>
  sourceEntityId?: string
  viewMode?: 'card' | 'entity'
  luck: {
    anchorHeroEntityId: string
    balance: number
  }
}): {
  summaryText: string
  summaryDetailText: string | null
  summaryTone: 'neutral' | 'positive' | 'negative'
} {
  const { card, actorHero, actorNumberTraces, state, gameApi, sourceEntityId, viewMode = 'card', luck } = options
  const firstEffect = card.effects[0]

  const cardSummaryText = renderTemplatedText(card.summaryText)
  const firstEffectSummaryText = renderTemplatedText(firstEffect?.displayText)
  const defaultSummary = cardSummaryText ?? firstEffectSummaryText ?? 'No summary.'

  if (!firstEffect) {
    return {
      summaryText: defaultSummary,
      summaryDetailText: null,
      summaryTone: 'neutral',
    }
  }

  const payload = firstEffect.payload

  if (payload.kind === 'dealDamage') {
    const damagePayload = payload as {
      kind: 'dealDamage'
      minimum: number
      maximum: number
      attackDamageScaling: number
      abilityPowerScaling: number
      armorScaling: number
      damageType: 'physical' | 'magic' | 'true'
    }

    const attackDamageValue = actorNumberTraces?.attackDamage.effective ?? actorHero.attackDamage
    const abilityPowerValue = actorNumberTraces?.abilityPower.effective ?? actorHero.abilityPower
    const armorValue = actorNumberTraces?.armor.effective ?? actorHero.armor
    const attackFlatBonusDamageTrace =
      gameApi && state
        ? resolveNumberTrace({
            gameApi,
            state,
            targetEntityId: sourceEntityId ?? actorHero.entityId,
            propertyPath: 'attackFlatBonusDamage',
            baseValue: 0,
            clampMin: 0,
          })
        : makeStaticNumberTrace(0)
    const minimumTrace =
      gameApi && state
        ? resolveNumberTrace({
            gameApi,
            state,
            targetEntityId: sourceEntityId ?? actorHero.entityId,
            propertyPath: 'dealDamage.minimum',
            baseValue: damagePayload.minimum,
            clampMin: 0,
          })
        : null
    const maximumTrace =
      gameApi && state
        ? resolveNumberTrace({
            gameApi,
            state,
            targetEntityId: sourceEntityId ?? actorHero.entityId,
            propertyPath: 'dealDamage.maximum',
            baseValue: damagePayload.maximum,
            clampMin: 0,
          })
        : null
    const effectiveMinimumBase = minimumTrace?.effective ?? damagePayload.minimum
    const effectiveMaximumBase = maximumTrace?.effective ?? damagePayload.maximum
    const minimum = effectiveMinimumBase + attackDamageValue * damagePayload.attackDamageScaling + abilityPowerValue * damagePayload.abilityPowerScaling + armorValue * damagePayload.armorScaling
    const maximum = effectiveMaximumBase + attackDamageValue * damagePayload.attackDamageScaling + abilityPowerValue * damagePayload.abilityPowerScaling + armorValue * damagePayload.armorScaling
    const adjusted = summarizeLuckAdjustedRange({
      minimum,
      maximum,
      luckBalance: luck.balance,
      rollingHeroEntityId: actorHero.entityId,
      anchorHeroEntityId: luck.anchorHeroEntityId,
    })

    const flatBonusText =
      attackFlatBonusDamageTrace.effective !== 0
        ? ` + ${formatPreviewNumber(attackFlatBonusDamageTrace.effective)} flat attack bonus on hit`
        : ''

    const damageLabel = damagePayload.damageType === 'physical' ? 'physical damage' : damagePayload.damageType === 'magic' ? 'magic damage' : 'true damage'
    const summaryText = adjusted.minimum === adjusted.maximum
      ? `Deal ${formatPreviewNumber(adjusted.minimum)} ${damageLabel}${flatBonusText}.`
      : `Deal ${formatPreviewNumber(adjusted.minimum)}-${formatPreviewNumber(adjusted.maximum)} ${damageLabel}${flatBonusText}.`

    const detailParts = [
      `${formatPreviewNumber(effectiveMinimumBase)}-${formatPreviewNumber(effectiveMaximumBase)} base`,
      damagePayload.attackDamageScaling > 0 ? `${formatPreviewNumber(damagePayload.attackDamageScaling * 100)}% AD` : null,
      damagePayload.abilityPowerScaling > 0 ? `${formatPreviewNumber(damagePayload.abilityPowerScaling * 100)}% AP` : null,
      damagePayload.armorScaling > 0 ? `${formatPreviewNumber(damagePayload.armorScaling * 100)}% armor` : null,
      attackFlatBonusDamageTrace.effective !== 0 ? `+${formatPreviewNumber(attackFlatBonusDamageTrace.effective)} flat attack bonus` : null,
      adjusted.shift !== 0 ? `Luck shift ${formatSignedDelta(adjusted.shift)} (${adjusted.bias >= 0 ? 'favored' : 'unfavored'})` : 'No luck shift',
    ].filter((part): part is string => !!part)

    const detailLines = [
      minimumTrace ? numberTraceToDetailLine('Damage min base', minimumTrace) : null,
      maximumTrace ? numberTraceToDetailLine('Damage max base', maximumTrace) : null,
      actorNumberTraces ? numberTraceToDetailLine('AD used', actorNumberTraces.attackDamage) : null,
      actorNumberTraces ? numberTraceToDetailLine('AP used', actorNumberTraces.abilityPower) : null,
      actorNumberTraces && damagePayload.armorScaling > 0
        ? numberTraceToDetailLine('Armor used', actorNumberTraces.armor)
        : null,
      attackFlatBonusDamageTrace.effective !== 0
        ? numberTraceToDetailLine('Flat attack bonus', attackFlatBonusDamageTrace)
        : null,
    ].filter((line): line is string => !!line)

    return {
      summaryText,
      summaryDetailText: `${detailLines.length > 0 ? `${detailLines.join('\n')}\n` : ''}Formula: ${detailParts.join(' + ')}.`,
      summaryTone:
        adjusted.minimum > minimum || adjusted.maximum > maximum
          ? 'positive'
          : adjusted.minimum < minimum || adjusted.maximum < maximum
            ? 'negative'
            : 'neutral',
    }
  }

  if (payload.kind === 'destroyArmorAndDealPerArmorToEnemyHero' || payload.kind === 'destroySelfArmorAndDealPerArmorToTarget') {
    const armorDamagePayload = payload as {
      kind: 'destroyArmorAndDealPerArmorToEnemyHero' | 'destroySelfArmorAndDealPerArmorToTarget'
      damagePerArmor: number
    }
    const attackFlatBonusDamageTrace =
      gameApi && state
        ? resolveNumberTrace({
            gameApi,
            state,
            targetEntityId: sourceEntityId ?? actorHero.entityId,
            propertyPath: 'attackFlatBonusDamage',
            baseValue: 0,
            clampMin: 0,
          })
        : makeStaticNumberTrace(0)
    const flatBonusText =
      attackFlatBonusDamageTrace.effective !== 0
        ? ` + ${formatPreviewNumber(attackFlatBonusDamageTrace.effective)} flat attack bonus on hit`
        : ''
    const summaryText = `Destroy base and permanent armor on target, then deal ${formatPreviewNumber(armorDamagePayload.damagePerArmor)} physical damage per armor destroyed${flatBonusText}.`
    const detailLines = [
      `Damage per armor: ${formatPreviewNumber(armorDamagePayload.damagePerArmor)}`,
      attackFlatBonusDamageTrace.effective !== 0
        ? numberTraceToDetailLine('Flat attack bonus', attackFlatBonusDamageTrace)
        : null,
    ].filter((line): line is string => !!line)

    return {
      summaryText,
      summaryDetailText: detailLines.join('\n'),
      summaryTone: 'neutral',
    }
  }

  if (payload.kind === 'heal') {
    const healPayload = payload as {
      kind: 'heal'
      minimum: number
      maximum: number
    }

    const minimumTrace =
      gameApi && state
        ? resolveNumberTrace({
            gameApi,
            state,
            targetEntityId: sourceEntityId ?? actorHero.entityId,
            propertyPath: 'heal.minimum',
            baseValue: healPayload.minimum,
            clampMin: 0,
          })
        : null
    const maximumTrace =
      gameApi && state
        ? resolveNumberTrace({
            gameApi,
            state,
            targetEntityId: sourceEntityId ?? actorHero.entityId,
            propertyPath: 'heal.maximum',
            baseValue: healPayload.maximum,
            clampMin: 0,
          })
        : null
    const effectiveMinimum = minimumTrace?.effective ?? healPayload.minimum
    const effectiveMaximum = maximumTrace?.effective ?? healPayload.maximum

    const summaryText = effectiveMinimum === effectiveMaximum
      ? `Restore ${formatPreviewNumber(effectiveMinimum)} HP to your hero.`
      : `Restore ${formatPreviewNumber(effectiveMinimum)}-${formatPreviewNumber(effectiveMaximum)} HP to your hero.`

    const detailLines = [
      minimumTrace ? numberTraceToDetailLine('Heal min base', minimumTrace) : null,
      maximumTrace ? numberTraceToDetailLine('Heal max base', maximumTrace) : null,
    ].filter((line): line is string => !!line)

    return {
      summaryText,
      summaryDetailText: `${detailLines.length > 0 ? `${detailLines.join('\n')}\n` : ''}Heals from ${formatPreviewNumber(effectiveMinimum)} to ${formatPreviewNumber(effectiveMaximum)} HP.`,
      summaryTone: 'positive',
    }
  }

  if (payload.kind === 'modifyStat') {
    const statPayload = payload as {
      kind: 'modifyStat'
      stat: StatKey
      amount: number
      target: string
      duration?: 'persistent' | 'untilSourceRemoved'
      changeKind?: 'apply' | 'removeMatching'
      sourceBinding?: 'effectSource' | 'lastSummonedEntity'
    }
    const statMeta = STAT_METADATA[statPayload.stat]
    const changeKind = statPayload.changeKind ?? 'apply'
    const sign = statPayload.amount >= 0 ? '+' : '-'
    const amount = Math.abs(statPayload.amount)
    const verb = changeKind === 'removeMatching' ? 'Remove' : statPayload.amount >= 0 ? 'Gain' : 'Lose'
    const durationText =
      statPayload.duration === 'untilSourceRemoved'
        ? ' Lasts while the source remains present.'
        : ''
    return {
      summaryText:
        cardSummaryText ?? `${verb} ${changeKind === 'removeMatching' ? '' : sign}${amount} ${statMeta.label}.`,
      summaryDetailText: `${firstEffectSummaryText ? `${firstEffectSummaryText}\n` : ''}Target: ${String(statPayload.target)}.${durationText}`,
      summaryTone:
        changeKind === 'removeMatching'
          ? 'neutral'
          : statPayload.amount > 0
            ? 'positive'
            : statPayload.amount < 0
              ? 'negative'
              : 'neutral',
    }
  }

  if (payload.kind === 'drawCards') {
    const drawPayload = payload as {
      kind: 'drawCards'
      amount: number
      target: string
    }
    const drawTrace =
      gameApi && state
        ? resolveNumberTrace({
            gameApi,
            state,
            targetEntityId: sourceEntityId ?? actorHero.entityId,
            propertyPath: 'drawCards.amount',
            baseValue: drawPayload.amount,
            clampMin: 0,
          })
        : null
    const effectiveAmount = drawTrace?.effective ?? drawPayload.amount

    return {
      summaryText: `Draw ${effectiveAmount} card${effectiveAmount === 1 ? '' : 's'}.`,
      summaryDetailText: `${drawTrace ? `${numberTraceToDetailLine('Draw amount', drawTrace)}\n` : ''}Target: ${String(drawPayload.target)}.`,
      summaryTone: 'positive',
    }
  }

  if (payload.kind === 'summonEntity') {
    const summonSummary = firstEffectSummaryText ?? cardSummaryText ?? defaultSummary
    const postSummonEffectText = card.effects
      .slice(1)
      .map((effect) => renderTemplatedText(effect.displayText))
      .find((line): line is string => !!line)

    if (viewMode === 'entity') {
      return {
          summaryText: postSummonEffectText ?? '',
        summaryDetailText: null,
        summaryTone: 'neutral',
      }
    }

    return {
      summaryText: summonSummary,
      summaryDetailText: null,
      summaryTone: 'neutral',
    }
  }

  return {
    summaryText: defaultSummary,
    summaryDetailText: null,
    summaryTone: 'neutral',
  }
}

function buildHeroBasicAttackSummary(options: {
  heroName: string
  rollingHeroEntityId: string
  attack: {
    minimumDamage: number
    maximumDamage: number
    attackDamageScaling: number
    abilityPowerScaling: number
    damageType: 'physical' | 'magic' | 'true'
  }
  minimumTrace: AppNumberTrace
  maximumTrace: AppNumberTrace
  attackDamageTrace: AppNumberTrace
  attackFlatBonusDamageTrace: AppNumberTrace
  abilityPowerTrace: AppNumberTrace
  luck: {
    anchorHeroEntityId: string
    balance: number
  }
}): {
  minimumTrace: AppNumberTrace
  maximumTrace: AppNumberTrace
  attackDamageTrace: AppNumberTrace
  attackFlatBonusDamageTrace: AppNumberTrace
  abilityPowerTrace: AppNumberTrace
  summaryText: string
  summaryDetailText: string
  summaryTone: 'neutral' | 'positive' | 'negative'
  currentRangeText: string
} {
  const {
    heroName,
    rollingHeroEntityId,
    attack,
    minimumTrace,
    maximumTrace,
    attackDamageTrace,
    attackFlatBonusDamageTrace,
    abilityPowerTrace,
    luck,
  } = options
  const scalingParts = [
    attack.attackDamageScaling > 0
      ? `${formatPreviewNumber(attack.attackDamageScaling * 100)}% of current attack damage`
      : null,
    attack.abilityPowerScaling > 0
      ? `${formatPreviewNumber(attack.abilityPowerScaling * 100)}% of current ability power`
      : null,
  ].filter((part): part is string => !!part)

  const summaryText =
    scalingParts.length > 0
      ? `Base ${formatPreviewNumber(attack.minimumDamage)} to ${formatPreviewNumber(attack.maximumDamage)} ${attack.damageType} damage + ${scalingParts.join(' + ')}.`
      : `Base ${formatPreviewNumber(attack.minimumDamage)} to ${formatPreviewNumber(attack.maximumDamage)} ${attack.damageType} damage.`

  const minimum =
    minimumTrace.effective +
    attackDamageTrace.effective * attack.attackDamageScaling +
    abilityPowerTrace.effective * attack.abilityPowerScaling
  const maximum =
    maximumTrace.effective +
    attackDamageTrace.effective * attack.attackDamageScaling +
    abilityPowerTrace.effective * attack.abilityPowerScaling

  const adjusted = summarizeLuckAdjustedRange({
    minimum,
    maximum,
    luckBalance: luck.balance,
    rollingHeroEntityId,
    anchorHeroEntityId: luck.anchorHeroEntityId,
  })

  const detailRows = [
    numberTraceToDetailLine('AD used', attackDamageTrace),
    numberTraceToDetailLine('AP used', abilityPowerTrace),
    numberTraceToDetailLine('Flat attack bonus', attackFlatBonusDamageTrace),
  ]

  const flatBonusText =
    attackFlatBonusDamageTrace.effective !== 0
      ? ` + ${formatPreviewNumber(attackFlatBonusDamageTrace.effective)} flat attack bonus on hit`
      : ''

  return {
    minimumTrace,
    maximumTrace,
    attackDamageTrace,
    attackFlatBonusDamageTrace,
    abilityPowerTrace,
    summaryText:
      adjusted.minimum === adjusted.maximum
        ? `${heroName} basic attack deals ${formatPreviewNumber(adjusted.minimum)} ${attack.damageType} damage${flatBonusText}.`
        : `${heroName} basic attack deals ${formatPreviewNumber(adjusted.minimum)}-${formatPreviewNumber(adjusted.maximum)} ${attack.damageType} damage${flatBonusText}.`,
    summaryDetailText: `${summaryText}\nCurrent pre-luck range: ${formatPreviewNumber(minimum)} to ${formatPreviewNumber(maximum)}.\nLuck shift: ${adjusted.shift !== 0 ? formatSignedDelta(adjusted.shift) : 'none'}.${attackFlatBonusDamageTrace.effective !== 0 ? `\nFlat attack bonus is added after resistance: +${formatPreviewNumber(attackFlatBonusDamageTrace.effective)}.` : ''}${detailRows.length > 0 ? `\n${detailRows.join('\n')}` : ''}`,
    summaryTone:
      adjusted.minimum > minimum || adjusted.maximum > maximum
        ? 'positive'
        : adjusted.minimum < minimum || adjusted.maximum < maximum
          ? 'negative'
          : 'neutral',
    currentRangeText: `Current range: ${formatPreviewNumber(adjusted.minimum)} to ${formatPreviewNumber(adjusted.maximum)} ${attack.damageType} damage before dodge and resistance.`,
  }
}

function buildEntityActiveSummary(options: {
  rollingHeroEntityId: string
  attack: {
    minimumDamage: number
    maximumDamage: number
    attackDamageScaling: number
    abilityPowerScaling: number
    damageType: 'physical' | 'magic' | 'true'
    moveCost: number
    canBeDodged: boolean
  }
  minimumTrace: AppNumberTrace
  maximumTrace: AppNumberTrace
  attackDamageTrace: AppNumberTrace
  attackFlatBonusDamageTrace: AppNumberTrace
  abilityPowerTrace: AppNumberTrace
  luck: {
    anchorHeroEntityId: string
    balance: number
  }
}): {
  moveCost: number
  damageType: 'physical' | 'magic' | 'true'
  canBeDodged: boolean
  summaryText: string
  summaryDetailText: string | null
  summaryTone: 'neutral' | 'positive' | 'negative'
  currentRangeText: string
} {
  const {
    rollingHeroEntityId,
    attack,
    minimumTrace,
    maximumTrace,
    attackDamageTrace,
    attackFlatBonusDamageTrace,
    abilityPowerTrace,
    luck,
  } = options
  const scalingParts = [
    attack.attackDamageScaling > 0
      ? `${formatPreviewNumber(attack.attackDamageScaling * 100)}% AD`
      : null,
    attack.abilityPowerScaling > 0
      ? `${formatPreviewNumber(attack.abilityPowerScaling * 100)}% AP`
      : null,
  ].filter((part): part is string => !!part)

  const summaryText = scalingParts.length > 0
    ? `Base ${formatPreviewNumber(attack.minimumDamage)} to ${formatPreviewNumber(attack.maximumDamage)} ${attack.damageType} + ${scalingParts.join(' + ')}.`
    : `Base ${formatPreviewNumber(attack.minimumDamage)} to ${formatPreviewNumber(attack.maximumDamage)} ${attack.damageType}.`

  const minimum =
    minimumTrace.effective +
    attackDamageTrace.effective * attack.attackDamageScaling +
    abilityPowerTrace.effective * attack.abilityPowerScaling
  const maximum =
    maximumTrace.effective +
    attackDamageTrace.effective * attack.attackDamageScaling +
    abilityPowerTrace.effective * attack.abilityPowerScaling

  const adjusted = summarizeLuckAdjustedRange({
    minimum,
    maximum,
    luckBalance: luck.balance,
    rollingHeroEntityId,
    anchorHeroEntityId: luck.anchorHeroEntityId,
  })

  const detailRows = [
    numberTraceToDetailLine('AD used', attackDamageTrace),
    numberTraceToDetailLine('AP used', abilityPowerTrace),
    numberTraceToDetailLine('Flat attack bonus', attackFlatBonusDamageTrace),
  ]

  const flatBonusText =
    attackFlatBonusDamageTrace.effective !== 0
      ? ` + ${formatPreviewNumber(attackFlatBonusDamageTrace.effective)} flat attack bonus on hit`
      : ''

  return {
    moveCost: attack.moveCost,
    damageType: attack.damageType,
    canBeDodged: attack.canBeDodged,
    summaryText:
      adjusted.minimum === adjusted.maximum
        ? `Deal ${formatPreviewNumber(adjusted.minimum)} ${attack.damageType}${flatBonusText}.`
        : `Deal ${formatPreviewNumber(adjusted.minimum)}-${formatPreviewNumber(adjusted.maximum)} ${attack.damageType}${flatBonusText}.`,
    summaryDetailText: `${summaryText}\nCurrent pre-luck range: ${formatPreviewNumber(minimum)} to ${formatPreviewNumber(maximum)}.\nLuck shift: ${adjusted.shift !== 0 ? formatSignedDelta(adjusted.shift) : 'none'}.${attackFlatBonusDamageTrace.effective !== 0 ? `\nFlat attack bonus is added after resistance: +${formatPreviewNumber(attackFlatBonusDamageTrace.effective)}.` : ''}${detailRows.length > 0 ? `\n${detailRows.join('\n')}` : ''}`,
    summaryTone:
      adjusted.minimum > minimum || adjusted.maximum > maximum
        ? 'positive'
        : adjusted.minimum < minimum || adjusted.maximum < maximum
          ? 'negative'
          : 'neutral',
    currentRangeText: `Current range: ${formatPreviewNumber(adjusted.minimum)} to ${formatPreviewNumber(adjusted.maximum)} ${attack.damageType} before resistance${attack.canBeDodged ? ' and dodge' : ''}.`,
  }
}

function describeCardCastCondition(cardDefinition: unknown): string | null {
  if (!cardDefinition || typeof cardDefinition !== 'object' || !('castCondition' in cardDefinition)) {
    return null
  }

  const castCondition = (cardDefinition as { castCondition?: unknown }).castCondition
  if (!castCondition || typeof castCondition !== 'object' || !('kind' in castCondition)) {
    return null
  }

  if (castCondition.kind !== 'heroHealthBelow') {
    return null
  }

  const threshold = (castCondition as { threshold?: unknown }).threshold
  if (typeof threshold !== 'number') {
    return null
  }

  switch (castCondition.kind) {
    case 'heroHealthBelow':
      return `Only playable when your hero is below ${threshold} HP.`
    default:
      return null
  }
}

function resolveSummonPreviewForCard(options: {
  cardDef: {
    effects: Array<{
      payload: {
        kind: string
      } & Record<string, unknown>
    }>
  }
  gameApi: ReturnType<typeof createGameApi>
  cardsById: Record<string, (ReturnType<typeof createGameApi>['cardsById'])[keyof ReturnType<typeof createGameApi>['cardsById']]>
  ownerHeroEntityId: string
  state: ReturnType<ReturnType<typeof createGameApi>['createBattle']>['state']
  luck: {
    anchorHeroEntityId: string
    balance: number
  }
}): AppBattlePreview['heroHands'][number]['cards'][number]['summonPreview'] {
  const { cardDef, gameApi, cardsById, ownerHeroEntityId, state, luck } = options
  const summonPayload = cardDef.effects
    .map((effect) => effect.payload)
    .find(
      (payload): payload is { kind: 'summonEntity'; entityDefinitionId: string; entityKind: 'weapon' | 'totem' | 'companion' } =>
        payload.kind === 'summonEntity' &&
        typeof payload.entityDefinitionId === 'string' &&
        (payload.entityKind === 'weapon' || payload.entityKind === 'totem' || payload.entityKind === 'companion'),
    )

  if (!summonPayload) {
    return null
  }

  const summonedBlueprint = gameApi.resolveSummonedEntityBlueprint(
    summonPayload.entityDefinitionId,
    summonPayload.entityKind,
  )

  if (!summonedBlueprint) {
    return null
  }

  const sourceCardDef = cardsById[summonedBlueprint.definitionCardId]
  const passiveSummary = sourceCardDef
    ? describeNumericCardText({
        card: sourceCardDef,
        actorHero: {
          entityId: ownerHeroEntityId,
          attackDamage: summonedBlueprint.attackDamage,
          abilityPower: summonedBlueprint.abilityPower,
          armor: summonedBlueprint.armor,
        },
          viewMode: 'entity',
        luck,
      })
    : null

  const activeProfile =
    summonedBlueprint.kind === 'weapon' || summonedBlueprint.kind === 'companion'
      ? gameApi.resolveEntityActiveProfile({
          sourceDefinitionCardId: summonedBlueprint.definitionCardId,
          sourceKind: summonedBlueprint.kind,
        })
      : undefined

  const activeSummary = activeProfile
    ? buildEntityActiveSummary({
        rollingHeroEntityId: ownerHeroEntityId,
        attack: activeProfile,
        minimumTrace: makeStaticNumberTrace(activeProfile.minimumDamage),
        maximumTrace: makeStaticNumberTrace(activeProfile.maximumDamage),
        attackDamageTrace:
          summonedBlueprint.kind === 'weapon'
            ? combineNumberTraces(
                makeStaticNumberTrace(summonedBlueprint.attackDamage),
                resolveNumberTrace({
                  gameApi,
                  state,
                  targetEntityId: ownerHeroEntityId,
                  propertyPath: 'attackDamage',
                  baseValue: state.entitiesById[ownerHeroEntityId]?.kind === 'hero'
                    ? state.entitiesById[ownerHeroEntityId].attackDamage
                    : 0,
                  clampMin: 0,
                }),
              )
            : makeStaticNumberTrace(summonedBlueprint.attackDamage),
        attackFlatBonusDamageTrace:
          summonedBlueprint.kind === 'weapon'
            ? resolveNumberTrace({
                gameApi,
                state,
                targetEntityId: ownerHeroEntityId,
                propertyPath: 'attackFlatBonusDamage',
                baseValue: 0,
              })
            : makeStaticNumberTrace(0),
        abilityPowerTrace: makeStaticNumberTrace(summonedBlueprint.abilityPower),
        luck,
      })
    : null

  const sourceCardType =
    sourceCardDef?.type === 'weapon' || sourceCardDef?.type === 'totem' || sourceCardDef?.type === 'companion'
      ? sourceCardDef.type
      : summonedBlueprint.kind

  return {
    entityDefinitionId: summonPayload.entityDefinitionId,
    entityKind: summonedBlueprint.kind,
    displayName: sourceCardDef?.name ?? summonPayload.entityDefinitionId,
    cardType: sourceCardType,
    rarity: sourceCardDef?.rarity ?? 'common',
    maxHealth: summonedBlueprint.maxHealth,
    armor: summonedBlueprint.armor,
    magicResist: summonedBlueprint.magicResist,
    attackDamage: summonedBlueprint.attackDamage,
    abilityPower: summonedBlueprint.abilityPower,
    maxMovesPerTurn: summonedBlueprint.maxMovesPerTurn ?? 0,
    passiveSummaryText: passiveSummary?.summaryText ?? null,
    passiveSummaryDetailText: passiveSummary?.summaryDetailText ?? null,
    activeAbilitySummaryText: activeSummary?.summaryText ?? null,
    activeAbilitySummaryDetailText: activeSummary?.summaryDetailText ?? null,
  }
}

function resolveHeroSetup(
  gameApi: ReturnType<typeof createGameApi>,
  setup: HeroBootstrapConfig,
) {
  const heroesById =
    gameApi.heroesById as Record<
      string,
      (typeof gameApi.heroesById)[keyof typeof gameApi.heroesById]
    >
  const cardsById =
    gameApi.cardsById as Record<string, (typeof gameApi.cardsById)[keyof typeof gameApi.cardsById]>

  const heroDefinition = heroesById[setup.heroDefinitionId]
  if (!heroDefinition) {
    throw new Error(`Unknown heroDefinitionId '${setup.heroDefinitionId}' in bootstrap config.`)
  }

  for (const cardId of setup.openingDeckCardIds) {
    if (!cardsById[cardId]) {
      throw new Error(`Unknown deck card id '${cardId}' for hero '${setup.heroEntityId}'.`)
    }
  }

  return {
    heroEntityId: setup.heroEntityId,
    hero: heroDefinition,
    openingMovePoints: setup.openingMovePoints,
    openingDeckCardIds: [...setup.openingDeckCardIds],
    startAnchorPosition: setup.startAnchorPosition,
  }
}

type CreatedBattle = ReturnType<ReturnType<typeof createGameApi>['createBattle']>
type BattleState = CreatedBattle['state']
type BattleRng = CreatedBattle['rng']

type SessionResolutionSuccess = {
  ok: true
  session: AppBattleSession
  preview: AppBattlePreview
  resultMessage: string
  events: BattleEvent[]
}

type SessionResolutionFailure = {
  ok: false
  reason: string
  session: AppBattleSession
  preview: AppBattlePreview
}

export type AppBattleSession = {
  gameApi: ReturnType<typeof createGameApi>
  state: BattleState
  battleRng: BattleRng
  nextSequence: number
}

function buildPreviewFromState(options: {
  gameApi: ReturnType<typeof createGameApi>
  state: BattleState
}): AppBattlePreview {
  const { gameApi, state } = options
  const heroesById = gameApi.heroesById as Record<
    string,
    (typeof gameApi.heroesById)[keyof typeof gameApi.heroesById]
  >
  const cardsById = gameApi.cardsById as Record<
    string,
    (typeof gameApi.cardsById)[keyof typeof gameApi.cardsById]
  >

  const heroHandCounts = state.heroEntityIds.map((heroEntityId) => {
    const entity = state.entitiesById[heroEntityId]

    if (!entity || entity.kind !== 'hero') {
      throw new Error(`Expected hero entity in battle state for '${heroEntityId}'.`)
    }

    return {
      heroEntityId,
      handSize: entity.handCards.length,
      deckSize: entity.deckCardIds.length,
      battlefieldSide: entity.battlefieldSide,
      movePoints: entity.movePoints,
      maxMovePoints: entity.maxMovePoints,
    }
  })

  const heroHands = state.heroEntityIds.map((heroEntityId) => {
    const entity = state.entitiesById[heroEntityId]

    if (!entity || entity.kind !== 'hero') {
      throw new Error(`Expected hero entity in battle state for '${heroEntityId}'.`)
    }

    const actorAttackDamageTrace = resolveNumberTrace({
      gameApi,
      state,
      targetEntityId: entity.entityId,
      propertyPath: 'attackDamage',
      baseValue: entity.attackDamage,
      clampMin: 0,
    })
    const actorAbilityPowerTrace = resolveNumberTrace({
      gameApi,
      state,
      targetEntityId: entity.entityId,
      propertyPath: 'abilityPower',
      baseValue: entity.abilityPower,
      clampMin: 0,
    })
    const actorArmorTrace = resolveNumberTrace({
      gameApi,
      state,
      targetEntityId: entity.entityId,
      propertyPath: 'armor',
      baseValue: entity.armor,
      clampMin: 0,
    })

    return {
      heroEntityId,
      cards: entity.handCards.map((handCard) => {
        const cardDef = cardsById[handCard.cardDefinitionId]
        if (!cardDef) {
          throw new Error(`Missing card definition '${handCard.cardDefinitionId}' while building preview.`)
        }

        const keywordReferences = (cardDef as {
          keywords?: Array<{
            keywordId: string
            params?: Record<string, string | number | boolean | undefined>
          }>
        }).keywords ?? []

        const keywords = keywordReferences
          .map((keywordReference) => {
            const keywordDefinition = gameApi.keywordsById[keywordReference.keywordId]
            if (!keywordDefinition) {
              return null
            }

            return {
              keywordId: keywordDefinition.id,
              keywordName: formatKeywordLabel(keywordDefinition.name, keywordReference.params),
              keywordSummaryText: renderTemplatedText({
                template: keywordDefinition.summaryText.template,
                params: {
                  ...(keywordDefinition.summaryText.params ?? {}),
                  ...(keywordReference.params ?? {}),
                },
              }) ?? keywordDefinition.name,
            }
          })
          .filter(
            (
              keyword,
            ): keyword is {
              keywordId: string
              keywordName: string
              keywordSummaryText: string
            } => keyword !== null,
          )

        return {
          handCardId: handCard.id,
          cardDefinitionId: handCard.cardDefinitionId,
          cardName: cardDef.name,
          moveCost: cardDef.moveCost,
          cardType: cardDef.type,
          rarity: cardDef.rarity,
          keywords,
          ...describeNumericCardText({
            card: cardDef,
            actorHero: entity,
            actorNumberTraces: {
              attackDamage: actorAttackDamageTrace,
              abilityPower: actorAbilityPowerTrace,
              armor: actorArmorTrace,
            },
            state,
            gameApi,
            sourceEntityId: entity.entityId,
            luck: state.luck,
          }),
          castConditionText: describeCardCastCondition(cardDef),
          isPlayable: handCard.isPlayable ?? false,
          targeting: cardDef.targeting,
          validTargetEntityIds: handCard.validTargetEntityIds ?? [],
          validPlacementPositions: handCard.validPlacementPositions ?? [],
          summonPreview: resolveSummonPreviewForCard({
            cardDef,
            gameApi,
            cardsById,
            ownerHeroEntityId: entity.entityId,
            state,
            luck: state.luck,
          }),
        }
      }),
    }
  })

  const heroDetailsByEntityId: AppBattlePreview['heroDetailsByEntityId'] = {}
  for (const heroEntityId of state.heroEntityIds) {
    const entity = state.entitiesById[heroEntityId]

    if (!entity || entity.kind !== 'hero') {
      throw new Error(`Expected hero entity in battle state for '${heroEntityId}'.`)
    }

    const heroDef = heroesById[entity.heroDefinitionId]
    if (!heroDef) {
      throw new Error(`Missing hero definition '${entity.heroDefinitionId}' while building preview.`)
    }

    const basicAttack = buildHeroBasicAttackSummary({
      heroName: heroDef.name,
      rollingHeroEntityId: entity.entityId,
      attack: heroDef.basicAttack,
      minimumTrace: resolveNumberTrace({
        gameApi,
        state,
        targetEntityId: entity.entityId,
        propertyPath: 'basicAttack.minimum',
        baseValue: heroDef.basicAttack.minimumDamage,
        clampMin: 0,
      }),
      maximumTrace: resolveNumberTrace({
        gameApi,
        state,
        targetEntityId: entity.entityId,
        propertyPath: 'basicAttack.maximum',
        baseValue: heroDef.basicAttack.maximumDamage,
        clampMin: 0,
      }),
      attackDamageTrace: resolveNumberTrace({
        gameApi,
        state,
        targetEntityId: entity.entityId,
        propertyPath: 'attackDamage',
        baseValue: entity.attackDamage,
        clampMin: 0,
      }),
      attackFlatBonusDamageTrace: resolveNumberTrace({
        gameApi,
        state,
        targetEntityId: entity.entityId,
        propertyPath: 'attackFlatBonusDamage',
        baseValue: 0,
      }),
      abilityPowerTrace: resolveNumberTrace({
        gameApi,
        state,
        targetEntityId: entity.entityId,
        propertyPath: 'abilityPower',
        baseValue: entity.abilityPower,
        clampMin: 0,
      }),
      luck: state.luck,
    })
    const heroArmorTrace = resolveNumberTrace({
      gameApi,
      state,
      targetEntityId: entity.entityId,
      propertyPath: 'armor',
      baseValue: entity.armor,
      clampMin: 0,
    })
    const heroMagicResistTrace = resolveNumberTrace({
      gameApi,
      state,
      targetEntityId: entity.entityId,
      propertyPath: 'magicResist',
      baseValue: entity.magicResist,
      clampMin: 0,
    })

    const contributionSourceIds = new Set(
      [
        ...heroArmorTrace.contributions,
        ...heroMagicResistTrace.contributions,
        ...basicAttack.attackDamageTrace.contributions,
        ...basicAttack.abilityPowerTrace.contributions,
        ...basicAttack.attackFlatBonusDamageTrace.contributions,
      ].map((contribution) => contribution.sourceId),
    )

    const triggeredThisTurn = !!state.turn.damageTakenThisTurnByHeroEntityId[heroEntityId]
    const heroActiveAuras = state.activeAuras
      .filter((aura) => aura.ownerHeroEntityId === heroEntityId && aura.expiresOnTurnNumber > state.turn.turnNumber)
      .sort((left, right) => left.expiresOnTurnNumber - right.expiresOnTurnNumber)

    const auraGroups = Object.values(
      heroActiveAuras.reduce(
        (map, aura) => {
          const existing = map[aura.kind]
          if (existing) {
            existing.instances.push({
              auraId: aura.id,
              turnsRemaining: aura.expiresOnTurnNumber - state.turn.turnNumber,
              expiresOnTurnNumber: aura.expiresOnTurnNumber,
            })
            return map
          }

          map[aura.kind] = {
            auraKind: aura.kind,
            label: labelForAuraKind(aura.kind),
            stackCount: 1,
            turnsUntilAmplifiedEnds: 0,
            isAmplified: false,
            baseResistanceBonus: aura.baseResistanceBonus,
            amplifiedResistanceBonus: aura.amplifiedResistanceBonus,
            currentResistanceBonus: 0,
            triggeredThisTurn,
            instances: [
              {
                auraId: aura.id,
                turnsRemaining: aura.expiresOnTurnNumber - state.turn.turnNumber,
                expiresOnTurnNumber: aura.expiresOnTurnNumber,
              },
            ],
          }
          return map
        },
        {} as Record<
          string,
          {
            auraKind: string
            label: string
            stackCount: number
            turnsUntilAmplifiedEnds: number
            isAmplified: boolean
            baseResistanceBonus: number
            amplifiedResistanceBonus: number
            currentResistanceBonus: number
            triggeredThisTurn: boolean
            instances: Array<{
              auraId: string
              turnsRemaining: number
              expiresOnTurnNumber: number
            }>
          }
        >,
      ),
    ).map((group) => {
      const instances = [...group.instances].sort((left, right) => left.expiresOnTurnNumber - right.expiresOnTurnNumber)
      const stackCount = instances.length
      const isAmplified = stackCount >= 2
      const secondLatestExpiry = stackCount >= 2 ? instances[stackCount - 2]!.expiresOnTurnNumber : 0
      const turnsUntilAmplifiedEnds = isAmplified ? Math.max(0, secondLatestExpiry - state.turn.turnNumber) : 0
      const currentResistanceBonus =
        triggeredThisTurn
          ? isAmplified
            ? group.amplifiedResistanceBonus
            : group.baseResistanceBonus
          : 0

      return {
        ...group,
        stackCount,
        isAmplified,
        turnsUntilAmplifiedEnds,
        currentResistanceBonus,
        instances,
      }
    })

    const heroPassiveEffect: AppBattlePreview['heroDetailsByEntityId'][string]['activePassiveEffects'][number] = {
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

    const auraPassiveEffects = auraGroups.map((aura) => {
      const durationLabel = `Duration: ${aura.instances.map((entry) => `${entry.turnsRemaining}t`).join(', ')}`
      const triggeredLine = aura.triggeredThisTurn
        ? `Active now: +${aura.currentResistanceBonus} res`
        : 'Waiting for first damage this turn'
      const ampLine = aura.isAmplified
        ? `Amplified for ${aura.turnsUntilAmplifiedEnds} more turn${aura.turnsUntilAmplifiedEnds === 1 ? '' : 's'}`
        : 'Play a second copy to amplify'

      return {
        effectId: `aura:${aura.auraKind}`,
        sourceKind: 'aura' as const,
        label: aura.label,
        iconId: iconForAuraKind(aura.auraKind),
        paletteKey: 'aura' as const,
        priority: 900,
        stackCount: aura.stackCount,
        statusLabel: aura.isAmplified ? 'Amplified' : aura.triggeredThisTurn ? 'Active' : 'Armed',
        statusTone: aura.triggeredThisTurn ? 'active' as const : 'pending' as const,
        shortText: aura.triggeredThisTurn
          ? `+${aura.currentResistanceBonus} res this turn`
          : 'Triggers after first damage this turn',
        detailLines: [
          aura.isAmplified
            ? `Amplified +${aura.amplifiedResistanceBonus} res`
            : `Base +${aura.baseResistanceBonus} res`,
          triggeredLine,
          ampLine,
          durationLabel,
        ],
      }
    })

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
              `Target: ${modifier.targetEntityId === heroEntityId ? 'Your hero' : 'Derived contribution'}`,
              `Source: ${sourceCardName ?? sourceEntity?.entityId ?? 'Unknown'}`,
              `Lifetime: ${describeLifetime(modifier.lifetime)}`,
            ],
            operations: [operationText],
          }
          return map
        },
        {} as Record<
          string,
          AppBattlePreview['heroDetailsByEntityId'][string]['activePassiveEffects'][number] & {
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
          .map((operation) => summarizeNumericOperation(operation.operation, operation.value, operation.propertyPath))
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

    const activePassiveEffects = [
      heroPassiveEffect,
      ...auraPassiveEffects,
      ...passiveRuleEffects,
      ...modifierPassiveEffects,
      ...listenerEffects,
    ]

    heroDetailsByEntityId[heroEntityId] = {
      heroEntityId,
      heroDefinitionId: entity.heroDefinitionId,
      heroName: heroDef.name,
      passiveText: heroDef.passiveText,
      activePassiveEffects,
      basicAttack: {
        moveCost: heroDef.basicAttack.moveCost,
        damageType: heroDef.basicAttack.damageType,
        minimumDamage: heroDef.basicAttack.minimumDamage,
        maximumDamage: heroDef.basicAttack.maximumDamage,
        attackDamageScaling: heroDef.basicAttack.attackDamageScaling,
        abilityPowerScaling: heroDef.basicAttack.abilityPowerScaling,
        minimumTrace: basicAttack.minimumTrace,
        maximumTrace: basicAttack.maximumTrace,
        attackDamageTrace: basicAttack.attackDamageTrace,
        attackFlatBonusDamageTrace: basicAttack.attackFlatBonusDamageTrace,
        abilityPowerTrace: basicAttack.abilityPowerTrace,
        summaryText: basicAttack.summaryText,
        summaryDetailText: basicAttack.summaryDetailText,
        summaryTone: basicAttack.summaryTone,
        currentRangeText: basicAttack.currentRangeText,
      },
    }
  }

  const heroActionTargets = state.heroEntityIds.map((heroEntityId) => {
    const entity = state.entitiesById[heroEntityId]

    if (!entity || entity.kind !== 'hero') {
      throw new Error(`Expected hero entity in battle state for '${heroEntityId}'.`)
    }

    return {
      heroEntityId,
      basicAttack: {
        attackerEntityId: entity.entityId,
        moveCost: entity.basicAttackMoveCost,
        validTargetEntityIds: entity.basicAttackTargetEntityIds ?? [],
      },
      pressLuck: {
        moveCost: 3,
      },
      entityActive: entity.entityActiveOptions ?? [],
    }
  })

  const { rows, columns } = state.battlefieldOccupancy.dimensions
  const cells: AppBattlePreview['battlefield']['cells'] = []

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const key = `${row}:${column}`
      const occupant = state.battlefieldOccupancy.occupiedByPosition[key]

      cells.push({
        row,
        column,
        occupantKind: occupant?.kind ?? null,
        ownerHeroEntityId: occupant?.ownerHeroEntityId ?? null,
        entityId: occupant?.entityId ?? null,
      })
    }
  }

  const battlefieldEntities: AppBattlePreview['battlefield']['entitiesById'] = {}
  for (const entity of Object.values(state.entitiesById)) {
    const owningHeroEntityId = entity.kind === 'hero' ? entity.entityId : entity.ownerHeroEntityId
    const luckBias = luckBiasForHero(state.luck, owningHeroEntityId)
    const criticalChanceLuckDelta = luckBias * LUCK_CRIT_CHANCE_PER_POINT
    const dodgeChanceLuckDelta = luckBias * LUCK_DODGE_CHANCE_PER_POINT
    const attackDamageTrace = resolveNumberTrace({
      gameApi,
      state,
      targetEntityId: entity.entityId,
      propertyPath: 'attackDamage',
      baseValue: entity.attackDamage,
      clampMin: 0,
    })
    const abilityPowerTrace = resolveNumberTrace({
      gameApi,
      state,
      targetEntityId: entity.entityId,
      propertyPath: 'abilityPower',
      baseValue: entity.abilityPower,
      clampMin: 0,
    })
    const armorTrace = resolveNumberTrace({
      gameApi,
      state,
      targetEntityId: entity.entityId,
      propertyPath: 'armor',
      baseValue: entity.armor,
      clampMin: 0,
    })
    const magicResistTrace = resolveNumberTrace({
      gameApi,
      state,
      targetEntityId: entity.entityId,
      propertyPath: 'magicResist',
      baseValue: entity.magicResist,
      clampMin: 0,
    })
    const dodgeChanceTrace = resolveNumberTrace({
      gameApi,
      state,
      targetEntityId: entity.entityId,
      propertyPath: 'dodgeChance',
      baseValue: entity.dodgeChance,
      clampMin: 0,
      clampMax: 1,
    })
    const attackFlatBonusDamageTrace = resolveNumberTrace({
      gameApi,
      state,
      targetEntityId: entity.entityId,
      propertyPath: 'attackFlatBonusDamage',
      baseValue: 0,
    })
    const effectiveCriticalChance = Math.max(0, Math.min(1, entity.criticalChance + criticalChanceLuckDelta))
    const effectiveDodgeChance = Math.max(0, Math.min(1, dodgeChanceTrace.effective + dodgeChanceLuckDelta))

    if (entity.kind === 'hero') {
      const heroDef = heroesById[entity.heroDefinitionId]
      battlefieldEntities[entity.entityId] = {
        entityId: entity.entityId,
        kind: 'hero',
        ownerHeroEntityId: entity.entityId,
        displayName: heroDef?.name ?? entity.heroDefinitionId,
        sourceCardName: null,
        sourceCardSummary: null,
        sourceCardSummaryDetailText: null,
        sourceCardSummaryTone: 'neutral',
        currentHealth: entity.currentHealth,
        maxHealth: entity.maxHealth,
        armor: armorTrace.effective,
        magicResist: magicResistTrace.effective,
        attackDamage: attackDamageTrace.effective,
        abilityPower: abilityPowerTrace.effective,
        combatNumbers: {
          armor: armorTrace,
          magicResist: magicResistTrace,
          attackDamage: attackDamageTrace,
          attackFlatBonusDamage: attackFlatBonusDamageTrace,
          abilityPower: abilityPowerTrace,
          dodgeChance: dodgeChanceTrace,
        },
        criticalChance: entity.criticalChance,
        effectiveCriticalChance,
        criticalChanceLuckDelta,
        criticalMultiplier: entity.criticalMultiplier,
        dodgeChance: dodgeChanceTrace.effective,
        effectiveDodgeChance,
        dodgeChanceLuckDelta,
        movePoints: entity.movePoints,
        maxMovePoints: entity.maxMovePoints,
      }
      continue
    }

    const sourceCard = cardsById[entity.definitionCardId]
    const sourceCardText = sourceCard
      ? describeNumericCardText({
          card: sourceCard,
          actorHero: entity,
          actorNumberTraces: {
            attackDamage: attackDamageTrace,
            abilityPower: abilityPowerTrace,
            armor: armorTrace,
          },
          state,
          gameApi,
          sourceEntityId: entity.entityId,
          viewMode: 'entity',
          luck: state.luck,
        })
      : null

    const activeProfile =
      entity.kind === 'weapon' || entity.kind === 'companion'
        ? gameApi.resolveEntityActiveProfile({
            sourceDefinitionCardId: entity.definitionCardId,
            sourceKind: entity.kind,
          })
        : undefined
    const ownerHeroEntity = state.entitiesById[entity.ownerHeroEntityId]

    const activeAttackDamageTrace = entity.kind === 'weapon'
      ? combineNumberTraces(
          attackDamageTrace,
          resolveNumberTrace({
            gameApi,
            state,
            targetEntityId: entity.ownerHeroEntityId,
            propertyPath: 'attackDamage',
            baseValue: ownerHeroEntity && ownerHeroEntity.kind === 'hero' ? ownerHeroEntity.attackDamage : 0,
            clampMin: 0,
          }),
        )
      : attackDamageTrace

    battlefieldEntities[entity.entityId] = {
      entityId: entity.entityId,
      kind: entity.kind,
      ownerHeroEntityId: entity.ownerHeroEntityId,
      displayName: sourceCard?.name ?? entity.definitionCardId,
      sourceCardName: sourceCard?.name ?? entity.definitionCardId,
      sourceCardSummary: sourceCardText?.summaryText ?? null,
      sourceCardSummaryDetailText: sourceCardText?.summaryDetailText ?? null,
      sourceCardSummaryTone: sourceCardText?.summaryTone ?? 'neutral',
      currentHealth: entity.currentHealth,
      maxHealth: entity.maxHealth,
      armor: armorTrace.effective,
      magicResist: magicResistTrace.effective,
      attackDamage: attackDamageTrace.effective,
      abilityPower: abilityPowerTrace.effective,
      combatNumbers: {
        armor: armorTrace,
        magicResist: magicResistTrace,
        attackDamage: attackDamageTrace,
        attackFlatBonusDamage: attackFlatBonusDamageTrace,
        abilityPower: abilityPowerTrace,
        dodgeChance: dodgeChanceTrace,
      },
      criticalChance: entity.criticalChance,
      effectiveCriticalChance,
      criticalChanceLuckDelta,
      criticalMultiplier: entity.criticalMultiplier,
      dodgeChance: dodgeChanceTrace.effective,
      effectiveDodgeChance,
      dodgeChanceLuckDelta,
      movePoints: entity.remainingMoves,
      maxMovePoints: entity.maxMovesPerTurn,
      activeAbility: activeProfile
        ? buildEntityActiveSummary({
            rollingHeroEntityId: entity.entityId,
            attack: activeProfile,
            minimumTrace: resolveNumberTrace({
              gameApi,
              state,
              targetEntityId: entity.entityId,
              propertyPath: 'useEntityActive.minimum',
              baseValue: activeProfile.minimumDamage,
              clampMin: 0,
            }),
            maximumTrace: resolveNumberTrace({
              gameApi,
              state,
              targetEntityId: entity.entityId,
              propertyPath: 'useEntityActive.maximum',
              baseValue: activeProfile.maximumDamage,
              clampMin: 0,
            }),
            attackDamageTrace: activeAttackDamageTrace,
            attackFlatBonusDamageTrace:
              entity.kind === 'weapon'
                ? resolveNumberTrace({
                    gameApi,
                    state,
                    targetEntityId: entity.ownerHeroEntityId,
                    propertyPath: 'attackFlatBonusDamage',
                    baseValue: 0,
                  })
                : makeStaticNumberTrace(0),
            abilityPowerTrace,
            luck: state.luck,
          })
        : undefined,
    }
  }

  return {
    battleId: state.battleId,
    seed: state.seed,
    heroEntityIds: state.heroEntityIds,
    activeHeroEntityId: state.turn.activeHeroEntityId,
    turn: {
      turnNumber: state.turn.turnNumber,
      pressLuckUsedThisTurn: state.turn.pressLuckUsedThisTurn,
    },
    luck: {
      anchorHeroEntityId: state.luck.anchorHeroEntityId,
      balance: state.luck.balance,
    },
    heroHandCounts,
    heroDetailsByEntityId,
    heroHands,
    heroActionTargets,
    battlefield: {
      rows,
      columns,
      cells,
      entitiesById: battlefieldEntities,
    },
  }
}

function createSummonedEntityId(context: {
  ownerHeroEntityId: string
  entityDefinitionId: string
  sequence: number
}) {
  return `${context.ownerHeroEntityId}:summon:${context.entityDefinitionId}:${context.sequence}`
}

export function createInitialBattleSession(
  config: GameBootstrapConfig = DEFAULT_GAME_BOOTSTRAP_CONFIG,
): {
  session: AppBattleSession
  preview: AppBattlePreview
} {
  const gameApi = createGameApi()

  const [heroA, heroB] = config.heroes
  if (!heroA || !heroB) {
    throw new Error('Bootstrap config must include exactly two hero setups.')
  }

  const createdBattle = gameApi.createBattle({
    battleId: config.battleId,
    seed: config.seed,
    battlefieldRows: config.battlefieldRows,
    battlefieldColumns: config.battlefieldColumns,
    openingHandSize: config.openingHandSize,
    heroes: [resolveHeroSetup(gameApi, heroA), resolveHeroSetup(gameApi, heroB)],
  })

  const session: AppBattleSession = {
    gameApi,
    state: createdBattle.state,
    battleRng: createdBattle.rng,
    nextSequence: 1,
  }

  return {
    session,
    preview: buildPreviewFromState({ gameApi, state: createdBattle.state }),
  }
}

export function resolveSessionPlayCard(options: {
  session: AppBattleSession
  actorHeroEntityId: string
  handCardId: string
  targetEntityId?: string
  targetPosition?: { row: number; column: number }
}):
  | SessionResolutionSuccess
  | SessionResolutionFailure {
  const { session, actorHeroEntityId, handCardId, targetEntityId, targetPosition } = options

  const result = session.gameApi.resolveAction({
    state: session.state,
    nextSequence: session.nextSequence,
    battleRng: session.battleRng,
    createSummonedEntityId,
    action: {
      kind: 'playCard',
      actorHeroEntityId,
      handCardId,
      selection: {
        targetEntityId,
        targetPosition,
      },
    },
  })

  if (!result.ok) {
    return {
      ok: false,
      reason: result.reason,
      session,
      preview: buildPreviewFromState({ gameApi: session.gameApi, state: result.state }),
    }
  }

  const nextSession: AppBattleSession = {
    ...session,
    state: result.state,
    nextSequence: result.nextSequence,
  }

  return {
    ok: true,
    session: nextSession,
    preview: buildPreviewFromState({ gameApi: session.gameApi, state: result.state }),
    resultMessage: result.resultMessage,
    events: result.events,
  }
}

export function resolveSessionSimpleAction(options: {
  session: AppBattleSession
  actorHeroEntityId: string
  kind: 'pressLuck' | 'endTurn'
}):
  | SessionResolutionSuccess
  | SessionResolutionFailure {
  const { session, actorHeroEntityId, kind } = options

  const result = session.gameApi.resolveAction({
    state: session.state,
    nextSequence: session.nextSequence,
    battleRng: session.battleRng,
    createSummonedEntityId,
    action: {
      kind,
      actorHeroEntityId,
    },
  })

  if (!result.ok) {
    return {
      ok: false,
      reason: result.reason,
      session,
      preview: buildPreviewFromState({ gameApi: session.gameApi, state: result.state }),
    }
  }

  const nextSession: AppBattleSession = {
    ...session,
    state: result.state,
    nextSequence: result.nextSequence,
  }

  return {
    ok: true,
    session: nextSession,
    preview: buildPreviewFromState({ gameApi: session.gameApi, state: result.state }),
    resultMessage: result.resultMessage,
    events: result.events,
  }
}

export function resolveSessionBasicAttack(options: {
  session: AppBattleSession
  actorHeroEntityId: string
  attackerEntityId: string
  targetEntityId: string
}):
  | SessionResolutionSuccess
  | SessionResolutionFailure {
  const { session, actorHeroEntityId, attackerEntityId, targetEntityId } = options

  const result = session.gameApi.resolveAction({
    state: session.state,
    nextSequence: session.nextSequence,
    battleRng: session.battleRng,
    createSummonedEntityId,
    action: {
      kind: 'basicAttack',
      actorHeroEntityId,
      attackerEntityId,
      selection: {
        targetEntityId,
      },
    },
  })

  if (!result.ok) {
    return {
      ok: false,
      reason: result.reason,
      session,
      preview: buildPreviewFromState({ gameApi: session.gameApi, state: result.state }),
    }
  }

  const nextSession: AppBattleSession = {
    ...session,
    state: result.state,
    nextSequence: result.nextSequence,
  }

  return {
    ok: true,
    session: nextSession,
    preview: buildPreviewFromState({ gameApi: session.gameApi, state: result.state }),
    resultMessage: result.resultMessage,
    events: result.events,
  }
}

export function resolveSessionUseEntityActive(options: {
  session: AppBattleSession
  actorHeroEntityId: string
  sourceEntityId: string
  targetEntityId: string
}):
  | SessionResolutionSuccess
  | SessionResolutionFailure {
  const { session, actorHeroEntityId, sourceEntityId, targetEntityId } = options

  const result = session.gameApi.resolveAction({
    state: session.state,
    nextSequence: session.nextSequence,
    battleRng: session.battleRng,
    createSummonedEntityId,
    action: {
      kind: 'useEntityActive',
      actorHeroEntityId,
      sourceEntityId,
      selection: {
        targetEntityId,
      },
    },
  })

  if (!result.ok) {
    return {
      ok: false,
      reason: result.reason,
      session,
      preview: buildPreviewFromState({ gameApi: session.gameApi, state: result.state }),
    }
  }

  const nextSession: AppBattleSession = {
    ...session,
    state: result.state,
    nextSequence: result.nextSequence,
  }

  return {
    ok: true,
    session: nextSession,
    preview: buildPreviewFromState({ gameApi: session.gameApi, state: result.state }),
    resultMessage: result.resultMessage,
    events: result.events,
  }
}

export function createInitialBattlePreview(
  config: GameBootstrapConfig = DEFAULT_GAME_BOOTSTRAP_CONFIG,
): AppBattlePreview {
  return createInitialBattleSession(config).preview
}