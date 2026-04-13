import {
  LUCK_CRIT_CHANCE_PER_POINT,
  LUCK_DODGE_CHANCE_PER_POINT,
} from '../../../shared/game-constants'
import { luckBiasForHero } from '../../../engine/core/luck'
import {
  describeLifetime,
  formatKeywordLabel,
  formatListenerLabel,
  prettifyEventOrConditionKind,
  renderTemplatedText,
} from '../utils/game-client-format'
import type { AppBattlePreview } from './types'
import {
  buildEntityActiveSummary,
  combineNumberTraces,
  describeNumericCardText,
  makeStaticNumberTrace,
  resolveNumberTrace,
  resolvePermanentLayerValue,
} from './helpers'
import type { AppBattleApi } from '../game-client'
import type { BattleState } from '../../../shared/models'


export function buildBattlefieldPreview(options: {
  gameApi: AppBattleApi
  state: BattleState
}): AppBattlePreview['battlefield'] {
  const { gameApi, state } = options
  const heroesById = gameApi.GAME_CONTENT_REGISTRY.heroesById
  const cardsById = gameApi.GAME_CONTENT_REGISTRY.cardsById
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
    const immuneTrace = resolveNumberTrace({
      gameApi,
      state,
      targetEntityId: entity.entityId,
      propertyPath: 'immune',
      baseValue: 0,
      clampMin: 0,
    })
    const moveCapacityTrace = resolveNumberTrace({
      gameApi,
      state,
      targetEntityId: entity.entityId,
      propertyPath: 'moveCapacity',
      baseValue: entity.kind === 'hero' ? entity.maxMovePoints : entity.maxMovesPerTurn,
      clampMin: 0,
    })
    const attackDamagePermanent = resolvePermanentLayerValue({
      state,
      targetEntityId: entity.entityId,
      propertyPath: 'attackDamage',
      baseValue: entity.attackDamage,
      clampMin: 0,
    })
    const abilityPowerPermanent = resolvePermanentLayerValue({
      state,
      targetEntityId: entity.entityId,
      propertyPath: 'abilityPower',
      baseValue: entity.abilityPower,
      clampMin: 0,
    })
    const armorPermanent = resolvePermanentLayerValue({
      state,
      targetEntityId: entity.entityId,
      propertyPath: 'armor',
      baseValue: entity.armor,
      clampMin: 0,
    })
    const magicResistPermanent = resolvePermanentLayerValue({
      state,
      targetEntityId: entity.entityId,
      propertyPath: 'magicResist',
      baseValue: entity.magicResist,
      clampMin: 0,
    })
    const attackFlatBonusDamagePermanent = resolvePermanentLayerValue({
      state,
      targetEntityId: entity.entityId,
      propertyPath: 'attackFlatBonusDamage',
      baseValue: 0,
      clampMin: 0,
    })
    const moveCapacityPermanent = resolvePermanentLayerValue({
      state,
      targetEntityId: entity.entityId,
      propertyPath: 'moveCapacity',
      baseValue: entity.kind === 'hero' ? entity.maxMovePoints : entity.maxMovesPerTurn,
      clampMin: 0,
    })
    const statLayers = {
      attackDamage: {
        permanent: attackDamagePermanent,
        bonus: attackDamageTrace.effective - attackDamagePermanent,
      },
      abilityPower: {
        permanent: abilityPowerPermanent,
        bonus: abilityPowerTrace.effective - abilityPowerPermanent,
      },
      armor: {
        permanent: armorPermanent,
        bonus: armorTrace.effective - armorPermanent,
      },
      magicResist: {
        permanent: magicResistPermanent,
        bonus: magicResistTrace.effective - magicResistPermanent,
      },
      attackFlatBonusDamage: {
        permanent: attackFlatBonusDamagePermanent,
        bonus: attackFlatBonusDamageTrace.effective - attackFlatBonusDamagePermanent,
      },
      moveCapacity: {
        permanent: moveCapacityPermanent,
        bonus: moveCapacityTrace.effective - moveCapacityPermanent,
      },
    }
    const effectiveCriticalChance = Math.max(0, Math.min(1, entity.criticalChance + criticalChanceLuckDelta))
    const effectiveDodgeChance = Math.max(0, Math.min(1, dodgeChanceTrace.effective + dodgeChanceLuckDelta))

    if (entity.kind === 'hero') {
      const heroDef = heroesById[entity.heroDefinitionId]
      battlefieldEntities[entity.entityId] = {
        entityId: entity.entityId,
        kind: 'hero',
        ownerHeroEntityId: entity.entityId,
        displayName: heroDef?.name ?? entity.heroDefinitionId,
        sourceCardDefinitionId: null,
        sourceCardName: null,
        sourceCardSummary: null,
        sourceCardSummaryDetailText: null,
        sourceCardSummaryTone: 'neutral',
        sourceCardKeywords: [],
        activeListeners: [],
        isTaunt: false,
        currentHealth: entity.currentHealth,
        maxHealth: entity.maxHealth,
        armor: armorTrace.effective,
        magicResist: magicResistTrace.effective,
        attackDamage: attackDamageTrace.effective,
        abilityPower: abilityPowerTrace.effective,
        isImmune: immuneTrace.effective > 0,
        statLayers,
        combatNumbers: {
          armor: armorTrace,
          magicResist: magicResistTrace,
          attackDamage: attackDamageTrace,
          attackFlatBonusDamage: attackFlatBonusDamageTrace,
          abilityPower: abilityPowerTrace,
          immune: immuneTrace,
          dodgeChance: dodgeChanceTrace,
          moveCapacity: moveCapacityTrace,
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

    const summoned = entity
    const sourceCard = cardsById[summoned.definitionCardId]
    const sourceCardKeywordReferences = (sourceCard as {
      keywords?: Array<{
        keywordId: string
        params?: Record<string, string | number | boolean | undefined>
      }>
    } | undefined)?.keywords ?? []
    const sourceCardKeywords = sourceCardKeywordReferences
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
    const sourceCardText = sourceCard
      ? describeNumericCardText({
          card: sourceCard,
          actorHero: summoned,
          actorNumberTraces: {
            attackDamage: attackDamageTrace,
            abilityPower: abilityPowerTrace,
            armor: armorTrace,
          },
          state,
          gameApi,
          sourceEntityId: summoned.entityId,
          viewMode: 'entity',
          luck: state.luck,
        })
      : null

    const activeProfile =
      summoned.kind === 'weapon' || summoned.kind === 'companion'
        ? gameApi.GAME_CONTENT_REGISTRY.resolveEntityActiveProfile({
            sourceDefinitionCardId: summoned.definitionCardId,
            sourceKind: summoned.kind,
          })
        : undefined
    const ownerHeroEntity = state.entitiesById[summoned.ownerHeroEntityId]
    const entityActiveListeners = state.activeListeners
      .filter((listener) => listener.sourceEntityId === summoned.entityId)
      .map((listener) => ({
        listenerId: listener.listenerId,
        label: formatListenerLabel(listener.listenerId),
        shortText: `Triggers on ${prettifyEventOrConditionKind(listener.eventKind)}`,
        statusLabel: describeLifetime(listener.lifetime),
      }))

    const activeAttackDamageTrace = summoned.kind === 'weapon'
      ? combineNumberTraces(
          attackDamageTrace,
          resolveNumberTrace({
            gameApi,
            state,
            targetEntityId: summoned.ownerHeroEntityId,
            propertyPath: 'attackDamage',
            baseValue: ownerHeroEntity && ownerHeroEntity.kind === 'hero' ? ownerHeroEntity.attackDamage : 0,
            clampMin: 0,
          }),
        )
      : attackDamageTrace

    battlefieldEntities[summoned.entityId] = {
      entityId: summoned.entityId,
      kind: summoned.kind,
      ownerHeroEntityId: summoned.ownerHeroEntityId,
      displayName: sourceCard?.name ?? summoned.definitionCardId,
      sourceCardDefinitionId: summoned.definitionCardId,
      sourceCardName: sourceCard?.name ?? summoned.definitionCardId,
      sourceCardSummary: sourceCardText?.summaryText ?? null,
      sourceCardSummaryDetailText: sourceCardText?.summaryDetailText ?? null,
      sourceCardSummaryTone: sourceCardText?.summaryTone ?? 'neutral',
      sourceCardKeywords,
      activeListeners: entityActiveListeners,
      isTaunt: (summoned.keywordIds ?? []).includes('keyword.taunt'),
      currentHealth: summoned.currentHealth,
      maxHealth: summoned.maxHealth,
      armor: armorTrace.effective,
      magicResist: magicResistTrace.effective,
      attackDamage: attackDamageTrace.effective,
      abilityPower: abilityPowerTrace.effective,
      isImmune: immuneTrace.effective > 0,
      statLayers,
      combatNumbers: {
        armor: armorTrace,
        magicResist: magicResistTrace,
        attackDamage: attackDamageTrace,
        attackFlatBonusDamage: attackFlatBonusDamageTrace,
        abilityPower: abilityPowerTrace,
        immune: immuneTrace,
        dodgeChance: dodgeChanceTrace,
        moveCapacity: moveCapacityTrace,
      },
      criticalChance: summoned.criticalChance,
      effectiveCriticalChance,
      criticalChanceLuckDelta,
      criticalMultiplier: summoned.criticalMultiplier,
      dodgeChance: dodgeChanceTrace.effective,
      effectiveDodgeChance,
      dodgeChanceLuckDelta,
      movePoints: summoned.remainingMoves ?? 0,
      maxMovePoints: summoned.maxMovesPerTurn,
      activeAbility: activeProfile
        ? activeProfile.kind === 'attack'
          ? buildEntityActiveSummary({
              rollingHeroEntityId: summoned.ownerHeroEntityId,
              active: activeProfile,
              minimumTrace: resolveNumberTrace({
                gameApi,
                state,
                targetEntityId: summoned.entityId,
                propertyPath: 'useEntityActive.minimum',
                baseValue: activeProfile.minimumDamage,
                clampMin: 0,
              }),
              maximumTrace: resolveNumberTrace({
                gameApi,
                state,
                targetEntityId: summoned.entityId,
                propertyPath: 'useEntityActive.maximum',
                baseValue: activeProfile.maximumDamage,
                clampMin: 0,
              }),
              attackDamageTrace: activeAttackDamageTrace,
              attackFlatBonusDamageTrace:
                summoned.kind === 'weapon'
                  ? resolveNumberTrace({
                      gameApi,
                      state,
                      targetEntityId: summoned.ownerHeroEntityId,
                      propertyPath: 'attackFlatBonusDamage',
                      baseValue: 0,
                    })
                  : makeStaticNumberTrace(0),
              abilityPowerTrace,
              luck: state.luck,
            })
          : buildEntityActiveSummary({
              rollingHeroEntityId: summoned.ownerHeroEntityId,
              active: activeProfile,
              minimumTrace: makeStaticNumberTrace(0),
              maximumTrace: makeStaticNumberTrace(0),
              attackDamageTrace: makeStaticNumberTrace(0),
              attackFlatBonusDamageTrace: makeStaticNumberTrace(0),
              abilityPowerTrace: makeStaticNumberTrace(0),
              luck: state.luck,
            })
        : undefined,
    }
  }


  return {
    rows,
    columns,
    cells,
    entitiesById: battlefieldEntities,
  }
}
