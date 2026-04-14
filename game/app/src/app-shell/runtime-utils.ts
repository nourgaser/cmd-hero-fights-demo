import type {
  AppBattlePreview,
  AppBattleSession,
  AppBattleSnapshot,
} from '../game-client'
import {
  branchSessionFromSnapshot,
  createInitialBattleSession,
  replaySessionFromActionLog,
} from '../game-client-session'
import {
  createBattle,
  resolveAction,
  resolveEffectiveNumber,
  createBattleRngFromCheckpoint,
  GAME_CONTENT_REGISTRY,
} from '../../../api'
import type { ReplayActionLogEntry } from '../../../shared/models'
import type {
  ReplayUrlPayload,
} from '../utils/replay-url'

import type { GameBootstrapConfig } from '../data/game-bootstrap'

export type AppRuntime = {
  session: AppBattleSession
  preview: AppBattlePreview
}

export type ReplayNavigationDirection = -1 | 1

export function createRuntimeFromReplayPayload(replayPayload: ReplayUrlPayload): AppRuntime {
  const gameApi = {
    createBattle,
    resolveAction,
    resolveEffectiveNumber,
    createBattleRngFromCheckpoint,
    GAME_CONTENT_REGISTRY,
  }

  const replayResult = replaySessionFromActionLog({
    gameApi,
    config: replayPayload.bootstrapConfig,
    actionLog: replayPayload.actionLog,
    timelineIndex: replayPayload.timelineIndex,
  })

  if (!replayResult.ok) {
    throw new Error(replayResult.reason)
  }

  return {
    session: replayResult.session,
    preview: replayResult.preview,
  }
}

export function createRuntimeFromConfig(config: GameBootstrapConfig): AppRuntime {
  const gameApi = {
    createBattle,
    resolveAction,
    resolveEffectiveNumber,
    createBattleRngFromCheckpoint,
    GAME_CONTENT_REGISTRY,
  }

  const { session, preview } = createInitialBattleSession({
    gameApi,
    config,
  })

  return {
    session,
    preview,
  }
}

export function getReplayModeActiveSnapshot(session: AppBattleSession): AppBattleSnapshot | null {
  if (session.activeSnapshotId === null) {
    return null
  }

  return session.snapshots.find((s) => s.id === session.activeSnapshotId) ?? null
}

export function getActionTimelineSnapshots(session: AppBattleSession): AppBattleSnapshot[] {
  const postSnapshots = session.snapshots.filter((snapshot) => snapshot.phase === 'post')
  const firstPreSnapshot = session.snapshots.find((snapshot) => snapshot.phase === 'pre') ?? null
  return firstPreSnapshot ? [firstPreSnapshot, ...postSnapshots] : postSnapshots
}

export function getReplayPayloadTimelineIndex(session: AppBattleSession): number | null {
  const timelineSnapshots = getActionTimelineSnapshots(session)
  if (timelineSnapshots.length === 0) {
    return null
  }

  if (session.activeSnapshotId === null) {
    // Even in live mode, the user is currently looking at the latest resolved
    // timeline frame. Encode that latest index so copied URLs always rebuild
    // the exact board state currently visible in the UI.
    return timelineSnapshots.length - 1
  }

  const currentSnapshot = session.snapshots.find((snapshot) => snapshot.id === session.activeSnapshotId) ?? null

  if (!currentSnapshot) {
    return timelineSnapshots.length - 1
  }

  if (currentSnapshot.phase === 'pre') {
    return 0
  }

  const timelineIndex = timelineSnapshots.findIndex((snapshot) => snapshot.id === currentSnapshot.id)
  return timelineIndex >= 0 ? timelineIndex : timelineSnapshots.length - 1
}

export function createActionLogFromSession(
  session: AppBattleSession,
): ReplayActionLogEntry[] {
  return session.actionLog.map((action) => JSON.parse(JSON.stringify(action)) as ReplayActionLogEntry)
}

