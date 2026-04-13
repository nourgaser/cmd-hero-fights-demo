import {
  iconForAuraKind,
  labelForAuraKind,
} from '../../../utils/game-client-format.ts'
import type { AuraGroup, HeroPassiveEffect, PreviewBattleState } from './types.ts'

export function buildAuraGroups(options: {
  state: PreviewBattleState
  heroEntityId: string
}): AuraGroup[] {
  const { state, heroEntityId } = options

  const triggeredThisTurn = !!state.turn.damageTakenThisTurnByHeroEntityId[heroEntityId]
  const heroActiveAuras = state.activeAuras
    .filter((aura) => aura.ownerHeroEntityId === heroEntityId && aura.expiresOnTurnNumber > state.turn.turnNumber)
    .sort((left, right) => left.expiresOnTurnNumber - right.expiresOnTurnNumber)

  return Object.values(
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
      {} as Record<string, AuraGroup>,
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
}

export function buildAuraPassiveEffects(auraGroups: AuraGroup[]): HeroPassiveEffect[] {
  return auraGroups.map((aura) => {
    const durationLabel = `Duration: ${aura.instances.map((entry) => `${entry.turnsRemaining}t`).join(', ')}`
    const triggeredLine = aura.triggeredThisTurn
      ? `Active now: +${aura.currentResistanceBonus} res`
      : 'Waiting for first damage this turn'
    const ampLine = aura.isAmplified
      ? `Amplified for ${aura.turnsUntilAmplifiedEnds} more turn${aura.turnsUntilAmplifiedEnds === 1 ? '' : 's'}`
      : 'Play a second copy to amplify'

    return {
      effectId: `aura:${aura.auraKind}`,
      sourceKind: 'aura',
      label: aura.label,
      iconId: iconForAuraKind(aura.auraKind),
      paletteKey: 'aura',
      priority: 900,
      stackCount: aura.stackCount,
      statusLabel: aura.isAmplified ? 'Amplified' : aura.triggeredThisTurn ? 'Active' : 'Armed',
      statusTone: aura.triggeredThisTurn ? 'active' : 'pending',
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
}
