import { useMemo, useState } from 'react'
import { JsonView, allExpanded, defaultStyles } from 'react-json-view-lite'
import { Rnd } from 'react-rnd'
import 'react-json-view-lite/dist/index.css'

type DebugStatePanelProps = {
  state: Record<string, unknown> | unknown[]
}

const DEBUG_PANEL_STORAGE_KEY = 'cmd-hero:debug-panel-state'
const DEFAULT_LAYOUT = { x: 12, y: 12, width: 360, height: 560 }

type DebugPanelPersistedState = {
  x: number
  y: number
  width: number
  height: number
  isCollapsed: boolean
  expandAll: boolean
}

const loadPersistedState = (): DebugPanelPersistedState => {
  if (typeof window === 'undefined') {
    return { ...DEFAULT_LAYOUT, isCollapsed: false, expandAll: false }
  }

  const saved = window.localStorage.getItem(DEBUG_PANEL_STORAGE_KEY)
  if (!saved) {
    return { ...DEFAULT_LAYOUT, isCollapsed: false, expandAll: false }
  }

  try {
    const parsed = JSON.parse(saved) as Partial<DebugPanelPersistedState>
    return {
      x: typeof parsed.x === 'number' ? parsed.x : DEFAULT_LAYOUT.x,
      y: typeof parsed.y === 'number' ? parsed.y : DEFAULT_LAYOUT.y,
      width: typeof parsed.width === 'number' ? parsed.width : DEFAULT_LAYOUT.width,
      height: typeof parsed.height === 'number' ? parsed.height : DEFAULT_LAYOUT.height,
      isCollapsed: typeof parsed.isCollapsed === 'boolean' ? parsed.isCollapsed : false,
      expandAll: typeof parsed.expandAll === 'boolean' ? parsed.expandAll : false,
    }
  } catch {
    return { ...DEFAULT_LAYOUT, isCollapsed: false, expandAll: false }
  }
}

const persistState = (state: DebugPanelPersistedState) => {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(DEBUG_PANEL_STORAGE_KEY, JSON.stringify(state))
}

export function DebugStatePanel(props: DebugStatePanelProps) {
  const { state } = props
  const [persistedState, setPersistedState] = useState<DebugPanelPersistedState>(() => loadPersistedState())

  const { x, y, width, height, isCollapsed, expandAll } = persistedState

  const copiedState = useMemo(() => JSON.stringify(state, null, 2), [state])

  const updateState = (updater: (current: DebugPanelPersistedState) => DebugPanelPersistedState) => {
    setPersistedState((current) => {
      const next = updater(current)
      persistState(next)
      return next
    })
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(copiedState)
    } catch {
      // No-op in prototype if clipboard is unavailable.
    }
  }

  return (
    <Rnd
      position={{ x, y }}
      size={{ width, height }}
      minWidth={300}
      minHeight={isCollapsed ? 58 : 220}
      bounds="window"
      dragHandleClassName="debug-panel-header"
      enableResizing={!isCollapsed}
      className={isCollapsed ? 'debug-panel debug-panel-collapsed' : 'debug-panel'}
      onDragStop={(_event, data) => {
        updateState((current) => ({ ...current, x: data.x, y: data.y }))
      }}
      onResizeStop={(_event, _direction, ref, _delta, position) => {
        updateState((current) => ({
          ...current,
          x: position.x,
          y: position.y,
          width: Number.parseFloat(ref.style.width),
          height: Number.parseFloat(ref.style.height),
        }))
      }}
    >
      <aside aria-label="Debug state panel">
        <header className="debug-panel-header">
          <strong>Debug State</strong>
          <div className="debug-panel-actions">
            <button
              type="button"
              onClick={() => updateState((current) => ({ ...current, expandAll: !current.expandAll }))}
            >
              {expandAll ? 'Collapse All' : 'Expand All'}
            </button>
            <button type="button" onClick={handleCopy}>
              Copy JSON
            </button>
            <button
              type="button"
              onClick={() => updateState((current) => ({ ...current, isCollapsed: !current.isCollapsed }))}
            >
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
