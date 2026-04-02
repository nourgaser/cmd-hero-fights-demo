import { useMemo, useState } from 'react'
import { JsonView, allExpanded, defaultStyles } from 'react-json-view-lite'
import { Rnd } from 'react-rnd'
import 'react-json-view-lite/dist/index.css'

type DebugStatePanelProps = {
  state: Record<string, unknown> | unknown[]
}

export function DebugStatePanel(props: DebugStatePanelProps) {
  const { state } = props
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [expandAll, setExpandAll] = useState(false)

  const copiedState = useMemo(() => JSON.stringify(state, null, 2), [state])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(copiedState)
    } catch {
      // No-op in prototype if clipboard is unavailable.
    }
  }

  return (
    <Rnd
      default={{ x: 12, y: 12, width: 360, height: 560 }}
      minWidth={300}
      minHeight={isCollapsed ? 58 : 220}
      bounds="window"
      dragHandleClassName="debug-panel-header"
      enableResizing={!isCollapsed}
      className={isCollapsed ? 'debug-panel debug-panel-collapsed' : 'debug-panel'}
    >
      <aside aria-label="Debug state panel">
        <header className="debug-panel-header">
          <strong>Debug State</strong>
          <div className="debug-panel-actions">
            <button type="button" onClick={() => setExpandAll((value) => !value)}>
              {expandAll ? 'Collapse All' : 'Expand All'}
            </button>
            <button type="button" onClick={handleCopy}>
              Copy JSON
            </button>
            <button type="button" onClick={() => setIsCollapsed((value) => !value)}>
              {isCollapsed ? 'Open' : 'Hide'}
            </button>
          </div>
        </header>

        {!isCollapsed ? (
          <div className="debug-tree-wrap">
            <JsonView
              data={state}
              style={defaultStyles}
              shouldExpandNode={
                expandAll
                  ? allExpanded
                  : (level) => level < 2
              }
            />
          </div>
        ) : null}
      </aside>
    </Rnd>
  )
}
