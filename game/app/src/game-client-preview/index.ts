import { buildBattlefieldPreview } from './battlefield'
import { buildHeroPreviewData } from './hero'
import type { AppBattlePreview } from './types'
import type { AppBattleApi } from '../game-client'
import type { BattleState } from '../../../shared/models'

export type {
  AppBattlePreview,
  AppNumberContributionPreview,
  AppNumberTrace,
} from './types'

export function buildPreviewFromState(options: {
  gameApi: AppBattleApi
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
    gameOver: state.gameOver,
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
