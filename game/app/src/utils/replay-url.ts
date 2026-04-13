import type { BattleAction } from '../../../shared/models'
import { deflateSync, inflateSync } from 'fflate'
import type { GameBootstrapConfig } from '../data/game-bootstrap'
export type AppReplayActionLogEntry = { action: BattleAction }


const REPLAY_PARAM_KEY = 'replay'
type ReplayHistoryMode = 'push' | 'replace'

type ReplayUrlPayloadV2 = {
  version: 2
  bootstrapConfig: GameBootstrapConfig
  actionLog: AppReplayActionLogEntry[]
  snapshotId: number | null
}

export type ReplayUrlPayload = ReplayUrlPayloadV2

function base64UrlEncodeBytes(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }

  return btoa(binary)
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '')
}

function base64UrlDecodeBytes(value: string): Uint8Array {
  const padded = value
    .replaceAll('-', '+')
    .replaceAll('_', '/')
    .padEnd(Math.ceil(value.length / 4) * 4, '=')

  const binary = atob(padded)
  return Uint8Array.from(binary, (char) => char.charCodeAt(0))
}

export function createReplayUrlPayload(options: {
  bootstrapConfig: GameBootstrapConfig
  seed: string
  actionLog: AppReplayActionLogEntry[]
  snapshotId: number | null
}): ReplayUrlPayload {
  return {
    version: 2,
    bootstrapConfig: {
      ...options.bootstrapConfig,
      seed: options.seed,
    },
    actionLog: options.actionLog.map((entry) => ({
      action: entry.action as BattleAction,
    })),
    snapshotId: options.snapshotId,
  }
}

export function encodeReplayUrlPayload(payload: ReplayUrlPayload): string {
  const jsonBytes = new TextEncoder().encode(JSON.stringify(payload))
  const compressed = deflateSync(jsonBytes, { level: 6 })
  return base64UrlEncodeBytes(compressed)
}

export function decodeReplayUrlPayload(encoded: string): ReplayUrlPayload | null {
  try {
    const compressed = base64UrlDecodeBytes(encoded)
    const decompressed = inflateSync(compressed)
    const parsed = JSON.parse(new TextDecoder().decode(decompressed)) as ReplayUrlPayload
    if (parsed.version !== 2) {
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

export function writeReplayPayloadToLocation(
  payload: ReplayUrlPayload,
  options?: { historyMode?: ReplayHistoryMode; historyState?: unknown },
): void {
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
  const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`
  if (nextUrl === currentUrl && options?.historyMode !== 'push') {
    return
  }

  if (options?.historyMode === 'push') {
    window.history.pushState(options.historyState ?? null, '', nextUrl)
    return
  }

  window.history.replaceState(options?.historyState ?? null, '', nextUrl)
}
