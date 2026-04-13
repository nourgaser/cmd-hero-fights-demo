import { useCallback, useMemo, useState } from 'react'
import type { AppBattlePreview } from '../../game-client'
import type { InspectTarget } from '../../inspectable'
import { LUCK_BALANCE_LIMIT } from '../../../../shared/game-constants'

export function usePlayerScreenState(options: {
  selfId: string
  preview: AppBattlePreview
  isActivePlayer: boolean
  onBasicAttack: (input: { targetEntityId: string }) => void
  onUseEntityActive: (input: { sourceEntityId: string; targetEntityId?: string }) => void
  onPlayCard: (input: {
    handCardId: string
    targetEntityId?: string
    targetPosition?: { row: number; column: number }
  }) => void
  onPressLuck: () => void
}) {
  const { selfId, preview, isActivePlayer, onBasicAttack, onUseEntityActive, onPlayCard, onPressLuck } = options

  const [focusedHandCardId, setFocusedHandCardId] = useState<string | null>(null)
  const [selectedTargetEntityId, setSelectedTargetEntityId] = useState<string | null>(null)
  const [selectedPlacementPosition, setSelectedPlacementPosition] = useState<{
    row: number
    column: number
  } | null>(null)
  const [pendingActionMode, setPendingActionMode] = useState<'entityActiveTarget' | 'pressLuckConfirm' | null>(null)
  const [selectedEntityActiveSourceId, setSelectedEntityActiveSourceId] = useState<string | null>(null)
  const [inspectTarget, setInspectTarget] = useState<InspectTarget | null>(null)

  const selfHandCards = useMemo(
    () => preview.heroHands.find((heroHand) => heroHand.heroEntityId === selfId)?.cards ?? [],
    [preview.heroHands, selfId],
  )

  const selfActionTargets =
    preview.heroActionTargets.find((entry) => entry.heroEntityId === selfId) ?? null

  const selfHandCount = preview.heroHandCounts.find(h => h.heroEntityId === selfId)
  const selfMovePoints = selfHandCount?.movePoints ?? 0

  const focusedCard = useMemo(() => {
    if (!focusedHandCardId) return null
    return selfHandCards.find((card) => card.handCardId === focusedHandCardId) ?? null
  }, [focusedHandCardId, selfHandCards])

  const basicAttackTargetEntityIds = useMemo(
    () => selfActionTargets?.basicAttack.validTargetEntityIds ?? [],
    [selfActionTargets],
  )

  const basicAttackMoveCost = selfActionTargets?.basicAttack.moveCost ?? 0
  const canUseHeroBasicAttackSource =
    isActivePlayer &&
    selfActionTargets !== null &&
    selfMovePoints >= basicAttackMoveCost &&
    basicAttackTargetEntityIds.length > 0

  const heroBasicAttackSourceId = canUseHeroBasicAttackSource ? selfId : null
  const entityActiveOptions = selfActionTargets?.entityActive ?? []

  const entityActiveSourceIds = useMemo(() => 
    heroBasicAttackSourceId !== null
      ? [heroBasicAttackSourceId, ...entityActiveOptions.map((entry) => entry.sourceEntityId)]
      : entityActiveOptions.map((entry) => entry.sourceEntityId),
    [heroBasicAttackSourceId, entityActiveOptions]
  )

  const selectedEntityActiveOption = selectedEntityActiveSourceId
    ? entityActiveOptions.find((entry) => entry.sourceEntityId === selectedEntityActiveSourceId) ?? null
    : null

  const entityActiveTargetEntityIds = useMemo(() => 
    selectedEntityActiveSourceId === selfId
      ? basicAttackTargetEntityIds
      : selectedEntityActiveOption?.validTargetEntityIds ?? [],
    [selectedEntityActiveSourceId, selfId, basicAttackTargetEntityIds, selectedEntityActiveOption]
  )

  const selectedEntityActiveRequiresTarget = entityActiveTargetEntityIds.length > 0

  const entityActiveHighlightedIds = pendingActionMode === 'entityActiveTarget'
    ? Array.from(new Set([...entityActiveSourceIds, ...entityActiveTargetEntityIds]))
    : []

  const selectedEntityConfirmId =
    pendingActionMode === 'entityActiveTarget' && !selectedEntityActiveRequiresTarget
      ? selectedEntityActiveSourceId
      : null

  const highlightedPlacementPositions = focusedCard?.validPlacementPositions ?? []
  const highlightedTargetEntityIds =
    pendingActionMode === 'entityActiveTarget'
      ? entityActiveHighlightedIds
      : focusedCard?.validTargetEntityIds ?? []

  const pressLuckMoveCost = selfActionTargets?.pressLuck.moveCost ?? 3
  const pressLuckUsedThisTurn = preview.turn.pressLuckUsedThisTurn
  const isSelfLuckAnchor = preview.luck.anchorHeroEntityId === selfId
  const pressLuckAtFavorableLimit = isSelfLuckAnchor
    ? preview.luck.balance >= LUCK_BALANCE_LIMIT
    : preview.luck.balance <= -LUCK_BALANCE_LIMIT

  const canBeginPressLuck = isActivePlayer && !pressLuckUsedThisTurn && !pressLuckAtFavorableLimit && selfMovePoints >= pressLuckMoveCost

  const handleClearFocus = useCallback(() => {
    setFocusedHandCardId(null)
    setPendingActionMode(null)
    setSelectedEntityActiveSourceId(null)
    setSelectedTargetEntityId(null)
    setSelectedPlacementPosition(null)
    setInspectTarget(null)
  }, [])

  const handleFocusCard = useCallback((handCardId: string) => {
    if (!isActivePlayer) return
    setFocusedHandCardId(handCardId)
    setInspectTarget({ kind: 'handCard', cardId: handCardId })
    setPendingActionMode(null)
    setSelectedEntityActiveSourceId(null)
    setSelectedTargetEntityId(null)
    setSelectedPlacementPosition(null)
  }, [isActivePlayer])

  const handleConfirmFocusedCard = useCallback(() => {
    if (!focusedCard) return
    const requiresTarget = focusedCard.validTargetEntityIds.length > 0
    const requiresPlacement = focusedCard.validPlacementPositions.length > 0
    if (requiresTarget && !selectedTargetEntityId) return
    if (requiresPlacement && !selectedPlacementPosition) return

    onPlayCard({
      handCardId: focusedCard.handCardId,
      targetEntityId: selectedTargetEntityId ?? undefined,
      targetPosition: selectedPlacementPosition ?? undefined,
    })
    handleClearFocus()
  }, [focusedCard, onPlayCard, selectedPlacementPosition, selectedTargetEntityId, handleClearFocus])

  const handleConfirmEntityActive = useCallback(() => {
    if (pendingActionMode !== 'entityActiveTarget' || !selectedEntityActiveSourceId) return
    const activeTargetEntityIds =
      selectedEntityActiveSourceId === selfId
        ? basicAttackTargetEntityIds
        : selectedEntityActiveOption?.validTargetEntityIds ?? []
    const requiresTarget = activeTargetEntityIds.length > 0

    if (requiresTarget && !selectedTargetEntityId) return
    if (requiresTarget && selectedTargetEntityId && !activeTargetEntityIds.includes(selectedTargetEntityId)) return

    if (selectedEntityActiveSourceId === selfId) {
      if (!selectedTargetEntityId || !basicAttackTargetEntityIds.includes(selectedTargetEntityId)) return
      onBasicAttack({ targetEntityId: selectedTargetEntityId })
    } else {
      onUseEntityActive({
        sourceEntityId: selectedEntityActiveSourceId,
        targetEntityId: selectedTargetEntityId ?? undefined,
      })
    }
    handleClearFocus()
  }, [
    basicAttackTargetEntityIds,
    onBasicAttack,
    onUseEntityActive,
    pendingActionMode,
    selectedEntityActiveOption,
    selectedEntityActiveSourceId,
    selectedTargetEntityId,
    selfId,
    handleClearFocus,
  ])

  const handleSelectTarget = useCallback((targetEntityId: string) => {
    if (pendingActionMode === 'entityActiveTarget') {
      if (entityActiveSourceIds.includes(targetEntityId)) {
        if (selectedEntityActiveSourceId === targetEntityId && !selectedEntityActiveRequiresTarget) {
          handleConfirmEntityActive()
          return
        }
        setSelectedEntityActiveSourceId(targetEntityId)
        setSelectedTargetEntityId(null)
        return
      }
      if (!entityActiveTargetEntityIds.includes(targetEntityId)) return
      if (selectedTargetEntityId === targetEntityId) {
        handleConfirmEntityActive()
        return
      }
      setSelectedTargetEntityId(targetEntityId)
      return
    }

    if (!focusedCard || !focusedCard.validTargetEntityIds.includes(targetEntityId)) return
    if (selectedTargetEntityId === targetEntityId) {
      handleConfirmFocusedCard()
      return
    }
    setSelectedTargetEntityId(targetEntityId)
  }, [pendingActionMode, entityActiveSourceIds, selectedEntityActiveSourceId, selectedEntityActiveRequiresTarget, handleConfirmEntityActive, entityActiveTargetEntityIds, selectedTargetEntityId, focusedCard, handleConfirmFocusedCard])

  const handleSelectBattlefieldEntity = useCallback((entityId: string) => {
    if (!isActivePlayer || pendingActionMode === 'pressLuckConfirm') return
    if (pendingActionMode === 'entityActiveTarget' || focusedCard) {
      handleSelectTarget(entityId)
      return
    }
    if (!entityActiveSourceIds.includes(entityId)) return

    setFocusedHandCardId(null)
    setPendingActionMode('entityActiveTarget')
    setSelectedEntityActiveSourceId(entityId)
    setSelectedTargetEntityId(null)
    setSelectedPlacementPosition(null)
  }, [isActivePlayer, pendingActionMode, focusedCard, handleSelectTarget, entityActiveSourceIds])

  const handleSelectPlacementPosition = useCallback((position: { row: number; column: number }) => {
    if (!focusedCard) return
    const isValid = focusedCard.validPlacementPositions.some(
      (entry) => entry.row === position.row && entry.column === position.column,
    )
    if (!isValid) return
    if (selectedPlacementPosition?.row === position.row && selectedPlacementPosition?.column === position.column) {
      handleConfirmFocusedCard()
      return
    }
    setSelectedPlacementPosition(position)
  }, [focusedCard, selectedPlacementPosition, handleConfirmFocusedCard])

  const handleBeginHeroBasicAttackEntityActive = useCallback(() => {
    if (!canUseHeroBasicAttackSource) return
    setFocusedHandCardId(null)
    setPendingActionMode('entityActiveTarget')
    setSelectedEntityActiveSourceId(selfId)
    setSelectedTargetEntityId(null)
    setSelectedPlacementPosition(null)
  }, [canUseHeroBasicAttackSource, selfId])

  const handleBeginPressLuck = useCallback(() => {
    if (!canBeginPressLuck) return
    setFocusedHandCardId(null)
    setSelectedEntityActiveSourceId(null)
    setPendingActionMode('pressLuckConfirm')
    setSelectedTargetEntityId(null)
    setSelectedPlacementPosition(null)
  }, [canBeginPressLuck])

  const handleConfirmPressLuck = useCallback(() => {
    if (pendingActionMode !== 'pressLuckConfirm') return
    onPressLuck()
    handleClearFocus()
  }, [onPressLuck, pendingActionMode, handleClearFocus])

  const handlePressLuckOverlayClick = useCallback(() => {
    if (!isActivePlayer) return
    if (pendingActionMode === 'pressLuckConfirm') handleConfirmPressLuck()
    else handleBeginPressLuck()
  }, [isActivePlayer, pendingActionMode, handleConfirmPressLuck, handleBeginPressLuck])

  return {
    focusedHandCardId, setFocusedHandCardId,
    selectedTargetEntityId, setSelectedTargetEntityId,
    selectedPlacementPosition, setSelectedPlacementPosition,
    pendingActionMode, setPendingActionMode,
    selectedEntityActiveSourceId, setSelectedEntityActiveSourceId,
    inspectTarget, setInspectTarget,
    selfHandCards,
    focusedCard,
    basicAttackTargetEntityIds,
    canUseHeroBasicAttackSource,
    entityActiveSourceIds,
    selectedEntityConfirmId,
    highlightedPlacementPositions,
    highlightedTargetEntityIds,
    pressLuckMoveCost,
    pressLuckUsedThisTurn,
    pressLuckAtFavorableLimit,
    canBeginPressLuck,
    handleClearFocus,
    handleFocusCard,
    handleConfirmFocusedCard,
    handleSelectTarget,
    handleSelectBattlefieldEntity,
    handleSelectPlacementPosition,
    handleBeginHeroBasicAttackEntityActive,
    handleConfirmEntityActive,
    handleBeginPressLuck,
    handleConfirmPressLuck,
    handlePressLuckOverlayClick,
  }
}
