import { createGameApi } from '../../index.ts'
import type { BattleEvent } from '../../shared/models'
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
    movePoints: number
    maxMovePoints: number
  }>
  heroDetailsByEntityId: Record<
    string,
    {
      heroEntityId: string
      heroDefinitionId: string
      heroName: string
      passiveText: string
      basicAttack: {
        moveCost: number
        damageType: 'physical' | 'magic' | 'true'
        minimumDamage: number
        maximumDamage: number
        attackDamageScaling: number
        abilityPowerScaling: number
        summaryText: string
        currentRangeText: string
      }
    }
  >
  heroHands: Array<{
    heroEntityId: string
    cards: Array<{
      handCardId: string
      cardDefinitionId: string
      cardName: string
      moveCost: number
      cardType: 'ability' | 'weapon' | 'totem' | 'companion'
      rarity: 'common' | 'rare' | 'ultimate' | 'general'
      summaryText: string
      isPlayable: boolean
      targeting: 'none' | 'selectedAny' | 'selectedEnemy' | 'selectedAlly'
      validTargetEntityIds: string[]
      validPlacementPositions: Array<{ row: number; column: number }>
    }>
  }>
  heroActionTargets: Array<{
    heroEntityId: string
    basicAttack: {
      attackerEntityId: string
      moveCost: number
      validTargetEntityIds: string[]
    }
    pressLuck: {
      moveCost: number
    }
    entityActive: Array<{
      sourceEntityId: string
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
    entitiesById: Record<
      string,
      {
        entityId: string
        kind: 'hero' | 'weapon' | 'totem' | 'companion'
        ownerHeroEntityId: string
        displayName: string
        sourceCardName: string | null
        sourceCardSummary: string | null
        currentHealth: number
        maxHealth: number
        armor: number
        magicResist: number
        attackDamage: number
        abilityPower: number
        criticalChance: number
        criticalMultiplier: number
        dodgeChance: number
        movePoints: number
        maxMovePoints: number
        activeAbility?: {
          moveCost: number
          damageType: 'physical' | 'magic' | 'true'
          canBeDodged: boolean
          summaryText: string
          currentRangeText: string
        }
      }
    >
  }
}

function formatPreviewNumber(value: number): string {
  const rounded = Math.round(value * 100) / 100
  return Number.isInteger(rounded) ? `${rounded}` : `${rounded}`
}

function buildHeroBasicAttackSummary(options: {
  heroName: string
  attack: {
    minimumDamage: number
    maximumDamage: number
    attackDamageScaling: number
    abilityPowerScaling: number
    damageType: 'physical' | 'magic' | 'true'
  }
  currentAttackDamage: number
  currentAbilityPower: number
}): {
  summaryText: string
  currentRangeText: string
} {
  const { heroName, attack, currentAttackDamage, currentAbilityPower } = options
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
    attack.minimumDamage +
    currentAttackDamage * attack.attackDamageScaling +
    currentAbilityPower * attack.abilityPowerScaling
  const maximum =
    attack.maximumDamage +
    currentAttackDamage * attack.attackDamageScaling +
    currentAbilityPower * attack.abilityPowerScaling

  return {
    summaryText: `${heroName} basic attack. ${summaryText}`,
    currentRangeText: `Current window: ${formatPreviewNumber(minimum)} to ${formatPreviewNumber(maximum)} ${attack.damageType} damage before dodge and resistance.`,
  }
}

