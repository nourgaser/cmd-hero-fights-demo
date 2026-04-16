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
  type AppRngCheckpoint,
} from './game-client'
import type { AppBattleEventDisplay } from './game-client'

import { type GameBootstrapConfig } from './data/game-bootstrap'

function buildHeroNameMap(session: AppBattleSession): Record<string, string> {
  const heroesById = session.gameApi.GAME_CONTENT_REGISTRY.heroesById
  const heroNameMap: Record<string, string> = {}

  for (const heroEntityId of session.state.heroEntityIds) {
    const entity = session.state.entitiesById[heroEntityId]
    if (!entity || entity.kind !== 'hero') {
      continue
    }

    heroNameMap[heroEntityId] = heroesById[entity.heroDefinitionId]?.name ?? entity.heroDefinitionId
  }

  return heroNameMap
}

function getHeroNameForEntity(session: AppBattleSession, heroEntityId: string): string {
  const entity = session.state.entitiesById[heroEntityId]
  if (!entity || entity.kind !== 'hero') {
    return heroEntityId
  }

  const heroDef = session.gameApi.GAME_CONTENT_REGISTRY.heroesById[entity.heroDefinitionId]
  return heroDef?.name ?? heroEntityId
}

function replaceHeroEntityIds(text: string, heroAName: string, heroBName: string): string {
  return text
    .replace(/\bhero-a\b/g, heroAName)
    .replace(/\bhero-b\b/g, heroBName)
}

export function buildBattleEventDisplays(session: AppBattleSession, events: BattleEvent[]): AppBattleEventDisplay[] {
  const heroNameMap = buildHeroNameMap(session)
  const [heroAEntityId, heroBEntityId] = session.state.heroEntityIds
  const heroAName = heroNameMap[heroAEntityId] ?? 'Hero A'
  const heroBName = heroNameMap[heroBEntityId] ?? 'Hero B'

  return events.flatMap((event) => {
    switch (event.kind) {
      case 'actionResolved':
        return []
      case 'cardPlayed':
        return [{ sequence: event.sequence, summary: 'Played a card.', detail: null }]
      case 'cardDrawn':
        return [{ sequence: event.sequence, summary: 'Drew a card.', detail: null }]
      case 'entitySummoned':
        return [{ sequence: event.sequence, summary: 'A unit joined the battle.', detail: null }]
      case 'entityRemoved':
        return [{ sequence: event.sequence, summary: 'A unit was defeated.', detail: null }]
      case 'listenerTriggered': {
        const summaryEnd = replaceHeroEntityIds(
          event.message.match(/^[^.!?]+[.!?]/)?.[0]?.trim() ?? event.message.trim(),
          heroAName,
          heroBName,
        )
        return [{ sequence: event.sequence, summary: summaryEnd, detail: null }]
      }
      case 'damageApplied': {
        const summary = event.wasDodged
          ? `${event.damageType} attack was dodged.`
          : `${event.amount} ${event.damageType} damage applied.`
        const detailParts = [
          event.rngRawRoll !== undefined ? `raw ${event.rngRawRoll.toFixed(2)}` : null,
          event.rngAdjustedRoll !== undefined ? `luck-adjusted ${event.rngAdjustedRoll.toFixed(2)}` : null,
          event.rngFinalRoll !== undefined ? `final ${event.rngFinalRoll.toFixed(2)}` : null,
          event.rngDodgeRoll !== undefined ? `dodge ${event.rngDodgeRoll.toFixed(2)}` : null,
        ].filter((part): part is string => !!part)
        return [{ sequence: event.sequence, summary, detail: detailParts.length > 0 ? `Roll detail: ${detailParts.join(' -> ')}.` : null }]
      }
      case 'healApplied':
        return [{ sequence: event.sequence, summary: `Restored ${event.amount} HP.`, detail: null }]
      case 'armorGained':
        return [{ sequence: event.sequence, summary: `Gained ${event.amount} armor.`, detail: null }]
      case 'armorLost':
        return [{ sequence: event.sequence, summary: `Lost ${event.amount} armor.`, detail: null }]
      case 'magicResistGained':
        return [{ sequence: event.sequence, summary: `Gained ${event.amount} magic resist.`, detail: null }]
      case 'magicResistLost':
        return [{ sequence: event.sequence, summary: `Lost ${event.amount} magic resist.`, detail: null }]
      case 'attackDamageGained':
        return [{ sequence: event.sequence, summary: `Gained ${event.amount} attack damage.`, detail: null }]
      case 'attackDamageLost':
        return [{ sequence: event.sequence, summary: `Lost ${event.amount} attack damage.`, detail: null }]
      case 'turnEnded':
        return [{ sequence: event.sequence, summary: 'Turn ended.', detail: null }]
      case 'turnStarted':
        return [{ sequence: event.sequence, summary: `Turn ${event.turnNumber} started.`, detail: null }]
      case 'luckBalanceChanged':
        return [{ sequence: event.sequence, summary: 'Luck shifted.', detail: null }]
      case 'auraApplied':
        return [{ sequence: event.sequence, summary: `Aura applied (${event.auraKind}).`, detail: `Stacks: ${event.stackCount}. Expires on turn ${event.expiresOnTurnNumber}.` }]
      case 'auraExpired':
        return [{ sequence: event.sequence, summary: `Aura expired (${event.auraKind}).`, detail: null }]
      case 'numberModifierApplied':
        return [{ sequence: event.sequence, summary: `Modifier applied: ${event.label}.`, detail: null }]
      case 'numberModifierExpired':
        return [{ sequence: event.sequence, summary: `Modifier expired (${event.reason}).`, detail: null }]
      case 'numberExplanationUpdated':
        return [{ sequence: event.sequence, summary: `Numbers changed.`, detail: null }]
      default:
        return []
    }
  })
}

