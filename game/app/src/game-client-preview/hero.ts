import { createGameApi } from '../../../index'
import type { AppBattlePreview } from './types'
import { buildHeroActionTargets } from './hero/actions'
import { buildHeroDetailsByEntityId } from './hero/details'
import { buildHeroHandCounts, buildHeroHands } from './hero/hand'

type PreviewGameApi = ReturnType<typeof createGameApi>
type PreviewHeroData = Pick<AppBattlePreview, 'heroHandCounts' | 'heroHands' | 'heroDetailsByEntityId' | 'heroActionTargets'>
type PreviewBattleState = ReturnType<ReturnType<typeof createGameApi>['createBattle']>['state']

export function buildHeroPreviewData(options: {
  gameApi: PreviewGameApi
  state: PreviewBattleState
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
