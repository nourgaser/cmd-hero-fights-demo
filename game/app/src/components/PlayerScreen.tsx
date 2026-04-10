import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { Icon } from '@iconify/react/offline'
import type { AppBattlePreview } from '../game-client.ts'
import { LUCK_BALANCE_LIMIT } from '../../../shared/game-constants.ts'
import { LUCK_VISUALS, SIDE_VISUALS } from '../data/visual-metadata.ts'
import { KEYBOARD_SHORTCUT_HINT_ROWS, resolveKeyboardShortcutAction } from '../config/keyboard-shortcuts.ts'
import {
  renderTextWithHighlightedNumbers,
  splitTooltipDetailLabel,
} from '../utils/render-numeric-text.tsx'
import { BattlefieldGrid } from './BattlefieldGrid.tsx'
import { HandBar } from './HandBar.tsx'
import { InspectPanel } from './InspectPanel.tsx'
import type { InspectTarget } from '../inspectable.ts'

type PlayerScreenProps = {
  title: string
  selfId: string
  enemyId: string
  selfSideKey: 'a' | 'b'
  preview: AppBattlePreview
  shouldShowDetailedTooltips: boolean
  showDetailedTooltipsToggle: boolean
  onToggleDetailedTooltips: () => void
  onBasicAttack: (input: { targetEntityId: string }) => void
  onUseEntityActive: (input: { sourceEntityId: string; targetEntityId?: string }) => void
  onPressLuck: () => void
  onEndTurn: () => void
  onPlayCard: (input: {
    handCardId: string
    targetEntityId?: string
    targetPosition?: { row: number; column: number }
  }) => void
  onOpenDeckEditor: () => void
  isMusicMuted?: boolean
  onToggleMusic?: () => void
  showMusicControl?: boolean
  isSettingsOpen?: boolean
  onToggleSettings?: () => void
  showSettingsControl?: boolean
}

