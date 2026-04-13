import './App.css'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Toaster, toast } from 'react-hot-toast'
import type { BattleEvent } from '../../shared/models'
import { LUCK_BALANCE_LIMIT } from '../../shared/game-constants.ts'
import {
  type AppReplayActionLogEntry,
  type AppBattleSnapshot,
  branchSessionFromSnapshot,
  createInitialBattleSession,
  type AppActionHistoryEntry,
  jumpSessionToSnapshot,
  replaySessionFromActionLog,
  type AppBattleSession,
  type AppBattlePreview,
  resolveSessionBasicAttack,
  resolveSessionPlayCard,
  resolveSessionSimpleAction,
  resolveSessionUseEntityActive,
} from './game-client.ts'
import { DEFAULT_GAME_BOOTSTRAP_CONFIG, type GameBootstrapConfig } from './data/game-bootstrap.ts'
import { renderTextWithHighlightedNumbers, splitSummaryAndDetail } from './utils/render-numeric-text.tsx'
import {
  createReplayUrlPayload,
  readReplayPayloadFromLocation,
  writeReplayPayloadToLocation,
} from './utils/replay-url.ts'
import { PlayerScreen } from './components/PlayerScreen.tsx'
import { SettingsPanel } from './components/SettingsPanel.tsx'
import { RulebookPanel } from './components/RulebookPanel.tsx'

const SETTINGS_SEED_STORAGE_KEY = 'cmd-hero:settings-seed'
const SETTINGS_BOOTSTRAP_STORAGE_KEY = 'cmd-hero:settings-bootstrap-config'
const MUSIC_MUTED_STORAGE_KEY = 'cmd-hero:music-muted'
const SETTINGS_PANEL_STORAGE_KEY = 'cmd-hero:settings-panel-state'
const SAVED_DECKS_STORAGE_KEY = 'cmd-hero:saved-decks'
const AUTO_PLAY_BUTTONS_VISIBLE_STORAGE_KEY = 'cmd-hero:autoplay-buttons-visible'
const AUTO_PLAY_DELAY_STORAGE_KEY = 'cmd-hero:autoplay-delay-ms'
const AUTO_PLAY_AUTO_END_TURN_STORAGE_KEY = 'cmd-hero:autoplay-auto-end-turn-when-stuck'
const AUTO_PLAY_USE_ENTITY_ACTIVES_STORAGE_KEY = 'cmd-hero:autoplay-use-entity-actives'
const MUSIC_SOURCE = '/game_music.mp3'
const ACTION_TOAST_ID = 'action-feedback'
const ACTION_TOAST_DURATION_MS = 7000
const EVENT_TOAST_DURATION_MS = 4500
const AUTO_PLAY_MIN_DELAY_MS = 50
const AUTO_PLAY_DEFAULT_DELAY_MS = 200
const REPLAY_PLAYBACK_SPEEDS = [0.25, 0.5, 1, 2, 4] as const
const SETTINGS_EXPORT_STORAGE_KEYS = [
  SETTINGS_SEED_STORAGE_KEY,
  SETTINGS_BOOTSTRAP_STORAGE_KEY,
  SETTINGS_PANEL_STORAGE_KEY,
  SAVED_DECKS_STORAGE_KEY,
  MUSIC_MUTED_STORAGE_KEY,
  AUTO_PLAY_BUTTONS_VISIBLE_STORAGE_KEY,
  AUTO_PLAY_DELAY_STORAGE_KEY,
  AUTO_PLAY_AUTO_END_TURN_STORAGE_KEY,
  AUTO_PLAY_USE_ENTITY_ACTIVES_STORAGE_KEY,
]

type SettingsExportPayloadV1 = {
  version: 1
  storage: Record<string, string>
}

type IsGdCreateResponse = {
  shorturl?: string
  errorcode?: number
  errormessage?: string
}

type AppRuntime = {
  session: AppBattleSession
  preview: AppBattlePreview
}

type PlannedAutoPlayAction =
  | {
      kind: 'playCard'
      handCardId: string
      targetEntityId?: string
      targetPosition?: { row: number; column: number }
    }
  | {
      kind: 'basicAttack'
      targetEntityId: string
    }
  | {
      kind: 'useEntityActive'
      sourceEntityId: string
      targetEntityId?: string
    }
  | {
      kind: 'pressLuck'
    }
  | {
      kind: 'endTurn'
    }

function clampAutoPlayDelay(delayMs: number): number {
  if (!Number.isFinite(delayMs)) {
    return AUTO_PLAY_DEFAULT_DELAY_MS
  }

  return Math.max(AUTO_PLAY_MIN_DELAY_MS, Math.floor(delayMs))
}

function pickRandom<T>(items: T[]): T | null {
  if (items.length === 0) {
    return null
  }

  const index = Math.floor(Math.random() * items.length)
  return items[index] ?? null
}

function formatReplayPlaybackSpeed(speed: number): string {
  return Number.isInteger(speed) ? `${speed}x` : `${speed.toFixed(2).replace(/\.00$/, '')}x`
}

async function sha256Hex(input: string): Promise<string | null> {
  if (typeof window === 'undefined' || !window.crypto?.subtle) {
    return null
  }

  try {
    const digest = await window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(input))
    const bytes = new Uint8Array(digest)
    return Array.from(bytes)
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('')
  } catch {
    return null
  }
}

function buildIsGdShortlink(shortAlias: string): string {
  return `https://is.gd/${shortAlias}`
}

function buildReplayShortAlias(replayHashHex: string): string {
  return `cmd_hero_fights_${replayHashHex.slice(0, 7)}`
}

type ReplayNavigationDirection = -1 | 1

function createRuntimeFromConfig(config = DEFAULT_GAME_BOOTSTRAP_CONFIG): AppRuntime {
  const initial = createInitialBattleSession(config)
  return {
    session: initial.session,
    preview: initial.preview,
  }
}

function createActionLogFromSession(session: AppBattleSession): AppReplayActionLogEntry[] {
  return session.snapshots
    .filter((snapshot) => snapshot.phase === 'post')
    .map((snapshot) => ({
      action: snapshot.action,
    }))
}

