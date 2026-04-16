import { describe, expect, it } from 'vitest'

import type { SummonedEntityState } from '../../game/shared/models'
import {
  CARD_IDS,
  TEST_ACTIONS,
  TEST_QUERIES,
  TEST_SIM,
} from '../simulation-test-utils'

describe('card.common-expendable-deadly-man', () => {
  it('summons the companion and it can use its active once', () => {
    let sim = TEST_SIM.createSim({
      seed: 'common-2',
      deck: [CARD_IDS.commonExpendableDeadlyMan],
      opponentDeck: [],
      openingHandSize: 1,
      openingMovePoints: 10,
    })

    sim = TEST_ACTIONS.playCard(sim, CARD_IDS.commonExpendableDeadlyMan, {
      targetPosition: { row: 2, column: 4 },
    })

    const summon = TEST_QUERIES.findEntityByCard(sim, CARD_IDS.commonExpendableDeadlyMan)
    expect(summon.kind).toBe('companion')
    expect(TEST_QUERIES.getEntityPreview(sim, summon.entityId).activeAbility).toBeDefined()

    sim = TEST_ACTIONS.useEntityActive(sim, summon.entityId, TEST_QUERIES.getOpponentHero(sim))

    const damageEvent = TEST_QUERIES.eventsOfKind(sim.lastEvents, 'damageApplied')[0]
    const updatedSummon = TEST_QUERIES.getEntity(sim, summon.entityId) as SummonedEntityState
    expect(damageEvent?.sourceEntityId).toBe(summon.entityId)
    expect(updatedSummon.remainingMoves).toBe(0)
  })
})
