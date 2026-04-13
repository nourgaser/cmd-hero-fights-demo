import { createGameApi } from '../../../index.ts'
import type { AppBattlePreview } from './types.ts'
import { buildHeroActionTargets } from './hero/actions.ts'
import { buildHeroDetailsByEntityId } from './hero/details.ts'
import { buildHeroHandCounts, buildHeroHands } from './hero/hand.ts'

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
