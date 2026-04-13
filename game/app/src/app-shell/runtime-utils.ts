import type {
  AppBattlePreview,
  AppBattleSession,
  AppBattleSnapshot,
} from '../game-client'
import {
  type AppReplayActionLogEntry,
  branchSessionFromSnapshot,
  createInitialBattleSession,
  replaySessionFromActionLog,
} from '../game-client-session'
import { DEFAULT_GAME_BOOTSTRAP_CONFIG, type GameBootstrapConfig } from '../data/game-bootstrap'
import type { ReplayUrlPayload } from '../utils/replay-url'

export type AppRuntime = {
  session: AppBattleSession
  preview: AppBattlePreview
}

export type ReplayNavigationDirection = -1 | 1

export function clampAutoPlayDelay(delayMs: number, minDelayMs = 50, defaultDelayMs = 200): number {
  if (!Number.isFinite(delayMs)) {
    return defaultDelayMs
  }

  return Math.max(minDelayMs, Math.floor(delayMs))
}

export function pickRandom<T>(items: T[]): T | null {
  if (items.length === 0) {
    return null
  }

  const index = Math.floor(Math.random() * items.length)
  return items[index] ?? null
}

export function formatReplayPlaybackSpeed(speed: number): string {
  return Number.isInteger(speed) ? `${speed}x` : `${speed.toFixed(2).replace(/\.00$/, '')}x`
}

export function buildIsGdShortlink(shortAlias: string): string {
  return `https://is.gd/${shortAlias}`
}

export function buildReplayShortAlias(replayHashHex: string): string {
  return `cmd_hero_fights_${replayHashHex.slice(0, 7)}`
}

export function createRuntimeFromConfig(config = DEFAULT_GAME_BOOTSTRAP_CONFIG): AppRuntime {
  const initial = createInitialBattleSession(config)
  return {
    session: initial.session,
    preview: initial.preview,
  }
}

export function createRuntimeFromReplayPayload(replayPayload: ReplayUrlPayload): AppRuntime {
  const replayResult = replaySessionFromActionLog({
    config: replayPayload.bootstrapConfig,
    actionLog: replayPayload.actionLog,
    snapshotId: replayPayload.snapshotId ?? undefined,
  })

  if (!replayResult.ok) {
    throw new Error(replayResult.reason)
  }

  return {
    session: replayResult.session,
    preview: replayResult.preview,
  }
}

export function createActionLogFromSession(session: AppBattleSession): AppReplayActionLogEntry[] {
  return session.snapshots
    .filter((snapshot) => snapshot.phase === 'post')
    .map((snapshot) => ({
      action: snapshot.action,
    }))
}

export function getReplayModeActiveSnapshot(session: AppBattleSession): AppBattleSnapshot | null {
  if (session.snapshots.length === 0) {
    return null
  }

  const postSnapshots = session.snapshots.filter((snapshot) => snapshot.phase === 'post')
  const latestSnapshotId = postSnapshots.at(-1)?.id ?? null
  const currentSnapshotId = session.activeSnapshotId ?? latestSnapshotId

  if (!currentSnapshotId) {
    return null
  }

  const currentSnapshot = session.snapshots.find((snapshot) => snapshot.id === currentSnapshotId) ?? null
  if (!currentSnapshot || currentSnapshot.phase === 'pre') {
    return null
  }

  return currentSnapshot
}

