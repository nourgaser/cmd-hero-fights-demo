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
  GAME_CONTENT_REGISTRY,
} from '../../../api'

import type { GameBootstrapConfig } from '../data/game-bootstrap'

export type AppRuntime = {
  session: AppBattleSession
  preview: AppBattlePreview
}

export type ReplayNavigationDirection = -1 | 1

export function createRuntimeFromReplayPayload(replayPayload: {
  bootstrapConfig: GameBootstrapConfig
  actionLog: Array<{ action: any; success?: boolean }>
  snapshotId: number | null
}): AppRuntime {
  const gameApi = {
    createBattle,
    resolveAction,
    GAME_CONTENT_REGISTRY,
  }

  const replayResult = replaySessionFromActionLog({
    gameApi,
    config: replayPayload.bootstrapConfig,
    actionLog: replayPayload.actionLog,
    snapshotId: replayPayload.snapshotId,
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

export function createActionLogFromSession(
  session: AppBattleSession,
): Array<{ action: any; success: boolean }> {
  return session.history.map((entry) => {
    const preSnapshot = session.snapshots.find((s) => s.id === entry.preSnapshotId)
    return {
      action: preSnapshot?.action ?? { kind: entry.actionKind } as any,
      success: entry.success,
    }
  })
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
  return `replay-${hashHex.slice(0, 12)}`
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
