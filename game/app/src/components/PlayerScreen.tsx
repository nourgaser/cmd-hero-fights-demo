import { useMemo, useState, type CSSProperties } from 'react'
import { Icon } from '@iconify/react/offline'
import type { AppBattlePreview } from '../game-client.ts'
import { LUCK_VISUALS, SIDE_VISUALS } from '../data/visual-metadata.ts'
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
  const enemySideKey = selfSideKey === 'a' ? 'b' : 'a'
  const shouldFlipRows = self?.battlefieldSide === 'north'
  const selfHandSize = self?.handSize ?? 0
  const selfDeckSize = self?.deckSize ?? 0
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
  const [pendingActionMode, setPendingActionMode] = useState<'basicAttack' | 'entityActiveTarget' | null>(null)
  const [selectedEntityActiveSourceId, setSelectedEntityActiveSourceId] = useState<string | null>(null)

  const focusedCard = useMemo(() => {
    if (!focusedHandCardId) {
      return null
    }
    return selfHandCards.find((card) => card.handCardId === focusedHandCardId) ?? null
  }, [focusedHandCardId, selfHandCards])

  const basicAttackTargetEntityIds = selfActionTargets?.basicAttack.validTargetEntityIds ?? []
  const basicAttackMoveCost = selfActionTargets?.basicAttack.moveCost ?? 0
  const pressLuckMoveCost = selfActionTargets?.pressLuck.moveCost ?? 3
  const entityActiveOptions = selfActionTargets?.entityActive ?? []
  const entityActiveSourceIds = entityActiveOptions.map((entry) => entry.sourceEntityId)
  const selectedEntityActiveOption = selectedEntityActiveSourceId
    ? entityActiveOptions.find((entry) => entry.sourceEntityId === selectedEntityActiveSourceId) ?? null
    : null
  const entityActiveTargetEntityIds = selectedEntityActiveOption?.validTargetEntityIds ?? []
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
      setSelectedTargetEntityId(targetEntityId)
      return
    }

    if (!focusedCard || !focusedCard.validTargetEntityIds.includes(targetEntityId)) {
      return
    }

    setSelectedTargetEntityId(targetEntityId)
  }

  const handleSelectBattlefieldEntity = (entityId: string) => {
    if (!isActivePlayer) {
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
    if (!isActivePlayer) {
      return
    }

    setFocusedHandCardId(null)
    setSelectedEntityActiveSourceId(null)
    setPendingActionMode('basicAttack')
    setSelectedTargetEntityId(null)
    setSelectedPlacementPosition(null)
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

  const handlePressLuck = () => {
    if (!isActivePlayer) {
      return
    }

    handleClearFocus()
    onPressLuck()
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
          <BattlefieldGrid
            preview={preview}
            selfId={selfId}
            enemyId={enemyId}
            shouldFlipRows={shouldFlipRows}
            highlightedTargetEntityIds={isActivePlayer ? highlightedTargetEntityIds : []}
            selectedTargetEntityId={selectedTargetEntityId}
            onSelectTargetEntityId={isActivePlayer ? handleSelectTarget : undefined}
            onSelectEntityId={isActivePlayer ? handleSelectBattlefieldEntity : undefined}
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
        </section>

        {pendingActionMode === 'basicAttack' ? (
          <section className="card action-intent-panel" aria-label="Basic attack targeting">
            <p>
              <strong>Basic Attack:</strong> Select one highlighted enemy target, then confirm.
            </p>
            <div className="hand-focus-actions">
              <button
                type="button"
                className="confirm-play"
                disabled={!selectedTargetEntityId}
                onClick={handleConfirmBasicAttack}
              >
                Confirm Attack
              </button>
              <button type="button" className="clear-focus" onClick={handleClearFocus}>
                Cancel
              </button>
            </div>
          </section>
        ) : null}

        {pendingActionMode === 'entityActiveTarget' ? (
          <section className="card action-intent-panel" aria-label="Entity active targeting">
            <p>
              <strong>Entity Active:</strong> Select a highlighted enemy target, then confirm.
            </p>
            <div className="hand-focus-actions">
              <button
                type="button"
                className="confirm-play"
                disabled={!selectedTargetEntityId}
                onClick={handleConfirmEntityActive}
              >
                Confirm Active
              </button>
              <button type="button" className="clear-focus" onClick={handleClearFocus}>
                Cancel
              </button>
            </div>
          </section>
        ) : null}

        <HandBar
          cards={selfHandCards}
          isActivePlayer={isActivePlayer}
          basicAttackMoveCost={basicAttackMoveCost}
          pressLuckMoveCost={pressLuckMoveCost}
          focusedHandCardId={focusedHandCardId}
          selectedTargetEntityId={selectedTargetEntityId}
          selectedPlacementPosition={selectedPlacementPosition}
          onBeginBasicAttack={handleBeginBasicAttack}
          onPressLuck={handlePressLuck}
          onEndTurn={onEndTurn}
          onFocusCard={handleFocusCard}
          onConfirmFocusedCard={handleConfirmFocusedCard}
          onClearFocus={handleClearFocus}
        />
    </section>
  )
}
