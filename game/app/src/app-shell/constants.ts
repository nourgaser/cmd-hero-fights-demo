export const SETTINGS_SEED_STORAGE_KEY = 'cmd-hero:settings-seed'
export const SETTINGS_BOOTSTRAP_STORAGE_KEY = 'cmd-hero:settings-bootstrap-config'
export const MUSIC_MUTED_STORAGE_KEY = 'cmd-hero:music-muted'
export const MUSIC_TRACK_STORAGE_KEY = 'cmd-hero:music-track-id'
export const SETTINGS_PANEL_STORAGE_KEY = 'cmd-hero:settings-panel-state'
export const SAVED_DECKS_STORAGE_KEY = 'cmd-hero:saved-decks'
export const AUTO_PLAY_BUTTONS_VISIBLE_STORAGE_KEY = 'cmd-hero:autoplay-buttons-visible'
export const AUTO_PLAY_DELAY_STORAGE_KEY = 'cmd-hero:autoplay-delay-ms'
export const AUTO_PLAY_AUTO_END_TURN_STORAGE_KEY = 'cmd-hero:autoplay-auto-end-turn-when-stuck'
export const AUTO_PLAY_USE_ENTITY_ACTIVES_STORAGE_KEY = 'cmd-hero:autoplay-use-entity-actives'

export const MUSIC_TRACKS = [
  {
    id: 'original',
    label: 'Original Theme',
    source: '/game_music.mp3',
  },
  {
    id: 'ashford-cover',
    label: 'To Ashford (Cover)',
    source: '/game_music_2.mp3',
  },
] as const

export type MusicTrackId = (typeof MUSIC_TRACKS)[number]['id']

export const MUSIC_SOURCE = MUSIC_TRACKS[0].source
export const ACTION_TOAST_ID = 'action-feedback'
export const EVENT_TOAST_ID = 'battle-event-feedback'
export const ACTION_TOAST_DURATION_MS = 7000
export const EVENT_TOAST_DURATION_MS = 4500
export const AUTO_PLAY_DEFAULT_DELAY_MS = 200
export const REPLAY_PLAYBACK_SPEEDS = [0.25, 0.5, 1, 2, 4] as const

export const SETTINGS_EXPORT_STORAGE_KEYS = [
  SETTINGS_SEED_STORAGE_KEY,
  SETTINGS_BOOTSTRAP_STORAGE_KEY,
  SETTINGS_PANEL_STORAGE_KEY,
  SAVED_DECKS_STORAGE_KEY,
  MUSIC_MUTED_STORAGE_KEY,
  MUSIC_TRACK_STORAGE_KEY,
  AUTO_PLAY_BUTTONS_VISIBLE_STORAGE_KEY,
  AUTO_PLAY_DELAY_STORAGE_KEY,
  AUTO_PLAY_AUTO_END_TURN_STORAGE_KEY,
  AUTO_PLAY_USE_ENTITY_ACTIVES_STORAGE_KEY,
] as const
