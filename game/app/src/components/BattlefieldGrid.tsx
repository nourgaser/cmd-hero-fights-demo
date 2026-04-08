import { Icon } from '@iconify/react/offline'
import type { AppBattlePreview } from '../game-client.ts'
import { ENTITY_ICON_META, LUCK_VISUALS } from '../data/visual-metadata.ts'
import {
  renderTextWithHighlightedNumbers,
  simplifyTooltipSummaryText,
  splitTooltipDetailLabel,
  splitDetailTextIntoLines,
} from '../utils/render-numeric-text.tsx'

function formatSignedDelta(value: number): string {
  const abs = Math.abs(Math.round(value * 100) / 100)
  return `${value >= 0 ? '+' : '-'}${Number.isInteger(abs) ? abs : abs}`
}

function formatChancePercent(value: number): string {
  return `${Math.round(value * 100)}%`
}

function numberDeltaClass(delta: number): 'delta-positive' | 'delta-negative' | 'delta-neutral' {
  if (delta > 0) {
    return 'delta-positive'
  }
  if (delta < 0) {
    return 'delta-negative'
  }
  return 'delta-neutral'
}

type StatContributionSummary = {
  rows: Array<{ sourceId: string; label: string; delta: number }>
  hiddenCount: number
}

function summarizeStatContributions(
  contributions: AppBattlePreview['battlefield']['entitiesById'][string]['combatNumbers']['attackDamage']['contributions'],
  maxRows = 2,
): StatContributionSummary {
  const bySource = new Map<string, { sourceId: string; label: string; delta: number }>()
  for (const contribution of contributions) {
    const existing = bySource.get(contribution.sourceId)
    if (existing) {
      existing.delta += contribution.delta
      continue
    }
    bySource.set(contribution.sourceId, {
      sourceId: contribution.sourceId,
      label: contribution.label,
      delta: contribution.delta,
    })
  }

  const effectiveRows = Array.from(bySource.values())
    .filter((row) => row.delta !== 0)
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))

  return {
    rows: effectiveRows.slice(0, maxRows),
    hiddenCount: Math.max(0, effectiveRows.length - maxRows),
  }
}

type BattlefieldGridProps = {
  preview: AppBattlePreview
  selfId: string
  enemyId: string
  shouldFlipRows: boolean
  highlightedTargetEntityIds?: string[]
  selectedTargetEntityId?: string | null
  onSelectTargetEntityId?: (entityId: string) => void
  onSelectEntityId?: (entityId: string) => void
  shouldShowDetailedTooltips?: boolean
  highlightedPlacementPositions?: Array<{ row: number; column: number }>
  selectedPlacementPosition?: { row: number; column: number } | null
  onSelectPlacementPosition?: (position: { row: number; column: number }) => void
}

