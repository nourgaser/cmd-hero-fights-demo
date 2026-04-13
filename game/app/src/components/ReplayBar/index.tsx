type ReplayBarProps = {
  isOpen: boolean
  replayBarPosition: { x: number; y: number }
  onMouseDown: (e: React.MouseEvent | React.TouchEvent) => void
  onResetPosition: () => void
  onOpenHistory: () => void
  onClose: () => void
  renderTimelineControls: (options?: { showPlaybackControls?: boolean }) => React.ReactNode
  renderTimelineSnapshotList: () => React.ReactNode
}

export function ReplayBar(props: ReplayBarProps) {
  const {
    isOpen,
    replayBarPosition,
    onMouseDown,
    onResetPosition,
    onOpenHistory,
    onClose,
    renderTimelineControls,
    renderTimelineSnapshotList,
  } = props

  if (!isOpen) return null

  return (
    <div
      className="replay-bar-overlay"
      role="presentation"
      style={{
        transform: `translate(${replayBarPosition.x}px, ${replayBarPosition.y}px)`,
      }}
    >
      <section
        className="replay-bar"
        aria-label="Replay mode timeline"
      >
        <header
          className="replay-bar-head"
          onMouseDown={onMouseDown}
          onTouchStart={onMouseDown}
          style={{ cursor: 'grab', touchAction: 'none' }}
        >
          <strong>Replay Mode</strong>
          <div className="replay-bar-head-actions">
            <button
              type="button"
              onClick={onResetPosition}
              title="Reset replay bar to default position"
              aria-label="Reset replay bar position"
            >
              Reset Pos
            </button>
            <button
              type="button"
              onClick={onOpenHistory}
            >
              Open History
            </button>
            <button type="button" onClick={onClose}>
              Close
            </button>
          </div>
        </header>
        <div className="history-snapshot-controls replay-snapshot-controls">
          {renderTimelineControls({ showPlaybackControls: true })}
        </div>
        <p className="history-shortcuts replay-shortcuts">
          Replay bar mode: interact with the board as usual. Actions from older steps auto-branch.
        </p>
        {renderTimelineSnapshotList()}
      </section>
    </div>
  )
}
