import { describe, expect, it } from 'vitest'

import {
  CARD_IDS,
  TEST_ACTIONS,
  TEST_QUERIES,
  TEST_SIM,
} from '../simulation-test-utils'

describe('card.riquier-the-bear', () => {
  it('summons Riquier and retaliates when attacked', () => {
    let sim = TEST_SIM.createSim({
      seed: 'riq-1',
      deck: [CARD_IDS.riquierTheBear],
      opponentDeck: [CARD_IDS.shieldToss],
      openingHandSize: 1,
      openingMovePoints: 12,
    })

    sim = TEST_ACTIONS.playCard(sim, CARD_IDS.riquierTheBear, {
      targetPosition: { row: 2, column: 4 },
    })

    const summon = TEST_QUERIES.findEntityByCard(sim, CARD_IDS.riquierTheBear)

    sim = TEST_ACTIONS.endTurn(sim)
    sim = TEST_ACTIONS.playCard(sim, CARD_IDS.shieldToss, { targetEntityId: summon.entityId })

    const damageEvents = TEST_QUERIES.eventsOfKind(sim.lastEvents, 'damageApplied')
    expect(damageEvents).toHaveLength(2)
    expect(damageEvents[0]?.targetEntityId).toBe(summon.entityId)
    expect(damageEvents[1]?.sourceEntityId).toBe(summon.entityId)
    expect(damageEvents[1]?.targetEntityId).toBe(TEST_QUERIES.getActiveHero(sim))
  })
})
