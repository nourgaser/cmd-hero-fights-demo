import type { AppActionHistoryEntry, AppBattleSnapshot } from '../../game-client'
import type { ReplayNavigationDirection } from '../../app-shell/runtime-utils'

type HistoryModalProps = {
  isOpen: boolean
  snapshots: AppBattleSnapshot[]
  history: AppActionHistoryEntry[]
  activeActionSnapshotId: number | null
  onClose: () => void
  onOpenReplayBar: () => void
  onBranchFromSnapshot: () => void
  onCopyReplayPayload: () => void
  onValidateReplayDeterminism: () => void
  queueReplayTimelineStep: (direction: ReplayNavigationDirection) => void
  renderTimelineControls: (options?: { showPlaybackControls?: boolean }) => React.ReactNode
  renderTimelineSnapshotList: () => React.ReactNode
}

export function HistoryModal(props: HistoryModalProps) {
  const {
    isOpen,
    snapshots,
    history,
    activeActionSnapshotId,
    onClose,
    onOpenReplayBar,
    renderTimelineControls,
    renderTimelineSnapshotList,
  } = props

  if (!isOpen) return null

  const renderHistoryRow = (entry: AppActionHistoryEntry) => {
    return (
      <li key={entry.id} className={`history-entry ${entry.success ? 'history-entry-success' : 'history-entry-failure'}`}>
        <div className="history-entry-head">
          <strong>Turn {entry.turnNumber}</strong>
          <span>{entry.actionKind}</span>
          <span>{entry.success ? 'Success' : 'Failed'}</span>
        </div>
        <p className="history-entry-message">{entry.resultMessage}</p>
        <div className="history-entry-meta">
          <span>Actor: {entry.actorHeroEntityId}</span>
          <span>Events: {entry.eventCount}</span>
          <span>Checkpoint: #{entry.postSnapshotId}</span>
        </div>
      </li>
    )
  }

  return (
    <div
      className="history-modal-overlay"
      onClick={onClose}
      role="presentation"
    >
      <section
        className="history-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Action history"
        onClick={(event) => {
          event.stopPropagation()
        }}
      >
        <header className="history-modal-head">
          <strong>Action History</strong>
          <div className="history-modal-head-actions">
            <button
              type="button"
              onClick={onOpenReplayBar}
            >
              Open Replay Bar
            </button>
            <button type="button" onClick={onClose}>
              Close
            </button>
          </div>
        </header>
        <div className="history-modal-body">
          <div className="history-snapshot-controls">{renderTimelineControls()}</div>
          <p className="history-shortcuts">
            H cycle (closed/fullscreen/overlay), Esc close, Home first, End latest, Left/Right navigate, B branch, C copy, V validate
          </p>
          {snapshots.length === 0 ? (
            <p className="history-empty">No actions resolved yet.</p>
          ) : (
            <>
              <div className="history-log-scroll">
                {(() => {
                  const filteredHistoryEntries = history
                    .filter((entry) => {
                      if (activeActionSnapshotId === null) {
                        return true
                      }
                      return entry.postSnapshotId <= activeActionSnapshotId
                    })
                    .reverse()
                  return <ol className="history-list">{filteredHistoryEntries.map(renderHistoryRow)}</ol>
                })()}
              </div>
              {renderTimelineSnapshotList()}
            </>
          )}
        </div>
      </section>
    </div>
  )
}
