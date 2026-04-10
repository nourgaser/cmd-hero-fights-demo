import './App.css'
import { useEffect, useRef, useState } from 'react'
import { Toaster, toast } from 'react-hot-toast'
import type { BattleEvent } from '../../shared/models'
import {
  type AppReplayActionLogEntry,
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
import {
  applyLoadDataFromLocation,
  createLoadDataShareUrl,
} from './utils/load-data-url.ts'
import { PlayerScreen } from './components/PlayerScreen.tsx'
import { SettingsPanel } from './components/SettingsPanel.tsx'

const SETTINGS_SEED_STORAGE_KEY = 'cmd-hero:settings-seed'
const SETTINGS_BOOTSTRAP_STORAGE_KEY = 'cmd-hero:settings-bootstrap-config'
const MUSIC_MUTED_STORAGE_KEY = 'cmd-hero:music-muted'
const SETTINGS_PANEL_STORAGE_KEY = 'cmd-hero:settings-panel-state'
const SAVED_DECKS_STORAGE_KEY = 'cmd-hero:saved-decks'
const MUSIC_SOURCE = '/game_music.mp3'
const ACTION_TOAST_ID = 'action-feedback'
const ACTION_TOAST_DURATION_MS = 7000
const EVENT_TOAST_DURATION_MS = 4500
const LOAD_DATA_STORAGE_KEYS = [
  SETTINGS_SEED_STORAGE_KEY,
  SETTINGS_BOOTSTRAP_STORAGE_KEY,
  SETTINGS_PANEL_STORAGE_KEY,
  SAVED_DECKS_STORAGE_KEY,
  MUSIC_MUTED_STORAGE_KEY,
]

type AppRuntime = {
  session: AppBattleSession
  preview: AppBattlePreview
}

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
  const [loadDataImportResult] = useState(() => applyLoadDataFromLocation({
    storageKeys: LOAD_DATA_STORAGE_KEYS,
  }))
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
  const [isReplayModeOpen, setIsReplayModeOpen] = useState(false)
  const musicAudioRef = useRef<HTMLAudioElement | null>(null)
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
    if (!loadDataImportResult.applied && !loadDataImportResult.error) {
      return
    }

    if (loadDataImportResult.error) {
      toast.error(`loadData import failed: ${loadDataImportResult.error}`, {
        id: ACTION_TOAST_ID,
        duration: ACTION_TOAST_DURATION_MS,
      })
      return
    }

    const message = `Imported shared data (${loadDataImportResult.importedKeyCount} keys).`
    announce(message)
    toast.success(message, {
      id: ACTION_TOAST_ID,
      duration: ACTION_TOAST_DURATION_MS,
    })
  }, [loadDataImportResult])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || isTypingTarget(event)) {
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
        jumpToSnapshot(timelineSnapshots[timelineActiveSnapshotIndex - 1]!.id)
        return
      }

      if (event.key === 'ArrowRight' && timelineActiveSnapshotIndex >= 0 && timelineActiveSnapshotIndex < timelineSnapshots.length - 1) {
        event.preventDefault()
        jumpToSnapshot(timelineSnapshots[timelineActiveSnapshotIndex + 1]!.id)
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
  }, [bootstrapConfig, isHistoryModalOpen, isReplayModeOpen, isSettingsPanelOpen, runtime])

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

  const renderStructuredToast = (summary: string, detail: string | null) => {
    return (
      <span className="game-toast-body">
        <span className="game-toast-summary">{renderTextWithHighlightedNumbers(summary, 'game-toast-number')}</span>
        {detail ? (
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

    toast.success(renderStructuredToast(split.summary, detail), {
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

    toast(renderStructuredToast(summary, detail), {
      id: `battle-event-${event.sequence}`,
      duration: EVENT_TOAST_DURATION_MS,
    })
  }

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
    setIsSettingsPanelOpen(true)
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

  const handleCopyDataLink = async () => {
    const url = createLoadDataShareUrl({
      storageKeys: LOAD_DATA_STORAGE_KEYS,
    })

    if (!url) {
      showActionErrorToast('Failed to generate data share URL.')
      return
    }

    try {
      await navigator.clipboard.writeText(url)
      showActionSuccessToast('Data share URL copied to clipboard.', [])
    } catch {
      showActionErrorToast('Failed to copy data share URL.')
    }
  }

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

  const ensureSessionReadyForAction = (session: AppBattleSession) => {
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

  const renderHistoryControlIcon = (kind: 'first' | 'previous' | 'next' | 'latest' | 'branch' | 'copy' | 'validate') => {
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

  const renderTimelineControls = () => {
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
      <ul className="snapshot-list" aria-label="Action timeline">
        {actionTimelineSnapshots.map((snapshot) => {
          const isActive = snapshot.id === activeActionSnapshotId

          return (
            <li key={snapshot.id}>
              <button
                type="button"
                className={`snapshot-chip ${isActive ? 'snapshot-chip-active' : ''}`}
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
        gutter={10}
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
        <div className="replay-bar-overlay" role="presentation">
          <section className="replay-bar" aria-label="Replay mode timeline">
            <header className="replay-bar-head">
              <strong>Replay Mode</strong>
              <div className="replay-bar-head-actions">
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
            <div className="history-snapshot-controls replay-snapshot-controls">{renderTimelineControls()}</div>
            <p className="history-shortcuts replay-shortcuts">
              Replay bar mode: interact with the board as usual. Actions from older steps auto-branch.
            </p>
            {renderTimelineSnapshotList()}
          </section>
        </div>
      ) : null}
      {isSettingsPanelOpen ? (
        <SettingsPanel
          state={runtime.session.state as Record<string, unknown>}
          bootstrapConfig={bootstrapConfig}
          deckEditorCards={deckEditorCards}
          seed={bootstrapConfig.seed}
          isDeckEditorOpen={isDeckEditorOpen}
          deckEditorHeroIndex={deckEditorHeroIndex}
          onSeedChange={handleSeedChange}
          onBootstrapConfigChange={handleBootstrapConfigChange}
          onCopyDataLink={() => void handleCopyDataLink()}
          onCloseDeckEditor={handleCloseDeckEditor}
          onHardReset={handleHardReset}
          onClosePanel={() => setIsSettingsPanelOpen(false)}
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
          onHardReroll={handleHardReroll}
          isMusicMuted={isMusicMuted}
          onToggleMusic={() => setIsMusicMuted((current) => !current)}
          showMusicControl
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
          onHardReroll={handleHardReroll}
          isMusicMuted={isMusicMuted}
          onToggleMusic={() => setIsMusicMuted((current) => !current)}
          showMusicControl
        />
      </main>
    </>
  )
}

export default App
