import { createGameApi } from '../../index.ts'
import { LUCK_STEP_RATIO } from '../../shared/game-constants.ts'
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
      summaryText: string
      summaryDetailText: string | null
      summaryTone: 'neutral' | 'positive' | 'negative'
      castConditionText: string | null
      isPlayable: boolean
      targeting: 'none' | 'selectedAny' | 'selectedEnemy' | 'selectedAlly'
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
          abilityPower: AppNumberTrace
        }
        criticalChance: number
        criticalMultiplier: number
        dodgeChance: number
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
      mode: 'static' | 'template'
      text?: string
      template?: string
      params?: Record<string, string | number | boolean>
    }
    effects: Array<{
      payload: { kind: string } & Record<string, unknown>
      displayText: {
        mode: 'static' | 'template'
        text?: string
        template?: string
        params?: Record<string, string | number | boolean>
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
  luck: {
    anchorHeroEntityId: string
    balance: number
  }
}): {
  summaryText: string
  summaryDetailText: string | null
  summaryTone: 'neutral' | 'positive' | 'negative'
} {
  const { card, actorHero, actorNumberTraces, state, gameApi, sourceEntityId, luck } = options
  const firstEffect = card.effects[0]

  const renderDisplayText = (displayText?: {
    mode: 'static' | 'template'
    text?: string
    template?: string
    params?: Record<string, string | number | boolean>
  }): string | null => {
    if (!displayText) {
      return null
    }

    if (displayText.mode === 'static') {
      return displayText.text ?? null
    }

    const template = displayText.template
    if (!template) {
      return null
    }

    return template.replaceAll(/\{([a-zA-Z0-9_]+)\}/g, (match, key) => {
      const value = displayText.params?.[key]
      return value === undefined ? match : String(value)
    })
  }

  const defaultSummary =
    renderDisplayText(card.summaryText) ??
    renderDisplayText(firstEffect?.displayText) ??
    'No summary.'

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

    const damageLabel = damagePayload.damageType === 'physical' ? 'physical damage' : damagePayload.damageType === 'magic' ? 'magic damage' : 'true damage'
    const summaryText = adjusted.minimum === adjusted.maximum
      ? `Deal ${formatPreviewNumber(adjusted.minimum)} ${damageLabel}.`
      : `Deal ${formatPreviewNumber(adjusted.minimum)}-${formatPreviewNumber(adjusted.maximum)} ${damageLabel}.`

    const detailParts = [
      `${formatPreviewNumber(effectiveMinimumBase)}-${formatPreviewNumber(effectiveMaximumBase)} base`,
      damagePayload.attackDamageScaling > 0 ? `${formatPreviewNumber(damagePayload.attackDamageScaling * 100)}% AD` : null,
      damagePayload.abilityPowerScaling > 0 ? `${formatPreviewNumber(damagePayload.abilityPowerScaling * 100)}% AP` : null,
      damagePayload.armorScaling > 0 ? `${formatPreviewNumber(damagePayload.armorScaling * 100)}% armor` : null,
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
      summaryText: `${verb} ${changeKind === 'removeMatching' ? '' : sign}${amount} ${statMeta.label}.`,
      summaryDetailText: `Target: ${String(statPayload.target)}.${durationText}`,
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
  abilityPowerTrace: AppNumberTrace
  luck: {
    anchorHeroEntityId: string
    balance: number
  }
}): {
  minimumTrace: AppNumberTrace
  maximumTrace: AppNumberTrace
  attackDamageTrace: AppNumberTrace
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
    numberTraceToDetailLine('Basic attack min base', minimumTrace),
    numberTraceToDetailLine('Basic attack max base', maximumTrace),
    numberTraceToDetailLine('AD used', attackDamageTrace),
    numberTraceToDetailLine('AP used', abilityPowerTrace),
  ]

  return {
    minimumTrace,
    maximumTrace,
    attackDamageTrace,
    abilityPowerTrace,
    summaryText:
      adjusted.minimum === adjusted.maximum
        ? `${heroName} basic attack deals ${formatPreviewNumber(adjusted.minimum)} ${attack.damageType} damage.`
        : `${heroName} basic attack deals ${formatPreviewNumber(adjusted.minimum)}-${formatPreviewNumber(adjusted.maximum)} ${attack.damageType} damage.`,
    summaryDetailText: `${detailRows.join('\n')}\n${summaryText} Current pre-luck range: ${formatPreviewNumber(minimum)} to ${formatPreviewNumber(maximum)}. Luck shift: ${adjusted.shift !== 0 ? formatSignedDelta(adjusted.shift) : 'none'}.`,
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
    numberTraceToDetailLine('Active min base', minimumTrace),
    numberTraceToDetailLine('Active max base', maximumTrace),
    numberTraceToDetailLine('AD used', attackDamageTrace),
    numberTraceToDetailLine('AP used', abilityPowerTrace),
  ]

  return {
    moveCost: attack.moveCost,
    damageType: attack.damageType,
    canBeDodged: attack.canBeDodged,
    summaryText:
      adjusted.minimum === adjusted.maximum
        ? `Deal ${formatPreviewNumber(adjusted.minimum)} ${attack.damageType}.`
        : `Deal ${formatPreviewNumber(adjusted.minimum)}-${formatPreviewNumber(adjusted.maximum)} ${attack.damageType}.`,
    summaryDetailText: `${detailRows.join('\n')}\n${summaryText} Current pre-luck range: ${formatPreviewNumber(minimum)} to ${formatPreviewNumber(maximum)}. Luck shift: ${adjusted.shift !== 0 ? formatSignedDelta(adjusted.shift) : 'none'}.`,
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
  luck: {
    anchorHeroEntityId: string
    balance: number
  }
}): AppBattlePreview['heroHands'][number]['cards'][number]['summonPreview'] {
  const { cardDef, gameApi, cardsById, ownerHeroEntityId, luck } = options
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
        attackDamageTrace: makeStaticNumberTrace(summonedBlueprint.attackDamage),
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

        return {
          handCardId: handCard.id,
          cardDefinitionId: handCard.cardDefinitionId,
          cardName: cardDef.name,
          moveCost: cardDef.moveCost,
          cardType: cardDef.type,
          rarity: cardDef.rarity,
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

    heroDetailsByEntityId[heroEntityId] = {
      heroEntityId,
      heroDefinitionId: entity.heroDefinitionId,
      heroName: heroDef.name,
      passiveText: heroDef.passiveText,
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
          abilityPower: abilityPowerTrace,
        },
        criticalChance: entity.criticalChance,
        criticalMultiplier: entity.criticalMultiplier,
        dodgeChance: entity.dodgeChance,
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
        abilityPower: abilityPowerTrace,
      },
      criticalChance: entity.criticalChance,
      criticalMultiplier: entity.criticalMultiplier,
      dodgeChance: entity.dodgeChance,
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
            attackDamageTrace,
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