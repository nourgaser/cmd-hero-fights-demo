import { describe, expect, it } from 'vitest'

import type { SummonedEntityState } from '../../game/shared/models'
import {
  CARD_IDS,
  TEST_ACTIONS,
  TEST_QUERIES,
  TEST_SIM,
} from '../simulation-test-utils'

describe('card.shamanic-titanium-pummeler', () => {
  it('summons the heavy weapon, its attack uses sharpness, and it refreshes every other owner turn', () => {
    let sim = TEST_SIM.createSim({
      seed: 'pummel-1',
      deck: [CARD_IDS.shamanicTitaniumPummeler],
      opponentDeck: [],
      openingHandSize: 1,
      openingMovePoints: 20,
    })

    sim = TEST_ACTIONS.playCard(sim, CARD_IDS.shamanicTitaniumPummeler, {
      targetPosition: { row: 2, column: 4 },
    })

    const summon = TEST_QUERIES.findEntityByCard(sim, CARD_IDS.shamanicTitaniumPummeler)
    expect(summon.kind).toBe('weapon')
    expect(summon.baseSharpness).toBe(2)

    sim = TEST_ACTIONS.useEntityActive(sim, summon.entityId, TEST_QUERIES.getOpponentHero(sim))

    const damageEvent = TEST_QUERIES.eventsOfKind(sim.lastEvents, 'damageApplied')[0]
    let updatedSummon = TEST_QUERIES.getEntity(sim, summon.entityId) as SummonedEntityState
    expect(damageEvent?.sourceEntityId).toBe(summon.entityId)
    expect(damageEvent?.wasDodged).toBe(false)
    expect(TEST_QUERIES.getEntityPreview(sim, TEST_QUERIES.getOpponentHero(sim)).armor).toBe(0)
    expect(updatedSummon.remainingMoves).toBe(0)

    sim = TEST_ACTIONS.endTurn(sim)
    sim = TEST_ACTIONS.endTurn(sim)
    updatedSummon = TEST_QUERIES.getEntity(sim, summon.entityId) as SummonedEntityState
    expect(updatedSummon.remainingMoves).toBe(0)

    sim = TEST_ACTIONS.endTurn(sim)
    sim = TEST_ACTIONS.endTurn(sim)
    updatedSummon = TEST_QUERIES.getEntity(sim, summon.entityId) as SummonedEntityState
    expect(updatedSummon.remainingMoves).toBe(1)
  })
})
