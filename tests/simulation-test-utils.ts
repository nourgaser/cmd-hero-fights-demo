import { expect } from 'vitest'

import { createRuntimeFromConfig } from '../game/app/src/app-shell/runtime-utils'
import {
  resolveSessionPlayCard,
  resolveSessionBasicAttack,
  resolveSessionUseEntityActive,
  resolveSessionSimpleAction,
  type SessionResolutionResult,
} from '../game/app/src/game-client-session'
import type { AppBattleSession } from '../game/app/src/game-client'
import type { AppBattlePreview } from '../game/app/src/game-client-preview/types'
import type { BattleEvent, BattlefieldEntityState, SummonedEntityState } from '../game/shared/models'
import {
  CARD_IDS,
  HERO_IDS,
  STARTER_DECKS,
  DEFAULT_GAME_BOOTSTRAP_CONFIG,
  type GameBootstrapConfig,
} from '../game/app/src/data/game-bootstrap'
import { SUMMON_ENTITY_IDS } from '../game/content/commander_x/constants'

// ── Re-exports ──────────────────────────────────────────────────────────────

export { CARD_IDS, HERO_IDS, STARTER_DECKS, DEFAULT_GAME_BOOTSTRAP_CONFIG, SUMMON_ENTITY_IDS }
export type { GameBootstrapConfig }

// ── Core type ───────────────────────────────────────────────────────────────

export type Sim = {
  session: AppBattleSession
  preview: AppBattlePreview
  lastEvents: BattleEvent[]
  allEvents: BattleEvent[]
}

// ── Setup ───────────────────────────────────────────────────────────────────

type CreateSimOptions = {
  seed?: string
  deck?: string[]
  opponentDeck?: string[]
  openingHandSize?: number
  openingMovePoints?: number
}

function createSim(optionsOrConfig?: CreateSimOptions | GameBootstrapConfig): Sim {
  const config =
    optionsOrConfig && 'battleId' in optionsOrConfig
      ? optionsOrConfig
      : buildConfig(optionsOrConfig ?? {})

  const runtime = createRuntimeFromConfig(config)
  return {
    session: runtime.session,
    preview: runtime.preview,
    lastEvents: [],
    allEvents: [],
  }
}

function buildConfig(options: CreateSimOptions): GameBootstrapConfig {
  const [heroA, heroB] = DEFAULT_GAME_BOOTSTRAP_CONFIG.heroes
  return {
    ...DEFAULT_GAME_BOOTSTRAP_CONFIG,
    seed: options.seed ?? 'test-seed',
    openingHandSize: options.openingHandSize ?? DEFAULT_GAME_BOOTSTRAP_CONFIG.openingHandSize,
    heroes: [
      {
        ...heroA,
        openingDeckCardIds: options.deck ? [...options.deck] : [...STARTER_DECKS.commanderXCore],
        openingMovePoints: options.openingMovePoints ?? heroA.openingMovePoints,
      },
      {
        ...heroB,
        openingDeckCardIds: options.opponentDeck
          ? [...options.opponentDeck]
          : options.deck
            ? [...options.deck]
            : [...STARTER_DECKS.commanderXCore],
        openingMovePoints: options.openingMovePoints ?? heroB.openingMovePoints,
      },
    ],
  }
}

// ── Internal helpers ────────────────────────────────────────────────────────

function advanceSim(sim: Sim, result: SessionResolutionResult, expectFailure: boolean): Sim {
  if (!result.ok && !expectFailure) {
    throw new Error(`Action failed unexpectedly: ${result.reason}`)
  }
  if (result.ok && expectFailure) {
    throw new Error('Action succeeded but was expected to fail')
  }

  const events = result.ok ? result.events : []
  return {
    session: result.session,
    preview: result.preview,
    lastEvents: events,
    allEvents: [...sim.allEvents, ...events],
  }
}

export const TEST_SIM = {
  createSim,
  buildConfig,
  advanceSim,
}

// ── Actions ─────────────────────────────────────────────────────────────────

