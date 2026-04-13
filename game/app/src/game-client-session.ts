import { createGameApi } from '../../index'
import type { BattleAction, BattleEvent } from '../../shared/models'
import {
  DEFAULT_GAME_BOOTSTRAP_CONFIG,
  type GameBootstrapConfig,
  type HeroBootstrapConfig,
} from './data/game-bootstrap'
import {
  type AppActionHistoryEntry,
  type AppBattlePreview,
  type AppBattleSession,
  type AppBattleSnapshot,
  buildPreviewFromState,
} from './game-client'

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

type SnapshotSessionResult =
  | {
      ok: true
      session: AppBattleSession
      preview: AppBattlePreview
    }
  | {
      ok: false
      reason: string
    }

export type AppReplayActionLogEntry = {
  action: BattleAction
}

function cloneSerializable<T>(value: T): T {
  if (typeof structuredClone === 'function') {
    return structuredClone(value)
  }

  return JSON.parse(JSON.stringify(value)) as T
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
    history: [],
    snapshots: [],
    activeSnapshotId: null,
    nextHistoryEntryId: 1,
    nextSnapshotId: 1,
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

  const action: BattleAction = {
    kind: 'playCard',
    actorHeroEntityId,
    handCardId,
    selection: {
      targetEntityId,
      targetPosition,
    },
  }

  return resolveSessionAction({ session, action })
}

