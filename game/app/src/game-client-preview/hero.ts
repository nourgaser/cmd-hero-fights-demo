import type { AppBattlePreview } from './types'
import { buildHeroActionTargets } from './hero/actions'
import { buildHeroDetailsByEntityId } from './hero/details'
import { buildHeroHandCounts, buildHeroHands } from './hero/hand'
import type { AppBattleApi } from '../game-client'
import type { BattleState } from '../../../shared/models'

type PreviewHeroData = Pick<AppBattlePreview, 'heroHandCounts' | 'heroHands' | 'heroDetailsByEntityId' | 'heroActionTargets'>

export function buildHeroPreviewData(options: {
  gameApi: AppBattleApi
  state: BattleState
}): PreviewHeroData {
  const { gameApi, state } = options

  const heroHandCounts = buildHeroHandCounts({ gameApi, state })
  const heroHands = buildHeroHands({ gameApi, state })
  const heroDetailsByEntityId = buildHeroDetailsByEntityId({ gameApi, state })
  const heroActionTargets = buildHeroActionTargets({ state })

  return {
    heroHandCounts,
    heroHands,
    heroDetailsByEntityId,
    heroActionTargets,
  }
}
