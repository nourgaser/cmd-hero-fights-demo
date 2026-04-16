import { describe, expect, it } from 'vitest'

import {
  CARD_IDS,
  TEST_SIM,
  TEST_ACTIONS,
  TEST_QUERIES,
  TEST_ASSERTIONS,
} from '../simulation-test-utils'

describe('card.health-potion', () => {
  it('heals the damaged active hero', () => {
    let sim = TEST_SIM.createSim({
      seed: 'card-health-potion',
      deck: [CARD_IDS.healthPotion],
      opponentDeck: [CARD_IDS.warcry],
      openingHandSize: 1,
      openingMovePoints: 6,
    })

    sim = TEST_ACTIONS.endTurn(sim)
    sim = TEST_ACTIONS.playCard(sim, CARD_IDS.warcry, { targetEntityId: TEST_QUERIES.getActiveHero(sim) })
    sim = TEST_ACTIONS.endTurn(sim)

    const heroId = TEST_QUERIES.getActiveHero(sim)
    const before = TEST_QUERIES.getEntity(sim, heroId)
    expect(before.currentHealth).toBeLessThan(before.maxHealth)

    sim = TEST_ACTIONS.playCard(sim, CARD_IDS.healthPotion)

    const after = TEST_QUERIES.getEntity(sim, heroId)
    expect(after.currentHealth).toBeGreaterThan(before.currentHealth)
    expect(after.currentHealth).toBeLessThanOrEqual(after.maxHealth)

    const healEvent = TEST_ASSERTIONS.eventsOfKind(sim.lastEvents, 'healApplied')[0]
    expect(healEvent).toBeDefined()
    expect(healEvent?.targetEntityId).toBe(heroId)
    expect(healEvent?.amount).toBe(after.currentHealth - before.currentHealth)
  })
})
