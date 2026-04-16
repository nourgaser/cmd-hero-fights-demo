import { describe, expect, it } from 'vitest'

import {
  CARD_IDS,
  TEST_ACTIONS,
  TEST_QUERIES,
  TEST_SIM,
} from '../simulation-test-utils'

describe('card.warcry', () => {
  it("destroys the target's armor and deals matching damage to the enemy hero", () => {
    let sim = TEST_SIM.createSim({
      seed: 'warcry-1',
      deck: [CARD_IDS.warcry],
      opponentDeck: [],
      openingHandSize: 1,
      openingMovePoints: 10,
    })

    const heroId = TEST_QUERIES.getActiveHero(sim)
    const enemyId = TEST_QUERIES.getOpponentHero(sim)

    sim = TEST_ACTIONS.playCard(sim, CARD_IDS.warcry, { targetEntityId: heroId })

    const armorLostEvent = TEST_QUERIES.eventsOfKind(sim.lastEvents, 'armorLost')[0]
    const damageEvent = TEST_QUERIES.eventsOfKind(sim.lastEvents, 'damageApplied')[0]

    expect(armorLostEvent?.targetEntityId).toBe(heroId)
    expect(armorLostEvent?.amount).toBe(2)
    expect(TEST_QUERIES.getEntityPreview(sim, heroId).armor).toBe(0)
    expect(damageEvent?.targetEntityId).toBe(enemyId)
    expect(damageEvent?.wasDodged).toBe(false)
    expect(damageEvent?.amount).toBe(6)
    expect(TEST_QUERIES.getEntity(sim, enemyId).currentHealth).toBe(54)
  })
})
