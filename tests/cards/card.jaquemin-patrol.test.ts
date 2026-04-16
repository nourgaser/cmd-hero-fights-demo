import { describe, expect, it } from 'vitest'

import {
  CARD_IDS,
  TEST_ACTIONS,
  TEST_QUERIES,
  TEST_SIM,
} from '../simulation-test-utils'

describe('card.jaquemin-patrol', () => {
  it('summons Jaquemin and follows up when the hero attacks', () => {
    let sim = TEST_SIM.createSim({
      seed: 'jq-1',
      deck: [CARD_IDS.jaqueminPatrol],
      opponentDeck: [],
      openingHandSize: 1,
      openingMovePoints: 12,
    })

    sim = TEST_ACTIONS.playCard(sim, CARD_IDS.jaqueminPatrol, {
      targetPosition: { row: 2, column: 4 },
    })

    const summon = TEST_QUERIES.findEntityByCard(sim, CARD_IDS.jaqueminPatrol)

    sim = TEST_ACTIONS.basicAttack(sim, TEST_QUERIES.getOpponentHero(sim))

    const damageEvents = TEST_QUERIES.eventsOfKind(sim.lastEvents, 'damageApplied')
    expect(damageEvents).toHaveLength(2)
    expect(damageEvents[0]?.sourceEntityId).toBe(TEST_QUERIES.getActiveHero(sim))
    expect(damageEvents[1]?.sourceEntityId).toBe(summon.entityId)
  })
})
