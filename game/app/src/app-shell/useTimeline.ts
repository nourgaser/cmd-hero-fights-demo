import { useCallback, useRef } from 'react'
import { jumpSessionToSnapshot } from '../game-client-session'
import {
  type AppRuntime,
  type ReplayNavigationDirection,
} from './runtime-utils'
import { REPLAY_PLAYBACK_SPEEDS } from './constants'

export function useTimeline(options: {
  setRuntime: React.Dispatch<React.SetStateAction<AppRuntime | null>>
  replayPlaybackSpeedIndex: number
}) {
  const {
    setRuntime,
    replayPlaybackSpeedIndex,
  } = options

  const replayNavigationFrameRef = useRef<number | null>(null)
  const replayNavigationDirectionRef = useRef<ReplayNavigationDirection | 0>(0)

  const stepReplayTimeline = useCallback((direction: ReplayNavigationDirection) => {
    setRuntime((prev) => {
      if (!prev || prev.session.snapshots.length === 0) return prev
      const postSnapshots = prev.session.snapshots.filter((s) => s.phase === 'post')
      const firstPreSnapshot = prev.session.snapshots.find((s) => s.phase === 'pre') ?? null
      const timelineSnapshots = firstPreSnapshot ? [firstPreSnapshot, ...postSnapshots] : postSnapshots
      const timelineLatestSnapshotId = timelineSnapshots.at(-1)?.id ?? null
      const currentSnapshotId = prev.session.activeSnapshotId ?? timelineLatestSnapshotId
      const currentSnapshot = currentSnapshotId !== null ? prev.session.snapshots.find((s) => s.id === currentSnapshotId) ?? null : null
      const timelineActiveSnapshotId = currentSnapshot ? (currentSnapshot.phase === 'pre' ? firstPreSnapshot?.id ?? null : currentSnapshot.id) : null
      const timelineActiveSnapshotIndex = timelineActiveSnapshotId !== null ? timelineSnapshots.findIndex((s) => s.id === timelineActiveSnapshotId) : -1
      const nextIndex = timelineActiveSnapshotIndex + direction

      if (nextIndex < 0 || nextIndex >= timelineSnapshots.length) return prev
      const result = jumpSessionToSnapshot({ session: prev.session, snapshotId: timelineSnapshots[nextIndex]!.id })
      if (!result.ok) return prev
      return { session: result.session, preview: result.preview }
    })
  }, [setRuntime])

  const queueReplayTimelineStep = useCallback((direction: ReplayNavigationDirection) => {
    replayNavigationDirectionRef.current = direction
    if (replayNavigationFrameRef.current !== null) return
    replayNavigationFrameRef.current = window.requestAnimationFrame(() => {
      replayNavigationFrameRef.current = null
      const queuedDirection = replayNavigationDirectionRef.current
      replayNavigationDirectionRef.current = 0
      if (queuedDirection !== 0) stepReplayTimeline(queuedDirection)
    })
  }, [stepReplayTimeline])

  const replayPlaybackSpeed = REPLAY_PLAYBACK_SPEEDS[replayPlaybackSpeedIndex] ?? 1

  return {
    replayNavigationFrameRef,
    stepReplayTimeline,
    queueReplayTimelineStep,
    replayPlaybackSpeed,
  }
}
