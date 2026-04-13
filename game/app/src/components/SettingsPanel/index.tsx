import { useState } from 'react'
import { JsonView, allExpanded, defaultStyles } from 'react-json-view-lite'
import { toast } from 'react-hot-toast'
import 'react-json-view-lite/dist/index.css'
import type { GameBootstrapConfig } from '../../data/game-bootstrap'
import './style.css'

type SettingsPanelProps = {
  state: Record<string, unknown> | unknown[]
  bootstrapConfig: GameBootstrapConfig
  onSeedChange: (seed: string) => void
  onBootstrapConfigChange: (config: GameBootstrapConfig) => boolean
  onExportSettings: () => string | null
  onImportSettings: (rawText: string) => { ok: boolean; message: string }
  onHardReset: () => void
  autoPlayButtonsVisible: boolean
  autoPlayDelayMs: number
  autoPlayAutoEndTurnWhenNoLegalMoves: boolean
  autoPlayUseEntityActives: boolean
  onAutoPlayButtonsVisibleChange: (nextValue: boolean) => void
  onAutoPlayDelayMsChange: (nextValue: number) => void
  onAutoPlayAutoEndTurnWhenNoLegalMovesChange: (nextValue: boolean) => void
  onAutoPlayUseEntityActivesChange: (nextValue: boolean) => void
  onClosePanel?: () => void
  isVisible?: boolean
}

const SETTINGS_PANEL_STORAGE_KEY = 'cmd-hero:settings-panel-state'
const DECK_SAVE_TOAST_ID = 'deck-editor-save'

type SettingsSectionKey = 'seed' | 'bootstrap' | 'exchange' | 'runtime'
type SettingsSectionOpenState = Record<SettingsSectionKey, boolean>

const SETTINGS_SECTION_ORDER: SettingsSectionKey[] = ['seed', 'bootstrap', 'exchange', 'runtime']
const DEFAULT_SECTION_OPEN_STATE: SettingsSectionOpenState = {
  seed: true,
  bootstrap: true,
  exchange: false,
  runtime: true,
}

type SettingsPanelPersistedState = {
  expandAll: boolean
  sectionOpen: SettingsSectionOpenState
}

const loadPersistedState = (): SettingsPanelPersistedState => {
  if (typeof window === 'undefined') {
    return {
      expandAll: false,
      sectionOpen: { ...DEFAULT_SECTION_OPEN_STATE },
    }
  }

  const saved = window.localStorage.getItem(SETTINGS_PANEL_STORAGE_KEY)
  if (!saved) {
    return {
      expandAll: false,
      sectionOpen: { ...DEFAULT_SECTION_OPEN_STATE },
    }
  }

  try {
    const parsed = JSON.parse(saved) as Partial<SettingsPanelPersistedState>
    return {
      expandAll: typeof parsed.expandAll === 'boolean' ? parsed.expandAll : false,
      sectionOpen: {
        seed: parsed.sectionOpen?.seed !== false,
        bootstrap: parsed.sectionOpen?.bootstrap !== false,
        exchange: parsed.sectionOpen?.exchange === true,
        runtime: parsed.sectionOpen?.runtime !== false,
      },
    }
  } catch {
    return {
      expandAll: false,
      sectionOpen: { ...DEFAULT_SECTION_OPEN_STATE },
    }
  }
}

const persistState = (state: SettingsPanelPersistedState) => {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(SETTINGS_PANEL_STORAGE_KEY, JSON.stringify(state))
}

