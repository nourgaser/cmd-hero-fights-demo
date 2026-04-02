import { Icon } from '@iconify/react/offline'
import type { AppBattlePreview } from '../game-client.ts'
import { ENTITY_ICON_META } from '../data/visual-metadata.ts'

type BattlefieldGridProps = {
  preview: AppBattlePreview
  selfId: string
  enemyId: string
  shouldFlipRows: boolean
}

export function BattlefieldGrid(props: BattlefieldGridProps) {
  const { preview, selfId, enemyId, shouldFlipRows } = props
  const halfRows = Math.floor(preview.battlefield.rows / 2)

  const displayCells = preview.battlefield.cells
    .map((cell) => {
      const displayRow = shouldFlipRows ? preview.battlefield.rows - 1 - cell.row : cell.row
      return {
        ...cell,
        displayRow,
      }
    })
    .sort((a, b) => a.displayRow - b.displayRow || a.column - b.column)

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

  const occupiedPositions = new Set<string>()
  const occupierBlocks = Array.from(occupiersByEntityId.values())
    .map((occupier) => {
      const rows = occupier.cells.map((entry) => entry.row)
      const columns = occupier.cells.map((entry) => entry.column)
      const minRow = Math.min(...rows)
      const maxRow = Math.max(...rows)
      const minColumn = Math.min(...columns)
      const maxColumn = Math.max(...columns)

      for (const part of occupier.cells) {
        occupiedPositions.add(`${part.row}:${part.column}`)
      }

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

  const emptySlots = [] as Array<{ row: number; column: number }>
  for (let row = 0; row < preview.battlefield.rows; row += 1) {
    for (let column = 0; column < preview.battlefield.columns; column += 1) {
      const key = `${row}:${column}`
      if (!occupiedPositions.has(key)) {
        emptySlots.push({ row, column })
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
            const sideClass = slot.row < halfRows ? 'north' : 'south'
            const rowLabel = slot.row + 1
            const colLabel = slot.column + 1

            return (
              <div
                key={`empty:${slot.row}:${slot.column}`}
                className={`battle-slot ${sideClass}`}
                role="gridcell"
                aria-label={`Empty cell at row ${rowLabel}, column ${colLabel}`}
                style={{
                  gridRow: `${slot.row + 1} / span 1`,
                  gridColumn: `${slot.column + 1} / span 1`,
                }}
              >
                <span className="cell-empty" aria-hidden="true" />
              </div>
            )
          })}

          {occupierBlocks.map((occupier) => {
            const sideClass = occupier.minRow < halfRows ? 'north' : 'south'
            const ownerClass =
              occupier.ownerHeroEntityId === selfId
                ? 'owner-self'
                : occupier.ownerHeroEntityId === enemyId
                  ? 'owner-enemy'
                  : ''
            const meta = ENTITY_ICON_META[occupier.kind]
            const ariaLabel = `${meta.label ?? occupier.kind} occupying ${occupier.rowSpan} by ${occupier.columnSpan} cells from row ${occupier.minRow + 1}, column ${occupier.minColumn + 1}`

            return (
              <div
                key={`occupier:${occupier.entityId}`}
                className={`battle-slot occupied ${sideClass} ${ownerClass}`.trim()}
                role="gridcell"
                aria-label={ariaLabel}
                style={{
                  gridRow: `${occupier.minRow + 1} / span ${occupier.rowSpan}`,
                  gridColumn: `${occupier.minColumn + 1} / span ${occupier.columnSpan}`,
                }}
              >
                <span className="hint-wrap" tabIndex={0}>
                  <Icon icon={meta.id} className="occupier-icon" aria-hidden="true" />
                  <span className="sr-only">{ariaLabel}</span>
                  <span className="hover-card" role="tooltip">
                    <strong>{meta.label ?? occupier.kind}</strong>
                    <span>{meta.description ?? 'Unit on battlefield.'}</span>
                  </span>
                </span>
              </div>
            )
          })}
      </div>
    </section>
  )
}
