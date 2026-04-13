import type { BattleAction, BattleEvent } from '../../shared/models'
import {
  type AppBattlePreview,
  buildPreviewFromState,
} from './game-client-preview'
import {
  type AppActionHistoryEntry,
  type AppBattleSession,
  type AppBattleSnapshot,
  type AppBattleApi,
} from './game-client'

import { type GameBootstrapConfig } from './data/game-bootstrap'

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

export function createInitialBattleSession(options: {
  gameApi: AppBattleApi
  config: GameBootstrapConfig
}): {
  session: AppBattleSession
  preview: AppBattlePreview
} {
  const { gameApi, config } = options

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
    heroes: [
      {
        heroEntityId: heroA.heroEntityId,
        heroDefinitionId: heroA.heroDefinitionId,
        openingMovePoints: heroA.openingMovePoints,
        openingDeckCardIds: [...heroA.openingDeckCardIds],
        startAnchorPosition: heroA.startAnchorPosition,
      },
      {
        heroEntityId: heroB.heroEntityId,
        heroDefinitionId: heroB.heroDefinitionId,
        openingMovePoints: heroB.openingMovePoints,
        openingDeckCardIds: [...heroB.openingDeckCardIds],
        startAnchorPosition: heroB.startAnchorPosition,
      },
    ],
    registry: gameApi.GAME_CONTENT_REGISTRY,
  })

  const initialSnapshot: AppBattleSnapshot = {
    id: 0,
    phase: 'pre',
    turnNumber: 1,
    actorHeroEntityId: createdBattle.state.turn.activeHeroEntityId,
    actionKind: 'endTurn', // Placeholder
    action: { kind: 'endTurn', actorHeroEntityId: createdBattle.state.turn.activeHeroEntityId },
    state: createdBattle.state,
    nextSequence: 0,
    resultMessage: 'Battle started.',
    success: true,
    events: [],
    rngCheckpoint: {
      seed: config.seed,
      stepCount: 0,
    },
  }

  const session: AppBattleSession = {
    gameApi,
    state: createdBattle.state,
    battleRng: createdBattle.rng,
    nextSequence: 0,
    history: [],
    snapshots: [initialSnapshot],
    activeSnapshotId: null,
    nextHistoryEntryId: 1,
    nextSnapshotId: 1,
  }

  return {
    session,
    preview: buildPreviewFromState({ gameApi, state: createdBattle.state }),
  }
}

export type SessionResolutionResult =
  | { ok: true; session: AppBattleSession; preview: AppBattlePreview; events: BattleEvent[]; resultMessage: string }
  | { ok: false; reason: string; session: AppBattleSession; preview: AppBattlePreview }

export function resolveSessionAction(options: {
  session: AppBattleSession
  action: BattleAction
}): SessionResolutionResult {
  const { session, action } = options

  const preSnapshotId = session.nextSnapshotId
  const postSnapshotId = session.nextSnapshotId + 1
  const turnNumber = session.state.turn.turnNumber

  const result = session.gameApi.resolveAction({
    state: session.state,
    action,
    nextSequence: session.nextSequence,
    battleRng: session.battleRng,
    registry: session.gameApi.GAME_CONTENT_REGISTRY,
    createSummonedEntityId,
  })

  const historyEntry: AppActionHistoryEntry = {
    id: session.nextHistoryEntryId,
    turnNumber,
    actorHeroEntityId: action.actorHeroEntityId,
    actionKind: action.kind,
    resultMessage: result.ok ? result.resultMessage : result.reason,
    success: result.ok,
    failureReason: !result.ok ? result.reason : undefined,
    eventCount: result.ok ? result.events.length : 0,
    preSnapshotId,
    postSnapshotId,
  }

  const preSnapshot: AppBattleSnapshot = {
    id: preSnapshotId,
    phase: 'pre',
    turnNumber,
    actorHeroEntityId: action.actorHeroEntityId,
    actionKind: action.kind,
    action: cloneSerializable(action),
    state: cloneSerializable(session.state),
    nextSequence: session.nextSequence,
    resultMessage: historyEntry.resultMessage,
    success: historyEntry.success,
    failureReason: historyEntry.failureReason,
    events: [],
    rngCheckpoint: {
      seed: session.battleRng.seed,
      stepCount: session.battleRng.stepCount,
    },
  }

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
      rngCheckpoint: {
        seed: session.battleRng.seed,
        stepCount: session.battleRng.stepCount,
      },
    }

    const nextSession: AppBattleSession = {
      ...session,
      history: [...session.history, historyEntry],
      snapshots: [...session.snapshots, preSnapshot, postSnapshot],
      nextHistoryEntryId: session.nextHistoryEntryId + 1,
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
    events: result.events,
    rngCheckpoint: {
      seed: session.battleRng.seed,
      stepCount: session.battleRng.stepCount,
    },
  }

  const nextSession: AppBattleSession = {
    ...session,
    state: result.state,
    nextSequence: result.nextSequence,
    history: [...session.history, historyEntry],
    snapshots: [...session.snapshots, preSnapshot, postSnapshot],
    nextHistoryEntryId: session.nextHistoryEntryId + 1,
    nextSnapshotId: postSnapshotId + 1,
  }

  return {
    ok: true,
    session: nextSession,
    preview: buildPreviewFromState({ gameApi: session.gameApi, state: nextSession.state }),
    events: result.events,
    resultMessage: result.resultMessage,
  }
}

