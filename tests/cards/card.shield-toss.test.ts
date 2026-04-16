import { describe, expect, it } from 'vitest'

import { buildPreviewFromState } from '../../game/app/src/game-client'
import { annotateBattleStateWithActionOptions } from '../../game/engine/actions/annotate-action-options'
import type { HeroEntityState } from '../../game/shared/models'
import {
  CARD_IDS,
  TEST_ACTIONS,
  TEST_QUERIES,
  TEST_SIM,
  type Sim,
} from '../simulation-test-utils'

function getHeroEntity(sim: Sim, heroId: string): HeroEntityState {
  const entity = TEST_QUERIES.getEntity(sim, heroId)
  if (entity.kind !== 'hero') {
    throw new Error(`Expected hero entity for ${heroId}`)
  }
  return entity
}

function withHeroPatch(sim: Sim, heroId: string, patch: Partial<HeroEntityState>): Sim {
  const hero = getHeroEntity(sim, heroId)
  const patchedState = {
    ...sim.session.state,
    entitiesById: {
      ...sim.session.state.entitiesById,
      [heroId]: { ...hero, ...patch },
    },
  }
  const nextState = annotateBattleStateWithActionOptions({
    state: patchedState,
    registry: sim.session.gameApi.GAME_CONTENT_REGISTRY,
  })
  const nextSession = { ...sim.session, state: nextState }

  return {
    ...sim,
    session: nextSession,
    preview: buildPreviewFromState({ gameApi: nextSession.gameApi, state: nextState }),
    lastEvents: [],
  }
}

describe('card.shield-toss', () => {
  it('deals more damage when the caster has more armor', () => {
    let base = TEST_SIM.createSim({
      seed: 'shield-scale',
      deck: [CARD_IDS.shieldToss],
      opponentDeck: [],
      openingHandSize: 1,
      openingMovePoints: 10,
    })
    let boosted = TEST_SIM.createSim({
      seed: 'shield-scale',
      deck: [CARD_IDS.shieldToss],
      opponentDeck: [],
      openingHandSize: 1,
      openingMovePoints: 10,
    })

    boosted = withHeroPatch(boosted, TEST_QUERIES.getActiveHero(boosted), { armor: 3 })

    base = TEST_ACTIONS.playCard(base, CARD_IDS.shieldToss, {
      targetEntityId: TEST_QUERIES.getOpponentHero(base),
    })
    boosted = TEST_ACTIONS.playCard(boosted, CARD_IDS.shieldToss, {
      targetEntityId: TEST_QUERIES.getOpponentHero(boosted),
    })

    const baseDamage = TEST_QUERIES.eventsOfKind(base.lastEvents, 'damageApplied')[0]
    const boostedDamage = TEST_QUERIES.eventsOfKind(boosted.lastEvents, 'damageApplied')[0]

    expect(baseDamage?.wasDodged).toBe(false)
    expect(boostedDamage?.wasDodged).toBe(false)
    expect(boostedDamage?.amount).toBe((baseDamage?.amount ?? 0) + 1)
  })
})
