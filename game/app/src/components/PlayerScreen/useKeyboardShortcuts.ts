import { useEffect } from 'react'
import type { HandBarCard } from '../HandBar'
import { resolveKeyboardShortcutAction } from '../../config/keyboard-shortcuts'

export function useKeyboardShortcuts(options: {
  isActivePlayer: boolean
  isCoarsePointer: boolean
  onEndTurn: () => void
  onPressLuck: () => void
  selfHandCards: HandBarCard[]
  focusedHandCardId: string | null
  canConfirmFocusedCardShortcut: boolean
  handleFocusCard: (handCardId: string) => void
  handleConfirmFocusedCard: () => void
  handleBeginHeroBasicAttackEntityActive: () => void
  handleConfirmEntityActive: () => void
  pendingActionMode: string | null
  selectedEntityActiveSourceId: string | null
  selectedTargetEntityId: string | null
  basicAttackTargetEntityIds: string[]
  selfId: string
}) {
  const {
    isActivePlayer,
    isCoarsePointer,
    onEndTurn,
    onPressLuck,
    selfHandCards,
    focusedHandCardId,
    canConfirmFocusedCardShortcut,
    handleFocusCard,
    handleConfirmFocusedCard,
    handleBeginHeroBasicAttackEntityActive,
    handleConfirmEntityActive,
    pendingActionMode,
    selectedEntityActiveSourceId,
    selectedTargetEntityId,
    basicAttackTargetEntityIds,
    selfId,
  } = options

  useEffect(() => {
    if (typeof window === 'undefined' || isCoarsePointer) return

    const isEditableTarget = (target: EventTarget | null): boolean => {
      if (!(target instanceof HTMLElement)) return false
      return target.isContentEditable || target.closest('input, textarea, select, [contenteditable="true"]') !== null
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.repeat || event.metaKey || event.ctrlKey || event.altKey) return
      if (isEditableTarget(event.target)) return

      const shortcut = resolveKeyboardShortcutAction(event)
      if (!shortcut || !isActivePlayer) return

      switch (shortcut.kind) {
        case 'endTurn':
          onEndTurn()
          event.preventDefault()
          return
        case 'basicAttack':
          if (
            pendingActionMode === 'entityActiveTarget' &&
            selectedEntityActiveSourceId === selfId &&
            selectedTargetEntityId &&
            basicAttackTargetEntityIds.includes(selectedTargetEntityId)
          ) {
            handleConfirmEntityActive()
          } else {
            handleBeginHeroBasicAttackEntityActive()
          }
          event.preventDefault()
          return
        case 'pressLuck':
          onPressLuck()
          event.preventDefault()
          return
        case 'cardSlot': {
          const card = selfHandCards[shortcut.slotIndex]
          if (!card || !card.isPlayable) return
          if (focusedHandCardId === card.handCardId && canConfirmFocusedCardShortcut) {
            handleConfirmFocusedCard()
          } else {
            handleFocusCard(card.handCardId)
          }
          event.preventDefault()
          return
        }
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [
    isActivePlayer, isCoarsePointer, onEndTurn, onPressLuck, selfHandCards,
    focusedHandCardId, canConfirmFocusedCardShortcut, handleFocusCard,
    handleConfirmFocusedCard, handleBeginHeroBasicAttackEntityActive,
    handleConfirmEntityActive, pendingActionMode, selectedEntityActiveSourceId,
    selectedTargetEntityId, basicAttackTargetEntityIds, selfId,
  ])
}
