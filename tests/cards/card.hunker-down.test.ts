import { describe, expect, it } from 'vitest'

import {
  CARD_IDS,
  TEST_ACTIONS,
  TEST_ASSERTIONS,
  TEST_QUERIES,
  TEST_SIM,
} from '../simulation-test-utils'

describe('card.hunker-down', () => {
  it('grants dodge until the start of your next turn', () => {
    let sim = TEST_SIM.createSim({
      seed: 'card-hunker-down',
      deck: [CARD_IDS.hunkerDown],
      opponentDeck: [],
      openingHandSize: 1,
      openingMovePoints: 6,
    })

    const heroId = TEST_QUERIES.getActiveHero(sim)
    const beforeDodgeChance = TEST_QUERIES.getEntityPreview(sim, heroId).effectiveDodgeChance

    sim = TEST_ACTIONS.playCard(sim, CARD_IDS.hunkerDown)

    const afterPlay = TEST_QUERIES.getEntityPreview(sim, heroId)
    expect(afterPlay.effectiveDodgeChance).toBeCloseTo(beforeDodgeChance + 0.25, 12)

    const expireListener = sim.session.state.activeListeners.find((listener) =>
      listener.listenerId.startsWith('listener.hunker-down.expire:'),
    )
    expect(expireListener).toBeDefined()

    sim = TEST_ACTIONS.endTurn(sim)
    expect(TEST_QUERIES.getEntityPreview(sim, heroId).effectiveDodgeChance).toBeCloseTo(
      beforeDodgeChance + 0.25,
      12,
    )

    sim = TEST_ACTIONS.endTurn(sim)

    expect(TEST_QUERIES.getEntityPreview(sim, heroId).effectiveDodgeChance).toBeCloseTo(
      beforeDodgeChance,
      12,
    )
    expect(
      sim.session.state.activeListeners.some((listener) =>
        listener.listenerId.startsWith('listener.hunker-down.expire:'),
      ),
    ).toBe(false)
    TEST_ASSERTIONS.expectEventsOfKind(sim.lastEvents, 'numberModifierExpired').toHaveLength(1)
  })
})
