import { describe, expect, it } from 'vitest'

import {
  CARD_IDS,
  TEST_ACTIONS,
  TEST_QUERIES,
  TEST_SIM,
} from '../simulation-test-utils'

describe('card.evergrowth-idol', () => {
  it('summons Evergrowth Idol and grows the hero stats on its periodic cadence', () => {
    let sim = TEST_SIM.createSim({
      seed: 'ev-1',
      deck: [CARD_IDS.evergrowthIdol],
      opponentDeck: [],
      openingHandSize: 1,
      openingMovePoints: 10,
    })

    const heroId = TEST_QUERIES.getActiveHero(sim)
    const before = TEST_QUERIES.getEntityPreview(sim, heroId)

    sim = TEST_ACTIONS.playCard(sim, CARD_IDS.evergrowthIdol, {
      targetPosition: { row: 2, column: 4 },
    })

    for (let i = 0; i < 10; i += 1) {
      sim = TEST_ACTIONS.endTurn(sim)
    }

    const after = TEST_QUERIES.getEntityPreview(sim, heroId)
    expect(after.attackDamage).toBe(before.attackDamage + 1)
    expect(after.armor).toBe(before.armor + 1)
    expect(after.magicResist).toBe(before.magicResist + 1)
    expect(TEST_QUERIES.eventsOfKind(sim.lastEvents, 'numberModifierApplied')).toHaveLength(3)
  })
})
