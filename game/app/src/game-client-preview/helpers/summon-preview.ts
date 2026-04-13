import type { AppBattlePreview } from '../types'
import {
  describeNumericCardText,
} from './card-summary'
import { resolveNumberTrace } from './number-trace'
import type { AppBattleApi } from '../../game-client'
import type { BattleState } from '../../../../shared/models'

export function buildSummonPreview(options: {
  gameApi: AppBattleApi
  state: BattleState
  cardDefinitionId: string
  ownerHeroEntityId: string
}): AppBattlePreview['heroHands'][number]['cards'][number]['summonPreview'] {
  const { gameApi, state, cardDefinitionId } = options

  const summonedBlueprint = gameApi.GAME_CONTENT_REGISTRY.resolveSummonedEntityBlueprint(
    cardDefinitionId,
    'companion', // Default kind if needed
  )

  if (!summonedBlueprint) {
    return null
  }

  // Use a temporary entityId for tracing
  const tempEntityId = `preview:${cardDefinitionId}`

  const attackDamageTrace = resolveNumberTrace({
    gameApi,
    state,
    targetEntityId: tempEntityId,
    propertyPath: 'attackDamage',
    baseValue: summonedBlueprint.attackDamage,
    clampMin: 0,
  })
  const abilityPowerTrace = resolveNumberTrace({
    gameApi,
    state,
    targetEntityId: tempEntityId,
    propertyPath: 'abilityPower',
    baseValue: summonedBlueprint.abilityPower,
    clampMin: 0,
  })
  const armorTrace = resolveNumberTrace({
    gameApi,
    state,
    targetEntityId: tempEntityId,
    propertyPath: 'armor',
    baseValue: summonedBlueprint.armor,
    clampMin: 0,
  })

  const passiveText = describeNumericCardText({
    card: {
      name: summonedBlueprint.definitionCardId,
      effects: [], // Summary doesn't need full effects here
    },
    actorHero: {
      entityId: tempEntityId,
      attackDamage: attackDamageTrace.effective,
      abilityPower: abilityPowerTrace.effective,
      armor: armorTrace.effective,
    },
    actorNumberTraces: {
      attackDamage: attackDamageTrace,
      abilityPower: abilityPowerTrace,
      armor: armorTrace,
    },
    state,
    gameApi,
    sourceEntityId: tempEntityId,
    viewMode: 'entity',
    luck: state.luck,
  })

  const activeProfile = gameApi.GAME_CONTENT_REGISTRY.resolveEntityActiveProfile({
    sourceDefinitionCardId: cardDefinitionId,
    sourceKind: summonedBlueprint.kind === 'companion' ? 'companion' : 'weapon',
  })

  return {
    cardDefinitionId,
    entityDefinitionId: summonedBlueprint.definitionCardId,
    entityKind: summonedBlueprint.kind,
    displayName: summonedBlueprint.definitionCardId,
    cardType: summonedBlueprint.kind === 'companion' ? 'companion' : 'weapon',
    rarity: 'common', // Default for preview
    maxHealth: summonedBlueprint.maxHealth,
    attackDamage: attackDamageTrace.effective,
    abilityPower: abilityPowerTrace.effective,
    armor: armorTrace.effective,
    magicResist: summonedBlueprint.magicResist,
    maxMovesPerTurn: summonedBlueprint.maxMovesPerTurn ?? 0,
    passiveSummaryText: passiveText.summaryText,
    passiveSummaryDetailText: passiveText.summaryDetailText,
    activeAbilitySummaryText: activeProfile ? 'Active Ability' : null,
    activeAbilitySummaryDetailText: activeProfile ? 'Details not available in preview.' : null,
  }
}
