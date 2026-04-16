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

describe('card.chaaarge', () => {
  it('is only playable below 15 HP and refunds its move cost when the hit lands', () => {
    let healthy = TEST_SIM.createSim({
      seed: 'charge-1',
      deck: [CARD_IDS.chaaarge],
      opponentDeck: [],
      openingHandSize: 1,
      openingMovePoints: 10,
    })
    const healthyHeroId = TEST_QUERIES.getActiveHero(healthy)

    expect(healthy.preview.heroHands[0]?.cards[0]?.isPlayable).toBe(false)
    healthy = TEST_ACTIONS.playCard(healthy, CARD_IDS.chaaarge, {
      targetEntityId: TEST_QUERIES.getOpponentHero(healthy),
      expectFailure: true,
    })
    expect(healthy.lastEvents).toHaveLength(0)

    let wounded = TEST_SIM.createSim({
      seed: 'charge-1',
      deck: [CARD_IDS.chaaarge],
      opponentDeck: [],
      openingHandSize: 1,
      openingMovePoints: 10,
    })
    const woundedHeroId = TEST_QUERIES.getActiveHero(wounded)
    wounded = withHeroPatch(wounded, woundedHeroId, { currentHealth: 14 })

    expect(wounded.preview.heroHands[0]?.cards[0]?.isPlayable).toBe(true)

    const beforeMovePoints = getHeroEntity(wounded, woundedHeroId).movePoints

    wounded = TEST_ACTIONS.playCard(wounded, CARD_IDS.chaaarge, {
      targetEntityId: TEST_QUERIES.getOpponentHero(wounded),
    })

    const damageEvent = TEST_QUERIES.eventsOfKind(wounded.lastEvents, 'damageApplied')[0]
    expect(damageEvent?.wasDodged).toBe(false)
    expect(getHeroEntity(wounded, woundedHeroId).movePoints).toBe(beforeMovePoints)
    expect(healthyHeroId).toBe(woundedHeroId)
  })
})