function cloneSerializable<T>(value: T): T {
  if (typeof structuredClone === 'function') {
    return structuredClone(value)
  }

  return JSON.parse(JSON.stringify(value)) as T
}

function buildPreview(session: AppBattleSession): AppBattlePreview {
  return buildPreviewFromState({ gameApi: session.gameApi, state: session.state })
}

function buildInitialSnapshot(options: {
  config: GameBootstrapConfig
  activeHeroEntityId: string
  state: AppBattleSession['state']
}): AppBattleSnapshot {
  const { config, activeHeroEntityId, state } = options

  return {
    id: 0,
    phase: 'pre',
    turnNumber: 1,
    actorHeroEntityId: activeHeroEntityId,
    actionKind: 'endTurn',
    action: { kind: 'endTurn', actorHeroEntityId: activeHeroEntityId },
    state: cloneSerializable(state),
    nextSequence: 0,
    resultMessage: 'Battle started.',
    success: true,
    events: [],
    eventTrail: [],
    rngCheckpoint: {
      seed: config.seed,
      stepCount: 0,
    },
  }
}

function rebuildRuntimeFromActionLog(options: {
  gameApi: AppBattleApi
  config: GameBootstrapConfig
  actionLog: ReplayActionLogEntry[]
}): {
  session: AppBattleSession
  preview: AppBattlePreview
} {
  let runtime = createInitialBattleSession({
    gameApi: options.gameApi,
    config: options.config,
  })

  for (const action of options.actionLog) {
    const result = resolveSessionAction({
      session: runtime.session,
      action,
    })

    runtime = {
      session: result.session,
      preview: result.preview,
    }
  }

  return runtime
}

function getReplayPrefixCountForSnapshot(options: {
  session: AppBattleSession
  snapshot: AppBattleSnapshot
}): number | null {
  const { session, snapshot } = options
  if (snapshot.id === 0) {
    return 0
  }

  if (snapshot.phase === 'post') {
    const historyIndex = session.history.findIndex((entry) => entry.postSnapshotId === snapshot.id)
    return historyIndex >= 0 ? historyIndex + 1 : null
  }

  const historyIndex = session.history.findIndex((entry) => entry.preSnapshotId === snapshot.id)
  return historyIndex >= 0 ? historyIndex : null
}

