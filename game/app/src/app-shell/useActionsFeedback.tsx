import { useCallback, useRef } from 'react'
import { toast } from 'react-hot-toast'
import type { BattleEvent } from '../../../shared/models'
import type { AppBattleSnapshot, AppBattleEventDisplay } from '../game-client'
import { renderTextWithHighlightedNumbers, splitSummaryAndDetail } from '../utils/render-numeric-text'
import { ACTION_TOAST_ID, ACTION_TOAST_DURATION_MS, EVENT_TOAST_DURATION_MS, EVENT_TOAST_ID } from './constants'

export type LastActionFeedback = {
  summary: string
  detail: string | null
  isError: boolean
  updatedAt: number
  eventTrail: AppBattleEventDisplay[]
}

function buildSuccessLastActionFeedback(message: string, eventTrail: AppBattleEventDisplay[]): LastActionFeedback {
  const split = splitSummaryAndDetail(message)
  let detail = split.detail
  if (eventTrail.length > 0) {
    const firstTrailDetail = eventTrail.find((entry) => entry.detail !== null)?.detail ?? null
    detail = firstTrailDetail ?? detail
  }

  return {
    summary: split.summary,
    detail,
    isError: false,
    updatedAt: Date.now(),
    eventTrail,
  }
}

function buildErrorLastActionFeedback(message: string): LastActionFeedback {
  const split = splitSummaryAndDetail(message)
  return {
    summary: split.summary,
    detail: split.detail,
    isError: true,
    updatedAt: Date.now(),
    eventTrail: [],
  }
}

export function buildLastActionFeedbackFromSnapshot(snapshot: AppBattleSnapshot): LastActionFeedback {
  if (!snapshot.success) {
    return buildErrorLastActionFeedback(snapshot.resultMessage)
  }

  return buildSuccessLastActionFeedback(snapshot.resultMessage, snapshot.eventTrail)
}

export function useActionsFeedback(options: {
  announce: (text: string) => void
  shouldShowDetailedTooltips: boolean
  onLastActionFeedback?: (feedback: LastActionFeedback) => void
}) {
  const { announce, shouldShowDetailedTooltips, onLastActionFeedback } = options
  const eventToastMemoryRef = useRef<{ signature: string; updatedAt: number }>({
    signature: '',
    updatedAt: 0,
  })

  const renderStructuredToast = useCallback((summary: string, detail: string | null, showDetail: boolean) => {
    return (
      <span className={`game-toast-body ${showDetail ? 'game-toast-body-expanded' : ''}`.trim()}>
        <span className="game-toast-summary">{renderTextWithHighlightedNumbers(summary, 'game-toast-number')}</span>
        {showDetail && detail ? (
          <span className="game-toast-detail">{renderTextWithHighlightedNumbers(detail, 'game-toast-number')}</span>
        ) : null}
      </span>
    )
  }, [])

  const showActionErrorToast = useCallback((message: string) => {
    const feedback = buildErrorLastActionFeedback(message)
    onLastActionFeedback?.(feedback)
    announce(feedback.summary)
    toast.error(message, {
      id: ACTION_TOAST_ID,
      duration: ACTION_TOAST_DURATION_MS,
    })
  }, [announce, onLastActionFeedback])

  const showActionSuccessToast = useCallback((message: string, eventTrail: AppBattleEventDisplay[]) => {
    const feedback = buildSuccessLastActionFeedback(message, eventTrail)
    announce(feedback.summary)
    onLastActionFeedback?.(feedback)

    toast.success(renderStructuredToast(feedback.summary, feedback.detail, shouldShowDetailedTooltips), {
      id: ACTION_TOAST_ID,
      duration: ACTION_TOAST_DURATION_MS,
    })
  }, [announce, onLastActionFeedback, renderStructuredToast, shouldShowDetailedTooltips])

  const showBattleEventToast = useCallback((event: BattleEvent) => {
    // Action success toasts already summarize these outcomes (including roll/luck detail),
    // so showing event toasts for them creates duplicate feedback.
    if (event.kind === 'damageApplied' || event.kind === 'luckBalanceChanged') {
      return
    }

    let summary: string | null = null
    let detail: string | null = null

    if (event.kind === 'listenerTriggered') {
      if (event.listenerId.includes(':passive:heal-on-attack')) {
        return
      }
      const split = splitSummaryAndDetail(event.message)
      summary = split.summary
      detail = split.detail
    } else if (event.kind === 'healApplied') {
      if (event.amount <= 0) {
        return
      }
      summary = `Restored ${event.amount} HP.`
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

    const signature = `${event.kind}:${summary}:${detail ?? ''}`
    const now = Date.now()
    if (
      eventToastMemoryRef.current.signature === signature
      && now - eventToastMemoryRef.current.updatedAt < 700
    ) {
      return
    }
    eventToastMemoryRef.current = {
      signature,
      updatedAt: now,
    }

    announce(summary)

    toast(renderStructuredToast(summary, detail, shouldShowDetailedTooltips), {
      id: EVENT_TOAST_ID,
      duration: EVENT_TOAST_DURATION_MS,
    })
  }, [announce, renderStructuredToast, shouldShowDetailedTooltips])

  const showReplaySnapshotToasts = useCallback((snapshot: AppBattleSnapshot) => {
    if (!snapshot.success) {
      showActionErrorToast(snapshot.resultMessage)
      return
    }

    showActionSuccessToast(snapshot.resultMessage, snapshot.eventTrail)
    for (const event of snapshot.events) {
      showBattleEventToast(event)
    }
  }, [showActionErrorToast, showActionSuccessToast, showBattleEventToast])

  return {
    showActionErrorToast,
    showActionSuccessToast,
    showBattleEventToast,
    showReplaySnapshotToasts,
  }
}
