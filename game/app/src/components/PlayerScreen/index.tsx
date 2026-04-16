import { useEffect, useRef, useState, type CSSProperties } from 'react'
import type { AppBattlePreview } from '../../game-client'
import type { AppTargetPreview } from '../../game-client-preview/types'
import { SIDE_VISUALS } from '../../data/visual-metadata'
import { BattlefieldGrid } from '../BattlefieldGrid/index'
import { HandBar } from '../HandBar/index'
import { InspectPanel } from '../InspectPanel/index'
import { ScreenHeader } from './ScreenHeader'
import { PassiveEffectsStrip } from './PassiveEffectsStrip'
import { usePlayerScreenState } from './usePlayerScreenState'
import { useKeyboardShortcuts } from './useKeyboardShortcuts'
import type { LastActionFeedback } from '../../app-shell/useActionsFeedback'
import { formatPreviewNumber } from '../../utils/game-client-format'
import './style.css'

type TargetSelectionPreview = {
  text: string
  tone: 'neutral' | 'positive' | 'negative'
  detail: string
}

function buildTargetSelectionPreview(options: {
  preview: AppBattlePreview
  sourceEntityId: string | null
  sourcePreview: AppTargetPreview | null
  targetEntityId: string
}): TargetSelectionPreview | null {
  const { preview, sourceEntityId, sourcePreview, targetEntityId } = options
  if (!sourcePreview) {
    return null
  }

  const targetStats = preview.battlefield.entitiesById[targetEntityId]
  if (!targetStats) {
    return null
  }

  if (sourcePreview.kind === 'heal') {
    const missingHealth = Math.max(0, targetStats.maxHealth - targetStats.currentHealth)
    const minimum = Math.max(0, Math.round(Math.min(sourcePreview.minimum, missingHealth)))
    const maximum = Math.max(0, Math.round(Math.min(sourcePreview.maximum, missingHealth)))
    const rangeText = minimum === maximum
      ? `${formatPreviewNumber(minimum)} HP`
      : `${formatPreviewNumber(minimum)}-${formatPreviewNumber(maximum)} HP`
    const remainingMinimum = Math.min(targetStats.maxHealth, targetStats.currentHealth + minimum)
    const remainingMaximum = Math.min(targetStats.maxHealth, targetStats.currentHealth + maximum)
    const remainingText = remainingMinimum === remainingMaximum
      ? `${formatPreviewNumber(remainingMinimum)} HP`
      : `${formatPreviewNumber(remainingMinimum)}-${formatPreviewNumber(remainingMaximum)} HP`

    return {
      text: `+${rangeText}`,
      tone: 'positive',
      detail: `Heals ${rangeText}. Ends at ${remainingText}.`,
    }
  }

  if (targetStats.isImmune) {
    return {
      text: 'Immune',
      tone: 'negative',
      detail: 'Target is immune to damage.',
    }
  }

  const resistance = sourcePreview.damageType === 'physical'
    ? targetStats.armor
    : sourcePreview.damageType === 'magic'
      ? targetStats.magicResist
      : 0
  const sourceFlatBonusDamage = sourceEntityId
    ? preview.battlefield.entitiesById[sourceEntityId]?.combatNumbers.attackFlatBonusDamage.effective ?? 0
    : 0
  const minimum = Math.max(0, Math.round(sourcePreview.minimum - resistance) + Math.round(sourceFlatBonusDamage))
  const maximum = Math.max(0, Math.round(sourcePreview.maximum - resistance) + Math.round(sourceFlatBonusDamage))
  const rangeText = minimum === maximum
    ? `${formatPreviewNumber(minimum)} damage`
    : `${formatPreviewNumber(minimum)}-${formatPreviewNumber(maximum)} damage`
  const remainingMinimum = Math.max(0, targetStats.currentHealth - maximum)
  const remainingMaximum = Math.max(0, targetStats.currentHealth - minimum)
  const remainingText = remainingMinimum === remainingMaximum
    ? `${formatPreviewNumber(remainingMinimum)} HP left`
    : `${formatPreviewNumber(remainingMinimum)}-${formatPreviewNumber(remainingMaximum)} HP left`
  const hitChanceText = sourcePreview.canBeDodged
    ? `, ${formatPreviewNumber(Math.round((1 - targetStats.effectiveDodgeChance) * 100))}% hit`
    : ''
  const reactionNotes = [
    targetStats.activeListeners.some((listener) => /reflect/i.test(listener.listenerId) || /reflect/i.test(listener.label))
      ? 'reflect'
      : null,
  ].filter((part): part is string => !!part)

  return {
    text: `${rangeText}${hitChanceText}`,
    tone: maximum > 0 ? 'positive' : 'negative',
    detail: [
      `After resistance${sourcePreview.canBeDodged ? ' and dodge' : ''}.`,
      `Leaves target at ${remainingText}.`,
      reactionNotes.length > 0 ? `Status: ${reactionNotes.join(', ')}.` : null,
    ].filter((part): part is string => !!part).join(' '),
  }
}

