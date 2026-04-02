import { createGameApi } from '../../index.ts'
import {
  DEFAULT_GAME_BOOTSTRAP_CONFIG,
  type GameBootstrapConfig,
  type HeroBootstrapConfig,
} from './data/game-bootstrap.ts'

export type AppBattlePreview = {
  battleId: string
  seed: string
  heroEntityIds: [string, string]
  activeHeroEntityId: string
  luck: {
    anchorHeroEntityId: string
    balance: number
  }
  heroHandCounts: Array<{
    heroEntityId: string
    handSize: number
    deckSize: number
    battlefieldSide: 'north' | 'south'
  }>
  heroHands: Array<{
    heroEntityId: string
    cards: Array<{
      handCardId: string
      cardDefinitionId: string
      cardName: string
      moveCost: number
      targeting: 'none' | 'selectedAny' | 'selectedEnemy' | 'selectedAlly'
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
    }
  })

  const heroHands = state.heroEntityIds.map((heroEntityId) => {
    const entity = state.entitiesById[heroEntityId]

    if (!entity || entity.kind !== 'hero') {
      throw new Error(`Expected hero entity in battle state for '${heroEntityId}'.`)
    }

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
          targeting: cardDef.targeting,
          validTargetEntityIds: handCard.validTargetEntityIds ?? [],
        }
      }),
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

  return {
    battleId: state.battleId,
    seed: state.seed,
    heroEntityIds: state.heroEntityIds,
    activeHeroEntityId: state.turn.activeHeroEntityId,
    luck: {
      anchorHeroEntityId: state.luck.anchorHeroEntityId,
      balance: state.luck.balance,
    },
    heroHandCounts,
    heroHands,
    battlefield: {
      rows,
      columns,
      cells,
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
}):
  | { ok: true; session: AppBattleSession; preview: AppBattlePreview }
  | { ok: false; reason: string; session: AppBattleSession; preview: AppBattlePreview } {
  const { session, actorHeroEntityId, handCardId, targetEntityId } = options

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
  }
}

export function resolveSessionSimpleAction(options: {
  session: AppBattleSession
  actorHeroEntityId: string
  kind: 'pressLuck' | 'endTurn'
}):
  | { ok: true; session: AppBattleSession; preview: AppBattlePreview }
  | { ok: false; reason: string; session: AppBattleSession; preview: AppBattlePreview } {
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
  }
}

export function createInitialBattlePreview(
  config: GameBootstrapConfig = DEFAULT_GAME_BOOTSTRAP_CONFIG,
): AppBattlePreview {
  return createInitialBattleSession(config).preview
}