import { LUCK_STEP_RATIO } from '../../../../shared/game-constants'
import { luckBiasForHero } from '../../../../engine/core/luck'
import { renderEffectDisplayText } from '../../../../shared/models'
import { formatPreviewNumber, formatSignedDelta } from '../../utils/game-client-format'
import type { AppNumberTrace, AppTargetPreview } from '../types'
import {
  numberTraceToDetailLine,
} from './number-trace'

function clampNumber(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

export function summarizeLuckAdjustedRange(options: {
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
  const luckPercent = clampNumber(bias * LUCK_STEP_RATIO, -1, 1)
  if (luckPercent === 0) {
    return { minimum, maximum, shift: 0, bias }
  }

  const adjustedMinimum =
    luckPercent > 0 ? minimum + (maximum - minimum) * luckPercent : minimum
  const adjustedMaximum =
    luckPercent > 0 ? maximum : maximum - (maximum - minimum) * Math.abs(luckPercent)
  const shift = luckPercent > 0 ? adjustedMinimum - minimum : adjustedMaximum - maximum

  return {
    minimum: clampNumber(adjustedMinimum, minimum, maximum),
    maximum: clampNumber(adjustedMaximum, minimum, maximum),
    shift,
    bias,
  }
}
export function buildHeroBasicAttackSummary(options: {
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
  targetPreview: AppTargetPreview
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
    targetPreview: {
      kind: 'damage',
      minimum: adjusted.minimum,
      maximum: adjusted.maximum,
      damageType: attack.damageType,
      canBeDodged: true,
      summaryText,
      summaryDetailText: `${summaryText}\nCurrent pre-luck range: ${formatPreviewNumber(minimum)} to ${formatPreviewNumber(maximum)}.\nLuck shift: ${adjusted.shift !== 0 ? formatSignedDelta(adjusted.shift) : 'none'}.${attackFlatBonusDamageTrace.effective !== 0 ? `\nFlat attack bonus is added after resistance: +${formatPreviewNumber(attackFlatBonusDamageTrace.effective)}.` : ''}${detailRows.length > 0 ? `\n${detailRows.join('\n')}` : ''}`,
      currentRangeText: `Current range: ${formatPreviewNumber(adjusted.minimum)} to ${formatPreviewNumber(adjusted.maximum)} ${attack.damageType} damage before dodge and resistance.`,
    },
  }
}

export function buildEntityActiveSummary(options: {
  rollingHeroEntityId: string
  active:
    | {
        kind: 'attack'
        minimumDamage: number
        maximumDamage: number
        attackDamageScaling: number
        abilityPowerScaling: number
        damageType: 'physical' | 'magic' | 'true'
        moveCost: number
        canBeDodged: boolean
      }
    | {
        kind: 'effect'
        moveCost: number
        summaryText: Parameters<typeof renderEffectDisplayText>[0]
        effects: unknown[]
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
  targetPreview: AppTargetPreview | null
} {
  const {
    rollingHeroEntityId,
    active,
    minimumTrace,
    maximumTrace,
    attackDamageTrace,
    attackFlatBonusDamageTrace,
    abilityPowerTrace,
    luck,
  } = options

  if (active.kind === 'effect') {
    const summary = renderEffectDisplayText(active.summaryText)
    return {
      moveCost: active.moveCost,
      damageType: 'true',
      canBeDodged: false,
      summaryText: summary,
      summaryDetailText: summary,
      summaryTone: 'neutral',
      currentRangeText: summary,
      targetPreview: null,
    }
  }

  const attack = active
  const scalingParts = [
    attack.attackDamageScaling > 0
      ? `${formatPreviewNumber(attack.attackDamageScaling * 100)}% AD`
      : null,
    attack.abilityPowerScaling > 0
      ? `${formatPreviewNumber(attack.abilityPowerScaling * 100)}% AP`
      : null,
  ].filter((part): part is string => !!part)

  const baseRangeText = `${formatPreviewNumber(attack.minimumDamage)} to ${formatPreviewNumber(attack.maximumDamage)}`

  const summaryText = scalingParts.length > 0
    ? `Base ${baseRangeText} ${attack.damageType} + ${scalingParts.join(' + ')}.`
    : `Base ${baseRangeText} ${attack.damageType}.`

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
    .filter((row): row is string => !!row)

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
    targetPreview: {
      kind: 'damage',
      minimum: adjusted.minimum,
      maximum: adjusted.maximum,
      damageType: attack.damageType,
      canBeDodged: attack.canBeDodged,
      summaryText,
      summaryDetailText: `${summaryText}\nCurrent pre-luck range: ${formatPreviewNumber(minimum)} to ${formatPreviewNumber(maximum)}.\nLuck shift: ${adjusted.shift !== 0 ? formatSignedDelta(adjusted.shift) : 'none'}.${attackFlatBonusDamageTrace.effective !== 0 ? `\nFlat attack bonus is added after resistance: +${formatPreviewNumber(attackFlatBonusDamageTrace.effective)}.` : ''}${detailRows.length > 0 ? `\n${detailRows.join('\n')}` : ''}`,
      currentRangeText: `Current range: ${formatPreviewNumber(adjusted.minimum)} to ${formatPreviewNumber(adjusted.maximum)} ${attack.damageType} before resistance${attack.canBeDodged ? ' and dodge' : ''}.`,
    },
  }
}
