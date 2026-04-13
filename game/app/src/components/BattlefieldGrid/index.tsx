import { Icon } from '@iconify/react/offline'
import './style.css'
import type { AppBattlePreview } from '../../game-client'
import { CARD_ICON_META, ENTITY_ICON_META, LUCK_VISUALS } from '../../data/visual-metadata'
import {
  numberDeltaClass,
  getVisualIconStyle,
  formatPreviewNumber,
} from '../../utils/game-client-format'

type BattlefieldGridProps = {
  preview: AppBattlePreview
  selfId: string
  enemyId: string
  shouldFlipRows: boolean
  availableInteractionEntityIds?: string[]
  highlightedTargetEntityIds?: string[]
  selectedTargetEntityId?: string | null
  selectedEntityConfirmId?: string | null
  onSelectTargetEntityId?: (entityId: string) => void
  onSelectEntityId?: (entityId: string) => void
  onInspectEntity?: (entityId: string) => void
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
    availableInteractionEntityIds = [],
    highlightedTargetEntityIds = [],
    selectedTargetEntityId,
    selectedEntityConfirmId,
    onSelectTargetEntityId,
    onSelectEntityId,
    onInspectEntity,
    highlightedPlacementPositions = [],
    selectedPlacementPosition,
    onSelectPlacementPosition,
  } = props
  const halfRows = Math.floor(preview.battlefield.rows / 2)
  const highlightedSet = new Set(highlightedTargetEntityIds)
  const availableInteractionSet = new Set(availableInteractionEntityIds)
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
            const isSelectedConfirmEntity = selectedEntityConfirmId === occupier.entityId
            const isSelectableTarget = !!onSelectTargetEntityId && isHighlightedTarget
            const isSelectableEntity = !!onSelectEntityId
            const hasAvailableInteraction = availableInteractionSet.has(occupier.entityId)
            const showInteractionAvailable = hasAvailableInteraction && !isSelectedConfirmEntity
            const ownerClass =
              occupier.ownerHeroEntityId === selfId
                ? 'owner-self'
                : occupier.ownerHeroEntityId === enemyId
                  ? 'owner-enemy'
                  : ''
            const entityStats = preview.battlefield.entitiesById[occupier.entityId]
            const cardMeta = entityStats?.sourceCardDefinitionId
              ? CARD_ICON_META[entityStats.sourceCardDefinitionId]
              : undefined
            const meta = cardMeta ?? ENTITY_ICON_META[occupier.kind]

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
            const activeListeners = entityStats?.activeListeners ?? []
            const reflectListener = activeListeners.find((listener) => /reflect/i.test(listener.listenerId) || /reflect/i.test(listener.label))
            const activeListenerBadgeText = activeListeners.length === 1
              ? reflectListener
                ? 'Reflect Ready'
                : 'Reactive'
              : `Reactive ${activeListeners.length}`
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

            return (
              <div
                key={`occupier:${occupier.entityId}`}
                className={`battle-slot occupied ${sideClass} ${ownerClass} ${showInteractionAvailable ? 'interaction-available' : ''} ${isSelectedConfirmEntity ? 'source-armed' : ''} ${isHighlightedTarget ? 'target-highlighted' : ''} ${isSelectedTarget ? 'target-selected' : ''} ${isSelectableTarget ? 'target-selectable' : ''}`.trim()}
                role="gridcell"
                aria-label={isSelectableTarget ? `${ariaLabel}. Selectable target.` : ariaLabel}
                style={{
                  gridRow: `${occupier.minRow + 1} / span ${occupier.rowSpan}`,
                  gridColumn: `${occupier.minColumn + 1} / span ${occupier.columnSpan}`,
                }}
                onClick={() => {
                  onInspectEntity?.(occupier.entityId)
                  if (isSelectableTarget) {
                    onSelectTargetEntityId(occupier.entityId)
                  } else if (isSelectableEntity) {
                    onSelectEntityId(occupier.entityId)
                  }
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    onInspectEntity?.(occupier.entityId)
                    if (isSelectableTarget) {
                      onSelectTargetEntityId(occupier.entityId)
                    } else if (isSelectableEntity) {
                      onSelectEntityId?.(occupier.entityId)
                    }
                  }
                }}
                tabIndex={0}
              >
                {isSelectedTarget && isSelectableTarget ? (
                  <span className="target-check-icon" aria-hidden="true">
                    <Icon icon="game-icons:check-mark" />
                  </span>
                ) : null}

                {isSelectedConfirmEntity ? (
                  <span className="source-armed-badge" aria-hidden="true">Armed</span>
                ) : null}

                {luckCloverCount > 0 && luckIsFavored !== null ? (
                  <span className={`entity-luck-clovers ${luckIsFavored ? 'favored' : 'unfavored'}`.trim()} aria-hidden="true">
                    {Array.from({ length: luckCloverCount }).map((_, index) => (
                      <Icon key={`luck-${occupier.entityId}-${index}`} icon={LUCK_VISUALS.iconId} className="entity-luck-clover" />
                    ))}
                  </span>
                ) : null}

                {hasMovesRemaining && entityStats ? (
                  <span className="entity-moves-badge" aria-label={`${entityStats.movePoints} moves remaining`} aria-hidden="true">
                    <Icon icon="game-icons:boot-prints" className="entity-badge-icon" aria-hidden="true" />
                    {entityStats.movePoints}
                  </span>
                ) : null}

                {activeListeners.length > 0 ? (
                  <span className="entity-listener-badge" title={activeListenerBadgeText} aria-hidden="true">
                    <Icon icon="game-icons:cycle" className="entity-badge-icon" aria-hidden="true" />
                    {activeListeners.length > 1 ? activeListeners.length : null}
                  </span>
                ) : null}

                <span className="hint-wrap entity-icon-hint" tabIndex={-1} aria-hidden="true">
                  <Icon icon={meta.id} className="occupier-icon" style={getVisualIconStyle(meta)} aria-hidden="true" />
                  <span className="hover-card entity-name-hover" role="tooltip">{entityStats?.displayName ?? meta.label ?? occupier.kind}</span>
                </span>

                {entityStats ? (
                  <>
                    <span className="entity-stats-row" aria-hidden="true">
                      <span className={`entity-stat-pill ${attackDamageClass}`.trim()}>
                        <Icon icon="game-icons:broadsword" />
                        {formatPreviewNumber(entityStats.statLayers.attackDamage.permanent + entityStats.statLayers.attackDamage.bonus)}
                      </span>
                      {attackFlatBonusDamage !== 0 ? (
                        <span className={`entity-stat-pill ${attackFlatBonusDamageClass}`.trim()}>
                          <Icon icon="game-icons:crossed-swords" />
                          +{attackFlatBonusDamage}
                        </span>
                      ) : null}
                      <span className={`entity-stat-pill ${armorClass}`.trim()}>
                        <Icon icon="game-icons:checked-shield" />
                        {formatPreviewNumber(entityStats.statLayers.armor.permanent + entityStats.statLayers.armor.bonus)}
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
