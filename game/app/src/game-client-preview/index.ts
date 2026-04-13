import { createGameApi } from '../../../index'
import { buildBattlefieldPreview } from './battlefield'
import { buildHeroPreviewData } from './hero'
import type { AppBattlePreview } from './types'

export type {
  AppBattlePreview,
  AppNumberContributionPreview,
  AppNumberTrace,
} from './types'

type CreatedBattle = ReturnType<ReturnType<typeof createGameApi>['createBattle']>
type BattleState = CreatedBattle['state']

export function buildPreviewFromState(options: {
  gameApi: ReturnType<typeof createGameApi>
  state: BattleState
}): AppBattlePreview {
  const { gameApi, state } = options

  const heroData = buildHeroPreviewData({ gameApi, state })
  const battlefield = buildBattlefieldPreview({ gameApi, state })

  return {
    battleId: state.battleId,
    seed: state.seed,
    heroEntityIds: state.heroEntityIds as [string, string],
    activeHeroEntityId: state.turn.activeHeroEntityId,
    turn: {
      turnNumber: state.turn.turnNumber,
      pressLuckUsedThisTurn: state.turn.pressLuckUsedThisTurn,
    },
    luck: {
      anchorHeroEntityId: state.luck.anchorHeroEntityId,
      balance: state.luck.balance,
    },
    heroHandCounts: heroData.heroHandCounts,
    heroDetailsByEntityId: heroData.heroDetailsByEntityId,
    heroHands: heroData.heroHands,
    heroActionTargets: heroData.heroActionTargets,
    battlefield,
  }
}
