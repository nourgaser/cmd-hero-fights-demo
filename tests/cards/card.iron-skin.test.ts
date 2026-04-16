import { describe, expect, it } from 'vitest'

import {
  CARD_IDS,
  TEST_SIM,
  TEST_ACTIONS,
  TEST_QUERIES,
} from '../simulation-test-utils'

describe('card.iron-skin', () => {
  it('gives the active hero 1 armor', () => {
    let sim = TEST_SIM.createSim({
      seed: 'card-iron-skin',
      deck: [CARD_IDS.ironSkin],
      opponentDeck: [],
      openingHandSize: 1,
      openingMovePoints: 6,
    })

    const heroId = TEST_QUERIES.getActiveHero(sim)
    const beforeArmor = TEST_QUERIES.getEntityPreview(sim, heroId).armor

    sim = TEST_ACTIONS.playCard(sim, CARD_IDS.ironSkin)

    expect(TEST_QUERIES.getEntityPreview(sim, heroId).armor).toBe(beforeArmor + 1)
  })
})
