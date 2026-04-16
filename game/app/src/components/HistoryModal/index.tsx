import { useState } from 'react'
import type { AppActionHistoryEntry, AppBattleSnapshot } from '../../game-client'
import type { ReplayNavigationDirection } from '../../app-shell/runtime-utils'
import { renderTextWithHighlightedNumbers } from '../../utils/render-numeric-text'

type HistoryModalProps = {
  isOpen: boolean
  snapshots: AppBattleSnapshot[]
  history: AppActionHistoryEntry[]
  activeActionSnapshotId: number | null
  onJumpToSnapshot: (snapshotId: number) => void
  onClose: () => void
  onOpenReplayBar: () => void
  onCopyHistoryJson: () => void
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
    onJumpToSnapshot,
    onClose,
    onOpenReplayBar,
    onCopyHistoryJson,
    renderTimelineControls,
    renderTimelineSnapshotList,
  } = props
  const [expandedHistoryEntryIds, setExpandedHistoryEntryIds] = useState<Record<number, boolean>>({})

  if (!isOpen) return null

  const activeHistoryLength = history.filter((entry) => {
    if (activeActionSnapshotId === null) {
      return true
    }
    return entry.postSnapshotId <= activeActionSnapshotId
  }).length

  const renderHistoryRow = (entry: AppActionHistoryEntry, index: number) => {
    const isActive = entry.postSnapshotId === activeActionSnapshotId
    const isExpanded = expandedHistoryEntryIds[entry.id] ?? false
    const eventDisplays = entry.eventTrail
    const handleJump = () => onJumpToSnapshot(entry.postSnapshotId)

    return (
      <li
        key={entry.id}
        className={`history-entry ${entry.success ? 'history-entry-success' : 'history-entry-failure'} ${isActive ? 'history-entry-active' : ''}`}
        role="button"
        tabIndex={0}
        onClick={handleJump}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            handleJump()
          }
        }}
        aria-label={`Jump to step ${activeHistoryLength - index}`}
      >
        <button
          type="button"
          className="history-entry-jump-button"
          onClick={(event) => {
            event.stopPropagation()
            handleJump()
          }}
          aria-label={`Jump to step ${activeHistoryLength - index}`}
          title="Jump to this step"
        >
          Jump
        </button>
        <div className="history-entry-head">
          <strong>Turn {entry.turnNumber}</strong>
          <span>{entry.actionKind}</span>
          <span>{entry.success ? 'Success' : 'Failed'}</span>
        </div>
        <p className="history-entry-message">{entry.resultMessage}</p>
        <div className="history-entry-actions">
          <button
            type="button"
            className="history-entry-detail-button"
            onClick={(event) => {
              event.stopPropagation()
              setExpandedHistoryEntryIds((current) => ({ ...current, [entry.id]: !isExpanded }))
            }}
            aria-expanded={isExpanded}
            disabled={eventDisplays.length === 0}
          >
            {isExpanded ? 'Hide details' : 'Details'}
          </button>
        </div>
        {isExpanded && eventDisplays.length > 0 ? (
          <ul className="history-entry-events" aria-label="Action event chain">
            {eventDisplays.map((event) => (
              <li key={event.sequence} className="history-entry-event">
                <strong>{renderTextWithHighlightedNumbers(event.summary, 'history-entry-number')}</strong>
                {event.detail ? <span>{renderTextWithHighlightedNumbers(event.detail, 'history-entry-number')}</span> : null}
              </li>
            ))}
          </ul>
        ) : null}
        <div className="history-entry-meta">
          <span>Step: #{activeHistoryLength - index}</span>
          <span>Actor: {entry.actorHeroName}</span>
          <span>Events: {entry.eventCount}</span>
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
              onClick={onCopyHistoryJson}
            >
              Copy JSON
            </button>
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
