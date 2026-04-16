import './App.css'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Toaster, toast } from 'react-hot-toast'
import {
  type AppRuntime,
  buildIsGdShortlink,
  buildReplayShortAlias,
  createActionLogFromSession,
  createRuntimeFromConfig,
  createRuntimeFromReplayPayload,
  describeCardCastCondition,
  formatReplayPlaybackSpeed,
  getActionTimelineSnapshots,
  getReplayPayloadTimelineIndex,
  getReplayModeActiveSnapshot,
  incrementSeed,
  isTypingTarget,
  renderDisplayText,
  updateHoverCardPlacement,
} from './app-shell/runtime-utils'
import { PlayerScreen } from './components/PlayerScreen/index'
import { SettingsPanel } from './components/SettingsPanel/index'
import { RulebookPanel } from './components/RulebookPanel/index'
import { DeckEditor } from './components/DeckEditor/index'
import { HistoryModal } from './components/HistoryModal/index'
import { ReplayBar } from './components/ReplayBar/index'
import {
  ACTION_TOAST_DURATION_MS,
  MUSIC_TRACKS,
  REPLAY_PLAYBACK_SPEEDS,
  SETTINGS_EXPORT_STORAGE_KEYS,
  SETTINGS_BOOTSTRAP_STORAGE_KEY,
  SETTINGS_SEED_STORAGE_KEY,
} from './app-shell/constants'
import { useSettings } from './app-shell/useSettings'
import { type LastActionFeedback, useActionsFeedback } from './app-shell/useActionsFeedback'
import { useAutoplay } from './app-shell/useAutoplay'
import { useReplayHistory } from './app-shell/useReplayHistory'
import { useAppActions } from './app-shell/useAppActions'
import { useTimeline } from './app-shell/useTimeline'
import { DEFAULT_GAME_BOOTSTRAP_CONFIG, type GameBootstrapConfig } from './data/game-bootstrap'
import { createReplayUrlPayload } from './utils/replay-url'
import { replaySessionFromActionLog } from './game-client-session'

type IsGdCreateResponse = {
  shorturl?: string
  errorcode?: number
  errormessage?: string
}

async function sha256Hex(input: string): Promise<string | null> {
  if (typeof window === 'undefined' || !window.crypto?.subtle) return null
  try {
    const digest = await window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(input))
    return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('')
  } catch { return null }
}