function buildSessionAtSnapshot(options: {
  session: AppBattleSession
  snapshotId: number
}): SnapshotSessionResult {
  if (!options.session.snapshots.find((snapshot) => snapshot.id === options.snapshotId)) {
    return { ok: false, reason: `Snapshot ${options.snapshotId} not found.` }
  }

  const rebuilt = rebuildRuntimeFromActionLog({
    gameApi: options.session.gameApi,
    config: options.session.config,
    actionLog: options.session.actionLog,
  })
  const rebuiltSnapshot = rebuilt.session.snapshots.find((snapshot) => snapshot.id === options.snapshotId)
  if (!rebuiltSnapshot) {
    return {
      ok: false,
      reason: `Snapshot ${options.snapshotId} was not rebuilt from the canonical action log.`,
    }
  }

  const nextSession: AppBattleSession = {
    ...rebuilt.session,
    state: cloneSerializable(rebuiltSnapshot.state),
    nextSequence: rebuiltSnapshot.nextSequence,
    battleRng: options.session.gameApi.createBattleRngFromCheckpoint(rebuiltSnapshot.rngCheckpoint),
    activeSnapshotId: rebuiltSnapshot.id,
  }

  return {
    ok: true,
    session: nextSession,
    preview: buildPreview(nextSession),
  }
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

  const session: AppBattleSession = {
    config: cloneSerializable(config),
    gameApi,
    state: createdBattle.state,
    battleRng: createdBattle.rng,
    nextSequence: 0,
    actionLog: [],
    history: [],
    snapshots: [
      buildInitialSnapshot({
        config,
        activeHeroEntityId: createdBattle.state.turn.activeHeroEntityId,
        state: createdBattle.state,
      }),
    ],
    activeSnapshotId: null,
    nextHistoryEntryId: 1,
    nextSnapshotId: 1,
  }

  return {
    session,
    preview: buildPreview(session),
  }
}

export type SessionResolutionResult =
  | { ok: true; session: AppBattleSession; preview: AppBattlePreview; events: BattleEvent[]; eventTrail: AppBattleEventDisplay[]; resultMessage: string }
  | { ok: false; reason: string; session: AppBattleSession; preview: AppBattlePreview }