export function BattlefieldGrid(props: BattlefieldGridProps) {
  const {
    preview,
    selfId,
    enemyId,
    shouldFlipRows,
    highlightedTargetEntityIds = [],
    selectedTargetEntityId,
    onSelectTargetEntityId,
    onSelectEntityId,
    shouldShowDetailedTooltips = false,
    highlightedPlacementPositions = [],
    selectedPlacementPosition,
    onSelectPlacementPosition,
  } = props
  const halfRows = Math.floor(preview.battlefield.rows / 2)
  const highlightedSet = new Set(highlightedTargetEntityIds)
  const highlightedPlacementSet = new Set(
    highlightedPlacementPositions.map((position) => `${position.row}:${position.column}`),
  )

  const displayCells = preview.battlefield.cells
    .map((cell) => {
      const displayRow = shouldFlipRows ? preview.battlefield.rows - 1 - cell.row : cell.row
      return {
        ...cell,
        displayRow,
      }
    })
    .sort((a, b) => a.displayRow - b.displayRow || a.column - b.column)

  const occupiedModelPositions = new Set(
    preview.battlefield.cells
      .filter((cell) => !!cell.entityId)
      .map((cell) => `${cell.row}:${cell.column}`),
  )

  const occupiersByEntityId = new Map<
    string,
    {
      entityId: string
      ownerHeroEntityId: string | null
      kind: NonNullable<(typeof displayCells)[number]['occupantKind']>
      cells: Array<{ row: number; column: number }>
    }
  >()

  for (const cell of displayCells) {
    if (!cell.entityId || !cell.occupantKind) {
      continue
    }

    const existing = occupiersByEntityId.get(cell.entityId)
    if (existing) {
      existing.cells.push({ row: cell.displayRow, column: cell.column })
      continue
    }

    occupiersByEntityId.set(cell.entityId, {
      entityId: cell.entityId,
      ownerHeroEntityId: cell.ownerHeroEntityId,
      kind: cell.occupantKind,
      cells: [{ row: cell.displayRow, column: cell.column }],
    })
  }

  const occupierBlocks = Array.from(occupiersByEntityId.values())
    .map((occupier) => {
      const rows = occupier.cells.map((entry) => entry.row)
      const columns = occupier.cells.map((entry) => entry.column)
      const minRow = Math.min(...rows)
      const maxRow = Math.max(...rows)
      const minColumn = Math.min(...columns)
      const maxColumn = Math.max(...columns)

      return {
        ...occupier,
        minRow,
        maxRow,
        minColumn,
        maxColumn,
        rowSpan: maxRow - minRow + 1,
        columnSpan: maxColumn - minColumn + 1,
      }
    })
    .sort((a, b) => a.minRow - b.minRow || a.minColumn - b.minColumn)

  const emptySlots = [] as Array<{ modelRow: number; displayRow: number; column: number }>
  for (let modelRow = 0; modelRow < preview.battlefield.rows; modelRow += 1) {
    const displayRow = shouldFlipRows ? preview.battlefield.rows - 1 - modelRow : modelRow
    for (let column = 0; column < preview.battlefield.columns; column += 1) {
      const modelKey = `${modelRow}:${column}`
      if (!occupiedModelPositions.has(modelKey)) {
        emptySlots.push({ modelRow, displayRow, column })
      }
    }
  }

  return (
    <section className="card battlefield-card" aria-label="Battlefield board">
      <h2>Battlefield</h2>
      <div
        className="battle-grid"
        role="grid"
        aria-label="Battlefield cells"
        style={{
          gridTemplateColumns: `repeat(${preview.battlefield.columns}, minmax(var(--battle-cell-size, 112px), 1fr))`,
          gridTemplateRows: `repeat(${preview.battlefield.rows}, var(--battle-cell-size, 112px))`,
        }}
      >
          {emptySlots.map((slot) => {
            const sideClass = slot.displayRow < halfRows ? 'north' : 'south'
            const rowLabel = slot.displayRow + 1
            const colLabel = slot.column + 1
            const key = `${slot.modelRow}:${slot.column}`
            const isHighlightedPlacement = highlightedPlacementSet.has(key)
            const isSelectedPlacement =
              selectedPlacementPosition?.row === slot.modelRow &&
              selectedPlacementPosition?.column === slot.column
            const isSelectablePlacement = !!onSelectPlacementPosition && isHighlightedPlacement

            return (
              <div
                key={`empty:${slot.modelRow}:${slot.column}`}
                className={`battle-slot ${sideClass} ${isHighlightedPlacement ? 'placement-highlighted' : ''} ${isSelectedPlacement ? 'placement-selected' : ''} ${isSelectablePlacement ? 'placement-selectable' : ''}`.trim()}
                role="gridcell"
                aria-label={
                  isSelectablePlacement
                    ? isSelectedPlacement
                      ? `Selected placement cell at row ${rowLabel}, column ${colLabel}. Activate again to confirm.`
                      : `Empty selectable placement cell at row ${rowLabel}, column ${colLabel}`
                    : `Empty cell at row ${rowLabel}, column ${colLabel}`
                }
                style={{
                  gridRow: `${slot.displayRow + 1} / span 1`,
                  gridColumn: `${slot.column + 1} / span 1`,
                }}
                onClick={
                  isSelectablePlacement
                    ? () => onSelectPlacementPosition({ row: slot.modelRow, column: slot.column })
                    : undefined
                }
                onKeyDown={
                  isSelectablePlacement
                    ? (event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault()
                          onSelectPlacementPosition({ row: slot.modelRow, column: slot.column })
                        }
                      }
                    : undefined
                }
                tabIndex={isSelectablePlacement ? 0 : undefined}
              >
                {isSelectedPlacement ? (
                  <span className="placement-check-icon" aria-hidden="true">
                    <Icon icon="game-icons:check-mark" />
                  </span>
                ) : (
                  <span className="cell-empty" aria-hidden="true" />
                )}
              </div>
            )
          })}

          {occupierBlocks.map((occupier) => {
            const sideClass = occupier.minRow < halfRows ? 'north' : 'south'
            const isHighlightedTarget = highlightedSet.has(occupier.entityId)
            const isSelectedTarget = selectedTargetEntityId === occupier.entityId
            const isSelectableTarget = !!onSelectTargetEntityId && isHighlightedTarget
            const isSelectableEntity = !!onSelectEntityId
            const ownerClass =
              occupier.ownerHeroEntityId === selfId
                ? 'owner-self'
                : occupier.ownerHeroEntityId === enemyId
                  ? 'owner-enemy'
                  : ''
            const meta = ENTITY_ICON_META[occupier.kind]
            const entityStats = preview.battlefield.entitiesById[occupier.entityId]
            const heroDetails = preview.heroDetailsByEntityId[occupier.entityId] ?? null
            const luckBalance = preview.luck.balance
            const isLuckEntity = entityStats?.kind === 'hero'
            const isLuckAnchor = entityStats?.entityId === preview.luck.anchorHeroEntityId
            const luckCloverCount = isLuckEntity ? Math.abs(luckBalance) : 0
            const luckIsFavored = luckBalance === 0 ? null : isLuckAnchor ? luckBalance > 0 : luckBalance < 0
            const hasMovesRemaining =
              !!entityStats &&
              entityStats.ownerHeroEntityId === selfId &&
              entityStats.kind !== 'hero' &&
              entityStats.movePoints > 0
            const ariaLabel = `${meta.label ?? occupier.kind} occupying ${occupier.rowSpan} by ${occupier.columnSpan} cells from row ${occupier.minRow + 1}, column ${occupier.minColumn + 1}`
            const healthPercent = entityStats
              ? Math.max(0, Math.min(100, (entityStats.currentHealth / Math.max(1, entityStats.maxHealth)) * 100))
              : 0
            const healthHue = Math.round((healthPercent / 100) * 120)
            const combatTraces = entityStats?.combatNumbers
            const attackDamageClass = combatTraces ? numberDeltaClass(combatTraces.attackDamage.delta) : 'delta-neutral'
            const attackFlatBonusDamage = combatTraces?.attackFlatBonusDamage.effective ?? 0
            const attackFlatBonusDamageClass = combatTraces ? numberDeltaClass(combatTraces.attackFlatBonusDamage.delta) : 'delta-neutral'
            const armorClass = combatTraces ? numberDeltaClass(combatTraces.armor.delta) : 'delta-neutral'
            const abilityPowerClass = combatTraces ? numberDeltaClass(combatTraces.abilityPower.delta) : 'delta-neutral'
            const magicResistClass = combatTraces ? numberDeltaClass(combatTraces.magicResist.delta) : 'delta-neutral'
            const critLuckDelta = entityStats?.criticalChanceLuckDelta ?? 0
            const dodgeLuckDelta = entityStats?.dodgeChanceLuckDelta ?? 0
            const critClass = numberDeltaClass(critLuckDelta)
            const dodgeClass = numberDeltaClass((combatTraces?.dodgeChance.delta ?? 0) + dodgeLuckDelta)
            const adContributionSummary = combatTraces
              ? summarizeStatContributions(combatTraces.attackDamage.contributions)
              : { rows: [], hiddenCount: 0 }
            const apContributionSummary = combatTraces
              ? summarizeStatContributions(combatTraces.abilityPower.contributions)
              : { rows: [], hiddenCount: 0 }
            const attackFlatContributionSummary = combatTraces
              ? summarizeStatContributions(combatTraces.attackFlatBonusDamage.contributions)
              : { rows: [], hiddenCount: 0 }
            const armorContributionSummary = combatTraces
              ? summarizeStatContributions(combatTraces.armor.contributions)
              : { rows: [], hiddenCount: 0 }
            const mrContributionSummary = combatTraces
              ? summarizeStatContributions(combatTraces.magicResist.contributions)
              : { rows: [], hiddenCount: 0 }
            const dodgeContributionSummary = combatTraces
              ? summarizeStatContributions(combatTraces.dodgeChance.contributions)
              : { rows: [], hiddenCount: 0 }
            const hasAnyContributionRows =
              adContributionSummary.rows.length > 0 ||
              attackFlatContributionSummary.rows.length > 0 ||
              apContributionSummary.rows.length > 0 ||
              armorContributionSummary.rows.length > 0 ||
              mrContributionSummary.rows.length > 0 ||
              dodgeContributionSummary.rows.length > 0 ||
              critLuckDelta !== 0 ||
              dodgeLuckDelta !== 0

            return (
              <div
                key={`occupier:${occupier.entityId}`}
                className={`battle-slot occupied ${sideClass} ${ownerClass} ${hasMovesRemaining ? 'moves-remaining' : ''} ${isHighlightedTarget ? 'target-highlighted' : ''} ${isSelectedTarget ? 'target-selected' : ''} ${isSelectableTarget ? 'target-selectable' : ''}`.trim()}
                role="gridcell"
                aria-label={isSelectableTarget ? `${ariaLabel}. Selectable target.` : ariaLabel}
                style={{
                  gridRow: `${occupier.minRow + 1} / span ${occupier.rowSpan}`,
                  gridColumn: `${occupier.minColumn + 1} / span ${occupier.columnSpan}`,
                }}
                onClick={
                  isSelectableTarget
                    ? () => onSelectTargetEntityId(occupier.entityId)
                    : isSelectableEntity
                      ? () => onSelectEntityId(occupier.entityId)
                      : undefined
                }
                onKeyDown={
                  isSelectableTarget || isSelectableEntity
                    ? (event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault()
                          if (isSelectableTarget) {
                            onSelectTargetEntityId(occupier.entityId)
                            return
                          }
                          onSelectEntityId?.(occupier.entityId)
                        }
                      }
                    : undefined
                }
                tabIndex={isSelectableTarget || isSelectableEntity ? 0 : undefined}
              >
                {isSelectedTarget && isSelectableTarget ? (
                  <span className="target-check-icon" aria-hidden="true">
                    <Icon icon="game-icons:check-mark" />
                  </span>
                ) : null}

                {luckCloverCount > 0 && luckIsFavored !== null ? (
                  <span className={`entity-luck-clovers ${luckIsFavored ? 'favored' : 'unfavored'}`.trim()} aria-hidden="true">
                    {Array.from({ length: luckCloverCount }).map((_, index) => (
                      <Icon key={`luck-${occupier.entityId}-${index}`} icon={LUCK_VISUALS.iconId} className="entity-luck-clover" />
                    ))}
                  </span>
                ) : null}

                {hasMovesRemaining && entityStats ? (
                  <span className="entity-moves-badge" aria-hidden="true">
                    Moves {entityStats.movePoints}
                  </span>
                ) : null}

                <span className="hint-wrap" tabIndex={0}>
                  <Icon icon={meta.id} className="occupier-icon" aria-hidden="true" />
                  <span className="sr-only">{ariaLabel}</span>
                  <span className="hover-card battlefield-hover-card" role="tooltip">
                    <div className="battlefield-hover-header">
                      <strong>{entityStats?.displayName ?? meta.label ?? occupier.kind}</strong>
                      <span className="battlefield-hover-kicker">
                        {heroDetails ? 'Hero' : meta.label ?? occupier.kind}
                      </span>
                    </div>
                    {heroDetails ? (
                      <>
                        <div className="battlefield-hover-section">
                          <span className="hover-group-title">Passive</span>
                          <span>{heroDetails.passiveText}</span>
                        </div>
                        <div className="battlefield-hover-section">
                          <span className="hover-group-title">Basic Attack</span>
                          <span className="tooltip-main-line">{simplifyTooltipSummaryText(heroDetails.basicAttack.summaryText)}</span>
                          {shouldShowDetailedTooltips && heroDetails.basicAttack.summaryDetailText ? (
                            <span className="battle-tooltip-detail">
                              {splitDetailTextIntoLines(heroDetails.basicAttack.summaryDetailText).map((line, index) => (
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
                          {!shouldShowDetailedTooltips && heroDetails.basicAttack.summaryDetailText ? (
                            <span className="tooltip-shift-hint">Hold Shift or enable Details.</span>
                          ) : null}
                          <span className="battlefield-hover-note tooltip-row">
                            <strong className="tooltip-inline-label">Cost:</strong>
                            {heroDetails.basicAttack.moveCost} move{heroDetails.basicAttack.moveCost === 1 ? '' : 's'}
                            {' \u00b7 '}
                            <strong className="tooltip-inline-label">Type:</strong>
                            {heroDetails.basicAttack.damageType}
                          </span>
                        </div>
                      </>
                    ) : (
                      <>
                        {entityStats?.sourceCardSummary || entityStats?.sourceCardSummaryDetailText ? (
                          <div className="battlefield-hover-section">
                            {entityStats.sourceCardSummary ? <span className="tooltip-main-line">{simplifyTooltipSummaryText(entityStats.sourceCardSummary)}</span> : null}
                            {shouldShowDetailedTooltips && entityStats.sourceCardSummaryDetailText ? (
                              <span className="battle-tooltip-detail">
                                {splitDetailTextIntoLines(entityStats.sourceCardSummaryDetailText).map((line, index) => (
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
                            {!shouldShowDetailedTooltips && entityStats.sourceCardSummaryDetailText ? (
                              <span className="tooltip-shift-hint">Hold Shift or enable Details.</span>
                            ) : null}
                          </div>
                        ) : null}
                        {entityStats?.activeAbility ? (
                          <div className="battlefield-hover-section battlefield-hover-active-section">
                            <span className="hover-group-title">Active</span>
                            <span className="tooltip-main-line">{simplifyTooltipSummaryText(entityStats.activeAbility.summaryText)}</span>
                            {shouldShowDetailedTooltips && entityStats.activeAbility.summaryDetailText ? (
                              <span className="battle-tooltip-detail">
                                {splitDetailTextIntoLines(entityStats.activeAbility.summaryDetailText).map((line, index) => (
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
                            {!shouldShowDetailedTooltips && entityStats.activeAbility.summaryDetailText ? (
                              <span className="tooltip-shift-hint">Hold Shift or enable Details.</span>
                            ) : null}
                            <span className="battlefield-hover-cost-badge" aria-hidden="true">
                              {entityStats.activeAbility.moveCost}
                            </span>
                          </div>
                        ) : null}
                      </>
                    )}
                    {entityStats ? (
                      <div className="battlefield-hover-section">
                        <span className="hover-group-title">Vitals</span>
                        <div className="battlefield-hover-grid">
                          <span className="battlefield-hover-stat"><strong>HP</strong><em>{entityStats.currentHealth} / {entityStats.maxHealth}</em></span>
                          <span className="battlefield-hover-stat"><strong>Moves</strong><em>{entityStats.movePoints} / {entityStats.maxMovePoints}</em></span>
                        </div>
                        <span className="hover-group-title">Combat</span>
                        <div className="battlefield-hover-grid">
                          <span className={`battlefield-hover-stat ${attackDamageClass}`.trim()}>
                            <strong>AD</strong>
                            <em>{entityStats.attackDamage}</em>
                            {shouldShowDetailedTooltips && adContributionSummary.rows.length > 0 ? (
                              <span className="battlefield-hover-stat-sources">
                                {adContributionSummary.rows.map((row) => (
                                  <span key={`ad-${row.sourceId}`} className="battlefield-hover-stat-source-row">
                                    <span className="battlefield-hover-stat-source-name">{row.label}</span>
                                    <span className={`battlefield-hover-stat-source-delta ${numberDeltaClass(row.delta)}`.trim()}>
                                      {formatSignedDelta(row.delta)}
                                    </span>
                                  </span>
                                ))}
                                {adContributionSummary.hiddenCount > 0 ? (
                                  <span className="battlefield-hover-stat-source-more">+{adContributionSummary.hiddenCount} more</span>
                                ) : null}
                              </span>
                            ) : null}
                          </span>
                          <span className={`battlefield-hover-stat ${abilityPowerClass}`.trim()}>
                            <strong>AP</strong>
                            <em>{entityStats.abilityPower}</em>
                            {shouldShowDetailedTooltips && apContributionSummary.rows.length > 0 ? (
                              <span className="battlefield-hover-stat-sources">
                                {apContributionSummary.rows.map((row) => (
                                  <span key={`ap-${row.sourceId}`} className="battlefield-hover-stat-source-row">
                                    <span className="battlefield-hover-stat-source-name">{row.label}</span>
                                    <span className={`battlefield-hover-stat-source-delta ${numberDeltaClass(row.delta)}`.trim()}>
                                      {formatSignedDelta(row.delta)}
                                    </span>
                                  </span>
                                ))}
                                {apContributionSummary.hiddenCount > 0 ? (
                                  <span className="battlefield-hover-stat-source-more">+{apContributionSummary.hiddenCount} more</span>
                                ) : null}
                              </span>
                            ) : null}
                          </span>
                          {attackFlatBonusDamage !== 0 ? (
                            <span className={`battlefield-hover-stat ${attackFlatBonusDamageClass}`.trim()}>
                              <strong>ATK+</strong>
                              <em>{attackFlatBonusDamage}</em>
                              {shouldShowDetailedTooltips && attackFlatContributionSummary.rows.length > 0 ? (
                                <span className="battlefield-hover-stat-sources">
                                  {attackFlatContributionSummary.rows.map((row) => (
                                    <span key={`attack-flat-${row.sourceId}`} className="battlefield-hover-stat-source-row">
                                      <span className="battlefield-hover-stat-source-name">{row.label}</span>
                                      <span className={`battlefield-hover-stat-source-delta ${numberDeltaClass(row.delta)}`.trim()}>
                                        {formatSignedDelta(row.delta)}
                                      </span>
                                    </span>
                                  ))}
                                  {attackFlatContributionSummary.hiddenCount > 0 ? (
                                    <span className="battlefield-hover-stat-source-more">+{attackFlatContributionSummary.hiddenCount} more</span>
                                  ) : null}
                                </span>
                              ) : null}
                            </span>
                          ) : null}
                          <span className={`battlefield-hover-stat ${armorClass}`.trim()}>
                            <strong>Armor</strong>
                            <em>{entityStats.armor}</em>
                            {shouldShowDetailedTooltips && armorContributionSummary.rows.length > 0 ? (
                              <span className="battlefield-hover-stat-sources">
                                {armorContributionSummary.rows.map((row) => (
                                  <span key={`armor-${row.sourceId}`} className="battlefield-hover-stat-source-row">
                                    <span className="battlefield-hover-stat-source-name">{row.label}</span>
                                    <span className={`battlefield-hover-stat-source-delta ${numberDeltaClass(row.delta)}`.trim()}>
                                      {formatSignedDelta(row.delta)}
                                    </span>
                                  </span>
                                ))}
                                {armorContributionSummary.hiddenCount > 0 ? (
                                  <span className="battlefield-hover-stat-source-more">+{armorContributionSummary.hiddenCount} more</span>
                                ) : null}
                              </span>
                            ) : null}
                          </span>
                          <span className={`battlefield-hover-stat ${magicResistClass}`.trim()}>
                            <strong>MR</strong>
                            <em>{entityStats.magicResist}</em>
                            {shouldShowDetailedTooltips && mrContributionSummary.rows.length > 0 ? (
                              <span className="battlefield-hover-stat-sources">
                                {mrContributionSummary.rows.map((row) => (
                                  <span key={`mr-${row.sourceId}`} className="battlefield-hover-stat-source-row">
                                    <span className="battlefield-hover-stat-source-name">{row.label}</span>
                                    <span className={`battlefield-hover-stat-source-delta ${numberDeltaClass(row.delta)}`.trim()}>
                                      {formatSignedDelta(row.delta)}
                                    </span>
                                  </span>
                                ))}
                                {mrContributionSummary.hiddenCount > 0 ? (
                                  <span className="battlefield-hover-stat-source-more">+{mrContributionSummary.hiddenCount} more</span>
                                ) : null}
                              </span>
                            ) : null}
                          </span>
                          <span className={`battlefield-hover-stat ${critClass}`.trim()}>
                            <strong>Crit</strong>
                            <em>{formatChancePercent(entityStats.effectiveCriticalChance)} x{entityStats.criticalMultiplier.toFixed(2)}</em>
                            {shouldShowDetailedTooltips && critLuckDelta !== 0 ? (
                              <span className="battlefield-hover-stat-sources">
                                <span className="battlefield-hover-stat-source-row">
                                  <span className="battlefield-hover-stat-source-name">Luck</span>
                                  <span className={`battlefield-hover-stat-source-delta ${numberDeltaClass(critLuckDelta)}`.trim()}>
                                    {formatSignedDelta(critLuckDelta * 100)}%
                                  </span>
                                </span>
                              </span>
                            ) : null}
                          </span>
                          <span className={`battlefield-hover-stat ${dodgeClass}`.trim()}>
                            <strong>Dodge</strong>
                            <em>{formatChancePercent(entityStats.effectiveDodgeChance)}</em>
                            {shouldShowDetailedTooltips && (dodgeContributionSummary.rows.length > 0 || dodgeLuckDelta !== 0) ? (
                              <span className="battlefield-hover-stat-sources">
                                {dodgeContributionSummary.rows.map((row) => (
                                  <span key={`dodge-${row.sourceId}`} className="battlefield-hover-stat-source-row">
                                    <span className="battlefield-hover-stat-source-name">{row.label}</span>
                                    <span className={`battlefield-hover-stat-source-delta ${numberDeltaClass(row.delta)}`.trim()}>
                                      {formatSignedDelta(row.delta * 100)}%
                                    </span>
                                  </span>
                                ))}
                                {dodgeLuckDelta !== 0 ? (
                                  <span className="battlefield-hover-stat-source-row">
                                    <span className="battlefield-hover-stat-source-name">Luck</span>
                                    <span className={`battlefield-hover-stat-source-delta ${numberDeltaClass(dodgeLuckDelta)}`.trim()}>
                                      {formatSignedDelta(dodgeLuckDelta * 100)}%
                                    </span>
                                  </span>
                                ) : null}
                                {dodgeContributionSummary.hiddenCount > 0 ? (
                                  <span className="battlefield-hover-stat-source-more">+{dodgeContributionSummary.hiddenCount} more</span>
                                ) : null}
                              </span>
                            ) : null}
                          </span>
                        </div>
                        {!shouldShowDetailedTooltips && hasAnyContributionRows ? (
                          <span className="tooltip-shift-hint">Hold Shift or enable Details to see stat sources.</span>
                        ) : null}
                      </div>
                    ) : null}
                  </span>
                </span>

                {entityStats ? (
                  <>
                    <span className="entity-stats-row" aria-hidden="true">
                      <span className={`entity-stat-pill ${attackDamageClass}`.trim()}>
                        <Icon icon="game-icons:broadsword" />
                        {entityStats.attackDamage}
                      </span>
                      {attackFlatBonusDamage !== 0 ? (
                        <span className={`entity-stat-pill ${attackFlatBonusDamageClass}`.trim()}>
                          <Icon icon="game-icons:crossed-swords" />
                          +{attackFlatBonusDamage}
                        </span>
                      ) : null}
                      <span className={`entity-stat-pill ${armorClass}`.trim()}>
                        <Icon icon="game-icons:checked-shield" />
                        {entityStats.armor}
                      </span>
                    </span>
                    <span className="entity-healthbar" aria-hidden="true">
                      <span
                        className="entity-healthbar-fill"
                        style={{
                          width: `${healthPercent}%`,
                          background: `linear-gradient(90deg, hsl(${healthHue} 72% 44%), hsl(${healthHue} 78% 56%))`,
                        }}
                      />
                      <span className="entity-healthbar-value">
                        {entityStats.currentHealth}/{entityStats.maxHealth}
                      </span>
                    </span>
                  </>
                ) : null}
              </div>
            )
          })}
      </div>
    </section>
  )
}
