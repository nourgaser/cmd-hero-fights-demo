import { useEffect, useState } from 'react'
import { DEFAULT_GAME_BOOTSTRAP_CONFIG } from '../data/game-bootstrap'
import {
  AUTO_PLAY_AUTO_END_TURN_STORAGE_KEY,
  AUTO_PLAY_BUTTONS_VISIBLE_STORAGE_KEY,
  AUTO_PLAY_DELAY_STORAGE_KEY,
  AUTO_PLAY_DEFAULT_DELAY_MS,
  AUTO_PLAY_USE_ENTITY_ACTIVES_STORAGE_KEY,
  MUSIC_MUTED_STORAGE_KEY,
  SETTINGS_BOOTSTRAP_STORAGE_KEY,
  SETTINGS_SEED_STORAGE_KEY,
} from './constants'
import { clampAutoPlayDelay, loadBootstrapConfig } from './runtime-utils'
import { readReplayPayloadFromLocation } from '../utils/replay-url'

export function useSettings() {
  const [initialReplayPayload] = useState(() => readReplayPayloadFromLocation())
  const [initialBootstrapConfig] = useState(() =>
    initialReplayPayload?.bootstrapConfig ??
    loadBootstrapConfig({
      seedStorageKey: SETTINGS_SEED_STORAGE_KEY,
      bootstrapStorageKey: SETTINGS_BOOTSTRAP_STORAGE_KEY,
      defaultConfig: DEFAULT_GAME_BOOTSTRAP_CONFIG,
    }),
  )
  const [bootstrapConfig, setBootstrapConfig] = useState(initialBootstrapConfig)

  const [autoPlayButtonsVisible, setAutoPlayButtonsVisible] = useState(() => {
    if (typeof window === 'undefined') {
      return false
    }

    return window.localStorage.getItem(AUTO_PLAY_BUTTONS_VISIBLE_STORAGE_KEY) === 'true'
  })

  const [autoPlayAutoEndTurnWhenNoLegalMoves, setAutoPlayAutoEndTurnWhenNoLegalMoves] = useState(() => {
    if (typeof window === 'undefined') {
      return true
    }

    const stored = window.localStorage.getItem(AUTO_PLAY_AUTO_END_TURN_STORAGE_KEY)
    return stored === null ? true : stored === 'true'
  })

  const [autoPlayUseEntityActives, setAutoPlayUseEntityActives] = useState(() => {
    if (typeof window === 'undefined') {
      return true
    }

    const stored = window.localStorage.getItem(AUTO_PLAY_USE_ENTITY_ACTIVES_STORAGE_KEY)
    return stored === null ? true : stored === 'true'
  })

  const [autoPlayDelayMs, setAutoPlayDelayMs] = useState(() => {
    if (typeof window === 'undefined') {
      return AUTO_PLAY_DEFAULT_DELAY_MS
    }

    const parsed = Number.parseInt(window.localStorage.getItem(AUTO_PLAY_DELAY_STORAGE_KEY) ?? '', 10)
    return clampAutoPlayDelay(parsed)
  })

  const [isMusicMuted, setIsMusicMuted] = useState(() => {
    if (typeof window === 'undefined') {
      return false
    }

    return window.localStorage.getItem(MUSIC_MUTED_STORAGE_KEY) === 'true'
  })

  const [replayBarPosition, setReplayBarPosition] = useState<{ x: number; y: number }>(() => {
    if (typeof window === 'undefined') {
      return { x: 0, y: 0 }
    }
    const stored = window.localStorage.getItem('REPLAY_BAR_POSITION')
    if (!stored) return { x: 0, y: 0 }
    try {
      return JSON.parse(stored)
    } catch {
      return { x: 0, y: 0 }
    }
  })

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(AUTO_PLAY_BUTTONS_VISIBLE_STORAGE_KEY, String(autoPlayButtonsVisible))
  }, [autoPlayButtonsVisible])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(AUTO_PLAY_DELAY_STORAGE_KEY, String(autoPlayDelayMs))
  }, [autoPlayDelayMs])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(AUTO_PLAY_AUTO_END_TURN_STORAGE_KEY, String(autoPlayAutoEndTurnWhenNoLegalMoves))
  }, [autoPlayAutoEndTurnWhenNoLegalMoves])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(AUTO_PLAY_USE_ENTITY_ACTIVES_STORAGE_KEY, String(autoPlayUseEntityActives))
  }, [autoPlayUseEntityActives])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(MUSIC_MUTED_STORAGE_KEY, String(isMusicMuted))
  }, [isMusicMuted])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem('REPLAY_BAR_POSITION', JSON.stringify(replayBarPosition))
  }, [replayBarPosition])

  return {
    initialReplayPayload,
    initialBootstrapConfig,
    bootstrapConfig,
    setBootstrapConfig,
    autoPlayButtonsVisible,
    setAutoPlayButtonsVisible,
    autoPlayAutoEndTurnWhenNoLegalMoves,
    setAutoPlayAutoEndTurnWhenNoLegalMoves,
    autoPlayUseEntityActives,
    setAutoPlayUseEntityActives,
    autoPlayDelayMs,
    setAutoPlayDelayMs,
    isMusicMuted,
    setIsMusicMuted,
    replayBarPosition,
    setReplayBarPosition,
  }
}
