import type { BattleAction, BattleEvent, BattleState } from '../../shared/models'
import type {
  BattleRng,
  resolveAction,
  createBattle,
  resolveEffectiveNumber,
  createBattleRngFromCheckpoint,
  GAME_CONTENT_REGISTRY,
} from '../../api'
import type { GameBootstrapConfig } from './data/game-bootstrap'

export type {
  AppBattlePreview,
  AppNumberContributionPreview,
  AppNumberTrace,
} from './game-client-preview'
export { buildPreviewFromState } from './game-client-preview'

export type AppRngCheckpoint = {
  seed: string
  stepCount: number
}

export type AppBattleSnapshot = {
  id: number
  phase: 'pre' | 'post'
  turnNumber: number
  actorHeroEntityId: string
  actionKind: BattleAction['kind']
  action: BattleAction
  state: BattleState
  nextSequence: number
  resultMessage: string
  success: boolean
  failureReason?: string
  events: BattleEvent[]
  rngCheckpoint: AppRngCheckpoint
}

export type AppActionHistoryEntry = {
  id: number
  turnNumber: number
  actorHeroEntityId: string
  actionKind: BattleAction['kind']
  resultMessage: string
  success: boolean
  failureReason?: string
  eventCount: number
  preSnapshotId: number
  postSnapshotId: number
}

export type AppBattleApi = {
  createBattle: typeof createBattle;
  resolveAction: typeof resolveAction;
  resolveEffectiveNumber: typeof resolveEffectiveNumber;
  createBattleRngFromCheckpoint: typeof createBattleRngFromCheckpoint;
  GAME_CONTENT_REGISTRY: typeof GAME_CONTENT_REGISTRY;
}

export type AppBattleSession = {
  config: GameBootstrapConfig
  gameApi: AppBattleApi
  state: BattleState
  battleRng: BattleRng
  nextSequence: number
  actionLog: BattleAction[]
  history: AppActionHistoryEntry[]
  snapshots: AppBattleSnapshot[]
  activeSnapshotId: number | null
  nextHistoryEntryId: number
  nextSnapshotId: number
}
