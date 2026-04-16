import { describe, expect, it } from 'vitest'

import {
  CARD_IDS,
  TEST_ACTIONS,
  TEST_ASSERTIONS,
  TEST_QUERIES,
  TEST_SIM,
} from '../simulation-test-utils'

describe('card.guard-sigil', () => {
  it('summons Guard Sigil, grants defense while it lives, and removes the buff when it dies', () => {
    let sim = TEST_SIM.createSim({
      seed: 'guardsigil-3',
      deck: [CARD_IDS.guardSigil],
      opponentDeck: [CARD_IDS.shieldToss],
      openingHandSize: 1,
      openingMovePoints: 12,
    })

    const heroId = TEST_QUERIES.getActiveHero(sim)
    const before = TEST_QUERIES.getEntityPreview(sim, heroId)

    sim = TEST_ACTIONS.playCard(sim, CARD_IDS.guardSigil, {
      targetPosition: { row: 2, column: 4 },
    })

    const summon = TEST_QUERIES.findEntityByCard(sim, CARD_IDS.guardSigil)
    const afterPlay = TEST_QUERIES.getEntityPreview(sim, heroId)
    expect(summon.kind).toBe('totem')
    expect(afterPlay.armor).toBe(before.armor + 2)
    expect(afterPlay.magicResist).toBe(before.magicResist + 2)

    sim = TEST_ACTIONS.endTurn(sim)
    sim = TEST_ACTIONS.pressLuck(sim)
    sim = TEST_ACTIONS.playCard(sim, CARD_IDS.shieldToss, { targetEntityId: summon.entityId })

    expect(sim.session.state.entitiesById[summon.entityId]).toBeDefined()
    expect(TEST_QUERIES.getEntityPreview(sim, heroId).armor).toBe(before.armor + 2)
    expect(TEST_QUERIES.getEntityPreview(sim, heroId).magicResist).toBe(before.magicResist + 2)

    sim = TEST_ACTIONS.basicAttack(sim, summon.entityId)

    expect(sim.session.state.entitiesById[summon.entityId]).toBeUndefined()
    expect(TEST_QUERIES.getEntityPreview(sim, heroId).armor).toBe(before.armor)
    expect(TEST_QUERIES.getEntityPreview(sim, heroId).magicResist).toBe(before.magicResist)
    TEST_ASSERTIONS.expectEventsOfKind(sim.lastEvents, 'entityRemoved').toHaveLength(1)
  })
})
