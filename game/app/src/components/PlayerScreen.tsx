import type { CSSProperties } from 'react'
import { Icon } from '@iconify/react/offline'
import type { AppBattlePreview } from '../game-client.ts'
import { LUCK_VISUALS, SIDE_VISUALS } from '../data/visual-metadata.ts'
import { LuckBar } from './LuckBar.tsx'
import { BattlefieldGrid } from './BattlefieldGrid.tsx'
import { DeckIcons } from './DeckIcons.tsx'

type PlayerScreenProps = {
  title: string
  selfId: string
  enemyId: string
  selfSideKey: 'a' | 'b'
  preview: AppBattlePreview
  deckCardIds: string[]
  seedInput: string
  onSeedInputChange: (value: string) => void
  onStart: () => void
  onReset: () => void
}

export function PlayerScreen(props: PlayerScreenProps) {
  const {
    title,
    selfId,
    enemyId,
    selfSideKey,
    preview,
    deckCardIds,
    seedInput,
    onSeedInputChange,
    onStart,
    onReset,
  } = props

  const self = preview.heroHandCounts.find((hero) => hero.heroEntityId === selfId)
  const enemy = preview.heroHandCounts.find((hero) => hero.heroEntityId === enemyId)
  const enemySideKey = selfSideKey === 'a' ? 'b' : 'a'
  const shouldFlipRows = self?.battlefieldSide === 'north'

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

      <div className="bootstrap-controls" aria-label="Battle start controls">
        <label htmlFor={`seed-input-${selfSideKey}`}>Seed</label>
        <input
          id={`seed-input-${selfSideKey}`}
          value={seedInput}
          onChange={(event) => onSeedInputChange(event.target.value)}
          placeholder="battle seed"
          aria-label="Battle seed"
        />
        <button type="button" onClick={onStart} aria-label="Start with this seed">
          Start
        </button>
        <button type="button" onClick={onReset} aria-label="Reset to default seed and layout">
          Reset
        </button>
      </div>

      <section className="split-screen">
        <article className="player-pane self-pane">
          <header>
            <h2>You</h2>
            <p>{selfId}</p>
          </header>
          <dl>
            <div>
              <dt>Hand</dt>
              <dd>{self?.handSize ?? 0}</dd>
            </div>
            <div>
              <dt>Deck</dt>
              <dd>{self?.deckSize ?? 0}</dd>
            </div>
          </dl>
        </article>

        <article className="battle-center">
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
        </article>

        <article className="player-pane enemy-pane">
          <header>
            <h2>Opponent</h2>
            <p>{enemyId}</p>
          </header>
          <dl>
            <div>
              <dt>Hand</dt>
              <dd>{enemy?.handSize ?? 0}</dd>
            </div>
            <div>
              <dt>Deck</dt>
              <dd>{enemy?.deckSize ?? 0}</dd>
            </div>
          </dl>
        </article>
      </section>

      <BattlefieldGrid
        preview={preview}
        selfId={selfId}
        enemyId={enemyId}
        shouldFlipRows={shouldFlipRows}
      />

      <DeckIcons cardIds={deckCardIds} />
    </section>
  )
}