type PlayerScreenProps = {
  title: string
  selfId: string
  enemyId: string
  selfSideKey: 'a' | 'b'
  preview: AppBattlePreview
  shouldShowDetailedTooltips: boolean
  showDetailedTooltipsToggle: boolean
  onToggleDetailedTooltips: () => void
  onBasicAttack: (input: { targetEntityId: string }) => void
  onUseEntityActive: (input: { sourceEntityId: string; targetEntityId?: string }) => void
  onPressLuck: () => void
  onEndTurn: () => void
  onPlayCard: (input: {
    handCardId: string
    targetEntityId?: string
    targetPosition?: { row: number; column: number }
  }) => void
  onOpenDeckEditor: () => void
  onOpenRulebook: () => void
  onHardReroll?: () => void
  isMusicMuted?: boolean
  onToggleMusic?: () => void
  showMusicControl?: boolean
  isSettingsOpen?: boolean
  onToggleSettings?: () => void
  showSettingsControl?: boolean
  isRulebookOpen?: boolean
  lastActionFeedback: LastActionFeedback | null
}

export function PlayerScreen(props: PlayerScreenProps) {
  const {
    title,
    selfId,
    enemyId,
    selfSideKey,
    preview,
    shouldShowDetailedTooltips,
    showDetailedTooltipsToggle,
    onToggleDetailedTooltips,
    onBasicAttack,
    onUseEntityActive,
    onPressLuck,
    onEndTurn,
    onPlayCard,
    onOpenDeckEditor,
    onOpenRulebook,
    onHardReroll,
    isMusicMuted,
    onToggleMusic,
    showMusicControl,
    isSettingsOpen,
    onToggleSettings,
    showSettingsControl,
    isRulebookOpen,
    lastActionFeedback,
  } = props
  const screenRef = useRef<HTMLElement | null>(null)

  const self = preview.heroHandCounts.find((hero) => hero.heroEntityId === selfId)
  const selfHeroDetails = preview.heroDetailsByEntityId[selfId] ?? null
  const selfActivePassiveEffects = selfHeroDetails?.activePassiveEffects ?? []
  const enemySideKey = selfSideKey === 'a' ? 'b' : 'a'
  const shouldFlipRows = self?.battlefieldSide === 'north'
  const selfHandSize = self?.handSize ?? 0
  const selfDeckSize = self?.deckSize ?? 0
  const selfMovePoints = self?.movePoints ?? 0
  const selfMaxMovePoints = self?.maxMovePoints ?? 0
  const selfMoveCapacityTrace = self?.moveCapacityTrace ?? {
    base: selfMaxMovePoints,
    effective: selfMaxMovePoints,
    delta: 0,
    contributions: [],
  }
  const isGameOver = preview.gameOver !== null
  const isActivePlayer = !isGameOver && preview.activeHeroEntityId === selfId

  const [isCoarsePointer, setIsCoarsePointer] = useState(false)

  const {
    focusedHandCardId,
    selectedTargetEntityId,
    selectedPlacementPosition,
    pendingActionMode,
    selectedEntityActiveSourceId,
    inspectTarget, setInspectTarget,
    selfHandCards,
    focusedCard,
    basicAttackTargetEntityIds,
    entityActiveSourceIds,
    selectedEntityConfirmId,
    entityActiveTargetEntityIds,
    highlightedPlacementPositions,
    highlightedTargetEntityIds,
    pressLuckMoveCost,
    pressLuckUsedThisTurn,
    pressLuckAtFavorableLimit,
    canBeginPressLuck,
    handleClearFocus,
    handleFocusCard,
    handleConfirmFocusedCard,
    handleSelectTarget,
    handleSelectBattlefieldEntity,
    handleSelectPlacementPosition,
    handleBeginHeroBasicAttackEntityActive,
    handleConfirmEntityActive,
    handlePressLuckOverlayClick,
  } = usePlayerScreenState({
    selfId,
    preview,
    isActivePlayer,
    onBasicAttack,
    onUseEntityActive,
    onPlayCard,
    onPressLuck,
  })

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return
    const mediaQuery = window.matchMedia('(pointer: coarse)')
    const syncPointerMode = () => setIsCoarsePointer(mediaQuery.matches)
    syncPointerMode()
    mediaQuery.addEventListener('change', syncPointerMode)
    return () => mediaQuery.removeEventListener('change', syncPointerMode)
  }, [])

  const canConfirmFocusedCardShortcut =
    !!focusedCard &&
    focusedCard.isPlayable &&
    (focusedCard.validTargetEntityIds.length === 0 || !!selectedTargetEntityId) &&
    (focusedCard.validPlacementPositions.length === 0 || !!selectedPlacementPosition)

  const activeTargetPreview = focusedCard?.targetPreview ?? (pendingActionMode === 'entityActiveTarget'
    ? selectedEntityActiveSourceId === selfId
      ? selfHeroDetails?.basicAttack.targetPreview ?? null
      : selectedEntityActiveSourceId
        ? preview.battlefield.entitiesById[selectedEntityActiveSourceId]?.activeAbility?.targetPreview ?? null
        : null
    : null)

  const targetSelectionPreviewsByEntityId = (() => {
    const targetEntityIds = focusedCard
      ? focusedCard.validTargetEntityIds
      : pendingActionMode === 'entityActiveTarget'
        ? entityActiveTargetEntityIds
        : []

    if (!activeTargetPreview || targetEntityIds.length === 0) {
      return {}
    }

    return targetEntityIds.reduce<Record<string, TargetSelectionPreview>>((result, targetEntityId) => {
      const previewInfo = buildTargetSelectionPreview({
        preview,
        sourceEntityId: focusedCard ? selfId : selectedEntityActiveSourceId,
        sourcePreview: activeTargetPreview,
        targetEntityId,
      })
      if (previewInfo) {
        result[targetEntityId] = previewInfo
      }
      return result
    }, {})
  })()

  useKeyboardShortcuts({
    isActivePlayer,
    isCoarsePointer,
    onEndTurn,
    onPressLuck: handlePressLuckOverlayClick,
    selfHandCards,
    focusedHandCardId,
    canConfirmFocusedCardShortcut,
    handleFocusCard,
    handleConfirmFocusedCard,
    handleBeginHeroBasicAttackEntityActive,
    handleConfirmEntityActive,
    pendingActionMode,
    selectedEntityActiveSourceId,
    selectedTargetEntityId,
    basicAttackTargetEntityIds,
    selfId,
  })

  useEffect(() => {
    if (!inspectTarget) return
    const SCROLL_THRESHOLD_PX = 6
    type PointerState = { startX: number; startY: number; didScroll: boolean }
    const pointers = new Map<number, PointerState>()
    const handlePointerDown = (e: PointerEvent) => pointers.set(e.pointerId, { startX: e.clientX, startY: e.clientY, didScroll: false })
    const handlePointerMove = (e: PointerEvent) => {
      const state = pointers.get(e.pointerId)
      if (!state || state.didScroll) return
      if (Math.abs(e.clientX - state.startX) > SCROLL_THRESHOLD_PX || Math.abs(e.clientY - state.startY) > SCROLL_THRESHOLD_PX) state.didScroll = true
    }
    const handlePointerUp = (e: PointerEvent) => {
      const state = pointers.get(e.pointerId); pointers.delete(e.pointerId)
      if (state?.didScroll || !(e.target instanceof Element) || e.target.closest('.inspect-panel') || e.target.closest('button, input, textarea, [role="button"]')) return
      setInspectTarget(null)
    }
    window.addEventListener('pointerup', handlePointerUp)
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown)
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
    }
  }, [inspectTarget, setInspectTarget])

  const hasSelectionState = !!focusedHandCardId || !!pendingActionMode || !!selectedEntityActiveSourceId || !!selectedTargetEntityId || !!selectedPlacementPosition

  useEffect(() => {
    if (!hasSelectionState) return
    const handlePointerDown = (e: PointerEvent) => {
      const screen = screenRef.current
      if (!screen || !(e.target instanceof Element) || !screen.contains(e.target) || e.target.closest('.hand-bar, .hand-card-item, .hand-focus-panel, .hand-card-info, .battle-action-overlay, .deck-overlay, .touch-tooltip-toggle, .hint-wrap, .inspect-panel, button, input, textarea, [role="button"]') || e.target.closest('.battle-slot.target-selectable, .battle-slot.placement-selectable')) return
      handleClearFocus()
    }
    window.addEventListener('pointerdown', handlePointerDown)
    return () => window.removeEventListener('pointerdown', handlePointerDown)
  }, [hasSelectionState, handleClearFocus])

  const screenStyle = {
    '--self-side-color': `var(${SIDE_VISUALS[selfSideKey].sideColorVar})`,
    '--enemy-side-color': `var(${SIDE_VISUALS[enemySideKey].sideColorVar})`,
  } as CSSProperties

  return (
    <section ref={screenRef} className="screen" style={screenStyle} aria-label={`${SIDE_VISUALS[selfSideKey].name} game screen`}>
      <ScreenHeader
        title={title}
        selfSideKey={selfSideKey}
        onOpenDeckEditor={onOpenDeckEditor}
        onHardReroll={onHardReroll}
        showMusicControl={showMusicControl}
        isMusicMuted={isMusicMuted}
        onToggleMusic={onToggleMusic}
        showSettingsControl={showSettingsControl}
        isSettingsOpen={isSettingsOpen}
        onToggleSettings={onToggleSettings}
        isRulebookOpen={isRulebookOpen}
        onOpenRulebook={onOpenRulebook}
      />

      <PassiveEffectsStrip
        activePassiveEffects={selfActivePassiveEffects}
        isCoarsePointer={isCoarsePointer}
        lastActionFeedback={lastActionFeedback}
      />

      <section className="battle-overlay-layer">
        <BattlefieldGrid
          preview={preview}
          selfId={selfId}
          enemyId={enemyId}
          shouldFlipRows={shouldFlipRows}
          availableInteractionEntityIds={isActivePlayer ? entityActiveSourceIds : []}
          highlightedTargetEntityIds={isActivePlayer ? highlightedTargetEntityIds : []}
          selectedTargetEntityId={selectedTargetEntityId}
          selectedEntityConfirmId={selectedEntityConfirmId}
          targetSelectionPreviewsByEntityId={targetSelectionPreviewsByEntityId}
          onSelectTargetEntityId={isActivePlayer ? handleSelectTarget : undefined}
          onSelectEntityId={isActivePlayer ? handleSelectBattlefieldEntity : undefined}
          onInspectEntity={id => setInspectTarget({ kind: 'entity', entityId: id })}
          highlightedPlacementPositions={isActivePlayer ? highlightedPlacementPositions : []}
          selectedPlacementPosition={selectedPlacementPosition}
          onSelectPlacementPosition={isActivePlayer ? handleSelectPlacementPosition : undefined}
        />
      </section>

      <HandBar
        cards={selfHandCards}
        isActivePlayer={isActivePlayer}
        isGameOver={isGameOver}
        deckSize={selfDeckSize}
        handSize={selfHandSize}
        movePoints={selfMovePoints}
        maxMovePoints={selfMaxMovePoints}
        moveCapacityTrace={selfMoveCapacityTrace}
        pressLuckMoveCost={pressLuckMoveCost}
        canBeginPressLuck={canBeginPressLuck}
        isPressLuckSelected={pendingActionMode === 'pressLuckConfirm'}
        pressLuckAriaLabel={
          pendingActionMode === 'pressLuckConfirm'
            ? 'Press luck selected. Confirm by clicking again.'
            : pressLuckUsedThisTurn
              ? 'Press luck already used this turn.'
              : pressLuckAtFavorableLimit
                ? 'Luck is already fully on your side.'
                : `Press luck. Costs ${pressLuckMoveCost} moves.`
        }
        focusedHandCardId={focusedHandCardId}
        pendingActionMode={pendingActionMode}
        selectedTargetEntityId={selectedTargetEntityId}
        selectedPlacementPosition={selectedPlacementPosition}
        onEndTurn={onEndTurn}
        onPressLuckClick={handlePressLuckOverlayClick}
        shouldShowDetailedTooltips={shouldShowDetailedTooltips}
        showDetailedTooltipsToggle={showDetailedTooltipsToggle}
        onToggleDetailedTooltips={onToggleDetailedTooltips}
        onFocusCard={handleFocusCard}
        onConfirmFocusedCard={handleConfirmFocusedCard}
        onClearFocus={handleClearFocus}
        onInspectCard={id => setInspectTarget({ kind: 'handCard', cardId: id })}
      />

      <InspectPanel
        target={inspectTarget}
        preview={preview}
        selfId={selfId}
        selfHandCards={selfHandCards}
        shouldShowDetailedTooltips={shouldShowDetailedTooltips}
        onClose={() => setInspectTarget(null)}
      />
    </section>
  )
}
