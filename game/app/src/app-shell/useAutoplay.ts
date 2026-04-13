import { useCallback, useEffect, useState } from 'react'
import { toast } from 'react-hot-toast'
import { LUCK_BALANCE_LIMIT } from '../../../shared/game-constants'
import type { BattleEvent } from '../../../shared/models'
import {
  resolveSessionBasicAttack,
  resolveSessionPlayCard,
  resolveSessionSimpleAction,
  resolveSessionUseEntityActive,
} from '../game-client-session'
import {
  type AppRuntime,
  clampAutoPlayDelay,
  ensureSessionReadyForAction,
  pickRandom,
} from './runtime-utils'
import { ACTION_TOAST_ID, ACTION_TOAST_DURATION_MS } from './constants'

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

export function useAutoplay(options: {
  runtime: AppRuntime | null
  setRuntime: React.Dispatch<React.SetStateAction<AppRuntime | null>>
  autoPlayButtonsVisible: boolean
  autoPlayDelayMs: number
  autoPlayAutoEndTurnWhenNoLegalMoves: boolean
  autoPlayUseEntityActives: boolean
  showActionSuccessToast: (message: string, events: BattleEvent[]) => void
  showBattleEventToast: (event: BattleEvent) => void
}) {
  const {
    runtime,
    setRuntime,
    autoPlayButtonsVisible,
    autoPlayDelayMs,
    autoPlayAutoEndTurnWhenNoLegalMoves,
    autoPlayUseEntityActives,
    showActionSuccessToast,
    showBattleEventToast,
  } = options

  const [isAutoPlayAEnabled, setIsAutoPlayAEnabled] = useState(false)
  const [isAutoPlayBEnabled, setIsAutoPlayBEnabled] = useState(false)

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
  }, [autoPlayAutoEndTurnWhenNoLegalMoves, autoPlayUseEntityActives, setRuntime, showActionSuccessToast, showBattleEventToast])

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

  return {
    isAutoPlayAEnabled,
    setIsAutoPlayAEnabled,
    isAutoPlayBEnabled,
    setIsAutoPlayBEnabled,
    runAutoPlayStep,
  }
}
