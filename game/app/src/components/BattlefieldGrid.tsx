import { Icon } from '@iconify/react/offline'
import type { AppBattlePreview } from '../game-client.ts'
import { ENTITY_ICON_META } from '../data/visual-metadata.ts'

type BattlefieldGridProps = {
  preview: AppBattlePreview
  selfId: string
  enemyId: string
  shouldFlipRows: boolean
  highlightedTargetEntityIds?: string[]
  selectedTargetEntityId?: string | null
  onSelectTargetEntityId?: (entityId: string) => void
  onSelectEntityId?: (entityId: string) => void
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
          gridTemplateColumns: `repeat(${preview.battlefield.columns}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${preview.battlefield.rows}, 58px)`,
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
                    ? `Empty selectable placement cell at row ${rowLabel}, column ${colLabel}`
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
                <span className="cell-empty" aria-hidden="true" />
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
            const ariaLabel = `${meta.label ?? occupier.kind} occupying ${occupier.rowSpan} by ${occupier.columnSpan} cells from row ${occupier.minRow + 1}, column ${occupier.minColumn + 1}`
            const healthPercent = entityStats
              ? Math.max(0, Math.min(100, (entityStats.currentHealth / Math.max(1, entityStats.maxHealth)) * 100))
              : 0

            return (
              <div
                key={`occupier:${occupier.entityId}`}
                className={`battle-slot occupied ${sideClass} ${ownerClass} ${isHighlightedTarget ? 'target-highlighted' : ''} ${isSelectedTarget ? 'target-selected' : ''} ${isSelectableTarget ? 'target-selectable' : ''}`.trim()}
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
                <span className="hint-wrap" tabIndex={0}>
                  <Icon icon={meta.id} className="occupier-icon" aria-hidden="true" />
                  <span className="sr-only">{ariaLabel}</span>
                  <span className="hover-card battlefield-hover-card" role="tooltip">
                    <strong>{entityStats?.displayName ?? meta.label ?? occupier.kind}</strong>
                    <span>{meta.description ?? 'Unit on battlefield.'}</span>
                    {entityStats ? (
                      <>
                        <span className="hover-group-title">Vitals</span>
                        <span>HP: {entityStats.currentHealth} / {entityStats.maxHealth}</span>
                        <span>Moves: {entityStats.movePoints} / {entityStats.maxMovePoints}</span>
                        <span className="hover-group-title">Combat</span>
                        <span>AD: {entityStats.attackDamage} | AP: {entityStats.abilityPower}</span>
                        <span>Armor: {entityStats.armor} | MR: {entityStats.magicResist}</span>
                        <span>Crit: {Math.round(entityStats.criticalChance * 100)}% | Dodge: {Math.round(entityStats.dodgeChance * 100)}%</span>
                      </>
                    ) : null}
                  </span>
                </span>

                {entityStats ? (
                  <>
                    <span className="entity-stats-row" aria-hidden="true">
                      <span className="entity-stat-pill">
                        <Icon icon="game-icons:broadsword" />
                        {Math.round(entityStats.attackDamage)}
                      </span>
                      <span className="entity-stat-pill">
                        <Icon icon="game-icons:checked-shield" />
                        {entityStats.armor}
                      </span>
                    </span>
                    <span className="entity-healthbar" aria-hidden="true">
                      <span className="entity-healthbar-fill" style={{ width: `${healthPercent}%` }} />
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
