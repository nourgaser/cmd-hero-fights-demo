import { useMemo, useState, type CSSProperties } from 'react'
import { Icon } from '@iconify/react/offline'
import type { AppBattlePreview } from '../game-client.ts'
import { LUCK_VISUALS, SIDE_VISUALS } from '../data/visual-metadata.ts'
import { LuckBar } from './LuckBar.tsx'
import { BattlefieldGrid } from './BattlefieldGrid.tsx'
import { ActionControls } from './ActionControls.tsx'
import { HandBar } from './HandBar.tsx'

type PlayerScreenProps = {
  title: string
  selfId: string
  enemyId: string
  selfSideKey: 'a' | 'b'
  preview: AppBattlePreview
  onBasicAttack: () => void
  onUseEntityActive: () => void
  onPressLuck: () => void
  onEndTurn: () => void
  onPlayCard: (input: { handCardId: string; targetEntityId?: string }) => void
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
  const isActivePlayer = preview.activeHeroEntityId === selfId

  const [focusedHandCardId, setFocusedHandCardId] = useState<string | null>(null)
  const [selectedTargetEntityId, setSelectedTargetEntityId] = useState<string | null>(null)

  const focusedCard = useMemo(() => {
    if (!focusedHandCardId) {
      return null
    }
    return selfHandCards.find((card) => card.handCardId === focusedHandCardId) ?? null
  }, [focusedHandCardId, selfHandCards])

  const highlightedTargetEntityIds = focusedCard?.validTargetEntityIds ?? []

  const handleFocusCard = (handCardId: string) => {
    if (!isActivePlayer) {
      return
    }

    setFocusedHandCardId(handCardId)
    setSelectedTargetEntityId(null)
  }

  const handleSelectTarget = (targetEntityId: string) => {
    if (!focusedCard) {
      return
    }

    if (!focusedCard.validTargetEntityIds.includes(targetEntityId)) {
      return
    }

    setSelectedTargetEntityId(targetEntityId)
  }

  const handleConfirmFocusedCard = () => {
    if (!focusedCard) {
      return
    }

    const requiresTarget = focusedCard.validTargetEntityIds.length > 0
    if (requiresTarget && !selectedTargetEntityId) {
      return
    }

    onPlayCard({
      handCardId: focusedCard.handCardId,
      targetEntityId: selectedTargetEntityId ?? undefined,
    })

    setFocusedHandCardId(null)
    setSelectedTargetEntityId(null)
  }

  const handleClearFocus = () => {
    setFocusedHandCardId(null)
    setSelectedTargetEntityId(null)
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
          />

          <ActionControls
            selfId={selfId}
            onBasicAttack={onBasicAttack}
            onUseEntityActive={onUseEntityActive}
            onPressLuck={onPressLuck}
            onEndTurn={onEndTurn}
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

        <HandBar
          cards={selfHandCards}
          isActivePlayer={isActivePlayer}
          focusedHandCardId={focusedHandCardId}
          selectedTargetEntityId={selectedTargetEntityId}
          onFocusCard={handleFocusCard}
          onConfirmFocusedCard={handleConfirmFocusedCard}
          onClearFocus={handleClearFocus}
        />
    </section>
  )
}
