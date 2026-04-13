import { createGameApi } from '../../index'
import type { BattleAction, BattleEvent } from '../../shared/models'

export type {
  AppBattlePreview,
  AppNumberContributionPreview,
  AppNumberTrace,
} from './game-client-preview'
export { buildPreviewFromState } from './game-client-preview'

type CreatedBattle = ReturnType<ReturnType<typeof createGameApi>['createBattle']>
type BattleState = CreatedBattle['state']
type BattleRng = CreatedBattle['rng']

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

export type AppBattleSession = {
  gameApi: ReturnType<typeof createGameApi>
  state: BattleState
  battleRng: BattleRng
  nextSequence: number
  history: AppActionHistoryEntry[]
  snapshots: AppBattleSnapshot[]
  activeSnapshotId: number | null
  nextHistoryEntryId: number
  nextSnapshotId: number
}