export function ensureSessionReadyForAction(session: AppBattleSession) {
  const latestSnapshotId = session.snapshots.at(-1)?.id ?? null
  const activeSnapshotId = session.activeSnapshotId ?? latestSnapshotId

  if (!latestSnapshotId || !activeSnapshotId || activeSnapshotId === latestSnapshotId) {
    return {
      ok: true as const,
      session,
      branchedFromSnapshotId: null as number | null,
    }
  }

  const branchResult = branchSessionFromSnapshot({
    session,
    snapshotId: activeSnapshotId,
  })

  if (!branchResult.ok) {
    return {
      ok: false as const,
      reason: branchResult.reason,
    }
  }

  return {
    ok: true as const,
    session: branchResult.session,
    branchedFromSnapshotId: activeSnapshotId,
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

export function loadBootstrapConfig(options: {
  seedStorageKey: string
  bootstrapStorageKey: string
  defaultConfig?: GameBootstrapConfig
}): GameBootstrapConfig {
  const { seedStorageKey, bootstrapStorageKey, defaultConfig = DEFAULT_GAME_BOOTSTRAP_CONFIG } = options

  if (typeof window === 'undefined') {
    return defaultConfig
  }

  const persistedBootstrapConfig = window.localStorage.getItem(bootstrapStorageKey)
  if (persistedBootstrapConfig) {
    try {
      const parsed = JSON.parse(persistedBootstrapConfig) as GameBootstrapConfig
      const nextConfig = {
        ...parsed,
        seed: incrementSeed(parsed.seed || defaultConfig.seed),
      }

      window.localStorage.setItem(bootstrapStorageKey, JSON.stringify(nextConfig))
      window.localStorage.setItem(seedStorageKey, nextConfig.seed)

      return nextConfig
    } catch {
      // Fall back to the default config path below.
    }
  }

  const persistedSeed = window.localStorage.getItem(seedStorageKey)?.trim()
  const baseSeed = persistedSeed || defaultConfig.seed
  const nextSeed = incrementSeed(baseSeed)
  const nextConfig = {
    ...defaultConfig,
    seed: nextSeed,
  }

  window.localStorage.setItem(seedStorageKey, nextSeed)
  window.localStorage.setItem(bootstrapStorageKey, JSON.stringify(nextConfig))

  return nextConfig
}

export function updateHoverCardPlacement(wrap: HTMLElement) {
  const hoverCard = wrap.querySelector<HTMLElement>('.hover-card')
  if (!hoverCard) {
    return
  }

  const rect = wrap.getBoundingClientRect()
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight
  const maxTooltipWidth = Math.max(180, Math.min(340, viewportWidth - 24))
  const tooltipWidth = Math.min(Math.max(hoverCard.scrollWidth, hoverCard.offsetWidth, 180), maxTooltipWidth)
  const tooltipHeight = Math.min(Math.max(hoverCard.scrollHeight, hoverCard.offsetHeight, 84), viewportHeight - 24)

  const spaceAbove = rect.top
  const spaceBelow = viewportHeight - rect.bottom
  const placeBottom = spaceAbove < tooltipHeight + 24 && spaceBelow > spaceAbove

  let align: 'left' | 'center' | 'right' = 'center'
  const spaceLeft = rect.left
  const spaceRight = viewportWidth - rect.right

  if (spaceLeft < tooltipWidth * 0.5 + 20 && spaceRight > spaceLeft) {
    align = 'left'
  } else if (spaceRight < tooltipWidth * 0.5 + 20 && spaceLeft > spaceRight) {
    align = 'right'
  } else if (rect.left + rect.width * 0.5 < viewportWidth * 0.35) {
    align = 'left'
  } else if (rect.right - rect.width * 0.5 > viewportWidth * 0.65) {
    align = 'right'
  }

  wrap.dataset.hoverPlacement = placeBottom ? 'bottom' : 'top'
  wrap.dataset.hoverAlign = align
  wrap.style.setProperty('--hover-tooltip-max-width', `${maxTooltipWidth}px`)
}

export function renderDisplayText(displayText?: {
  template?: string
  params?: Record<string, string | number | boolean | undefined>
}): string | null {
  if (!displayText?.template) {
    return null
  }

  return displayText.template.replaceAll(/\{([a-zA-Z0-9_]+)\}/g, (match, key) => {
    const value = displayText.params?.[key]
    return value === undefined ? match : String(value)
  })
}

export function describeCardCastCondition(cardDefinition: unknown): string | null {
  if (!cardDefinition || typeof cardDefinition !== 'object' || !('castCondition' in cardDefinition)) {
    return null
  }

  const castCondition = (cardDefinition as { castCondition?: unknown }).castCondition
  if (!castCondition || typeof castCondition !== 'object' || !('kind' in castCondition)) {
    return null
  }

  if (castCondition.kind !== 'heroHealthBelow') {
    return null
  }

  const threshold = (castCondition as { threshold?: unknown }).threshold
  if (typeof threshold !== 'number') {
    return null
  }

  return `Only playable when your hero is below ${threshold} HP.`
}

export function isTypingTarget(event: KeyboardEvent): boolean {
  const target = event.target as HTMLElement | null
  if (!target) {
    return false
  }

  if (target.isContentEditable) {
    return true
  }

  const tagName = target.tagName
  if (tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT') {
    return true
  }

  return target.closest('[role="textbox"]') !== null
}
