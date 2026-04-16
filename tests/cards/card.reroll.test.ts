import { describe, expect, it } from 'vitest'

import {
  CARD_IDS,
  TEST_SIM,
  TEST_ACTIONS,
  TEST_QUERIES,
  TEST_ASSERTIONS,

} from '../simulation-test-utils'

describe('card.reroll', () => {
  it('spends the card and draws two replacements', () => {
    let sim = TEST_SIM.createSim({
      seed: 'card-reroll',
      deck: [CARD_IDS.reroll, CARD_IDS.reroll, CARD_IDS.reroll],
      opponentDeck: [],
      openingHandSize: 1,
      openingMovePoints: 6,
    })

    const heroId = TEST_QUERIES.getActiveHero(sim)
    TEST_ASSERTIONS.expectHandSize(sim, heroId, 1)

    sim = TEST_ACTIONS.playCard(sim, CARD_IDS.reroll)

    TEST_ASSERTIONS.expectHandSize(sim, heroId, 2)
    expect(TEST_QUERIES.getHandCardIds(sim, heroId)).toEqual([CARD_IDS.reroll, CARD_IDS.reroll])
    TEST_ASSERTIONS.expectEventsOfKind(sim.lastEvents, 'cardDrawn').toHaveLength(2)
  })
})
