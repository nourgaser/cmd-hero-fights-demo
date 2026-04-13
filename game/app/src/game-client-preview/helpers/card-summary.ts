import { createGameApi } from '../../../../index'
import {
  type StatKey,
  STAT_METADATA,
  formatPreviewNumber,
  formatSignedDelta,
  renderTemplatedText,
} from '../../utils/game-client-format'
import type { AppNumberTrace } from '../types'
import {
  makeStaticNumberTrace,
  numberTraceToDetailLine,
  resolveNumberTrace,
} from './number-trace'
import { summarizeLuckAdjustedRange } from './attack-summary'

type PreviewBattleState = ReturnType<ReturnType<typeof createGameApi>['createBattle']>['state']
export function describeNumericCardText(options: {
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
  state?: PreviewBattleState
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
    const passiveFromSummary = cardSummaryText
      ? (() => {
          const marker = 'Passive:'
          const index = cardSummaryText.indexOf(marker)
          if (index < 0) {
            return null
          }

          const extracted = cardSummaryText.slice(index + marker.length).trim()
          return extracted.length > 0 ? extracted : null
        })()
      : null

    if (viewMode === 'entity') {
      return {
          summaryText: postSummonEffectText ?? passiveFromSummary ?? '',
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

export function describeCardCastCondition(cardDefinition: unknown): string | null {
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

