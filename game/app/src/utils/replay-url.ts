import type { BattleAction } from '../../../shared/models'
import type { GameBootstrapConfig } from '../data/game-bootstrap.ts'
import type { AppReplayActionLogEntry } from '../game-client.ts'

const REPLAY_PARAM_KEY = 'replay'

type ReplayUrlPayloadV1 = {
  version: 1
  bootstrapConfig: GameBootstrapConfig
  seed: string
  actionLog: AppReplayActionLogEntry[]
  snapshotId: number | null
}

export type ReplayUrlPayload = ReplayUrlPayloadV1

function base64UrlEncode(value: string): string {
  const bytes = new TextEncoder().encode(value)
  let binary = ''
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }

  return btoa(binary)
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '')
}

function base64UrlDecode(value: string): string {
  const padded = value
    .replaceAll('-', '+')
    .replaceAll('_', '/')
    .padEnd(Math.ceil(value.length / 4) * 4, '=')

  const binary = atob(padded)
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

export function createReplayUrlPayload(options: {
  bootstrapConfig: GameBootstrapConfig
  seed: string
  actionLog: AppReplayActionLogEntry[]
  snapshotId: number | null
}): ReplayUrlPayload {
  return {
    version: 1,
    bootstrapConfig: {
      ...options.bootstrapConfig,
      seed: options.seed,
    },
    seed: options.seed,
    actionLog: options.actionLog.map((entry) => ({
      action: entry.action as BattleAction,
    })),
    snapshotId: options.snapshotId,
  }
}

export function encodeReplayUrlPayload(payload: ReplayUrlPayload): string {
  return base64UrlEncode(JSON.stringify(payload))
}

export function decodeReplayUrlPayload(encoded: string): ReplayUrlPayload | null {
  try {
    const parsed = JSON.parse(base64UrlDecode(encoded)) as ReplayUrlPayload
    if (parsed.version !== 1) {
      return null
    }
    if (!Array.isArray(parsed.actionLog)) {
      return null
    }

    return parsed
  } catch {
    return null
  }
}

export function readReplayPayloadFromLocation(): ReplayUrlPayload | null {
  if (typeof window === 'undefined') {
    return null
  }

  const hashValue = window.location.hash.startsWith('#')
    ? window.location.hash.slice(1)
    : window.location.hash
  const params = new URLSearchParams(hashValue)
  const encoded = params.get(REPLAY_PARAM_KEY)
  if (!encoded) {
    return null
  }

  return decodeReplayUrlPayload(encoded)
}

export function writeReplayPayloadToLocation(payload: ReplayUrlPayload): void {
  if (typeof window === 'undefined') {
    return
  }

  const hashValue = window.location.hash.startsWith('#')
    ? window.location.hash.slice(1)
    : window.location.hash
  const params = new URLSearchParams(hashValue)
  params.set(REPLAY_PARAM_KEY, encodeReplayUrlPayload(payload))
  const nextHash = params.toString()
  const nextUrl = `${window.location.pathname}${window.location.search}${nextHash ? `#${nextHash}` : ''}`
  window.history.replaceState(null, '', nextUrl)
}
