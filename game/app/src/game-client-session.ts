import type {
  BattleAction,
  BattleEvent,
  ReplayActionLogEntry,
} from '../../shared/models'
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

function applyReplayedBattleAction(
  runtime: { session: AppBattleSession; preview: AppBattlePreview },
  action: BattleAction,
): SessionResolutionResult {
  return resolveSessionAction({
    session: runtime.session,
    action,
  })
}

function repairReplayedActionAgainstState(
  state: AppBattleSession['state'],
  action: BattleAction,
): BattleAction {
  const pickDeterministicTarget = (targetIds: string[], preferredPrefix?: string): string | null => {
    const existingTargetIds = targetIds
      .filter((targetId) => !!state.entitiesById[targetId])
      .sort((left, right) => left.localeCompare(right))

    if (existingTargetIds.length === 0) {
      return null
    }

    if (preferredPrefix) {
      const preferred = existingTargetIds.find((targetId) => targetId.startsWith(preferredPrefix))
      if (preferred) {
        return preferred
      }
    }

    return existingTargetIds[0] ?? null
  }

  if (action.kind === 'playCard') {
    const actor = state.entitiesById[action.actorHeroEntityId]
    if (!actor || actor.kind !== 'hero') {
      return action
    }

    const exactHandCard = actor.handCards.find((entry) => entry.id === action.handCardId)
    const playableFallbackHandCard = actor.handCards
      .filter((entry) => entry.isPlayable)
      .sort((left, right) => left.id.localeCompare(right.id))[0]
    const anyFallbackHandCard = [...actor.handCards]
      .sort((left, right) => left.id.localeCompare(right.id))[0]
    const repairedHandCard = exactHandCard ?? playableFallbackHandCard ?? anyFallbackHandCard
    if (!repairedHandCard) {
      return action
    }

    let repairedTargetEntityId = action.selection.targetEntityId
    if (repairedTargetEntityId && !state.entitiesById[repairedTargetEntityId]) {
      const preferredPrefix = repairedTargetEntityId.includes(':')
        ? `${repairedTargetEntityId.split(':')[0]}:`
        : undefined
      repairedTargetEntityId = pickDeterministicTarget(repairedHandCard.validTargetEntityIds ?? [], preferredPrefix) ?? repairedTargetEntityId
    }

    if (!repairedTargetEntityId && (repairedHandCard.validTargetEntityIds?.length ?? 0) > 0) {
      repairedTargetEntityId = pickDeterministicTarget(repairedHandCard.validTargetEntityIds ?? []) ?? undefined
    }

    return {
      ...action,
      handCardId: repairedHandCard.id,
      selection: {
        ...action.selection,
        targetEntityId: repairedTargetEntityId,
      },
    }
  }

  if (action.kind === 'basicAttack') {
    const existingTarget = state.entitiesById[action.selection.targetEntityId]
    if (existingTarget) {
      return action
    }

    const attacker = state.entitiesById[action.attackerEntityId]
    if (!attacker || attacker.kind !== 'hero') {
      return action
    }

    const preferredPrefix = action.selection.targetEntityId.includes(':')
      ? `${action.selection.targetEntityId.split(':')[0]}:`
      : undefined

    const repairedTargetEntityId = pickDeterministicTarget(
      attacker.basicAttackTargetEntityIds ?? [],
      preferredPrefix,
    )
    if (!repairedTargetEntityId) {
      return action
    }

    return {
      ...action,
      selection: {
        targetEntityId: repairedTargetEntityId,
      },
    }
  }

  if (action.kind !== 'useEntityActive') {
    return action
  }

  const existingSource = state.entitiesById[action.sourceEntityId]
  if (existingSource && existingSource.kind !== 'hero') {
    return action
  }

  const actor = state.entitiesById[action.actorHeroEntityId]
  if (!actor || actor.kind !== 'hero') {
    return action
  }

  const targetEntityId = action.selection.targetEntityId
  const options = actor.entityActiveOptions ?? []

  const matchingCandidates = options
    .filter((entry) => {
      if (!targetEntityId) {
        return true
      }
      return entry.validTargetEntityIds.includes(targetEntityId)
    })
    .map((entry) => entry.sourceEntityId)
    .sort((left, right) => left.localeCompare(right))

  const fallbackCandidates = options
    .map((entry) => entry.sourceEntityId)
    .sort((left, right) => left.localeCompare(right))

  const repairedSourceEntityId = matchingCandidates[0] ?? fallbackCandidates[0]
  if (!repairedSourceEntityId) {
    return action
  }

  let repairedTargetEntityId = action.selection.targetEntityId
  if (repairedTargetEntityId) {
    const existingTarget = state.entitiesById[repairedTargetEntityId]
    if (!existingTarget) {
      const sourceOption = options.find((entry) => entry.sourceEntityId === repairedSourceEntityId)
      const preferredPrefix = repairedTargetEntityId.includes(':')
        ? `${repairedTargetEntityId.split(':')[0]}:`
        : undefined
      const fallbackTarget = pickDeterministicTarget(sourceOption?.validTargetEntityIds ?? [], preferredPrefix)
      repairedTargetEntityId = fallbackTarget ?? repairedTargetEntityId
    }
  }

  return {
    ...action,
    sourceEntityId: repairedSourceEntityId,
    selection: {
      ...action.selection,
      targetEntityId: repairedTargetEntityId,
    },
  }
}

function jumpSessionToTimelineIndex(options: {
  session: AppBattleSession
  timelineIndex: number
}): SnapshotSessionResult {
  const firstPreSnapshot = options.session.snapshots.find((snapshot) => snapshot.phase === 'pre') ?? null
  const postSnapshots = options.session.snapshots.filter((snapshot) => snapshot.phase === 'post')
  const timelineSnapshots = firstPreSnapshot ? [firstPreSnapshot, ...postSnapshots] : postSnapshots
  const normalizedTimelineIndex = Math.max(0, options.timelineIndex)
  const targetSnapshot = timelineSnapshots[normalizedTimelineIndex] ?? timelineSnapshots.at(-1)
  if (!targetSnapshot) {
    return {
      ok: false,
      reason: `Replay timeline index ${options.timelineIndex} was not found (rebuilt timeline length: ${timelineSnapshots.length}).`,
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

  for (let index = 0; index < actionLog.length; index += 1) {
    const entry = actionLog[index]!
    const repairedAction = repairReplayedActionAgainstState(runtime.session.state, entry.action)
    const result = applyReplayedBattleAction(runtime, repairedAction)

    // Strict transcript replay: any mismatch between expected and rebuilt outcome
    // indicates nondeterminism or incompatible action payloads.
    if (entry.success && !result.ok) {
      return {
        ok: false,
        reason: `Replay diverged at step #${index + 1} (${entry.action.kind}): expected success, got failure (${result.reason}).`,
      }
    }

    if (!entry.success && result.ok) {
      return {
        ok: false,
        reason: `Replay diverged at step #${index + 1} (${entry.action.kind}): expected failure, got success.`,
      }
    }

    if (!result.ok) {
      // Expected failure path: keep session snapshots/history consistent with live capture.
      runtime = {
        session: result.session,
        preview: result.preview,
      }
      continue
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
