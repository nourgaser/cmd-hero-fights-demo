import type { BattleAction, BattleEvent, BattleState } from '../../shared/models'
import { resolveSelectorToDeterministicEntity } from '../../engine/core/selector-resolution'
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
import type {
  ReplayActionLogEntry,
  ReplayBattleAction,
} from './utils/replay-url'

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

function applyReplayedBattleAction(
  runtime: { session: AppBattleSession; preview: AppBattlePreview },
  action: BattleAction,
): SessionResolutionResult {
  switch (action.kind) {
    case 'playCard':
      return resolveSessionPlayCard({
        session: runtime.session,
        actorHeroEntityId: action.actorHeroEntityId,
        handCardId: action.handCardId,
        targetEntityId: action.selection.targetEntityId,
        targetPosition: action.selection.targetPosition,
      })
    case 'basicAttack':
      return resolveSessionBasicAttack({
        session: runtime.session,
        actorHeroEntityId: action.actorHeroEntityId,
        attackerEntityId: action.attackerEntityId,
        targetEntityId: action.selection.targetEntityId,
      })
    case 'useEntityActive':
      return resolveSessionUseEntityActive({
        session: runtime.session,
        actorHeroEntityId: action.actorHeroEntityId,
        sourceEntityId: action.sourceEntityId,
        targetEntityId: action.selection.targetEntityId,
      })
    case 'pressLuck':
    case 'endTurn':
      return resolveSessionSimpleAction({
        session: runtime.session,
        actorHeroEntityId: action.actorHeroEntityId,
        kind: action.kind,
      })
    default:
      return {
        ok: false,
        reason: `Unsupported action kind in replay log: ${(action as { kind: string }).kind}`,
        session: runtime.session,
        preview: runtime.preview,
      }
  }
}

/**
 * Deterministically materializes a replay action to an executable BattleAction.
 * Uses selector-based resolution for chess-grade determinism.
 */
function materializeReplayAction(
  state: BattleState,
  replayAction: ReplayBattleAction,
):
  | { ok: true; action: BattleAction }
  | { ok: false; reason: string } {

  switch (replayAction.kind) {
    case 'playCard': {
      const actorHero = state.entitiesById[replayAction.actorHeroEntityId]
      if (!actorHero || actorHero.kind !== 'hero') {
        return {
          ok: false,
          reason: `Actor hero ${replayAction.actorHeroEntityId} not found.`,
        }
      }

      const handCard = actorHero.handCards[replayAction.handCardIndex]
      if (!handCard) {
        return {
          ok: false,
          reason: `Hand card at index ${replayAction.handCardIndex} not found.`,
        }
      }

      let targetEntityId: string | undefined
      if (replayAction.selection.targetSelector) {
        const resolved = resolveSelectorToDeterministicEntity(
          state,
          replayAction.selection.targetSelector,
        )
        if (!resolved) {
          return {
            ok: false,
            reason: `Could not resolve play-card target selector.`,
          }
        }
        targetEntityId = resolved
      }

      return {
        ok: true,
        action: {
          kind: 'playCard',
          actorHeroEntityId: replayAction.actorHeroEntityId,
          handCardId: handCard.id,
          selection: {
            targetEntityId,
            targetPosition: replayAction.selection.targetPosition
              ? { ...replayAction.selection.targetPosition }
              : undefined,
          },
        },
      }
    }

    case 'basicAttack': {
      const attackerEntityId = resolveSelectorToDeterministicEntity(
        state,
        replayAction.attackerSelector,
      )
      if (!attackerEntityId) {
        return {
          ok: false,
          reason: `Could not resolve basic-attack attacker selector.`,
        }
      }

      const targetEntityId = resolveSelectorToDeterministicEntity(
        state,
        replayAction.selection.targetSelector,
      )
      if (!targetEntityId) {
        return {
          ok: false,
          reason: `Could not resolve basic-attack target selector.`,
        }
      }

      return {
        ok: true,
        action: {
          kind: 'basicAttack',
          actorHeroEntityId: replayAction.actorHeroEntityId,
          attackerEntityId,
          selection: {
            targetEntityId,
          },
        },
      }
    }

    case 'useEntityActive': {
      const sourceEntityId = resolveSelectorToDeterministicEntity(
        state,
        replayAction.sourceSelector,
      )
      if (!sourceEntityId) {
        return {
          ok: false,
          reason: `Could not resolve entity-active source selector.`,
        }
      }

      let targetEntityId: string | undefined
      if (replayAction.selection.targetSelector) {
        const resolved = resolveSelectorToDeterministicEntity(
          state,
          replayAction.selection.targetSelector,
        )
        if (!resolved) {
          return {
            ok: false,
            reason: `Could not resolve entity-active target selector.`,
          }
        }
        targetEntityId = resolved
      }

      return {
        ok: true,
        action: {
          kind: 'useEntityActive',
          actorHeroEntityId: replayAction.actorHeroEntityId,
          sourceEntityId,
          selection: {
            targetEntityId,
            targetPosition: replayAction.selection.targetPosition
              ? { ...replayAction.selection.targetPosition }
              : undefined,
          },
        },
      }
    }

    case 'pressLuck':
    case 'endTurn':
      return {
        ok: true,
        action: replayAction,
      }

    default:
      return {
        ok: false,
        reason: `Unsupported replay action kind: ${(replayAction as { kind: string }).kind}`,
      }
  }
}

