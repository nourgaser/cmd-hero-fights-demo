import type { CSSProperties } from 'react'
import { Icon } from '@iconify/react/offline'
import type { AppBattlePreview } from '../game-client.ts'
import { LUCK_VISUALS, SIDE_VISUALS } from '../data/visual-metadata.ts'
import { LuckBar } from './LuckBar.tsx'
import { BattlefieldGrid } from './BattlefieldGrid.tsx'

type PlayerScreenProps = {
  title: string
  selfId: string
  enemyId: string
  selfSideKey: 'a' | 'b'
  preview: AppBattlePreview
}

export function PlayerScreen(props: PlayerScreenProps) {
  const {
    title,
    selfId,
    enemyId,
    selfSideKey,
    preview,
  } = props

  const self = preview.heroHandCounts.find((hero) => hero.heroEntityId === selfId)
  const enemySideKey = selfSideKey === 'a' ? 'b' : 'a'
  const shouldFlipRows = self?.battlefieldSide === 'north'
  const selfHandSize = self?.handSize ?? 0
  const selfDeckSize = self?.deckSize ?? 0

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

        <section className="battle-center card">
          <h2>
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
    </section>
  )
}
