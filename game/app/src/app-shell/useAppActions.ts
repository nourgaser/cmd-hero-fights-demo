import { useCallback } from 'react'
import type { BattleEvent } from '../../../shared/models'
import {
  branchSessionFromSnapshot,
  jumpSessionToSnapshot,
  resolveSessionBasicAttack,
  resolveSessionPlayCard,
  resolveSessionSimpleAction,
  resolveSessionUseEntityActive,
} from '../game-client-session'
import {
  type AppRuntime,
  ensureSessionReadyForAction,
} from './runtime-utils'

export function useAppActions(options: {
  runtime: AppRuntime | null
  setRuntime: React.Dispatch<React.SetStateAction<AppRuntime | null>>
  announce: (text: string) => void
  showActionErrorToast: (message: string) => void
  showActionSuccessToast: (message: string, events: BattleEvent[]) => void
  showBattleEventToast: (event: BattleEvent) => void
}) {
  const {
    setRuntime,
    announce,
    showActionErrorToast,
    showActionSuccessToast,
    showBattleEventToast,
  } = options

  const createBasicAttackHandler = useCallback((heroId: string) => {
    return (input: { targetEntityId: string }) => {
      let failureReason: string | null = null
      let resultMessage: string | null = null
      let events: BattleEvent[] = []
      let branchNotice: string | null = null

      setRuntime((prev) => {
        if (!prev) return prev
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
          failureReason = result.reason || 'Unknown error'
        } else {
          resultMessage = result.resultMessage
          events = result.events
        }

        return { session: result.session, preview: result.preview }
      })

      if (failureReason) {
        showActionErrorToast(`Basic attack failed: ${failureReason}`)
      } else if (resultMessage) {
        if (branchNotice) announce(branchNotice)
        showActionSuccessToast(resultMessage, events)
        for (const event of events) showBattleEventToast(event)
      }
    }
  }, [setRuntime, announce, showActionErrorToast, showActionSuccessToast, showBattleEventToast])

  const createEntityActiveHandler = useCallback((heroId: string) => {
    return (input: { sourceEntityId: string; targetEntityId?: string }) => {
      let failureReason: string | null = null
      let resultMessage: string | null = null
      let events: BattleEvent[] = []
      let branchNotice: string | null = null

      setRuntime((prev) => {
        if (!prev) return prev
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
          failureReason = result.reason || 'Unknown error'
        } else {
          resultMessage = result.resultMessage
          events = result.events
        }

        return { session: result.session, preview: result.preview }
      })

      if (failureReason) {
        showActionErrorToast(`Entity active failed: ${failureReason}`)
      } else if (resultMessage) {
        if (branchNotice) announce(branchNotice)
        showActionSuccessToast(resultMessage, events)
        for (const event of events) showBattleEventToast(event)
      }
    }
  }, [setRuntime, announce, showActionErrorToast, showActionSuccessToast, showBattleEventToast])

  const createPlayCardHandler = useCallback((heroId: string) => {
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
        if (!prev) return prev
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
          failureReason = result.reason || 'Unknown error'
        } else {
          resultMessage = result.resultMessage
          events = result.events
        }

        return { session: result.session, preview: result.preview }
      })

      if (failureReason) {
        showActionErrorToast(`Play card failed: ${failureReason}`)
      } else if (resultMessage) {
        if (branchNotice) announce(branchNotice)
        showActionSuccessToast(resultMessage, events)
        for (const event of events) showBattleEventToast(event)
      }
    }
  }, [setRuntime, announce, showActionErrorToast, showActionSuccessToast, showBattleEventToast])

  const createSimpleActionHandler = useCallback((heroId: string, kind: 'pressLuck' | 'endTurn') => {
    return () => {
      let failureReason: string | null = null
      let resultMessage: string | null = null
      let events: BattleEvent[] = []
      let branchNotice: string | null = null

      setRuntime((prev) => {
        if (!prev) return prev
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
          failureReason = result.reason || 'Unknown error'
        } else {
          resultMessage = result.resultMessage
          events = result.events
        }

        return { session: result.session, preview: result.preview }
      })

      if (failureReason) {
        showActionErrorToast(`${kind} failed: ${failureReason}`)
      } else if (resultMessage) {
        if (branchNotice) announce(branchNotice)
        showActionSuccessToast(resultMessage, events)
        for (const event of events) showBattleEventToast(event)
      }
    }
  }, [setRuntime, announce, showActionErrorToast, showActionSuccessToast, showBattleEventToast])

  const handleJumpToSnapshot = useCallback((snapshotId: number) => {
    let failureReason: string | null = null
    setRuntime((prev) => {
      if (!prev) return prev
      const result = jumpSessionToSnapshot({ session: prev.session, snapshotId })
      if (!result.ok) {
        failureReason = result.reason || 'Unknown error'
        return prev
      }
      return { session: result.session, preview: result.preview }
    })
    if (failureReason) showActionErrorToast(failureReason)
  }, [setRuntime, showActionErrorToast])

  const handleBranchFromSnapshot = useCallback((snapshotId: number | null) => {
    if (!snapshotId) return
    let failureReason: string | null = null
    let branchMessage: string | null = null

    setRuntime((prev) => {
      if (!prev) return prev
      const result = branchSessionFromSnapshot({ session: prev.session, snapshotId })
      if (!result.ok) {
        failureReason = result.reason || 'Unknown error'
        return prev
      }
      branchMessage = `Branch resumed from snapshot ${snapshotId}.`
      return { session: result.session, preview: result.preview }
    })

    if (failureReason) {
      showActionErrorToast(failureReason)
    } else if (branchMessage) {
      showActionSuccessToast(branchMessage, [])
    }
  }, [setRuntime, showActionErrorToast, showActionSuccessToast])

  return {
    createBasicAttackHandler,
    createEntityActiveHandler,
    createPlayCardHandler,
    createSimpleActionHandler,
    handleJumpToSnapshot,
    handleBranchFromSnapshot,
  }
}
