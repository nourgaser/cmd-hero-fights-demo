import { describe, expect, it } from 'vitest'

import {
  CARD_IDS,
  TEST_ACTIONS,
  TEST_QUERIES,
  TEST_SIM,
} from '../simulation-test-utils'

describe('card.shatter-plating', () => {
  it('destroys the caster armor and converts it into damage against the target', () => {
    let sim = TEST_SIM.createSim({
      seed: 'shatter-1',
      deck: [CARD_IDS.shatterPlating],
      opponentDeck: [],
      openingHandSize: 1,
      openingMovePoints: 12,
    })

    const heroId = TEST_QUERIES.getActiveHero(sim)
    const enemyId = TEST_QUERIES.getOpponentHero(sim)

    sim = TEST_ACTIONS.playCard(sim, CARD_IDS.shatterPlating, { targetEntityId: enemyId })

    const armorLostEvent = TEST_QUERIES.eventsOfKind(sim.lastEvents, 'armorLost')[0]
    const damageEvent = TEST_QUERIES.eventsOfKind(sim.lastEvents, 'damageApplied')[0]

    expect(armorLostEvent?.targetEntityId).toBe(heroId)
    expect(armorLostEvent?.amount).toBe(2)
    expect(TEST_QUERIES.getEntityPreview(sim, heroId).armor).toBe(0)
    expect(damageEvent?.targetEntityId).toBe(enemyId)
    expect(damageEvent?.wasDodged).toBe(false)
    expect(damageEvent?.amount).toBe(10)
    expect(TEST_QUERIES.getEntity(sim, enemyId).currentHealth).toBe(50)
  })
})
