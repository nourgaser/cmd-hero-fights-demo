import { describe, expect, it } from 'vitest'

import {
  CARD_IDS,
  TEST_ACTIONS,
  TEST_ASSERTIONS,
  TEST_QUERIES,
  TEST_SIM,
} from '../simulation-test-utils'

describe('card.reactive-bulwark', () => {
  it('applies the aura and grants resistance after the first damage taken in a turn', () => {
    let sim = TEST_SIM.createSim({
      seed: 'aura-1',
      deck: [CARD_IDS.reactiveBulwark],
      opponentDeck: [CARD_IDS.warcry],
      openingHandSize: 1,
      openingMovePoints: 12,
    })

    const heroId = TEST_QUERIES.getActiveHero(sim)
    const before = TEST_QUERIES.getEntityPreview(sim, heroId)

    sim = TEST_ACTIONS.playCard(sim, CARD_IDS.reactiveBulwark)

    expect(TEST_QUERIES.getEntityPreview(sim, heroId).armor).toBe(before.armor)
    expect(TEST_QUERIES.getEntityPreview(sim, heroId).magicResist).toBe(before.magicResist)
    TEST_ASSERTIONS.expectActiveAura(sim, 'reactiveBulwarkResistance')

    sim = TEST_ACTIONS.endTurn(sim)
    sim = TEST_ACTIONS.playCard(sim, CARD_IDS.warcry, { targetEntityId: TEST_QUERIES.getActiveHero(sim) })

    expect(TEST_QUERIES.getEntityPreview(sim, heroId).armor).toBe(before.armor + 3)
    expect(TEST_QUERIES.getEntityPreview(sim, heroId).magicResist).toBe(before.magicResist + 3)

    sim = TEST_ACTIONS.endTurn(sim)

    expect(TEST_QUERIES.getEntityPreview(sim, heroId).armor).toBe(before.armor)
    expect(TEST_QUERIES.getEntityPreview(sim, heroId).magicResist).toBe(before.magicResist)
  })
})
