import { useEffect, useRef, useState } from 'react'
import { Icon } from '@iconify/react/offline'
import { CARD_ICON_META } from '../data/visual-metadata.ts'
import type { AppBattlePreview } from '../game-client.ts'
import {
  renderTextWithHighlightedNumbers,
  simplifyTooltipSummaryText,
  splitDetailTextIntoLines,
} from '../utils/render-numeric-text.tsx'

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

function getCardTypeVisual(cardType: HandBarCard['cardType']) {
  switch (cardType) {
    case 'ability':
      return { icon: 'game-icons:crossed-swords', label: 'Ability' }
    case 'weapon':
      return { icon: 'game-icons:broadsword', label: 'Weapon' }
    case 'totem':
      return { icon: 'game-icons:obelisk', label: 'Totem' }
    case 'companion':
      return { icon: 'game-icons:wolf-head', label: 'Companion' }
    default:
      return { icon: 'game-icons:card-pick', label: 'Card' }
  }
}

function getRarityLabel(rarity: HandBarCard['rarity']) {
  switch (rarity) {
    case 'common':
      return 'Common'
    case 'rare':
      return 'Rare'
    case 'ultimate':
      return 'Ultimate'
    case 'general':
      return 'General'
    default:
      return rarity
  }
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
  const handWrapRef = useRef<HTMLDivElement | null>(null)
  const [showScrollHint, setShowScrollHint] = useState(false)
  const [isShiftHeld, setIsShiftHeld] = useState(false)
  const [hoveredCard, setHoveredCard] = useState<{
    card: HandBarCard
    left: number
    top: number
  } | null>(null)

  const setHoveredCardFromAnchor = (card: HandBarCard, anchor: HTMLElement) => {
    const wrap = handWrapRef.current
    if (!wrap) {
      return
    }

    const anchorRect = anchor.getBoundingClientRect()
    const wrapRect = wrap.getBoundingClientRect()
    setHoveredCard({
      card,
      left: anchorRect.left - wrapRect.left + anchorRect.width / 2,
      top: anchorRect.top - wrapRect.top,
    })
  }

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

      <div className="hand-scroll-wrap" ref={handWrapRef}>
        <ul className="hand-cards" aria-label="Cards in hand and actions" ref={scrollerRef}>
          {cards.map((card) => {
          const meta = CARD_ICON_META[card.cardDefinitionId] ?? {
            id: 'game-icons:card-pick',
            label: card.cardName,
            description: 'Card',
          }
          const typeVisual = getCardTypeVisual(card.cardType)
          const rarityLabel = getRarityLabel(card.rarity)
          const isFocused = card.handCardId === focusedHandCardId
          const canConfirmCard = isFocused && canConfirm
          const requiresTarget = card.validTargetEntityIds.length > 0

          return (
            <li
              key={card.handCardId}
              className={`hand-card-item ${card.isPlayable && isActivePlayer ? 'playable' : 'blocked'}`.trim()}
              onMouseEnter={(event) => {
                setHoveredCardFromAnchor(card, event.currentTarget)
              }}
              onMouseLeave={() => {
                setHoveredCard(null)
              }}
            >
              <button
                type="button"
                className={`hand-card rarity-${card.rarity} ${isFocused ? 'focused' : ''} ${!card.isPlayable ? 'unplayable' : ''}`.trim()}
                onClick={() => {
                  if (canConfirmCard) {
                    onConfirmFocusedCard()
                    return
                  }

                  if (!card.isPlayable || !isActivePlayer) {
                    return
                  }

                  onFocusCard(card.handCardId)
                }}
                onFocus={(event) => {
                  setHoveredCardFromAnchor(card, event.currentTarget)
                }}
                onBlur={() => {
                  setHoveredCard(null)
                }}
                disabled={!isActivePlayer}
                aria-pressed={isFocused}
                aria-label={`${card.cardName}. Cost ${card.moveCost}. ${requiresTarget ? 'Requires target.' : 'No target required.'}`}
              >
                <span className="hand-card-type-badge" aria-hidden="true" title={typeVisual.label}>
                  <Icon icon={typeVisual.icon} />
                </span>
                <span className="hand-card-rarity-mark" aria-hidden="true" title={rarityLabel} />
                <Icon icon={meta.id} className="hand-card-icon" aria-hidden="true" />
                <span className="hand-card-name">{card.cardName}</span>
                <span className="hand-card-cost" title={`Cost ${card.moveCost}`}>{card.moveCost}</span>
                {canConfirmCard ? (
                  <span className="hand-card-check" aria-hidden="true">
                    <Icon icon="game-icons:check-mark" />
                  </span>
                ) : null}
              </button>
            </li>
          )
          })}
        </ul>

        {hoveredCard ? (
          <span
            className="hover-card hand-card-hover hand-card-hover-overlay"
            role="tooltip"
            style={{
              left: `${hoveredCard.left}px`,
              top: `${hoveredCard.top}px`,
            }}
          >
            <div className="hand-card-tooltip-header">
              <strong>{hoveredCard.card.cardName}</strong>
              <div className="hand-card-tooltip-badges">
                <span className="hand-card-type-icon" title={getCardTypeVisual(hoveredCard.card.cardType).label} aria-label={getCardTypeVisual(hoveredCard.card.cardType).label}>
                  <Icon icon={getCardTypeVisual(hoveredCard.card.cardType).icon} aria-hidden="true" />
                </span>
                <span
                  className={`hand-card-rarity-swatch rarity-${hoveredCard.card.rarity}`}
                  title={getRarityLabel(hoveredCard.card.rarity)}
                  aria-label={getRarityLabel(hoveredCard.card.rarity)}
                />
              </div>
            </div>
            <p className="hand-card-tooltip-summary tooltip-main-line">
              {hoveredCard.card.summaryText?.trim()
                ? simplifyTooltipSummaryText(hoveredCard.card.summaryText)
                : 'No text available.'}
            </p>
            {isShiftHeld && hoveredCard.card.summaryDetailText ? (
              <p className="hand-card-tooltip-detail">
                {splitDetailTextIntoLines(hoveredCard.card.summaryDetailText).map((line, index) => (
                  <span key={`${index}-${line}`} className="hand-card-tooltip-detail-line">
                    {renderTextWithHighlightedNumbers(line)}
                  </span>
                ))}
              </p>
            ) : null}
            {!isShiftHeld && hoveredCard.card.summaryDetailText ? (
              <span className="tooltip-shift-hint">Hold Shift for details.</span>
            ) : null}
            {hoveredCard.card.castConditionText ? (
              <div className="hand-card-tooltip-note tooltip-row">
                <strong className="tooltip-inline-label">Condition:</strong>
                {hoveredCard.card.castConditionText}
              </div>
            ) : null}
          </span>
        ) : null}

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
            <div className="hand-focus-title-block">
              <span className="hand-card-tooltip-badges">
                <span className="hand-card-chip hand-card-chip-type" title={getCardTypeVisual(focusedCard.cardType).label}>
                  <Icon icon={getCardTypeVisual(focusedCard.cardType).icon} aria-hidden="true" />
                  <span>{getCardTypeVisual(focusedCard.cardType).label}</span>
                </span>
                <span
                  className={`hand-card-rarity-swatch rarity-${focusedCard.rarity}`}
                  title={getRarityLabel(focusedCard.rarity)}
                  aria-label={getRarityLabel(focusedCard.rarity)}
                />
              </span>
              <strong>{focusedCard.cardName}</strong>
            </div>
            <span className="hand-focus-cost" title={`Cost ${focusedCard.moveCost}`}>{focusedCard.moveCost}</span>
          </div>
          <p className="hand-focus-summary">{focusedCard.summaryText?.trim() ? focusedCard.summaryText : 'No text available.'}</p>
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
