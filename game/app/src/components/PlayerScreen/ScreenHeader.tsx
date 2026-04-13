import { Icon } from '@iconify/react/offline'
import { SIDE_VISUALS } from '../../data/visual-metadata'
import { KEYBOARD_SHORTCUT_HINT_ROWS } from '../../config/keyboard-shortcuts'

type ScreenHeaderProps = {
  title: string
  selfSideKey: 'a' | 'b'
  onOpenDeckEditor: () => void
  onHardReroll?: () => void
  showMusicControl?: boolean
  isMusicMuted?: boolean
  onToggleMusic?: () => void
  showSettingsControl?: boolean
  isSettingsOpen?: boolean
  onToggleSettings?: () => void
  isRulebookOpen?: boolean
  onOpenRulebook: () => void
}

export function ScreenHeader(props: ScreenHeaderProps) {
  const {
    title,
    selfSideKey,
    onOpenDeckEditor,
    onHardReroll,
    showMusicControl,
    isMusicMuted,
    onToggleMusic,
    showSettingsControl,
    isSettingsOpen,
    onToggleSettings,
    isRulebookOpen,
    onOpenRulebook,
  } = props

  return (
    <header className="screen-head">
      <div className="screen-head-brand">
        <img className="screen-head-logo" src="/logo.png" alt="CMD Hero Fights logo" />
        <div className="screen-head-copy">
          <h1>{title}</h1>
          <p>{SIDE_VISUALS[selfSideKey].name}</p>
        </div>
      </div>
      <div className="screen-head-actions">
        <button
          type="button"
          className="help-chip deck-editor-chip hint-wrap"
          onClick={onOpenDeckEditor}
          data-hover-align="right"
        >
          <Icon icon="game-icons:card-pick" aria-hidden="true" />
          <span className="sr-only">Edit deck</span>
          <span className="hover-card" role="tooltip">Edit Deck</span>
        </button>
        {onHardReroll ? (
          <button
            type="button"
            className="help-chip hard-reroll-chip hint-wrap"
            onClick={onHardReroll}
            data-hover-align="right"
          >
            <span aria-hidden="true">↻</span>
            <span className="sr-only">Hard reroll battle seed</span>
            <span className="hover-card" role="tooltip">Hard Reroll Seed</span>
          </button>
        ) : null}
        {showMusicControl ? (
          <button
            type="button"
            className="help-chip mute-music-control"
            onClick={onToggleMusic}
            aria-label={isMusicMuted ? 'Unmute music' : 'Mute music'}
          >
            <span aria-hidden="true">{isMusicMuted ? '🔇' : '🎵'}</span>
          </button>
        ) : null}
        {showSettingsControl ? (
          <button
            type="button"
            className={`help-chip settings-button${isSettingsOpen ? ' settings-button-active' : ''}`}
            onClick={onToggleSettings}
            aria-pressed={isSettingsOpen ? 'true' : 'false'}
            aria-label={isSettingsOpen ? 'Close settings' : 'Open settings'}
          >
            <span aria-hidden="true">⚙</span>
          </button>
        ) : null}
        <button
          type="button"
          className={`help-chip rulebook-chip${isRulebookOpen ? ' rulebook-chip-active' : ''} hint-wrap`}
          onClick={onOpenRulebook}
          aria-haspopup="dialog"
          aria-expanded={isRulebookOpen ? 'true' : 'false'}
          aria-label={isRulebookOpen ? 'Rulebook open' : 'Open rulebook'}
          data-hover-align="right"
        >
          <Icon icon="game-icons:open-book" aria-hidden="true" />
          <span className="sr-only">Open rulebook</span>
          <span className="hover-card" role="tooltip">Rulebook</span>
        </button>
        <span className="help-chip keyboard-shortcuts-chip hint-wrap" tabIndex={0} data-hover-align="right">
          <Icon icon="game-icons:keyboard" aria-hidden="true" />
          <span className="sr-only">Keyboard shortcuts</span>
          <span className="hover-card" role="tooltip">
            <strong>Shortcuts</strong>
            <span className="shortcut-tooltip-grid">
              {KEYBOARD_SHORTCUT_HINT_ROWS.map((entry) => (
                <span key={`${entry.key}:${entry.description}`} className="shortcut-tooltip-row">
                  <span className="shortcut-tooltip-key">{entry.key}</span>
                  <span className="shortcut-tooltip-value">{entry.description}</span>
                </span>
              ))}
            </span>
            <span className="shortcut-tooltip-note">Board targeting stays click/tap.</span>
          </span>
        </span>
      </div>
    </header>
  )
}
