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
  basicAttackMoveCost: number
  pressLuckMoveCost: number
  focusedHandCardId: string | null
  selectedTargetEntityId: string | null
  selectedPlacementPosition: { row: number; column: number } | null
  onBeginBasicAttack: () => void
  onPressLuck: () => void
  onEndTurn: () => void
  onFocusCard: (handCardId: string) => void
  onConfirmFocusedCard: () => void
  onClearFocus: () => void
}

export function HandBar(props: HandBarProps) {
  const {
    cards,
    isActivePlayer,
    movePoints,
    maxMovePoints,
    basicAttackMoveCost,
    pressLuckMoveCost,
    focusedHandCardId,
    selectedTargetEntityId,
    selectedPlacementPosition,
    onBeginBasicAttack,
    onPressLuck,
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
          <li>
            <button
              type="button"
              className="hand-card action-slot basic"
              onClick={onBeginBasicAttack}
              disabled={!isActivePlayer}
              aria-label="Basic attack"
            >
              <Icon icon="game-icons:crossed-swords" className="hand-card-icon" aria-hidden="true" />
              <span className="hand-card-name">Basic Attack</span>
              <span className="hand-card-cost">{basicAttackMoveCost}</span>
            </button>
          </li>
          <li>
            <button
              type="button"
              className="hand-card action-slot luck"
              onClick={onPressLuck}
              disabled={!isActivePlayer}
              aria-label="Press luck"
            >
              <Icon icon="game-icons:shamrock" className="hand-card-icon" aria-hidden="true" />
              <span className="hand-card-name">Press Luck</span>
              <span className="hand-card-cost">{pressLuckMoveCost}</span>
            </button>
          </li>
        {cards.map((card) => {
          const meta = CARD_ICON_META[card.cardDefinitionId] ?? {
            id: 'game-icons:card-pick',
            label: card.cardName,
            description: 'Card',
          }
          const isFocused = card.handCardId === focusedHandCardId
          const requiresTarget = card.validTargetEntityIds.length > 0
          const isCardEnabled = isActivePlayer && card.isPlayable

          return (
            <li key={card.handCardId}>
              <button
                type="button"
                className={`hand-card ${isFocused ? 'focused' : ''} ${!card.isPlayable ? 'unplayable' : ''}`.trim()}
                onClick={() => onFocusCard(card.handCardId)}
                disabled={!isCardEnabled}
                aria-pressed={isFocused}
                aria-label={`${card.cardName}. Cost ${card.moveCost}. ${requiresTarget ? 'Requires target.' : 'No target required.'}`}
              >
                <Icon icon={meta.id} className="hand-card-icon" aria-hidden="true" />
                <span className="hand-card-name">{card.cardName}</span>
                <span className="hand-card-cost">{card.moveCost}</span>
              </button>
            </li>
          )
        })}
        </ul>

        {showScrollHint ? <span className="hand-scroll-indicator">{'Scroll ->'}</span> : null}
      </div>

      {focusedCard ? (
        <div className="hand-focus-panel" aria-live="polite">
          <p>
            <strong>{focusedCard.cardName}</strong>
            {focusedNeedsTarget
              ? ` requires a target (${focusedCard.validTargetEntityIds.length} valid).`
              : focusedNeedsPlacement
                ? ` requires placement (${focusedCard.validPlacementPositions.length} valid cells).`
                : ' does not require a target.'}
          </p>
          {focusedNeedsTarget && !selectedTargetEntityId ? (
            <p>Choose one highlighted battlefield target, then confirm.</p>
          ) : null}
          {focusedNeedsPlacement && !selectedPlacementPosition ? (
            <p>Choose one highlighted empty cell for placement, then confirm.</p>
          ) : null}
          <div className="hand-focus-actions">
            <button type="button" className="confirm-play" disabled={!canConfirm} onClick={onConfirmFocusedCard}>
              Confirm Play
            </button>
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
