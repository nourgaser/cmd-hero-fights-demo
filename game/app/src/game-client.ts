import { createGameApi } from '../../index.ts'

export type AppBattlePreview = {
  battleId: string
  seed: string
  heroEntityIds: [string, string]
  activeHeroEntityId: string
  heroHandCounts: Array<{ heroEntityId: string; handSize: number; deckSize: number }>
}

export function createInitialBattlePreview(seed: string): AppBattlePreview {
  const gameApi = createGameApi()
  const heroIds = Object.keys(gameApi.heroesById)

  if (heroIds.length === 0) {
    throw new Error('No heroes available in game API.')
  }

  const primaryHeroId = heroIds[0] as keyof typeof gameApi.heroesById
  const heroDefinition = gameApi.heroesById[primaryHeroId]
  const openingDeckCardIds = Object.keys(gameApi.cardsById)

  const createdBattle = gameApi.createBattle({
    battleId: 'demo-battle-001',
    seed,
    battlefieldRows: 8,
    battlefieldColumns: 7,
    openingHandSize: 4,
    heroes: [
      {
        heroEntityId: 'hero-a',
        hero: heroDefinition,
        openingMovePoints: 3,
        openingDeckCardIds,
        startAnchorPosition: { row: 1, column: 2 },
      },
      {
        heroEntityId: 'hero-b',
        hero: heroDefinition,
        openingMovePoints: 3,
        openingDeckCardIds,
        startAnchorPosition: { row: 6, column: 2 },
      },
    ],
  })

  const heroHandCounts = createdBattle.state.heroEntityIds.map((heroEntityId) => {
    const entity = createdBattle.state.entitiesById[heroEntityId]

    if (!entity || entity.kind !== 'hero') {
      throw new Error(`Expected hero entity in battle state for '${heroEntityId}'.`)
    }

    return {
      heroEntityId,
      handSize: entity.handCards.length,
      deckSize: entity.deckCardIds.length,
    }
  })

  return {
    battleId: createdBattle.state.battleId,
    seed: createdBattle.state.seed,
    heroEntityIds: createdBattle.state.heroEntityIds,
    activeHeroEntityId: createdBattle.state.turn.activeHeroEntityId,
    heroHandCounts,
  }
}