function jumpSessionToTimelineIndex(options: {
  session: AppBattleSession
  timelineIndex: number
}): SnapshotSessionResult {
  const firstPreSnapshot = options.session.snapshots.find((snapshot) => snapshot.phase === 'pre') ?? null
  const postSnapshots = options.session.snapshots.filter((snapshot) => snapshot.phase === 'post')
  const timelineSnapshots = firstPreSnapshot ? [firstPreSnapshot, ...postSnapshots] : postSnapshots
  const targetSnapshot = timelineSnapshots[options.timelineIndex]
  if (!targetSnapshot) {
    return {
      ok: false,
      reason: `Replay timeline index ${options.timelineIndex} was not found.`,
    }
  }

  return jumpSessionToSnapshot({
    session: options.session,
    snapshotId: targetSnapshot.id,
  })
}


export function replaySessionFromActionLog(options: {
  gameApi: AppBattleApi
  config: GameBootstrapConfig
  actionLog: ReplayActionLogEntry[]
  timelineIndex: number | null
}): SnapshotSessionResult {
  const { gameApi, config, actionLog, timelineIndex } = options
  let runtime = createInitialBattleSession({ gameApi, config })

  for (const entry of actionLog) {
    const actionResolution = materializeReplayAction(runtime.session.state, entry.action)
    if (!actionResolution.ok) {
      // Materialization should succeed with selector-based resolution, unless state changed
      // If this was a historical success, deterministically skip to maintain replay resilience
      if (entry.success === true) {
        continue
      }

      return {
        ok: false,
        reason: `Replay failed at action: ${entry.action.kind}. Reason: ${actionResolution.reason}`,
      }
    }

    const result = applyReplayedBattleAction(runtime, actionResolution.action)
    if (!result.ok) {
      // If action was historically successful but failed in replay, deterministically skip
      // This handles edge cases like state corruption or content updates
      if (entry.success === true) {
        continue
      }

      // If action was historically failed, record the failed state
      if (entry.success === false) {
        runtime = {
          session: result.session,
          preview: result.preview,
        }
        continue
      }

      return { ok: false, reason: `Replay failed at action: ${actionResolution.action.kind}. Reason: ${result.reason}` }
    }

    runtime = {
      session: result.session,
      preview: result.preview,
    }
  }

  if (timelineIndex !== null) {
    return jumpSessionToTimelineIndex({
      session: runtime.session,
      timelineIndex,
    })
  }

  return {
    ok: true,
    session: runtime.session,
    preview: runtime.preview,
  }
}
