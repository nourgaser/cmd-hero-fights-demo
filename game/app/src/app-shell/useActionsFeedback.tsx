import { useCallback } from 'react'
import { toast } from 'react-hot-toast'
import type { BattleEvent } from '../../../shared/models'
import type { AppBattleSnapshot } from '../game-client'
import { renderTextWithHighlightedNumbers, splitSummaryAndDetail } from '../utils/render-numeric-text'
import { ACTION_TOAST_ID, ACTION_TOAST_DURATION_MS, EVENT_TOAST_DURATION_MS } from './constants'

export function useActionsFeedback(options: {
  announce: (text: string) => void
  shouldShowDetailedTooltips: boolean
}) {
  const { announce, shouldShowDetailedTooltips } = options

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
    announce(message)
    toast.error(message, {
      id: ACTION_TOAST_ID,
      duration: ACTION_TOAST_DURATION_MS,
    })
  }, [announce])

  const showActionSuccessToast = useCallback((message: string, events: BattleEvent[]) => {
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
  }, [announce, renderStructuredToast, shouldShowDetailedTooltips])

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

    announce(summary)

    toast(renderStructuredToast(summary, detail, shouldShowDetailedTooltips), {
      id: `battle-event-${event.sequence}`,
      duration: EVENT_TOAST_DURATION_MS,
    })
  }, [announce, renderStructuredToast, shouldShowDetailedTooltips])

  const showReplaySnapshotToasts = useCallback((snapshot: AppBattleSnapshot) => {
    if (!snapshot.success) {
      showActionErrorToast(snapshot.resultMessage)
      return
    }

    showActionSuccessToast(snapshot.resultMessage, snapshot.events)
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