function playCard(
  sim: Sim,
  cardDefinitionId: string,
  options?: {
    targetEntityId?: string
    targetPosition?: { row: number; column: number }
    expectFailure?: boolean
  },
): Sim {
  const heroEntityId = sim.preview.activeHeroEntityId
  const heroHand = sim.preview.heroHands.find((h) => h.heroEntityId === heroEntityId)
  if (!heroHand) {
    throw new Error(`No hand found for active hero ${heroEntityId}`)
  }

  const matching = heroHand.cards.filter((c) => c.cardDefinitionId === cardDefinitionId)
  if (matching.length === 0) {
    const inHand = heroHand.cards.map((c) => c.cardDefinitionId).join(', ')
    throw new Error(
      `Card ${cardDefinitionId} is not in hand. Cards in hand: [${inHand}]`,
    )
  }

  const playable = matching.find((c) => c.isPlayable)
  if (!playable && !options?.expectFailure) {
    throw new Error(
      `Card ${cardDefinitionId} is in hand but not playable (not enough move points or cast condition not met)`,
    )
  }

  const card = playable ?? matching[0]!

  const targetEntityId = options?.targetEntityId
  const targetPosition =
    options?.targetPosition ??
    (card.validPlacementPositions.length > 0 ? card.validPlacementPositions[0] : undefined)

  if (
    !targetEntityId &&
    card.validTargetEntityIds.length > 0 &&
    card.validPlacementPositions.length === 0
  ) {
    throw new Error(
      `Card ${cardDefinitionId} requires a target. Valid targets: [${card.validTargetEntityIds.join(', ')}]`,
    )
  }

  const result = resolveSessionPlayCard({
    session: sim.session,
    actorHeroEntityId: heroEntityId,
    handCardId: card.handCardId,
    targetEntityId,
    targetPosition,
  })

  return advanceSim(sim, result, options?.expectFailure ?? false)
}

function basicAttack(sim: Sim, targetEntityId: string): Sim {
  const heroEntityId = sim.preview.activeHeroEntityId
  const result = resolveSessionBasicAttack({
    session: sim.session,
    actorHeroEntityId: heroEntityId,
    attackerEntityId: heroEntityId,
    targetEntityId,
  })
  return advanceSim(sim, result, false)
}

function useEntityActive(sim: Sim, sourceEntityId: string, targetEntityId?: string): Sim {
  const result = resolveSessionUseEntityActive({
    session: sim.session,
    actorHeroEntityId: sim.preview.activeHeroEntityId,
    sourceEntityId,
    targetEntityId,
  })
  return advanceSim(sim, result, false)
}

function endTurn(sim: Sim): Sim {
  const result = resolveSessionSimpleAction({
    session: sim.session,
    actorHeroEntityId: sim.preview.activeHeroEntityId,
    kind: 'endTurn',
  })
  return advanceSim(sim, result, false)
}

function pressLuck(sim: Sim): Sim {
  const result = resolveSessionSimpleAction({
    session: sim.session,
    actorHeroEntityId: sim.preview.activeHeroEntityId,
    kind: 'pressLuck',
  })
  return advanceSim(sim, result, false)
}

export const TEST_ACTIONS = {
  playCard,
  basicAttack,
  useEntityActive,
  endTurn,
  pressLuck,
}

// ── Queries ─────────────────────────────────────────────────────────────────

function getEntity(sim: Sim, entityId: string): BattlefieldEntityState {
  const entity = sim.session.state.entitiesById[entityId]
  if (!entity) {
    throw new Error(`Entity ${entityId} not found in state`)
  }
  return entity
}

function getEntityPreview(sim: Sim, entityId: string) {
  const entity = sim.preview.battlefield.entitiesById[entityId]
  if (!entity) {
    throw new Error(`Entity ${entityId} not found in preview`)
  }
  return entity
}

function findEntitiesByCard(sim: Sim, cardDefinitionId: string): SummonedEntityState[] {
  return Object.values(sim.session.state.entitiesById).filter(
    (e): e is SummonedEntityState => e.kind !== 'hero' && e.definitionCardId === cardDefinitionId,
  )
}

function findEntityByCard(sim: Sim, cardDefinitionId: string): SummonedEntityState {
  const entities = findEntitiesByCard(sim, cardDefinitionId)
  if (entities.length === 0) {
    throw new Error(`No summoned entity found for card ${cardDefinitionId}`)
  }
  return entities[0]!
}

function getActiveHero(sim: Sim): string {
  return sim.preview.activeHeroEntityId
}

function getOpponentHero(sim: Sim): string {
  return sim.preview.heroEntityIds.find((id) => id !== sim.preview.activeHeroEntityId)!
}

function getHand(sim: Sim, heroEntityId?: string) {
  const id = heroEntityId ?? sim.preview.activeHeroEntityId
  const hand = sim.preview.heroHands.find((h) => h.heroEntityId === id)
  if (!hand) {
    throw new Error(`No hand found for hero ${id}`)
  }
  return hand.cards
}

function getHandCardIds(sim: Sim, heroEntityId?: string): string[] {
  return getHand(sim, heroEntityId).map((c) => c.cardDefinitionId)
}

function eventsOfKind<K extends BattleEvent['kind']>(
  events: BattleEvent[],
  kind: K,
): Extract<BattleEvent, { kind: K }>[] {
  return events.filter((e): e is Extract<BattleEvent, { kind: K }> => e.kind === kind)
}

function expectEventsOfKind<K extends BattleEvent['kind']>(
  events: BattleEvent[],
  kind: K,
) {
  return expect(eventsOfKind(events, kind))
}

