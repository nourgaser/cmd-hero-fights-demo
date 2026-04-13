import {
  type AppBattleSnapshot,
} from '../game-client'
import { useEffect, useRef } from 'react'
import { toast } from 'react-hot-toast'
import type { GameBootstrapConfig } from '../data/game-bootstrap'
import {
  type AppRuntime,
  createActionLogFromSession,
  createRuntimeFromConfig,
  createRuntimeFromReplayPayload,
  getReplayPayloadSnapshotId,
  getReplayModeActiveSnapshot,
} from './runtime-utils'
import {
  createReplayUrlPayload,
  readReplayPayloadFromLocation,
  writeReplayPayloadToLocation,
} from '../utils/replay-url'

export type ReplayHistoryBoundary = 'base' | 'guard' | 'normal'

export type ReplayHistoryState = {
  kind: 'cmd-replay-history'
  entryId: number
  boundary: ReplayHistoryBoundary
}

export function isReplayHistoryState(value: unknown): value is ReplayHistoryState {
  if (!value || typeof value !== 'object') {
    return false
  }

  const candidate = value as Partial<ReplayHistoryState>
  return (
    candidate.kind === 'cmd-replay-history' &&
    typeof candidate.entryId === 'number' &&
    (candidate.boundary === 'base' || candidate.boundary === 'guard' || candidate.boundary === 'normal')
  )
}

export function useReplayHistory(options: {
  bootstrapConfig: GameBootstrapConfig
  setBootstrapConfig: (config: GameBootstrapConfig) => void
  runtime: AppRuntime | null
  setRuntime: (runtime: AppRuntime | null) => void
  setResetEpoch: React.Dispatch<React.SetStateAction<number>>
  showReplaySnapshotToasts: (snapshot: AppBattleSnapshot) => void
}) {
  const {
    bootstrapConfig,
    setBootstrapConfig,
    runtime,
    setRuntime,
    setResetEpoch,
    showReplaySnapshotToasts,
  } = options

  const hasSyncedReplayHistoryRef = useRef(false)
  const nextReplayHistoryEntryIdRef = useRef(1)
  const lastHandledReplayHistoryEntryIdRef = useRef<number | null>(null)
  const suppressReplayUrlWriteRef = useRef(false)
  const suppressReplayToastSyncRef = useRef(false)
  const lastHandledLocationHrefRef = useRef<string | null>(null)

  const createReplayHistoryState = (boundary: ReplayHistoryBoundary): ReplayHistoryState => ({
    kind: 'cmd-replay-history',
    entryId: nextReplayHistoryEntryIdRef.current++,
    boundary,
  })

  useEffect(() => {
    if (!runtime) {
      return
    }

    if (suppressReplayUrlWriteRef.current) {
      suppressReplayUrlWriteRef.current = false
      hasSyncedReplayHistoryRef.current = true
      const currentHistoryState = isReplayHistoryState(window.history.state) ? window.history.state : null
      lastHandledReplayHistoryEntryIdRef.current = currentHistoryState?.entryId ?? null
      lastHandledLocationHrefRef.current = window.location.href
      return
    }

    const actionLog = createActionLogFromSession(runtime.session)
    const payload = createReplayUrlPayload({
      bootstrapConfig,
      seed: runtime.session.state.seed,
      actionLog,
      snapshotId: getReplayPayloadSnapshotId(runtime.session),
    })
    if (!hasSyncedReplayHistoryRef.current) {
      const baseState = createReplayHistoryState('base')
      writeReplayPayloadToLocation(payload, {
        historyMode: 'replace',
        historyState: baseState,
      })
      const guardState = createReplayHistoryState('guard')
      writeReplayPayloadToLocation(payload, {
        historyMode: 'push',
        historyState: guardState,
      })
      hasSyncedReplayHistoryRef.current = true
      lastHandledReplayHistoryEntryIdRef.current = guardState.entryId
      lastHandledLocationHrefRef.current = window.location.href
      return
    }

    const nextHistoryState = createReplayHistoryState('normal')
    writeReplayPayloadToLocation(payload, {
      historyMode: 'push',
      historyState: nextHistoryState,
    })
    hasSyncedReplayHistoryRef.current = true
    lastHandledReplayHistoryEntryIdRef.current = nextHistoryState.entryId
    lastHandledLocationHrefRef.current = window.location.href
  }, [bootstrapConfig, runtime])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const handleLocationChange = () => {
      const currentHistoryState = isReplayHistoryState(window.history.state) ? window.history.state : null
      if (
        currentHistoryState &&
        lastHandledReplayHistoryEntryIdRef.current === currentHistoryState.entryId
      ) {
        return
      }

      if (
        !currentHistoryState &&
        lastHandledReplayHistoryEntryIdRef.current === null &&
        lastHandledLocationHrefRef.current === window.location.href
      ) {
        return
      }

      lastHandledReplayHistoryEntryIdRef.current = currentHistoryState?.entryId ?? null
      lastHandledLocationHrefRef.current = window.location.href
      const replayPayload = readReplayPayloadFromLocation()
      suppressReplayUrlWriteRef.current = true

      try {
        let nextRuntime: AppRuntime
        if (replayPayload) {
          setBootstrapConfig(replayPayload.bootstrapConfig)
          nextRuntime = createRuntimeFromReplayPayload(replayPayload)
        } else {
          nextRuntime = createRuntimeFromConfig(bootstrapConfig)
        }

        suppressReplayToastSyncRef.current = true
        setRuntime(nextRuntime)
        setResetEpoch((current) => current + 1)
        toast.dismiss()
        const activeReplaySnapshot = getReplayModeActiveSnapshot(nextRuntime.session)
        if (activeReplaySnapshot) {
          showReplaySnapshotToasts(activeReplaySnapshot)
        }

        if (currentHistoryState?.boundary === 'base') {
          const guardState = createReplayHistoryState('guard')
          writeReplayPayloadToLocation(replayPayload ?? createReplayUrlPayload({
            bootstrapConfig,
            seed: nextRuntime.session.state.seed,
            actionLog: createActionLogFromSession(nextRuntime.session),
            snapshotId: getReplayPayloadSnapshotId(nextRuntime.session),
          }), {
            historyMode: 'push',
            historyState: guardState,
          })
          lastHandledReplayHistoryEntryIdRef.current = guardState.entryId
          lastHandledLocationHrefRef.current = window.location.href
        }
      } catch {
        suppressReplayUrlWriteRef.current = false
        suppressReplayToastSyncRef.current = false
        // Preserve the current session if the URL fragment cannot be replayed.
      }
    }

    lastHandledLocationHrefRef.current = window.location.href
    window.addEventListener('hashchange', handleLocationChange)
    window.addEventListener('popstate', handleLocationChange)
    return () => {
      window.removeEventListener('hashchange', handleLocationChange)
      window.removeEventListener('popstate', handleLocationChange)
    }
  }, [bootstrapConfig, setBootstrapConfig, setRuntime, setResetEpoch, showReplaySnapshotToasts])

  return {
    suppressReplayToastSyncRef,
  }
}
