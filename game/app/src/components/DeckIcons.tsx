import { Icon } from '@iconify/react/offline'
import { CARD_ICON_META } from '../data/visual-metadata.ts'

type DeckIconsProps = {
  cardIds: string[]
}

export function DeckIcons(props: DeckIconsProps) {
  const { cardIds } = props

  return (
    <section className="card deck-row" aria-label="Deck cards">
      <h2>Deck</h2>
      <div className="deck-icons">
        {cardIds.map((cardId, index) => {
          const meta = CARD_ICON_META[cardId]
          const icon = meta?.id ?? 'game-icons:crossed-swords'
          const label = meta?.label ?? `Card ${index + 1}`
          const description = meta?.description ?? 'Playable card.'

          return (
            <span key={`${cardId}-${index}`} className="deck-icon hint-wrap" tabIndex={0} aria-label={label}>
              <Icon icon={icon} aria-hidden="true" />
              <span className="sr-only">{label}</span>
              <span className="hover-card" role="tooltip">
                <strong>{label}</strong>
                <span>{description}</span>
              </span>
            </span>
          )
        })}
      </div>
    </section>
  )
}