export function PlayerScreen(props: PlayerScreenProps) {
  const {
    title,
    selfId,
    enemyId,
    selfSideKey,
    preview,
    shouldShowDetailedTooltips,
    showDetailedTooltipsToggle,
    onToggleDetailedTooltips,
    onBasicAttack,
    onUseEntityActive,
    onPressLuck,
    onEndTurn,
    onPlayCard,
    onOpenDeckEditor,
    isMusicMuted,
    onToggleMusic,
    showMusicControl,
    isSettingsOpen,
    onToggleSettings,
    showSettingsControl,
  } = props
  const screenRef = useRef<HTMLElement | null>(null)

  const self = preview.heroHandCounts.find((hero) => hero.heroEntityId === selfId)
  const selfHeroDetails = preview.heroDetailsByEntityId[selfId] ?? null
  const selfActivePassiveEffects = useMemo(
    () => selfHeroDetails?.activePassiveEffects ?? [],
    [selfHeroDetails],
  )
  const enemySideKey = selfSideKey === 'a' ? 'b' : 'a'
  const shouldFlipRows = self?.battlefieldSide === 'north'
  const selfHandSize = self?.handSize ?? 0
  const selfDeckSize = self?.deckSize ?? 0
  const selfMovePoints = self?.movePoints ?? 0
  const selfMaxMovePoints = self?.maxMovePoints ?? 0
  const selfMoveCapacityTrace = self?.moveCapacityTrace ?? {
    base: selfMaxMovePoints,
    effective: selfMaxMovePoints,
    delta: 0,
    contributions: [],
  }
  const selfHandCards =
    preview.heroHands.find((heroHand) => heroHand.heroEntityId === selfId)?.cards ?? []
  const selfActionTargets =
    preview.heroActionTargets.find((entry) => entry.heroEntityId === selfId) ?? null
  const isActivePlayer = preview.activeHeroEntityId === selfId

  const [focusedHandCardId, setFocusedHandCardId] = useState<string | null>(null)
  const [selectedTargetEntityId, setSelectedTargetEntityId] = useState<string | null>(null)
  const [selectedPlacementPosition, setSelectedPlacementPosition] = useState<{
    row: number
    column: number
  } | null>(null)
  const [pendingActionMode, setPendingActionMode] = useState<'entityActiveTarget' | 'pressLuckConfirm' | null>(null)
  const [selectedEntityActiveSourceId, setSelectedEntityActiveSourceId] = useState<string | null>(null)
  const [isCoarsePointer, setIsCoarsePointer] = useState(false)
  const [openTouchTooltip, setOpenTouchTooltip] = useState<'deck' | 'press-luck' | null>(null)
  const [selectedPassiveEffectId, setSelectedPassiveEffectId] = useState<string | null>(null)
  const [showAllPassiveEffects, setShowAllPassiveEffects] = useState(false)
  const [inspectTarget, setInspectTarget] = useState<InspectTarget | null>(null)

  const toggleTouchTooltip = (tooltipId: 'deck' | 'press-luck') => {
    setOpenTouchTooltip((current) => (current === tooltipId ? null : tooltipId))
  }

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return
    }

    const mediaQuery = window.matchMedia('(pointer: coarse)')
    const syncPointerMode = () => {
      setIsCoarsePointer(mediaQuery.matches)
    }

    syncPointerMode()
    mediaQuery.addEventListener('change', syncPointerMode)

    return () => {
      mediaQuery.removeEventListener('change', syncPointerMode)
    }
  }, [])

  useEffect(() => {
    if (!isCoarsePointer || !openTouchTooltip) {
      return
    }

    const handlePointerDown = (event: PointerEvent) => {
      const screen = screenRef.current
      if (!screen) {
        return
      }

      const target = event.target
      if (!(target instanceof Node)) {
        return
      }

      if (!screen.contains(target)) {
        setOpenTouchTooltip(null)
        return
      }

      const element = target instanceof Element ? target : null
      if (element?.closest('.touch-tooltip-toggle') || element?.closest('.hint-wrap.force-tooltip-open')) {
        return
      }

      setOpenTouchTooltip(null)
    }

    window.addEventListener('pointerdown', handlePointerDown)
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown)
    }
  }, [isCoarsePointer, openTouchTooltip])

  const focusedCard = useMemo(() => {
    if (!focusedHandCardId) {
      return null
    }
    return selfHandCards.find((card) => card.handCardId === focusedHandCardId) ?? null
  }, [focusedHandCardId, selfHandCards])

  const selectedPassiveEffect = useMemo(() => {
    const sorted = [...selfActivePassiveEffects].sort((left, right) => {
      if (left.priority !== right.priority) {
        return right.priority - left.priority
      }
      return left.label.localeCompare(right.label)
    })

    if (sorted.length === 0) {
      return null
    }

    if (!selectedPassiveEffectId) {
      return sorted[0] ?? null
    }

    return sorted.find((entry) => entry.effectId === selectedPassiveEffectId) ?? sorted[0] ?? null
  }, [selectedPassiveEffectId, selfActivePassiveEffects])

  const sortedPassiveEffects = useMemo(
    () =>
      [...selfActivePassiveEffects].sort((left, right) => {
        if (left.priority !== right.priority) {
          return right.priority - left.priority
        }
        return left.label.localeCompare(right.label)
      }),
    [selfActivePassiveEffects],
  )

  const passiveChipLimit = isCoarsePointer ? 5 : 8
  const hasPassiveOverflow = sortedPassiveEffects.length > passiveChipLimit
  const visiblePassiveEffects =
    hasPassiveOverflow && !showAllPassiveEffects
      ? sortedPassiveEffects.slice(0, passiveChipLimit)
      : sortedPassiveEffects
  const hiddenPassiveCount = sortedPassiveEffects.length - visiblePassiveEffects.length

  const basicAttackTargetEntityIds = selfActionTargets?.basicAttack.validTargetEntityIds ?? []
  const basicAttackMoveCost = selfActionTargets?.basicAttack.moveCost ?? 0
  const canUseHeroBasicAttackSource =
    isActivePlayer &&
    selfMovePoints >= basicAttackMoveCost &&
    basicAttackTargetEntityIds.length > 0
  const heroBasicAttackSourceId = canUseHeroBasicAttackSource ? selfId : null
  const pressLuckMoveCost = selfActionTargets?.pressLuck.moveCost ?? 3
  const pressLuckUsedThisTurn = preview.turn.pressLuckUsedThisTurn
  const isSelfLuckAnchor = preview.luck.anchorHeroEntityId === selfId
  const pressLuckAtFavorableLimit = isSelfLuckAnchor
    ? preview.luck.balance >= LUCK_BALANCE_LIMIT
    : preview.luck.balance <= -LUCK_BALANCE_LIMIT
  const canConfirmPressLuck = isActivePlayer && !pressLuckUsedThisTurn && !pressLuckAtFavorableLimit && selfMovePoints >= pressLuckMoveCost
  const entityActiveOptions = selfActionTargets?.entityActive ?? []
  const entityActiveSourceIds =
    heroBasicAttackSourceId !== null
      ? [heroBasicAttackSourceId, ...entityActiveOptions.map((entry) => entry.sourceEntityId)]
      : entityActiveOptions.map((entry) => entry.sourceEntityId)
  const selectedEntityActiveOption = selectedEntityActiveSourceId
    ? entityActiveOptions.find((entry) => entry.sourceEntityId === selectedEntityActiveSourceId) ?? null
    : null
  const entityActiveTargetEntityIds =
    selectedEntityActiveSourceId === selfId
      ? basicAttackTargetEntityIds
      : selectedEntityActiveOption?.validTargetEntityIds ?? []
  const selectedEntityActiveRequiresTarget = entityActiveTargetEntityIds.length > 0
  const entityActiveHighlightedIds = pendingActionMode === 'entityActiveTarget'
    ? Array.from(new Set([...entityActiveSourceIds, ...entityActiveTargetEntityIds]))
    : []
  const selectedEntityConfirmId =
    pendingActionMode === 'entityActiveTarget' && !selectedEntityActiveRequiresTarget
      ? selectedEntityActiveSourceId
      : null
  const canBeginPressLuck = isActivePlayer && !pressLuckUsedThisTurn && !pressLuckAtFavorableLimit && selfMovePoints >= pressLuckMoveCost
  const highlightedPlacementPositions = focusedCard?.validPlacementPositions ?? []
  const focusedNeedsTarget = !!focusedCard && focusedCard.validTargetEntityIds.length > 0
  const focusedNeedsPlacement = !!focusedCard && focusedCard.validPlacementPositions.length > 0
  const canConfirmFocusedCardShortcut =
    !!focusedCard &&
    focusedCard.isPlayable &&
    (!focusedNeedsTarget || !!selectedTargetEntityId) &&
    (!focusedNeedsPlacement || !!selectedPlacementPosition)
  const highlightedTargetEntityIds =
    pendingActionMode === 'entityActiveTarget'
      ? entityActiveHighlightedIds
      : focusedCard?.validTargetEntityIds ?? []

  const handleFocusCard = (handCardId: string) => {
    if (!isActivePlayer) {
      return
    }

    setFocusedHandCardId(handCardId)
    setInspectTarget({ kind: 'handCard', cardId: handCardId })
    setPendingActionMode(null)
    setSelectedEntityActiveSourceId(null)
    setSelectedTargetEntityId(null)
    setSelectedPlacementPosition(null)
  }

  const handleInspectEntity = (entityId: string) => {
    setInspectTarget({ kind: 'entity', entityId })
  }

  const handleInspectCard = (cardId: string) => {
    setInspectTarget({ kind: 'handCard', cardId })
  }

  const handleCloseInspect = () => {
    setInspectTarget(null)
  }

  const handleSelectTarget = (targetEntityId: string) => {
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
      if (!entityActiveTargetEntityIds.includes(targetEntityId)) {
        return
      }

      if (selectedTargetEntityId === targetEntityId) {
        handleConfirmEntityActive()
        return
      }

      setSelectedTargetEntityId(targetEntityId)
      return
    }

    if (!focusedCard || !focusedCard.validTargetEntityIds.includes(targetEntityId)) {
      return
    }

    if (selectedTargetEntityId === targetEntityId) {
      handleConfirmFocusedCard()
      return
    }

    setSelectedTargetEntityId(targetEntityId)
  }

  const handleSelectBattlefieldEntity = (entityId: string) => {
    if (!isActivePlayer) {
      return
    }

    if (pendingActionMode === 'pressLuckConfirm') {
      return
    }

    if (pendingActionMode === 'entityActiveTarget' || focusedCard) {
      handleSelectTarget(entityId)
      return
    }

    if (!entityActiveSourceIds.includes(entityId)) {
      return
    }

    setFocusedHandCardId(null)
    setPendingActionMode('entityActiveTarget')
    setSelectedEntityActiveSourceId(entityId)
    setSelectedTargetEntityId(null)
    setSelectedPlacementPosition(null)
  }

  const handleSelectPlacementPosition = (position: { row: number; column: number }) => {
    if (!focusedCard) {
      return
    }

    const isValid = focusedCard.validPlacementPositions.some(
      (entry) => entry.row === position.row && entry.column === position.column,
    )

    if (!isValid) {
      return
    }

    if (
      selectedPlacementPosition?.row === position.row &&
      selectedPlacementPosition?.column === position.column
    ) {
      handleConfirmFocusedCard()
      return
    }

    setSelectedPlacementPosition(position)
  }

  const handleConfirmFocusedCard = () => {
    if (!focusedCard) {
      return
    }

    const requiresTarget = focusedCard.validTargetEntityIds.length > 0
    const requiresPlacement = focusedCard.validPlacementPositions.length > 0
    if (requiresTarget && !selectedTargetEntityId) {
      return
    }
    if (requiresPlacement && !selectedPlacementPosition) {
      return
    }

    onPlayCard({
      handCardId: focusedCard.handCardId,
      targetEntityId: selectedTargetEntityId ?? undefined,
      targetPosition: selectedPlacementPosition ?? undefined,
    })

    setFocusedHandCardId(null)
    setPendingActionMode(null)
    setSelectedEntityActiveSourceId(null)
    setSelectedTargetEntityId(null)
    setSelectedPlacementPosition(null)
  }

  const handleBeginHeroBasicAttackEntityActive = () => {
    if (!canUseHeroBasicAttackSource) {
      return
    }

    setFocusedHandCardId(null)
    setSelectedEntityActiveSourceId(null)
    setPendingActionMode('basicAttack')
    setSelectedTargetEntityId(null)
    setPendingActionMode('entityActiveTarget')
    setSelectedEntityActiveSourceId(selfId)
    setSelectedPlacementPosition(null)
  }

  const handleConfirmEntityActive = () => {
    if (pendingActionMode !== 'entityActiveTarget') {
      return
    }
    if (!selectedEntityActiveSourceId) {
      return
    }
    if (selectedEntityActiveRequiresTarget && !selectedTargetEntityId) {
      return
    }
    if (selectedEntityActiveRequiresTarget && selectedTargetEntityId && !entityActiveTargetEntityIds.includes(selectedTargetEntityId)) {
      return
    }

    if (selectedEntityActiveSourceId === selfId) {
      if (!selectedTargetEntityId || !basicAttackTargetEntityIds.includes(selectedTargetEntityId)) {
        return
      }
      onBasicAttack({ targetEntityId: selectedTargetEntityId })
    } else {
      onUseEntityActive({
        sourceEntityId: selectedEntityActiveSourceId,
        targetEntityId: selectedTargetEntityId ?? undefined,
      })
    }
    setPendingActionMode(null)
    setSelectedEntityActiveSourceId(null)
    setSelectedTargetEntityId(null)
    setSelectedPlacementPosition(null)
  }

  const handleBeginPressLuck = () => {
    if (!isActivePlayer || pressLuckUsedThisTurn || pressLuckAtFavorableLimit || selfMovePoints < pressLuckMoveCost) {
      return
    }

    setFocusedHandCardId(null)
    setSelectedEntityActiveSourceId(null)
    setPendingActionMode('pressLuckConfirm')
    setSelectedTargetEntityId(null)
    setSelectedPlacementPosition(null)
  }

  const handlePressLuckOverlayClick = () => {
    if (!isActivePlayer) {
      return
    }

    if (pendingActionMode === 'pressLuckConfirm') {
      handleConfirmPressLuck()
      return
    }

    handleBeginPressLuck()
  }

  const handleConfirmPressLuck = () => {
    if (!canConfirmPressLuck || pendingActionMode !== 'pressLuckConfirm') {
      return
    }

    onPressLuck()
    setPendingActionMode(null)
    setSelectedEntityActiveSourceId(null)
    setSelectedTargetEntityId(null)
    setSelectedPlacementPosition(null)
  }

  const handleClearFocus = () => {
    setFocusedHandCardId(null)
    setPendingActionMode(null)
    setSelectedEntityActiveSourceId(null)
    setSelectedTargetEntityId(null)
    setSelectedPlacementPosition(null)
    setInspectTarget(null)
  }

  const screenStyle = {
    '--self-side-color': `var(${SIDE_VISUALS[selfSideKey].sideColorVar})`,
    '--enemy-side-color': `var(${SIDE_VISUALS[enemySideKey].sideColorVar})`,
  } as CSSProperties

  const hasSelectionState =
    !!focusedHandCardId ||
    !!pendingActionMode ||
    !!selectedEntityActiveSourceId ||
    !!selectedTargetEntityId ||
    !!selectedPlacementPosition

  useEffect(() => {
    if (!hasSelectionState) {
      return
    }

    const handlePointerDown = (event: PointerEvent) => {
      const screen = screenRef.current
      if (!screen) {
        return
      }

      const target = event.target
      if (!(target instanceof Element)) {
        return
      }

      if (!screen.contains(target)) {
        return
      }

      if (
        target.closest(
          '.hand-bar, .hand-card-item, .hand-focus-panel, .hand-card-info, .battle-action-overlay, .deck-overlay, .touch-tooltip-toggle, .hint-wrap, .inspect-panel, button, input, textarea, [role="button"]',
        )
      ) {
        return
      }

      if (target.closest('.battle-slot.target-selectable, .battle-slot.placement-selectable')) {
        return
      }

      handleClearFocus()
    }

    window.addEventListener('pointerdown', handlePointerDown)
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown)
    }
  }, [
    hasSelectionState,
    focusedHandCardId,
    pendingActionMode,
    selectedEntityActiveSourceId,
    selectedTargetEntityId,
    selectedPlacementPosition,
  ])

  useEffect(() => {
    if (typeof window === 'undefined' || isCoarsePointer) {
      return
    }

    const isEditableTarget = (target: EventTarget | null): boolean => {
      if (!(target instanceof HTMLElement)) {
        return false
      }

      return target.isContentEditable || target.closest('input, textarea, select, [contenteditable="true"]') !== null
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.repeat || event.metaKey || event.ctrlKey || event.altKey) {
        return
      }

      if (isEditableTarget(event.target)) {
        return
      }

      const shortcut = resolveKeyboardShortcutAction(event)
      if (!shortcut) {
        return
      }

      if (!isActivePlayer) {
        return
      }

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
          handlePressLuckOverlayClick()
          event.preventDefault()
          return
        case 'cardSlot': {
          const card = selfHandCards[shortcut.slotIndex]
          if (!card || !card.isPlayable) {
            return
          }

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

    return () => {
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [
    canConfirmFocusedCardShortcut,
    focusedHandCardId,
    basicAttackTargetEntityIds,
    handleBeginHeroBasicAttackEntityActive,
    handleConfirmEntityActive,
    handleConfirmFocusedCard,
    handleFocusCard,
    handlePressLuckOverlayClick,
    isActivePlayer,
    isCoarsePointer,
    onEndTurn,
    selectedEntityActiveSourceId,
    selectedTargetEntityId,
    selfHandCards,
    selfId,
  ])

  return (
    <section ref={screenRef} className="screen" style={screenStyle} aria-label={`${SIDE_VISUALS[selfSideKey].name} game screen`}>
      <header className="screen-head">
        <div className="screen-head-brand">
          <img className="screen-head-logo" src="/logo.png" alt="CMD Hero Fights logo" />
          <div className="screen-head-copy">
            <h1>{title}</h1>
            <p>{SIDE_VISUALS[selfSideKey].name}</p>
          </div>
        </div>
        <div className="screen-head-actions">
          {showMusicControl ? (
            <button
              type="button"
              className="help-chip mute-music-control"
              onClick={onToggleMusic}
              aria-label={isMusicMuted ? 'Unmute music' : 'Mute music'}
            >
              <span aria-hidden="true">{isMusicMuted ? '🔇' : '🎵'}</span>
            </button>
          ) : null}
          {showSettingsControl ? (
            <button
              type="button"
              className={`help-chip settings-button${isSettingsOpen ? ' settings-button-active' : ''}`}
              onClick={onToggleSettings}
              aria-pressed={isSettingsOpen ? 'true' : 'false'}
              aria-label={isSettingsOpen ? 'Close settings' : 'Open settings'}
            >
              <span aria-hidden="true">⚙</span>
            </button>
          ) : null}
          <button
            type="button"
            className="help-chip deck-editor-chip hint-wrap"
            onClick={onOpenDeckEditor}
            data-hover-align="right"
          >
            <Icon icon="game-icons:card-pick" aria-hidden="true" />
            <span className="sr-only">Edit deck</span>
            <span className="hover-card" role="tooltip">Edit Deck</span>
          </button>
          <span className="help-chip keyboard-shortcuts-chip hint-wrap" tabIndex={0} data-hover-align="right">
            <Icon icon="game-icons:keyboard" aria-hidden="true" />
            <span className="sr-only">Keyboard shortcuts</span>
            <span className="hover-card" role="tooltip">
              <strong>Shortcuts</strong>
              <span className="shortcut-tooltip-grid">
                {KEYBOARD_SHORTCUT_HINT_ROWS.map((entry) => (
                  <span key={`${entry.key}:${entry.description}`} className="shortcut-tooltip-row">
                    <span className="shortcut-tooltip-key">{entry.key}</span>
                    <span className="shortcut-tooltip-value">{entry.description}</span>
                  </span>
                ))}
              </span>
              <span className="shortcut-tooltip-note">Board targeting stays click/tap.</span>
            </span>
          </span>
        </div>
      </header>

      <section className="passive-effects-strip" aria-label="Active passive effects">
        <div className="passive-effects-head">
          <strong>Passives</strong>
          <span>{selfActivePassiveEffects.length}</span>
        </div>
        {selfActivePassiveEffects.length > 0 ? (
          <>
            <div className="passive-effect-chip-row" role="list" aria-label="Active passive effects list">
              {visiblePassiveEffects.map((effect) => {
                const isSelected = selectedPassiveEffect?.effectId === effect.effectId
                return (
                  <button
                    key={effect.effectId}
                    type="button"
                    className={`passive-effect-chip hint-wrap passive-effect-chip-${effect.statusTone} passive-effect-chip-family-${effect.paletteKey} ${isSelected ? 'active' : ''}`.trim()}
                    onClick={() => {
                      setSelectedPassiveEffectId((current) => (current === effect.effectId ? null : effect.effectId))
                    }}
                    aria-pressed={isSelected}
                    aria-label={`${effect.label}. ${effect.statusLabel}. ${effect.shortText}`}
                  >
                    <Icon icon={effect.iconId} className="passive-effect-icon" aria-hidden="true" />
                    <span className="passive-effect-stack">{effect.stackCount > 1 ? `x${effect.stackCount}` : ''}</span>
                    <span className="sr-only">{effect.label}</span>
                    <span className="hover-card passive-effect-hover-card" role="tooltip">
                      <strong>{effect.label}</strong>
                      <span>{effect.shortText}</span>
                      {effect.detailLines.map((line) => (
                        <span key={`${effect.effectId}:${line}`}>{line}</span>
                      ))}
                    </span>
                  </button>
                )
              })}
              {hiddenPassiveCount > 0 ? (
                <button
                  type="button"
                  className="passive-effect-chip passive-effect-overflow-chip"
                  onClick={() => setShowAllPassiveEffects(true)}
                  aria-label={`Show ${hiddenPassiveCount} more passive effects`}
                >
                  +{hiddenPassiveCount}
                </button>
              ) : null}
              {hasPassiveOverflow && showAllPassiveEffects ? (
                <button
                  type="button"
                  className="passive-effect-chip passive-effect-overflow-chip"
                  onClick={() => setShowAllPassiveEffects(false)}
                  aria-label="Collapse passive effects"
                >
                  Collapse
                </button>
              ) : null}
            </div>
            {selectedPassiveEffect ? (
              <div className="passive-effect-detail" aria-live="polite">
                <div className="passive-effect-detail-head">
                  <span>{selectedPassiveEffect.label}</span>
                  <strong>{selectedPassiveEffect.statusLabel}</strong>
                </div>
                <p>{selectedPassiveEffect.shortText}</p>
              </div>
            ) : null}
          </>
        ) : (
          <p className="passive-effects-empty">No active passive effects.</p>
        )}
      </section>

        <section className="battle-overlay-layer">

          <BattlefieldGrid
            preview={preview}
            selfId={selfId}
            enemyId={enemyId}
            shouldFlipRows={shouldFlipRows}
            highlightedTargetEntityIds={isActivePlayer ? highlightedTargetEntityIds : []}
            selectedTargetEntityId={selectedTargetEntityId}
            selectedEntityConfirmId={selectedEntityConfirmId}
            onSelectTargetEntityId={isActivePlayer ? handleSelectTarget : undefined}
            onSelectEntityId={isActivePlayer ? handleSelectBattlefieldEntity : undefined}
            onInspectEntity={handleInspectEntity}
            highlightedPlacementPositions={
              isActivePlayer ? highlightedPlacementPositions : []
            }
            selectedPlacementPosition={selectedPlacementPosition}
            onSelectPlacementPosition={
              isActivePlayer
                ? handleSelectPlacementPosition
                : undefined
            }
          />

          <aside
            className={`deck-overlay hint-wrap ${openTouchTooltip === 'deck' ? 'force-tooltip-open' : ''}`.trim()}
            tabIndex={0}
            aria-label={`Deck status. ${selfDeckSize} cards in deck and ${selfHandSize} cards in hand.`}
          >
            <span className="deck-stack" aria-hidden="true">
              <Icon icon="game-icons:card-pick" className="deck-stack-icon" />
              <span className="deck-stack-count">{selfDeckSize}</span>
            </span>
            <span className="sr-only">Deck status popup</span>
            <span className="hover-card deck-hover-card" role="tooltip">
              <strong>Your Deck</strong>
              <span className="tooltip-row">
                <strong className="tooltip-inline-label">Deck:</strong>
                {selfDeckSize} cards remaining.
              </span>
              <span className="tooltip-row">
                <strong className="tooltip-inline-label">Hand:</strong>
                {selfHandSize} cards.
              </span>
            </span>
            <button
              type="button"
              className="touch-tooltip-toggle deck-tooltip-toggle"
              aria-label="Show deck details"
              aria-pressed={openTouchTooltip === 'deck'}
              onClick={() => toggleTouchTooltip('deck')}
            >
              <Icon icon="game-icons:info" aria-hidden="true" />
            </button>
          </aside>

          <aside className={`battle-action-overlay action-overlay-right hint-wrap ${openTouchTooltip === 'press-luck' ? 'force-tooltip-open' : ''}`.trim()} aria-label="Press luck action" tabIndex={0}>
            <button
              type="button"
              className="battle-action-stack luck"
              onClick={handlePressLuckOverlayClick}
              disabled={!canBeginPressLuck}
              aria-label={
                pendingActionMode === 'pressLuckConfirm'
                  ? `Press luck selected. Confirm by clicking again.`
                  : pressLuckUsedThisTurn
                    ? `Press luck already used this turn.`
                    : pressLuckAtFavorableLimit
                      ? `Luck is already fully on your side.`
                    : `Press luck. Costs ${pressLuckMoveCost} moves.`
              }
            >
              <Icon icon="game-icons:shamrock" className="battle-action-icon" aria-hidden="true" />
              <span className="battle-action-label">Luck</span>
              <span className="battle-action-cost">{pressLuckMoveCost}</span>
              <span className="sr-only">Press luck</span>
              {pendingActionMode === 'pressLuckConfirm' ? (
                <span className="battle-action-check" aria-hidden="true">
                  <Icon icon="game-icons:check-mark" />
                </span>
              ) : null}
            </button>
            <span className="hover-card battle-action-hover-card" role="tooltip">
              <strong>Luck</strong>
              <span>{LUCK_VISUALS.description}</span>
              <span>Shift luck in your favor by 1 point.</span>
            </span>
            <button
              type="button"
              className="touch-tooltip-toggle battle-tooltip-toggle"
              aria-label="Show press luck details"
              aria-pressed={openTouchTooltip === 'press-luck'}
              onClick={() => toggleTouchTooltip('press-luck')}
            >
              <Icon icon="game-icons:info" aria-hidden="true" />
            </button>
          </aside>
        </section>

        <InspectPanel
          target={inspectTarget}
          preview={preview}
          selfId={selfId}
          selfHandCards={selfHandCards}
          shouldShowDetailedTooltips={shouldShowDetailedTooltips}
          onClose={handleCloseInspect}
        />

        <HandBar
          cards={selfHandCards}
          isActivePlayer={isActivePlayer}
          movePoints={selfMovePoints}
          maxMovePoints={selfMaxMovePoints}
          moveCapacityTrace={selfMoveCapacityTrace}
          pressLuckMoveCost={pressLuckMoveCost}
          focusedHandCardId={focusedHandCardId}
          pendingActionMode={pendingActionMode}
          selectedTargetEntityId={selectedTargetEntityId}
          selectedPlacementPosition={selectedPlacementPosition}
          onEndTurn={onEndTurn}
          shouldShowDetailedTooltips={shouldShowDetailedTooltips}
          showDetailedTooltipsToggle={showDetailedTooltipsToggle}
          onToggleDetailedTooltips={onToggleDetailedTooltips}
          onFocusCard={handleFocusCard}
          onConfirmFocusedCard={handleConfirmFocusedCard}
          onClearFocus={handleClearFocus}
          onInspectCard={handleInspectCard}
        />
    </section>
  )
}
