import { createGameApi } from '../../../../index.ts'
import type { AppBattlePreview } from '../types.ts'
import {
  buildEntityActiveSummary,
} from './attack-summary.ts'
import { describeNumericCardText } from './card-summary.ts'
import {
  combineNumberTraces,
  makeStaticNumberTrace,
  resolveNumberTrace,
} from './number-trace.ts'
export function resolveSummonPreviewForCard(options: {
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
    ? activeProfile.kind === 'attack'
      ? buildEntityActiveSummary({
          rollingHeroEntityId: ownerHeroEntityId,
          active: activeProfile,
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
      : buildEntityActiveSummary({
          rollingHeroEntityId: ownerHeroEntityId,
          active: activeProfile,
          minimumTrace: makeStaticNumberTrace(0),
          maximumTrace: makeStaticNumberTrace(0),
          attackDamageTrace: makeStaticNumberTrace(0),
          attackFlatBonusDamageTrace: makeStaticNumberTrace(0),
          abilityPowerTrace: makeStaticNumberTrace(0),
          luck,
        })
    : null

  const sourceCardType =
    sourceCardDef?.type === 'weapon' || sourceCardDef?.type === 'totem' || sourceCardDef?.type === 'companion'
      ? sourceCardDef.type
      : summonedBlueprint.kind

  return {
  cardDefinitionId: sourceCardDef?.id ?? summonPayload.entityDefinitionId,
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