export function SettingsPanel(props: SettingsPanelProps) {
  const {
    state,
    bootstrapConfig,
    onSeedChange,
    onBootstrapConfigChange,
    onExportSettings,
    onImportSettings,
    onHardReset,
    autoPlayButtonsVisible,
    autoPlayDelayMs,
    autoPlayAutoEndTurnWhenNoLegalMoves,
    autoPlayUseEntityActives,
    onAutoPlayButtonsVisibleChange,
    onAutoPlayDelayMsChange,
    onAutoPlayAutoEndTurnWhenNoLegalMovesChange,
    onAutoPlayUseEntityActivesChange,
    onClosePanel,
    isVisible = true,
  } = props
  const [persistedState, setPersistedState] = useState<SettingsPanelPersistedState>(() => loadPersistedState())
  const [draftSeed, setDraftSeed] = useState(bootstrapConfig.seed)
  const [editorMode, setEditorMode] = useState<'form' | 'json'>('form')
  const [draftBootstrapConfig, setDraftBootstrapConfig] = useState<GameBootstrapConfig>(bootstrapConfig)
  const [draftBootstrapConfigText, setDraftBootstrapConfigText] = useState(
    () => JSON.stringify(bootstrapConfig, null, 2),
  )
  const [bootstrapConfigError, setBootstrapConfigError] = useState<string | null>(null)
  const [settingsExchangeText, setSettingsExchangeText] = useState(() => onExportSettings() ?? '')

  const { expandAll, sectionOpen } = persistedState

  function updateState(updater: (current: SettingsPanelPersistedState) => SettingsPanelPersistedState) {
    setPersistedState((current) => {
      const next = updater(current)
      persistState(next)
      return next
    })
  }

  const handleCopyState = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(state, null, 2))
      toast.success('State JSON copied to clipboard.', { id: DECK_SAVE_TOAST_ID })
    } catch {
      // No-op
    }
  }

  const handleImportSettingsFromText = () => {
    const text = settingsExchangeText.trim()
    if (!text) {
      toast.error('Paste exported settings JSON before importing.', { id: DECK_SAVE_TOAST_ID })
      return
    }

    const result = onImportSettings(text)
    if (!result.ok) {
      toast.error(result.message, { id: DECK_SAVE_TOAST_ID })
      return
    }

    toast.success(result.message, { id: DECK_SAVE_TOAST_ID })
  }

  const handleSeedApply = () => {
    onSeedChange(draftSeed.trim())
  }

  const handleBootstrapConfigApply = () => {
    if (editorMode === 'json') {
      try {
        const parsed = JSON.parse(draftBootstrapConfigText) as GameBootstrapConfig
        setDraftBootstrapConfig(parsed)
        const saved = onBootstrapConfigChange(parsed)
        if (saved) {
          toast.success('Bootstrap config saved.', { id: DECK_SAVE_TOAST_ID })
        }
        setBootstrapConfigError(null)
      } catch (error) {
        setBootstrapConfigError(error instanceof Error ? error.message : 'Invalid bootstrap JSON.')
        toast.error('Bootstrap config JSON is invalid.', { id: DECK_SAVE_TOAST_ID })
      }
      return
    }

    const saved = onBootstrapConfigChange(draftBootstrapConfig)
    if (saved) {
      toast.success('Bootstrap config saved.', { id: DECK_SAVE_TOAST_ID })
    }
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

  const setAllSectionsOpen = (open: boolean) => {
    updateState((current) => ({
      ...current,
      expandAll: open,
      sectionOpen: {
        seed: open,
        bootstrap: open,
        exchange: open,
        runtime: open,
      },
    }))
  }

  const toggleSection = (section: SettingsSectionKey) => {
    updateState((current) => {
      const nextSectionOpen = {
        ...current.sectionOpen,
        [section]: !current.sectionOpen[section],
      }

      return {
        ...current,
        sectionOpen: nextSectionOpen,
        expandAll: SETTINGS_SECTION_ORDER.every((key) => nextSectionOpen[key]),
      }
    })
  }

  const isAllSectionsOpen = SETTINGS_SECTION_ORDER.every((key) => sectionOpen[key])
  const isAllSectionsClosed = SETTINGS_SECTION_ORDER.every((key) => !sectionOpen[key])

  if (!isVisible) return null

  return (
    <div
      className="settings-modal-overlay"
      onClick={() => {
        if (onClosePanel) {
          onClosePanel()
        }
      }}
      role="presentation"
    >
      <section
        className={`settings-modal ${isAllSectionsClosed ? 'settings-modal-collapsed' : ''}`.trim()}
        role="dialog"
        aria-modal="true"
        aria-label="Settings"
        onClick={(event) => {
          event.stopPropagation()
        }}
      >
        <header className="settings-modal-head">
          <strong>Settings</strong>
          <div className="settings-modal-head-actions">
            <button
              type="button"
              onClick={() => setAllSectionsOpen(!isAllSectionsOpen)}
            >
              {isAllSectionsOpen ? 'Collapse All' : 'Expand All'}
            </button>
            <button type="button" onClick={handleCopyState}>
              Copy JSON
            </button>
            <button type="button" onClick={onHardReset}>
              Hard Reset
            </button>
            <button
              type="button"
              onClick={() => {
                if (onClosePanel) {
                  onClosePanel()
                }
              }}
            >
              Close
            </button>
          </div>
        </header>

        <div className="settings-tree-wrap">
          <section id="settings-section-seed" className={`settings-section ${sectionOpen.seed ? 'open' : 'closed'}`.trim()}>
            <button
              type="button"
              className="settings-section-toggle"
              onClick={() => toggleSection('seed')}
              aria-expanded={sectionOpen.seed}
            >
              <span>Seed &amp; Session</span>
              <span className="settings-section-toggle-symbol" aria-hidden="true">{sectionOpen.seed ? '−' : '+'}</span>
            </button>
            {sectionOpen.seed ? (
          <div className="settings-seed-panel">
            <label className="settings-seed-field">
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
            <div className="settings-seed-field">
              <span>Auto-Play button</span>
              <button
                type="button"
                onClick={() => onAutoPlayButtonsVisibleChange(!autoPlayButtonsVisible)}
                aria-pressed={autoPlayButtonsVisible}
              >
                {autoPlayButtonsVisible ? 'On' : 'Off'}
              </button>
            </div>
            <label className="settings-seed-field">
              <span>Auto-Play Delay (ms)</span>
              <input
                type="number"
                min={50}
                step={10}
                value={autoPlayDelayMs}
                onChange={(event) => {
                  const parsed = Number.parseInt(event.target.value, 10)
                  if (Number.isFinite(parsed)) {
                    onAutoPlayDelayMsChange(parsed)
                  }
                }}
              />
            </label>
            <div className="settings-seed-field">
              <span>Auto-End Turn When No Legal Moves</span>
              <button
                type="button"
                onClick={() => onAutoPlayAutoEndTurnWhenNoLegalMovesChange(!autoPlayAutoEndTurnWhenNoLegalMoves)}
                aria-pressed={autoPlayAutoEndTurnWhenNoLegalMoves}
              >
                {autoPlayAutoEndTurnWhenNoLegalMoves ? 'On' : 'Off'}
              </button>
            </div>
            <div className="settings-seed-field">
              <span>Use Companion / Weapon Actives</span>
              <button
                type="button"
                onClick={() => onAutoPlayUseEntityActivesChange(!autoPlayUseEntityActives)}
                aria-pressed={autoPlayUseEntityActives}
              >
                {autoPlayUseEntityActives ? 'On' : 'Off'}
              </button>
            </div>
          </div>
            ) : null}
          </section>
          <section id="settings-section-bootstrap" className={`settings-section ${sectionOpen.bootstrap ? 'open' : 'closed'}`.trim()}>
            <button
              type="button"
              className="settings-section-toggle"
              onClick={() => toggleSection('bootstrap')}
              aria-expanded={sectionOpen.bootstrap}
            >
              <span>Bootstrap Config</span>
              <span className="settings-section-toggle-symbol" aria-hidden="true">{sectionOpen.bootstrap ? '−' : '+'}</span>
            </button>
            {sectionOpen.bootstrap ? (
          <div className="settings-bootstrap-panel">
            <div className="settings-bootstrap-header">
              <strong>Bootstrap Config</strong>
              <span>Use the form for small changes. Switch to JSON when needed.</span>
            </div>
            <button type="button" onClick={handleModeToggle}>
              {editorMode === 'form' ? 'Edit as JSON' : 'Use Form'}
            </button>
            {editorMode === 'json' ? (
              <>
                <textarea
                  className="settings-bootstrap-textarea"
                  value={draftBootstrapConfigText}
                  onChange={(event) => setDraftBootstrapConfigText(event.target.value)}
                  spellCheck={false}
                />
                {bootstrapConfigError ? <p className="settings-bootstrap-error">{bootstrapConfigError}</p> : null}
              </>
            ) : (
              <div className="settings-bootstrap-form">
                <label className="settings-bootstrap-field">
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
                <label className="settings-bootstrap-field">
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
                <label className="settings-bootstrap-field">
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
                <label className="settings-bootstrap-field">
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
                  <div className="settings-bootstrap-hero" key={hero.heroEntityId}>
                    <strong>Hero {heroIndex + 1}</strong>
                    <label className="settings-bootstrap-field">
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
                    <label className="settings-bootstrap-field">
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
                    <label className="settings-bootstrap-field">
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
                    <div className="settings-bootstrap-grid">
                      <label className="settings-bootstrap-field">
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
                      <label className="settings-bootstrap-field">
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
                    <label className="settings-bootstrap-field">
                      <span>Opening Deck Card IDs</span>
                      <textarea
                        className="settings-bootstrap-textarea settings-bootstrap-textarea-small"
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
            {bootstrapConfigError ? <p className="settings-bootstrap-error">{bootstrapConfigError}</p> : null}
          </div>
            ) : null}
          </section>
          <section id="settings-section-exchange" className={`settings-section ${sectionOpen.exchange ? 'open' : 'closed'}`.trim()}>
            <button
              type="button"
              className="settings-section-toggle"
              onClick={() => toggleSection('exchange')}
              aria-expanded={sectionOpen.exchange}
            >
              <span>Export / Import Settings</span>
              <span className="settings-section-toggle-symbol" aria-hidden="true">{sectionOpen.exchange ? '−' : '+'}</span>
            </button>
            {sectionOpen.exchange ? (
              <div className="settings-bootstrap-panel">
                <div className="settings-bootstrap-header">
                  <strong>Export / Import Settings</strong>
                  <span>Includes current and saved deck settings, audio, UI settings, and auto-play settings. Game state stays in the replay fragment.</span>
                </div>
                <div className="settings-modal-head-actions">
                  <button type="button" onClick={handleImportSettingsFromText}>Apply</button>
                </div>
                <textarea
                  className="settings-bootstrap-textarea"
                  value={settingsExchangeText}
                  onChange={(event) => setSettingsExchangeText(event.target.value)}
                  spellCheck={false}
                  placeholder="Paste exported settings JSON here, then click Import Settings"
                />
              </div>
            ) : null}
          </section>
          <section id="settings-section-runtime" className={`settings-section ${sectionOpen.runtime ? 'open' : 'closed'}`.trim()}>
            <button
              type="button"
              className="settings-section-toggle"
              onClick={() => toggleSection('runtime')}
              aria-expanded={sectionOpen.runtime}
            >
              <span>Runtime State</span>
              <span className="settings-section-toggle-symbol" aria-hidden="true">{sectionOpen.runtime ? '−' : '+'}</span>
            </button>
            {sectionOpen.runtime ? (
              <div className="settings-runtime-panel">
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
          </section>
        </div>
      </section>
    </div>
  )
}