export function ensureSessionReadyForAction(session: AppBattleSession):
  | { ok: true; session: AppBattleSession; branchedFromSnapshotId: number | null }
  | { ok: false; reason: string } {
  if (session.activeSnapshotId === null) {
    return { ok: true, session, branchedFromSnapshotId: null }
  }

  const branchResult = branchSessionFromSnapshot({
    session,
    snapshotId: session.activeSnapshotId,
  })

  if (!branchResult.ok) {
    return {
      ok: false as const,
      reason: branchResult.reason,
    }
  }

  return {
    ok: true,
    session: branchResult.session,
    branchedFromSnapshotId: session.activeSnapshotId,
  }
}

export function pickRandom<T>(items: T[]): T | null {
  if (items.length === 0) return null
  return items[Math.floor(Math.random() * items.length)] ?? null
}

export function clampAutoPlayDelay(delayMs: number): number {
  return Math.max(50, Math.min(5000, delayMs))
}

export function loadBootstrapConfig(options: {
  seedStorageKey: string
  bootstrapStorageKey: string
  defaultConfig: GameBootstrapConfig
}): GameBootstrapConfig {
  if (typeof window === 'undefined') return options.defaultConfig

  const storedSeed = window.localStorage.getItem(options.seedStorageKey)
  const storedConfigText = window.localStorage.getItem(options.bootstrapStorageKey)

  try {
    const config = storedConfigText
      ? (JSON.parse(storedConfigText) as GameBootstrapConfig)
      : options.defaultConfig

    if (storedSeed) {
      return { ...config, seed: storedSeed }
    }
    return config
  } catch {
    return options.defaultConfig
  }
}

export function incrementSeed(seed: string): string {
  const match = seed.match(/^(.*?)(\d+)$/)
  if (!match) {
    return `${seed}-1`
  }
  const prefix = match[1] ?? ''
  const digits = match[2]
  if (!digits) {
    return `${seed}-1`
  }
  const nextValue = Number.parseInt(digits, 10) + 1
  const nextDigits = `${nextValue}`.padStart(digits.length, '0')
  return `${prefix}${nextDigits}`
}

export function isTypingTarget(event: KeyboardEvent | { target: EventTarget | null }): boolean {
  const target = event.target as HTMLElement | null
  if (!target) return false
  if (target.isContentEditable) return true
  const tagName = target.tagName
  if (tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT') return true
  return target.closest('[role="textbox"]') !== null
}

export function updateHoverCardPlacement(wrap: HTMLElement) {
  const hoverCard = wrap.querySelector<HTMLElement>('.hover-card')
  if (!hoverCard) return

  const rect = hoverCard.getBoundingClientRect()
  const viewportWidth = window.innerWidth
  const padding = 12

  let align: 'center' | 'left' | 'right' = 'center'
  if (rect.left < padding) align = 'left'
  else if (rect.right > viewportWidth - padding) align = 'right'

  let placement: 'top' | 'bottom' = 'top'
  if (rect.top < padding) placement = 'bottom'

  wrap.dataset.hoverAlign = align
  wrap.dataset.hoverPlacement = placement
}

export function formatReplayPlaybackSpeed(speed: number): string {
  if (speed < 1) return `${speed}x`
  return `${speed}x`
}

export function buildReplayShortAlias(hashHex: string): string {
  return `cmd_hero_fights_${hashHex.slice(0, 7)}`
}

export function buildIsGdShortlink(alias: string): string {
  return `https://is.gd/${alias}`
}

export function renderDisplayText(text: { template: string; params?: Record<string, string | number | boolean | undefined> }): string {
  return text.template.replace(/\{(\w+)\}/g, (match, key) => {
    const val = text.params?.[key]
    return val !== undefined ? String(val) : match
  })
}

export function describeCardCastCondition(card: { castCondition?: { kind: string; threshold: number } }): string | null {
  const condition = card.castCondition
  if (!condition) return null
  if (condition.kind === 'heroHealthBelow') {
    return `Only playable when your hero is below ${condition.threshold} HP.`
  }
  return null
}
