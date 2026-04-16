import { describe, expect, it } from 'vitest'

import {
  CARD_IDS,
  TEST_SIM,
  TEST_ACTIONS,
  TEST_QUERIES,
  TEST_ASSERTIONS,
} from '../simulation-test-utils'

describe('mechanic.commander-x-passive', () => {
  it('heals the attacking hero for 1 when the basic attack lands', () => {
    let sim = TEST_SIM.createSim({
      seed: 'seed-1',
      deck: [],
      opponentDeck: [CARD_IDS.warcry],
      openingHandSize: 1,
      openingMovePoints: 6,
    })

    sim = TEST_ACTIONS.endTurn(sim)
    sim = TEST_ACTIONS.playCard(sim, CARD_IDS.warcry, { targetEntityId: TEST_QUERIES.getActiveHero(sim) })
    sim = TEST_ACTIONS.endTurn(sim)

    const heroId = TEST_QUERIES.getActiveHero(sim)
    const beforeHealth = TEST_QUERIES.getEntity(sim, heroId).currentHealth

    sim = TEST_ACTIONS.pressLuck(sim)
    sim = TEST_ACTIONS.basicAttack(sim, TEST_QUERIES.getOpponentHero(sim))

    const damageEvent = TEST_ASSERTIONS.eventsOfKind(sim.lastEvents, 'damageApplied')[0]
    expect(damageEvent).toBeDefined()
    expect(damageEvent?.wasDodged).toBe(false)

    const healEvent = TEST_ASSERTIONS.eventsOfKind(sim.lastEvents, 'healApplied')[0]
    expect(healEvent).toBeDefined()
    expect(healEvent?.targetEntityId).toBe(heroId)
    expect(healEvent?.amount).toBe(1)
    expect(TEST_QUERIES.getEntity(sim, heroId).currentHealth).toBe(beforeHealth + 1)
  })
})
