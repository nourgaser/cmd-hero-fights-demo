import { createGameApi } from '../../../../index'
import type { AppBattlePreview } from '../types'
import { buildAuraGroups } from './details/auras'
import { buildHeroBasicAttackContext } from './details/basic-attack'
import { buildHeroPassivePackage } from './details/passives'

type PreviewGameApi = ReturnType<typeof createGameApi>
type PreviewBattleState = ReturnType<ReturnType<typeof createGameApi>['createBattle']>['state']

export function buildHeroDetailsByEntityId(options: {
  gameApi: PreviewGameApi
  state: PreviewBattleState
}): AppBattlePreview['heroDetailsByEntityId'] {
  const { gameApi, state } = options

  const heroesById = gameApi.heroesById as Record<
    string,
    (typeof gameApi.heroesById)[keyof typeof gameApi.heroesById]
  >
  const cardsById = gameApi.cardsById as Record<
    string,
    (typeof gameApi.cardsById)[keyof typeof gameApi.cardsById]
  >

  const heroDetailsByEntityId: AppBattlePreview['heroDetailsByEntityId'] = {}

  for (const heroEntityId of state.heroEntityIds as string[]) {
    const entity = state.entitiesById[heroEntityId]

    if (!entity || entity.kind !== 'hero') {
      throw new Error(`Expected hero entity in battle state for '${heroEntityId}'.`)
    }

    const heroDef = heroesById[entity.heroDefinitionId]
    if (!heroDef) {
      throw new Error(`Missing hero definition '${entity.heroDefinitionId}' while building preview.`)
    }

    const {
      basicAttackWithCombinedFlatBonus,
      contributionSourceIds,
    } = buildHeroBasicAttackContext({
      gameApi,
      state,
      entity,
      heroDef,
    })

    const auraGroups = buildAuraGroups({
      state,
      heroEntityId,
    })

    const {
      passiveText,
      activePassiveEffects,
    } = buildHeroPassivePackage({
      gameApi,
      state,
      cardsById,
      heroEntityId,
      heroDef,
      contributionSourceIds,
      auraGroups,
    })

    heroDetailsByEntityId[heroEntityId] = {
      heroEntityId,
      heroDefinitionId: entity.heroDefinitionId,
      heroName: heroDef.name,
      passiveText,
      activePassiveEffects,
      basicAttack: {
        moveCost: heroDef.basicAttack.moveCost,
        damageType: heroDef.basicAttack.damageType,
        minimumDamage: heroDef.basicAttack.minimumDamage,
        maximumDamage: heroDef.basicAttack.maximumDamage,
        attackDamageScaling: heroDef.basicAttack.attackDamageScaling,
        abilityPowerScaling: heroDef.basicAttack.abilityPowerScaling,
        minimumTrace: basicAttackWithCombinedFlatBonus.minimumTrace,
        maximumTrace: basicAttackWithCombinedFlatBonus.maximumTrace,
        attackDamageTrace: basicAttackWithCombinedFlatBonus.attackDamageTrace,
        attackFlatBonusDamageTrace: basicAttackWithCombinedFlatBonus.attackFlatBonusDamageTrace,
        abilityPowerTrace: basicAttackWithCombinedFlatBonus.abilityPowerTrace,
        summaryText: basicAttackWithCombinedFlatBonus.summaryText,
        summaryDetailText: basicAttackWithCombinedFlatBonus.summaryDetailText,
        summaryTone: basicAttackWithCombinedFlatBonus.summaryTone,
        currentRangeText: basicAttackWithCombinedFlatBonus.currentRangeText,
      },
    }
  }

  return heroDetailsByEntityId
}