export const TEST_QUERIES = {
  getEntity,
  getEntityPreview,
  findEntitiesByCard,
  findEntityByCard,
  getActiveHero,
  getOpponentHero,
  getHand,
  getHandCardIds,
  eventsOfKind,
  expectEventsOfKind,
}

// ── Assertions ──────────────────────────────────────────────────────────────

function expectHealth(sim: Sim, entityId: string, expected: number): void {
  expect(getEntity(sim, entityId).currentHealth).toBe(expected)
}

function expectArmor(sim: Sim, entityId: string, expected: number): void {
  expect(getEntity(sim, entityId).armor).toBe(expected)
}

function expectAttackDamage(sim: Sim, entityId: string, expected: number): void {
  expect(getEntity(sim, entityId).attackDamage).toBe(expected)
}

function expectEntityExists(sim: Sim, entityId: string): void {
  expect(sim.session.state.entitiesById[entityId]).toBeDefined()
}

function expectEntityRemoved(sim: Sim, entityId: string): void {
  expect(sim.session.state.entitiesById[entityId]).toBeUndefined()
}

function expectDamageDealt(
  events: BattleEvent[],
  opts: {
    targetEntityId: string
    amount?: number
    damageType?: string
    wasDodged?: boolean
    wasCritical?: boolean
  },
): void {
  const matches = eventsOfKind(events, 'damageApplied').filter(
    (e) => e.targetEntityId === opts.targetEntityId,
  )
  expect(matches.length).toBeGreaterThan(0)

  const event = matches[0]!
  if (opts.amount !== undefined) expect(event.amount).toBe(opts.amount)
  if (opts.damageType !== undefined) expect(event.damageType).toBe(opts.damageType)
  if (opts.wasDodged !== undefined) expect(event.wasDodged).toBe(opts.wasDodged)
  if (opts.wasCritical !== undefined) expect(event.wasCritical).toBe(opts.wasCritical)
}

function expectHealApplied(
  events: BattleEvent[],
  opts: {
    targetEntityId: string
    amount?: number
  },
): void {
  const matches = eventsOfKind(events, 'healApplied').filter(
    (e) => e.targetEntityId === opts.targetEntityId,
  )
  expect(matches.length).toBeGreaterThan(0)

  if (opts.amount !== undefined) expect(matches[0]!.amount).toBe(opts.amount)
}

function expectEntitySummoned(
  events: BattleEvent[],
  opts?: { ownerHeroEntityId?: string },
) {
  const matches = eventsOfKind(events, 'entitySummoned').filter(
    (e) => !opts?.ownerHeroEntityId || e.ownerHeroEntityId === opts.ownerHeroEntityId,
  )
  expect(matches.length).toBeGreaterThan(0)
  return matches[0]!
}

function expectListenerTriggered(events: BattleEvent[], listenerId: string): void {
  const matches = eventsOfKind(events, 'listenerTriggered').filter(
    (e) => e.listenerId === listenerId,
  )
  expect(matches.length).toBeGreaterThan(0)
}

function expectActiveListener(sim: Sim, listenerId: string): void {
  expect(sim.session.state.activeListeners.some((l) => l.listenerId === listenerId)).toBe(true)
}

function expectNoActiveListener(sim: Sim, listenerId: string): void {
  expect(sim.session.state.activeListeners.some((l) => l.listenerId === listenerId)).toBe(false)
}

function expectActiveAura(sim: Sim, auraKind: string): void {
  expect(sim.session.state.activeAuras.some((a) => a.kind === auraKind)).toBe(true)
}

function expectHandSize(sim: Sim, heroEntityId: string, expected: number): void {
  const counts = sim.preview.heroHandCounts.find((h) => h.heroEntityId === heroEntityId)
  expect(counts).toBeDefined()
  expect(counts!.handSize).toBe(expected)
}

function expectTurn(
  sim: Sim,
  expected: { turnNumber?: number; activeHeroEntityId?: string },
): void {
  if (expected.turnNumber !== undefined) {
    expect(sim.preview.turn.turnNumber).toBe(expected.turnNumber)
  }
  if (expected.activeHeroEntityId !== undefined) {
    expect(sim.preview.activeHeroEntityId).toBe(expected.activeHeroEntityId)
  }
}

export const TEST_ASSERTIONS = {
  expectHealth,
  expectArmor,
  expectAttackDamage,
  expectEntityExists,
  expectEntityRemoved,
  expectDamageDealt,
  expectHealApplied,
  expectEntitySummoned,
  expectListenerTriggered,
  expectActiveListener,
  expectNoActiveListener,
  expectActiveAura,
  expectHandSize,
  expectTurn,
  eventsOfKind,
  expectEventsOfKind,
}
