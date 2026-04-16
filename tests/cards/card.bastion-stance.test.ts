import { describe, expect, it } from 'vitest'

import {
  CARD_IDS,
  TEST_ACTIONS,
  TEST_ASSERTIONS,
  TEST_QUERIES,
  TEST_SIM,
} from '../simulation-test-utils'

describe('card.bastion-stance', () => {
  it('grants armor and magic resist until the start of your next turn', () => {
    let sim = TEST_SIM.createSim({
      seed: 'card-bastion-stance',
      deck: [CARD_IDS.bastionStance],
      opponentDeck: [],
      openingHandSize: 1,
      openingMovePoints: 6,
    })

    const heroId = TEST_QUERIES.getActiveHero(sim)
    const before = TEST_QUERIES.getEntityPreview(sim, heroId)

    sim = TEST_ACTIONS.playCard(sim, CARD_IDS.bastionStance)

    const afterPlay = TEST_QUERIES.getEntityPreview(sim, heroId)
    expect(afterPlay.armor).toBe(before.armor + 3)
    expect(afterPlay.magicResist).toBe(before.magicResist + 3)
    expect(
      sim.session.state.activeListeners.some((listener) =>
        listener.listenerId.startsWith('listener.bastion-stance.cleanup:'),
      ),
    ).toBe(true)

    sim = TEST_ACTIONS.endTurn(sim)

    const duringOpponentTurn = TEST_QUERIES.getEntityPreview(sim, heroId)
    expect(duringOpponentTurn.armor).toBe(before.armor + 3)
    expect(duringOpponentTurn.magicResist).toBe(before.magicResist + 3)

    sim = TEST_ACTIONS.endTurn(sim)

    const afterExpire = TEST_QUERIES.getEntityPreview(sim, heroId)
    expect(afterExpire.armor).toBe(before.armor)
    expect(afterExpire.magicResist).toBe(before.magicResist)
    expect(
      sim.session.state.activeListeners.some((listener) =>
        listener.listenerId.startsWith('listener.bastion-stance.cleanup:'),
      ),
    ).toBe(false)
    TEST_ASSERTIONS.expectEventsOfKind(sim.lastEvents, 'numberModifierExpired').toHaveLength(2)
  })
})
