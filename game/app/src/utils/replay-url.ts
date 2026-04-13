import type { Position, TargetSelector } from '../../../shared/models'
import { deflateSync, inflateSync } from 'fflate'
import type { GameBootstrapConfig } from '../data/game-bootstrap'

export type ReplayActionSelection = {
  targetSelector?: TargetSelector
  targetPosition?: Position
}

export type ReplayPlayCardAction = {
  kind: 'playCard'
  actorHeroEntityId: string
  handCardIndex: number
  selection: ReplayActionSelection
}

export type ReplayBasicAttackAction = {
  kind: 'basicAttack'
  actorHeroEntityId: string
  attackerSelector: TargetSelector
  selection: {
    targetSelector: TargetSelector
  }
}

export type ReplayUseEntityActiveAction = {
  kind: 'useEntityActive'
  actorHeroEntityId: string
  sourceSelector: TargetSelector
  selection: ReplayActionSelection
}

export type ReplayPressLuckAction = {
  kind: 'pressLuck'
  actorHeroEntityId: string
}

export type ReplayEndTurnAction = {
  kind: 'endTurn'
  actorHeroEntityId: string
}

export type ReplayBattleAction =
  | ReplayPlayCardAction
  | ReplayBasicAttackAction
  | ReplayUseEntityActiveAction
  | ReplayPressLuckAction
  | ReplayEndTurnAction

export type ReplayActionLogEntry = {
  action: ReplayBattleAction
  success: boolean
}

const REPLAY_PARAM_KEY = 'replay'
type ReplayHistoryMode = 'push' | 'replace'

export type ReplayUrlPayload = {
  version: 3
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
  return {
    version: 3,
    bootstrapConfig: {
      ...options.bootstrapConfig,
      seed: options.seed,
    },
    actionLog: options.actionLog.map((entry) => ({
      action: entry.action,
      success: entry.success,
    })),
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
    if (parsed.version !== 3 || !Array.isArray(parsed.actionLog)) {
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
