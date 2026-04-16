import { useRef, type MouseEvent } from 'react'
import { Icon } from '@iconify/react/offline'
import { CARD_ICON_META } from '../../data/visual-metadata'
import './style.css'
import type { AppBattlePreview } from '../../game-client'

export type HandBarCard = AppBattlePreview['heroHands'][number]['cards'][number]

type HandBarProps = {
  cards: HandBarCard[]
  isActivePlayer: boolean
  isGameOver: boolean
  deckSize: number
  handSize: number
  movePoints: number
  maxMovePoints: number
  moveCapacityTrace: AppBattlePreview['heroHandCounts'][number]['moveCapacityTrace']
  pressLuckMoveCost: number
  canBeginPressLuck: boolean
  isPressLuckSelected: boolean
  pressLuckAriaLabel: string
  shouldShowDetailedTooltips: boolean
  showDetailedTooltipsToggle: boolean
  onToggleDetailedTooltips: () => void
  focusedHandCardId: string | null
  pendingActionMode: 'entityActiveTarget' | 'pressLuckConfirm' | null
  selectedTargetEntityId: string | null
  selectedPlacementPosition: { row: number; column: number } | null
  onEndTurn: () => void
  onPressLuckClick: () => void
  onFocusCard: (handCardId: string) => void
  onConfirmFocusedCard: () => void
  onClearFocus: () => void
  onInspectCard?: (cardId: string) => void
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

function getVisualIconStyle(meta: { rotate?: number; hFlip?: boolean; vFlip?: boolean }) {
  const transforms: string[] = []

  if (meta.hFlip) {
    transforms.push('scaleX(-1)')
  }
  if (meta.vFlip) {
    transforms.push('scaleY(-1)')
  }
  if (typeof meta.rotate === 'number' && meta.rotate !== 0) {
    transforms.push(`rotate(${meta.rotate}deg)`)
  }

  return transforms.length > 0 ? { transform: transforms.join(' ') } : undefined
}

export function HandBar(props: HandBarProps) {
  const {
    cards,
    isActivePlayer,
    isGameOver,
    deckSize,
    handSize,
    movePoints,
    maxMovePoints,
    moveCapacityTrace,
    pressLuckMoveCost,
    canBeginPressLuck,
    isPressLuckSelected,
    pressLuckAriaLabel,
    shouldShowDetailedTooltips,
    showDetailedTooltipsToggle,
    onToggleDetailedTooltips,
    focusedHandCardId,
    pendingActionMode,
    selectedTargetEntityId,
    selectedPlacementPosition,
    onEndTurn,
    onPressLuckClick,
    onFocusCard,
    onConfirmFocusedCard,
    onClearFocus,
    onInspectCard,
  } = props
  const scrollerRef = useRef<HTMLUListElement | null>(null)

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

  const moveCapacityRows = moveCapacityTrace.contributions
    .reduce<Array<{ sourceId: string; label: string; delta: number }>>((rows, contribution) => {
      const existing = rows.find((entry) => entry.sourceId === contribution.sourceId)
      if (existing) {
        existing.delta += contribution.delta
        return rows
      }

      rows.push({
        sourceId: contribution.sourceId,
        label: contribution.label,
        delta: contribution.delta,
      })
      return rows
    }, [])
    .filter((row) => row.delta !== 0)

  const moveMaxDisplay = moveCapacityTrace.delta === 0
    ? `${maxMovePoints}`
    : `${maxMovePoints} ${moveCapacityTrace.delta >= 0 ? '+' : '-'} ${Math.abs(moveCapacityTrace.delta)}`

  const handleHandBackgroundClick = (event: MouseEvent<HTMLElement>) => {
    const target = event.target
    if (!(target instanceof Element)) {
      return
    }

    if (
      target.closest(
        '.hand-card-item, .hand-focus-panel, .hand-pill-button, .hand-deck-chip, .hand-side-rail, .hand-luck-cluster, .hand-luck-orb, .move-meter, .clear-focus, .confirm-play',
      )
    ) {
      return
    }

    onClearFocus()
  }

  return (
    <section className="card hand-bar" aria-label="Hand cards" onClick={handleHandBackgroundClick}>
      <div className="hand-bar-header">
        <span className="move-meter hint-wrap" tabIndex={0} aria-label={`Moves ${movePoints} out of ${maxMovePoints}`}>
          <Icon icon="game-icons:boot-prints" className="move-meter-icon" aria-hidden="true" />
          <span className="move-meter-value">{movePoints}</span>
          <span className="hover-card move-hover-card" role="tooltip">
            <strong>Moves</strong>
            <span>{movePoints} / {moveMaxDisplay}</span>
            {shouldShowDetailedTooltips && moveCapacityRows.length > 0 ? (
              <span className="battle-tooltip-detail">
                {moveCapacityRows.map((row) => (
                  <span key={`move-${row.sourceId}`} className="battle-tooltip-detail-line tooltip-detail-row">
                    <span className="tooltip-detail-label">{row.label}</span>
                    <span className="tooltip-detail-value">{row.delta >= 0 ? '+' : '-'}{Math.abs(row.delta)}</span>
                  </span>
                ))}
              </span>
            ) : null}
            {!shouldShowDetailedTooltips && moveCapacityRows.length > 0 ? (
              <span className="tooltip-shift-hint">Hold Shift or enable Details.</span>
            ) : null}
          </span>
        </span>
        <div className="hand-header-actions">
          <button
            type="button"
            className={`hand-pill hand-pill-button hand-details-toggle ${showDetailedTooltipsToggle ? 'active' : ''}`.trim()}
            aria-pressed={showDetailedTooltipsToggle}
            onClick={onToggleDetailedTooltips}
          >
            Details
          </button>
          {isActivePlayer ? (
            <button type="button" className="hand-pill hand-pill-button" onClick={onEndTurn}>
              End turn
            </button>
          ) : isGameOver ? (
            <span className="hand-pill">Game over</span>
          ) : (
            <span className="hand-pill">Waiting turn</span>
          )}
          <span
            className="hand-pill hand-deck-chip hint-wrap"
            tabIndex={0}
            aria-label={`Deck status. ${deckSize} cards in deck and ${handSize} cards in hand.`}
          >
            <Icon icon="game-icons:card-pick" className="hand-deck-chip-icon" aria-hidden="true" />
            <span className="hand-deck-chip-count" aria-hidden="true">{deckSize}</span>
            <span className="sr-only">Deck status popup</span>
            <span className="hover-card deck-hover-card" role="tooltip">
              <strong>Your Deck</strong>
              <span className="tooltip-row">
                <strong className="tooltip-inline-label">Deck:</strong>
                {deckSize} cards remaining.
              </span>
              <span className="tooltip-row">
                <strong className="tooltip-inline-label">Hand:</strong>
                {handSize} cards.
              </span>
            </span>
          </span>
        </div>
      </div>

      <div className="hand-content-row">
        <div className="hand-scroll-wrap">
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
            >
              <button
                type="button"
                className={`hand-card rarity-${card.rarity} ${isFocused ? 'focused' : ''} ${!card.isPlayable ? 'unplayable' : ''}`.trim()}
                onClick={() => {
                  if (canConfirmCard) {
                    onConfirmFocusedCard()
                    return
                  }

                  if (!isActivePlayer) {
                    onInspectCard?.(card.handCardId)
                    return
                  }

                  onFocusCard(card.handCardId)
                }}
                aria-pressed={isFocused}
                aria-label={`${card.cardName}. Cost ${card.moveCost}. ${requiresTarget ? 'Requires target.' : 'No target required.'}`}
              >
                <span className="hand-card-type-badge" aria-hidden="true" title={typeVisual.label}>
                  <Icon icon={typeVisual.icon} />
                </span>
                <span className="hand-card-rarity-mark" aria-hidden="true" title={rarityLabel} />
                <Icon icon={meta.id} className="hand-card-icon" style={getVisualIconStyle(meta)} aria-hidden="true" />
                <span className="hand-card-name">{card.cardName}</span>
                <span className="hand-card-cost" title={`Cost ${card.moveCost}`}>{card.moveCost}</span>
                {canConfirmCard ? (
                  <span className="hand-card-check" aria-hidden="true">
                    <Icon icon="game-icons:check-mark" />
                  </span>
                ) : null}
              </button>
              <button
                type="button"
                className="hand-card-info"
                aria-label={`Inspect ${card.cardName}`}
                onClick={(event) => {
                  event.stopPropagation()
                  onInspectCard?.(card.handCardId)
                }}
              >
                <Icon icon="game-icons:info" aria-hidden="true" />
              </button>
            </li>
          )
          })}
        </ul>
        </div>

        <aside className="hand-side-rail" aria-label="Luck and deck controls">
          <span className="hand-side-divider" aria-hidden="true" />
          <div className="hand-luck-cluster hint-wrap" tabIndex={0} aria-label={pressLuckAriaLabel}>
            <button
              type="button"
              className={`hand-luck-orb ${isPressLuckSelected ? 'selected' : ''}`.trim()}
              onClick={onPressLuckClick}
              disabled={!canBeginPressLuck}
              aria-label={pressLuckAriaLabel}
            >
              <Icon icon="game-icons:shamrock" className="hand-luck-orb-icon" aria-hidden="true" />
              <span className="sr-only">Press luck</span>
              {isPressLuckSelected ? (
                <span className="hand-luck-check" aria-hidden="true">
                  <Icon icon="game-icons:check-mark" />
                </span>
              ) : null}
            </button>
            <span className="hand-luck-moves" aria-hidden="true">{pressLuckMoveCost} moves</span>
            <span className="hover-card battle-action-hover-card" role="tooltip">
              <strong>Luck</strong>
              <span>Shift luck in your favor by 1 point.</span>
            </span>
          </div>
        </aside>
      </div>

      {pendingActionMode === 'entityActiveTarget' ? (
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
          <p className="hand-focus-instruction">
            {focusedNeedsTarget && !selectedTargetEntityId
              ? `Pick a highlighted target (${focusedCard.validTargetEntityIds.length} valid), then click the card again to confirm.`
              : focusedNeedsPlacement && !selectedPlacementPosition
                ? `Pick a highlighted cell for placement, then click the card again to confirm.`
                : 'Click the highlighted card again to confirm.'}
          </p>
          <div className="hand-focus-actions">
            <button type="button" className="clear-focus" onClick={onClearFocus}>
              Cancel
            </button>
          </div>
        </div>
      ) : null}
    </section>
  )
}
