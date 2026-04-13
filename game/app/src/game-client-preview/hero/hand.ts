import {
  formatKeywordLabel,
  renderTemplatedText,
} from '../../utils/game-client-format'
import type { AppBattlePreview } from '../types'
import {
  describeCardCastCondition,
  describeNumericCardText,
  resolveNumberTrace,
  resolveSummonPreviewForCard,
} from '../helpers'
import type { AppBattleApi } from '../../game-client'
import type { BattleState, HeroEntityState } from '../../../../shared/models'

export function buildHeroHandCounts(options: {
  gameApi: AppBattleApi
  state: BattleState
}): AppBattlePreview['heroHandCounts'] {
  const { gameApi, state } = options

  return (state.heroEntityIds as string[]).map((heroEntityId) => {
    const entity = state.entitiesById[heroEntityId] as HeroEntityState

    if (!entity || entity.kind !== 'hero') {
      throw new Error(`Expected hero entity in battle state for '${heroEntityId}'.`)
    }

    const moveCapacityTrace = resolveNumberTrace({
      gameApi,
      state,
      targetEntityId: heroEntityId,
      propertyPath: 'moveCapacity',
      baseValue: entity.maxMovePoints,
      clampMin: 0,
    })

    return {
      heroEntityId,
      handSize: entity.handCards.length,
      deckSize: entity.deckCardIds.length,
      battlefieldSide: entity.battlefieldSide,
      movePoints: entity.movePoints,
      maxMovePoints: entity.maxMovePoints,
      moveCapacityTrace,
    }
  })
}

export function buildHeroHands(options: {
  gameApi: AppBattleApi
  state: BattleState
}): AppBattlePreview['heroHands'] {
  const { gameApi, state } = options

  const cardsById = gameApi.GAME_CONTENT_REGISTRY.cardsById

  return (state.heroEntityIds as string[]).map((heroEntityId) => {
    const entity = state.entitiesById[heroEntityId] as HeroEntityState

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
            const keywordDefinition = gameApi.GAME_CONTENT_REGISTRY.keywordsById[keywordReference.keywordId]
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
            card: cardDef as any,
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
            gameApi,
            state,
            cardDefinitionId: handCard.cardDefinitionId,
            ownerHeroEntityId: entity.entityId,
          }),
        }
      }),
    }
  })
}
