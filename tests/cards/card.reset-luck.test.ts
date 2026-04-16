import { describe, expect, it } from 'vitest'

import {
  CARD_IDS,
  TEST_SIM,
  TEST_ACTIONS,
  TEST_QUERIES,
  TEST_ASSERTIONS
} from '../simulation-test-utils'

describe('card.reset-luck', () => {
  it('returns the luck balance to neutral', () => {
    let sim = TEST_SIM.createSim({
      seed: 'card-reset-luck',
      deck: [CARD_IDS.resetLuck],
      opponentDeck: [],
      openingHandSize: 1,
      openingMovePoints: 8,
    })

    sim = TEST_ACTIONS.pressLuck(sim)
    expect(sim.session.state.luck.balance).toBe(1)

    sim = TEST_ACTIONS.playCard(sim, CARD_IDS.resetLuck)

    expect(sim.session.state.luck.balance).toBe(0)

    const balanceEvent = TEST_ASSERTIONS.eventsOfKind(sim.lastEvents, 'luckBalanceChanged')[0]
    expect(balanceEvent).toBeDefined()
    expect(balanceEvent?.previousBalance).toBe(1)
    expect(balanceEvent?.nextBalance).toBe(0)
  })
})
