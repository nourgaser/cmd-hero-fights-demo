import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { Icon } from '@iconify/react/offline'
import type { AppBattlePreview } from '../game-client.ts'
import { LUCK_VISUALS, SIDE_VISUALS } from '../data/visual-metadata.ts'
import { renderTextWithHighlightedNumbers } from '../utils/render-numeric-text.tsx'
import { LuckBar } from './LuckBar.tsx'
import { BattlefieldGrid } from './BattlefieldGrid.tsx'
import { HandBar } from './HandBar.tsx'

type PlayerScreenProps = {
  title: string
  selfId: string
  enemyId: string
  selfSideKey: 'a' | 'b'
  preview: AppBattlePreview
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
    onBasicAttack,
    onUseEntityActive,
    onPressLuck,
    onEndTurn,
    onPlayCard,
  } = props

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
  const [isShiftHeld, setIsShiftHeld] = useState(false)

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Shift') {
        setIsShiftHeld(true)
      }
    }

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.key === 'Shift') {
        setIsShiftHeld(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [])

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

  return (
    <section className="screen" style={screenStyle} aria-label={`${SIDE_VISUALS[selfSideKey].name} game screen`}>
      <header className="screen-head">
        <h1>{title}</h1>
        <p>{SIDE_VISUALS[selfSideKey].name}</p>
      </header>

        <section className="luck-strip" aria-label="Luck track">
          <h2 className="luck-title">
            {LUCK_VISUALS.label}
            <span className="help-chip hint-wrap" tabIndex={0}>
              <Icon icon="game-icons:info" aria-hidden="true" />
              <span className="sr-only">Luck explanation</span>
              <span className="hover-card" role="tooltip">
                <strong>{LUCK_VISUALS.label}</strong>
                <span>{LUCK_VISUALS.description}</span>
              </span>
            </span>
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
            <span className="battle-action-shell hint-wrap" tabIndex={0}>
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
                <span>{selfHeroDetails?.basicAttack.summaryText ?? `Spend ${basicAttackMoveCost} moves to attack one highlighted enemy target.`}</span>
                {isShiftHeld && selfHeroDetails?.basicAttack.summaryDetailText ? (
                  <span className="battle-tooltip-detail">{renderTextWithHighlightedNumbers(selfHeroDetails.basicAttack.summaryDetailText)}</span>
                ) : (
                  <span>{selfHeroDetails?.basicAttack.currentRangeText ?? `Spend ${basicAttackMoveCost} moves to attack one highlighted enemy target.`}</span>
                )}
                <span>{selfHeroDetails?.passiveText ?? 'Passive unavailable.'}</span>
                <span>Click once to arm it, then click the badge again to confirm.</span>
              </span>
            </span>
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
            isShiftHeld={isShiftHeld}
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
            className="deck-overlay hint-wrap"
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
              <span>There are {selfDeckSize} cards in your deck.</span>
              <span>You have {selfHandSize} cards in hand.</span>
            </span>
          </aside>

          <aside className="battle-action-overlay action-overlay-right" aria-label="Press luck action">
            <button
              type="button"
              className="battle-action-stack luck hint-wrap"
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
              <span className="hover-card battle-action-hover-card" role="tooltip">
                <strong>Press Luck</strong>
                <span>Spend {pressLuckMoveCost} moves to shift the luck track.</span>
                {pressLuckUsedThisTurn ? <span>You can only press luck once per turn.</span> : null}
                <span>Click once to arm it, then click the badge again to confirm.</span>
              </span>
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
          onFocusCard={handleFocusCard}
          onConfirmFocusedCard={handleConfirmFocusedCard}
          onClearFocus={handleClearFocus}
        />
    </section>
  )
}
