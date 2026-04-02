import { useEffect, useRef, useState } from 'react'
import { Icon } from '@iconify/react/offline'
import { CARD_ICON_META } from '../data/visual-metadata.ts'
import type { AppBattlePreview } from '../game-client.ts'

type HandBarCard = AppBattlePreview['heroHands'][number]['cards'][number]

type HandBarProps = {
  cards: HandBarCard[]
  isActivePlayer: boolean
  movePoints: number
  maxMovePoints: number
  pressLuckMoveCost: number
  focusedHandCardId: string | null
  pendingActionMode: 'basicAttack' | 'entityActiveTarget' | 'pressLuckConfirm' | null
  selectedTargetEntityId: string | null
  selectedPlacementPosition: { row: number; column: number } | null
  onEndTurn: () => void
  onFocusCard: (handCardId: string) => void
  onConfirmFocusedCard: () => void
  onClearFocus: () => void
}

function getTargetingLabel(targeting: HandBarCard['targeting']) {
  if (targeting === 'none') {
    return 'No target'
  }
  if (targeting === 'selectedEnemy') {
    return 'Enemy target'
  }
  if (targeting === 'selectedAny') {
    return 'Any target'
  }
  return 'Ally target'
}

export function HandBar(props: HandBarProps) {
  const {
    cards,
    isActivePlayer,
    movePoints,
    maxMovePoints,
    pressLuckMoveCost,
    focusedHandCardId,
    pendingActionMode,
    selectedTargetEntityId,
    selectedPlacementPosition,
    onEndTurn,
    onFocusCard,
    onConfirmFocusedCard,
    onClearFocus,
  } = props
  const scrollerRef = useRef<HTMLUListElement | null>(null)
  const [showScrollHint, setShowScrollHint] = useState(false)

  useEffect(() => {
    const scroller = scrollerRef.current
    if (!scroller) {
      return
    }

    const updateScrollHint = () => {
      const hasOverflow = scroller.scrollWidth > scroller.clientWidth + 2
      const canScrollMoreRight = scroller.scrollLeft + scroller.clientWidth < scroller.scrollWidth - 2
      setShowScrollHint(hasOverflow && canScrollMoreRight)
    }

    updateScrollHint()
    scroller.addEventListener('scroll', updateScrollHint)
    window.addEventListener('resize', updateScrollHint)

    return () => {
      scroller.removeEventListener('scroll', updateScrollHint)
      window.removeEventListener('resize', updateScrollHint)
    }
  }, [cards])

  const focusedCard = focusedHandCardId
    ? cards.find((card) => card.handCardId === focusedHandCardId) ?? null
    : null
  const focusedNeedsTarget = !!focusedCard && focusedCard.validTargetEntityIds.length > 0
  const focusedNeedsPlacement = !!focusedCard && focusedCard.validPlacementPositions.length > 0
  const canConfirm =
    !!focusedCard &&
    focusedCard.isPlayable &&
    (!focusedNeedsTarget || !!selectedTargetEntityId) &&
    (!focusedNeedsPlacement || !!selectedPlacementPosition)

  return (
    <section className="card hand-bar" aria-label="Hand cards">
      <div className="hand-bar-header">
        <span className="move-meter hint-wrap" tabIndex={0} aria-label={`Moves ${movePoints} out of ${maxMovePoints}`}>
          <Icon icon="game-icons:boot-prints" className="move-meter-icon" aria-hidden="true" />
          <span className="move-meter-value">{movePoints}</span>
          <span className="hover-card move-hover-card" role="tooltip">
            <strong>Moves</strong>
            <span>{movePoints} / {maxMovePoints}</span>
          </span>
        </span>
        {isActivePlayer ? (
          <button type="button" className="hand-pill hand-pill-button" onClick={onEndTurn}>
            End turn
          </button>
        ) : (
          <span className="hand-pill">Waiting turn</span>
        )}
      </div>

      <div className="hand-scroll-wrap">
        <ul className="hand-cards" aria-label="Cards in hand and actions" ref={scrollerRef}>
        {cards.map((card) => {
          const meta = CARD_ICON_META[card.cardDefinitionId] ?? {
            id: 'game-icons:card-pick',
            label: card.cardName,
            description: 'Card',
          }
          const isFocused = card.handCardId === focusedHandCardId
          const canConfirmCard = isFocused && canConfirm
          const requiresTarget = card.validTargetEntityIds.length > 0
          const targetingLabel = getTargetingLabel(card.targeting)
          const summaryText = card.summaryText?.trim() ? card.summaryText : 'No text available.'

          return (
            <li key={card.handCardId}>
              <button
                type="button"
                className={`hand-card hint-wrap ${isFocused ? 'focused' : ''} ${!card.isPlayable ? 'unplayable' : ''}`.trim()}
                onClick={() => {
                  if (canConfirmCard) {
                    onConfirmFocusedCard()
                    return
                  }

                  onFocusCard(card.handCardId)
                }}
                disabled={!isActivePlayer}
                aria-pressed={isFocused}
                aria-label={`${card.cardName}. Cost ${card.moveCost}. ${requiresTarget ? 'Requires target.' : 'No target required.'}`}
              >
                <Icon icon={meta.id} className="hand-card-icon" aria-hidden="true" />
                <span className="hand-card-name">{card.cardName}</span>
                <span className="hand-card-summary">{summaryText}</span>
                <span className="hand-card-cost">{card.moveCost}</span>
                {canConfirmCard ? (
                  <span className="hand-card-check" aria-hidden="true">
                    <Icon icon="game-icons:check-mark" />
                  </span>
                ) : null}
                <span className="hover-card hand-card-hover" role="tooltip">
                  <strong>{card.cardName}</strong>
                  <span>{summaryText}</span>
                  <span>Type: {card.cardType} | Rarity: {card.rarity}</span>
                  <span>Cost: {card.moveCost} | Targeting: {targetingLabel}</span>
                  <span>{card.isPlayable ? 'Playable now' : 'Not playable now'}</span>
                </span>
              </button>
            </li>
          )
        })}
        </ul>

        {showScrollHint ? <span className="hand-scroll-indicator">{'Scroll ->'}</span> : null}
      </div>

      {pendingActionMode === 'basicAttack' ? (
        <div className="hand-focus-panel" aria-live="polite">
          <p className="hand-focus-summary">
            <strong>Basic Attack</strong>
          </p>
          <p className="hand-focus-instruction">Pick one highlighted enemy target. Click the selected target again to confirm.</p>
          <div className="hand-focus-actions">
            <button type="button" className="clear-focus" onClick={onClearFocus}>
              Cancel
            </button>
          </div>
        </div>
      ) : pendingActionMode === 'entityActiveTarget' ? (
        <div className="hand-focus-panel" aria-live="polite">
          <p className="hand-focus-summary">
            <strong>Entity Active</strong>
          </p>
          <p className="hand-focus-instruction">Pick one highlighted enemy target. Click the selected target again to confirm.</p>
          <div className="hand-focus-actions">
            <button type="button" className="clear-focus" onClick={onClearFocus}>
              Cancel
            </button>
          </div>
        </div>
      ) : pendingActionMode === 'pressLuckConfirm' ? (
        <div className="hand-focus-panel" aria-live="polite">
          <p className="hand-focus-summary">
            <strong>Press Luck</strong>
          </p>
          <p className="hand-focus-instruction">Spend {pressLuckMoveCost} moves to influence luck. Click the selected luck badge again to confirm.</p>
          <div className="hand-focus-actions">
            <button type="button" className="clear-focus" onClick={onClearFocus}>
              Cancel
            </button>
          </div>
        </div>
      ) : focusedCard ? (
        <div className="hand-focus-panel" aria-live="polite">
          <div className="hand-focus-head">
            <strong>{focusedCard.cardName}</strong>
            <span className="hand-focus-badges">
              <span>{focusedCard.cardType}</span>
              <span>{focusedCard.rarity}</span>
              <span>Cost {focusedCard.moveCost}</span>
            </span>
          </div>
          <p className="hand-focus-summary">{focusedCard.summaryText?.trim() ? focusedCard.summaryText : 'No text available.'}</p>
          <p className="hand-focus-meta">Targeting: {getTargetingLabel(focusedCard.targeting)}</p>
          {!focusedCard.isPlayable ? <p className="hand-focus-instruction">Not playable right now.</p> : null}
          <p className="hand-focus-instruction">
            {focusedNeedsTarget
              ? `Needs a target (${focusedCard.validTargetEntityIds.length} valid).`
              : focusedNeedsPlacement
                ? `Needs placement (${focusedCard.validPlacementPositions.length} valid cells).`
                : 'No target required.'}
          </p>
          {focusedNeedsTarget && !selectedTargetEntityId ? (
            <p className="hand-focus-instruction">Pick one highlighted battlefield target, then confirm.</p>
          ) : null}
          {focusedNeedsPlacement && !selectedPlacementPosition ? (
            <p className="hand-focus-instruction">Pick one highlighted empty cell for placement, then confirm.</p>
          ) : null}
          {canConfirm ? (
            <p className="hand-focus-instruction">Click the highlighted card again to confirm.</p>
          ) : null}
          <div className="hand-focus-actions">
            <button type="button" className="clear-focus" onClick={onClearFocus}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <p className="hand-focus-hint">Select a card to inspect and confirm.</p>
      )}
    </section>
  )
}
