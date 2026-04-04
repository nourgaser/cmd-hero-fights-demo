import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { Icon } from '@iconify/react/offline'
import type { AppBattlePreview } from '../game-client.ts'
import { LUCK_VISUALS, SIDE_VISUALS } from '../data/visual-metadata.ts'
import {
  renderTextWithHighlightedNumbers,
  simplifyTooltipSummaryText,
  splitDetailTextIntoLines,
} from '../utils/render-numeric-text.tsx'
import { LuckBar } from './LuckBar.tsx'
import { BattlefieldGrid } from './BattlefieldGrid.tsx'
import { HandBar } from './HandBar.tsx'

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
  onUseEntityActive: (input: { sourceEntityId: string; targetEntityId: string }) => void
  onPressLuck: () => void
  onEndTurn: () => void
  onPlayCard: (input: {
    handCardId: string
    targetEntityId?: string
    targetPosition?: { row: number; column: number }
  }) => void
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
  } = props
  const screenRef = useRef<HTMLElement | null>(null)

  const self = preview.heroHandCounts.find((hero) => hero.heroEntityId === selfId)
  const selfHeroDetails = preview.heroDetailsByEntityId[selfId] ?? null
  const enemySideKey = selfSideKey === 'a' ? 'b' : 'a'
  const shouldFlipRows = self?.battlefieldSide === 'north'
  const selfHandSize = self?.handSize ?? 0
  const selfDeckSize = self?.deckSize ?? 0
  const selfMovePoints = self?.movePoints ?? 0
  const selfMaxMovePoints = self?.maxMovePoints ?? 0
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
  const [pendingActionMode, setPendingActionMode] = useState<'basicAttack' | 'entityActiveTarget' | 'pressLuckConfirm' | null>(null)
  const [selectedEntityActiveSourceId, setSelectedEntityActiveSourceId] = useState<string | null>(null)
  const [isCoarsePointer, setIsCoarsePointer] = useState(false)
  const [openTouchTooltip, setOpenTouchTooltip] = useState<
    'luck-help' | 'basic-attack' | 'deck' | 'press-luck' | null
  >(null)

  const toggleTouchTooltip = (tooltipId: 'luck-help' | 'basic-attack' | 'deck' | 'press-luck') => {
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

  const basicAttackTargetEntityIds = selfActionTargets?.basicAttack.validTargetEntityIds ?? []
  const basicAttackMoveCost = selfActionTargets?.basicAttack.moveCost ?? 0
  const pressLuckMoveCost = selfActionTargets?.pressLuck.moveCost ?? 3
  const pressLuckUsedThisTurn = preview.turn.pressLuckUsedThisTurn
  const canConfirmPressLuck = isActivePlayer && !pressLuckUsedThisTurn && selfMovePoints >= pressLuckMoveCost
  const entityActiveOptions = selfActionTargets?.entityActive ?? []
  const entityActiveSourceIds = entityActiveOptions.map((entry) => entry.sourceEntityId)
  const selectedEntityActiveOption = selectedEntityActiveSourceId
    ? entityActiveOptions.find((entry) => entry.sourceEntityId === selectedEntityActiveSourceId) ?? null
    : null
  const entityActiveTargetEntityIds = selectedEntityActiveOption?.validTargetEntityIds ?? []
  const canBeginBasicAttack = isActivePlayer && selfMovePoints >= basicAttackMoveCost
  const canBeginPressLuck = isActivePlayer && !pressLuckUsedThisTurn && selfMovePoints >= pressLuckMoveCost
  const highlightedPlacementPositions = focusedCard?.validPlacementPositions ?? []
  const highlightedTargetEntityIds =
    pendingActionMode === 'basicAttack'
      ? basicAttackTargetEntityIds
      : pendingActionMode === 'entityActiveTarget'
          ? entityActiveTargetEntityIds
          : focusedCard?.validTargetEntityIds ?? []

  const handleFocusCard = (handCardId: string) => {
    if (!isActivePlayer) {
      return
    }

    setFocusedHandCardId(handCardId)
    setPendingActionMode(null)
    setSelectedEntityActiveSourceId(null)
    setSelectedTargetEntityId(null)
    setSelectedPlacementPosition(null)
  }

  const handleSelectTarget = (targetEntityId: string) => {
    if (pendingActionMode === 'basicAttack') {
      if (!basicAttackTargetEntityIds.includes(targetEntityId)) {
        return
      }

      if (selectedTargetEntityId === targetEntityId) {
        handleConfirmBasicAttack()
        return
      }

      setSelectedTargetEntityId(targetEntityId)
      return
    }

    if (pendingActionMode === 'entityActiveTarget') {
      if (entityActiveSourceIds.includes(targetEntityId)) {
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

    if (pendingActionMode === 'basicAttack' || pendingActionMode === 'entityActiveTarget' || focusedCard) {
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

  const handleBeginBasicAttack = () => {
    if (!isActivePlayer || selfMovePoints < basicAttackMoveCost) {
      return
    }

    setFocusedHandCardId(null)
    setSelectedEntityActiveSourceId(null)
    setPendingActionMode('basicAttack')
    setSelectedTargetEntityId(null)
    setSelectedPlacementPosition(null)
  }

  const handleBasicAttackOverlayClick = () => {
    if (!isActivePlayer) {
      return
    }

    if (pendingActionMode === 'basicAttack') {
      handleConfirmBasicAttack()
      return
    }

    handleBeginBasicAttack()
  }

  const handleConfirmEntityActive = () => {
    if (pendingActionMode !== 'entityActiveTarget') {
      return
    }
    if (!selectedEntityActiveSourceId || !selectedTargetEntityId) {
      return
    }
    if (!entityActiveTargetEntityIds.includes(selectedTargetEntityId)) {
      return
    }

    onUseEntityActive({
      sourceEntityId: selectedEntityActiveSourceId,
      targetEntityId: selectedTargetEntityId,
    })
    setPendingActionMode(null)
    setSelectedEntityActiveSourceId(null)
    setSelectedTargetEntityId(null)
    setSelectedPlacementPosition(null)
  }

  const handleConfirmBasicAttack = () => {
    if (!selectedTargetEntityId || pendingActionMode !== 'basicAttack') {
      return
    }
    if (!basicAttackTargetEntityIds.includes(selectedTargetEntityId)) {
      return
    }

    onBasicAttack({ targetEntityId: selectedTargetEntityId })
    setPendingActionMode(null)
    setSelectedTargetEntityId(null)
    setSelectedPlacementPosition(null)
  }

  const handleBeginPressLuck = () => {
    if (!isActivePlayer || pressLuckUsedThisTurn || selfMovePoints < pressLuckMoveCost) {
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
  }

  const anchorIsSelf = preview.luck.anchorHeroEntityId === selfId
  const clamped = Math.max(-LUCK_VISUALS.capacity, Math.min(LUCK_VISUALS.capacity, preview.luck.balance))
  const favorsAnchor = clamped > 0
  const favorsSelf = clamped === 0 ? false : anchorIsSelf ? favorsAnchor : !favorsAnchor
  const selfLuck = clamped === 0 ? 0 : favorsSelf ? Math.abs(clamped) : 0
  const enemyLuck = clamped === 0 ? 0 : favorsSelf ? 0 : Math.abs(clamped)

  const screenStyle = {
    '--self-side-color': `var(${SIDE_VISUALS[selfSideKey].sideColorVar})`,
    '--enemy-side-color': `var(${SIDE_VISUALS[enemySideKey].sideColorVar})`,
  } as CSSProperties

  const basicAttackDetailLines = selfHeroDetails?.basicAttack.summaryDetailText
    ? splitDetailTextIntoLines(selfHeroDetails.basicAttack.summaryDetailText)
    : []

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
          '.hand-bar, .hand-card-item, .hand-focus-panel, .hand-card-info, .battle-action-overlay, .deck-overlay, .touch-tooltip-toggle, .hint-wrap, button, input, textarea, [role="button"]',
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
      </header>

        <section className="luck-strip" aria-label="Luck track">
          <h2 className="luck-title">
            {LUCK_VISUALS.label}
            <span className={`help-chip hint-wrap ${openTouchTooltip === 'luck-help' ? 'force-tooltip-open' : ''}`.trim()} tabIndex={0}>
              <Icon icon="game-icons:info" aria-hidden="true" />
              <span className="sr-only">Luck explanation</span>
              <span className="hover-card" role="tooltip">
                <strong>{LUCK_VISUALS.label}</strong>
                <span>{LUCK_VISUALS.description}</span>
              </span>
            </span>
            <button
              type="button"
              className="touch-tooltip-toggle inline-toggle"
              aria-label="Show luck details"
              aria-pressed={openTouchTooltip === 'luck-help'}
              onClick={() => toggleTouchTooltip('luck-help')}
            >
              <Icon icon="game-icons:info" aria-hidden="true" />
            </button>
          </h2>
          <LuckBar
            selfLuck={selfLuck}
            enemyLuck={enemyLuck}
            capacity={LUCK_VISUALS.capacity}
            iconId={LUCK_VISUALS.iconId}
          />
        </section>

        <section className="battle-overlay-layer">
          <aside className="battle-action-overlay action-overlay-left" aria-label="Basic attack action">
            <span className={`battle-action-shell hint-wrap ${openTouchTooltip === 'basic-attack' ? 'force-tooltip-open' : ''}`.trim()} tabIndex={0}>
              <button
                type="button"
                className="battle-action-stack basic"
                onClick={handleBasicAttackOverlayClick}
                disabled={!canBeginBasicAttack}
                aria-label={
                  pendingActionMode === 'basicAttack'
                    ? `Basic attack selected. Confirm by clicking again.`
                    : `Basic attack. Costs ${basicAttackMoveCost} moves.`
                }
              >
                <Icon icon="game-icons:crossed-swords" className="battle-action-icon" aria-hidden="true" />
                <span className="battle-action-label">Attack</span>
                <span className="battle-action-cost">{basicAttackMoveCost}</span>
                <span className="sr-only">Basic attack</span>
                {pendingActionMode === 'basicAttack' ? (
                  <span className="battle-action-check" aria-hidden="true">
                    <Icon icon="game-icons:check-mark" />
                  </span>
                ) : null}
              </button>
              <span className="hover-card battle-action-hover-card" role="tooltip">
                <strong>Basic Attack</strong>
                <span className="tooltip-main-line">
                  {selfHeroDetails?.basicAttack.summaryText
                    ? simplifyTooltipSummaryText(selfHeroDetails.basicAttack.summaryText)
                    : `Spend ${basicAttackMoveCost} moves to attack one highlighted enemy target.`}
                </span>
                {shouldShowDetailedTooltips && selfHeroDetails?.basicAttack.summaryDetailText ? (
                  <span className="battle-tooltip-detail">
                    {basicAttackDetailLines.map((line, index) => (
                      <span key={`${index}-${line}`} className="battle-tooltip-detail-line">
                        {renderTextWithHighlightedNumbers(line)}
                      </span>
                    ))}
                  </span>
                ) : null}
                {!shouldShowDetailedTooltips && selfHeroDetails?.basicAttack.summaryDetailText ? (
                  <span className="tooltip-shift-hint">Hold Shift or enable Details.</span>
                ) : null}
                <span className="tooltip-row">
                  <strong className="tooltip-inline-label">Passive:</strong>
                  {selfHeroDetails?.passiveText ?? 'Passive unavailable.'}
                </span>
                <span className="tooltip-divider" aria-hidden="true" />
                <span className="tooltip-row tooltip-row-muted">
                  <strong className="tooltip-inline-label">Use:</strong>
                  Click once to arm it, then click the badge again to confirm.
                </span>
              </span>
            </span>
            <button
              type="button"
              className="touch-tooltip-toggle battle-tooltip-toggle"
              aria-label="Show basic attack details"
              aria-pressed={openTouchTooltip === 'basic-attack'}
              onClick={() => toggleTouchTooltip('basic-attack')}
            >
              <Icon icon="game-icons:info" aria-hidden="true" />
            </button>
          </aside>

          <BattlefieldGrid
            preview={preview}
            selfId={selfId}
            enemyId={enemyId}
            shouldFlipRows={shouldFlipRows}
            highlightedTargetEntityIds={isActivePlayer ? highlightedTargetEntityIds : []}
            selectedTargetEntityId={selectedTargetEntityId}
            onSelectTargetEntityId={isActivePlayer ? handleSelectTarget : undefined}
            onSelectEntityId={isActivePlayer ? handleSelectBattlefieldEntity : undefined}
            shouldShowDetailedTooltips={shouldShowDetailedTooltips}
            highlightedPlacementPositions={
              isActivePlayer && pendingActionMode !== 'basicAttack' ? highlightedPlacementPositions : []
            }
            selectedPlacementPosition={selectedPlacementPosition}
            onSelectPlacementPosition={
              isActivePlayer && pendingActionMode !== 'basicAttack'
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

        <HandBar
          cards={selfHandCards}
          isActivePlayer={isActivePlayer}
          movePoints={selfMovePoints}
          maxMovePoints={selfMaxMovePoints}
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
        />
    </section>
  )
}
