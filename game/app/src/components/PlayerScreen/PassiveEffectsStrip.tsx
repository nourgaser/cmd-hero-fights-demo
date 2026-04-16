import { useMemo, useState } from 'react'
import { Icon } from '@iconify/react/offline'
import type { AppBattlePreview } from '../../game-client'
import type { LastActionFeedback } from '../../app-shell/useActionsFeedback'
import { renderTextWithHighlightedNumbers } from '../../utils/render-numeric-text'

type PassiveEffectsStripProps = {
  activePassiveEffects: NonNullable<AppBattlePreview['heroDetailsByEntityId'][string]>['activePassiveEffects']
  isCoarsePointer: boolean
  lastActionFeedback: LastActionFeedback | null
}

export function PassiveEffectsStrip(props: PassiveEffectsStripProps) {
  const { activePassiveEffects, isCoarsePointer, lastActionFeedback } = props
  const [selectedPassiveEffectId, setSelectedPassiveEffectId] = useState<string | null>(null)
  const [showAllPassiveEffects, setShowAllPassiveEffects] = useState(false)
  const [activeView, setActiveView] = useState<'lastAction' | 'passives'>('lastAction')

  const sortedPassiveEffects = useMemo(
    () =>
      [...activePassiveEffects].sort((left, right) => {
        if (left.priority !== right.priority) {
          return right.priority - left.priority
        }
        return left.label.localeCompare(right.label)
      }),
    [activePassiveEffects],
  )

  const selectedPassiveEffect = useMemo(() => {
    if (sortedPassiveEffects.length === 0) {
      return null
    }

    if (!selectedPassiveEffectId) {
      return sortedPassiveEffects[0] ?? null
    }

    return sortedPassiveEffects.find((entry) => entry.effectId === selectedPassiveEffectId) ?? sortedPassiveEffects[0] ?? null
  }, [selectedPassiveEffectId, sortedPassiveEffects])

  const passiveChipLimit = isCoarsePointer ? 5 : 8
  const hasPassiveOverflow = sortedPassiveEffects.length > passiveChipLimit
  const visiblePassiveEffects =
    hasPassiveOverflow && !showAllPassiveEffects
      ? sortedPassiveEffects.slice(0, passiveChipLimit)
      : sortedPassiveEffects
  const hiddenPassiveCount = sortedPassiveEffects.length - visiblePassiveEffects.length

  return (
    <section className="passive-effects-strip" aria-label="Active passive effects">
      <div className="passive-effects-head">
        <strong>{activeView === 'lastAction' ? 'Last Action' : 'Passives'}</strong>
        <div className="passive-effects-head-controls">
          <div className="passive-effects-toggle" role="tablist" aria-label="Passive strip view selector">
            <button
              type="button"
              role="tab"
              aria-selected={activeView === 'lastAction'}
              className={`passive-effects-toggle-button ${activeView === 'lastAction' ? 'passive-effects-toggle-button-active' : ''}`.trim()}
              onClick={() => setActiveView('lastAction')}
            >
              Last
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeView === 'passives'}
              className={`passive-effects-toggle-button ${activeView === 'passives' ? 'passive-effects-toggle-button-active' : ''}`.trim()}
              onClick={() => setActiveView('passives')}
            >
              Passives
            </button>
          </div>
          <span>{activePassiveEffects.length}</span>
        </div>
      </div>
      <div
        className={`passive-effects-body ${activeView === 'lastAction' ? 'passive-effects-body-last-action' : 'passive-effects-body-passives'}`.trim()}
        role="tabpanel"
        aria-live="polite"
      >
        {activeView === 'lastAction' ? (
          lastActionFeedback ? (
            <div className={`passive-last-action ${lastActionFeedback.isError ? 'passive-last-action-error' : ''}`.trim()}>
              <p className="passive-last-action-summary">
                {renderTextWithHighlightedNumbers(lastActionFeedback.summary, 'passive-last-action-number')}
              </p>
              {lastActionFeedback.detail ? (
                <p className="passive-last-action-detail">
                  {renderTextWithHighlightedNumbers(lastActionFeedback.detail, 'passive-last-action-number')}
                </p>
              ) : null}
            </div>
          ) : (
            <p className="passive-effects-empty">No action has been resolved yet.</p>
          )
        ) : activePassiveEffects.length > 0 ? (
          <>
            <div className="passive-effect-chip-row" role="list" aria-label="Active passive effects list">
              {visiblePassiveEffects.map((effect) => {
                const isSelected = selectedPassiveEffect?.effectId === effect.effectId
                return (
                  <button
                    key={effect.effectId}
                    type="button"
                    className={`passive-effect-chip hint-wrap passive-effect-chip-${effect.statusTone} passive-effect-chip-family-${effect.paletteKey} ${isSelected ? 'active' : ''}`.trim()}
                    onClick={() => {
                      setSelectedPassiveEffectId((current) => (current === effect.effectId ? null : effect.effectId))
                    }}
                    aria-pressed={isSelected}
                    aria-label={`${effect.label}. ${effect.statusLabel}. ${effect.shortText}`}
                  >
                    <Icon icon={effect.iconId} className="passive-effect-icon" aria-hidden="true" />
                    <span className="passive-effect-stack">{effect.stackCount > 1 ? `x${effect.stackCount}` : ''}</span>
                    <span className="sr-only">{effect.label}</span>
                    <span className="hover-card passive-effect-hover-card" role="tooltip">
                      <strong>{effect.label}</strong>
                      <span>{effect.shortText}</span>
                      {effect.detailLines.map((line) => (
                        <span key={`${effect.effectId}:${line}`}>{line}</span>
                      ))}
                    </span>
                  </button>
                )
              })}
              {hiddenPassiveCount > 0 ? (
                <button
                  type="button"
                  className="passive-effect-chip passive-effect-overflow-chip"
                  onClick={() => setShowAllPassiveEffects(true)}
                  aria-label={`Show ${hiddenPassiveCount} more passive effects`}
                >
                  +{hiddenPassiveCount}
                </button>
              ) : null}
              {hasPassiveOverflow && showAllPassiveEffects ? (
                <button
                  type="button"
                  className="passive-effect-chip passive-effect-overflow-chip"
                  onClick={() => setShowAllPassiveEffects(false)}
                  aria-label="Collapse passive effects"
                >
                  Collapse
                </button>
              ) : null}
            </div>
            {selectedPassiveEffect ? (
              <div className="passive-effect-detail" aria-live="polite">
                <div className="passive-effect-detail-head">
                  <span>{selectedPassiveEffect.label}</span>
                  <strong>{selectedPassiveEffect.statusLabel}</strong>
                </div>
                <p>{selectedPassiveEffect.shortText}</p>
              </div>
            ) : null}
          </>
        ) : (
          <p className="passive-effects-empty">No active passive effects.</p>
        )}
      </div>
    </section>
  )
}