function getReplayModeActiveSnapshot(session: AppBattleSession): AppBattleSnapshot | null {
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

function ensureSessionReadyForAction(session: AppBattleSession) {
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

function incrementSeed(seed: string): string {
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

function loadBootstrapConfig() {
  if (typeof window === 'undefined') {
    return DEFAULT_GAME_BOOTSTRAP_CONFIG
  }

  const persistedBootstrapConfig = window.localStorage.getItem(SETTINGS_BOOTSTRAP_STORAGE_KEY)
  if (persistedBootstrapConfig) {
    try {
      const parsed = JSON.parse(persistedBootstrapConfig) as GameBootstrapConfig
      const nextConfig = {
        ...parsed,
        seed: incrementSeed(parsed.seed || DEFAULT_GAME_BOOTSTRAP_CONFIG.seed),
      }

      window.localStorage.setItem(SETTINGS_BOOTSTRAP_STORAGE_KEY, JSON.stringify(nextConfig))
      window.localStorage.setItem(SETTINGS_SEED_STORAGE_KEY, nextConfig.seed)

      return nextConfig
    } catch {
      // Fall back to the default config path below.
    }
  }

  const persistedSeed = window.localStorage.getItem(SETTINGS_SEED_STORAGE_KEY)?.trim()
  const baseSeed = persistedSeed || DEFAULT_GAME_BOOTSTRAP_CONFIG.seed
  const nextSeed = incrementSeed(baseSeed)
  const nextConfig = {
    ...DEFAULT_GAME_BOOTSTRAP_CONFIG,
    seed: nextSeed,
  }

  window.localStorage.setItem(SETTINGS_SEED_STORAGE_KEY, nextSeed)
  window.localStorage.setItem(SETTINGS_BOOTSTRAP_STORAGE_KEY, JSON.stringify(nextConfig))

  return nextConfig
}

function updateHoverCardPlacement(wrap: HTMLElement) {
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

function renderDisplayText(displayText?: {
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

function describeCardCastCondition(cardDefinition: unknown): string | null {
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

function isTypingTarget(event: KeyboardEvent): boolean {
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

function App() {
  const [initialReplayPayload] = useState(() => readReplayPayloadFromLocation())
  const [initialBootstrapConfig] = useState(() => initialReplayPayload?.bootstrapConfig ?? loadBootstrapConfig())
  const [bootstrapConfig, setBootstrapConfig] = useState(initialBootstrapConfig)
  const [startupError] = useState(() => {
    try {
      if (initialReplayPayload) {
        const replayResult = replaySessionFromActionLog({
          config: initialReplayPayload.bootstrapConfig,
          actionLog: initialReplayPayload.actionLog,
          snapshotId: initialReplayPayload.snapshotId ?? undefined,
        })

        if (!replayResult.ok) {
          throw new Error(replayResult.reason)
        }
      } else {
        createRuntimeFromConfig(initialBootstrapConfig)
      }

      return null as string | null
    } catch (error) {
      return error instanceof Error ? error.message : 'Failed to create battle preview.'
    }
  })
  const [runtime, setRuntime] = useState<AppRuntime | null>(() => {
    try {
      if (initialReplayPayload) {
        const replayResult = replaySessionFromActionLog({
          config: initialReplayPayload.bootstrapConfig,
          actionLog: initialReplayPayload.actionLog,
          snapshotId: initialReplayPayload.snapshotId ?? undefined,
        })

        if (!replayResult.ok) {
          return null
        }

        return {
          session: replayResult.session,
          preview: replayResult.preview,
        }
      }

      return createRuntimeFromConfig(initialBootstrapConfig)
    } catch {
      return null
    }
  })
  const [resetEpoch, setResetEpoch] = useState(0)
  const [liveAnnouncement, setLiveAnnouncement] = useState<{ id: number; text: string }>({ id: 0, text: '' })
  const [isShiftHeld, setIsShiftHeld] = useState(false)
  const [showDetailedTooltips, setShowDetailedTooltips] = useState(false)
  const [isDeckEditorOpen, setIsDeckEditorOpen] = useState(false)
  const [deckEditorHeroIndex, setDeckEditorHeroIndex] = useState<0 | 1>(0)
  const [isSettingsPanelOpen, setIsSettingsPanelOpen] = useState(false)
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false)
  const [isRulebookOpen, setIsRulebookOpen] = useState(false)
  const [isReplayModeOpen, setIsReplayModeOpen] = useState(false)
  const [isReplayPlaying, setIsReplayPlaying] = useState(false)
  const [replayPlaybackSpeedIndex, setReplayPlaybackSpeedIndex] = useState(0)
  const [replayBarPosition, setReplayBarPosition] = useState<{ x: number; y: number }>(() => {
    if (typeof window === 'undefined') {
      return { x: 0, y: 0 }
    }
    const stored = window.localStorage.getItem('REPLAY_BAR_POSITION')
    if (!stored) return { x: 0, y: 0 }
    try {
      return JSON.parse(stored)
    } catch {
      return { x: 0, y: 0 }
    }
  })
  const [autoPlayButtonsVisible, setAutoPlayButtonsVisible] = useState(() => {
    if (typeof window === 'undefined') {
      return false
    }

    return window.localStorage.getItem(AUTO_PLAY_BUTTONS_VISIBLE_STORAGE_KEY) === 'true'
  })
  const [isAutoPlayAEnabled, setIsAutoPlayAEnabled] = useState(false)
  const [isAutoPlayBEnabled, setIsAutoPlayBEnabled] = useState(false)
  const [autoPlayAutoEndTurnWhenNoLegalMoves, setAutoPlayAutoEndTurnWhenNoLegalMoves] = useState(() => {
    if (typeof window === 'undefined') {
      return true
    }

    const stored = window.localStorage.getItem(AUTO_PLAY_AUTO_END_TURN_STORAGE_KEY)
    return stored === null ? true : stored === 'true'
  })
  const [autoPlayUseEntityActives, setAutoPlayUseEntityActives] = useState(() => {
    if (typeof window === 'undefined') {
      return true
    }

    const stored = window.localStorage.getItem(AUTO_PLAY_USE_ENTITY_ACTIVES_STORAGE_KEY)
    return stored === null ? true : stored === 'true'
  })
  const [autoPlayDelayMs, setAutoPlayDelayMs] = useState(() => {
    if (typeof window === 'undefined') {
      return AUTO_PLAY_DEFAULT_DELAY_MS
    }

    const parsed = Number.parseInt(window.localStorage.getItem(AUTO_PLAY_DELAY_STORAGE_KEY) ?? '', 10)
    return clampAutoPlayDelay(parsed)
  })
  const musicAudioRef = useRef<HTMLAudioElement | null>(null)
  const replayTimelineListRef = useRef<HTMLUListElement | null>(null)
  const replayNavigationFrameRef = useRef<number | null>(null)
  const replayNavigationDirectionRef = useRef<ReplayNavigationDirection | 0>(0)
  const replayBarDragStateRef = useRef<{
    isDragging: boolean
    startX: number
    startY: number
    offsetX: number
    offsetY: number
  }>({ isDragging: false, startX: 0, startY: 0, offsetX: 0, offsetY: 0 })
  const [isMusicMuted, setIsMusicMuted] = useState(() => {
    if (typeof window === 'undefined') {
      return false
    }

    return window.localStorage.getItem(MUSIC_MUTED_STORAGE_KEY) === 'true'
  })

  const announce = (text: string) => {
    if (!text.trim()) {
      return
    }

    setLiveAnnouncement((current) => ({
      id: current.id + 1,
      text,
    }))
  }

  useEffect(() => {
    const root = document.documentElement
    const markShift = (held: boolean) => {
      setIsShiftHeld(held)
      root.dataset.shiftHeld = held ? 'true' : 'false'
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Shift') {
        markShift(true)
      }
    }

    const onKeyUp = (event: KeyboardEvent) => {
      if (event.key === 'Shift') {
        markShift(false)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)

    const updateActiveHoverCards = () => {
      document.querySelectorAll<HTMLElement>('.hint-wrap').forEach((wrap) => {
        if (wrap.matches(':hover, :focus-within')) {
          updateHoverCardPlacement(wrap)
        }
      })
    }

    const handlePointerOver = (event: PointerEvent) => {
      const wrap = (event.target as HTMLElement | null)?.closest('.hint-wrap') as HTMLElement | null
      if (wrap) {
        updateHoverCardPlacement(wrap)
      }
    }

    const handleFocusIn = (event: FocusEvent) => {
      const wrap = (event.target as HTMLElement | null)?.closest('.hint-wrap') as HTMLElement | null
      if (wrap) {
        updateHoverCardPlacement(wrap)
      }
    }

    window.addEventListener('pointerover', handlePointerOver, true)
    window.addEventListener('focusin', handleFocusIn)
    window.addEventListener('resize', updateActiveHoverCards)
    window.addEventListener('scroll', updateActiveHoverCards, true)

    updateActiveHoverCards()

    return () => {
      delete root.dataset.shiftHeld
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('pointerover', handlePointerOver, true)
      window.removeEventListener('focusin', handleFocusIn)
      window.removeEventListener('resize', updateActiveHoverCards)
      window.removeEventListener('scroll', updateActiveHoverCards, true)
    }
  }, [])

  useEffect(() => {
    if (!musicAudioRef.current) {
      return
    }

    const audio = musicAudioRef.current
    audio.loop = true
    audio.muted = isMusicMuted
    window.localStorage.setItem(MUSIC_MUTED_STORAGE_KEY, String(isMusicMuted))

    if (!isMusicMuted) {
      void audio.play().catch(() => {})
    }
  }, [isMusicMuted])

  useEffect(() => {
    if (!runtime) {
      return
    }

    const actionLog = createActionLogFromSession(runtime.session)
    const payload = createReplayUrlPayload({
      bootstrapConfig,
      seed: runtime.session.state.seed,
      actionLog,
      snapshotId: runtime.session.activeSnapshotId,
    })
    writeReplayPayloadToLocation(payload)
  }, [bootstrapConfig, runtime])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    window.localStorage.setItem(AUTO_PLAY_BUTTONS_VISIBLE_STORAGE_KEY, String(autoPlayButtonsVisible))
  }, [autoPlayButtonsVisible])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    window.localStorage.setItem(AUTO_PLAY_DELAY_STORAGE_KEY, String(clampAutoPlayDelay(autoPlayDelayMs)))
  }, [autoPlayDelayMs])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    window.localStorage.setItem(AUTO_PLAY_AUTO_END_TURN_STORAGE_KEY, String(autoPlayAutoEndTurnWhenNoLegalMoves))
  }, [autoPlayAutoEndTurnWhenNoLegalMoves])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    window.localStorage.setItem(AUTO_PLAY_USE_ENTITY_ACTIVES_STORAGE_KEY, String(autoPlayUseEntityActives))
  }, [autoPlayUseEntityActives])

  useEffect(() => {
    if (typeof document === 'undefined') {
      return
    }

    const shouldLockBackgroundScroll =
      isDeckEditorOpen ||
      isSettingsPanelOpen ||
      isHistoryModalOpen ||
      isReplayModeOpen ||
      isRulebookOpen

    if (!shouldLockBackgroundScroll) {
      return
    }

    const root = document.documentElement
    const body = document.body
    const previousRootOverflow = root.style.overflow
    const previousBodyOverflow = body.style.overflow
    const previousRootOverscroll = root.style.overscrollBehavior
    const previousBodyOverscroll = body.style.overscrollBehavior

    root.style.overflow = 'hidden'
    body.style.overflow = 'hidden'
    root.style.overscrollBehavior = 'none'
    body.style.overscrollBehavior = 'none'

    return () => {
      root.style.overflow = previousRootOverflow
      body.style.overflow = previousBodyOverflow
      root.style.overscrollBehavior = previousRootOverscroll
      body.style.overscrollBehavior = previousBodyOverscroll
    }
  }, [isDeckEditorOpen, isHistoryModalOpen, isReplayModeOpen, isRulebookOpen, isSettingsPanelOpen])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || isTypingTarget(event)) {
        return
      }

      if (isRulebookOpen) {
        if (event.key === 'Escape') {
          event.preventDefault()
          setIsRulebookOpen(false)
        }
        return
      }

      const key = event.key.toLowerCase()
      if (key === 's') {
        event.preventDefault()
        setIsSettingsPanelOpen((current) => !current)
        return
      }

      if (key === 'h') {
        event.preventDefault()
        if (!isHistoryModalOpen && !isReplayModeOpen) {
          setIsHistoryModalOpen(true)
        } else if (isHistoryModalOpen) {
          setIsHistoryModalOpen(false)
          setIsReplayModeOpen(true)
        } else {
          setIsReplayModeOpen(false)
        }
        return
      }

      if (event.key === 'Escape' && isSettingsPanelOpen && !isHistoryModalOpen && !isReplayModeOpen) {
        event.preventDefault()
        setIsSettingsPanelOpen(false)
        return
      }

      if (!isHistoryModalOpen && !isReplayModeOpen) {
        return
      }

      if (event.key === 'Escape') {
        event.preventDefault()
        if (isHistoryModalOpen) {
          setIsHistoryModalOpen(false)
        } else {
          setIsReplayModeOpen(false)
        }
        return
      }

      if (!runtime || runtime.session.snapshots.length === 0) {
        return
      }

      const postSnapshots = runtime.session.snapshots.filter((snapshot) => snapshot.phase === 'post')
      const firstPreSnapshot = runtime.session.snapshots.find((snapshot) => snapshot.phase === 'pre') ?? null
      const timelineSnapshots = firstPreSnapshot ? [firstPreSnapshot, ...postSnapshots] : postSnapshots
      const timelineLatestSnapshotId = timelineSnapshots.at(-1)?.id ?? null
      const currentSnapshotId = runtime.session.activeSnapshotId ?? timelineLatestSnapshotId
      const currentSnapshot = currentSnapshotId
        ? runtime.session.snapshots.find((snapshot) => snapshot.id === currentSnapshotId) ?? null
        : null
      const branchSnapshotId = runtime.session.activeSnapshotId
      const timelineActiveSnapshotId = currentSnapshot
        ? currentSnapshot.phase === 'pre'
          ? firstPreSnapshot?.id ?? null
          : currentSnapshot.id
        : null
      const timelineActiveSnapshot = timelineActiveSnapshotId
        ? timelineSnapshots.find((snapshot) => snapshot.id === timelineActiveSnapshotId) ?? null
        : null
      const timelineActiveSnapshotIndex = timelineActiveSnapshotId
        ? timelineSnapshots.findIndex((snapshot) => snapshot.id === timelineActiveSnapshotId)
        : -1

      const jumpToSnapshot = (snapshotId: number) => {
        setRuntime((prev) => {
          if (!prev) {
            return prev
          }

          const result = jumpSessionToSnapshot({
            session: prev.session,
            snapshotId,
          })

          if (!result.ok) {
            return prev
          }

          return {
            session: result.session,
            preview: result.preview,
          }
        })
      }

      if (event.key === 'Home' && timelineSnapshots.length > 0) {
        event.preventDefault()
        jumpToSnapshot(timelineSnapshots[0]!.id)
        return
      }

      if (event.key === 'End' && timelineLatestSnapshotId) {
        event.preventDefault()
        jumpToSnapshot(timelineLatestSnapshotId)
        return
      }

      if (event.key === 'ArrowLeft' && timelineActiveSnapshotIndex > 0) {
        event.preventDefault()
        queueReplayTimelineStep(-1)
        return
      }

      if (event.key === 'ArrowRight' && timelineActiveSnapshotIndex >= 0 && timelineActiveSnapshotIndex < timelineSnapshots.length - 1) {
        event.preventDefault()
        queueReplayTimelineStep(1)
        return
      }

      if (key === 'b' && branchSnapshotId) {
        event.preventDefault()
        let branchMessage: string | null = null

        setRuntime((prev) => {
          if (!prev) {
            return prev
          }

          const result = branchSessionFromSnapshot({
            session: prev.session,
            snapshotId: branchSnapshotId,
          })

          if (!result.ok) {
            return prev
          }

          branchMessage = `Branch resumed from snapshot ${branchSnapshotId}.`
          return {
            session: result.session,
            preview: result.preview,
          }
        })

        if (branchMessage) {
          setLiveAnnouncement((current) => ({ id: current.id + 1, text: branchMessage ?? '' }))
          toast.success(branchMessage, {
            id: ACTION_TOAST_ID,
            duration: ACTION_TOAST_DURATION_MS,
          })
        }
        return
      }

      if (key === 'c') {
        event.preventDefault()
        const payload = createReplayUrlPayload({
          bootstrapConfig,
          seed: runtime.session.state.seed,
          actionLog: createActionLogFromSession(runtime.session),
          snapshotId: timelineActiveSnapshotId ?? null,
        })

        void navigator.clipboard
          .writeText(JSON.stringify(payload, null, 2))
          .then(() => {
            setLiveAnnouncement((current) => ({ id: current.id + 1, text: 'Replay payload copied to clipboard.' }))
            toast.success('Replay payload copied to clipboard.', {
              id: ACTION_TOAST_ID,
              duration: ACTION_TOAST_DURATION_MS,
            })
          })
          .catch(() => {
            setLiveAnnouncement((current) => ({ id: current.id + 1, text: 'Failed to copy replay payload.' }))
            toast.error('Failed to copy replay payload.', {
              id: ACTION_TOAST_ID,
              duration: ACTION_TOAST_DURATION_MS,
            })
          })
        return
      }

      if (key === 'v') {
        event.preventDefault()
        if (!timelineActiveSnapshotId || !timelineActiveSnapshot) {
          setLiveAnnouncement((current) => ({ id: current.id + 1, text: 'Select a snapshot before validating replay determinism.' }))
          toast.error('Select a snapshot before validating replay determinism.', {
            id: ACTION_TOAST_ID,
            duration: ACTION_TOAST_DURATION_MS,
          })
          return
        }

        const replayResult = replaySessionFromActionLog({
          config: {
            ...bootstrapConfig,
            seed: runtime.session.state.seed,
          },
          actionLog: createActionLogFromSession(runtime.session),
          snapshotId: timelineActiveSnapshotId ?? null,
        })

        if (!replayResult.ok) {
          const message = `Replay validation failed: ${replayResult.reason}`
          setLiveAnnouncement((current) => ({ id: current.id + 1, text: message }))
          toast.error(message, {
            id: ACTION_TOAST_ID,
            duration: ACTION_TOAST_DURATION_MS,
          })
          return
        }

        const rebuiltSnapshot = replayResult.session.snapshots.find(
          (snapshot) => snapshot.id === timelineActiveSnapshotId,
        )
        if (!rebuiltSnapshot) {
          const message = `Replay validation failed: snapshot ${timelineActiveSnapshotId} was not rebuilt.`
          setLiveAnnouncement((current) => ({ id: current.id + 1, text: message }))
          toast.error(message, {
            id: ACTION_TOAST_ID,
            duration: ACTION_TOAST_DURATION_MS,
          })
          return
        }

        const sameState = JSON.stringify(rebuiltSnapshot.state) === JSON.stringify(timelineActiveSnapshot.state)
        const sameEvents = JSON.stringify(rebuiltSnapshot.events) === JSON.stringify(timelineActiveSnapshot.events)
        const sameSequence = rebuiltSnapshot.nextSequence === timelineActiveSnapshot.nextSequence
        const sameRngStep = rebuiltSnapshot.rngCheckpoint.stepCount === timelineActiveSnapshot.rngCheckpoint.stepCount

        if (sameState && sameEvents && sameSequence && sameRngStep) {
          const message = `Replay validation passed at snapshot ${timelineActiveSnapshotId}.`
          setLiveAnnouncement((current) => ({ id: current.id + 1, text: message }))
          toast.success(message, {
            id: ACTION_TOAST_ID,
            duration: ACTION_TOAST_DURATION_MS,
          })
          return
        }

        let mismatch = 'state mismatch'
        if (!sameEvents) {
          mismatch = 'event mismatch'
        } else if (!sameSequence) {
          mismatch = 'nextSequence mismatch'
        } else if (!sameRngStep) {
          mismatch = 'RNG step mismatch'
        }

        const message = `Replay validation failed at snapshot ${timelineActiveSnapshotId}: ${mismatch}.`
        setLiveAnnouncement((current) => ({ id: current.id + 1, text: message }))
        toast.error(message, {
          id: ACTION_TOAST_ID,
          duration: ACTION_TOAST_DURATION_MS,
        })
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [bootstrapConfig, isHistoryModalOpen, isReplayModeOpen, isRulebookOpen, isSettingsPanelOpen, runtime])

  const handleOpenRulebook = () => {
    setIsSettingsPanelOpen(false)
    setIsHistoryModalOpen(false)
    setIsReplayModeOpen(false)
    setIsRulebookOpen(true)
  }

  const handleCloseRulebook = () => {
    setIsRulebookOpen(false)
  }

  const resetRuntime = (nextConfig = bootstrapConfig) => {
    try {
      const nextRuntime = createRuntimeFromConfig(nextConfig)
      setRuntime(nextRuntime)
      setResetEpoch((current) => current + 1)
      return null
    } catch (error) {
      return error instanceof Error ? error.message : 'Failed to reset battle preview.'
    }
  }

  const shouldShowDetailedTooltips = isShiftHeld || showDetailedTooltips

  const handleToggleDetailedTooltips = () => {
    setShowDetailedTooltips((current) => !current)
  }

  const showActionErrorToast = (message: string) => {
    announce(message)
    toast.error(message, {
      id: ACTION_TOAST_ID,
      duration: ACTION_TOAST_DURATION_MS,
    })
  }

  const renderStructuredToast = (summary: string, detail: string | null, showDetail: boolean) => {
    return (
      <span className={`game-toast-body ${showDetail ? 'game-toast-body-expanded' : ''}`.trim()}>
        <span className="game-toast-summary">{renderTextWithHighlightedNumbers(summary, 'game-toast-number')}</span>
        {showDetail && detail ? (
          <span className="game-toast-detail">{renderTextWithHighlightedNumbers(detail, 'game-toast-number')}</span>
        ) : null}
      </span>
    )
  }

  const showActionSuccessToast = (message: string, events: BattleEvent[]) => {
    const split = splitSummaryAndDetail(message)
    announce(split.summary)
    const damageEvent = events.find(
      (event): event is Extract<BattleEvent, { kind: 'damageApplied' }> => event.kind === 'damageApplied',
    )
    const luckEvent = events.find(
      (event): event is Extract<BattleEvent, { kind: 'luckBalanceChanged' }> =>
        event.kind === 'luckBalanceChanged',
    )

    let detail = split.detail
    if (damageEvent) {
      const detailParts = [
        damageEvent.rngRawRoll !== undefined ? `raw ${damageEvent.rngRawRoll.toFixed(2)}` : null,
        damageEvent.rngAdjustedRoll !== undefined
          ? `luck-adjusted ${damageEvent.rngAdjustedRoll.toFixed(2)}`
          : null,
        damageEvent.rngFinalRoll !== undefined ? `final ${damageEvent.rngFinalRoll.toFixed(2)}` : null,
        damageEvent.rngDodgeRoll !== undefined ? `dodge ${damageEvent.rngDodgeRoll.toFixed(2)}` : null,
      ].filter((part): part is string => !!part)
      detail = detailParts.length > 0 ? `Roll detail: ${detailParts.join(' -> ')}.` : detail
    } else if (luckEvent) {
      detail = `Luck balance ${luckEvent.previousBalance} -> ${luckEvent.nextBalance}.`
    }

    toast.success(renderStructuredToast(split.summary, detail, shouldShowDetailedTooltips), {
      id: ACTION_TOAST_ID,
      duration: ACTION_TOAST_DURATION_MS,
    })
  }

  const showBattleEventToast = (event: BattleEvent) => {
    let summary: string | null = null
    let detail: string | null = null

    if (event.kind === 'listenerTriggered') {
      if (event.listenerId.includes(':passive:heal-on-attack')) {
        return
      }
      const split = splitSummaryAndDetail(event.message)
      summary = split.summary
      detail = split.detail
    } else if (event.kind === 'damageApplied') {
      summary = event.wasDodged
        ? `${event.damageType} attack was dodged.`
        : `${event.amount} ${event.damageType} damage applied.`
      const detailParts = [
        event.rngRawRoll !== undefined ? `raw ${event.rngRawRoll.toFixed(2)}` : null,
        event.rngAdjustedRoll !== undefined ? `luck-adjusted ${event.rngAdjustedRoll.toFixed(2)}` : null,
        event.rngFinalRoll !== undefined ? `final ${event.rngFinalRoll.toFixed(2)}` : null,
        event.rngDodgeRoll !== undefined ? `dodge ${event.rngDodgeRoll.toFixed(2)}` : null,
      ].filter((part): part is string => !!part)
      detail = detailParts.length > 0 ? `Roll detail: ${detailParts.join(' -> ')}.` : null
    } else if (event.kind === 'healApplied') {
      summary = `Restored ${event.amount} HP.`
    } else if (event.kind === 'luckBalanceChanged') {
      summary = `Luck shifted to ${event.nextBalance}.`
      detail = `Balance changed from ${event.previousBalance} to ${event.nextBalance}.`
    } else if (event.kind === 'auraApplied') {
      summary = `Aura applied (${event.auraKind}).`
      detail = `Stacks: ${event.stackCount}. Expires on turn ${event.expiresOnTurnNumber}.`
    } else if (event.kind === 'auraExpired') {
      summary = `Aura expired (${event.auraKind}).`
      detail = `Expired on turn ${event.expiredOnTurnNumber}.`
    }

    if (!summary) {
      return
    }

    announce(summary)

    toast(renderStructuredToast(summary, detail, shouldShowDetailedTooltips), {
      id: `battle-event-${event.sequence}`,
      duration: EVENT_TOAST_DURATION_MS,
    })
  }

  const showReplaySnapshotToasts = (snapshot: AppBattleSnapshot) => {
    if (!snapshot.success) {
      showActionErrorToast(snapshot.resultMessage)
      return
    }

    showActionSuccessToast(snapshot.resultMessage, snapshot.events)
    for (const event of snapshot.events) {
      showBattleEventToast(event)
    }
  }

  const replayPlaybackSpeed = REPLAY_PLAYBACK_SPEEDS[replayPlaybackSpeedIndex] ?? 1

  useEffect(() => {
    if (!isReplayModeOpen) {
      setIsReplayPlaying(false)
      return
    }

    if (!isReplayPlaying || !runtime || runtime.session.snapshots.length === 0) {
      return
    }

    const replayPostSnapshots = runtime.session.snapshots.filter((snapshot) => snapshot.phase === 'post')
    const replayFirstPreSnapshot = runtime.session.snapshots.find((snapshot) => snapshot.phase === 'pre') ?? null
    const replayTimelineSnapshots = replayFirstPreSnapshot ? [replayFirstPreSnapshot, ...replayPostSnapshots] : replayPostSnapshots
    const replayTimelineLatestSnapshotId = replayTimelineSnapshots.at(-1)?.id ?? null
    const replayCurrentSnapshotId = runtime.session.activeSnapshotId ?? replayTimelineLatestSnapshotId
    const replayCurrentSnapshot = replayCurrentSnapshotId
      ? runtime.session.snapshots.find((snapshot) => snapshot.id === replayCurrentSnapshotId) ?? null
      : null
    const replayActiveSnapshotId = replayCurrentSnapshot
      ? replayCurrentSnapshot.phase === 'pre'
        ? replayFirstPreSnapshot?.id ?? null
        : replayCurrentSnapshot.id
      : null
    const replayActiveSnapshotIndex = replayActiveSnapshotId
      ? replayTimelineSnapshots.findIndex((snapshot) => snapshot.id === replayActiveSnapshotId)
      : -1

    if (replayActiveSnapshotIndex < 0 || replayActiveSnapshotIndex >= replayTimelineSnapshots.length - 1) {
      setIsReplayPlaying(false)
      return
    }

    const nextSnapshotId = replayTimelineSnapshots[replayActiveSnapshotIndex + 1]?.id ?? null
    if (!nextSnapshotId) {
      setIsReplayPlaying(false)
      return
    }

    const timeout = window.setTimeout(() => {
      setRuntime((prev) => {
        if (!prev) {
          return prev
        }

        const result = jumpSessionToSnapshot({
          session: prev.session,
          snapshotId: nextSnapshotId,
        })

        if (!result.ok) {
          return prev
        }

        return {
          session: result.session,
          preview: result.preview,
        }
      })
    }, Math.max(120, Math.floor(1000 / replayPlaybackSpeed)))

    return () => {
      window.clearTimeout(timeout)
    }
  }, [isReplayModeOpen, isReplayPlaying, replayPlaybackSpeed, runtime])

  useEffect(() => {
    if (!isReplayModeOpen) {
      return
    }

    toast.dismiss()

    if (!runtime) {
      return () => {
        toast.dismiss()
      }
    }

    const activeReplaySnapshot = getReplayModeActiveSnapshot(runtime.session)
    if (!activeReplaySnapshot) {
      return () => {
        toast.dismiss()
      }
    }

    showReplaySnapshotToasts(activeReplaySnapshot)

    return () => {
      toast.dismiss()
    }
  }, [isReplayModeOpen, runtime])

  const handleSeedChange = (seed: string) => {
    const nextConfig: GameBootstrapConfig = {
      ...bootstrapConfig,
      seed: seed.trim() || DEFAULT_GAME_BOOTSTRAP_CONFIG.seed,
    }
    handleBootstrapConfigChange(nextConfig)
  }

  const handleBootstrapConfigChange = (nextConfig: GameBootstrapConfig) => {
    const failureReason = resetRuntime(nextConfig)
    if (failureReason) {
      showActionErrorToast(failureReason)
      return false
    }

    setBootstrapConfig(nextConfig)

    if (typeof window !== 'undefined') {
      window.localStorage.setItem(SETTINGS_SEED_STORAGE_KEY, nextConfig.seed)
      window.localStorage.setItem(SETTINGS_BOOTSTRAP_STORAGE_KEY, JSON.stringify(nextConfig))
    }

    return true
  }

  const handleOpenDeckEditor = (heroIndex: 0 | 1) => {
    setDeckEditorHeroIndex(heroIndex)
    setIsDeckEditorOpen(true)
  }

  const handleCloseDeckEditor = () => {
    setIsDeckEditorOpen(false)
    setIsSettingsPanelOpen(false)
  }

  const handleHardReset = () => {
    const failureReason = resetRuntime(bootstrapConfig)
    if (failureReason) {
      showActionErrorToast(failureReason)
    }
  }

  const handleHardReroll = () => {
    const nextSeed = incrementSeed(bootstrapConfig.seed || DEFAULT_GAME_BOOTSTRAP_CONFIG.seed)
    const nextConfig: GameBootstrapConfig = {
      ...bootstrapConfig,
      seed: nextSeed,
    }

    const changed = handleBootstrapConfigChange(nextConfig)
    if (changed) {
      showActionSuccessToast(`Hard reroll complete. New seed: ${nextSeed}.`, [])
    }
  }

  const handleAutoPlayButtonsVisibleChange = (nextValue: boolean) => {
    setAutoPlayButtonsVisible(nextValue)
    if (!nextValue) {
      setIsAutoPlayAEnabled(false)
      setIsAutoPlayBEnabled(false)
    }
  }

  const handleAutoPlayDelayMsChange = (nextValue: number) => {
    setAutoPlayDelayMs(clampAutoPlayDelay(nextValue))
  }

  const handleAutoPlayAutoEndTurnWhenNoLegalMovesChange = (nextValue: boolean) => {
    setAutoPlayAutoEndTurnWhenNoLegalMoves(nextValue)
  }

  const handleAutoPlayUseEntityActivesChange = (nextValue: boolean) => {
    setAutoPlayUseEntityActives(nextValue)
  }

  const handleExportSettings = (): string | null => {
    if (typeof window === 'undefined') {
      return null
    }

    const storage: Record<string, string> = {}
    for (const key of SETTINGS_EXPORT_STORAGE_KEYS) {
      const value = window.localStorage.getItem(key)
      if (value !== null) {
        storage[key] = value
      }
    }

    const payload: SettingsExportPayloadV1 = {
      version: 1,
      storage,
    }

    return JSON.stringify(payload, null, 2)
  }

  const handleImportSettings = (rawText: string): { ok: boolean; message: string } => {
    if (typeof window === 'undefined') {
      return { ok: false, message: 'Settings import is only available in browser mode.' }
    }

    let parsed: unknown
    try {
      parsed = JSON.parse(rawText)
    } catch {
      return { ok: false, message: 'Settings JSON is invalid.' }
    }

    if (!parsed || typeof parsed !== 'object') {
      return { ok: false, message: 'Settings payload must be an object.' }
    }

    const payload = parsed as Partial<SettingsExportPayloadV1>
    if (payload.version !== 1) {
      return { ok: false, message: 'Unsupported settings payload version.' }
    }

    if (!payload.storage || typeof payload.storage !== 'object') {
      return { ok: false, message: 'Settings payload storage is missing.' }
    }

    for (const key of SETTINGS_EXPORT_STORAGE_KEYS) {
      window.localStorage.removeItem(key)
    }

    for (const key of SETTINGS_EXPORT_STORAGE_KEYS) {
      const value = (payload.storage as Record<string, unknown>)[key]
      if (typeof value === 'string') {
        window.localStorage.setItem(key, value)
      }
    }

    window.location.reload()
    return { ok: true, message: 'Settings imported. Reloading...' }
  }

  const runAutoPlayStep = useCallback((side: 'a' | 'b') => {
    let failureReason: string | null = null
    let successResult: { resultMessage: string; events: BattleEvent[] } | null = null

    setRuntime((prev) => {
      if (!prev) {
        return prev
      }

      const [currentHeroAId, currentHeroBId] = prev.preview.heroEntityIds
      const heroEntityId = side === 'a' ? currentHeroAId : currentHeroBId
      if (prev.preview.activeHeroEntityId !== heroEntityId) {
        return prev
      }

      const branchPrep = ensureSessionReadyForAction(prev.session)
      if (!branchPrep.ok) {
        failureReason = branchPrep.reason
        return prev
      }

      const heroTargets = prev.preview.heroActionTargets.find((entry) => entry.heroEntityId === heroEntityId)
      if (!heroTargets) {
        failureReason = 'Auto-play could not find hero action targets.'
        return prev
      }

      const heroHand = prev.preview.heroHands.find((entry) => entry.heroEntityId === heroEntityId)
      const heroCount = prev.preview.heroHandCounts.find((entry) => entry.heroEntityId === heroEntityId)
      if (!heroCount) {
        failureReason = 'Auto-play could not find hero move points.'
        return prev
      }

      const plannedActions: PlannedAutoPlayAction[] = []

      for (const card of heroHand?.cards ?? []) {
        if (!card.isPlayable) {
          continue
        }

        const hasEntityTargets = card.validTargetEntityIds.length > 0
        const hasPlacementTargets = card.validPlacementPositions.length > 0
        const shouldUseEntityTarget = hasEntityTargets && (!hasPlacementTargets || Math.random() < 0.5)
        const targetEntityId = shouldUseEntityTarget
          ? pickRandom(card.validTargetEntityIds) ?? undefined
          : undefined
        const targetPosition = !shouldUseEntityTarget && hasPlacementTargets
          ? pickRandom(card.validPlacementPositions) ?? undefined
          : undefined
        plannedActions.push({
          kind: 'playCard',
          handCardId: card.handCardId,
          targetEntityId,
          targetPosition,
        })
      }

      if (autoPlayUseEntityActives) {
        for (const option of heroTargets.entityActive) {
          plannedActions.push({
            kind: 'useEntityActive',
            sourceEntityId: option.sourceEntityId,
            targetEntityId: pickRandom(option.validTargetEntityIds) ?? undefined,
          })
        }
      }

      const basicAttackTargetEntityId = pickRandom(heroTargets.basicAttack.validTargetEntityIds)
      if (basicAttackTargetEntityId) {
        plannedActions.push({
          kind: 'basicAttack',
          targetEntityId: basicAttackTargetEntityId,
        })
      }

      const pressLuckMoveCost = heroTargets.pressLuck.moveCost
      const isSelfLuckAnchor = prev.preview.luck.anchorHeroEntityId === heroEntityId
      const pressLuckAtFavorableLimit = isSelfLuckAnchor
        ? prev.preview.luck.balance >= LUCK_BALANCE_LIMIT
        : prev.preview.luck.balance <= -LUCK_BALANCE_LIMIT
      if (
        !prev.preview.turn.pressLuckUsedThisTurn
        && !pressLuckAtFavorableLimit
        && heroCount.movePoints >= pressLuckMoveCost
      ) {
        plannedActions.push({ kind: 'pressLuck' })
      }

      let planned: PlannedAutoPlayAction | null
      if (autoPlayAutoEndTurnWhenNoLegalMoves) {
        planned = plannedActions.length > 0 ? pickRandom(plannedActions) : { kind: 'endTurn' }
      } else {
        plannedActions.push({ kind: 'endTurn' })
        planned = pickRandom(plannedActions)
      }
      if (!planned) {
        failureReason = 'Auto-play could not choose an action.'
        return prev
      }

      let result:
        | ReturnType<typeof resolveSessionPlayCard>
        | ReturnType<typeof resolveSessionBasicAttack>
        | ReturnType<typeof resolveSessionUseEntityActive>
        | ReturnType<typeof resolveSessionSimpleAction>

      switch (planned.kind) {
        case 'playCard':
          result = resolveSessionPlayCard({
            session: branchPrep.session,
            actorHeroEntityId: heroEntityId,
            handCardId: planned.handCardId,
            targetEntityId: planned.targetEntityId,
            targetPosition: planned.targetPosition,
          })
          break
        case 'basicAttack':
          result = resolveSessionBasicAttack({
            session: branchPrep.session,
            actorHeroEntityId: heroEntityId,
            attackerEntityId: heroEntityId,
            targetEntityId: planned.targetEntityId,
          })
          break
        case 'useEntityActive':
          result = resolveSessionUseEntityActive({
            session: branchPrep.session,
            actorHeroEntityId: heroEntityId,
            sourceEntityId: planned.sourceEntityId,
            targetEntityId: planned.targetEntityId,
          })
          break
        case 'pressLuck':
          result = resolveSessionSimpleAction({
            session: branchPrep.session,
            actorHeroEntityId: heroEntityId,
            kind: 'pressLuck',
          })
          break
        case 'endTurn':
          result = resolveSessionSimpleAction({
            session: branchPrep.session,
            actorHeroEntityId: heroEntityId,
            kind: 'endTurn',
          })
          break
        default:
          return prev
      }

      if (!result.ok) {
        if (autoPlayAutoEndTurnWhenNoLegalMoves && planned.kind !== 'endTurn') {
          const fallbackResult = resolveSessionSimpleAction({
            session: branchPrep.session,
            actorHeroEntityId: heroEntityId,
            kind: 'endTurn',
          })

          if (fallbackResult.ok) {
            successResult = { resultMessage: fallbackResult.resultMessage, events: fallbackResult.events }
            return {
              session: fallbackResult.session,
              preview: fallbackResult.preview,
            }
          }
        }

        failureReason = result.reason
        return prev
      }

      successResult = { resultMessage: result.resultMessage, events: result.events }
      return {
        session: result.session,
        preview: result.preview,
      }
    })

    const capturedFailureReason = failureReason
    const capturedSuccessResult = successResult as { resultMessage: string; events: BattleEvent[] } | null
    if (capturedFailureReason) {
      if (side === 'a') {
        setIsAutoPlayAEnabled(false)
      } else {
        setIsAutoPlayBEnabled(false)
      }
      toast.error(`Auto-play ${side.toUpperCase()} stopped: ${capturedFailureReason}`, {
        id: ACTION_TOAST_ID,
        duration: ACTION_TOAST_DURATION_MS,
      })
    } else if (capturedSuccessResult) {
      showActionSuccessToast(capturedSuccessResult.resultMessage, capturedSuccessResult.events)
      for (const event of capturedSuccessResult.events) {
        showBattleEventToast(event)
      }
    }
  }, [autoPlayAutoEndTurnWhenNoLegalMoves, autoPlayUseEntityActives])

  useEffect(() => {
    if (!runtime || !autoPlayButtonsVisible) {
      return
    }

    const [currentHeroAId, currentHeroBId] = runtime.preview.heroEntityIds
    const activeHeroEntityId = runtime.preview.activeHeroEntityId
    if (activeHeroEntityId === currentHeroAId && !isAutoPlayAEnabled) {
      return
    }
    if (activeHeroEntityId === currentHeroBId && !isAutoPlayBEnabled) {
      return
    }

    const activeSide = activeHeroEntityId === currentHeroAId ? 'a' : activeHeroEntityId === currentHeroBId ? 'b' : null
    if (!activeSide) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      runAutoPlayStep(activeSide)
    }, clampAutoPlayDelay(autoPlayDelayMs))

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [autoPlayButtonsVisible, autoPlayDelayMs, isAutoPlayAEnabled, isAutoPlayBEnabled, runAutoPlayStep, runtime])

  if (!runtime) {
    return (
      <main className="dual-screens">
        <section className="screen">
          <h1>CMD Hero Fights</h1>
          <p>Something went wrong.</p>
          <pre className="preview">{startupError ?? 'Failed to create battle preview.'}</pre>
        </section>
      </main>
    )
  }

  const preview = runtime.preview
  const historyEntries = runtime.session.history
  const visibleHistoryEntries = historyEntries
  const snapshots = runtime.session.snapshots
  const actionSnapshots = snapshots.filter((snapshot) => snapshot.phase === 'post')
  const firstPreSnapshot = snapshots.find((snapshot) => snapshot.phase === 'pre') ?? null
  const actionTimelineSnapshots = firstPreSnapshot ? [firstPreSnapshot, ...actionSnapshots] : actionSnapshots
  const latestActionSnapshotId = actionTimelineSnapshots.at(-1)?.id ?? null
  const activeSnapshotId = runtime.session.activeSnapshotId ?? latestActionSnapshotId
  const activeSnapshot = activeSnapshotId
    ? snapshots.find((snapshot) => snapshot.id === activeSnapshotId) ?? null
    : null
  const activeActionSnapshotId = activeSnapshot
    ? activeSnapshot.phase === 'pre'
      ? firstPreSnapshot?.id ?? null
      : activeSnapshot.id
    : null
  const activeActionSnapshot = activeActionSnapshotId
    ? actionTimelineSnapshots.find((snapshot) => snapshot.id === activeActionSnapshotId) ?? null
    : null
  const activeActionSnapshotIndex = activeActionSnapshot
    ? actionTimelineSnapshots.findIndex((snapshot) => snapshot.id === activeActionSnapshot.id)
    : -1
  const canAdvanceReplay = activeActionSnapshotIndex >= 0 && activeActionSnapshotIndex < actionTimelineSnapshots.length - 1

  const stepReplayTimeline = useCallback((direction: ReplayNavigationDirection) => {
    setRuntime((prev) => {
      if (!prev || prev.session.snapshots.length === 0) {
        return prev
      }

      const postSnapshots = prev.session.snapshots.filter((snapshot) => snapshot.phase === 'post')
      const firstPreSnapshot = prev.session.snapshots.find((snapshot) => snapshot.phase === 'pre') ?? null
      const timelineSnapshots = firstPreSnapshot ? [firstPreSnapshot, ...postSnapshots] : postSnapshots
      const timelineLatestSnapshotId = timelineSnapshots.at(-1)?.id ?? null
      const currentSnapshotId = prev.session.activeSnapshotId ?? timelineLatestSnapshotId
      const currentSnapshot = currentSnapshotId
        ? prev.session.snapshots.find((snapshot) => snapshot.id === currentSnapshotId) ?? null
        : null
      const timelineActiveSnapshotId = currentSnapshot
        ? currentSnapshot.phase === 'pre'
          ? firstPreSnapshot?.id ?? null
          : currentSnapshot.id
        : null
      const timelineActiveSnapshotIndex = timelineActiveSnapshotId
        ? timelineSnapshots.findIndex((snapshot) => snapshot.id === timelineActiveSnapshotId)
        : -1
      const nextIndex = timelineActiveSnapshotIndex + direction

      if (nextIndex < 0 || nextIndex >= timelineSnapshots.length) {
        return prev
      }

      const result = jumpSessionToSnapshot({
        session: prev.session,
        snapshotId: timelineSnapshots[nextIndex]!.id,
      })

      if (!result.ok) {
        return prev
      }

      return {
        session: result.session,
        preview: result.preview,
      }
    })
  }, [])

  const queueReplayTimelineStep = useCallback(
    (direction: ReplayNavigationDirection) => {
      replayNavigationDirectionRef.current = direction

      if (replayNavigationFrameRef.current !== null) {
        return
      }

      replayNavigationFrameRef.current = window.requestAnimationFrame(() => {
        replayNavigationFrameRef.current = null
        const queuedDirection = replayNavigationDirectionRef.current
        replayNavigationDirectionRef.current = 0

        if (queuedDirection !== 0) {
          stepReplayTimeline(queuedDirection)
        }
      })
    },
    [stepReplayTimeline],
  )

  useEffect(() => {
    return () => {
      if (replayNavigationFrameRef.current !== null) {
        window.cancelAnimationFrame(replayNavigationFrameRef.current)
        replayNavigationFrameRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    if (!isReplayModeOpen || !activeActionSnapshotId) {
      return
    }

    const list = replayTimelineListRef.current
    if (!list) {
      return
    }

    const activeButton = list.querySelector<HTMLButtonElement>(`[data-snapshot-id="${activeActionSnapshotId}"]`)
    if (!activeButton) {
      return
    }

    const listRect = list.getBoundingClientRect()
    const buttonRect = activeButton.getBoundingClientRect()
    const padding = 16
    const isOutOfView = buttonRect.left < listRect.left + padding || buttonRect.right > listRect.right - padding

    if (!isOutOfView) {
      return
    }

    const frame = window.requestAnimationFrame(() => {
      activeButton.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' })
    })

    return () => {
      window.cancelAnimationFrame(frame)
    }
  }, [activeActionSnapshotId, isReplayModeOpen])

  useEffect(() => {
    if (!isReplayModeOpen) {
      return
    }

    const applyDragMove = (clientX: number, clientY: number) => {
      const dragState = replayBarDragStateRef.current
      if (!dragState.isDragging) {
        return
      }

      const deltaX = clientX - dragState.startX
      const deltaY = clientY - dragState.startY

      const newX = dragState.offsetX + deltaX
      const newY = dragState.offsetY + deltaY

      setReplayBarPosition({ x: newX, y: newY })
    }

    const finishDrag = () => {
      if (replayBarDragStateRef.current.isDragging) {
        replayBarDragStateRef.current.isDragging = false
        window.localStorage.setItem('REPLAY_BAR_POSITION', JSON.stringify(replayBarPosition))
      }
    }

    const handleMouseMove = (e: MouseEvent) => applyDragMove(e.clientX, e.clientY)
    const handleMouseUp = () => finishDrag()

    const handleTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0]
      if (!touch || !replayBarDragStateRef.current.isDragging) {
        return
      }
      e.preventDefault()
      applyDragMove(touch.clientX, touch.clientY)
    }

    const handleTouchEnd = () => finishDrag()

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    document.addEventListener('touchmove', handleTouchMove, { passive: false })
    document.addEventListener('touchend', handleTouchEnd)
    document.addEventListener('touchcancel', handleTouchEnd)
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.removeEventListener('touchmove', handleTouchMove)
      document.removeEventListener('touchend', handleTouchEnd)
      document.removeEventListener('touchcancel', handleTouchEnd)
    }
  }, [isReplayModeOpen, replayBarPosition])

  const handleReplayBarDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    if ((e.target as HTMLElement).closest('button, input, a')) {
      return
    }
    let clientX: number
    let clientY: number
    if ('touches' in e) {
      const touch = e.touches[0]
      if (!touch) {
        return
      }
      clientX = touch.clientX
      clientY = touch.clientY
    } else {
      clientX = e.clientX
      clientY = e.clientY
    }
    replayBarDragStateRef.current = {
      isDragging: true,
      startX: clientX,
      startY: clientY,
      offsetX: replayBarPosition.x,
      offsetY: replayBarPosition.y,
    }
  }

  const handleReplayBarResetPosition = () => {
    setReplayBarPosition({ x: 0, y: 0 })
    window.localStorage.removeItem('REPLAY_BAR_POSITION')
    replayBarDragStateRef.current = { isDragging: false, startX: 0, startY: 0, offsetX: 0, offsetY: 0 }
  }

  const cardsById = runtime.session.gameApi.cardsById as Record<
    string,
    (typeof runtime.session.gameApi.cardsById)[keyof typeof runtime.session.gameApi.cardsById]
  >
  const keywordsById = runtime.session.gameApi.keywordsById as Record<
    string,
    (typeof runtime.session.gameApi.keywordsById)[keyof typeof runtime.session.gameApi.keywordsById]
  >
  const deckEditorCards = Object.values(cardsById).map((card) => {
    const keywordReferences = (card as { keywords?: Array<{ keywordId: string; params?: Record<string, string | number | boolean | undefined> }> }).keywords ?? []

    return {
      id: card.id,
      name: card.name,
      moveCost: card.moveCost,
      type: card.type,
      rarity: card.rarity,
      heroId: 'heroId' in card ? card.heroId : undefined,
      summaryText: renderDisplayText(card.summaryText),
      effectTexts: card.effects.map((effect) => renderDisplayText(effect.displayText)).filter((text): text is string => !!text),
      castConditionText: 'castCondition' in card ? describeCardCastCondition(card) : null,
      keywords: keywordReferences
        .map((reference) => {
          const keyword = keywordsById[reference.keywordId]
          if (!keyword) {
            return null
          }

          return {
            id: keyword.id,
            name: keyword.name,
            summaryText: renderDisplayText({
              template: keyword.summaryText.template,
              params: {
                ...(keyword.summaryText.params ?? {}),
                ...(reference.params ?? {}),
              },
            }) ?? keyword.name,
          }
        })
        .filter(
          (
            entry,
          ): entry is {
            id: string
            name: string
            summaryText: string
          } => entry !== null,
        ),
    }
  })

  const [heroAId, heroBId] = preview.heroEntityIds

  const createBasicAttackHandler = (heroId: string) => {
    return (input: { targetEntityId: string }) => {
      let failureReason: string | null = null
      let resultMessage: string | null = null
      let events: BattleEvent[] = []
      let branchNotice: string | null = null

      setRuntime((prev) => {
        if (!prev) {
          return prev
        }

        const branchPrep = ensureSessionReadyForAction(prev.session)
        if (!branchPrep.ok) {
          failureReason = branchPrep.reason
          return prev
        }
        if (branchPrep.branchedFromSnapshotId !== null) {
          branchNotice = `Branch resumed from snapshot ${branchPrep.branchedFromSnapshotId}.`
        }

        const result = resolveSessionBasicAttack({
          session: branchPrep.session,
          actorHeroEntityId: heroId,
          attackerEntityId: heroId,
          targetEntityId: input.targetEntityId,
        })

        if (!result.ok) {
          failureReason = result.reason
        } else {
          resultMessage = result.resultMessage
          events = result.events
        }

        return {
          session: result.session,
          preview: result.preview,
        }
      })

      if (failureReason) {
        showActionErrorToast(`Basic attack failed: ${failureReason}`)
      } else if (resultMessage) {
        if (branchNotice) {
          announce(branchNotice)
        }
        showActionSuccessToast(resultMessage, events)
        for (const event of events) {
          showBattleEventToast(event)
        }
      }
    }
  }

  const createEntityActiveHandler = (heroId: string) => {
    return (input: { sourceEntityId: string; targetEntityId?: string }) => {
      let failureReason: string | null = null
      let resultMessage: string | null = null
      let events: BattleEvent[] = []
      let branchNotice: string | null = null

      setRuntime((prev) => {
        if (!prev) {
          return prev
        }

        const branchPrep = ensureSessionReadyForAction(prev.session)
        if (!branchPrep.ok) {
          failureReason = branchPrep.reason
          return prev
        }
        if (branchPrep.branchedFromSnapshotId !== null) {
          branchNotice = `Branch resumed from snapshot ${branchPrep.branchedFromSnapshotId}.`
        }

        const result = resolveSessionUseEntityActive({
          session: branchPrep.session,
          actorHeroEntityId: heroId,
          sourceEntityId: input.sourceEntityId,
          targetEntityId: input.targetEntityId,
        })

        if (!result.ok) {
          failureReason = result.reason
        } else {
          resultMessage = result.resultMessage
          events = result.events
        }

        return {
          session: result.session,
          preview: result.preview,
        }
      })

      if (failureReason) {
        showActionErrorToast(`Entity active failed: ${failureReason}`)
      } else if (resultMessage) {
        if (branchNotice) {
          announce(branchNotice)
        }
        showActionSuccessToast(resultMessage, events)
        for (const event of events) {
          showBattleEventToast(event)
        }
      }
    }
  }

  const createPlayCardHandler = (heroId: string) => {
    return (input: {
      handCardId: string
      targetEntityId?: string
      targetPosition?: { row: number; column: number }
    }) => {
      let failureReason: string | null = null
      let resultMessage: string | null = null
      let events: BattleEvent[] = []
      let branchNotice: string | null = null

      setRuntime((prev) => {
        if (!prev) {
          return prev
        }

        const branchPrep = ensureSessionReadyForAction(prev.session)
        if (!branchPrep.ok) {
          failureReason = branchPrep.reason
          return prev
        }
        if (branchPrep.branchedFromSnapshotId !== null) {
          branchNotice = `Branch resumed from snapshot ${branchPrep.branchedFromSnapshotId}.`
        }

        const result = resolveSessionPlayCard({
          session: branchPrep.session,
          actorHeroEntityId: heroId,
          handCardId: input.handCardId,
          targetEntityId: input.targetEntityId,
          targetPosition: input.targetPosition,
        })

        if (!result.ok) {
          failureReason = result.reason
        } else {
          resultMessage = result.resultMessage
          events = result.events
        }

        return {
          session: result.session,
          preview: result.preview,
        }
      })

      if (failureReason) {
        showActionErrorToast(`Play card failed: ${failureReason}`)
      } else if (resultMessage) {
        if (branchNotice) {
          announce(branchNotice)
        }
        showActionSuccessToast(resultMessage, events)
        for (const event of events) {
          showBattleEventToast(event)
        }
      }
    }
  }

  const createSimpleActionHandler = (heroId: string, kind: 'pressLuck' | 'endTurn') => {
    return () => {
      let failureReason: string | null = null
      let resultMessage: string | null = null
      let events: BattleEvent[] = []
      let branchNotice: string | null = null

      setRuntime((prev) => {
        if (!prev) {
          return prev
        }

        const branchPrep = ensureSessionReadyForAction(prev.session)
        if (!branchPrep.ok) {
          failureReason = branchPrep.reason
          return prev
        }
        if (branchPrep.branchedFromSnapshotId !== null) {
          branchNotice = `Branch resumed from snapshot ${branchPrep.branchedFromSnapshotId}.`
        }

        const result = resolveSessionSimpleAction({
          session: branchPrep.session,
          actorHeroEntityId: heroId,
          kind,
        })

        if (!result.ok) {
          failureReason = result.reason
        } else {
          resultMessage = result.resultMessage
          events = result.events
        }

        return {
          session: result.session,
          preview: result.preview,
        }
      })

      if (failureReason) {
        showActionErrorToast(`${kind} failed: ${failureReason}`)
      } else if (resultMessage) {
        if (branchNotice) {
          announce(branchNotice)
        }
        showActionSuccessToast(resultMessage, events)
        for (const event of events) {
          showBattleEventToast(event)
        }
      }
    }
  }

  const handleJumpToSnapshot = (snapshotId: number) => {
    let failureReason: string | null = null

    setRuntime((prev) => {
      if (!prev) {
        return prev
      }

      const result = jumpSessionToSnapshot({
        session: prev.session,
        snapshotId,
      })

      if (!result.ok) {
        failureReason = result.reason
        return prev
      }

      return {
        session: result.session,
        preview: result.preview,
      }
    })

    if (failureReason) {
      showActionErrorToast(failureReason)
    }
  }

  const handleBranchFromSnapshot = () => {
    if (!activeSnapshotId) {
      return
    }

    let failureReason: string | null = null
    let branchMessage: string | null = null

    setRuntime((prev) => {
      if (!prev) {
        return prev
      }

      const result = branchSessionFromSnapshot({
        session: prev.session,
        snapshotId: activeSnapshotId,
      })

      if (!result.ok) {
        failureReason = result.reason
        return prev
      }

      branchMessage = `Branch resumed from snapshot ${activeSnapshotId}.`

      return {
        session: result.session,
        preview: result.preview,
      }
    })

    if (failureReason) {
      showActionErrorToast(failureReason)
    } else if (branchMessage) {
      showActionSuccessToast(branchMessage, [])
    }
  }

  const handleCopyReplayPayload = async () => {
    if (!runtime) {
      return
    }

    const payload = createReplayUrlPayload({
      bootstrapConfig,
      seed: runtime.session.state.seed,
      actionLog: createActionLogFromSession(runtime.session),
        snapshotId: activeActionSnapshotId ?? null,
    })

    try {
      await navigator.clipboard.writeText(JSON.stringify(payload, null, 2))
      showActionSuccessToast('Replay payload copied to clipboard.', [])
    } catch {
      showActionErrorToast('Failed to copy replay payload.')
    }
  }

  const handleCopyShortlink = async () => {
    const fullReplayUrl = typeof window !== 'undefined' ? window.location.href : ''

    if (!fullReplayUrl) {
      showActionErrorToast('Cannot copy shortlink outside browser mode.')
      return
    }

    const replayHashSource = fullReplayUrl.includes('#replay=')
      ? fullReplayUrl.slice(fullReplayUrl.indexOf('#replay=') + '#replay='.length)
      : fullReplayUrl
    const replayHashHex = await sha256Hex(replayHashSource)

    if (!replayHashHex) {
      try {
        await navigator.clipboard.writeText(fullReplayUrl)
        showActionErrorToast('Failed to hash replay for shortlink. Copied full replay URL instead.')
      } catch {
        showActionErrorToast('Failed to hash replay for shortlink and failed to copy fallback replay URL.')
      }
      return
    }

    const shortAlias = buildReplayShortAlias(replayHashHex)
    const shortlink = buildIsGdShortlink(shortAlias)

    const copyFullReplayUrlWithError = async (message: string) => {
      try {
        await navigator.clipboard.writeText(fullReplayUrl)
        showActionErrorToast(`${message} Copied full replay URL instead.`)
      } catch {
        showActionErrorToast(`${message} Failed to copy fallback replay URL.`)
      }
    }

    try {
      const params = new URLSearchParams({
        format: 'json',
        url: fullReplayUrl,
        shorturl: shortAlias,
      })
      const response = await fetch(`https://is.gd/create.php?${params.toString()}`)
      const payload = (await response.json()) as IsGdCreateResponse

      if (typeof payload.shorturl === 'string' && payload.shorturl.length > 0) {
        await navigator.clipboard.writeText(payload.shorturl)
        showActionSuccessToast('Shortlink copied to clipboard.', [])
        return
      }

      const looksLikeExistingAlias =
        payload.errorcode === 2 && /taken|already|in use|exists/i.test(payload.errormessage ?? '')
      if (looksLikeExistingAlias) {
        await navigator.clipboard.writeText(shortlink)
        showActionSuccessToast('Existing shortlink copied to clipboard.', [])
        return
      }

      await copyFullReplayUrlWithError(payload.errormessage ?? 'Failed to create shortlink.')
    } catch {
      await copyFullReplayUrlWithError('Failed to create shortlink.')
    }
  }

  const handleValidateReplayDeterminism = () => {
    if (!activeActionSnapshotId || !activeActionSnapshot) {
      showActionErrorToast('Select a snapshot before validating replay determinism.')
      return
    }

    const replayResult = replaySessionFromActionLog({
      config: {
        ...bootstrapConfig,
        seed: runtime.session.state.seed,
      },
      actionLog: createActionLogFromSession(runtime.session),
      snapshotId: activeActionSnapshotId ?? null,
    })

    if (!replayResult.ok) {
      showActionErrorToast(`Replay validation failed: ${replayResult.reason}`)
      return
    }

    const rebuiltSnapshot = replayResult.session.snapshots.find(
      (snapshot) => snapshot.id === activeActionSnapshotId,
    )
    if (!rebuiltSnapshot) {
      showActionErrorToast(`Replay validation failed: snapshot ${activeActionSnapshotId} was not rebuilt.`)
      return
    }

    const sameState = JSON.stringify(rebuiltSnapshot.state) === JSON.stringify(activeActionSnapshot.state)
    const sameEvents = JSON.stringify(rebuiltSnapshot.events) === JSON.stringify(activeActionSnapshot.events)
    const sameSequence = rebuiltSnapshot.nextSequence === activeActionSnapshot.nextSequence
    const sameRngStep = rebuiltSnapshot.rngCheckpoint.stepCount === activeActionSnapshot.rngCheckpoint.stepCount

    if (sameState && sameEvents && sameSequence && sameRngStep) {
      showActionSuccessToast(`Replay validation passed at snapshot ${activeActionSnapshotId}.`, [])
      return
    }

    let mismatch = 'state mismatch'
    if (!sameEvents) {
      mismatch = 'event mismatch'
    } else if (!sameSequence) {
      mismatch = 'nextSequence mismatch'
    } else if (!sameRngStep) {
      mismatch = 'RNG step mismatch'
    }

    showActionErrorToast(`Replay validation failed at snapshot ${activeActionSnapshotId}: ${mismatch}.`)
  }

  const renderHistoryRow = (entry: AppActionHistoryEntry) => {
    return (
      <li key={entry.id} className={`history-entry ${entry.success ? 'history-entry-success' : 'history-entry-failure'}`}>
        <div className="history-entry-head">
          <strong>Turn {entry.turnNumber}</strong>
          <span>{entry.actionKind}</span>
          <span>{entry.success ? 'Success' : 'Failed'}</span>
        </div>
        <p className="history-entry-message">{entry.resultMessage}</p>
        <div className="history-entry-meta">
          <span>Actor: {entry.actorHeroEntityId}</span>
          <span>Events: {entry.eventCount}</span>
          <span>Checkpoint: #{entry.postSnapshotId}</span>
        </div>
      </li>
    )
  }

  const renderHistoryControlIcon = (
    kind: 'first' | 'previous' | 'next' | 'play' | 'pause' | 'speed' | 'latest' | 'branch' | 'copy' | 'validate',
  ) => {
    switch (kind) {
      case 'first':
        return (
          <svg className="history-control-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6 5v14" />
            <path d="M18 6L10 12l8 6" />
          </svg>
        )
      case 'previous':
        return (
          <svg className="history-control-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M17 6L9 12l8 6" />
          </svg>
        )
      case 'next':
        return (
          <svg className="history-control-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M7 6l8 6-8 6" />
          </svg>
        )
      case 'play':
        return (
          <svg className="history-control-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M8 5l11 7-11 7z" />
          </svg>
        )
      case 'pause':
        return (
          <svg className="history-control-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M8 5v14" />
            <path d="M16 5v14" />
          </svg>
        )
      case 'speed':
        return (
          <svg className="history-control-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M5 15a7 7 0 1 1 14 0" />
            <path d="M12 15l4-4" />
            <path d="M17 8l2-2" />
            <path d="M7 15h10" />
          </svg>
        )
      case 'latest':
        return (
          <svg className="history-control-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M18 5v14" />
            <path d="M6 6l8 6-8 6" />
          </svg>
        )
      case 'branch':
        return (
          <svg className="history-control-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M7 6v8" />
            <path d="M7 14c0 3 2 4 5 4h5" />
            <circle cx="7" cy="4.5" r="1.8" />
            <circle cx="7" cy="12.5" r="1.8" />
            <circle cx="18.5" cy="18.5" r="1.8" />
          </svg>
        )
      case 'copy':
        return (
          <svg className="history-control-icon" viewBox="0 0 24 24" aria-hidden="true">
            <rect x="9" y="8" width="10" height="11" rx="2" />
            <rect x="5" y="5" width="10" height="11" rx="2" />
          </svg>
        )
      case 'validate':
        return (
          <svg className="history-control-icon" viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="8" />
            <path d="M8.5 12.3l2.3 2.3 4.8-4.8" />
          </svg>
        )
      default:
        return null
    }
  }

  const renderTimelineControls = (options?: { showPlaybackControls?: boolean }) => {
    const showPlaybackControls = options?.showPlaybackControls ?? false

    return (
      <>
        <button
          className="history-icon-button"
          type="button"
          aria-label="Jump to first snapshot"
          title="First (Home)"
          onClick={() => {
            if (actionTimelineSnapshots.length > 0) {
              handleJumpToSnapshot(actionTimelineSnapshots[0]!.id)
            }
          }}
          disabled={actionTimelineSnapshots.length === 0 || activeActionSnapshotIndex <= 0}
        >
          {renderHistoryControlIcon('first')}
        </button>
        <button
          className="history-icon-button"
          type="button"
          aria-label="Jump to previous snapshot"
          title="Previous (Left Arrow)"
          onClick={() => {
            if (activeActionSnapshotIndex > 0) {
              handleJumpToSnapshot(actionTimelineSnapshots[activeActionSnapshotIndex - 1]!.id)
            }
          }}
          disabled={activeActionSnapshotIndex <= 0}
        >
          {renderHistoryControlIcon('previous')}
        </button>
        {showPlaybackControls ? (
          <button
            className={`history-icon-button replay-playback-button ${isReplayPlaying ? 'replay-playback-button-active' : ''}`.trim()}
            type="button"
            aria-label={isReplayPlaying ? 'Pause replay playback' : 'Play replay playback'}
            title={isReplayPlaying ? 'Pause (Space)' : 'Play (Space)'}
            onClick={() => {
              if (!canAdvanceReplay && !isReplayPlaying) {
                return
              }

              setIsReplayPlaying((current) => !current)
            }}
            disabled={!isReplayPlaying && !canAdvanceReplay}
          >
            {renderHistoryControlIcon(isReplayPlaying ? 'pause' : 'play')}
          </button>
        ) : null}
        <button
          className="history-icon-button"
          type="button"
          aria-label="Jump to next snapshot"
          title="Next (Right Arrow)"
          onClick={() => {
            if (activeActionSnapshotIndex >= 0 && activeActionSnapshotIndex < actionTimelineSnapshots.length - 1) {
              handleJumpToSnapshot(actionTimelineSnapshots[activeActionSnapshotIndex + 1]!.id)
            }
          }}
          disabled={activeActionSnapshotIndex < 0 || activeActionSnapshotIndex >= actionTimelineSnapshots.length - 1}
        >
          {renderHistoryControlIcon('next')}
        </button>
        <button
          className="history-icon-button"
          type="button"
          aria-label="Jump to latest snapshot"
          title="Latest (End)"
          onClick={() => {
            if (latestActionSnapshotId) {
              handleJumpToSnapshot(latestActionSnapshotId)
            }
          }}
          disabled={!latestActionSnapshotId || activeActionSnapshotId === latestActionSnapshotId}
        >
          {renderHistoryControlIcon('latest')}
        </button>
        {showPlaybackControls ? (
          <button
            className="history-icon-button replay-speed-button"
            type="button"
            aria-label={`Playback speed ${replayPlaybackSpeed}x`}
            title={`Playback speed: ${replayPlaybackSpeed}x`}
            onClick={() => {
              setReplayPlaybackSpeedIndex((current) => (current + 1) % REPLAY_PLAYBACK_SPEEDS.length)
            }}
          >
            <span className="replay-speed-button-label">{formatReplayPlaybackSpeed(replayPlaybackSpeed)}</span>
          </button>
        ) : null}
        <button
          className="history-icon-button"
          type="button"
          aria-label="Branch from active snapshot"
          title="Branch (B)"
          onClick={handleBranchFromSnapshot}
          disabled={!activeSnapshotId}
        >
          {renderHistoryControlIcon('branch')}
        </button>
        <button
          className="history-icon-button"
          type="button"
          aria-label="Copy replay payload"
          title="Copy Replay Payload (C)"
          onClick={() => void handleCopyReplayPayload()}
        >
          {renderHistoryControlIcon('copy')}
        </button>
        <button
          className="history-icon-button"
          type="button"
          aria-label="Validate replay determinism"
          title="Validate Replay (V)"
          onClick={handleValidateReplayDeterminism}
        >
          {renderHistoryControlIcon('validate')}
        </button>
        <span className="history-snapshot-active-label">
          Active step: {activeActionSnapshot ? activeActionSnapshot.phase === 'pre' ? 'Start' : `#${activeActionSnapshot.id}` : 'none'}
        </span>
      </>
    )
  }

  const renderTimelineSnapshotList = () => {
    return (
      <ul ref={replayTimelineListRef} className="snapshot-list" aria-label="Action timeline">
        {actionTimelineSnapshots.map((snapshot) => {
          const isActive = snapshot.id === activeActionSnapshotId

          return (
            <li key={snapshot.id}>
              <button
                type="button"
                className={`snapshot-chip ${isActive ? 'snapshot-chip-active' : ''}`}
                data-snapshot-id={snapshot.id}
                onClick={() => handleJumpToSnapshot(snapshot.id)}
              >
                {snapshot.phase === 'pre'
                  ? `Start T${snapshot.turnNumber}`
                  : `#${snapshot.id} T${snapshot.turnNumber} ${snapshot.actionKind}`}
              </button>
            </li>
          )
        })}
      </ul>
    )
  }

  return (
    <>
      <Toaster
        position="top-center"
        gutter={12}
        reverseOrder
        toastOptions={{
          className: 'game-toast',
          duration: ACTION_TOAST_DURATION_MS,
        }}
      />
      <div key={`announcement-${liveAnnouncement.id}`} className="sr-only" aria-live="polite" aria-atomic="true">
        {liveAnnouncement.text}
      </div>
      <button
        type="button"
        className="history-button"
        onClick={() => setIsHistoryModalOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={isHistoryModalOpen || isReplayModeOpen}
      >
        History ({visibleHistoryEntries.length})
      </button>
      <button
        type="button"
        className={`history-button settings-launch-button ${isSettingsPanelOpen ? 'settings-launch-button-active' : ''}`.trim()}
        onClick={() => setIsSettingsPanelOpen((current) => !current)}
        aria-haspopup="dialog"
        aria-expanded={isSettingsPanelOpen}
        title="Toggle settings (S)"
      >
        Settings
      </button>
      <button
        type="button"
        className="history-button shortlink-launch-button"
        onClick={() => void handleCopyShortlink()}
        title="Copy shortlink"
      >
        Copy Shortlink
      </button>
      {autoPlayButtonsVisible ? (
        <button
          type="button"
          className={`history-button auto-play-button auto-play-button-a ${isAutoPlayAEnabled ? 'auto-play-button-active' : ''}`.trim()}
          onClick={() => setIsAutoPlayAEnabled((current) => !current)}
          aria-pressed={isAutoPlayAEnabled}
          title={`Auto-play A (${clampAutoPlayDelay(autoPlayDelayMs)}ms)`}
        >
          Auto Play A
        </button>
      ) : null}
      {autoPlayButtonsVisible ? (
        <button
          type="button"
          className={`history-button auto-play-button auto-play-button-b ${isAutoPlayBEnabled ? 'auto-play-button-active' : ''}`.trim()}
          onClick={() => setIsAutoPlayBEnabled((current) => !current)}
          aria-pressed={isAutoPlayBEnabled}
          title={`Auto-play B (${clampAutoPlayDelay(autoPlayDelayMs)}ms)`}
        >
          Auto Play B
        </button>
      ) : null}
      {isHistoryModalOpen ? (
        <div
          className="history-modal-overlay"
          onClick={() => setIsHistoryModalOpen(false)}
          role="presentation"
        >
          <section
            className="history-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Action history"
            onClick={(event) => {
              event.stopPropagation()
            }}
          >
            <header className="history-modal-head">
              <strong>Action History</strong>
              <div className="history-modal-head-actions">
                <button
                  type="button"
                  onClick={() => {
                    setIsReplayModeOpen(true)
                    setIsHistoryModalOpen(false)
                  }}
                >
                  Open Replay Bar
                </button>
                <button type="button" onClick={() => setIsHistoryModalOpen(false)}>
                  Close
                </button>
              </div>
            </header>
            <div className="history-modal-body">
              <div className="history-snapshot-controls">{renderTimelineControls()}</div>
              <p className="history-shortcuts">
                H cycle (closed/fullscreen/overlay), Esc close, Home first, End latest, Left/Right navigate, B branch, C copy, V validate
              </p>
              {visibleHistoryEntries.length === 0 ? (
                <p className="history-empty">No actions resolved yet.</p>
              ) : (
                <>
                  <div className="history-log-scroll">
                    {(() => {
                      const filteredHistoryEntries = visibleHistoryEntries
                        .filter((entry) => {
                          if (!activeActionSnapshotId) {
                            return true
                          }
                          return entry.postSnapshotId <= activeActionSnapshotId
                        })
                        .reverse()
                      return <ol className="history-list">{filteredHistoryEntries.map(renderHistoryRow)}</ol>
                    })()}
                  </div>
                  {renderTimelineSnapshotList()}
                </>
              )}
            </div>
          </section>
        </div>
      ) : null}
      {isReplayModeOpen ? (
        <div
          className="replay-bar-overlay"
          role="presentation"
          style={{
            transform: `translate(${replayBarPosition.x}px, ${replayBarPosition.y}px)`,
          }}
        >
          <section
            className="replay-bar"
            aria-label="Replay mode timeline"
          >
            <header
              className="replay-bar-head"
              onMouseDown={handleReplayBarDragStart}
              onTouchStart={handleReplayBarDragStart}
              style={{ cursor: replayBarDragStateRef.current.isDragging ? 'grabbing' : 'grab', touchAction: 'none' }}
            >
              <strong>Replay Mode</strong>
              <div className="replay-bar-head-actions">
                <button
                  type="button"
                  onClick={() => handleReplayBarResetPosition()}
                  title="Reset replay bar to default position"
                  aria-label="Reset replay bar position"
                >
                  Reset Pos
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsHistoryModalOpen(true)
                    setIsReplayModeOpen(false)
                  }}
                >
                  Open History
                </button>
                <button type="button" onClick={() => setIsReplayModeOpen(false)}>
                  Close
                </button>
              </div>
            </header>
              <div className="history-snapshot-controls replay-snapshot-controls">{renderTimelineControls({ showPlaybackControls: true })}</div>
            <p className="history-shortcuts replay-shortcuts">
              Replay bar mode: interact with the board as usual. Actions from older steps auto-branch.
            </p>
            {renderTimelineSnapshotList()}
          </section>
        </div>
      ) : null}
      {(isSettingsPanelOpen || isDeckEditorOpen) ? (
        <SettingsPanel
          state={runtime.session.state as Record<string, unknown>}
          bootstrapConfig={bootstrapConfig}
          deckEditorCards={deckEditorCards}
          seed={bootstrapConfig.seed}
          isDeckEditorOpen={isDeckEditorOpen}
          deckEditorHeroIndex={deckEditorHeroIndex}
          onSeedChange={handleSeedChange}
          onBootstrapConfigChange={handleBootstrapConfigChange}
          onExportSettings={handleExportSettings}
          onImportSettings={handleImportSettings}
          onCloseDeckEditor={handleCloseDeckEditor}
          onHardReset={handleHardReset}
          autoPlayButtonsVisible={autoPlayButtonsVisible}
          autoPlayDelayMs={autoPlayDelayMs}
          autoPlayAutoEndTurnWhenNoLegalMoves={autoPlayAutoEndTurnWhenNoLegalMoves}
          autoPlayUseEntityActives={autoPlayUseEntityActives}
          onAutoPlayButtonsVisibleChange={handleAutoPlayButtonsVisibleChange}
          onAutoPlayDelayMsChange={handleAutoPlayDelayMsChange}
          onAutoPlayAutoEndTurnWhenNoLegalMovesChange={handleAutoPlayAutoEndTurnWhenNoLegalMovesChange}
          onAutoPlayUseEntityActivesChange={handleAutoPlayUseEntityActivesChange}
          onClosePanel={() => setIsSettingsPanelOpen(false)}
          isVisible={isSettingsPanelOpen}
        />
      ) : null}

      <audio ref={musicAudioRef} src={MUSIC_SOURCE} loop autoPlay muted={isMusicMuted} />

      <main key={`battle-${resetEpoch}`} className="dual-screens">
        <PlayerScreen
          key="screen-a"
          title="CMD Hero Fights"
          selfId={heroAId}
          enemyId={heroBId}
          selfSideKey="a"
          preview={preview}
          shouldShowDetailedTooltips={shouldShowDetailedTooltips}
          showDetailedTooltipsToggle={showDetailedTooltips}
          onToggleDetailedTooltips={handleToggleDetailedTooltips}
          onBasicAttack={createBasicAttackHandler(heroAId)}
          onUseEntityActive={createEntityActiveHandler(heroAId)}
          onPressLuck={createSimpleActionHandler(heroAId, 'pressLuck')}
          onEndTurn={createSimpleActionHandler(heroAId, 'endTurn')}
          onPlayCard={createPlayCardHandler(heroAId)}
          onOpenDeckEditor={() => handleOpenDeckEditor(0)}
          onOpenRulebook={handleOpenRulebook}
          onHardReroll={handleHardReroll}
          isMusicMuted={isMusicMuted}
          onToggleMusic={() => setIsMusicMuted((current) => !current)}
          showMusicControl
          isRulebookOpen={isRulebookOpen}
        />
        <PlayerScreen
          key="screen-b"
          title="CMD Hero Fights"
          selfId={heroBId}
          enemyId={heroAId}
          selfSideKey="b"
          preview={preview}
          shouldShowDetailedTooltips={shouldShowDetailedTooltips}
          showDetailedTooltipsToggle={showDetailedTooltips}
          onToggleDetailedTooltips={handleToggleDetailedTooltips}
          onBasicAttack={createBasicAttackHandler(heroBId)}
          onUseEntityActive={createEntityActiveHandler(heroBId)}
          onPressLuck={createSimpleActionHandler(heroBId, 'pressLuck')}
          onEndTurn={createSimpleActionHandler(heroBId, 'endTurn')}
          onPlayCard={createPlayCardHandler(heroBId)}
          onOpenDeckEditor={() => handleOpenDeckEditor(1)}
          onOpenRulebook={handleOpenRulebook}
          onHardReroll={handleHardReroll}
          isMusicMuted={isMusicMuted}
          onToggleMusic={() => setIsMusicMuted((current) => !current)}
          showMusicControl
          isRulebookOpen={isRulebookOpen}
        />
      </main>

        <RulebookPanel isOpen={isRulebookOpen} onClose={handleCloseRulebook} />
    </>
  )
}

export default App
