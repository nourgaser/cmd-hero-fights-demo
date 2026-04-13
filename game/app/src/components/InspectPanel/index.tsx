import { Icon } from '@iconify/react/offline'
import './style.css'
import type { AppBattlePreview } from '../../game-client'
import { CARD_ICON_META, ENTITY_ICON_META } from '../../data/visual-metadata'
import {
  renderTextWithHighlightedNumbers,
  simplifyTooltipSummaryText,
  splitTooltipDetailLabel,
  splitDetailTextIntoLines,
} from '../../utils/render-numeric-text'
import {
  formatSignedDelta,
  formatLayeredValue,
  numberDeltaClass,
  getVisualIconStyle,
  getCardTypeVisual,
  getRarityLabel,
  groupContributions,
} from '../../utils/game-client-format'
import type { InspectTarget } from '../../inspectable'

type HandBarCard = AppBattlePreview['heroHands'][number]['cards'][number]

function formatChancePercent(value: number): string {
  return `${Math.round(value * 100)}%`
}

// ─── Sub-renderers ───────────────────────────────────────────────────────────

function StatRow({
  label,
  value,
  deltaClass,
  contributions,
  isPercent,
  extraSources,
  shouldShowSources,
}: {
  label: string
  value: string
  deltaClass: 'delta-positive' | 'delta-negative' | 'delta-neutral'
  contributions?: Array<{ sourceId: string; label: string; delta: number }>
  isPercent?: boolean
  extraSources?: Array<{ label: string; delta: number }>
  shouldShowSources: boolean
}) {
  const allSources = [
    ...(contributions ?? []),
    ...(extraSources ?? []),
  ]
  return (
    <span className={`inspect-stat ${deltaClass}`}>
      <strong>{label}</strong>
      <em>{value}</em>
      {shouldShowSources && allSources.length > 0 ? (
        <span className="inspect-stat-sources">
          {contributions?.map((row) => (
            <span key={`${row.sourceId}`} className="inspect-stat-source-row">
              <span className="inspect-stat-source-name">{row.label}</span>
              <span className={`inspect-stat-source-delta ${numberDeltaClass(row.delta)}`}>
                {isPercent ? `${formatSignedDelta(row.delta * 100)}%` : formatSignedDelta(row.delta)}
              </span>
            </span>
          ))}
          {extraSources?.map((src) => (
            <span key={`extra-${src.label}`} className="inspect-stat-source-row">
              <span className="inspect-stat-source-name">{src.label}</span>
              <span className={`inspect-stat-source-delta ${numberDeltaClass(src.delta)}`}>
                {isPercent ? `${formatSignedDelta(src.delta * 100)}%` : formatSignedDelta(src.delta)}
              </span>
            </span>
          ))}
        </span>
      ) : null}
    </span>
  )
}

function AbilitySection({
  title,
  summaryText,
  summaryDetailText,
  moveCost,
  shouldShowDetailedTooltips,
}: {
  title: string
  summaryText: string
  summaryDetailText?: string | null
  moveCost?: number
  shouldShowDetailedTooltips: boolean
}) {
  return (
    <div className={`inspect-ability-section${moveCost != null ? ' inspect-ability-section-with-cost' : ''}`}>
      <div className="inspect-section-title-row">
        <span className="inspect-section-title">{title}</span>
        {moveCost != null ? (
          <span className="inspect-ability-cost" aria-label={`Costs ${moveCost} moves`}>{moveCost}</span>
        ) : null}
      </div>
      <span className="inspect-section-text">{simplifyTooltipSummaryText(summaryText)}</span>
      {shouldShowDetailedTooltips && summaryDetailText ? (
        <span className="inspect-detail-block">
          {splitDetailTextIntoLines(summaryDetailText).map((line, index) => (
            <span key={`${index}-${line}`} className="inspect-detail-line">
              {(() => {
                const parts = splitTooltipDetailLabel(line)
                return parts.label ? (
                  <>
                    <span className="inspect-detail-label">{parts.label}</span>
                    <span className="inspect-detail-value">{renderTextWithHighlightedNumbers(parts.value)}</span>
                  </>
                ) : (
                  <span className="inspect-detail-value inspect-detail-value-full">
                    {renderTextWithHighlightedNumbers(line)}
                  </span>
                )
              })()}
            </span>
          ))}
        </span>
      ) : null}
      {!shouldShowDetailedTooltips && summaryDetailText ? (
        <span className="inspect-hint">Enable Details for breakdown.</span>
      ) : null}
    </div>
  )
}