export function resolveSessionPlayCard(options: {
  session: AppBattleSession
  actorHeroEntityId: string
  handCardId: string
  targetEntityId?: string
  targetPosition?: { row: number; column: number }
}): SessionResolutionResult {
  return resolveSessionAction({
    session: options.session,
    action: {
      kind: 'playCard',
      actorHeroEntityId: options.actorHeroEntityId,
      handCardId: options.handCardId,
      selection: {
        targetEntityId: options.targetEntityId,
        targetPosition: options.targetPosition,
      },
    },
  })
}

export function resolveSessionBasicAttack(options: {
  session: AppBattleSession
  actorHeroEntityId: string
  attackerEntityId: string
  targetEntityId: string
}): SessionResolutionResult {
  return resolveSessionAction({
    session: options.session,
    action: {
      kind: 'basicAttack',
      actorHeroEntityId: options.actorHeroEntityId,
      attackerEntityId: options.attackerEntityId,
      selection: {
        targetEntityId: options.targetEntityId,
      },
    },
  })
}

export function resolveSessionUseEntityActive(options: {
  session: AppBattleSession
  actorHeroEntityId: string
  sourceEntityId: string
  targetEntityId?: string
}): SessionResolutionResult {
  return resolveSessionAction({
    session: options.session,
    action: {
      kind: 'useEntityActive',
      actorHeroEntityId: options.actorHeroEntityId,
      sourceEntityId: options.sourceEntityId,
      selection: {
        targetEntityId: options.targetEntityId,
      },
    },
  })
}

export function resolveSessionSimpleAction(options: {
  session: AppBattleSession
  actorHeroEntityId: string
  kind: 'pressLuck' | 'endTurn'
}): SessionResolutionResult {
  return resolveSessionAction({
    session: options.session,
    action: {
      kind: options.kind,
      actorHeroEntityId: options.actorHeroEntityId,
    } as BattleAction,
  })
}

export type SnapshotSessionResult =
  | { ok: true; session: AppBattleSession; preview: AppBattlePreview }
  | { ok: false; reason: string }

export function jumpSessionToSnapshot(options: {
  session: AppBattleSession
  snapshotId: number
}): SnapshotSessionResult {
  const { session, snapshotId } = options
  const snapshot = session.snapshots.find((s) => s.id === snapshotId)
  if (!snapshot) {
    return { ok: false, reason: `Snapshot ${snapshotId} not found.` }
  }

  const nextSession: AppBattleSession = {
    ...session,
    state: snapshot.state,
    nextSequence: snapshot.nextSequence,
    activeSnapshotId: snapshotId,
  }

  return {
    ok: true,
    session: nextSession,
    preview: buildPreviewFromState({ gameApi: session.gameApi, state: nextSession.state }),
  }
}

export function branchSessionFromSnapshot(options: {
  session: AppBattleSession
  snapshotId: number
}): SnapshotSessionResult {
  const { session, snapshotId } = options
  const snapshot = session.snapshots.find((s) => s.id === snapshotId)
  if (!snapshot) {
    return { ok: false, reason: `Snapshot ${snapshotId} not found.` }
  }

  const nextSession: AppBattleSession = {
    ...session,
    state: snapshot.state,
    nextSequence: snapshot.nextSequence,
    activeSnapshotId: null,
    history: session.history.filter((h) => h.postSnapshotId <= snapshotId),
    snapshots: session.snapshots.filter((s) => s.id <= snapshotId),
    nextSnapshotId: snapshotId + 1,
  }

  return {
    ok: true,
    session: nextSession,
    preview: buildPreviewFromState({ gameApi: session.gameApi, state: nextSession.state }),
  }
}

export function replaySessionFromActionLog(options: {
  gameApi: AppBattleApi
  config: GameBootstrapConfig
  actionLog: Array<{ action: BattleAction; success?: boolean }>
  snapshotId: number | null
}): SnapshotSessionResult {
  const { gameApi, config, actionLog, snapshotId } = options
  let runtime = createInitialBattleSession({ gameApi, config })

  for (const entry of actionLog) {
    const action = entry.action
    let result: SessionResolutionResult

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

    if (!result.ok) {
      if (!entry.success) {
        runtime = {
          session: result.session,
          preview: result.preview,
        }
        continue
      }
      return { ok: false, reason: `Replay failed at action: ${action.kind}. Reason: ${result.reason}` }
    }

    runtime = {
      session: result.session,
      preview: result.preview,
    }
  }

  if (snapshotId !== null) {
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