function resolveSessionAction(options: {
  session: AppBattleSession
  action: BattleAction
}):
  | SessionResolutionSuccess
  | SessionResolutionFailure {
  const { session, action } = options

  const turnNumber = session.state.turn.turnNumber
  const preSnapshotId = session.nextSnapshotId
  const postSnapshotId = preSnapshotId + 1
  const historyEntryId = session.nextHistoryEntryId

  const preSnapshot: AppBattleSnapshot = {
    id: preSnapshotId,
    phase: 'pre',
    turnNumber,
    actorHeroEntityId: action.actorHeroEntityId,
    actionKind: action.kind,
    action: cloneSerializable(action),
    state: cloneSerializable(session.state),
    nextSequence: session.nextSequence,
    resultMessage: 'Before action resolution.',
    success: true,
    events: [],
    rngCheckpoint: session.battleRng.getCheckpoint(),
  }

  const result = session.gameApi.resolveAction({
    state: session.state,
    nextSequence: session.nextSequence,
    battleRng: session.battleRng,
    createSummonedEntityId,
    action,
  })

  if (!result.ok) {
    const postSnapshot: AppBattleSnapshot = {
      id: postSnapshotId,
      phase: 'post',
      turnNumber,
      actorHeroEntityId: action.actorHeroEntityId,
      actionKind: action.kind,
      action: cloneSerializable(action),
      state: cloneSerializable(result.state),
      nextSequence: session.nextSequence,
      resultMessage: !result.ok ? result.reason : '',
      success: false,
      failureReason: !result.ok ? result.reason : undefined,
      events: [],
      rngCheckpoint: session.battleRng.getCheckpoint(),
    }

    const historyEntry: AppActionHistoryEntry = {
      id: historyEntryId,
      turnNumber,
      actorHeroEntityId: action.actorHeroEntityId,
      actionKind: action.kind,
      resultMessage: !result.ok ? result.reason : '',
      success: false,
      failureReason: !result.ok ? result.reason : undefined,
      eventCount: 0,
      preSnapshotId,
      postSnapshotId,
    }

    const nextSession: AppBattleSession = {
      ...session,
      state: result.state,
      history: [...session.history, historyEntry],
      snapshots: [...session.snapshots, preSnapshot, postSnapshot],
      activeSnapshotId: postSnapshotId,
      nextHistoryEntryId: historyEntryId + 1,
      nextSnapshotId: postSnapshotId + 1,
    }

    return {
      ok: false,
      reason: !result.ok ? result.reason : 'Unknown error',
      session: nextSession,
      preview: buildPreviewFromState({ gameApi: session.gameApi, state: nextSession.state }),
    }
  }

  const postSnapshot: AppBattleSnapshot = {
    id: postSnapshotId,
    phase: 'post',
    turnNumber,
    actorHeroEntityId: action.actorHeroEntityId,
    actionKind: action.kind,
    action: cloneSerializable(action),
    state: cloneSerializable(result.state),
    nextSequence: result.nextSequence,
    resultMessage: result.resultMessage,
    success: true,
    events: cloneSerializable(result.events),
    rngCheckpoint: session.battleRng.getCheckpoint(),
  }

  const historyEntry: AppActionHistoryEntry = {
    id: historyEntryId,
    turnNumber,
    actorHeroEntityId: action.actorHeroEntityId,
    actionKind: action.kind,
    resultMessage: result.resultMessage,
    success: true,
    eventCount: result.events.length,
    preSnapshotId,
    postSnapshotId,
  }

  const nextSession: AppBattleSession = {
    ...session,
    state: result.state,
    nextSequence: result.nextSequence,
    history: [...session.history, historyEntry],
    snapshots: [...session.snapshots, preSnapshot, postSnapshot],
    activeSnapshotId: postSnapshotId,
    nextHistoryEntryId: historyEntryId + 1,
    nextSnapshotId: postSnapshotId + 1,
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

  const action: BattleAction = {
    kind,
    actorHeroEntityId,
  }

  return resolveSessionAction({ session, action })
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

  const action: BattleAction = {
    kind: 'basicAttack',
    actorHeroEntityId,
    attackerEntityId,
    selection: {
      targetEntityId,
    },
  }

  return resolveSessionAction({ session, action })
}

export function resolveSessionUseEntityActive(options: {
  session: AppBattleSession
  actorHeroEntityId: string
  sourceEntityId: string
  targetEntityId?: string
}):
  | SessionResolutionSuccess
  | SessionResolutionFailure {
  const { session, actorHeroEntityId, sourceEntityId, targetEntityId } = options

  const action: BattleAction = {
    kind: 'useEntityActive',
    actorHeroEntityId,
    sourceEntityId,
    selection: {
      targetEntityId: targetEntityId ?? undefined,
    },
  }

  return resolveSessionAction({ session, action })
}

export function createInitialBattlePreview(
  config: GameBootstrapConfig = DEFAULT_GAME_BOOTSTRAP_CONFIG,
): AppBattlePreview {
  return createInitialBattleSession(config).preview
}

export function jumpSessionToSnapshot(options: {
  session: AppBattleSession
  snapshotId: number
}): SnapshotSessionResult {
  const { session, snapshotId } = options
  const snapshot = session.snapshots.find((entry) => entry.id === snapshotId)

  if (!snapshot) {
    return {
      ok: false,
      reason: `Snapshot ${snapshotId} was not found.`,
    }
  }

  const nextSession: AppBattleSession = {
    ...session,
    state: cloneSerializable(snapshot.state),
    nextSequence: snapshot.nextSequence,
    battleRng: session.gameApi.createBattleRngFromCheckpoint(snapshot.rngCheckpoint),
    activeSnapshotId: snapshot.id,
  }

  return {
    ok: true,
    session: nextSession,
    preview: buildPreviewFromState({
      gameApi: session.gameApi,
      state: nextSession.state,
    }),
  }
}

export function branchSessionFromSnapshot(options: {
  session: AppBattleSession
  snapshotId: number
}): SnapshotSessionResult {
  const jumpResult = jumpSessionToSnapshot(options)
  if (!jumpResult.ok) {
    return jumpResult
  }

  const sourceSnapshot = jumpResult.session.snapshots.find((entry) => entry.id === options.snapshotId)
  if (!sourceSnapshot) {
    return {
      ok: false,
      reason: `Snapshot ${options.snapshotId} was not found.`,
    }
  }

  const truncatedSnapshots = jumpResult.session.snapshots.filter((entry) => entry.id <= sourceSnapshot.id)
  const truncatedHistory = jumpResult.session.history.filter((entry) => entry.postSnapshotId <= sourceSnapshot.id)

  const nextSession: AppBattleSession = {
    ...jumpResult.session,
    snapshots: truncatedSnapshots,
    nextSnapshotId: sourceSnapshot.id + 1,
    history: truncatedHistory,
    nextHistoryEntryId: (truncatedHistory.at(-1)?.id ?? 0) + 1,
  }

  return {
    ok: true,
    session: nextSession,
    preview: jumpResult.preview,
  }
}

export function replaySessionFromActionLog(options: {
  config: GameBootstrapConfig
  actionLog: AppReplayActionLogEntry[]
  snapshotId?: number
}):
  | {
      ok: true
      session: AppBattleSession
      preview: AppBattlePreview
    }
  | {
      ok: false
      reason: string
    } {
  const { config, actionLog, snapshotId } = options
  let runtime = createInitialBattleSession(config)

  for (const entry of actionLog) {
    const action = entry.action
    let result: SessionResolutionSuccess | SessionResolutionFailure

    switch (action.kind) {
      case 'playCard':
        result = resolveSessionPlayCard({
          session: runtime.session,
          actorHeroEntityId: action.actorHeroEntityId,
          handCardId: action.handCardId,
          targetEntityId: action.selection.targetEntityId,
          targetPosition: action.selection.targetPosition,
        })
        break
      case 'basicAttack':
        result = resolveSessionBasicAttack({
          session: runtime.session,
          actorHeroEntityId: action.actorHeroEntityId,
          attackerEntityId: action.attackerEntityId,
          targetEntityId: action.selection.targetEntityId,
        })
        break
      case 'useEntityActive':
        result = resolveSessionUseEntityActive({
          session: runtime.session,
          actorHeroEntityId: action.actorHeroEntityId,
          sourceEntityId: action.sourceEntityId,
          targetEntityId: action.selection.targetEntityId,
        })
        break
      case 'pressLuck':
      case 'endTurn':
        result = resolveSessionSimpleAction({
          session: runtime.session,
          actorHeroEntityId: action.actorHeroEntityId,
          kind: action.kind,
        })
        break
      default:
        return {
          ok: false,
          reason: `Unsupported action kind in replay log: ${(action as { kind: string }).kind}`,
        }
    }

    runtime = {
      session: result.session,
      preview: result.preview,
    }
  }

  if (snapshotId !== undefined) {
    const jumpResult = jumpSessionToSnapshot({
      session: runtime.session,
      snapshotId,
    })

    if (!jumpResult.ok) {
      return jumpResult
    }

    return jumpResult
  }

  return {
    ok: true,
    session: runtime.session,
    preview: runtime.preview,
  }
}
