import { createGameApi } from '../../../../index'
import type { AppBattlePreview } from '../types'

type PreviewBattleState = ReturnType<ReturnType<typeof createGameApi>['createBattle']>['state']

export function buildHeroActionTargets(options: {
  state: PreviewBattleState
}): AppBattlePreview['heroActionTargets'] {
  const { state } = options

  return (state.heroEntityIds as string[]).map((heroEntityId) => {
    const entity = state.entitiesById[heroEntityId]

    if (!entity || entity.kind !== 'hero') {
      throw new Error(`Expected hero entity in battle state for '${heroEntityId}'.`)
    }

    return {
      heroEntityId,
      basicAttack: {
        attackerEntityId: entity.entityId,
        moveCost: entity.basicAttackMoveCost,
        validTargetEntityIds: entity.basicAttackTargetEntityIds ?? [],
      },
      pressLuck: {
        moveCost: 3,
      },
      entityActive: entity.entityActiveOptions ?? [],
    }
  })
}
