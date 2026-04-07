import { useEffect, useRef, useState, type MouseEvent } from 'react'
import { Icon } from '@iconify/react/offline'
import { CARD_ICON_META } from '../data/visual-metadata.ts'
import type { AppBattlePreview } from '../game-client.ts'
import {
  renderTextWithHighlightedNumbers,
  simplifyTooltipSummaryText,
  splitTooltipDetailLabel,
  splitDetailTextIntoLines,
} from '../utils/render-numeric-text.tsx'

type HandBarCard = AppBattlePreview['heroHands'][number]['cards'][number]

type HandBarProps = {
  cards: HandBarCard[]
  isActivePlayer: boolean
  movePoints: number
  maxMovePoints: number
  pressLuckMoveCost: number
  shouldShowDetailedTooltips: boolean
  showDetailedTooltipsToggle: boolean
  onToggleDetailedTooltips: () => void
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
    shouldShowDetailedTooltips,
    showDetailedTooltipsToggle,
    onToggleDetailedTooltips,
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
  const [isCoarsePointer, setIsCoarsePointer] = useState(false)
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
    if (!isCoarsePointer || !hoveredCard) {
      return
    }

    const handlePointerDown = (event: PointerEvent) => {
      const wrap = handWrapRef.current
      if (!wrap) {
        return
      }

      const target = event.target
      if (target instanceof Node && !wrap.contains(target)) {
        setHoveredCard(null)
      }
    }

    window.addEventListener('pointerdown', handlePointerDown)
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown)
    }
  }, [hoveredCard, isCoarsePointer])

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

  const handleHandBackgroundClick = (event: MouseEvent<HTMLElement>) => {
    const target = event.target
    if (!(target instanceof Element)) {
      return
    }

    if (target.closest('.hand-card-item, .hand-focus-panel, .hand-pill-button, .move-meter, .clear-focus, .confirm-play')) {
      return
    }

    setHoveredCard(null)
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
            <span>{movePoints} / {maxMovePoints}</span>
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
          ) : (
            <span className="hand-pill">Waiting turn</span>
          )}
        </div>
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
              <button
                type="button"
                className="hand-card-info"
                aria-label={`Show ${card.cardName} details`}
                onClick={(event) => {
                  event.stopPropagation()
                  const anchor = event.currentTarget.closest('.hand-card-item')
                  if (!(anchor instanceof HTMLElement)) {
                    return
                  }

                  setHoveredCard((current) => {
                    if (current?.card.handCardId === card.handCardId) {
                      return null
                    }

                    const wrap = handWrapRef.current
                    if (!wrap) {
                      return null
                    }

                    const anchorRect = anchor.getBoundingClientRect()
                    const wrapRect = wrap.getBoundingClientRect()
                    return {
                      card,
                      left: anchorRect.left - wrapRect.left + anchorRect.width / 2,
                      top: anchorRect.top - wrapRect.top,
                    }
                  })
                }}
              >
                <Icon icon="game-icons:info" aria-hidden="true" />
              </button>
            </li>
          )
          })}
        </ul>

        {hoveredCard ? (
          <span
            className={`hover-card hand-card-hover hand-card-hover-overlay ${hoveredCard.card.summonPreview ? 'has-summon-preview' : ''}`.trim()}
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
            {shouldShowDetailedTooltips && hoveredCard.card.summaryDetailText ? (
              <p className="hand-card-tooltip-detail">
                {splitDetailTextIntoLines(hoveredCard.card.summaryDetailText).map((line, index) => (
                  <span key={`${index}-${line}`} className="hand-card-tooltip-detail-line">
                    {renderTextWithHighlightedNumbers(line)}
                  </span>
                ))}
              </p>
            ) : null}
            {!shouldShowDetailedTooltips && hoveredCard.card.summaryDetailText ? (
              <span className="tooltip-shift-hint">Hold Shift or enable Details.</span>
            ) : null}
            {hoveredCard.card.castConditionText ? (
              <div className="hand-card-tooltip-note tooltip-row">
                <strong className="tooltip-inline-label">Condition:</strong>
                {hoveredCard.card.castConditionText}
              </div>
            ) : null}
            {hoveredCard.card.summonPreview ? (
              <aside className="summon-preview-panel" aria-label={`Summon preview for ${hoveredCard.card.summonPreview.displayName}`}>
                <div className="hand-card-tooltip-header summon-preview-header">
                  <strong>{hoveredCard.card.summonPreview.displayName}</strong>
                  <div className="hand-card-tooltip-badges">
                    <span
                      className="hand-card-type-icon"
                      title={getCardTypeVisual(hoveredCard.card.summonPreview.cardType).label}
                      aria-label={getCardTypeVisual(hoveredCard.card.summonPreview.cardType).label}
                    >
                      <Icon icon={getCardTypeVisual(hoveredCard.card.summonPreview.cardType).icon} aria-hidden="true" />
                    </span>
                    <span
                      className={`hand-card-rarity-swatch rarity-${hoveredCard.card.summonPreview.rarity}`}
                      title={getRarityLabel(hoveredCard.card.summonPreview.rarity)}
                      aria-label={getRarityLabel(hoveredCard.card.summonPreview.rarity)}
                    />
                  </div>
                </div>

                <div className="summon-preview-stats" aria-label="Summon combat and vitals">
                  <span className="battlefield-hover-stat">
                    <strong>HP</strong>
                    <em>{hoveredCard.card.summonPreview.maxHealth}</em>
                  </span>
                  <span className="battlefield-hover-stat">
                    <strong>AD</strong>
                    <em>{hoveredCard.card.summonPreview.attackDamage}</em>
                  </span>
                  <span className="battlefield-hover-stat">
                    <strong>AP</strong>
                    <em>{hoveredCard.card.summonPreview.abilityPower}</em>
                  </span>
                  <span className="battlefield-hover-stat">
                    <strong>AR</strong>
                    <em>{hoveredCard.card.summonPreview.armor}</em>
                  </span>
                  <span className="battlefield-hover-stat">
                    <strong>MR</strong>
                    <em>{hoveredCard.card.summonPreview.magicResist}</em>
                  </span>
                  <span className="battlefield-hover-stat">
                    <strong>MOV</strong>
                    <em>{hoveredCard.card.summonPreview.maxMovesPerTurn}</em>
                  </span>
                </div>

                {hoveredCard.card.summonPreview.passiveSummaryText ? (
                  <div className="summon-preview-section">
                    <span className="hover-group-title">Passive</span>
                    <span className="tooltip-main-line">
                      {simplifyTooltipSummaryText(hoveredCard.card.summonPreview.passiveSummaryText)}
                    </span>
                    {shouldShowDetailedTooltips && hoveredCard.card.summonPreview.passiveSummaryDetailText ? (
                      <span className="battle-tooltip-detail">
                        {splitDetailTextIntoLines(hoveredCard.card.summonPreview.passiveSummaryDetailText).map((line, index) => (
                          <span key={`${index}-${line}`} className="battle-tooltip-detail-line tooltip-detail-row">
                            {(() => {
                              const parts = splitTooltipDetailLabel(line)
                              return parts.label ? (
                                <>
                                  <span className="tooltip-detail-label">{parts.label}</span>
                                  <span className="tooltip-detail-value">{renderTextWithHighlightedNumbers(parts.value)}</span>
                                </>
                              ) : (
                                <span className="tooltip-detail-value tooltip-detail-value-full">{renderTextWithHighlightedNumbers(line)}</span>
                              )
                            })()}
                          </span>
                        ))}
                      </span>
                    ) : null}
                  </div>
                ) : null}

                {hoveredCard.card.summonPreview.activeAbilitySummaryText ? (
                  <div className="summon-preview-section">
                    <span className="hover-group-title">Active</span>
                    <span className="tooltip-main-line">
                      {simplifyTooltipSummaryText(hoveredCard.card.summonPreview.activeAbilitySummaryText)}
                    </span>
                    {shouldShowDetailedTooltips && hoveredCard.card.summonPreview.activeAbilitySummaryDetailText ? (
                      <span className="battle-tooltip-detail">
                        {splitDetailTextIntoLines(hoveredCard.card.summonPreview.activeAbilitySummaryDetailText).map((line, index) => (
                          <span key={`${index}-${line}`} className="battle-tooltip-detail-line tooltip-detail-row">
                            {(() => {
                              const parts = splitTooltipDetailLabel(line)
                              return parts.label ? (
                                <>
                                  <span className="tooltip-detail-label">{parts.label}</span>
                                  <span className="tooltip-detail-value">{renderTextWithHighlightedNumbers(parts.value)}</span>
                                </>
                              ) : (
                                <span className="tooltip-detail-value tooltip-detail-value-full">{renderTextWithHighlightedNumbers(line)}</span>
                              )
                            })()}
                          </span>
                        ))}
                      </span>
                    ) : null}
                  </div>
                ) : null}

                {!shouldShowDetailedTooltips && (hoveredCard.card.summonPreview.passiveSummaryDetailText || hoveredCard.card.summonPreview.activeAbilitySummaryDetailText) ? (
                  <span className="tooltip-shift-hint">Hold Shift or enable Details.</span>
                ) : null}
              </aside>
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
          {shouldShowDetailedTooltips && focusedCard.summaryDetailText ? (
            <p className="hand-card-tooltip-detail">
              {splitDetailTextIntoLines(focusedCard.summaryDetailText).map((line, index) => (
                <span key={`${index}-${line}`} className="hand-card-tooltip-detail-line">
                  {renderTextWithHighlightedNumbers(line)}
                </span>
              ))}
            </p>
          ) : null}
          {!shouldShowDetailedTooltips && focusedCard.summaryDetailText ? (
            <span className="tooltip-shift-hint">Hold Shift or enable Details.</span>
          ) : null}
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
