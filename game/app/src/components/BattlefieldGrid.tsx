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

  return (
    <section className="card battlefield-card" aria-label="Battlefield board">
      <h2>Battlefield</h2>
      <div
        className="battle-grid"
        role="grid"
        aria-label="Battlefield cells"
        style={{
          gridTemplateColumns: `repeat(${preview.battlefield.columns}, minmax(0, 1fr))`,
        }}
      >
        {displayCells.map((cell) => {
          const sideClass = cell.displayRow < halfRows ? 'north' : 'south'
          const ownerClass =
            cell.ownerHeroEntityId === selfId
              ? 'owner-self'
              : cell.ownerHeroEntityId === enemyId
                ? 'owner-enemy'
                : ''
          const kind = cell.occupantKind
          const meta = kind ? ENTITY_ICON_META[kind] : null
          const rowLabel = cell.displayRow + 1
          const colLabel = cell.column + 1
          const ariaLabel = kind
            ? `${meta?.label ?? kind} at row ${rowLabel}, column ${colLabel}`
            : `Empty cell at row ${rowLabel}, column ${colLabel}`

          return (
            <div
              key={`${cell.displayRow}:${cell.column}`}
              className={`battle-cell ${sideClass} ${ownerClass}`.trim()}
              role="gridcell"
              aria-label={ariaLabel}
            >
              {kind ? (
                <span className="hint-wrap" tabIndex={0}>
                  <Icon icon={ENTITY_ICON_META[kind].id} className="cell-icon" aria-hidden="true" />
                  <span className="sr-only">{ariaLabel}</span>
                  <span className="hover-card" role="tooltip">
                    <strong>{meta?.label ?? kind}</strong>
                    <span>{meta?.description ?? 'Unit on battlefield.'}</span>
                  </span>
                </span>
              ) : (
                <span className="cell-empty" aria-hidden="true" />
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
