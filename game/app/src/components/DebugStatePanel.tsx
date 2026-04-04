import { useEffect, useMemo, useState } from 'react'
import { JsonView, allExpanded, defaultStyles } from 'react-json-view-lite'
import { Rnd } from 'react-rnd'
import 'react-json-view-lite/dist/index.css'
import type { GameBootstrapConfig } from '../data/game-bootstrap.ts'

type DebugStatePanelProps = {
  state: Record<string, unknown> | unknown[]
  bootstrapConfig: GameBootstrapConfig
  seed: string
  onSeedChange: (seed: string) => void
  onBootstrapConfigChange: (config: GameBootstrapConfig) => void
  onHardReset: () => void
}

const DEBUG_PANEL_STORAGE_KEY = 'cmd-hero:debug-panel-state'
const DEFAULT_LAYOUT = { x: 12, y: 12, width: 360, height: 560 }
const COLLAPSED_BUBBLE_SIZE = 56

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
  const { state, bootstrapConfig, seed, onSeedChange, onBootstrapConfigChange, onHardReset } = props
  const [persistedState, setPersistedState] = useState<DebugPanelPersistedState>(() => loadPersistedState())
  const [draftSeed, setDraftSeed] = useState(seed)
  const [editorMode, setEditorMode] = useState<'form' | 'json'>('form')
  const [draftBootstrapConfig, setDraftBootstrapConfig] = useState<GameBootstrapConfig>(bootstrapConfig)
  const [draftBootstrapConfigText, setDraftBootstrapConfigText] = useState(
    () => JSON.stringify(bootstrapConfig, null, 2),
  )
  const [bootstrapConfigError, setBootstrapConfigError] = useState<string | null>(null)

  const { x, y, width, height, isCollapsed, expandAll } = persistedState

  const copiedState = useMemo(() => JSON.stringify(state, null, 2), [state])

  useEffect(() => {
    setDraftSeed(seed)
  }, [seed])

  useEffect(() => {
    setDraftBootstrapConfig(bootstrapConfig)
    setDraftBootstrapConfigText(JSON.stringify(bootstrapConfig, null, 2))
    setBootstrapConfigError(null)
  }, [bootstrapConfig])

  useEffect(() => {
    if (editorMode === 'json') {
      setDraftBootstrapConfigText(JSON.stringify(draftBootstrapConfig, null, 2))
    }
  }, [draftBootstrapConfig, editorMode])

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

  const handleSeedApply = () => {
    onSeedChange(draftSeed.trim())
  }

  const handleBootstrapConfigApply = () => {
    if (editorMode === 'json') {
      try {
        const parsed = JSON.parse(draftBootstrapConfigText) as GameBootstrapConfig
        setDraftBootstrapConfig(parsed)
        onBootstrapConfigChange(parsed)
        setBootstrapConfigError(null)
      } catch (error) {
        setBootstrapConfigError(error instanceof Error ? error.message : 'Invalid bootstrap JSON.')
      }
      return
    }

    onBootstrapConfigChange(draftBootstrapConfig)
    setBootstrapConfigError(null)
  }

  const handleModeToggle = () => {
    if (editorMode === 'form') {
      setDraftBootstrapConfigText(JSON.stringify(draftBootstrapConfig, null, 2))
      setEditorMode('json')
      setBootstrapConfigError(null)
      return
    }

    setEditorMode('form')
    setBootstrapConfigError(null)
  }

  const updateDraftBootstrapConfig = (updater: (current: GameBootstrapConfig) => GameBootstrapConfig) => {
    setDraftBootstrapConfig((current) => updater(current))
  }

  const updateHeroDraft = (
    heroIndex: 0 | 1,
    updater: (current: GameBootstrapConfig['heroes'][number]) => GameBootstrapConfig['heroes'][number],
  ) => {
    updateDraftBootstrapConfig((current) => {
      const nextHeroes = [...current.heroes] as GameBootstrapConfig['heroes']
      nextHeroes[heroIndex] = updater(nextHeroes[heroIndex])
      return {
        ...current,
        heroes: nextHeroes,
      }
    })
  }

  const handleDeckListChange = (heroIndex: 0 | 1, rawValue: string) => {
    const nextDeckCardIds = rawValue
      .split(/[\n,]/)
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0)

    updateHeroDraft(heroIndex, (current) => ({
      ...current,
      openingDeckCardIds: nextDeckCardIds,
    }))
  }

  return (
    <Rnd
      position={{ x, y }}
      size={isCollapsed ? { width: COLLAPSED_BUBBLE_SIZE, height: COLLAPSED_BUBBLE_SIZE } : { width, height }}
      minWidth={isCollapsed ? COLLAPSED_BUBBLE_SIZE : 300}
      minHeight={isCollapsed ? COLLAPSED_BUBBLE_SIZE : 220}
      bounds="window"
      dragHandleClassName="debug-panel-header"
      cancel=".debug-panel-actions, .debug-panel-actions *, .debug-panel-bubble"
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
      {isCollapsed ? (
        <aside aria-label="Debug state panel" className="debug-panel-bubble-shell debug-panel-header">
          <button
            type="button"
            className="debug-panel-bubble"
            aria-label="Open debug panel"
            onClick={() => updateState((current) => ({ ...current, isCollapsed: false }))}
          >
            Dbg
          </button>
        </aside>
      ) : (
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
              <button type="button" onClick={onHardReset}>
                Hard Reset
              </button>
              <button
                type="button"
                onClick={() => updateState((current) => ({ ...current, isCollapsed: !current.isCollapsed }))}
              >
                {isCollapsed ? 'Open' : 'Hide'}
              </button>
            </div>
          </header>

          <div className="debug-tree-wrap">
            <div className="debug-seed-panel">
              <label className="debug-seed-field">
                <span>Seed</span>
                <input
                  type="text"
                  value={draftSeed}
                  onChange={(event) => setDraftSeed(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault()
                      handleSeedApply()
                    }
                  }}
                />
              </label>
              <button type="button" onClick={handleSeedApply}>
                Apply Seed
              </button>
            </div>
            <div className="debug-bootstrap-panel">
              <div className="debug-bootstrap-header">
                <strong>Bootstrap Config</strong>
                <span>Use the form for small changes. Switch to JSON when needed.</span>
              </div>
              <button type="button" onClick={handleModeToggle}>
                {editorMode === 'form' ? 'Edit as JSON' : 'Use Form'}
              </button>
              {editorMode === 'json' ? (
                <>
                  <textarea
                    className="debug-bootstrap-textarea"
                    value={draftBootstrapConfigText}
                    onChange={(event) => setDraftBootstrapConfigText(event.target.value)}
                    spellCheck={false}
                  />
                  {bootstrapConfigError ? <p className="debug-bootstrap-error">{bootstrapConfigError}</p> : null}
                </>
              ) : (
                <div className="debug-bootstrap-form">
                  <label className="debug-bootstrap-field">
                    <span>Battle ID</span>
                    <input
                      type="text"
                      value={draftBootstrapConfig.battleId}
                      onChange={(event) => {
                        const battleId = event.target.value
                        updateDraftBootstrapConfig((current) => ({ ...current, battleId }))
                      }}
                    />
                  </label>
                  <label className="debug-bootstrap-field">
                    <span>Battlefield Rows</span>
                    <input
                      type="number"
                      min={1}
                      step={1}
                      value={draftBootstrapConfig.battlefieldRows}
                      onChange={(event) => {
                        const battlefieldRows = Number.parseInt(event.target.value, 10)
                        if (Number.isFinite(battlefieldRows)) {
                          updateDraftBootstrapConfig((current) => ({ ...current, battlefieldRows }))
                        }
                      }}
                    />
                  </label>
                  <label className="debug-bootstrap-field">
                    <span>Battlefield Columns</span>
                    <input
                      type="number"
                      min={1}
                      step={1}
                      value={draftBootstrapConfig.battlefieldColumns}
                      onChange={(event) => {
                        const battlefieldColumns = Number.parseInt(event.target.value, 10)
                        if (Number.isFinite(battlefieldColumns)) {
                          updateDraftBootstrapConfig((current) => ({ ...current, battlefieldColumns }))
                        }
                      }}
                    />
                  </label>
                  <label className="debug-bootstrap-field">
                    <span>Opening Hand Size</span>
                    <input
                      type="number"
                      min={0}
                      step={1}
                      value={draftBootstrapConfig.openingHandSize}
                      onChange={(event) => {
                        const openingHandSize = Number.parseInt(event.target.value, 10)
                        if (Number.isFinite(openingHandSize)) {
                          updateDraftBootstrapConfig((current) => ({ ...current, openingHandSize }))
                        }
                      }}
                    />
                  </label>

                  {draftBootstrapConfig.heroes.map((hero, heroIndex) => (
                    <div className="debug-bootstrap-hero" key={hero.heroEntityId}>
                      <strong>Hero {heroIndex + 1}</strong>
                      <label className="debug-bootstrap-field">
                        <span>Hero Entity ID</span>
                        <input
                          type="text"
                          value={hero.heroEntityId}
                          onChange={(event) => {
                            const heroEntityId = event.target.value
                            updateHeroDraft(heroIndex as 0 | 1, (current) => ({ ...current, heroEntityId }))
                          }}
                        />
                      </label>
                      <label className="debug-bootstrap-field">
                        <span>Hero Definition ID</span>
                        <input
                          type="text"
                          value={hero.heroDefinitionId}
                          onChange={(event) => {
                            const heroDefinitionId = event.target.value
                            updateHeroDraft(heroIndex as 0 | 1, (current) => ({ ...current, heroDefinitionId }))
                          }}
                        />
                      </label>
                      <label className="debug-bootstrap-field">
                        <span>Opening Move Points</span>
                        <input
                          type="number"
                          min={0}
                          step={1}
                          value={hero.openingMovePoints}
                          onChange={(event) => {
                            const openingMovePoints = Number.parseInt(event.target.value, 10)
                            if (Number.isFinite(openingMovePoints)) {
                              updateHeroDraft(heroIndex as 0 | 1, (current) => ({ ...current, openingMovePoints }))
                            }
                          }}
                        />
                      </label>
                      <div className="debug-bootstrap-grid">
                        <label className="debug-bootstrap-field">
                          <span>Start Row</span>
                          <input
                            type="number"
                            step={1}
                            value={hero.startAnchorPosition.row}
                            onChange={(event) => {
                              const row = Number.parseInt(event.target.value, 10)
                              if (Number.isFinite(row)) {
                                updateHeroDraft(heroIndex as 0 | 1, (current) => ({
                                  ...current,
                                  startAnchorPosition: {
                                    ...current.startAnchorPosition,
                                    row,
                                  },
                                }))
                              }
                            }}
                          />
                        </label>
                        <label className="debug-bootstrap-field">
                          <span>Start Column</span>
                          <input
                            type="number"
                            step={1}
                            value={hero.startAnchorPosition.column}
                            onChange={(event) => {
                              const column = Number.parseInt(event.target.value, 10)
                              if (Number.isFinite(column)) {
                                updateHeroDraft(heroIndex as 0 | 1, (current) => ({
                                  ...current,
                                  startAnchorPosition: {
                                    ...current.startAnchorPosition,
                                    column,
                                  },
                                }))
                              }
                            }}
                          />
                        </label>
                      </div>
                      <label className="debug-bootstrap-field">
                        <span>Opening Deck Card IDs</span>
                        <textarea
                          className="debug-bootstrap-textarea debug-bootstrap-textarea-small"
                          value={hero.openingDeckCardIds.join('\n')}
                          onChange={(event) => handleDeckListChange(heroIndex as 0 | 1, event.target.value)}
                          spellCheck={false}
                        />
                      </label>
                    </div>
                  ))}

                  <button type="button" onClick={handleBootstrapConfigApply}>
                    Apply Bootstrap Config
                  </button>
                </div>
              )}
              {bootstrapConfigError ? <p className="debug-bootstrap-error">{bootstrapConfigError}</p> : null}
            </div>
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
        </aside>
      )}
    </Rnd>
  )
}