function App() {
  const {
    initialReplayPayload,
    initialBootstrapConfig,
    bootstrapConfig,
    setBootstrapConfig,
    autoPlayButtonsVisible,
    setAutoPlayButtonsVisible,
    autoPlayAutoEndTurnWhenNoLegalMoves,
    setAutoPlayAutoEndTurnWhenNoLegalMoves,
    autoPlayUseEntityActives,
    setAutoPlayUseEntityActives,
    autoPlayDelayMs,
    setAutoPlayDelayMs,
    isMusicMuted,
    setIsMusicMuted,
    musicTrackId,
    setMusicTrackId,
    replayBarPosition,
    setReplayBarPosition,
  } = useSettings()

  const selectedMusicTrack = MUSIC_TRACKS.find((track) => track.id === musicTrackId) ?? MUSIC_TRACKS[0]

  const [startupError] = useState(() => {
    try {
      if (initialReplayPayload) createRuntimeFromReplayPayload(initialReplayPayload)
      else createRuntimeFromConfig(initialBootstrapConfig)
      return null
    } catch (error) { return error instanceof Error ? error.message : 'Failed to create battle preview.' }
  })

  const [runtime, setRuntime] = useState<AppRuntime | null>(() => {
    try {
      if (initialReplayPayload) return createRuntimeFromReplayPayload(initialReplayPayload)
      return createRuntimeFromConfig(initialBootstrapConfig)
    } catch { return null }
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
  const [lastActionFeedback, setLastActionFeedback] = useState<LastActionFeedback | null>(null)

  const musicAudioRef = useRef<HTMLAudioElement | null>(null)
  const replayTimelineListRef = useRef<HTMLUListElement | null>(null)
  const replayBarDragStateRef = useRef<{ isDragging: boolean; startX: number; startY: number; offsetX: number; offsetY: number }>({ isDragging: false, startX: 0, startY: 0, offsetX: 0, offsetY: 0 })

  const announce = useCallback((text: string) => {
    if (!text.trim()) return
    setLiveAnnouncement((current) => ({ id: current.id + 1, text }))
  }, [])

  const { showActionErrorToast, showActionSuccessToast, showBattleEventToast, showReplaySnapshotToasts } = useActionsFeedback({
    announce,
    shouldShowDetailedTooltips: isShiftHeld || showDetailedTooltips,
    onLastActionFeedback: setLastActionFeedback,
  })

  const { createBasicAttackHandler, createEntityActiveHandler, createPlayCardHandler, createSimpleActionHandler, handleJumpToSnapshot, handleBranchFromSnapshot } = useAppActions({
    runtime, setRuntime, announce, showActionErrorToast, showActionSuccessToast, showBattleEventToast,
  })

  const snapshots = useMemo(() => runtime?.session.snapshots ?? [], [runtime])
  const actionTimelineSnapshots = useMemo(() => {
    const postSnapshots = snapshots.filter((s) => s.phase === 'post')
    const firstPreSnapshot = snapshots.find((s) => s.phase === 'pre') ?? null
    return firstPreSnapshot ? [firstPreSnapshot, ...postSnapshots] : postSnapshots
  }, [snapshots])

  const latestActionSnapshotId = actionTimelineSnapshots.at(-1)?.id ?? null
  const activeSnapshotId = runtime?.session.activeSnapshotId ?? latestActionSnapshotId
  const activeSnapshot = activeSnapshotId !== null ? snapshots.find((s) => s.id === activeSnapshotId) ?? null : null
  const activeActionSnapshotId = activeSnapshot ? (activeSnapshot.phase === 'pre' ? actionTimelineSnapshots[0]?.id ?? null : activeSnapshot.id) : null
  const activeActionSnapshot = activeActionSnapshotId !== null ? actionTimelineSnapshots.find((s) => s.id === activeActionSnapshotId) ?? null : null
  const activeActionSnapshotIndex = activeActionSnapshotId !== null ? actionTimelineSnapshots.findIndex((s) => s.id === activeActionSnapshotId) : -1
  const canAdvanceReplay = activeActionSnapshotIndex >= 0 && activeActionSnapshotIndex < actionTimelineSnapshots.length - 1
  const playerFacingHistoryCount = runtime?.session.history.length ?? 0

  const handleCopyReplayPayload = useCallback(async () => {
    if (!runtime) return
    const p = createReplayUrlPayload({
      bootstrapConfig,
      seed: runtime.session.state.seed,
      actionLog: createActionLogFromSession(runtime.session),
      timelineIndex: getReplayPayloadTimelineIndex(runtime.session),
    })
    try { await navigator.clipboard.writeText(JSON.stringify(p, null, 2)); showActionSuccessToast('Replay payload copied to clipboard.', []) }
    catch { showActionErrorToast('Failed to copy replay payload.') }
  }, [runtime, bootstrapConfig, showActionSuccessToast, showActionErrorToast])

  const handleCopyHistoryJson = useCallback(async () => {
    if (!runtime) return
    const replayPayload = createReplayUrlPayload({
      bootstrapConfig,
      seed: runtime.session.state.seed,
      actionLog: createActionLogFromSession(runtime.session),
      timelineIndex: getReplayPayloadTimelineIndex(runtime.session),
    })

    const historyDump = {
      replayPayload,
      activeActionSnapshotId,
      activeActionSnapshotIndex,
      currentState: runtime.session.state,
      activeSnapshot: activeActionSnapshot,
      history: runtime.session.history,
    }

    try { await navigator.clipboard.writeText(JSON.stringify(historyDump, null, 2)); showActionSuccessToast('History JSON copied to clipboard.', []) }
    catch { showActionErrorToast('Failed to copy history JSON.') }
  }, [runtime, bootstrapConfig, activeActionSnapshotId, activeActionSnapshotIndex, activeActionSnapshot, showActionSuccessToast, showActionErrorToast])

  const handleValidateReplayDeterminism = useCallback(() => {
    if (activeActionSnapshotIndex < 0 || !activeActionSnapshot || !runtime) { showActionErrorToast('Select a snapshot before validating replay determinism.'); return }
    const res = replaySessionFromActionLog({
      gameApi: runtime.session.gameApi,
      config: { ...bootstrapConfig, seed: runtime.session.state.seed },
      actionLog: createActionLogFromSession(runtime.session),
      timelineIndex: activeActionSnapshotIndex,
    })
    if (!res.ok) { showActionErrorToast(`Replay validation failed: ${res.reason}`); return }
    const rebuiltTimelineSnapshots = getActionTimelineSnapshots(res.session)
    const rebuilt = rebuiltTimelineSnapshots[activeActionSnapshotIndex]
    if (!rebuilt) { showActionErrorToast(`Replay validation failed: step #${activeActionSnapshotIndex} was not rebuilt.`); return }
    const sameS = JSON.stringify(rebuilt.state) === JSON.stringify(activeActionSnapshot.state); const sameE = JSON.stringify(rebuilt.events) === JSON.stringify(activeActionSnapshot.events); const sameSeq = rebuilt.nextSequence === activeActionSnapshot.nextSequence; const sameRng = rebuilt.rngCheckpoint.stepCount === activeActionSnapshot.rngCheckpoint.stepCount
    if (sameS && sameE && sameSeq && sameRng) { showActionSuccessToast(`Replay validation passed at step #${activeActionSnapshotIndex}.`, []); return }
    let m = 'state mismatch'; if (!sameE) m = 'event mismatch'; else if (!sameSeq) m = 'nextSequence mismatch'; else if (!sameRng) m = 'RNG step mismatch'
    showActionErrorToast(`Replay validation failed at step #${activeActionSnapshotIndex}: ${m}.`)
  }, [activeActionSnapshotIndex, activeActionSnapshot, runtime, bootstrapConfig, showActionErrorToast, showActionSuccessToast])

  const { isAutoPlayAEnabled, setIsAutoPlayAEnabled, isAutoPlayBEnabled, setIsAutoPlayBEnabled } = useAutoplay({
    runtime, setRuntime, autoPlayButtonsVisible, autoPlayDelayMs, autoPlayAutoEndTurnWhenNoLegalMoves, autoPlayUseEntityActives, showActionSuccessToast, showBattleEventToast,
  })

  const { suppressReplayToastSyncRef } = useReplayHistory({
    bootstrapConfig, setBootstrapConfig, runtime, setRuntime, setResetEpoch, showReplaySnapshotToasts,
  })

  const { queueReplayTimelineStep, replayPlaybackSpeed, replayNavigationFrameRef } = useTimeline({
    setRuntime, replayPlaybackSpeedIndex,
  })

  const deckEditorCards = useMemo(() => {
    if (!runtime) return []
    const registry = runtime.session.gameApi.GAME_CONTENT_REGISTRY
    const cardsById = registry.cardsById as Record<string, { id: string; name: string; moveCost: number; type: string; rarity: string; heroId?: string; summaryText: { template: string; params?: Record<string, string | number | boolean | undefined> }; effects: Array<{ displayText: { template: string; params?: Record<string, string | number | boolean | undefined> } }>; keywords?: Array<{ keywordId: string; params?: Record<string, string | number | boolean | undefined> }> }>
    const keywordsById = registry.keywordsById as Record<string, { id: string; name: string; summaryText: { template: string; params?: Record<string, string | number | boolean | undefined> } }>
    return Object.values(cardsById).map((card) => ({
      id: card.id,
      name: card.name,
      moveCost: card.moveCost,
      type: card.type as 'ability' | 'weapon' | 'totem' | 'companion',
      rarity: card.rarity as 'common' | 'rare' | 'ultimate' | 'general',
      heroId: card.heroId,
      summaryText: renderDisplayText(card.summaryText),
      effectTexts: card.effects.map((e) => renderDisplayText(e.displayText)).filter((t: string | null): t is string => !!t),
      castConditionText: 'castCondition' in card ? describeCardCastCondition(card as unknown as Parameters<typeof describeCardCastCondition>[0]) : null,
      keywords: (card.keywords ?? []).map((ref) => {
        const k = keywordsById[ref.keywordId]
        return k ? {
          id: k.id,
          name: k.name,
          summaryText: renderDisplayText({
            template: k.summaryText.template,
            params: { ...(k.summaryText.params ?? {}), ...(ref.params ?? {}) },
          }) ?? k.name,
        } : null
      }).filter((e): e is { id: string; name: string; summaryText: string } => e !== null),
    }))
  }, [runtime])

  useEffect(() => {
    const root = document.documentElement
    const markShift = (held: boolean) => { setIsShiftHeld(held); root.dataset.shiftHeld = held ? 'true' : 'false' }
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Shift') markShift(true) }
    const onKeyUp = (e: KeyboardEvent) => { if (e.key === 'Shift') markShift(false) }
    window.addEventListener('keydown', onKeyDown); window.addEventListener('keyup', onKeyUp)
    const updateActiveHoverCards = () => document.querySelectorAll<HTMLElement>('.hint-wrap').forEach((wrap) => { if (wrap.matches(':hover, :focus-within')) updateHoverCardPlacement(wrap) })
    const handlePointerOver = (e: PointerEvent) => { const wrap = (e.target as HTMLElement | null)?.closest('.hint-wrap') as HTMLElement | null; if (wrap) updateHoverCardPlacement(wrap) }
    const handleFocusIn = (e: FocusEvent) => { const wrap = (e.target as HTMLElement | null)?.closest('.hint-wrap') as HTMLElement | null; if (wrap) updateHoverCardPlacement(wrap) }
    window.addEventListener('pointerover', handlePointerOver, true); window.addEventListener('focusin', handleFocusIn); window.addEventListener('resize', updateActiveHoverCards); window.addEventListener('scroll', updateActiveHoverCards, true)
    updateActiveHoverCards()
    return () => { delete root.dataset.shiftHeld; window.removeEventListener('keydown', onKeyDown); window.removeEventListener('keyup', onKeyUp); window.removeEventListener('pointerover', handlePointerOver, true); window.removeEventListener('focusin', handleFocusIn); window.removeEventListener('resize', updateActiveHoverCards); window.removeEventListener('scroll', updateActiveHoverCards, true) }
  }, [])

  useEffect(() => {
    if (!musicAudioRef.current) return
    const audio = musicAudioRef.current; audio.loop = true; audio.muted = isMusicMuted
    if (!isMusicMuted) void audio.play().catch(() => {})
  }, [isMusicMuted, selectedMusicTrack.source])

  useEffect(() => {
    if (typeof document === 'undefined') return
    const shouldLock = isDeckEditorOpen || isSettingsPanelOpen || isHistoryModalOpen || isRulebookOpen
    if (!shouldLock) return
    const root = document.documentElement; const body = document.body; const prevRootO = root.style.overflow; const prevBodyO = body.style.overflow; const prevRootS = root.style.overscrollBehavior; const prevBodyS = body.style.overscrollBehavior
    root.style.overflow = 'hidden'; body.style.overflow = 'hidden'; root.style.overscrollBehavior = 'none'; body.style.overscrollBehavior = 'none'
    return () => { root.style.overflow = prevRootO; body.style.overflow = prevBodyO; root.style.overscrollBehavior = prevRootS; body.style.overscrollBehavior = prevBodyS }
  }, [isDeckEditorOpen, isHistoryModalOpen, isRulebookOpen, isSettingsPanelOpen])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || isTypingTarget(event)) return
      if (isRulebookOpen) { if (event.key === 'Escape') { event.preventDefault(); setIsRulebookOpen(false) } return }
      const key = event.key.toLowerCase()
      if (key === 's') { event.preventDefault(); setIsSettingsPanelOpen((c) => !c); return }
      if (key === 'h') { event.preventDefault(); if (!isHistoryModalOpen && !isReplayModeOpen) setIsHistoryModalOpen(true); else if (isHistoryModalOpen) { setIsHistoryModalOpen(false); setIsReplayModeOpen(true) } else setIsReplayModeOpen(false); return }
      if (event.key === 'Escape' && isSettingsPanelOpen && !isHistoryModalOpen && !isReplayModeOpen) { event.preventDefault(); setIsSettingsPanelOpen(false); return }
      if (!isHistoryModalOpen && !isReplayModeOpen) return
      if (event.key === 'Escape') { event.preventDefault(); if (isHistoryModalOpen) setIsHistoryModalOpen(false); else setIsReplayModeOpen(false); return }
      if (!runtime || snapshots.length === 0) return
      if (event.key === 'Home' && actionTimelineSnapshots.length > 0) { event.preventDefault(); handleJumpToSnapshot(actionTimelineSnapshots[0]!.id); return }
      if (event.key === 'End' && actionTimelineSnapshots.length > 0) { event.preventDefault(); handleJumpToSnapshot(actionTimelineSnapshots[actionTimelineSnapshots.length - 1]!.id); return }
      if (event.key === 'ArrowLeft' && activeActionSnapshotIndex > 0) { event.preventDefault(); queueReplayTimelineStep(-1); return }
      if (event.key === 'ArrowRight' && activeActionSnapshotIndex >= 0 && activeActionSnapshotIndex < actionTimelineSnapshots.length - 1) { event.preventDefault(); queueReplayTimelineStep(1); return }
      if (key === 'b' && activeActionSnapshotId) { event.preventDefault(); handleBranchFromSnapshot(activeActionSnapshotId); return }
      if (key === 'c') { event.preventDefault(); void handleCopyReplayPayload(); return }
      if (key === 'v') { event.preventDefault(); handleValidateReplayDeterminism() }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [bootstrapConfig, isHistoryModalOpen, isReplayModeOpen, isRulebookOpen, isSettingsPanelOpen, runtime, queueReplayTimelineStep, activeActionSnapshotId, activeActionSnapshotIndex, actionTimelineSnapshots, handleBranchFromSnapshot, handleJumpToSnapshot, snapshots.length, handleCopyReplayPayload, handleValidateReplayDeterminism])

  const handleOpenRulebook = () => { setIsSettingsPanelOpen(false); setIsHistoryModalOpen(false); setIsReplayModeOpen(false); setIsRulebookOpen(true) }
  const handleCloseRulebook = () => setIsRulebookOpen(false)
  const resetRuntime = (nextConfig = bootstrapConfig) => { try { const next = createRuntimeFromConfig(nextConfig); setRuntime(next); setResetEpoch((c) => c + 1); return null } catch (error) { return error instanceof Error ? error.message : 'Failed to reset battle preview.' } }
  const handleSeedChange = (seed: string) => handleBootstrapConfigChange({ ...bootstrapConfig, seed: seed.trim() || DEFAULT_GAME_BOOTSTRAP_CONFIG.seed })
  const handleBootstrapConfigChange = (nextConfig: GameBootstrapConfig) => { const fail = resetRuntime(nextConfig); if (fail) { showActionErrorToast(fail); return false }; setBootstrapConfig(nextConfig); if (typeof window !== 'undefined') { window.localStorage.setItem(SETTINGS_SEED_STORAGE_KEY, nextConfig.seed); window.localStorage.setItem(SETTINGS_BOOTSTRAP_STORAGE_KEY, JSON.stringify(nextConfig)) }; return true }
  const handleOpenDeckEditor = (idx: 0 | 1) => { setDeckEditorHeroIndex(idx); setIsDeckEditorOpen(true) }
  const handleCloseDeckEditor = () => { setIsDeckEditorOpen(false); setIsSettingsPanelOpen(false) }
  const handleHardReroll = () => { const nextSeed = incrementSeed(bootstrapConfig.seed || DEFAULT_GAME_BOOTSTRAP_CONFIG.seed); const next = { ...bootstrapConfig, seed: nextSeed }; if (handleBootstrapConfigChange(next)) showActionSuccessToast(`Hard reroll complete. New seed: ${nextSeed}.`, []) }
  const handleExportSettings = () => { if (typeof window === 'undefined') return null; const storage: Record<string, string> = {}; for (const key of SETTINGS_EXPORT_STORAGE_KEYS) { const val = window.localStorage.getItem(key); if (val !== null) storage[key] = val }; return JSON.stringify({ version: 1, storage }, null, 2) }
  const handleImportSettings = (raw: string) => { if (typeof window === 'undefined') return { ok: false, message: 'Settings import is only available in browser mode.' }; try { const payload = JSON.parse(raw); if (!payload || payload.version !== 1 || !payload.storage) return { ok: false, message: 'Invalid settings payload.' }; for (const key of SETTINGS_EXPORT_STORAGE_KEYS) window.localStorage.removeItem(key); for (const key of SETTINGS_EXPORT_STORAGE_KEYS) { const val = payload.storage[key]; if (typeof val === 'string') window.localStorage.setItem(key, val) }; window.location.reload(); return { ok: true, message: 'Settings imported. Reloading...' } } catch { return { ok: false, message: 'Settings JSON is invalid.' } } }

  useEffect(() => {
    if (!isReplayModeOpen || !isReplayPlaying || !runtime || snapshots.length === 0 || activeActionSnapshotIndex < 0 || activeActionSnapshotIndex >= actionTimelineSnapshots.length - 1) { if (isReplayPlaying) setIsReplayPlaying(false); return }
    const nextSnapshotId = actionTimelineSnapshots[activeActionSnapshotIndex + 1]?.id ?? null
    if (!nextSnapshotId) { setIsReplayPlaying(false); return }
    const timeout = window.setTimeout(() => handleJumpToSnapshot(nextSnapshotId), Math.max(120, Math.floor(1000 / replayPlaybackSpeed)))
    return () => window.clearTimeout(timeout)
  }, [isReplayModeOpen, isReplayPlaying, replayPlaybackSpeed, runtime, actionTimelineSnapshots, activeActionSnapshotIndex, handleJumpToSnapshot, snapshots.length])

  useEffect(() => {
    if (!isReplayModeOpen) return; if (suppressReplayToastSyncRef.current) { suppressReplayToastSyncRef.current = false; return }; toast.dismiss()
    if (!runtime) return; const active = getReplayModeActiveSnapshot(runtime.session); if (active) showReplaySnapshotToasts(active)
    return () => toast.dismiss()
  }, [isReplayModeOpen, runtime, showReplaySnapshotToasts, suppressReplayToastSyncRef])

  useEffect(() => { return () => { if (replayNavigationFrameRef.current !== null) { window.cancelAnimationFrame(replayNavigationFrameRef.current); replayNavigationFrameRef.current = null } } }, [replayNavigationFrameRef])

  useEffect(() => {
    if (!isReplayModeOpen || !runtime) return
    const list = replayTimelineListRef.current; if (!list || activeActionSnapshotId === null) return
    const btn = list.querySelector<HTMLButtonElement>(`[data-snapshot-id="${activeActionSnapshotId}"]`); if (!btn) return
    const listRect = list.getBoundingClientRect(); const btnRect = btn.getBoundingClientRect(); const padding = 16
    if (btnRect.left < listRect.left + padding || btnRect.right > listRect.right - padding) { const frame = window.requestAnimationFrame(() => btn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' })); return () => window.cancelAnimationFrame(frame) }
  }, [isReplayModeOpen, runtime, activeActionSnapshotId])

  useEffect(() => {
    if (!isReplayModeOpen) return
    const applyMove = (cX: number, cY: number) => { const ds = replayBarDragStateRef.current; if (!ds.isDragging) return; setReplayBarPosition({ x: ds.offsetX + (cX - ds.startX), y: ds.offsetY + (cY - ds.startY) }) }
    const finish = () => { if (replayBarDragStateRef.current.isDragging) { replayBarDragStateRef.current.isDragging = false; window.localStorage.setItem('REPLAY_BAR_POSITION', JSON.stringify(replayBarPosition)) } }
    const onMM = (e: MouseEvent) => applyMove(e.clientX, e.clientY); const onMU = () => finish(); const onTM = (e: TouchEvent) => { if (!e.touches[0] || !replayBarDragStateRef.current.isDragging) return; e.preventDefault(); applyMove(e.touches[0].clientX, e.touches[0].clientY) }; const onTE = () => finish()
    document.addEventListener('mousemove', onMM); document.addEventListener('mouseup', onMU); document.addEventListener('touchmove', onTM, { passive: false }); document.addEventListener('touchend', onTE); document.addEventListener('touchcancel', onTE)
    return () => { document.removeEventListener('mousemove', onMM); document.removeEventListener('mouseup', onMU); document.removeEventListener('touchmove', onTM); document.removeEventListener('touchend', onTE); document.removeEventListener('touchcancel', onTE) }
  }, [isReplayModeOpen, replayBarPosition, setReplayBarPosition])

  const handleReplayBarDragStart = (e: React.MouseEvent | React.TouchEvent) => { if ((e.target as HTMLElement).closest('button, input, a')) return; let cX: number, cY: number; if ('touches' in e) { if (!e.touches[0]) return; cX = e.touches[0].clientX; cY = e.touches[0].clientY } else { cX = e.clientX; cY = e.clientY }; replayBarDragStateRef.current = { isDragging: true, startX: cX, startY: cY, offsetX: replayBarPosition.x, offsetY: replayBarPosition.y } }
  const handleReplayBarResetPosition = () => { setReplayBarPosition({ x: 0, y: 0 }); window.localStorage.removeItem('REPLAY_BAR_POSITION'); replayBarDragStateRef.current = { isDragging: false, startX: 0, startY: 0, offsetX: 0, offsetY: 0 } }

  const handleCopyShortlink = async () => { const url = typeof window !== 'undefined' ? window.location.href : ''; if (!url) { showActionErrorToast('Cannot copy shortlink outside browser mode.'); return }; const src = url.includes('#replay=') ? url.slice(url.indexOf('#replay=') + 8) : url; const hex = await sha256Hex(src); if (!hex) { try { await navigator.clipboard.writeText(url); showActionErrorToast('Failed to hash replay for shortlink. Copied full replay URL instead.') } catch { showActionErrorToast('Failed to hash replay for shortlink and failed to copy fallback replay URL.') }; return }; const alias = buildReplayShortAlias(hex); const sl = buildIsGdShortlink(alias); try { const params = new URLSearchParams({ format: 'json', url, shorturl: alias }); const resp = await fetch(`https://is.gd/create.php?${params.toString()}`); const p = (await resp.json()) as IsGdCreateResponse; if (typeof p.shorturl === 'string' && p.shorturl.length > 0) { await navigator.clipboard.writeText(p.shorturl); showActionSuccessToast('Shortlink copied to clipboard.', []); return }; if (p.errorcode === 2 && /taken|already|in use|exists/i.test(p.errormessage ?? '')) { await navigator.clipboard.writeText(sl); showActionSuccessToast('Existing shortlink copied to clipboard.', []); return }; throw new Error(p.errormessage) } catch { try { await navigator.clipboard.writeText(url); showActionErrorToast('Failed to create shortlink. Copied full replay URL instead.') } catch { showActionErrorToast('Failed to create shortlink and failed to copy fallback replay URL.') } } }

  if (!runtime) return <main className="dual-screens"><section className="screen"><h1>CMD Hero Fights</h1><p>Something went wrong.</p><pre className="preview">{startupError ?? 'Failed to create battle preview.'}</pre></section></main>

  const heroAId = runtime.preview.heroEntityIds[0]
  const heroBId = runtime.preview.heroEntityIds[1]
  const gameOver = runtime.preview.gameOver

  const gameOverMessage = (() => {
    if (!gameOver) return null

    if (gameOver.winnerHeroEntityId && gameOver.loserHeroEntityId) {
      const winner = runtime.preview.heroDetailsByEntityId[gameOver.winnerHeroEntityId]
      const loser = runtime.preview.heroDetailsByEntityId[gameOver.loserHeroEntityId]
      const winnerName = winner?.heroName ?? gameOver.winnerHeroEntityId
      const loserName = loser?.heroName ?? gameOver.loserHeroEntityId
      return `${winnerName} wins. ${loserName} has fallen.`
    }

    return 'Battle ended in a draw.'
  })()

  const renderHistoryControlIcon = (kind: 'first' | 'previous' | 'next' | 'play' | 'pause' | 'speed' | 'latest' | 'branch' | 'copy' | 'validate') => {
    switch (kind) {
      case 'first': return <svg className="history-control-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 5v14" /><path d="M18 6L10 12l8 6" /></svg>
      case 'previous': return <svg className="history-control-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M17 6L9 12l8 6" /></svg>
      case 'next': return <svg className="history-control-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 6l8 6-8 6" /></svg>
      case 'play': return <svg className="history-control-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5l11 7-11 7z" /></svg>
      case 'pause': return <svg className="history-control-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14" /><path d="M16 5v14" /></svg>
      case 'speed': return <svg className="history-control-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 15a7 7 0 1 1 14 0" /><path d="M12 15l4-4" /><path d="M17 8l2-2" /><path d="M7 15h10" /></svg>
      case 'latest': return <svg className="history-control-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M18 5v14" /><path d="M6 6l8 6-8 6" /></svg>
      case 'branch': return <svg className="history-control-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 6v8" /><path d="M7 14c0 3 2 4 5 4h5" /><circle cx="7" cy="4.5" r="1.8" /><circle cx="7" cy="12.5" r="1.8" /><circle cx="18.5" cy="18.5" r="1.8" /></svg>
      case 'copy': return <svg className="history-control-icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="8" width="10" height="11" rx="2" /><rect x="5" y="5" width="10" height="11" rx="2" /></svg>
      case 'validate': return <svg className="history-control-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8" /><path d="M8.5 12.3l2.3 2.3 4.8-4.8" /></svg>
      default: return null
    }
  }

  const renderTimelineControls = (options?: { showPlaybackControls?: boolean }) => {
    const showPlayback = options?.showPlaybackControls ?? false
    return (
      <>
        <button className="history-icon-button" type="button" aria-label="Jump to first" title="First (Home)" onClick={() => handleJumpToSnapshot(actionTimelineSnapshots[0]!.id)} disabled={actionTimelineSnapshots.length === 0 || activeActionSnapshotIndex <= 0}>{renderHistoryControlIcon('first')}</button>
        <button className="history-icon-button" type="button" aria-label="Jump to previous" title="Previous (Left)" onClick={() => handleJumpToSnapshot(actionTimelineSnapshots[activeActionSnapshotIndex - 1]!.id)} disabled={activeActionSnapshotIndex <= 0}>{renderHistoryControlIcon('previous')}</button>
        {showPlayback && <button className={`history-icon-button replay-playback-button ${isReplayPlaying ? 'replay-playback-button-active' : ''}`} type="button" aria-label={isReplayPlaying ? 'Pause' : 'Play'} title={isReplayPlaying ? 'Pause (Space)' : 'Play (Space)'} onClick={() => { if (canAdvanceReplay || isReplayPlaying) setIsReplayPlaying((c) => !c) }} disabled={!isReplayPlaying && !canAdvanceReplay}>{renderHistoryControlIcon(isReplayPlaying ? 'pause' : 'play')}</button>}
        <button className="history-icon-button" type="button" aria-label="Jump to next" title="Next (Right)" onClick={() => handleJumpToSnapshot(actionTimelineSnapshots[activeActionSnapshotIndex + 1]!.id)} disabled={activeActionSnapshotIndex < 0 || activeActionSnapshotIndex >= actionTimelineSnapshots.length - 1}>{renderHistoryControlIcon('next')}</button>
        <button className="history-icon-button" type="button" aria-label="Jump to latest" title="Latest (End)" onClick={() => handleJumpToSnapshot(latestActionSnapshotId!)} disabled={!latestActionSnapshotId || activeActionSnapshotId === latestActionSnapshotId}>{renderHistoryControlIcon('latest')}</button>
        {showPlayback && <button className="history-icon-button replay-speed-button" type="button" aria-label={`Speed ${replayPlaybackSpeed}x`} title={`Speed: ${replayPlaybackSpeed}x`} onClick={() => setReplayPlaybackSpeedIndex((c) => (c + 1) % REPLAY_PLAYBACK_SPEEDS.length)}><span className="replay-speed-button-label">{formatReplayPlaybackSpeed(replayPlaybackSpeed)}</span></button>}
        <button className="history-icon-button" type="button" aria-label="Branch" title="Branch (B)" onClick={() => handleBranchFromSnapshot(activeActionSnapshotId)} disabled={!activeActionSnapshotId}>{renderHistoryControlIcon('branch')}</button>
        <button className="history-icon-button" type="button" aria-label="Copy" title="Copy (C)" onClick={() => void handleCopyReplayPayload()}>{renderHistoryControlIcon('copy')}</button>
        <button className="history-icon-button" type="button" aria-label="Validate" title="Validate (V)" onClick={handleValidateReplayDeterminism}>{renderHistoryControlIcon('validate')}</button>
        <span className="history-snapshot-active-label">Active: {activeActionSnapshot ? (activeActionSnapshot.phase === 'pre' ? 'Start' : `#${activeActionSnapshotIndex}`) : 'none'}</span>
      </>
    )
  }

  const renderTimelineSnapshotList = () => (
      <ul ref={replayTimelineListRef} className="snapshot-list" aria-label="Action timeline">
      {actionTimelineSnapshots.map((s, index) => (
        <li key={s.id}><button type="button" className={`snapshot-chip ${s.id === activeActionSnapshotId ? 'snapshot-chip-active' : ''}`} data-snapshot-id={s.id} onClick={() => handleJumpToSnapshot(s.id)}>{s.phase === 'pre' ? `Start T${s.turnNumber}` : `#${index} T${s.turnNumber} ${s.actionKind}`}</button></li>
      ))}
    </ul>
  )

  return (
    <>
      <Toaster position="top-center" gutter={12} reverseOrder toastOptions={{ className: 'game-toast', duration: ACTION_TOAST_DURATION_MS }} />
      <div key={`announcement-${liveAnnouncement.id}`} className="sr-only" aria-live="polite" aria-atomic="true">{liveAnnouncement.text}</div>
      <button type="button" className="history-button" onClick={() => setIsHistoryModalOpen(true)} aria-haspopup="dialog" aria-expanded={isHistoryModalOpen || isReplayModeOpen}>History ({playerFacingHistoryCount})</button>
      <button type="button" className={`history-button settings-launch-button ${isSettingsPanelOpen ? 'settings-launch-button-active' : ''}`} onClick={() => setIsSettingsPanelOpen((c) => !c)} aria-haspopup="dialog" aria-expanded={isSettingsPanelOpen} title="Toggle settings (S)">Settings</button>
      <button type="button" className="history-button shortlink-launch-button" onClick={() => void handleCopyShortlink()} title="Copy shortlink">Copy Shortlink</button>
      {autoPlayButtonsVisible && <button type="button" className={`history-button auto-play-button auto-play-button-a ${isAutoPlayAEnabled ? 'auto-play-button-active' : ''}`} onClick={() => setIsAutoPlayAEnabled((c) => !c)} aria-pressed={isAutoPlayAEnabled} title={`Auto-play A (${autoPlayDelayMs}ms)`} disabled={!!gameOver}>Auto Play A</button>}
      {autoPlayButtonsVisible && <button type="button" className={`history-button auto-play-button auto-play-button-b ${isAutoPlayBEnabled ? 'auto-play-button-active' : ''}`} onClick={() => setIsAutoPlayBEnabled((c) => !c)} aria-pressed={isAutoPlayBEnabled} title={`Auto-play B (${autoPlayDelayMs}ms)`} disabled={!!gameOver}>Auto Play B</button>}

      <HistoryModal
        isOpen={isHistoryModalOpen}
        snapshots={snapshots}
        history={runtime.session.history}
        activeActionSnapshotId={activeActionSnapshotId}
        onJumpToSnapshot={handleJumpToSnapshot}
        onClose={() => setIsHistoryModalOpen(false)}
        onOpenReplayBar={() => { setIsReplayModeOpen(true); setIsHistoryModalOpen(false) }}
        onCopyHistoryJson={() => void handleCopyHistoryJson()}
        onBranchFromSnapshot={() => handleBranchFromSnapshot(activeActionSnapshotId)}
        onCopyReplayPayload={() => void handleCopyReplayPayload()}
        onValidateReplayDeterminism={handleValidateReplayDeterminism}
        queueReplayTimelineStep={queueReplayTimelineStep}
        renderTimelineControls={renderTimelineControls}
        renderTimelineSnapshotList={renderTimelineSnapshotList}
      />

      <ReplayBar
        isOpen={isReplayModeOpen}
        replayBarPosition={replayBarPosition}
        onMouseDown={handleReplayBarDragStart}
        onResetPosition={handleReplayBarResetPosition}
        onOpenHistory={() => { setIsHistoryModalOpen(true); setIsReplayModeOpen(false) }}
        onClose={() => setIsReplayModeOpen(false)}
        renderTimelineControls={renderTimelineControls}
        renderTimelineSnapshotList={renderTimelineSnapshotList}
      />

      <SettingsPanel
        state={runtime.session.state as Record<string, unknown>}
        bootstrapConfig={bootstrapConfig}
        onSeedChange={handleSeedChange}
        onBootstrapConfigChange={handleBootstrapConfigChange}
        onExportSettings={handleExportSettings}
        onImportSettings={handleImportSettings}
        autoPlayButtonsVisible={autoPlayButtonsVisible}
        autoPlayDelayMs={autoPlayDelayMs}
        autoPlayAutoEndTurnWhenNoLegalMoves={autoPlayAutoEndTurnWhenNoLegalMoves}
        autoPlayUseEntityActives={autoPlayUseEntityActives}
        musicTrackId={musicTrackId}
        onAutoPlayButtonsVisibleChange={setAutoPlayButtonsVisible}
        onAutoPlayDelayMsChange={setAutoPlayDelayMs}
        onAutoPlayAutoEndTurnWhenNoLegalMovesChange={setAutoPlayAutoEndTurnWhenNoLegalMoves}
        onAutoPlayUseEntityActivesChange={setAutoPlayUseEntityActives}
        onMusicTrackIdChange={setMusicTrackId}
        onClosePanel={() => setIsSettingsPanelOpen(false)}
        isVisible={isSettingsPanelOpen}
      />

      <DeckEditor
        isOpen={isDeckEditorOpen}
        heroIndex={deckEditorHeroIndex}
        cards={deckEditorCards}
        bootstrapConfig={bootstrapConfig}
        onClose={handleCloseDeckEditor}
        onSave={handleBootstrapConfigChange}
      />

      <audio key={selectedMusicTrack.id} ref={musicAudioRef} src={selectedMusicTrack.source} loop autoPlay muted={isMusicMuted} />

      <main key={`battle-${resetEpoch}`} className="dual-screens">
        {gameOverMessage ? <div className="game-over-banner" role="status" aria-live="polite">{gameOverMessage}</div> : null}
        <PlayerScreen key="screen-a" title="CMD Hero Fights" selfId={heroAId} enemyId={heroBId} selfSideKey="a" preview={runtime.preview} shouldShowDetailedTooltips={isShiftHeld || showDetailedTooltips} showDetailedTooltipsToggle={showDetailedTooltips} onToggleDetailedTooltips={() => setShowDetailedTooltips((c) => !c)} onBasicAttack={createBasicAttackHandler(heroAId)} onUseEntityActive={createEntityActiveHandler(heroAId)} onPressLuck={createSimpleActionHandler(heroAId, 'pressLuck')} onEndTurn={createSimpleActionHandler(heroAId, 'endTurn')} onPlayCard={createPlayCardHandler(heroAId)} onOpenDeckEditor={() => handleOpenDeckEditor(0)} onOpenRulebook={handleOpenRulebook} onHardReroll={handleHardReroll} isMusicMuted={isMusicMuted} onToggleMusic={() => setIsMusicMuted((c) => !c)} showMusicControl isRulebookOpen={isRulebookOpen} lastActionFeedback={lastActionFeedback} />
        <PlayerScreen key="screen-b" title="CMD Hero Fights" selfId={heroBId} enemyId={heroAId} selfSideKey="b" preview={runtime.preview} shouldShowDetailedTooltips={isShiftHeld || showDetailedTooltips} showDetailedTooltipsToggle={showDetailedTooltips} onToggleDetailedTooltips={() => setShowDetailedTooltips((c) => !c)} onBasicAttack={createBasicAttackHandler(heroBId)} onUseEntityActive={createEntityActiveHandler(heroBId)} onPressLuck={createSimpleActionHandler(heroBId, 'pressLuck')} onEndTurn={createSimpleActionHandler(heroBId, 'endTurn')} onPlayCard={createPlayCardHandler(heroBId)} onOpenDeckEditor={() => handleOpenDeckEditor(1)} onOpenRulebook={handleOpenRulebook} onHardReroll={handleHardReroll} isMusicMuted={isMusicMuted} onToggleMusic={() => setIsMusicMuted((c) => !c)} showMusicControl isRulebookOpen={isRulebookOpen} lastActionFeedback={lastActionFeedback} />
      </main>
      <RulebookPanel isOpen={isRulebookOpen} onClose={handleCloseRulebook} />
    </>
  )
}

export default App
