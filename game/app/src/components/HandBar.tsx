import { Icon } from '@iconify/react/offline'
import { CARD_ICON_META } from '../data/visual-metadata.ts'
import type { AppBattlePreview } from '../game-client.ts'

type HandBarCard = AppBattlePreview['heroHands'][number]['cards'][number]

type HandBarProps = {
  cards: HandBarCard[]
  isActivePlayer: boolean
  focusedHandCardId: string | null
  selectedTargetEntityId: string | null
  onEndTurn: () => void
  onFocusCard: (handCardId: string) => void
  onConfirmFocusedCard: () => void
  onClearFocus: () => void
}

export function HandBar(props: HandBarProps) {
  const {
    cards,
    isActivePlayer,
    focusedHandCardId,
    selectedTargetEntityId,
    onEndTurn,
    onFocusCard,
    onConfirmFocusedCard,
    onClearFocus,
  } = props

  const focusedCard = focusedHandCardId
    ? cards.find((card) => card.handCardId === focusedHandCardId) ?? null
    : null
  const focusedNeedsTarget = !!focusedCard && focusedCard.validTargetEntityIds.length > 0
  const canConfirm = !!focusedCard && (!focusedNeedsTarget || !!selectedTargetEntityId)

  return (
    <section className="card hand-bar" aria-label="Hand cards">
      <div className="hand-bar-header">
        <h2>Hand</h2>
        {isActivePlayer ? (
          <button type="button" className="hand-pill hand-pill-button" onClick={onEndTurn}>
            End turn
          </button>
        ) : (
          <span className="hand-pill">Waiting turn</span>
        )}
      </div>

      <ul className="hand-cards" aria-label="Cards in hand">
        {cards.map((card) => {
          const meta = CARD_ICON_META[card.cardDefinitionId] ?? {
            id: 'game-icons:card-pick',
            label: card.cardName,
            description: 'Card',
          }
          const isFocused = card.handCardId === focusedHandCardId
          const requiresTarget = card.validTargetEntityIds.length > 0

          return (
            <li key={card.handCardId}>
              <button
                type="button"
                className={`hand-card ${isFocused ? 'focused' : ''}`.trim()}
                onClick={() => onFocusCard(card.handCardId)}
                disabled={!isActivePlayer}
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

      {focusedCard ? (
        <div className="hand-focus-panel" aria-live="polite">
          <p>
            <strong>{focusedCard.cardName}</strong>
            {focusedNeedsTarget
              ? ` requires a target (${focusedCard.validTargetEntityIds.length} valid).`
              : ' does not require a target.'}
          </p>
          {focusedNeedsTarget && !selectedTargetEntityId ? (
            <p>Choose one highlighted battlefield target, then confirm.</p>
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