// ─── Entity inspect ──────────────────────────────────────────────────────────

function EntityInspect({
  entityId,
  preview,
  selfId,
  shouldShowDetailedTooltips,
}: {
  entityId: string
  preview: AppBattlePreview
  selfId: string
  shouldShowDetailedTooltips: boolean
}) {
  const entityStats = preview.battlefield.entitiesById[entityId]
  const heroDetails = preview.heroDetailsByEntityId[entityId] ?? null
  const luckBalance = preview.luck.balance
  const isLuckAnchor = entityId === preview.luck.anchorHeroEntityId

  if (!entityStats) {
    return <p className="inspect-empty">Entity not found on battlefield.</p>
  }

  const cardMeta = entityStats.sourceCardDefinitionId
    ? CARD_ICON_META[entityStats.sourceCardDefinitionId]
    : undefined
  const meta = cardMeta ?? ENTITY_ICON_META[entityStats.kind]

  const ownerLabel =
    entityStats.ownerHeroEntityId === selfId ? 'Ally' : entityStats.ownerHeroEntityId ? 'Enemy' : null

  const healthPercent = Math.max(
    0,
    Math.min(100, (entityStats.currentHealth / Math.max(1, entityStats.maxHealth)) * 100),
  )
  const healthHue = Math.round((healthPercent / 100) * 120)

  const combatTraces = entityStats.combatNumbers
  const attackDamageClass = numberDeltaClass(combatTraces.attackDamage.delta)
  const abilityPowerClass = numberDeltaClass(combatTraces.abilityPower.delta)
  const attackFlatBonusDamage = combatTraces.attackFlatBonusDamage.effective
  const attackFlatBonusDamageClass = numberDeltaClass(combatTraces.attackFlatBonusDamage.delta)
  const armorClass = numberDeltaClass(combatTraces.armor.delta)
  const magicResistClass = numberDeltaClass(combatTraces.magicResist.delta)
  const critLuckDelta = entityStats.criticalChanceLuckDelta ?? 0
  const dodgeLuckDelta = entityStats.dodgeChanceLuckDelta ?? 0
  const dodgeClass = numberDeltaClass((combatTraces.dodgeChance.delta ?? 0) + dodgeLuckDelta)
  const critClass = numberDeltaClass(critLuckDelta)
  const moveCapacityDeltaClass = numberDeltaClass(entityStats.statLayers.moveCapacity.bonus)

  const adSources = groupContributions(combatTraces.attackDamage.contributions)
  const apSources = groupContributions(combatTraces.abilityPower.contributions)
  const attackFlatSources = groupContributions(combatTraces.attackFlatBonusDamage.contributions)
  const armorSources = groupContributions(combatTraces.armor.contributions)
  const mrSources = groupContributions(combatTraces.magicResist.contributions)
  const dodgeSources = groupContributions(combatTraces.dodgeChance.contributions)
  const moveSources = groupContributions(combatTraces.moveCapacity.contributions)
  const immuneSources = groupContributions(combatTraces.immune.contributions)

  const isLuckEntity = entityStats.kind === 'hero'
  const luckIsFavored = luckBalance === 0 ? null : isLuckAnchor ? luckBalance > 0 : luckBalance < 0
  const luckCloverCount = isLuckEntity ? Math.abs(luckBalance) : 0

  return (
    <>
      {/* Header */}
      <div className="inspect-panel-title">
        <Icon
          icon={meta.id}
          className="inspect-entity-icon"
          style={getVisualIconStyle(meta)}
          aria-hidden="true"
        />
        <div>
          <span className="inspect-panel-name">{entityStats.displayName ?? meta.label ?? entityStats.kind}</span>
          <span className="inspect-panel-kicker">
            {heroDetails ? 'Hero' : meta.label ?? entityStats.kind}
            {ownerLabel ? ` · ${ownerLabel}` : ''}
          </span>
        </div>
      </div>

      {/* Luck */}
      {luckCloverCount > 0 && luckIsFavored !== null ? (
        <div className="inspect-luck-row">
          {Array.from({ length: luckCloverCount }).map((_, i) => (
            <Icon
              key={`luck-${i}`}
              icon="game-icons:shamrock"
              className={`inspect-luck-clover ${luckIsFavored ? 'favored' : 'unfavored'}`}
            />
          ))}
          <span className="inspect-luck-label">{luckIsFavored ? 'Luck favors you' : 'Luck against you'}</span>
        </div>
      ) : null}

      {/* Hero abilities */}
      {heroDetails ? (
        <div className="inspect-section">
          <AbilitySection
            title="Passive"
            summaryText={heroDetails.passiveText}
            shouldShowDetailedTooltips={shouldShowDetailedTooltips}
          />
          <AbilitySection
            title="Basic Attack"
            summaryText={heroDetails.basicAttack.summaryText}
            summaryDetailText={heroDetails.basicAttack.summaryDetailText}
            moveCost={heroDetails.basicAttack.moveCost}
            shouldShowDetailedTooltips={shouldShowDetailedTooltips}
          />
          {heroDetails.basicAttack.damageType ? (
            <p className="inspect-note">Damage type: {heroDetails.basicAttack.damageType}</p>
          ) : null}
        </div>
      ) : (
        <div className="inspect-section">
          {entityStats.sourceCardSummary || entityStats.sourceCardSummaryDetailText ? (
            <AbilitySection
              title="Passive"
              summaryText={entityStats.sourceCardSummary ?? ''}
              summaryDetailText={entityStats.sourceCardSummaryDetailText}
              shouldShowDetailedTooltips={shouldShowDetailedTooltips}
            />
          ) : null}
          {entityStats.sourceCardKeywords.length > 0 ? (
            <div>
              <span className="inspect-section-title">Keywords</span>
              {entityStats.sourceCardKeywords.map((keyword) => (
                <div key={keyword.keywordId} className="inspect-keyword-row">
                  <strong className="inspect-keyword-name">{keyword.keywordName}.</strong>
                  <span> {keyword.keywordSummaryText}</span>
                </div>
              ))}
            </div>
          ) : null}
          {entityStats.activeAbility ? (
            <AbilitySection
              title="Active"
              summaryText={entityStats.activeAbility.summaryText}
              summaryDetailText={entityStats.activeAbility.summaryDetailText}
              moveCost={entityStats.activeAbility.moveCost}
              shouldShowDetailedTooltips={shouldShowDetailedTooltips}
            />
          ) : null}
        </div>
      )}

      {/* Vitals */}
      <div className="inspect-section">
        <span className="inspect-section-title">Vitals</span>
        <div className="inspect-vitals-row">
          <div className="inspect-hp-bar" aria-label={`HP ${entityStats.currentHealth} of ${entityStats.maxHealth}`}>
            <div
              className="inspect-hp-bar-fill"
              style={{
                width: `${healthPercent}%`,
                background: `linear-gradient(90deg, hsl(${healthHue} 72% 44%), hsl(${healthHue} 78% 56%))`,
              }}
            />
          </div>
          <span className="inspect-hp-value">{entityStats.currentHealth}/{entityStats.maxHealth}</span>
        </div>
        <div className="inspect-stat-grid">
          <StatRow
            label="Moves"
            value={`${entityStats.movePoints} / ${formatLayeredValue(entityStats.statLayers.moveCapacity.permanent, entityStats.statLayers.moveCapacity.bonus)}`}
            deltaClass={moveCapacityDeltaClass}
            contributions={moveSources}
            shouldShowSources={shouldShowDetailedTooltips}
          />
        </div>
      </div>

      {/* Status */}
      {(entityStats.isImmune || entityStats.isTaunt || entityStats.activeListeners.length > 0) ? (
        <div className="inspect-section">
          <span className="inspect-section-title">Status</span>
          <div className="inspect-status-row">
            {entityStats.isImmune ? (
              <span className="inspect-status-pill inspect-status-immune">
                Immune
                {shouldShowDetailedTooltips && immuneSources.length > 0
                  ? ` (${immuneSources.map((s) => s.label).join(', ')})`
                  : ''}
              </span>
            ) : null}
            {entityStats.isTaunt ? (
              <span className="inspect-status-pill inspect-status-taunt">Taunt</span>
            ) : null}
            {entityStats.activeListeners.map((listener) => (
              <span key={listener.listenerId} className="inspect-status-pill inspect-status-armed">
                {listener.label}
              </span>
            ))}
          </div>
          {entityStats.isTaunt ? (
            <p className="inspect-note">Adjacent allies cannot be targeted by enemy attacks.</p>
          ) : null}
          {entityStats.activeListeners.length > 0 ? (
            <div className="inspect-listener-list">
              {entityStats.activeListeners.map((listener) => (
                <div key={listener.listenerId} className="inspect-listener-row">
                  <strong>{listener.label}:</strong> {listener.shortText}{' '}
                  <span className="inspect-listener-status">({listener.statusLabel})</span>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Combat stats */}
      <div className="inspect-section">
        <span className="inspect-section-title">Combat</span>
        <div className="inspect-stat-grid">
          <StatRow
            label="AD"
            value={formatLayeredValue(entityStats.statLayers.attackDamage.permanent, entityStats.statLayers.attackDamage.bonus)}
            deltaClass={attackDamageClass}
            contributions={adSources}
            shouldShowSources={shouldShowDetailedTooltips}
          />
          <StatRow
            label="AP"
            value={formatLayeredValue(entityStats.statLayers.abilityPower.permanent, entityStats.statLayers.abilityPower.bonus)}
            deltaClass={abilityPowerClass}
            contributions={apSources}
            shouldShowSources={shouldShowDetailedTooltips}
          />
          {attackFlatBonusDamage !== 0 ? (
            <StatRow
              label="ATK+"
              value={formatLayeredValue(entityStats.statLayers.attackFlatBonusDamage.permanent, entityStats.statLayers.attackFlatBonusDamage.bonus)}
              deltaClass={attackFlatBonusDamageClass}
              contributions={attackFlatSources}
              shouldShowSources={shouldShowDetailedTooltips}
            />
          ) : null}
          <StatRow
            label="Armor"
            value={formatLayeredValue(entityStats.statLayers.armor.permanent, entityStats.statLayers.armor.bonus)}
            deltaClass={armorClass}
            contributions={armorSources}
            shouldShowSources={shouldShowDetailedTooltips}
          />
          <StatRow
            label="MR"
            value={formatLayeredValue(entityStats.statLayers.magicResist.permanent, entityStats.statLayers.magicResist.bonus)}
            deltaClass={magicResistClass}
            contributions={mrSources}
            shouldShowSources={shouldShowDetailedTooltips}
          />
          <StatRow
            label="Crit"
            value={`${formatChancePercent(entityStats.effectiveCriticalChance)} x${entityStats.criticalMultiplier.toFixed(2)}`}
            deltaClass={critClass}
            extraSources={critLuckDelta !== 0 ? [{ label: 'Luck', delta: critLuckDelta }] : undefined}
            isPercent
            shouldShowSources={shouldShowDetailedTooltips}
          />
          <StatRow
            label="Dodge"
            value={formatChancePercent(entityStats.effectiveDodgeChance)}
            deltaClass={dodgeClass}
            contributions={dodgeSources}
            extraSources={dodgeLuckDelta !== 0 ? [{ label: 'Luck', delta: dodgeLuckDelta }] : undefined}
            isPercent
            shouldShowSources={shouldShowDetailedTooltips}
          />
        </div>
        {!shouldShowDetailedTooltips ? (
          <p className="inspect-hint">Enable Details to see stat sources.</p>
        ) : null}
      </div>
    </>
  )
}

// ─── Hand card inspect ───────────────────────────────────────────────────────

function HandCardInspect({
  cardId,
  selfHandCards,
  shouldShowDetailedTooltips,
}: {
  cardId: string
  selfHandCards: HandBarCard[]
  shouldShowDetailedTooltips: boolean
}) {
  const card = selfHandCards.find((c) => c.handCardId === cardId) ?? null

  if (!card) {
    return <p className="inspect-empty">Card not found in hand.</p>
  }

  const meta = CARD_ICON_META[card.cardDefinitionId] ?? {
    id: 'game-icons:card-pick',
    label: card.cardName,
  }
  const typeVisual = getCardTypeVisual(card.cardType)

  return (
    <>
      {/* Header */}
      <div className="inspect-panel-title">
        <div className="inspect-card-icon-wrap">
          <Icon icon={meta.id} className="inspect-card-icon" style={getVisualIconStyle(meta)} aria-hidden="true" />
        </div>
        <div className="inspect-card-header-text">
          <span className="inspect-panel-name">{card.cardName}</span>
          <span className="inspect-panel-kicker">
            <span className={`inspect-rarity-dot rarity-${card.rarity}`} aria-hidden="true" />
            {getRarityLabel(card.rarity)} {typeVisual.label}
          </span>
        </div>
        <span className="inspect-card-cost" title={`Cost ${card.moveCost}`}>{card.moveCost}</span>
      </div>

      {/* Summary text */}
      <div className="inspect-section">
        <p className="inspect-section-text">
          {card.summaryText?.trim() ? simplifyTooltipSummaryText(card.summaryText) : 'No text available.'}
        </p>
      </div>

      {/* Keywords */}
      {card.keywords.length > 0 ? (
        <div className="inspect-section">
          <span className="inspect-section-title">Keywords</span>
          {card.keywords.map((keyword) => (
            <div key={keyword.keywordId} className="inspect-keyword-row">
              <strong className="inspect-keyword-name">{keyword.keywordName}.</strong>
              <span> {keyword.keywordSummaryText}</span>
            </div>
          ))}
        </div>
      ) : null}

      {/* Detail text */}
      {shouldShowDetailedTooltips && card.summaryDetailText ? (
        <div className="inspect-section">
          <span className="inspect-section-title">Detail</span>
          <p className="inspect-detail-block">
            {splitDetailTextIntoLines(card.summaryDetailText).map((line, index) => (
              <span key={`${index}-${line}`} className="inspect-detail-line">
                {renderTextWithHighlightedNumbers(line)}
              </span>
            ))}
          </p>
        </div>
      ) : null}
      {!shouldShowDetailedTooltips && card.summaryDetailText ? (
        <p className="inspect-hint">Enable Details for full breakdown.</p>
      ) : null}

      {/* Cast condition */}
      {card.castConditionText ? (
        <div className="inspect-section">
          <span className="inspect-section-title">Condition</span>
          <p className="inspect-section-text">{card.castConditionText}</p>
        </div>
      ) : null}

      {/* Play status */}
      {!card.isPlayable ? (
        <p className="inspect-blocked-note">Not playable right now.</p>
      ) : null}

      {/* Summon preview */}
      {card.summonPreview ? (
        <div className="inspect-section inspect-summon-preview">
          <div className="inspect-summon-header">
            <div className="inspect-card-icon-wrap">
              <Icon
                icon={
                  CARD_ICON_META[card.summonPreview.cardDefinitionId]?.id ??
                  getCardTypeVisual(card.summonPreview.cardType).icon
                }
                className="inspect-card-icon"
                style={getVisualIconStyle(CARD_ICON_META[card.summonPreview.cardDefinitionId] ?? {})}
                aria-hidden="true"
              />
            </div>
            <div className="inspect-card-header-text">
              <span className="inspect-panel-name">{card.summonPreview.displayName}</span>
              <span className="inspect-panel-kicker">
                <span className={`inspect-rarity-dot rarity-${card.summonPreview.rarity}`} aria-hidden="true" />
                {getRarityLabel(card.summonPreview.rarity)} Summon
              </span>
            </div>
          </div>
          <div className="inspect-stat-grid">
            <span className="inspect-stat delta-neutral"><strong>HP</strong><em>{card.summonPreview.maxHealth}</em></span>
            <span className="inspect-stat delta-neutral"><strong>AD</strong><em>{card.summonPreview.attackDamage}</em></span>
            <span className="inspect-stat delta-neutral"><strong>AP</strong><em>{card.summonPreview.abilityPower}</em></span>
            <span className="inspect-stat delta-neutral"><strong>Armor</strong><em>{card.summonPreview.armor}</em></span>
            <span className="inspect-stat delta-neutral"><strong>MR</strong><em>{card.summonPreview.magicResist}</em></span>
            <span className="inspect-stat delta-neutral"><strong>MOVES</strong><em>{card.summonPreview.maxMovesPerTurn}</em></span>
          </div>
          {card.summonPreview.passiveSummaryText ? (
            <AbilitySection
              title="Passive"
              summaryText={card.summonPreview.passiveSummaryText}
              summaryDetailText={card.summonPreview.passiveSummaryDetailText}
              shouldShowDetailedTooltips={shouldShowDetailedTooltips}
            />
          ) : null}
          {card.summonPreview.activeAbilitySummaryText ? (
            <AbilitySection
              title="Active"
              summaryText={card.summonPreview.activeAbilitySummaryText}
              summaryDetailText={card.summonPreview.activeAbilitySummaryDetailText}
              shouldShowDetailedTooltips={shouldShowDetailedTooltips}
            />
          ) : null}
        </div>
      ) : null}
    </>
  )
}

// ─── Main panel ──────────────────────────────────────────────────────────────

type InspectPanelProps = {
  target: InspectTarget | null
  preview: AppBattlePreview
  selfId: string
  selfHandCards: HandBarCard[]
  shouldShowDetailedTooltips: boolean
  onClose: () => void
}

export function InspectPanel(props: InspectPanelProps) {
  const { target, preview, selfId, selfHandCards, shouldShowDetailedTooltips, onClose } = props

  if (!target) {
    return null
  }

  return (
    <section className="inspect-panel card" aria-label="Inspect details" aria-live="polite">
      <div className="inspect-panel-head">
        <span className="inspect-panel-label">
          {target.kind === 'entity' ? 'Entity' : 'Card'}
        </span>
        <button
          type="button"
          className="inspect-panel-close"
          onClick={onClose}
          aria-label="Close inspect panel"
        >
          ×
        </button>
      </div>
      <div className="inspect-panel-body">
        {target.kind === 'entity' ? (
          <EntityInspect
            entityId={target.entityId}
            preview={preview}
            selfId={selfId}
            shouldShowDetailedTooltips={shouldShowDetailedTooltips}
          />
        ) : (
          <HandCardInspect
            cardId={target.cardId}
            selfHandCards={selfHandCards}
            shouldShowDetailedTooltips={shouldShowDetailedTooltips}
          />
        )}
      </div>
    </section>
  )
}
