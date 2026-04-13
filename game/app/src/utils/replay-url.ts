import { BattleActionSchema, type ReplayActionLogEntry } from '../../../shared/models'
import { deflateSync, inflateSync } from 'fflate'
import type { GameBootstrapConfig } from '../data/game-bootstrap'

const REPLAY_PARAM_KEY = 'replay'
type ReplayHistoryMode = 'push' | 'replace'

export type ReplayUrlPayload = {
  version: 4
  bootstrapConfig: GameBootstrapConfig
  actionLog: ReplayActionLogEntry[]
  timelineIndex: number | null
}

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
  actionLog: ReplayActionLogEntry[]
  timelineIndex: number | null
}): ReplayUrlPayload {
  const validatedActionLog: ReplayActionLogEntry[] = options.actionLog.map((entry, index) => {
    const parsedAction = BattleActionSchema.safeParse(entry.action)
    if (!parsedAction.success) {
      throw new Error(`Invalid replay action at step #${index + 1}.`)
    }

    return {
      action: parsedAction.data,
      success: entry.success,
    }
  })

  return {
    version: 4,
    bootstrapConfig: {
      ...options.bootstrapConfig,
      seed: options.seed,
    },
    actionLog: validatedActionLog,
    timelineIndex: options.timelineIndex,
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
    if (parsed.version !== 4 || !Array.isArray(parsed.actionLog)) {
      return null
    }

    const validatedActionLog: ReplayActionLogEntry[] = []
    for (let index = 0; index < parsed.actionLog.length; index += 1) {
      const rawEntry = parsed.actionLog[index]
      if (!rawEntry || typeof rawEntry !== 'object') {
        return null
      }

      const entry = rawEntry as Partial<ReplayActionLogEntry>
      if (typeof entry.success !== 'boolean') {
        return null
      }

      const parsedAction = BattleActionSchema.safeParse(entry.action)
      if (!parsedAction.success) {
        return null
      }

      validatedActionLog.push({
        action: parsedAction.data,
        success: entry.success,
      })
    }

    return {
      ...parsed,
      actionLog: validatedActionLog,
    }
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