export function resolveSessionAction(options: {
  session: AppBattleSession
  action: BattleAction
}): SessionResolutionResult {
  const { session, action } = options

  const preSnapshotId = session.nextSnapshotId
  const postSnapshotId = session.nextSnapshotId + 1
  const turnNumber = session.state.turn.turnNumber
  const actionEntry = cloneSerializable(action)

  const preRngCheckpoint: AppRngCheckpoint = {
    seed: session.battleRng.seed,
    stepCount: session.battleRng.stepCount,
  }

  // Resolve against a fresh RNG clone so the input session stays immutable.
  // React may invoke state updaters more than once in development.
  const workingBattleRng = session.gameApi.createBattleRngFromCheckpoint(preRngCheckpoint)

  const result = session.gameApi.resolveAction({
    state: session.state,
    action,
    nextSequence: session.nextSequence,
    battleRng: workingBattleRng,
    registry: session.gameApi.GAME_CONTENT_REGISTRY,
  })

  const historyEntry: AppActionHistoryEntry = {
    id: session.nextHistoryEntryId,
    turnNumber,
    actorHeroEntityId: action.actorHeroEntityId,
    actorHeroName: getHeroNameForEntity(session, action.actorHeroEntityId),
    actionKind: action.kind,
    resultMessage: result.ok ? result.resultMessage : result.reason,
    success: result.ok,
    failureReason: !result.ok ? result.reason : undefined,
    eventCount: result.ok ? result.events.length : 0,
    eventTrail: result.ok ? buildBattleEventDisplays(session, result.events) : [],
    preSnapshotId,
    postSnapshotId,
  }

  const preSnapshot: AppBattleSnapshot = {
    id: preSnapshotId,
    phase: 'pre',
    turnNumber,
    actorHeroEntityId: action.actorHeroEntityId,
    actionKind: action.kind,
    action: actionEntry,
    state: cloneSerializable(session.state),
    nextSequence: session.nextSequence,
    resultMessage: historyEntry.resultMessage,
    success: historyEntry.success,
    failureReason: historyEntry.failureReason,
    events: [],
    eventTrail: [],
    rngCheckpoint: preRngCheckpoint,
  }

  if (!result.ok) {
    const postSnapshot: AppBattleSnapshot = {
      id: postSnapshotId,
      phase: 'post',
      turnNumber,
      actorHeroEntityId: action.actorHeroEntityId,
      actionKind: action.kind,
      action: actionEntry,
      state: cloneSerializable(result.state),
      nextSequence: session.nextSequence,
      resultMessage: result.reason,
      success: false,
      failureReason: result.reason,
      events: [],
      eventTrail: [],
      rngCheckpoint: {
        seed: workingBattleRng.seed,
        stepCount: workingBattleRng.stepCount,
      },
    }

    const nextSession: AppBattleSession = {
      ...session,
      state: result.state,
      battleRng: workingBattleRng,
      actionLog: [...session.actionLog, actionEntry],
      history: [...session.history, historyEntry],
      snapshots: [...session.snapshots, preSnapshot, postSnapshot],
      nextHistoryEntryId: session.nextHistoryEntryId + 1,
      nextSnapshotId: postSnapshotId + 1,
    }

    return {
      ok: false,
      reason: result.reason,
      session: nextSession,
      preview: buildPreview(nextSession),
    }
  }

  const postSnapshot: AppBattleSnapshot = {
    id: postSnapshotId,
    phase: 'post',
    turnNumber,
    actorHeroEntityId: action.actorHeroEntityId,
    actionKind: action.kind,
    action: actionEntry,
    state: cloneSerializable(result.state),
    nextSequence: result.nextSequence,
    resultMessage: result.resultMessage,
    success: true,
    events: cloneSerializable(result.events),
    eventTrail: buildBattleEventDisplays(session, result.events),
    rngCheckpoint: {
      seed: workingBattleRng.seed,
      stepCount: workingBattleRng.stepCount,
    },
  }

  const nextSession: AppBattleSession = {
    ...session,
    state: result.state,
    battleRng: workingBattleRng,
    nextSequence: result.nextSequence,
    actionLog: [...session.actionLog, actionEntry],
    history: [...session.history, historyEntry],
    snapshots: [...session.snapshots, preSnapshot, postSnapshot],
    nextHistoryEntryId: session.nextHistoryEntryId + 1,
    nextSnapshotId: postSnapshotId + 1,
  }

  return {
    ok: true,
    session: nextSession,
    preview: buildPreview(nextSession),
    events: result.events,
    eventTrail: buildBattleEventDisplays(session, result.events),
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
  return buildSessionAtSnapshot(options)
}

export function branchSessionFromSnapshot(options: {
  session: AppBattleSession
  snapshotId: number
}): SnapshotSessionResult {
  const sourceSnapshot = options.session.snapshots.find((snapshot) => snapshot.id === options.snapshotId)
  if (!sourceSnapshot) {
    return { ok: false, reason: `Snapshot ${options.snapshotId} not found.` }
  }

  const replayPrefixCount = getReplayPrefixCountForSnapshot({
    session: options.session,
    snapshot: sourceSnapshot,
  })
  if (replayPrefixCount === null) {
    return {
      ok: false,
      reason: `Snapshot ${options.snapshotId} could not be mapped to an action-log position.`,
    }
  }

  const rebuilt = rebuildRuntimeFromActionLog({
    gameApi: options.session.gameApi,
    config: options.session.config,
    actionLog: options.session.actionLog.slice(0, replayPrefixCount),
  })

  return {
    ok: true,
    session: {
      ...rebuilt.session,
      activeSnapshotId: null,
    },
    preview: rebuilt.preview,
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

  const runtime = rebuildRuntimeFromActionLog({
    gameApi,
    config,
    actionLog,
  })

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