function buildEntityActiveSummary(options: {
  attack: {
    minimumDamage: number
    maximumDamage: number
    attackDamageScaling: number
    abilityPowerScaling: number
    damageType: 'physical' | 'magic' | 'true'
    moveCost: number
    canBeDodged: boolean
  }
  currentAttackDamage: number
  currentAbilityPower: number
}) {
  const { attack, currentAttackDamage, currentAbilityPower } = options
  const scalingParts = [
    attack.attackDamageScaling > 0
      ? `${formatPreviewNumber(attack.attackDamageScaling * 100)}% AD`
      : null,
    attack.abilityPowerScaling > 0
      ? `${formatPreviewNumber(attack.abilityPowerScaling * 100)}% AP`
      : null,
  ].filter((part): part is string => !!part)

  const summaryText = scalingParts.length > 0
    ? `Base ${formatPreviewNumber(attack.minimumDamage)} to ${formatPreviewNumber(attack.maximumDamage)} ${attack.damageType} + ${scalingParts.join(' + ')}.`
    : `Base ${formatPreviewNumber(attack.minimumDamage)} to ${formatPreviewNumber(attack.maximumDamage)} ${attack.damageType}.`

  const minimum =
    attack.minimumDamage +
    currentAttackDamage * attack.attackDamageScaling +
    currentAbilityPower * attack.abilityPowerScaling
  const maximum =
    attack.maximumDamage +
    currentAttackDamage * attack.attackDamageScaling +
    currentAbilityPower * attack.abilityPowerScaling

  return {
    moveCost: attack.moveCost,
    damageType: attack.damageType,
    canBeDodged: attack.canBeDodged,
    summaryText,
    currentRangeText: `Current window: ${formatPreviewNumber(minimum)} to ${formatPreviewNumber(maximum)} ${attack.damageType} before resistance${attack.canBeDodged ? ' and dodge' : ''}.`,
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

type SessionResolutionSuccess = {
  ok: true
  session: AppBattleSession
  preview: AppBattlePreview
  resultMessage: string
  events: BattleEvent[]
}

type SessionResolutionFailure = {
  ok: false
  reason: string
  session: AppBattleSession
  preview: AppBattlePreview
}

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
  const heroesById = gameApi.heroesById as Record<
    string,
    (typeof gameApi.heroesById)[keyof typeof gameApi.heroesById]
  >
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
      movePoints: entity.movePoints,
      maxMovePoints: entity.maxMovePoints,
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
          cardType: cardDef.type,
          rarity: cardDef.rarity,
          summaryText:
            cardDef.summaryText?.mode === 'static'
              ? cardDef.summaryText.text
              : cardDef.summaryText?.mode === 'template'
                ? cardDef.summaryText.template
                : cardDef.effects[0]?.displayText.mode === 'static'
                  ? cardDef.effects[0].displayText.text
                  : cardDef.effects[0]?.displayText.mode === 'template'
                    ? cardDef.effects[0].displayText.template
                    : 'No summary.',
          isPlayable: handCard.isPlayable ?? false,
          targeting: cardDef.targeting,
          validTargetEntityIds: handCard.validTargetEntityIds ?? [],
          validPlacementPositions: handCard.validPlacementPositions ?? [],
        }
      }),
    }
  })

  const heroDetailsByEntityId: AppBattlePreview['heroDetailsByEntityId'] = {}
  for (const heroEntityId of state.heroEntityIds) {
    const entity = state.entitiesById[heroEntityId]

    if (!entity || entity.kind !== 'hero') {
      throw new Error(`Expected hero entity in battle state for '${heroEntityId}'.`)
    }

    const heroDef = heroesById[entity.heroDefinitionId]
    if (!heroDef) {
      throw new Error(`Missing hero definition '${entity.heroDefinitionId}' while building preview.`)
    }

    const basicAttack = buildHeroBasicAttackSummary({
      heroName: heroDef.name,
      attack: heroDef.basicAttack,
      currentAttackDamage: entity.attackDamage,
      currentAbilityPower: entity.abilityPower,
    })

    heroDetailsByEntityId[heroEntityId] = {
      heroEntityId,
      heroDefinitionId: entity.heroDefinitionId,
      heroName: heroDef.name,
      passiveText: heroDef.passiveText,
      basicAttack: {
        moveCost: heroDef.basicAttack.moveCost,
        damageType: heroDef.basicAttack.damageType,
        minimumDamage: heroDef.basicAttack.minimumDamage,
        maximumDamage: heroDef.basicAttack.maximumDamage,
        attackDamageScaling: heroDef.basicAttack.attackDamageScaling,
        abilityPowerScaling: heroDef.basicAttack.abilityPowerScaling,
        summaryText: basicAttack.summaryText,
        currentRangeText: basicAttack.currentRangeText,
      },
    }
  }

  const heroActionTargets = state.heroEntityIds.map((heroEntityId) => {
    const entity = state.entitiesById[heroEntityId]

    if (!entity || entity.kind !== 'hero') {
      throw new Error(`Expected hero entity in battle state for '${heroEntityId}'.`)
    }

    return {
      heroEntityId,
      basicAttack: {
        attackerEntityId: entity.entityId,
        moveCost: entity.basicAttackMoveCost,
        validTargetEntityIds: entity.basicAttackTargetEntityIds ?? [],
      },
      pressLuck: {
        moveCost: 3,
      },
      entityActive: entity.entityActiveOptions ?? [],
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

  const battlefieldEntities: AppBattlePreview['battlefield']['entitiesById'] = {}
  for (const entity of Object.values(state.entitiesById)) {
    if (entity.kind === 'hero') {
      const heroDef = heroesById[entity.heroDefinitionId]
      battlefieldEntities[entity.entityId] = {
        entityId: entity.entityId,
        kind: 'hero',
        ownerHeroEntityId: entity.entityId,
        displayName: heroDef?.name ?? entity.heroDefinitionId,
        sourceCardName: null,
        sourceCardSummary: null,
        currentHealth: entity.currentHealth,
        maxHealth: entity.maxHealth,
        armor: entity.armor,
        magicResist: entity.magicResist,
        attackDamage: entity.attackDamage,
        abilityPower: entity.abilityPower,
        criticalChance: entity.criticalChance,
        criticalMultiplier: entity.criticalMultiplier,
        dodgeChance: entity.dodgeChance,
        movePoints: entity.movePoints,
        maxMovePoints: entity.maxMovePoints,
      }
      continue
    }

    const sourceCard = cardsById[entity.definitionCardId]
    const sourceCardSummary =
      sourceCard?.summaryText?.mode === 'static'
        ? sourceCard.summaryText.text
        : sourceCard?.summaryText?.mode === 'template'
          ? sourceCard.summaryText.template
          : sourceCard?.effects[0]?.displayText.mode === 'static'
            ? sourceCard.effects[0].displayText.text
            : sourceCard?.effects[0]?.displayText.mode === 'template'
              ? sourceCard.effects[0].displayText.template
              : null

    const activeProfile =
      entity.kind === 'weapon' || entity.kind === 'companion'
        ? gameApi.resolveEntityActiveProfile({
            sourceDefinitionCardId: entity.definitionCardId,
            sourceKind: entity.kind,
          })
        : undefined

    battlefieldEntities[entity.entityId] = {
      entityId: entity.entityId,
      kind: entity.kind,
      ownerHeroEntityId: entity.ownerHeroEntityId,
      displayName: sourceCard?.name ?? entity.definitionCardId,
      sourceCardName: sourceCard?.name ?? entity.definitionCardId,
      sourceCardSummary,
      currentHealth: entity.currentHealth,
      maxHealth: entity.maxHealth,
      armor: entity.armor,
      magicResist: entity.magicResist,
      attackDamage: entity.attackDamage,
      abilityPower: entity.abilityPower,
      criticalChance: entity.criticalChance,
      criticalMultiplier: entity.criticalMultiplier,
      dodgeChance: entity.dodgeChance,
      movePoints: entity.remainingMoves,
      maxMovePoints: entity.maxMovesPerTurn,
      activeAbility: activeProfile
        ? buildEntityActiveSummary({
            attack: activeProfile,
            currentAttackDamage: entity.attackDamage,
            currentAbilityPower: entity.abilityPower,
          })
        : undefined,
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
    heroDetailsByEntityId,
    heroHands,
    heroActionTargets,
    battlefield: {
      rows,
      columns,
      cells,
      entitiesById: battlefieldEntities,
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
  targetPosition?: { row: number; column: number }
}):
  | SessionResolutionSuccess
  | SessionResolutionFailure {
  const { session, actorHeroEntityId, handCardId, targetEntityId, targetPosition } = options

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
        targetPosition,
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
    resultMessage: result.resultMessage,
    events: result.events,
  }
}

export function resolveSessionSimpleAction(options: {
  session: AppBattleSession
  actorHeroEntityId: string
  kind: 'pressLuck' | 'endTurn'
}):
  | SessionResolutionSuccess
  | SessionResolutionFailure {
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
    resultMessage: result.resultMessage,
    events: result.events,
  }
}

export function resolveSessionBasicAttack(options: {
  session: AppBattleSession
  actorHeroEntityId: string
  attackerEntityId: string
  targetEntityId: string
}):
  | SessionResolutionSuccess
  | SessionResolutionFailure {
  const { session, actorHeroEntityId, attackerEntityId, targetEntityId } = options

  const result = session.gameApi.resolveAction({
    state: session.state,
    nextSequence: session.nextSequence,
    battleRng: session.battleRng,
    createSummonedEntityId,
    action: {
      kind: 'basicAttack',
      actorHeroEntityId,
      attackerEntityId,
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
    resultMessage: result.resultMessage,
    events: result.events,
  }
}

export function resolveSessionUseEntityActive(options: {
  session: AppBattleSession
  actorHeroEntityId: string
  sourceEntityId: string
  targetEntityId: string
}):
  | SessionResolutionSuccess
  | SessionResolutionFailure {
  const { session, actorHeroEntityId, sourceEntityId, targetEntityId } = options

  const result = session.gameApi.resolveAction({
    state: session.state,
    nextSequence: session.nextSequence,
    battleRng: session.battleRng,
    createSummonedEntityId,
    action: {
      kind: 'useEntityActive',
      actorHeroEntityId,
      sourceEntityId,
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
    resultMessage: result.resultMessage,
    events: result.events,
  }
}

export function createInitialBattlePreview(
  config: GameBootstrapConfig = DEFAULT_GAME_BOOTSTRAP_CONFIG,
): AppBattlePreview {
  return createInitialBattleSession(config).preview
}